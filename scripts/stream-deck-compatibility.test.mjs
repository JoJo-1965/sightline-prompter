import assert from "node:assert/strict";
import { once } from "node:events";
import { createStreamDeckPeer, streamDeckContract, versionAtLeast } from "../src/stream-deck-compatibility.js";
import { startRemoteServer } from "../src/remote.js";

assert.equal( versionAtLeast( "0.1.9.0", "0.1.9" ), true );
assert.equal( versionAtLeast( "1.0.7-rc.3", "1.0.6" ), true );
assert.equal( versionAtLeast( "0.1.4", "0.1.5" ), false );
for ( const value of [ null, "", "unknown", "0.1", "<script>", "1".repeat( 80 ) ] ) assert.equal( versionAtLeast( value, "0.1.5" ), false );
let clock = 1000;
const peer = createStreamDeckPeer( { now: () => clock } );
assert.equal( peer.status().connected, false );
assert.equal( peer.hello( { pluginVersion: "0.1.9", protocolVersion: 1 } ).compatible, true );
assert.equal( peer.status().updateRecommended, false );
clock += 30000;
assert.equal( peer.status().connected, false );
assert.equal( peer.hello( { pluginVersion: "0.1.8", protocolVersion: 1 } ).updateRecommended, true );
assert.equal( peer.hello( { pluginVersion: "0.1.4", protocolVersion: 1 } ).compatible, false );
assert.match( peer.hello( { pluginVersion: "9.0.0", protocolVersion: 2 } ).message, /Update Sightline/ );
assert.throws( () => peer.hello( { pluginVersion: "garbage", protocolVersion: 1 } ), /valid/ );
assert.throws( () => peer.hello( { pluginVersion: "0.1.9", protocolVersion: 0 } ), /valid/ );
peer.clear();
assert.equal( peer.status().connected, false );

let settingsTouched = false;
const server = startRemoteServer( {
	port: 0, token: "full-test-key", buttonToken: "button-test-key",
	buttonRoutes: new Set( [ "GET /status", "POST /stream-deck/hello" ] ),
	routes: {
		"GET /status": () => ( { appVersion: "1.0.7-rc.3", streamDeckApi: streamDeckContract(), commands: [ "play" ] } ),
		"POST /stream-deck/hello": body => peer.hello( body ),
		"POST /settings": () => {
			settingsTouched = true;
		}
	}
} );
await once( server, "listening" );
const url = `http://127.0.0.1:${ server.address().port }`;
const hello = ( token, body ) => fetch( `${ url }/stream-deck/hello`, {
	method: "POST", headers: { Authorization: `Bearer ${ token }`, "Content-Type": "application/json" }, body: JSON.stringify( body )
} );
try {
	assert.equal( ( await hello( "wrong", { pluginVersion: "0.1.9", protocolVersion: 1 } ) ).status, 401 );
	const response = await hello( "button-test-key", { pluginVersion: "0.1.9", protocolVersion: 1 } );
	assert.equal( response.status, 200 );
	assert.equal( ( await response.json() ).compatible, true );
	assert.equal( ( await hello( "button-test-key", { pluginVersion: "bad", protocolVersion: 1 } ) ).status, 400 );
	const forbidden = await fetch( `${ url }/settings`, { method: "POST", headers: { Authorization: "Bearer button-test-key" } } );
	assert.equal( forbidden.status, 403 );
	assert.equal( settingsTouched, false );
} finally {
	peer.clear();
	server.closeAllConnections();
	await new Promise( resolve => server.close( resolve ) );
}
console.log( "Stream Deck compatibility, expiry and button-key permissions pass" );
