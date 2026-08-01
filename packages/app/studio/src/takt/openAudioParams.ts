// TAKT-FORK — Auswertung der Parameter von /open-audio.
//
// Rein und ohne DOM, damit die Sicherheitsgrenze testbar ist: hier wird entschieden, VON WO das
// Studio Audiodateien laedt. Ohne Allowlist waere die Seite ein bequemer Umweg, um beliebige
// fremde URLs im Namen von daw.takt-studios.de abzurufen.
//
// Die Netzsperre (takt/netzsperre.ts) wuerde fremde Hosts ohnehin abweisen — diese Pruefung ist
// die zweite Linie und liefert vor allem eine VERSTAENDLICHE Meldung statt eines stummen 403.
//
// ⚖️ EINE Liste statt „src + beat + offsetMs". Die erste Fassung kannte genau zwei Dateien und
// verschob die Stimme gegen einen bei 0 liegenden Beat. Beim Nachrechnen gegen lib/audio/mixplan.ts
// (Artist OS) war das in ZWEI Punkten falsch:
//   1. Die Richtung stimmte nicht. Der Latenzversatz bedeutet, dass die Stimmdatei VOR dem Beat
//      beginnt (ihre ersten Millisekunden sind Vorlauf) — nicht dahinter.
//   2. Ein Punch-in (`beatOffsetMs`) verschiebt den BEAT, und zwar um Minuten, nicht um
//      Millisekunden. Mit „Beat immer bei 0" liefe eine ab Minute 2 eingesungene Strophe gegen
//      den Anfang des Beats.
// Beides verschwindet, wenn jede Spur ihre eigene Startposition mitbringt: Artist OS rechnet die
// Ausrichtung einmal aus (dort steht die Zeitrechnung), hier wird sie nur noch gelesen. Dass
// dabei auch Doubles und Adlibs mitkommen, faellt als Nebenwirkung ab.

/** Quelle, von der Dateien geladen werden duerfen. Feste Konstante, keine Umgebungsvariable. */
export const ERLAUBTE_QUELLE = "app.takt-studios.de"

/** Mehr Spuren ist kein Anwendungsfall, sondern ein Missbrauchsversuch — jede kostet einen Abruf. */
const MAX_SPUREN = 12
/** Eine Startposition jenseits einer Stunde ist keine Ausrichtung mehr. */
const MAX_START_MS = 3_600_000
const MAX_NAME = 60

export interface DawSpur {
    url: string
    /** Anzeigename der Spur im Studio („Beat", „Stimme", „Double" …). */
    name: string
    /** Startposition auf der Zeitachse in Millisekunden, >= 0. */
    startMs: number
}

export type OpenAudioErgebnis =
    | { ok: true; spuren: DawSpur[] }
    | { ok: false; meldung: string }

/** Nur https von der erlaubten Quelle — in der Entwicklung zusaetzlich http auf localhost. */
export function quelleErlaubt(roh: string, entwicklung: boolean): boolean {
    let url: URL
    try {
        url = new URL(roh)
    } catch {
        return false // relative Pfade bewusst nicht: die Datei kommt immer von der App
    }
    if (url.protocol === "https:" && url.hostname === ERLAUBTE_QUELLE) {return true}
    if (entwicklung && url.hostname === "localhost") {return true}
    return false
}

function nameVon(roh: unknown, nummer: number): string {
    const s = typeof roh === "string" ? roh.trim() : ""
    return s === "" ? `Spur ${nummer}` : s.slice(0, MAX_NAME)
}

/**
 * Startposition: fehlend oder unlesbar zaehlt als 0. Bewusst nachsichtig — eine kaputte Zahl darf
 * das Oeffnen nicht verhindern, im Studio ist die Region ohnehin verschiebbar.
 */
function startVon(roh: unknown): number {
    const n = Number(roh)
    return Number.isFinite(n) ? Math.max(0, Math.min(n, MAX_START_MS)) : 0
}

export function leseOpenAudioParameter(suche: string, entwicklung = false): OpenAudioErgebnis {
    const roh = new URLSearchParams(suche).get("spuren")
    if (roh === null || roh === "") {
        return {ok: false, meldung: "Es wurde keine Aufnahme uebergeben (Parameter „spuren\" fehlt)."}
    }
    let liste: unknown
    try {
        liste = JSON.parse(roh)
    } catch {
        return {ok: false, meldung: "Der Aufruf ist beschaedigt und konnte nicht gelesen werden."}
    }
    if (!Array.isArray(liste) || liste.length === 0) {
        return {ok: false, meldung: "Der Aufruf enthaelt keine Spuren."}
    }
    if (liste.length > MAX_SPUREN) {
        return {ok: false, meldung: `Es lassen sich hoechstens ${MAX_SPUREN} Spuren auf einmal oeffnen.`}
    }

    const spuren: DawSpur[] = []
    for (let i = 0; i < liste.length; i++) {
        const eintrag = liste[i] as Record<string, unknown> | null
        const url = eintrag !== null && typeof eintrag === "object" ? eintrag.url : undefined
        if (typeof url !== "string" || url === "") {
            return {ok: false, meldung: "Eine der Spuren hat keine Adresse."}
        }
        // ⚠️ Eine unerlaubte Quelle bricht den GANZEN Aufruf ab, statt die Spur zu ueberspringen.
        // Sonst laedt die Seite still die Haelfte, und niemand merkt, dass etwas fehlt.
        if (!quelleErlaubt(url, entwicklung)) {
            return {ok: false, meldung: `Diese Aufnahme kommt nicht von ${ERLAUBTE_QUELLE} und wird nicht geladen.`}
        }
        spuren.push({url, name: nameVon(eintrag?.name, i + 1), startMs: startVon(eintrag?.startMs)})
    }
    return {ok: true, spuren}
}
