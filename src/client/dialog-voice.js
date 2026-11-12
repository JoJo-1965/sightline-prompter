import { visibleActions } from "./context-actions.js";

export function enableDialogVoice() {
	if ( !window.dialogVoice ) return;
	let serial = 0, timer;
	const identity = button => button.id || ( button.dataset.voiceAction ??= `dialog-action-${ ++serial }` );
	const root = () => document.querySelector( "dialog[open]" ) ?? document;
	const report = () => window.dialogVoice.report( visibleActions( root() ).map( button => ( { id: identity( button ), label: button.textContent.trim() } ) ) );
	window.dialogVoice.onAction( ( id ) => {
		if ( !document.hasFocus() ) return;
		const button = visibleActions( root() ).find( item => identity( item ) === id );
		if ( !button ) return;
		let feedback = document.getElementById( "dialog-voice-feedback" );
		if ( !feedback ) {
			feedback = document.createElement( "div" );
			feedback.id = "dialog-voice-feedback";
			feedback.setAttribute( "role", "status" );
			document.body.appendChild( feedback );
		}
		feedback.textContent = `Heard “${ button.textContent.trim() }”`;
		feedback.hidden = false;
		setTimeout( () => {
			feedback.hidden = true;
		}, 3000 );
		button.click();
	} );
	new MutationObserver( () => {
		clearTimeout( timer );
		timer = setTimeout( report, 80 );
	} ).observe( document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [ "disabled", "hidden", "class", "open" ] } );
	window.addEventListener( "focus", report );
	report();
}
