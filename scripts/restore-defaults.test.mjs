import assert from "node:assert/strict";
import { shippedState, resetBlocked, createDefaultsRestore } from "../src/restore-defaults.js";

const defaults = { fontSize: 3, slots: [], recentFiles: [], settings: { remoteControl: false, streamDeck: false, obsEnabled: false, phoneRemote: false, inputMappings: null, padLayout: null } };
const fresh = shippedState( defaults, "saved-service-key", { remoteToken: "new-pairing" } );
assert.equal( fresh.deepgramApiKey, "saved-service-key" );
assert.equal( fresh.showGettingStarted, true );
assert.equal( fresh.remoteToken, "new-pairing" );
assert.deepEqual( fresh.slots, [] );
fresh.settings.remoteControl = true;
assert.equal( defaults.settings.remoteControl, false, "Reset settings must not share mutable defaults" );
const idle = { renderer: {}, obs: {}, obsEnabled: false, dirty: false, maintaining: false };
assert.equal( resetBlocked( idle ), null );
for ( const change of [ { renderer: { scrolling: true } }, { renderer: { preparing: true } }, { renderer: { editing: true } }, { dirty: true }, { maintaining: true }, { obs: { setupBusy: true } }, { obs: { recordingBusy: true } }, { obsEnabled: true, obs: { connection: "disconnected" } }, { obsEnabled: true, obs: { connection: "connected", recording: "paused" } }, { obsEnabled: true, obs: { connection: "connected", recording: "recording" } } ] ) assert.ok( resetBlocked( { ...idle, ...change } ) );
assert.equal( resetBlocked( { ...idle, obsEnabled: true, obs: { connection: "connected", recording: "stopped" } } ), null );

function fixture( changes = {} ) {
	const events = [];
	const options = { blocked: () => null, confirm: async () => true, flush: async () => true, settle: async () => events.push( "settle" ), replace: async () => events.push( "replace" ), clearUi: async () => events.push( "clear-ui" ), restart: () => events.push( "restart" ), rollback: async () => events.push( "rollback" ), ...changes };
	return { events, restore: createDefaultsRestore( options ) };
}
const cancelled = fixture( { confirm: async () => false } );
assert.deepEqual( await cancelled.restore(), { ok: true, cancelled: true } );
assert.deepEqual( cancelled.events, [] );
const normal = fixture();
assert.equal( ( await normal.restore() ).restarting, true );
assert.deepEqual( normal.events, [ "settle", "replace", "clear-ui", "restart" ] );
const noFlush = fixture( { flush: async () => false } );
assert.equal( ( await noFlush.restore() ).ok, false );
assert.deepEqual( noFlush.events, [] );
let checks = 0;
const changedDuringPrompt = fixture( { blocked: () => ++checks === 1 ? null : "Recording started" } );
assert.equal( ( await changedDuringPrompt.restore() ).error, "Recording started" );
assert.deepEqual( changedDuringPrompt.events, [] );
let release;
const duplicate = fixture( { confirm: () => new Promise( ( resolve ) => {
	release = resolve;
} ) } );
const pending = duplicate.restore();
await new Promise( resolve => setTimeout( resolve, 0 ) );
assert.equal( ( await duplicate.restore() ).ok, false );
release( true );
await pending;
assert.equal( duplicate.events.filter( value => value === "restart" ).length, 1 );
const failed = fixture( { clearUi: async () => {
	throw new Error( "Storage refused" );
} } );
assert.match( ( await failed.restore() ).error, /Storage refused/ );
assert.deepEqual( failed.events, [ "settle", "replace", "rollback" ] );
console.log( "PASS: shipped-state reset, retained service key, disabled integrations, idle/maintenance guards, cancellation, duplicate suppression and rollback." );
