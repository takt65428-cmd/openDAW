// TAKT-FORK: Eigene Datenschutzerklärung.
//
// ⚠️ Der alte Text stimmte fuer DIESE Installation in beide Richtungen nicht. Er versprach
// „does not track visitors", waehrend die Originalfassung tatsaechlich Besucher zaehlte, Latenz
// meldete und einen Nutzerzaehler abfragte (alles am 01.08. ausgebaut). Und er beschrieb
// Cloud-Anbindungen an Google Drive und Dropbox, die hier niemand nutzt — dafuer fehlte der
// eine Weg, den es hier wirklich gibt: die Übergabe aus Artist OS.
//
// Was hier steht, ist am 01.08.2026 an der laufenden Seite NACHGEMESSEN, nicht abgeschrieben.
import css from "./PrivacyPage.sass?inline"
import {createElement, PageContext, PageFactory} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Html} from "@opendaw/lib-dom"
import {Colors} from "@opendaw/studio-enums"
import {installScrollbars} from "@/ui/components/Scrollbars"

const className = Html.adoptStyleSheet(css, "PrivacyPage")

export const PrivacyPage: PageFactory<StudioService> = ({lifecycle}: PageContext<StudioService>) => (
    <div className={className} onConnect={host => lifecycle.own(installScrollbars(host))}>
        <h1>Datenschutz</h1>
        <p style={{color: Colors.blue.toString()}}>
            Dieses Studio kommt ohne Konto, ohne Zähler und ohne Werkzeuge zur Analyse aus. Deine
            Aufnahmen bleiben auf deinem Gerät.
        </p>

        <h3>Was auf deinem Gerät bleibt</h3>
        <p>
            Projekte, Aufnahmen und Einstellungen liegen im Speicher deines Browsers auf diesem
            Gerät. Sie werden nicht an uns übertragen. Löschst du die Browserdaten, sind sie weg —
            es gibt keine Kopie bei uns.
        </p>

        <h3>Der einzige Weg nach außen: die Übergabe aus Artist OS</h3>
        <p>
            Öffnest du eine Aufnahme über „Im Studio öffnen" in Artist OS, holt diese Seite genau
            die dabei benannten Dateien von <span style={{color: Colors.cream.toString()}}>app.takt-studios.de</span>.
            Der Link dafür ist an eine einzelne Aufnahme gebunden und läuft nach zehn Minuten ab.
            Ende-zu-Ende verschlüsselte Aufnahmen werden nicht übergeben — der Server kann sie
            nicht lesen.
        </p>

        <h3>Keine Verbindungen zu Dritten</h3>
        <p>
            Diese Fassung ruft keine fremden Server auf. Besucher- und Nutzerzähler, die
            Latenzmeldung, die Beispiel-Bibliotheken und die Veröffentlichung auf einer fremden
            Musikseite sind entfernt. Zusätzlich weist eine eingebaute Sperre Anfragen an fremde
            Adressen ab. Auch Schriftarten werden nicht nachgeladen.
        </p>

        <h3>Server-Protokolle</h3>
        <p>
            Beim Abruf dieser Seite fallen beim Hoster technisch notwendige Protokolldaten an
            (IP-Adresse, Zeitpunkt, aufgerufene Datei). Sie dienen dem sicheren Betrieb, werden
            nicht mit anderen Daten zusammengeführt und nach kurzer Zeit gelöscht.
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>

        <h3>Deine Rechte</h3>
        <p>
            Dir stehen Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und
            Widerspruch zu (Art. 15–21 DSGVO) sowie die Beschwerde bei einer Aufsichtsbehörde.
        </p>

        <h3>Kontakt</h3>
        <p>
            Verantwortlich ist Takt Studios (Anschrift im <a style={{color: Colors.blue}}
                                                            href="/imprint">Impressum</a>).
            Fragen an <a style={{color: Colors.blue}} href="mailto:info@takt-studios.de">info@takt-studios.de</a>.
        </p>
    </div>
)
