// Real Electron / packaged app and HTTP bridge, isolated from Joanne's settings,
// camera, microphone, Stream Deck and OBS. No production recording operations.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire( import.meta.url ), root = process.cwd(), port = 9377;
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-controller-" ) );
const script = path.join( profile, "Controller test.md" );
const fakeAudio = path.join( profile, "synthetic-input.wav" ), pcm = Buffer.alloc( 44 + 16000 * 12 * 2 );
pcm.write( "RIFF" ); pcm.writeUInt32LE( pcm.length - 8, 4 ); pcm.write( "WAVEfmt ", 8 ); pcm.writeUInt32LE( 16, 16 ); pcm.writeUInt16LE( 1, 20 ); pcm.writeUInt16LE( 1, 22 ); pcm.writeUInt32LE( 16000, 24 ); pcm.writeUInt32LE( 32000, 28 ); pcm.writeUInt16LE( 2, 32 ); pcm.writeUInt16LE( 16, 34 ); pcm.write( "data", 36 ); pcm.writeUInt32LE( pcm.length - 44, 40 );
for ( let i = 0; i < 16000 * 12; i++ ) pcm.writeInt16LE( Math.round( Math.sin( i * 440 / 16000 * 2 * Math.PI ) * ( i < 16000 ? 20 : 5000 ) ), 44 + i * 2 );
await fs.writeFile( fakeAudio, pcm );
await fs.writeFile( script, "# Controller test\n\n## First\n\nRead this opening naturally.\n\n## Second\n\nRead the next section naturally.\n" );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1240, height: 820, opacity: 1, fontSize: 2, recentFiles: [ script ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: true, showPad: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", pointsMode: false, scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: true, remotePort: 47728, streamDeck: true, hideFromCapture: false, padLayout: { columns: 4, buttons: [ "restart", "toggle", "next-section", "prepare-recording", "guide-lock-current", "test-recording-start" ] } } } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${ fakeAudio }` ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = ""; child.stderr.on( "data", data => stderr += data ); child.stdout.resume();
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
async function until( check, label ) { for ( let n = 0; n < 120; n++ ) { const value = await check(); if ( value ) return value; await pause( 100 ); } throw Error( `Timed out ${ label }: ${ stderr.slice( -1200 ) }` ); }
const sockets = [], errors = [];
async function connect( fragment ) {
	const target = await until( async () => ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( item => item.url.includes( fragment ) ), fragment );
	const socket = new WebSocket( target.webSocketDebuggerUrl ); sockets.push( socket ); await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let id = 0; const pending = new Map();
	socket.addEventListener( "message", event => { const data = JSON.parse( event.data ); if ( data.id ) { pending.get( data.id )?.( data.result ); pending.delete( data.id ); } if ( data.method === "Runtime.exceptionThrown" ) errors.push( data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text ); } );
	const call = ( method, params = {} ) => new Promise( resolve => { const next = ++id; pending.set( next, resolve ); socket.send( JSON.stringify( { id: next, method, params } ) ); } );
	await call( "Runtime.enable" );
	return { call, evaluate: async expression => { const result = await call( "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true } ); if ( result.exceptionDetails ) throw Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ); return result.result.value; } };
}
try {
	const main = await connect( "teleprompter.html" );
	const config = await until( () => fs.readFile( path.join( profile, "remote-control.json" ), "utf8" ).then( JSON.parse ).catch( () => null ), "API" );
	const request = async ( route, body ) => { const response = await fetch( config.url + route, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${ config.token }`, "Content-Type": "application/json" }, ...( body ? { body: JSON.stringify( body ) } : {} ) } ); return { status: response.status, body: await response.json() }; };
	const command = action => request( "/command", { action } );
	await until( async () => ( await request( "/status" ) ).body.readingMode, "renderer ready" );
	for ( const [ action, mode ] of [ [ "mode-notes", "notes" ], [ "mode-scroll", "scroll" ] ] ) {
		assert.equal( ( await command( action ) ).status, 200 );
		await until( async () => ( await request( "/status" ) ).body.readingMode === mode, action );
	}
	assert.equal( ( await command( "again" ) ).status, 200 );
	assert.equal( ( await command( "prepare-recording" ) ).status, 200 );
	const prep = await connect( "pre-record.html" );
	await until( () => prep.evaluate( "!!document.querySelector('#connect-camera')" ), "preparation DOM" );
	await until( async () => ( await request( "/status" ) ).body.preparation?.open, "preparation status" );
	assert.match( await prep.evaluate( "document.body.innerText" ), /Align your head/ );
	assert.equal( await prep.evaluate( "document.querySelector('#connect-camera').textContent" ), "Enable camera" );
	for ( const action of [ "guide-lock-current", "test-recording-start", "recording-reference-save", "recording-reference-restore", "test-recording-stop", "export-reviewed-pack" ] ) assert.ok( ( await command( action ) ).status >= 400, action );
	const status = ( await request( "/status" ) ).body;
	assert.equal( status.preparation.canLock, false ); assert.equal( status.preparation.canSave, false ); assert.equal( status.preparation.testRecording, false );
	// Only Chromium's synthetic camera/tone exist in this disposable process.
	await prep.evaluate( "document.querySelector('#connect-camera').click()" );
	await until( () => prep.evaluate( "document.querySelector('#camera-video').readyState >= 2 && document.querySelector('#connect-camera').textContent === 'Turn picture off'" ), "synthetic camera" );
	await prep.evaluate( "document.querySelector('#manual-confirm').click(); document.querySelector('#accept-frame').click()" );
	assert.equal( ( await command( "check-room-voice" ) ).status, 200 );
	await until( async () => ( await request( "/status" ) ).body.preparation.measuring, "audio measuring" );
	await until( async () => !( await request( "/status" ) ).body.preparation.measuring, "audio complete" );
	await prep.evaluate( "document.querySelector('#accept-audio-warning')?.click(); document.querySelector('#accept-audio').click()" );
	if ( !( await request( "/status" ) ).body.preparation.canTest ) console.log( "Test-stage diagnostics:", await prep.evaluate( "document.querySelector('#step-panel').innerText" ), ( await request( "/status" ) ).body.preparation );
	await until( async () => ( await request( "/status" ) ).body.preparation.canTest, "test readiness" );
	assert.equal( ( await command( "test-recording-start" ) ).status, 200 );
	await pause( 1250 );
	assert.equal( ( await command( "test-recording-stop" ) ).status, 200 );
	await until( async () => ( await request( "/status" ) ).body.preparation.test === "review", "saved WebM" );
	assert.equal( ( await command( "test-recording-play" ) ).status, 200 );
	assert.ok( ( await command( "recording-reference-save" ) ).status >= 400, "Playback alone cannot approve a test" );
	await until( () => prep.evaluate( "!!document.querySelector('#test-picture')" ), "test playback review controls" );
	await prep.evaluate( "document.querySelector('#test-picture').click(); document.querySelector('#test-sound').click(); document.querySelector('#accept-test').click()" );
	await until( async () => ( await request( "/status" ) ).body.preparation.canSave, "manual acceptance" );
	assert.equal( ( await command( "recording-reference-save" ) ).status, 200 );
	const savedState = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( ( await command( "back-after-break" ) ).status, 200 );
	assert.deepEqual( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.headGuideReference, savedState.settings.headGuideReference, "Return does not replace the reference" );
	assert.equal( errors.length, 0, errors.join( "\n" ) );
	const artifacts = process.env.SIGHTLINE_TEST_ARTIFACTS;
	if ( artifacts ) { await fs.mkdir( artifacts, { recursive: true } ); const image = await prep.call( "Page.captureScreenshot", { format: "png" } ); await fs.writeFile( path.join( artifacts, "controller-preparation.png" ), Buffer.from( image.data, "base64" ) ); }
	console.log( "Native controller candidate: modes/Again, real workflow HTTP acknowledgements, guarded synthetic audio/video test save/play, manual acceptance, reference save/return and clean renderer pass; no physical devices used" );
} finally {
	for ( const socket of sockets ) socket.close();
	child.kill();
}
