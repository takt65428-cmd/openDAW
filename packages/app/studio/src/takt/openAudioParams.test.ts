import {describe, it, expect} from "vitest"
import {leseOpenAudioParameter, quelleErlaubt} from "./openAudioParams"

const APP = "https://app.takt-studios.de/api/daw/audio/a.xyz"
const BEAT = "https://app.takt-studios.de/api/daw/audio/a.abc"

describe("quelleErlaubt", () => {
    it("laesst https von app.takt-studios.de durch", () => {
        expect(quelleErlaubt(APP, false)).toBe(true)
    })

    it("lehnt http auf der echten Domain ab", () => {
        expect(quelleErlaubt("http://app.takt-studios.de/x", false)).toBe(false)
    })

    it("lehnt fremde Hosts ab", () => {
        expect(quelleErlaubt("https://boese.example/x", false)).toBe(false)
    })

    it("faellt nicht auf angehaengte Namen herein", () => {
        // Der klassische Allowlist-Fehler waere endsWith(...) — dann ginge das hier durch.
        expect(quelleErlaubt("https://app.takt-studios.de.boese.example/x", false)).toBe(false)
    })

    it("faellt nicht auf eine Unterdomain herein", () => {
        expect(quelleErlaubt("https://boese.app.takt-studios.de/x", false)).toBe(false)
    })

    it("lehnt Nutzerangaben im Autoritaetsteil ab", () => {
        // "https://app.takt-studios.de@boese.example/" zeigt in Wahrheit auf boese.example.
        expect(quelleErlaubt("https://app.takt-studios.de@boese.example/x", false)).toBe(false)
    })

    it("lehnt relative Pfade ab", () => {
        expect(quelleErlaubt("/api/daw/audio/x", false)).toBe(false)
    })

    it("lehnt andere Protokolle ab", () => {
        expect(quelleErlaubt("javascript:alert(1)", false)).toBe(false)
        expect(quelleErlaubt("file:///etc/passwd", false)).toBe(false)
        expect(quelleErlaubt("data:audio/mpeg;base64,AAAA", false)).toBe(false)
    })

    it("erlaubt localhost NUR in der Entwicklung", () => {
        expect(quelleErlaubt("http://localhost:3000/x", true)).toBe(true)
        expect(quelleErlaubt("http://localhost:3000/x", false)).toBe(false)
    })
})

describe("leseOpenAudioParameter", () => {
    it("liest Stimme, Beat und Versatz", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}&beat=${encodeURIComponent(BEAT)}&offsetMs=180`)
        expect(r.ok).toBe(true)
        if (r.ok) {
            expect(r.auftrag.stimme).toBe(APP)
            expect(r.auftrag.beat).toBe(BEAT)
            expect(r.auftrag.offsetMs).toBe(180)
        }
    })

    it("kommt ohne Beat aus", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}`)
        if (r.ok) {
            expect(r.auftrag.beat).toBeNull()
            expect(r.auftrag.offsetMs).toBe(0)
        }
    })

    it("behandelt einen leeren beat-Parameter wie keinen", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}&beat=`)
        expect(r.ok).toBe(true)
        if (r.ok) {expect(r.auftrag.beat).toBeNull()}
    })

    it("lehnt ab, wenn src fehlt", () => {
        expect(leseOpenAudioParameter("?beat=x").ok).toBe(false)
    })

    it("lehnt eine fremde Stimme ab", () => {
        expect(leseOpenAudioParameter("?src=https://boese.example/x").ok).toBe(false)
    })

    it("lehnt einen fremden Beat ab, statt still nur die Stimme zu laden", () => {
        const r = leseOpenAudioParameter(
            `?src=${encodeURIComponent(APP)}&beat=${encodeURIComponent("https://boese.example/b")}`)
        expect(r.ok).toBe(false)
    })

    it("klemmt einen negativen Versatz auf 0", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}&offsetMs=-500`)
        if (r.ok) {expect(r.auftrag.offsetMs).toBe(0)}
    })

    it("deckelt einen absurden Versatz bei 2000", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}&offsetMs=999999`)
        if (r.ok) {expect(r.auftrag.offsetMs).toBe(2000)}
    })

    it("wertet einen unlesbaren Versatz als 0 — er darf das Oeffnen nicht verhindern", () => {
        const r = leseOpenAudioParameter(`?src=${encodeURIComponent(APP)}&offsetMs=abc`)
        expect(r.ok).toBe(true)
        if (r.ok) {expect(r.auftrag.offsetMs).toBe(0)}
    })
})
