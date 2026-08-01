// TAKT-FORK: `isDefined` wurde nur vom entfernten Favicon-Umschalter gebraucht.
import {Terminator} from "@opendaw/lib-std"
import {createElement, Frag, Router} from "@opendaw/lib-jsx"
import {WorkspacePage} from "@/ui/workspace/WorkspacePage.tsx"
import {StudioService} from "@/service/StudioService.ts"
import {ComponentsPage} from "@/ui/pages/ComponentsPage.tsx"
import {IconsPage} from "@/ui/pages/IconsPage.tsx"
import {AutomationPage} from "@/ui/pages/AutomationPage.tsx"
import {SampleUploadPage} from "@/ui/pages/SampleUploadPage.tsx"
import {Footer} from "@/ui/Footer"
import {RoomStatus} from "@/ui/RoomStatus"
import {ChatOverlay} from "@/ui/ChatOverlay"
import {ManualPage} from "@/ui/pages/ManualPage"
import {ColorsPage} from "@/ui/pages/ColorsPage"
import {Header} from "@/ui/header/Header"
import {ErrorsPage} from "@/ui/pages/ErrorsPage.tsx"
import {ImprintPage} from "@/ui/pages/ImprintPage.tsx"
import {GraphPage} from "@/ui/pages/GraphPage"
import {CodeEditorPage} from "@/ui/pages/CodeEditorPage"
import {OpenBundlePage} from "@/ui/pages/OpenBundlePage"
// TAKT-FORK: `DashboardPage` ist mit den Routen /stats und /users entfallen.
import {PrivacyPage} from "@/ui/pages/PrivacyPage"
import {PreferencesPage} from "@/ui/pages/PreferencesPage"
import {TestPage} from "@/ui/pages/TestPage"
import {JoinRoomPage} from "@/ui/pages/JoinRoomPage"
import {PerformancePage} from "@/ui/pages/PerformancePage"
import {SampleReadPage} from "@/ui/pages/SampleReadPage"
// TAKT-FORK: `SpikeTestPage` ist mit der Route entfallen.
import {OpenAudioPage} from "@/takt/OpenAudioPage"

export const App = (service: StudioService) => {
    const terminator = new Terminator()
    // TAKT-FORK: Der Umschalter auf das „Live"-Symbol ist entfernt. Er zeigte an, dass ein
    // Mitarbeitsraum laeuft — die Raumfunktion braucht den Server des Originals und ist hier
    // nicht in Gebrauch. Er haette bei jedem Start das Takt-Logo aus index.html gegen das
    // openDAW-Symbol getauscht, also genau das Branding rueckgaengig gemacht.
    return (
        <Frag>
            <RoomStatus lifecycle={terminator} service={service}/>
            <Header lifecycle={new Terminator()} service={service}/>
            <Router
                runtime={terminator}
                service={service}
                fallback={() => (
                    <div style={{flex: "1 0 0", display: "flex", justifyContent: "center", alignItems: "center"}}>
                        <span style={{fontSize: "50vmin"}}>404</span>
                    </div>
                )}
                routes={[
                    {path: "/", factory: WorkspacePage, reuse: true},
                    {path: "/create", factory: WorkspacePage, reuse: true},
                    {path: "/manuals/*", factory: ManualPage},
                    {path: "/preferences", factory: PreferencesPage},
                    {path: "/imprint", factory: ImprintPage},
                    {path: "/privacy", factory: PrivacyPage},
                    {path: "/icons", factory: IconsPage},
                    {path: "/code", factory: CodeEditorPage},
                    {path: "/scripting", factory: CodeEditorPage},
                    {path: "/components", factory: ComponentsPage},
                    {path: "/automation", factory: AutomationPage},
                    {path: "/errors", factory: ErrorsPage},
                    {path: "/upload", factory: SampleUploadPage},
                    {path: "/colors", factory: ColorsPage},
                    {path: "/graph", factory: GraphPage},
                    // TAKT-FORK: /stats und /users sind entfernt — die Statistik-Seite zeigt
                    // Besucher-, Raum- und Nutzungszahlen der ORIGINAL-Seite.
                    {path: "/open-bundle/*", factory: OpenBundlePage},
                    // TAKT-FORK: Einstieg aus Artist OS. Die Parameter stehen in der QUERY, nicht
                    // im Pfad — sie enthalten vollstaendige URLs mit eigenen Query-Teilen, die in
                    // einem Pfadsegment nur verstuemmelt ankaemen.
                    {path: "/open-audio", factory: OpenAudioPage},
                    {path: "/test", factory: TestPage},
                    {path: "/performance", factory: PerformancePage},
                    {path: "/performance/sample-read", factory: SampleReadPage},
                    // TAKT-FORK: /spike-test ist entfernt — eine Entwicklerseite, die KI-Modelle
                    // von assets.opendaw.studio zieht (htdemucs). Hier steht ein normaler
                    // Kommentar und KEIN {/* … */}: das ist ein Array-Literal, dort waere die
                    // JSX-Schreibweise ein leeres Objekt — also eine Route ohne Pfad.
                    {path: "/join/*", factory: JoinRoomPage}
                ]}
            />
            <ChatOverlay lifecycle={terminator} service={service}/>
            <Footer lifecycle={terminator} service={service}/>
        </Frag>
    )
}