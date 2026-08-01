import css from "./Dashboard.sass?inline"
import {Lifecycle} from "@opendaw/lib-std"
import {createElement} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Html} from "@opendaw/lib-dom"
// TAKT-FORK: Fünf Blöcke sind entfernt, weil sie alle nach draußen zeigen:
//   Backup      — Dropbox, Google Drive, Nextcloud (Menüpunkte dazu sind längst raus)
//   Links       — opendaw.org, GitHub, Discord, Instagram, LinkedIn, Newsletter des Originals
//   Sponsors    — „Join them", Spendenaufruf für ein fremdes Projekt
//   HelpFeedback— „Report a bug" führte in den Issue-Tracker von andremichelle/openDAW
//   IntroTiles  — fünf Textkacheln, die openDAW erklären („openDAW is open source…")
import {Resources} from "@/ui/dashboard/Resources"
import {ActionButtons} from "@/ui/dashboard/ActionButtons"

const className = Html.adoptStyleSheet(css, "Dashboard")

type Construct = {
    lifecycle: Lifecycle
    service: StudioService
}

export const Dashboard = ({lifecycle, service}: Construct) => (
    <div className={className}>
        <header className="hero">
            <h1>Takt Studio</h1>
            <div className="tagline">Die Werkbank von Artist OS</div>
        </header>
        <ActionButtons lifecycle={lifecycle} service={service}/>
        <div className="main">
            <div className="panel">
                <Resources lifecycle={lifecycle} service={service}/>
            </div>
        </div>
    </div>
)
