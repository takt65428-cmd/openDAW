import {EmptyExec} from "@opendaw/lib-std"
import {Browser, Files} from "@opendaw/lib-dom"
import {RouteLocation} from "@opendaw/lib-jsx"
import {Promises} from "@opendaw/lib-runtime"
import {Colors, IconSymbol} from "@opendaw/studio-enums"
// TAKT-FORK: `CloudBackup` ist mit dem Backup-Menue entfallen.
import {FilePickerAcceptTypes, MenuItem} from "@opendaw/studio-core"
import {StudioService} from "@/service/StudioService"
import {GlobalShortcuts} from "@/ui/shortcuts/GlobalShortcuts"
import {VideoRenderer} from "@/video/VideoRenderer"
import {createDebugMenu} from "@/service/DebugMenu"
import {connectRoom} from "@/service/StudioLiveRoomConnect"
// TAKT-FORK: `AiDemux` ist mit dem Menueeintrag entfallen.
// TAKT-FORK: `NextcloudDialogs` ist mit dem Nextcloud-Menue entfallen.

export const populateStudioMenu = (service: StudioService) => {
    const Global = GlobalShortcuts
    return MenuItem.root()
        .setRuntimeChildrenProcedure(parent => {
                parent.addMenuItem(
                    MenuItem.header({label: "openDAW", icon: IconSymbol.OpenDAW, color: Colors.green}),
                    MenuItem.default({
                        label: "Dashboard",
                        shortcut: Global["workspace-screen-dashboard"].shortcut.format()
                    }).setTriggerProcedure(() => service.closeProject()),
                    MenuItem.default({
                        label: "New",
                        separatorBefore: true
                    }).setTriggerProcedure(() => service.newProject()),
                    MenuItem.default({
                        label: "Open...",
                        shortcut: Global["project-open"].shortcut.format()
                    }).setTriggerProcedure(() => service.browseLocalProjects()),
                    MenuItem.default({
                        label: "Save",
                        shortcut: Global["project-save"].shortcut.format(),
                        selectable: service.hasProfile
                    }).setTriggerProcedure(() => service.projectProfileService.save()),
                    MenuItem.default({
                        label: "Save As...",
                        shortcut: Global["project-save-as"].shortcut.format(),
                        selectable: service.hasProfile
                    }).setTriggerProcedure(() => service.projectProfileService.saveAs()),
                    MenuItem.default({
                        label: "Save as Template...",
                        selectable: service.hasProfile
                    }).setTriggerProcedure(() => service.projectProfileService.saveAsTemplate()),
                    MenuItem.default({label: "Import", separatorBefore: true})
                        .setRuntimeChildrenProcedure(parent => parent.addMenuItem(
                            MenuItem.default({label: "Audio Files..."})
                                .setTriggerProcedure(() => service.sampleService.browse(true)),
                            MenuItem.default({label: "Stems (Zip)..."})
                                .setTriggerProcedure(() => service.importStems()),
                            // TAKT-FORK: „AI Demux..." (Stem-Trennung) ist entfernt. Sie laedt ihre
                            // Modelle von opendaw.studio — die Netzsperre weist das ab, der Eintrag
                            // waere also ein Knopf, der nichts tut. Nebenbei faellt damit die
                            // ONNX-Laufzeit aus dem Build (2 x 25,6 MB, sie lag doppelt da).
                            MenuItem.default({label: "Soundfont Files..."})
                                .setTriggerProcedure(() => service.soundfontService.browse(true)),
                            MenuItem.default({label: "Project Bundle..."})
                                .setTriggerProcedure(() => service.importBundle()),
                            MenuItem.default({label: "Preset Bundle..."})
                                .setTriggerProcedure(() => service.importPreset().then(EmptyExec)),
                            MenuItem.default({label: "DAWproject..."})
                                .setTriggerProcedure(() => service.importDawproject().then(EmptyExec, EmptyExec))
                        )),
                    MenuItem.default({label: "Export", selectable: service.hasProfile})
                        .setRuntimeChildrenProcedure(parent => parent.addMenuItem(
                            MenuItem.default({label: "Mixdown...", selectable: service.hasProfile})
                                .setTriggerProcedure(() => service.exportMixdown()),
                            MenuItem.default({label: "Stems...", selectable: service.hasProfile})
                                .setTriggerProcedure(() => service.exportStems()),
                            MenuItem.default({label: "Project Bundle...", selectable: service.hasProfile})
                                .setTriggerProcedure(() => service.exportBundle()),
                            MenuItem.default({label: "DAWproject...", selectable: service.hasProfile})
                                .setTriggerProcedure(async () => service.exportDawproject()),
                            MenuItem.default({
                                label: "JSON...",
                                selectable: service.hasProfile,
                                hidden: !Browser.isLocalHost()
                            }).setTriggerProcedure(async () => {
                                const arrayBuffer = new TextEncoder().encode(JSON.stringify(
                                    service.project.boxGraph.toJSON(), null, 2)).buffer
                                await Files.save(arrayBuffer, {
                                    types: [FilePickerAcceptTypes.JsonFileType],
                                    suggestedName: "project.json"
                                })
                            }),
                            MenuItem.default({
                                label: "Video...",
                                selectable: service.hasProfile
                            }).setTriggerProcedure(async () => Promises.tryCatch(VideoRenderer.render(
                                service.project, service.profile.meta.name, service.project.engine.sampleRate)))
                        )),
                    MenuItem.default({
                        label: "Join Live Room...",
                        icon: IconSymbol.Connected,
                        separatorBefore: true
                    }).setTriggerProcedure(() => connectRoom(service)),
                    MenuItem.default({
                        label: "Show MIDI-Keyboard",
                        icon: IconSymbol.Piano,
                        separatorBefore: true,
                        shortcut: GlobalShortcuts["toggle-software-keyboard"].shortcut.format(),
                        checked: service.isSoftwareKeyboardVisible()
                    }).setTriggerProcedure(() => service.toggleSoftwareKeyboard()),
                    // TAKT-FORK: „Backup" (Dropbox, GoogleDrive) und „Nextcloud" sind entfernt.
                    //
                    // Alle drei fuehren ins Leere: Dropbox und Google Drive melden sich ueber
                    // fremde OAuth-Kennungen an, die dem Original gehoeren — die Netzsperre
                    // weist die Anmeldung ab, und selbst wenn nicht, laege das Projekt danach
                    // bei einem Dritten. Fuer Nextcloud gibt es keinen Server.
                    //
                    // ⚖️ Die Sicherung liegt hier ohnehin woanders: die Aufnahmen kommen aus
                    // Artist OS und liegen dort auf dem Server. Das Studio ist die Werkbank,
                    // nicht das Lager.
                    MenuItem.default({
                        label: "Script Editor",
                        separatorBefore: true,
                        icon: IconSymbol.Code
                    }).setTriggerProcedure(() => RouteLocation.get().navigateTo("/scripting")),
                    MenuItem.default({
                        label: "Preferences",
                        shortcut: GlobalShortcuts["show-preferences"].shortcut.format(),
                        separatorBefore: true,
                        icon: IconSymbol.System
                    }).setTriggerProcedure(() => RouteLocation.get().navigateTo("/preferences")),
                    // TAKT-FORK: „Statistics" ist entfernt. Die Seite zeigt Besucher-, Raum- und
                    // Nutzungszahlen der ORIGINAL-Seite (api.opendaw.studio/users/*.json,
                    // rooms/*.json) — hier haette sie nie etwas Richtiges angezeigt, und die
                    // Zaehler dahinter sind ohnehin ausgebaut.
                    createDebugMenu(service)
                )
            }
        )
}