// TAKT-FORK: Eigenes Impressum.
//
// ⚠️ Hier standen die Angaben von André Michelle (Köln, hello@opendaw.org). Sie stehenzulassen
// waere in zwei Richtungen falsch: es fehlte das gesetzlich vorgeschriebene Impressum des
// tatsaechlichen Anbieters, UND es haette einen Dritten als Verantwortlichen fuer einen Dienst
// benannt, den er nicht betreibt.
//
// Quelle der Angaben: takt-web (`src/app/impressum/page.tsx`, `src/lib/content.ts`) — damit
// steht auf beiden Seiten dasselbe.
import css from "./ImprintPage.sass?inline"
import {createElement, PageContext, PageFactory} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Html} from "@opendaw/lib-dom"
import {Colors} from "@opendaw/studio-enums"
import {installScrollbars} from "@/ui/components/Scrollbars"

const className = Html.adoptStyleSheet(css, "ImprintPage")

export const ImprintPage: PageFactory<StudioService> = ({lifecycle}: PageContext<StudioService>) => (
    <div className={className} onConnect={host => lifecycle.own(installScrollbars(host))}>
        <h1>Impressum</h1>
        <h3>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</h3>
        <h4>Diensteanbieter</h4>
        <p>
            <span style={{color: Colors.cream.toString()}}>Takt Studios</span><br/>
            Mohamed Boulghalegh<br/>
            Bahnhofsplatz 1<br/>
            65428 Rüsselsheim
        </p>
        <h4>Kontakt</h4>
        <p>
            Telefon: 0157 34886036<br/>
            E-Mail: <a style={{color: Colors.blue}} href="mailto:info@takt-studios.de">info@takt-studios.de</a>
        </p>
        <h4>Umsatzsteuer</h4>
        <p>
            Kleinunternehmer im Sinne von § 19 Umsatzsteuergesetz (UStG). Es wird daher keine
            Umsatzsteuer ausgewiesen und keine Umsatzsteuer-ID geführt.
        </p>
        <h4>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h4>
        <p>
            Mohamed Boulghalegh<br/>
            Bahnhofsplatz 1, 65428 Rüsselsheim
        </p>
        <h4>Herkunft dieser Software</h4>
        <p>
            Dieses Studio beruht auf <a style={{color: Colors.blue}} href="https://opendaw.org">openDAW</a> von
            André Michelle und steht unter der <a style={{color: Colors.blue}}
                                                  href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL v3</a>.
            Takt Studios hat diese Fassung verändert; der vollständige Quelltext liegt
            unter <a style={{color: Colors.blue}}
                    href="https://github.com/takt65428-cmd/openDAW/tree/takt">github.com/takt65428-cmd/openDAW</a>
            (Zweig <span style={{color: Colors.cream.toString()}}>takt</span>).
            Für die Änderungen und für den Betrieb dieser Seite ist Takt Studios verantwortlich,
            nicht der ursprüngliche Autor.
        </p>
    </div>
)
