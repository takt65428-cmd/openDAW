import css from "./ActionButtons.sass?inline"
import {Html} from "@opendaw/lib-dom"
import {Lifecycle} from "@opendaw/lib-std"
import {createElement} from "@opendaw/lib-jsx"
import {IconSymbol} from "@opendaw/studio-enums"
import {Icon} from "@/ui/components/Icon"
import {StudioService} from "@/service/StudioService"
// TAKT-FORK: `connectRoom` ist mit dem Live-Room-Knopf entfallen.

const className = Html.adoptStyleSheet(css, "ActionButtons")

type Construct = {
    lifecycle: Lifecycle
    service: StudioService
}

export const ActionButtons = ({service}: Construct) => (
    <div className={className}>
        <button className="action" title="Leere Zeitachse, von vorn anfangen."
                onclick={() => service.newProject()}>
            <Icon symbol={IconSymbol.New}/><span>Neues Projekt</span>
        </button>
        {/* TAKT-FORK: „New Live Room" ist entfernt. Das gemeinsame Arbeiten in Echtzeit
            braucht den Vermittlungsserver des Originals (WebSocket + TURN) — der Knopf
            wäre hier einer, der nichts tut. */}
        <button className="action" title="Ein Projektbündel (.odb) von der Festplatte laden."
                onclick={() => service.importBundle()}>
            <Icon symbol={IconSymbol.Folder}/><span>Projekt öffnen</span>
        </button>
    </div>
)
