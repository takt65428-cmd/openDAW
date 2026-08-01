import {assert, DefaultObservableValue, Errors, Option, panic, RuntimeNotifier} from "@opendaw/lib-std"
import {AudioData, WavFile} from "@opendaw/lib-dsp"
// TAKT-FORK: `FFmpegConverter`, `FFmpegWorker` und `Dialogs` sind mit der Formatabfrage
// entfallen — es gibt nur noch WAV, und das rechnet `WavFile.encodeFloats` lokal.
import {ExternalLib, OfflineEngineRenderer, ProjectMeta, ProjectProfile} from "@opendaw/studio-core"
import {Files} from "@opendaw/lib-dom"
import {Promises} from "@opendaw/lib-runtime"
import {ExportConfiguration} from "@opendaw/studio-adapters"

export namespace Mixdowns {
    export const exportMixdown = async ({project: source, meta}: ProjectProfile): Promise<void> => {
        const project = source.copy()
        const abortController = new AbortController()
        const progress = new DefaultObservableValue(0.0)
        const dialog = RuntimeNotifier.progress({
            headline: "Rendering mixdown...",
            progress,
            cancel: () => abortController.abort()
        })
        const result = await Promises.tryCatch(OfflineEngineRenderer
            .start(project, Option.None, progress, abortController.signal, 48_000))
        dialog.terminate()
        if (result.status === "rejected") {
            if (!Errors.isAbort(result.error)) {
                throw result.error
            }
            return
        }
        const audioData: AudioData = result.value
        // TAKT-FORK: Direkt als WAV, ohne Formatabfrage.
        //
        // ⚠️ Der Grund ist kein Bedienkomfort, sondern ein LOCH: „Mp3" und „Flac" luden den
        // FFmpeg-Kern zur Laufzeit von `package.opendaw.studio` nach — und das geschieht in
        // einem WORKER, wo die Netzsperre nicht greift (sie gilt nur fuer den Haupt-Thread).
        // Nach dem Ausbau der Zaehler und Kataloge war das der einzige verbliebene Weg, auf dem
        // tatsaechlich noch eine Anfrage nach draussen gegangen waere.
        //
        // ⚖️ Den Kern selbst mitzuliefern waere die andere Loesung gewesen — @ffmpeg/core wiegt
        // aber 64 MB, und „WAV nur beim Export" ist ohnehin die getroffene Entscheidung.
        // `WavFile.encodeFloats` rechnet lokal, ohne jede Nachladerei.
        //
        // Der Stem-Export (exportStems, weiter unten) war nie betroffen: er packt eine Zip.
        return saveWavFile(audioData, meta)
    }

    export const exportStems = async ({project: source, meta}: ProjectProfile,
                                      config: ExportConfiguration): Promise<void> => {
        const project = source.copy()
        const abortController = new AbortController()
        const progress = new DefaultObservableValue(0.0)
        const dialog = RuntimeNotifier.progress({
            headline: "Rendering mixdown...",
            progress,
            cancel: () => abortController.abort()
        })
        const {status, value, error: renderError} = await Promises.tryCatch(OfflineEngineRenderer
            .start(project, Option.wrap(config), progress, abortController.signal, 48_000))
        dialog.terminate()
        if (status === "rejected") {
            if (Errors.isAbort(renderError)) {return}
            console.warn(renderError)
            RuntimeNotifier.notify({message: "Export failed.", icon: "Warning"})
            return
        }
        const {status: zipStatus, error: zipError} = await Promises.tryCatch(
            saveZipFile(value, meta, ExportConfiguration.stemFileNames(config)))
        if (zipStatus === "rejected") {
            console.warn(zipError)
            RuntimeNotifier.notify({message: "Export failed.", icon: "Warning"})
            return
        }
    }

    const saveWavFile = async (audioData: AudioData, meta: ProjectMeta) => {
        return saveFileAfterAsync({
            buffer: WavFile.encodeFloats(audioData),
            headline: "Save Wav",
            suggestedName: `${meta.name}.wav`
        })
    }

    // TAKT-FORK: `saveMp3File` und `saveFlacFile` sind entfernt — sie waren die einzigen
    // Aufrufer von `loadFFmepg`. Damit gibt es keinen Weg mehr, auf dem der FFmpeg-Kern von
    // einem fremden Server nachgeladen wird.

    const saveZipFile = async (audioData: AudioData, meta: ProjectMeta, trackNames: ReadonlyArray<string>) => {
        const libResult = await ExternalLib.JSZip()
        if (libResult.status === "rejected") {
            console.warn(libResult.error)
            RuntimeNotifier.notify({message: "Could not load JSZip.", icon: "Warning"})
            return Promise.reject(libResult.error)
        }
        const dialog = RuntimeNotifier.progress({headline: "Creating Zip File..."})
        const numStems = audioData.numberOfChannels >> 1
        // One name per rendered pair, or `trackNames[stemIndex]` quietly yields undefined and writes
        // "undefined.wav" instead of failing (which is exactly what a missing metronome name did).
        assert(trackNames.length === numStems,
            () => `Expected ${numStems} stem names for the rendered pairs, got ${trackNames.length}`)
        const zip = new libResult.value()
        for (let stemIndex = 0; stemIndex < numStems; stemIndex++) {
            const l = audioData.frames[stemIndex * 2]
            const r = audioData.frames[stemIndex * 2 + 1]
            const stemData = AudioData.create(audioData.sampleRate, audioData.numberOfFrames, 2)
            stemData.frames[0].set(l)
            stemData.frames[1].set(r)
            const file = WavFile.encodeFloats(stemData)
            zip.file(`${trackNames[stemIndex]}.wav`, file, {binary: true})
        }
        const {status, value: arrayBuffer, error} = await Promises.tryCatch(zip.generateAsync({
            type: "arraybuffer",
            compression: "DEFLATE",
            compressionOptions: {level: 6}
        }))
        dialog.terminate()
        if (status === "rejected") {
            console.warn(error)
            RuntimeNotifier.notify({message: "Could not create zip.", icon: "Warning"})
            return
        }
        return saveFileAfterAsync({
            buffer: arrayBuffer,
            headline: "Save Zip",
            message: `Size: ${arrayBuffer.byteLength >> 20}M`,
            suggestedName: `${meta.name}.zip`
        })
    }

    // TAKT-FORK: `loadFFmepg` und `encodeAndSaveFile` sind entfallen. Der Import
    // `@opendaw/studio-core/FFmpegWorker` war die Stelle, an der der Kern von
    // `package.opendaw.studio` geholt wurde — im Worker, an der Netzsperre vorbei.

    // browsers need a user-input to allow download
    const saveFileAfterAsync = async ({buffer, headline, message, suggestedName}: {
        buffer: ArrayBuffer,
        headline: string,
        message?: string,
        suggestedName: string
    }) => {
        const approved = await RuntimeNotifier.approve({headline, message: message ?? "", approveText: "Save"})
        if (!approved) {return}
        const saveResult = await Promises.tryCatch(Files.save(buffer, {suggestedName}))
        if (saveResult.status === "rejected" && !Errors.isAbort(saveResult.error)) {
            panic(String(saveResult.error))
        }
    }
}