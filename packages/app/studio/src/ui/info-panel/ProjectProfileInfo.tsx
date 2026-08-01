import css from "./ProjectInfo.sass?inline"
// TAKT-FORK: Mit dem Publish-Bereich sind auch dessen Imports entfallen
// (DefaultObservableValue, isDefined, isUndefined, RuntimeNotifier, Inject, Button, Colors,
// PublishMusic, Promises). Sie stehenzulassen waere toter Ballast, den der naechste Leser
// fuer eine Absicht haelt.
import {Lifecycle, MutableObservableOption} from "@opendaw/lib-std"
import {createElement} from "@opendaw/lib-jsx"
import {StudioService} from "@/service/StudioService.ts"
import {Cover} from "./Cover"
import {Events, Html} from "@opendaw/lib-dom"
import {installScrollbars} from "@/ui/components/Scrollbars"

const className = Html.adoptStyleSheet(css, "ProjectInfo")

type Construct = {
    lifecycle: Lifecycle
    service: StudioService
}

export const ProjectProfileInfo = ({lifecycle, service}: Construct) => {
    if (!service.hasProfile) {return "No project profile."}
    const {profile} = service
    const {meta, cover} = profile
    const inputName: HTMLInputElement = (
        <input type="text" className="default"
               placeholder="Type in your's project name"
               value={meta.name}/>
    )
    const inputArtist: HTMLInputElement = (
        <input type="text" className="default"
               placeholder="Type in your artist name"
               value={meta.artist}/>
    )
    const inputTags: HTMLInputElement = (
        <input type="text" className="default"
               placeholder="Type in your's project tags"
               value={meta.tags.join(", ")}/>
    )
    const inputDescription: HTMLTextAreaElement = (
        <textarea className="default"
                  placeholder="Type in your's project description"
                  value={meta.description}/>
    )
    const coverModel = new MutableObservableOption<ArrayBuffer>(cover.unwrapOrUndefined())
    // TAKT-FORK: `buttonPublishText` und `unpublishButton` sind mit dem Publish-Bereich unten
    // entfallen. `meta.radioToken` bleibt im Datenmodell — ein Projekt aus dem Original koennte
    // ihn tragen, und ihn hier zu loeschen waere ein Eingriff in fremde Daten.
    const form: HTMLElement = (
        <div className="form">
            <div className="label">Name</div>
            <label info="Maximum 128 characters">{inputName}</label>
            <div className="label">Artist</div>
            <label info="Maximum 128 characters">{inputArtist}</label>
            <div className="label">Tags</div>
            <label info="Separate tags with commas">{inputTags}</label>
            <div className="label">Description</div>
            <label info="Maximum 512 characters">{inputDescription}</label>
            <div className="label">Cover</div>
            <Cover lifecycle={lifecycle} model={coverModel}/>
            {/* TAKT-FORK: Der Bereich „Publish your music to our music page" ist entfernt.
                Er lud das FERTIGE PROJEKT samt aller Samples auf music.opendaw.studio hoch —
                also die Aufnahmen des Nutzers auf einen fremden Server, unter CC BY-NC-SA 4.0.
                Das ist mit dem Versprechen von Artist OS nicht vereinbar, und die Netzsperre
                haette den Knopf ohnehin ins Leere laufen lassen. Ein Knopf, der nichts tut,
                ist schlechter als keiner. */}
        </div>
    )
    lifecycle.ownAll(
        Events.subscribe(form, "keydown", (event: KeyboardEvent) => {
            if (event.code === "Enter" && event.target instanceof HTMLInputElement) {event.target.blur()}
        }),
        Events.subscribe(inputName, "blur",
            () => profile.updateMetaData("name", inputName.value)),
        Events.subscribe(inputArtist, "blur",
            () => profile.updateMetaData("artist", inputArtist.value)),
        Events.subscribe(inputDescription, "blur",
            () => profile.updateMetaData("description", inputDescription.value)),
        Events.subscribe(inputTags, "blur",
            () => profile.updateMetaData("tags", inputTags.value.split(",").map(x => x.trim()))),
        Events.subscribe(inputName, "input", () => Html.limitChars(inputDescription, "value", 128)),
        Events.subscribe(inputDescription, "input", () => Html.limitChars(inputDescription, "value", 512)),
        coverModel.subscribe(owner => profile.updateCover(owner)),
        profile.subscribeCover(cover => coverModel.wrapOption(cover)),
        profile.subscribeMetaData(meta => {
            if (document.activeElement !== inputName) {inputName.value = meta.name}
            if (document.activeElement !== inputArtist) {inputArtist.value = meta.artist}
            if (document.activeElement !== inputDescription) {inputDescription.value = meta.description}
            if (document.activeElement !== inputTags) {inputTags.value = meta.tags.join(", ")}
        })
    )
    return (
        <div className={className} onConnect={host => lifecycle.own(installScrollbars(host))}>
            {form}
        </div>
    )
}