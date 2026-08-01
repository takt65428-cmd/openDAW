// TAKT-FORK — Route /open-audio?src=…&beat=…&offsetMs=…
//
// Der eigentliche Zweck des ganzen Bausteins: Aus Artist OS heraus („Im Studio oeffnen") landet
// der Nutzer hier, und das Studio steht mit seiner Aufnahme und dem passenden Beat bereit.
//
// ⚖️ ZWEI Dateien sind der Normalfall, nicht eine. Seit dem 31.07. nimmt Artist OS im
// Kopfhoerer-Weg NUR die Stimme auf; der Beat liegt getrennt daneben. Genau deshalb ist der
// Sprung ins Mehrspur-Studio ueberhaupt sinnvoll — mit einer fertig gemischten Datei gaebe es
// hier nichts zu tun.
//
// Aufbau nach der Vorlage des Stems-Imports (service/StudioService.ts, importStems) und
// ui/pages/OpenBundlePage.tsx:
//   1. neues Projekt (sonst gibt es kein boxGraph, in das die Spuren gehoeren)
//   2. je Datei: importFile -> AudioFileBox -> Tape-Spur -> Region
//
// Der Beat liegt bei 0, die Stimme bei offsetMs. Der Versatz kommt als ZAHL aus der App, wo ihn
// der Nutzer an einem Regler eingestellt hat — er wird hier NICHT neu geschaetzt.
import {createElement, PageContext, PageFactory} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Promises} from "@opendaw/lib-runtime"
import {RuntimeNotifier, UUID} from "@opendaw/lib-std"
import {AudioContentFactory} from "@opendaw/studio-core"
import {InstrumentFactories} from "@opendaw/studio-adapters"
import {AudioFileBox} from "@opendaw/studio-boxes"
import {leseOpenAudioParameter} from "./openAudioParams"

interface Geladen {
    name: string
    arrayBuffer: ArrayBuffer
    /** Startposition in Sekunden. Der Beat liegt bei 0, die Stimme um ihren Versatz spaeter. */
    startSekunden: number
}

async function hole(url: string, name: string): Promise<Geladen | null> {
    const {status, value} = await Promises.tryCatch(fetch(url).then(r => {
        // ⚠️ `response.ok` MUSS geprueft werden. Die Bruecke antwortet mit 401 (Link abgelaufen),
        // 403 (falsche Herkunft), 404 (Aufnahme geloescht) oder 409 (verschluesselt) — und in
        // JEDEM dieser Faelle ist `r.arrayBuffer()` ein kurzer Textkoerper, den der Decoder
        // spaeter als „kaputte Datei" meldet. Ohne diese Zeile bekaeme der Nutzer also die
        // falsche Fehlermeldung.
        if (!r.ok) {throw new Error(`${r.status} ${r.statusText}`)}
        return r.arrayBuffer()
    }))
    if (status === "rejected") {return null}
    return {name, arrayBuffer: value, startSekunden: 0}
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
            const {stimme, beat, offsetMs} = gelesen.auftrag

            const dialog = RuntimeNotifier.progress({headline: "Aufnahme wird geladen..."})
            // Beide Dateien parallel — sie sind unabhaengig, und auf dem Handy zaehlt jede Sekunde.
            const [stimmDatei, beatDatei] = await Promise.all([
                hole(stimme, "Stimme"),
                beat === null ? Promise.resolve(null) : hole(beat, "Beat"),
            ])
            if (stimmDatei === null) {
                dialog.terminate()
                return RuntimeNotifier.info({
                    headline: "Aufnahme nicht abrufbar",
                    message: "Der Link ist abgelaufen oder die Aufnahme ist nicht mehr verfuegbar. "
                        + "Bitte in Artist OS erneut auf „Im Studio oeffnen\" tippen.",
                })
            }
            // ⚠️ Ein fehlender Beat bricht NICHT ab. Die Stimme ist die Arbeit des Nutzers; sie
            // deshalb nicht zu oeffnen waere die schlechtere Antwort. Der Hinweis kommt am Ende.
            stimmDatei.startSekunden = offsetMs / 1000

            await service.newProject()
            const {editing, boxGraph, api} = service.project

            // Beat zuerst, damit er im Studio die obere Spur ist — darunter singt man.
            const spuren = [beatDatei, stimmDatei].filter((d): d is Geladen => d !== null)
            for (const datei of spuren) {
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
                        position: datei.startSekunden,
                        targetTrack: trackBox,
                    })
                })
            }
            dialog.terminate()

            if (beat !== null && beatDatei === null) {
                RuntimeNotifier.info({
                    headline: "Beat fehlt",
                    message: "Die Stimme wurde geladen, der Beat nicht. Er laesst sich im Studio "
                        + "von Hand hinzufuegen.",
                }).finally()
            }
        }}>{meldung}</div>
    )
}
