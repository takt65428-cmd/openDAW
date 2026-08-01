// TAKT-FORK — abweisbarer Handy-Hinweis statt der eingebauten Sperrseite.
//
// Im Auslieferungszustand steht in `main.ts`:
//
//     if (Browser.isMobile()) { document.body.innerHTML = "...requires a desktop browser." }
//
// Das ist eine echte Sperrseite: auf einem Handy startet openDAW gar nicht erst. Fuer Artist OS
// ist das untragbar — die App liegt als Capacitor-App in den Stores und die Nutzer sind 17-22
// und ueberwiegend am Handy. Bei BandLab und Voloco laeuft Mehrspur-Aufnahme am Handy auch.
//
// Geprueft, bevor die Sperre fiel: Es ist EIN User-Agent-Test an EINER Stelle, kein tieferes
// Desktop-Geruest. Die harten Anforderungen (SharedArrayBuffer, WASM-SIMD, OPFS, AudioWorklet)
// gibt es auf Chrome/Android und iOS-Safari ab 16.4, und das UI nutzt durchgaengig
// PointerEvents, die auch auf Touch feuern.
//
// ⚠️ Ehrlich bleibt: Die Oberflaeche ist fuer die Maus gebaut — kleine Ziele, Kontextmenues,
// Tastenkuerzel. Deshalb ein Hinweis, kein Schweigen. Aber einer, den man wegklickt.
//
// Der `crossOriginIsolated`-Test in main.ts bleibt unangetastet: der prueft eine echte
// technische Voraussetzung, keine Geraeteklasse.

const MERKER = "takt.handyhinweis.gesehen"

export function zeigeHandyHinweis(): void {
    try {
        if (localStorage.getItem(MERKER) === "1") {return}
    } catch {
        // Privater Modus ohne localStorage: dann eben jedes Mal. Besser als gar kein Hinweis.
    }

    const huelle = document.createElement("div")
    huelle.setAttribute("role", "dialog")
    huelle.setAttribute("aria-modal", "true")
    huelle.setAttribute("aria-label", "Hinweis zur Bedienung am Handy")
    huelle.style.cssText = [
        "position:fixed", "inset:0", "z-index:99999",
        "display:flex", "align-items:center", "justify-content:center",
        "padding:1.5em", "background:rgba(0,0,0,.72)",
        "font-family:system-ui,sans-serif",
    ].join(";")

    const karte = document.createElement("div")
    karte.style.cssText = [
        "max-width:22em", "background:#1a1a1a", "color:#e8e8e8",
        "border:1px solid #3a3a3a", "border-radius:12px", "padding:1.5em",
        "text-align:center", "line-height:1.5",
    ].join(";")

    const titel = document.createElement("h2")
    titel.textContent = "Am Handy ist das hier experimentell"
    titel.style.cssText = "margin:0 0 .6em;font-size:1.1em;color:#fff"

    const text = document.createElement("p")
    text.textContent =
        "Das Studio laeuft, aber die Bedienelemente sind fuer Maus und Tastatur gebaut. "
        + "Am Rechner geht es deutlich leichter von der Hand."
    text.style.cssText = "margin:0 0 1.2em;font-size:.95em;color:#bdbdbd"

    const knopf = document.createElement("button")
    knopf.type = "button"
    knopf.textContent = "Verstanden, weiter"
    knopf.style.cssText = [
        "width:100%", "padding:.8em 1em", "font:inherit", "font-size:1em",
        "color:#111", "background:#e0b64a", "border:0", "border-radius:8px",
        "cursor:pointer",
    ].join(";")

    const schliessen = () => {
        try {
            localStorage.setItem(MERKER, "1")
        } catch { /* siehe oben */ }
        huelle.remove()
    }
    knopf.addEventListener("click", schliessen)
    // Auch der Hintergrund schliesst — ein Hinweis, den man nur ueber einen Knopf loswird,
    // ist auf einem kleinen Bildschirm schnell eine Falle.
    huelle.addEventListener("click", (e) => {if (e.target === huelle) {schliessen()}})

    karte.append(titel, text, knopf)
    huelle.append(karte)
    document.body.append(huelle)
    knopf.focus()
}
