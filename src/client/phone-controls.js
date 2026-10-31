import { createControlSurface } from "./control-surface.js";
const key = new URLSearchParams( location.search ).get( "k" ) ?? "";
const headers = { "X-Sightline-Key": key };
const state = document.getElementById( "state" );
let last = {};
let busy = false;
const setText = ( element, text ) => {
	if ( element.textContent !== text ) element.textContent = text;
};
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
	} catch ( error ) {
		error.noReply = true;
		throw error;
	} finally {
		clearTimeout( timeout );
	}
}
async function post( url ) {
	const response = await request( url, { method: "POST", headers } );
	const result = await response.json();
	if ( !response.ok ) throw new Error( result.error || "This control is unavailable" );
	return result;
}
const render = createControlSurface( document.getElementById( "phone-buttons" ), {
	command: async ( id, value ) => {
		navigator.vibrate?.( 15 );
		await post( `/command?action=${ encodeURIComponent( id ) }${ value === undefined ? "" : `&value=${ encodeURIComponent( JSON.stringify( value ) ) }` }` );
		await poll();
	},
	hold: { begin: () => post( "/hold?phase=begin" ), cancel: token => post( `/hold?phase=cancel&token=${ encodeURIComponent( token ) }` ) },
	feedback: showFeedback
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
