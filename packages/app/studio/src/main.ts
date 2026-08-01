// TAKT-FORK: MUSS der erste Import bleiben. Die Sperre installiert sich als Seiteneffekt und
// kann nur abfangen, was nach ihr losgeschickt wird — Import-Reihenfolge ist hier nicht
// kosmetisch. Begruendung ausfuehrlich in takt/netzsperre.ts.
import "@/takt/netzsperre"
import "./main.sass"
import workersUrl from "@opendaw/studio-core/workers-main.js?worker&url"
import workletsUrl from "@opendaw/studio-core/processors.js?url"
import wasmProcessorUrl from "@opendaw/studio-core-wasm/wasm-processor.js?url"
import wasmOfflineWorkerUrl from "@opendaw/studio-core-wasm/wasm-offline-worker.js?worker&url"
import {boot} from "@/boot"
import {initializeColors} from "@opendaw/studio-enums"
import {Browser} from "@opendaw/lib-dom"
import {zeigeHandyHinweis} from "@/takt/handyHinweis"

// TAKT-FORK: Die Handy-SPERRE ist raus (Begruendung in takt/handyHinweis.ts). Damit ist
// `crossOriginIsolated` die einzige verbliebene Bedingung — und das ist richtig so: sie prueft
// eine echte technische Voraussetzung, nicht eine Geraeteklasse.
if (window.crossOriginIsolated) {
    const now = Date.now()
    initializeColors(document.documentElement)
    boot({
        workersUrl,
        workletsUrl,
        wasmProcessorUrl,
        wasmOfflineWorkerUrl
    }).then(() => {
        console.debug(`Booted in ${Math.ceil(Date.now() - now)}ms`)
        // Erst NACH dem Boot: vorher wuerde der Hinweis mit dem Preloader um dieselbe Flaeche
        // streiten, und ein Boot-Abbruch soll seine eigene Meldung zeigen, nicht diese.
        if (Browser.isMobile()) {zeigeHandyHinweis()}
    })
} else {
    alert("crossOriginIsolated must be enabled")
}