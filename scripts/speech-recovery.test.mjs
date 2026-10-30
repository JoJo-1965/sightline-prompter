import assert from "node:assert/strict";
import { createSpeechRecovery } from "../src/client/speech-recovery.js";
let time = 10000;
let health = { audioAt: time, engineAt: time, trackLive: true, contextState: "running" };
let count = 0;
let wanted = true;
const events = [];
const recovery = createSpeechRecovery( { now: () => time, probe: () => health, wanted: () => wanted, notify: e => events.push( e ), restart: async () => {
	count++;
	health = { ...health, audioAt: time, engineAt: time, trackLive: true, contextState: "running" };
} } );
// Many minutes without transcripts must not cause a restart when audio flows.
for ( let i = 0; i < 120; i++ ) {
	time += 5000;
	health.audioAt = health.engineAt = time;
	await recovery.tick();
}
assert.equal( count, 0 );
time += 8000;
health.audioAt = time;
await recovery.tick();
assert.equal( count, 1 );
assert.match( events.find( e => e.type === "recovering" ).reason, /acknowledging/ );
for ( let i = 0; i < 3; i++ ) {
	time += 8000;
	health.audioAt = time;
	await recovery.tick();
}
assert.equal( count, 3 );
assert.equal( events.at( -1 ).type, "failed" );
wanted = false;
await recovery.retry();
assert.equal( count, 3, "Off/muted listening cannot be revived by recovery" );
wanted = true;
await recovery.retry();
assert.equal( count, 4, "A deliberate manual retry resets the bounded retry limit" );
recovery.stop();
time += 100000;
await recovery.tick();
assert.equal( count, 4 );
let finish;
const concurrent = createSpeechRecovery( { now: () => time, probe: () => ( { audioAt: 0, engineAt: 0 } ), notify: e => events.push( e ), restart: () => {
	count++;
	return new Promise( ( r ) => {
		finish = r;
	} );
} } );
const attempt = concurrent.tick();
await concurrent.tick();
assert.equal( count, 5, "Only one restart can be in flight" );
concurrent.stop();
finish();
await attempt;
assert.notEqual( events.at( -1 ).type, "recovered", "Cancelled restarts cannot claim to have restored listening" );
console.log( "Speech recovery: silence, stalled acknowledgements, retry limits, manual retry, off/mute and cancellation passed." );
