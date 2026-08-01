// TAKT-FORK — Auswertung der Parameter von /open-audio.
//
// Rein und ohne DOM, damit die Sicherheitsgrenze testbar ist: hier wird entschieden, VON WO das
// Studio Audiodateien laedt. Ohne Allowlist waere die Seite ein bequemer Umweg, um beliebige
// fremde URLs im Namen von daw.takt-studios.de abzurufen.
//
// Die Netzsperre (takt/netzsperre.ts) wuerde fremde Hosts ohnehin abweisen — diese Pruefung ist
// die zweite Linie und liefert vor allem eine VERSTAENDLICHE Meldung statt eines stummen 403.

/** Quelle, von der Dateien geladen werden duerfen. Feste Konstante, keine Umgebungsvariable. */
export const ERLAUBTE_QUELLE = "app.takt-studios.de"

export interface OpenAudioAuftrag {
    /** Die Stimmspur. Pflicht — ohne sie gibt es nichts zu oeffnen. */
    stimme: string
    /** Der Beat, falls vorhanden. Der Normalfall sind ZWEI Dateien. */
    beat: string | null
    /** Versatz der Stimme in Millisekunden, >= 0. */
    offsetMs: number
}

export type OpenAudioErgebnis =
    | { ok: true; auftrag: OpenAudioAuftrag }
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

export function leseOpenAudioParameter(suche: string, entwicklung = false): OpenAudioErgebnis {
    const p = new URLSearchParams(suche)
    const stimme = p.get("src")
    if (stimme === null || stimme === "") {
        return {ok: false, meldung: "Es wurde keine Aufnahme uebergeben (Parameter „src\" fehlt)."}
    }
    if (!quelleErlaubt(stimme, entwicklung)) {
        return {ok: false, meldung: `Diese Aufnahme kommt nicht von ${ERLAUBTE_QUELLE} und wird nicht geladen.`}
    }
    const beatRoh = p.get("beat")
    // Ein leerer beat-Parameter ist kein Fehler: die App haengt ihn auch dann an, wenn zur
    // Aufnahme kein Beat gehoert. Ein GESETZTER, aber unerlaubter Beat ist dagegen einer —
    // sonst laedt die Seite still nur die Haelfte und niemand merkt es.
    let beat: string | null = null
    if (beatRoh !== null && beatRoh !== "") {
        if (!quelleErlaubt(beatRoh, entwicklung)) {
            return {ok: false, meldung: `Der Beat kommt nicht von ${ERLAUBTE_QUELLE} und wird nicht geladen.`}
        }
        beat = beatRoh
    }

    // Versatz: fehlend oder unlesbar zaehlt als 0. Bewusst nachsichtig — ein kaputter Versatz
    // darf das Oeffnen nicht verhindern, er ist im Studio ohnehin verschiebbar.
    // Negativ wird auf 0 geklemmt: das Mikrofon hinkt dem Beat immer hinterher, nie voraus
    // (dieselbe Begruendung wie bei micLagMs in Artist OS).
    const offsetRoh = Number(p.get("offsetMs"))
    const offsetMs = Number.isFinite(offsetRoh) ? Math.max(0, Math.min(offsetRoh, 2000)) : 0

    return {ok: true, auftrag: {stimme, beat, offsetMs}}
}
