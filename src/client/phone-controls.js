import { createControlButtons } from "./control-buttons.js";
const key = new URLSearchParams( location.search ).get( "k" ) ?? "";
const headers = { "X-Sightline-Key": key };
const state = document.getElementById( "state" );
let last = {};
let busy = false;
const render = createControlButtons( document.getElementById( "phone-buttons" ), async ( id ) => {
	navigator.vibrate?.( 15 );
	try {
		const response = await fetch( `/command?action=${ encodeURIComponent( id ) }`, { method: "POST", headers } );
		if ( !response.ok ) throw new Error( "Command refused" );
		await poll();
	} catch {
		offline();
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
		const response = await fetch( "/status", { headers, cache: "no-store" } );
		if ( !response.ok ) throw new Error( "Status unavailable" );
		last = await response.json();
		state.classList.remove( "offline" );
		state.textContent = last.editing ? "Editing the script" : last.scrolling ? "Running" : "Paused";
		document.getElementById( "section" ).textContent = [ last.sectionTitle, last.progress ].filter( Boolean ).join( " · " );
		document.getElementById( "obs-status" ).textContent = !last.obs?.enabled ? "" : last.obs.connection === "connected" ? `OBS ${ last.obs.recording ?? "status unknown" }` : "OBS disconnected · recording status unknown";
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
