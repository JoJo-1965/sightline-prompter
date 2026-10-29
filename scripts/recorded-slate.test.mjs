import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRecordedSlate, RECORDED_SLATE_SOURCE, slateWave } from "../src/recorded-slate.js";
import { recordedSlateRoute } from "../src/obs-slate-route.js";
import { createTakeLog } from "../src/client/take-log.js";
import { createObsLedger } from "../src/obs-ledger.js";
import { editPack } from "../src/client/edit-pack.js";

const wav = slateWave();
assert.equal( wav.readUInt32LE( 24 ), 48000 );
assert.equal( wav.readUInt32LE( 40 ) / 2 / 48000, 0.25 );
assert.equal( wav.readUInt16LE( 22 ), 1 );
for ( let i = 0; i < 96; i++ ) assert.equal( wav.readInt16LE( 44 + i * 2 ), wav.readInt16LE( 44 + ( i + 48 ) * 2 ), "1 kHz periodic waveform" );

const source = createRecordedSlate( { timeoutMs: 500 } );
let reader;
const abort = new AbortController();
try {
	assert.equal( source.state().ready, false );
	await assert.rejects( source.play(), /Prepare/ );
	const [ address, other ] = await Promise.all( [ source.open(), source.open() ] );
	assert.equal( address, other );
	const endpoint = name => address.replace( "/slate?", `/${ name }?` );
	const post = ( name, data, origin = undefined ) => fetch( endpoint( name ), { method: "POST", headers: { "Content-Type": "application/json", ...( origin ? { Origin: origin } : {} ) }, body: JSON.stringify( data ) } );
	assert.equal( ( await fetch( address.split( "?" )[0] ) ).status, 403 );
	assert.equal( ( await post( "ready", { audioState: "running" }, "https://example.com" ) ).status, 403 );
	const localPost = await post( "ready", { audioState: "suspended" }, "null" );
	assert.equal( localPost.headers.get( "Access-Control-Allow-Origin" ), "null" );
	const directory = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-recorded-page-" ) );
	const page = await source.preparePage( path.join( directory, "source.html" ) );
	const html = await fs.readFile( page.file, "utf8" );
	assert.match( html, /Content-Security-Policy/ );
	assert.match( html, /const key = "[a-f0-9]{64}"/ );
	assert.equal( html.includes( "new URLSearchParams" ), false );
	assert.match( html, /events.onerror.*events.close/ );
	assert.equal( ( await fetch( endpoint( "unrelated" ) ) ).status, 404 );
	assert.match( await ( await fetch( address ) ).text(), /Recorded sync reference/ );
	const response = await fetch( endpoint( "events" ), { signal: abort.signal } );
	reader = response.body.getReader();
	await reader.read();
	await post( "ready", { audioState: "suspended" } );
	assert.equal( source.state().ready, false );
	await post( "ready", { audioState: "running" } );
	assert.equal( source.state().ready, true );
	const pending = source.play( { section: 1, take: 2, title: "Test" } );
	const message = new TextDecoder().decode( ( await reader.read() ).value );
	const job = JSON.parse( message.trim().replace( /^data: /, "" ) );
	assert.equal( job.flashMs, 150 );
	await assert.rejects( source.play(), /previous/ );
	await post( "ack", { id: "wrong", audioState: "running", renderedAt: Date.now() } );
	assert.equal( source.state().busy, true );
	await post( "ack", { id: job.id, audioState: "running", renderedAt: Date.now() } );
	assert.equal( ( await pending ).status, "browser-acknowledged" );
	assert.equal( source.state().busy, false );
	await new Promise( r => setTimeout( r, 1001 ) );
	await assert.rejects( source.play(), /did not acknowledge/ );
} finally {
	abort.abort();
	await reader?.cancel().catch( () => {} );
	source.close();
}
assert.equal( source.state().ready, false );
const cancelled = createRecordedSlate();
const opening = cancelled.open();
cancelled.close();
await assert.rejects( opening, /cancelled/ );
assert.equal( cancelled.state().ready, false );

const calls = [];
let active = false, streaming = false, foreign = false, mute = false;
let settings = { sightlineRecordedSync: 1, url: "test", width: 3840, height: 2160, reroute_audio: true };
const item = { sourceName: RECORDED_SLATE_SOURCE, sceneItemId: 7, sceneItemEnabled: true, sceneItemIndex: 1 };
const transform = { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, alignment: 5, boundsType: "OBS_BOUNDS_NONE", cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 };
async function request( type, data ) {
	calls.push( type );
	const values = {
		GetStreamStatus: { outputActive: streaming }, GetRecordStatus: { outputActive: active, outputPaused: false },
		GetCurrentProgramScene: { currentProgramSceneName: "Camera" }, GetVideoSettings: { baseWidth: 3840, baseHeight: 2160 },
		GetInputList: { inputs: [ { inputName: RECORDED_SLATE_SOURCE, inputKind: foreign ? "image_source" : "browser_source" } ] },
		GetInputSettings: { inputSettings: settings }, GetSceneItemList: { sceneItems: [ { sourceName: "Camera" }, item ] },
		GetSceneItemTransform: { sceneItemTransform: transform }, GetInputMute: { inputMuted: mute },
		GetInputVolume: { inputVolumeMul: 1 }, GetInputAudioTracks: { inputAudioTracks: { 1: true } },
		GetInputAudioMonitorType: { monitorType: "OBS_MONITORING_TYPE_NONE" }
	};
	if ( type === "SetInputSettings" ) settings = data.inputSettings;
	return values[type] ?? {};
}
await recordedSlateRoute( request, "test", true );
assert.ok( calls.includes( "SetInputAudioMonitorType" ) );
assert.equal( calls.includes( "SetCurrentProgramScene" ), false );
active = true;
calls.length = 0;
await assert.rejects( recordedSlateRoute( request, "test", true ), /Stop recording/ );
assert.equal( calls.some( c => c.startsWith( "Set" ) || c.startsWith( "Create" ) ), false );
await recordedSlateRoute( request, "test" );
streaming = true;
await assert.rejects( recordedSlateRoute( request, "test" ), /streaming/ );
streaming = false;
mute = true;
await assert.rejects( recordedSlateRoute( request, "test" ), /unmuted/ );
mute = false;
item.sceneItemEnabled = false;
await assert.rejects( recordedSlateRoute( request, "test" ), /visible/ );
item.sceneItemEnabled = true;
transform.cropTop = 10;
await assert.rejects( recordedSlateRoute( request, "test" ), /cropped/ );
transform.cropTop = 0;
await assert.rejects( recordedSlateRoute( request, "different" ), /Prepare/ );
foreign = true;
await assert.rejects( recordedSlateRoute( request, "test" ), /different OBS source/ );

const time = Date.parse( "2026-10-29T12:00:00Z" );
const log = createTakeLog( { clock: () => time } );
log.slate( 0 );
log.recordedSync( { id: "sync-test", recordingId: "record-test", renderedAt: new Date( time + 100 ).toISOString(), status: "browser-acknowledged" } );
const restored = createTakeLog();
restored.load( log.data() );
assert.equal( restored.data().recordedSync[0].t, 0.1 );
const ledger = createObsLedger();
ledger.observe( { recordingId: "record-test", recording: "stopped", outputPath: "test.mov" } );
const pack = editPack( ledger.attach( restored.data() ) );
assert.equal( JSON.parse( pack["recorded-sync.json"] )[0].outputPath, "test.mov" );
assert.equal( JSON.parse( pack["take-log.json"] ).recordedSync.length, 1 );
console.log( "recorded slate waveform, loopback permissions, acknowledgements, source routing and additive exports pass" );
