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

/** Baut den Parameter so, wie Artist OS ihn anhaengt. */
const suche = (spuren: unknown) => `?spuren=${encodeURIComponent(JSON.stringify(spuren))}`

describe("leseOpenAudioParameter", () => {
    it("liest mehrere Spuren mit Namen und Startposition", () => {
        const r = leseOpenAudioParameter(suche([
            {url: BEAT, name: "Beat", startMs: 180},
            {url: APP, name: "Stimme", startMs: 0},
        ]))
        expect(r.ok).toBe(true)
        if (r.ok) {
            expect(r.spuren).toHaveLength(2)
            expect(r.spuren[0]).toEqual({url: BEAT, name: "Beat", startMs: 180})
            expect(r.spuren[1].startMs).toBe(0)
        }
    })

    it("kommt mit einer einzigen Spur aus", () => {
        const r = leseOpenAudioParameter(suche([{url: APP, name: "Stimme"}]))
        expect(r.ok).toBe(true)
        if (r.ok) {expect(r.spuren).toHaveLength(1)}
    })

    it("lehnt ab, wenn der Parameter fehlt", () => {
        expect(leseOpenAudioParameter("?beat=x").ok).toBe(false)
    })

    it("lehnt eine leere Liste ab", () => {
        expect(leseOpenAudioParameter(suche([])).ok).toBe(false)
    })

    it("lehnt beschaedigtes JSON ab, statt zu werfen", () => {
        expect(leseOpenAudioParameter("?spuren=%7Bkaputt").ok).toBe(false)
    })

    it("lehnt eine fremde Quelle ab, statt still nur den Rest zu laden", () => {
        const r = leseOpenAudioParameter(suche([
            {url: APP, name: "Stimme"},
            {url: "https://boese.example/b", name: "Beat"},
        ]))
        expect(r.ok).toBe(false)
    })

    it("lehnt einen Eintrag ohne Adresse ab", () => {
        expect(leseOpenAudioParameter(suche([{name: "Stimme"}])).ok).toBe(false)
        expect(leseOpenAudioParameter(suche(["nur ein Text"])).ok).toBe(false)
    })

    it("deckelt die Anzahl der Spuren", () => {
        const viele = Array.from({length: 13}, () => ({url: APP, name: "x"}))
        expect(leseOpenAudioParameter(suche(viele)).ok).toBe(false)
    })

    it("klemmt eine negative Startposition auf 0", () => {
        const r = leseOpenAudioParameter(suche([{url: APP, startMs: -500}]))
        if (r.ok) {expect(r.spuren[0].startMs).toBe(0)}
    })

    it("deckelt eine absurde Startposition bei einer Stunde", () => {
        const r = leseOpenAudioParameter(suche([{url: APP, startMs: 99_999_999}]))
        if (r.ok) {expect(r.spuren[0].startMs).toBe(3_600_000)}
    })

    it("wertet eine unlesbare Startposition als 0 — sie darf das Oeffnen nicht verhindern", () => {
        const r = leseOpenAudioParameter(suche([{url: APP, startMs: "abc"}]))
        expect(r.ok).toBe(true)
        if (r.ok) {expect(r.spuren[0].startMs).toBe(0)}
    })

    it("vergibt einen Ersatznamen, wenn keiner mitkommt", () => {
        const r = leseOpenAudioParameter(suche([{url: APP}, {url: BEAT, name: "  "}]))
        if (r.ok) {
            expect(r.spuren[0].name).toBe("Spur 1")
            expect(r.spuren[1].name).toBe("Spur 2")
        }
    })

    it("kuerzt einen ueberlangen Namen", () => {
        const r = leseOpenAudioParameter(suche([{url: APP, name: "x".repeat(200)}]))
        if (r.ok) {expect(r.spuren[0].name).toHaveLength(60)}
    })
})
