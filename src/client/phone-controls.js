import { createControlButtons } from "./control-buttons.js";
import { controlView } from "./control-actions.js";
const key = new URLSearchParams( location.search ).get( "k" ) ?? "";
const headers = { "X-Sightline-Key": key };
const state = document.getElementById( "state" );
let last = {};
let busy = false;
const setText = ( element, text ) => {
	if ( element.textContent !== text ) element.textContent = text;
};
const pending = new Set();
const feedback = document.getElementById( "command-feedback" );
let feedbackTimer;
function showFeedback( text, error = false ) {
	clearTimeout( feedbackTimer );
	feedback.textContent = text;
	feedback.classList.toggle( "error", error );
	feedback.hidden = false;
	feedbackTimer = setTimeout( () => {
		feedback.hidden = true;
	}, 5000 );
}
async function request( url, options = {}, readJson = false ) {
	const controller = new AbortController();
	const timeout = setTimeout( () => controller.abort(), 5000 );
	try {
		const response = await fetch( url, { ...options, signal: controller.signal } );
		if ( !readJson ) return response;
		if ( !response.ok ) throw new Error( "Status unavailable" );
		return await response.json();
	} finally {
		clearTimeout( timeout );
	}
}
function markPending() {
	for ( const button of document.querySelectorAll( "#phone-buttons button" ) ) {
		const active = pending.has( button.dataset.action );
		button.setAttribute( "aria-busy", String( active ) );
		if ( active ) button.disabled = true;
	}
}
const render = createControlButtons( document.getElementById( "phone-buttons" ), async ( id ) => {
	if ( pending.has( id ) ) return;
	const label = controlView( id, last )?.label ?? "Command";
	pending.add( id );
	markPending();
	showFeedback( `Sending ${ label }…` );
	navigator.vibrate?.( 15 );
	try {
		const response = await request( `/command?action=${ encodeURIComponent( id ) }`, { method: "POST", headers } );
		if ( !response.ok ) {
			showFeedback( `${ label } unavailable`, true );
			return;
		}
		showFeedback( `${ label } sent` );
	} catch {
		offline();
		showFeedback( `${ label }: no reply`, true );
	} finally {
		pending.delete( id );
		await poll();
	}
} );
function offline() {
	state.textContent = "Can't reach the prompter";
	state.classList.add( "offline" );
	document.getElementById( "section" ).textContent = "Check the phone remote is on and you're on the same Wi-Fi";
	render( last.padLayout, last, true );
}
async function poll() {
	if ( busy ) return;
	busy = true;
	try {
		last = await request( "/status", { headers, cache: "no-store" }, true );
		state.classList.remove( "offline" );
		setText( state, last.editing ? "Editing the script" : last.scrolling ? "Running" : "Paused" );
		setText( document.getElementById( "section" ), [ last.sectionTitle, last.progress ].filter( Boolean ).join( " · " ) );
		setText( document.getElementById( "obs-status" ), !last.obs?.enabled ? "" : last.obs.connection === "connected" ? `OBS ${ last.obs.recording ?? "status unknown" }` : "OBS disconnected · recording status unknown" );
		document.getElementById( "capture-note" ).hidden = !last.captureOverride;
		render( last.padLayout, last );
		markPending();
	} catch {
		offline();
	} finally {
		busy = false;
	}
}
poll();
setInterval( poll, 1000 );
document.addEventListener( "visibilitychange", () => {
	if ( !document.hidden ) poll();
} );
