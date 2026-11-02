import { appearanceFromSettings, READING_PALETTES } from "./reading-appearance.js";

// The approved preview is a separate column. Its Paused/Reading controls only
// change the example; they never start prompting, a microphone or a recorder.
export function createSettingsPreview( root, getState ) {
	const doc = root.ownerDocument;
	let reading = false;
	const views = [];
	const pane = () => {
		const host = doc.createElement( "aside" );
		host.className = "settings-preview-pane";
		host.setAttribute( "aria-label", "Script view preview" );
		host.innerHTML = `<h3>Script view preview</h3>
			<div class="settings-preview-mode" role="group" aria-label="Preview state">
				<button type="button" data-preview-reading="false">Paused</button>
				<button type="button" data-preview-reading="true">Reading</button>
			</div>
			<div class="settings-script-preview">
				<h4 data-sample="headings">Ready to record</h4>
				<div data-sample="production">Check the framing, camera and microphone before you record.</div>
				<p data-sample="script">Look towards the lens. Speak at your own pace.</p>
				<span data-sample="inline">[smile]</span>
				<p data-sample="script">Keep your place.</p>
			</div>
			<p class="settings-preview-explainer" role="status"></p>
			<div class="settings-preview-footer">Example only · no live camera or audio.</div>`;
		for ( const button of host.querySelectorAll( "[data-preview-reading]" ) ) button.addEventListener( "click", () => {
			reading = button.dataset.previewReading === "true";
			sync();
		} );
		views.push( host );
		return host;
	};
	const sidebar = pane();
	root.querySelector( ".settings-content" ).append( sidebar );
	const dialog = doc.createElement( "dialog" );
	dialog.className = "settings-preview-dialog";
	dialog.setAttribute( "aria-label", "Script view preview" );
	dialog.append( pane() );
	const close = doc.createElement( "button" );
	close.type = "button";
	close.textContent = "Close preview";
	dialog.append( close );
	root.append( dialog );
	const open = doc.createElement( "button" );
	open.type = "button";
	open.className = "settings-open-preview";
	open.textContent = "Preview";
	root.querySelector( "#settings-cancel" ).before( open );
	open.addEventListener( "click", () => {
		sync();
		dialog.showModal();
	} );
	close.addEventListener( "click", () => dialog.close() );
	dialog.addEventListener( "keydown", ( event ) => {
		if ( event.key !== "Escape" ) return;
		event.preventDefault();
		event.stopPropagation();
		dialog.close();
		open.focus();
	} );
	new MutationObserver( () => {
		if ( root.classList.contains( "hidden" ) && dialog.open ) dialog.close();
	} ).observe( root, { attributes: true, attributeFilter: [ "class" ] } );
	function sync( state = getState() ) {
		const appearance = appearanceFromSettings( state, state );
		const palette = READING_PALETTES[state.theme] ?? READING_PALETTES.default;
		const colour = state.backgroundColour || palette.background;
		const rgb = [ 1, 3, 5 ].map( offset => parseInt( colour.slice( offset, offset + 2 ), 16 ) );
		const backing = reading ? state.backingOnAir ?? 0.07 : state.opacity ?? 1;
		const scriptSize = 19 * ( state.fontSize ?? 3 ) / 3;
		for ( const host of views ) {
			for ( const button of host.querySelectorAll( "[data-preview-reading]" ) ) button.setAttribute( "aria-pressed", String( ( button.dataset.previewReading === "true" ) === reading ) );
			host.querySelector( ".settings-script-preview" ).style.backgroundColor = `rgba(${ rgb.join( "," ) },${ backing })`;
			host.querySelector( ".settings-preview-explainer" ).textContent = reading ? "Reading: notes hidden." : "Paused: notes shown.";
			for ( const node of host.querySelectorAll( "[data-sample]" ) ) {
				const target = node.dataset.sample;
				const style = appearance.text[target];
				Object.assign( node.style, {
					color: style.color || palette[target],
					fontFamily: style.font === "Follow script" ? appearance.text.script.font : style.font,
					fontWeight: style.bold ? "700" : "400",
					fontStyle: style.italic ? "italic" : "normal",
					lineHeight: String( style.spacing / 100 ),
					fontSize: `${ target === "script" ? scriptSize : scriptSize * style.size / 100 }px`,
					opacity: String( ( state.textOpacity ?? 1 ) * ( target === "inline" && state.directions === "dim" && state.theme !== "contrast" ? 0.65 : 1 ) ),
					filter: `brightness(${ state.textBrightness ?? 1 })`
				} );
				node.hidden = target === "production" ? reading : target === "inline" && state.directions === "hide";
			}
		}
	}
	return { sidebar, sync };
}
