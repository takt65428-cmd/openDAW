// TAKT-FORK — Netzsperre.
//
// openDAW spricht im Auslieferungszustand mit einer ganzen Reihe fremder Server. Beim Booten
// feuert mindestens einer davon ungefragt (der Besucherzaehler in `ui/Footer.tsx`), und
// `errors/ErrorHandler.ts` schickt NUTZERFEHLERBERICHTE an logs.opendaw.studio.
// `ui/info-panel/PublishMusic.ts` laedt sogar NUTZERMUSIK auf einen fremden Server — und zwar
// per XMLHttpRequest, nicht per fetch.
//
// Auf daw.takt-studios.de darf davon nichts passieren: der Betreiber ist Takt Studios, und was
// die Nutzer dort aufnehmen, geht niemanden sonst etwas an (DSGVO).
//
// WARUM EINE ZENTRALE SPERRE UND NICHT NUR AUSBAUEN:
// Beides. Die einzelnen Aufrufer werden entfernt, damit nichts Totes im UI steht. Diese Sperre
// ist das NETZ darunter — sie faengt, was beim Ausbauen uebersehen wird und was ein spaeterer
// Upstream-Merge neu hereintraegt. Ein Fork, der nur an zwanzig Stellen etwas wegnimmt, ist beim
// naechsten Abgleich still wieder undicht.
//
// ⚠️ GRENZE, die ehrlich bleiben muss: Das hier gilt fuer den HAUPT-THREAD. Worker und Worklets
// haben einen eigenen globalen Kontext und werden davon NICHT erfasst. Fuer die bekannten Faelle
// (FFmpeg-Core-Spiegel, ONNX-Modelle) muss die Quelle selbst umgestellt werden.

/** Hosts, mit denen der Fork sprechen darf. Alles andere wird abgewiesen. */
function erlaubt(url: string): boolean {
    let ziel: URL
    try {
        ziel = new URL(url, location.href)
    } catch {
        return true // nicht auflösbar -> nicht unsere Zustaendigkeit, soll normal scheitern
    }
    // Nicht-Netz-Protokolle sind unbedenklich: sie verlassen das Geraet nicht.
    if (ziel.protocol === "data:" || ziel.protocol === "blob:") {return true}
    if (ziel.origin === location.origin) {return true}
    // Die Bruecke: von dort holt der Fork die Aufnahme, die der Nutzer selbst geschickt hat.
    if (ziel.hostname === "app.takt-studios.de") {return true}
    // Oertliche Entwicklung: der artist-os-Dev-Server laeuft auf einem anderen Port.
    if (location.hostname === "localhost" && ziel.hostname === "localhost") {return true}
    return false
}

function melde(art: string, url: string): void {
    console.warn(`[takt] ${art} an fremden Server unterbunden: ${url}`)
}

// ⚠️ Die Installation passiert als SEITENEFFEKT beim Import, nicht ueber einen Aufruf im
// Rumpf von main.ts. Grund: ES-Module werden gehoistet — ALLE `import`-Anweisungen laufen
// vollstaendig durch, bevor die erste Zeile im Rumpf ausgefuehrt wird. Ein Aufruf dort waere
// also zu spaet fuer alles, was beim Auswerten der anderen Module bereits losgeschickt wird.
// Deshalb genuegt in main.ts ein `import "@/takt/netzsperre"` als ERSTE Zeile.
export function installiereNetzsperre(): void {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (eingabe: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof eingabe === "string" ? eingabe
            : eingabe instanceof URL ? eingabe.href
                : eingabe.url
        if (!erlaubt(url)) {
            melde("fetch", url)
            // ⚠️ HIER STAND EINMAL `Promise.reject(new TypeError("Failed to fetch"))` — das war
            // falsch, und zwar messbar: der Preset-Index wurde beim Booten in einer
            // ENDLOSSCHLEIFE angefragt (dutzende Versuche je Seitenaufruf).
            //
            // Grund: openDAW wickelt seine Abrufe in `Promises.retry` (lib-runtime), und das
            // wiederholt bei ABGELEHNTER Zusage — ein Netzfehler gilt dort als voruebergehend.
            // Eine erfuellte Antwort mit Fehlerstatus wiederholt es dagegen NICHT.
            //
            // Deshalb eine echte 403: kein Wiederholungssturm, und trotzdem kein Durchwinken —
            // `response.ok` ist false, `.json()` auf dem leeren Rumpf wirft, und die Aufrufer
            // landen in ihrem vorhandenen Fehlerzweig (leere Liste statt Cloud-Inhalten).
            // Eine gefaelschte 200 waere das eigentlich Gefaehrliche gewesen.
            return Promise.resolve(new Response(null, {status: 403, statusText: "Blocked by takt fork"}))
        }
        return originalFetch(eingabe as RequestInfo, init)
    }

    // XMLHttpRequest getrennt: PublishMusic nutzt genau das, kein fetch.
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest, ...args: Parameters<typeof originalOpen>
    ) {
        const url = args[1]
        const alsText = typeof url === "string" ? url : url.href
        if (!erlaubt(alsText)) {
            melde("XHR", alsText)
            throw new DOMException("Blocked by takt fork", "NetworkError")
        }
        return originalOpen.apply(this, args)
    } as typeof XMLHttpRequest.prototype.open

    // Live-Raeume und der yjs-Abgleich laufen ueber WebSockets (wss://live.opendaw.studio).
    const OriginalWebSocket = window.WebSocket
    window.WebSocket = function (this: WebSocket, url: string | URL, protokolle?: string | string[]) {
        const alsText = typeof url === "string" ? url : url.href
        if (!erlaubt(alsText)) {
            melde("WebSocket", alsText)
            throw new DOMException("Blocked by takt fork", "SecurityError")
        }
        return new OriginalWebSocket(url, protokolle)
    } as unknown as typeof WebSocket
    window.WebSocket.prototype = OriginalWebSocket.prototype
    Object.assign(window.WebSocket, {
        CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
    })

    // sendBeacon ueberlebt das Schliessen der Seite — der unauffaelligste Abflussweg von allen.
    if (typeof navigator.sendBeacon === "function") {
        const originalBeacon = navigator.sendBeacon.bind(navigator)
        navigator.sendBeacon = (url: string | URL, daten?: BodyInit | null) => {
            const alsText = typeof url === "string" ? url : url.href
            if (!erlaubt(alsText)) {
                melde("sendBeacon", alsText)
                return false
            }
            return originalBeacon(url, daten)
        }
    }
}

installiereNetzsperre()
