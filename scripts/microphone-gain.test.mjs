// Exercise the real capture opener with fake devices; never acquire hardware.
import assert from "node:assert/strict";

globalThis.window = { electron: {} };
const requests = [];
const stream = { getTracks: () => [] };
let failure = null;
Object.defineProperty( globalThis, "navigator", { configurable: true, value: {
	mediaDevices: { getUserMedia: async constraints => {
		requests.push( constraints );
		if ( failure ) { const error = failure; failure = null; throw error; }
		return stream;
	} }
} } );
const { openMic } = await import( "../src/client/auto-scroll.js" );

assert.equal( await openMic( null ), stream );
assert.deepEqual( requests.pop().audio, { echoCancellation: true, noiseSuppression: true, autoGainControl: false } );
await openMic( "selected-device" );
assert.deepEqual( requests.pop().audio.deviceId, { exact: "selected-device" } );
for ( const name of [ "NotFoundError", "OverconstrainedError" ] ) {
	failure = Object.assign( new Error( "Unavailable device" ), { name } );
	const statuses = [];
	await openMic( "missing-device", status => statuses.push( status ) );
	const attempts = requests.splice( 0 );
	assert.equal( attempts.length, 2 );
	assert.ok( attempts.every( request => request.audio.autoGainControl === false ) );
	assert.equal( attempts[1].audio.deviceId, undefined );
	assert.equal( statuses[0].type, "device-fallback" );
}
await openMic( "meter-device", undefined, { processed: false } );
assert.deepEqual( requests.pop().audio, { echoCancellation: false, noiseSuppression: false, autoGainControl: false, deviceId: { exact: "meter-device" } } );
failure = Object.assign( new Error( "Permission denied" ), { name: "NotAllowedError" } );
await assert.rejects( openMic( "denied-device" ), { name: "NotAllowedError" } );
assert.equal( requests.length, 1, "Permission denial must not open another device" );
console.log( "Microphone capture: AGC off for speech, meters and device fallback; permission denial is retained. No hardware used." );
