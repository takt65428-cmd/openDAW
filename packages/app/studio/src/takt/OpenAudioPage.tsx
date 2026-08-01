// TAKT-FORK — Route /open-audio?spuren=[…]
//
// Der eigentliche Zweck des ganzen Bausteins: Aus Artist OS heraus („Im Studio oeffnen") landet
// der Nutzer hier, und das Studio steht mit seiner Aufnahme, dem passenden Beat und allen
// Nebenspuren bereit.
//
// ⚖️ MEHRERE Dateien sind der Normalfall, nicht eine. Seit dem 31.07. nimmt Artist OS im
// Kopfhoerer-Weg NUR die Stimme auf; der Beat liegt getrennt daneben, Doubles und Adlibs
// ebenso. Genau deshalb ist der Sprung ins Mehrspur-Studio ueberhaupt sinnvoll — mit einer
// fertig gemischten Datei gaebe es hier nichts zu tun.
//
// ⚠️ Die AUSRICHTUNG wird hier nicht gerechnet. Jede Spur bringt ihre Startposition mit, weil die
// Zeitrechnung in Artist OS steht (lib/audio/mixplan.ts und lib/audio/dawUebergabe.ts) und dort
// geprueft ist. Sie hier ein zweites Mal herzuleiten hiesse, zwei Wahrheiten zu pflegen.
//
// Aufbau nach der Vorlage des Stems-Imports (service/StudioService.ts, importStems) und
// ui/pages/OpenBundlePage.tsx:
//   1. neues Projekt (sonst gibt es kein boxGraph, in das die Spuren gehoeren)
//   2. je Datei: importFile -> AudioFileBox -> Tape-Spur -> Region
import {createElement, PageContext, PageFactory} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Promises} from "@opendaw/lib-runtime"
import {RuntimeNotifier, UUID} from "@opendaw/lib-std"
import {AudioContentFactory} from "@opendaw/studio-core"
import {InstrumentFactories} from "@opendaw/studio-adapters"
import {AudioFileBox} from "@opendaw/studio-boxes"
import {DawSpur, leseOpenAudioParameter} from "./openAudioParams"

interface Geladen extends DawSpur {
    arrayBuffer: ArrayBuffer
}

async function hole(spur: DawSpur): Promise<Geladen | null> {
    const {status, value} = await Promises.tryCatch(fetch(spur.url).then(r => {
        // ⚠️ `response.ok` MUSS geprueft werden. Die Bruecke antwortet mit 401 (Link abgelaufen),
        // 403 (falsche Herkunft), 404 (Aufnahme geloescht) oder 409 (verschluesselt) — und in
        // JEDEM dieser Faelle ist `r.arrayBuffer()` ein kurzer Textkoerper, den der Decoder
        // spaeter als „kaputte Datei" meldet. Ohne diese Zeile bekaeme der Nutzer also die
        // falsche Fehlermeldung.
        if (!r.ok) {throw new Error(`${r.status} ${r.statusText}`)}
        return r.arrayBuffer()
    }))
    if (status === "rejected") {return null}
    return {...spur, arrayBuffer: value}
}

export const OpenAudioPage: PageFactory<StudioService> = ({service}: PageContext<StudioService>) => {
    const meldung: HTMLElement = <h5/>
    return (
        // ⚠️ `onInit` MUSS genau ein Argument nehmen: lib-jsx prueft `fn.length === 1` und wirft
        // sonst "value of 'onLoad' must be a Function with a single argument" — beim RENDERN,
        // nicht beim Uebersetzen. Mit einer argumentlosen Pfeilfunktion lief der Import hier nie
        // an, und die Seite sah dabei voellig normal aus (leeres Projekt, keine Fehlermeldung).
        <div style={{padding: "2em", textAlign: "center"}} onInit={async (_element) => {
            const gelesen = leseOpenAudioParameter(location.search, location.hostname === "localhost")
            if (!gelesen.ok) {
                return RuntimeNotifier.info({headline: "Aufnahme konnte nicht geoeffnet werden", message: gelesen.meldung})
            }

            const dialog = RuntimeNotifier.progress({headline: "Aufnahme wird geladen..."})
            // Alle Dateien parallel — sie sind unabhaengig, und auf dem Handy zaehlt jede Sekunde.
            const geladen = await Promise.all(gelesen.spuren.map(hole))
            const brauchbar = geladen.filter((g): g is Geladen => g !== null)
            if (brauchbar.length === 0) {
                dialog.terminate()
                return RuntimeNotifier.info({
                    headline: "Aufnahme nicht abrufbar",
                    message: "Der Link ist abgelaufen oder die Aufnahme ist nicht mehr verfuegbar. "
                        + "Bitte in Artist OS erneut auf „Im Studio oeffnen\" tippen.",
                })
            }

            await service.newProject()
            const {editing, boxGraph, api, tempoMap} = service.project

            // ⚠️ Reihenfolge wie uebergeben. Artist OS schickt den Beat zuerst, damit er im Studio
            // die obere Spur ist — darunter singt man.
            for (const datei of brauchbar) {
                meldung.textContent = `${datei.name} wird eingefuegt...`
                const {status, value: sample} = await Promises.tryCatch(
                    service.sampleService.importFile({name: datei.name, arrayBuffer: datei.arrayBuffer}))
                if (status === "rejected") {continue}
                const uuid = UUID.parse(sample.uuid)
                // Ohne das liegt zwar die Region da, aber ohne Wellenform und ohne Ton.
                await Promises.tryCatch(service.sampleManager.getAudioData(uuid))
                editing.modify(() => {
                    const {trackBox, instrumentBox} = api.createInstrument(InstrumentFactories.Tape)
                    instrumentBox.label.setValue(datei.name)
                    const audioFileBox = boxGraph.findBox<AudioFileBox>(uuid)
                        .unwrapOrElse(() => AudioFileBox.create(boxGraph, uuid, box => {
                            box.fileName.setValue(datei.name)
                            box.startInSeconds.setValue(0)
                            box.endInSeconds.setValue(sample.duration)
                        }))
                    AudioContentFactory.createNotStretchedRegion({
                        boxGraph, sample, audioFileBox,
                        // ⚠️ `position` ist PPQN (Pulses zu 960 je Viertel), NICHT Sekunden — der
                        // Typ heisst `ppqn`, und alle Aufrufer im Bestand uebergeben nur 0, wo
                        // beide Einheiten gleich aussehen. Mit Sekunden laege eine Spur bei 7,88
                        // Pulses statt bei 7,88 Sekunden, also praktisch bei null: die Spuren
                        // saehen ausgerichtet aus und waeren es nicht.
                        position: tempoMap.secondsToPPQN(datei.startMs / 1000),
                        targetTrack: trackBox,
                    })
                })
            }
            dialog.terminate()

            // ⚠️ Ein Ausfall bricht NICHT ab. Was geladen wurde, ist die Arbeit des Nutzers; sie
            // wegen einer fehlenden Nebenspur gar nicht zu oeffnen waere die schlechtere Antwort.
            const fehlend = gelesen.spuren.length - brauchbar.length
            if (fehlend > 0) {
                RuntimeNotifier.info({
                    headline: fehlend === 1 ? "Eine Spur fehlt" : `${fehlend} Spuren fehlen`,
                    message: "Der Rest wurde geladen. Die fehlenden Dateien lassen sich im Studio "
                        + "von Hand hinzufuegen.",
                }).finally()
            }
        }}>{meldung}</div>
    )
}
