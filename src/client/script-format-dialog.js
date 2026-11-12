import { autoFormatScript } from "./script-autoformat.js";

export function createScriptFormatDialog( { button, snapshot, apply, focusEditor, canEdit } ) {
	const doc = document;
	const dialog = Object.assign( doc.createElement( "dialog" ), { id: "script-format-dialog", className: "script-format-dialog" } );
	dialog.setAttribute( "aria-labelledby", "script-format-title" );
	dialog.innerHTML = "<form method=\"dialog\"><h3 id=\"script-format-title\">Auto format pasted text</h3><p id=\"script-format-scope\"></p><p>Keep your words, add a starter structure. Review the preview before applying; use Save afterwards.</p><div class=\"script-format-options\"><label>Opening heading <input name=\"title\" value=\"Opening\" maxlength=\"100\"></label><label><input name=\"paragraphs\" type=\"checkbox\" checked> Break long passages into short paragraphs</label><label><input name=\"sections\" type=\"checkbox\"> Use each paragraph as a section / page</label><label><input name=\"cue\" type=\"checkbox\"> Add an opening [breathe] cue</label><label><input name=\"audio\" type=\"checkbox\"> Add room and voice checks (Voice / Scroll)</label><label><input name=\"pacing\" type=\"checkbox\"> Add a pace target <input name=\"wpm\" aria-label=\"Pace target in words per minute\" type=\"number\" value=\"140\" min=\"80\" max=\"220\" step=\"5\"> wpm</label></div><p>Speaker cues use [brackets]; app codes use {braces}. No recorder commands or forced pauses are added.</p><div class=\"script-format-previews\"><label>Original<textarea id=\"script-format-original\" readonly></textarea></label><label>Formatted preview<textarea id=\"script-format-preview\" readonly></textarea></label></div><p id=\"script-format-message\" role=\"status\"></p><div class=\"script-format-actions\"><button type=\"button\" id=\"script-format-cancel\">Cancel</button><button type=\"button\" id=\"script-format-apply\" class=\"primary\">Apply formatting</button></div></form>";
	doc.body.appendChild( dialog );
	const form = dialog.querySelector( "form" ), field = name => form.elements.namedItem( name );
	let original = null, result = null;
	function preview() {
		try {
			result = autoFormatScript( original.selected, Object.fromEntries( [ "title", "paragraphs", "sections", "cue", "audio", "pacing", "wpm" ].map( name => [ name, field( name ).type === "checkbox" ? field( name ).checked : field( name ).value ] ) ) );
			dialog.querySelector( "#script-format-preview" ).value = result.text;
			dialog.querySelector( "#script-format-message" ).textContent = `${ result.words } words · ${ result.paragraphs } paragraphs · ${ result.sections } sections`;
			dialog.querySelector( "#script-format-apply" ).disabled = false;
		} catch ( error ) {
			result = null;
			dialog.querySelector( "#script-format-preview" ).value = "";
			dialog.querySelector( "#script-format-message" ).textContent = error.message;
			dialog.querySelector( "#script-format-apply" ).disabled = true;
		}
		field( "wpm" ).disabled = !field( "pacing" ).checked;
	}
	button.addEventListener( "click", () => {
		if ( !canEdit() ) return;
		original = snapshot();
		if ( !original ) return;
		original.selected = original.source.slice( original.from, original.to );
		dialog.querySelector( "#script-format-scope" ).textContent = original.whole ? "Formatting the whole script." : "Formatting selected text only; the rest stays as it is.";
		dialog.querySelector( "#script-format-original" ).value = original.selected;
		preview();
		dialog.showModal();
	} );
	form.addEventListener( "input", preview );
	dialog.querySelector( "#script-format-cancel" ).addEventListener( "click", () => dialog.close() );
	dialog.querySelector( "#script-format-apply" ).addEventListener( "click", () => {
		if ( !result || !canEdit() ) return;
		try {
			apply( original, result.text );
			dialog.close();
		} catch ( error ) {
			dialog.querySelector( "#script-format-message" ).textContent = error.message;
		}
	} );
	dialog.addEventListener( "close", () => {
		original = result = null;
		focusEditor();
	} );
	return { sync: () => {
		button.disabled = !canEdit();
	} };
}
