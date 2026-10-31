import assert from "node:assert/strict";
import path from "node:path";
import { normalisePadLayout, controlAction, controlView, CONTROL_ACTIONS, PAD_PRESETS } from "../src/client/control-actions.js";
import { startPhoneServer } from "../src/phone.js";

assert.deepEqual( normalisePadLayout( { columns: -1, buttons: [ "unknown", "toggle", "toggle", "slot-9", null ] } ), { columns: 4, buttons: [ "toggle", "slot-9" ] } );
assert.ok( normalisePadLayout( { buttons: [] } ).buttons.length );
assert.equal( normalisePadLayout( { columns: 6, buttons: CONTROL_ACTIONS.map( a => a.id ) } ).buttons.length, 36 );
assert.equal( controlAction( "slot-10" ), null );
assert.deepEqual( controlAction( "slot-3" ), { slot: 3 } );
assert.equal( controlView( "obs-record", {} ).hidden, true );
assert.equal( controlView( "obs-record", { obs: { enabled: true, controls: true, connection: "disconnected" } } ).disabled, true );
assert.equal( controlView( "obs-finish", { obs: { enabled: true, controls: true, connection: "connected", recording: "recording" }, editing: true } ).disabled, false );
assert.equal( controlView( "mirror-v", { mirrored: "both" } ).active, true );
assert.equal( controlView( "toggle", { scrolling: true } ).label, "Pause" );
for ( const preset of Object.values( PAD_PRESETS ) ) assert.deepEqual( normalisePadLayout( preset ), preset );

let current = { padLayout: PAD_PRESETS.studio, obs: { enabled: false } };
const calls = [];
const server = startPhoneServer( { port: 0, key: "isolated-test", pagePath: path.resolve( "src/client/phone.html" ), getStatus: () => current, onCommand: id => calls.push( id ) } );
await new Promise( r => server.listening ? r() : server.once( "listening", r ) );
const url = `http://127.0.0.1:${ server.address().port }`;
const headers = { "X-Sightline-Key": "isolated-test" };
try {
	assert.equal( ( await fetch( url + "/status" ) ).status, 401 );
	assert.equal( ( await fetch( url + "/command?action=toggle", { method: "POST" } ) ).status, 401 );
	assert.equal( ( await fetch( url + "/assets/control-actions.js" ) ).status, 200 );
	assert.equal( ( await fetch( url + "/assets/main.js", { headers } ) ).status, 404 );
	assert.deepEqual( ( await fetch( url + "/status", { headers } ).then( r => r.json() ) ).padLayout, PAD_PRESETS.studio );
	assert.equal( ( await fetch( url + "/command?action=obs-record", { method: "POST", headers } ) ).status, 409 );
	assert.equal( ( await fetch( url + "/command?action=slot-9", { method: "POST", headers } ) ).status, 409 );
	current = { ...current, editing: true };
	assert.equal( ( await fetch( url + "/command?action=marker", { method: "POST", headers } ) ).status, 409 );
	current = { ...current, editing: false };
	assert.equal( ( await fetch( url + "/command?action=marker", { method: "POST", headers } ) ).status, 200 );
	assert.deepEqual( calls, [ "marker" ] );
} finally {
	server.closeAllConnections();
	await new Promise( r => server.close( r ) );
}
console.log( "Pad layouts, shared button states, phone authentication and action permissions passed." );
