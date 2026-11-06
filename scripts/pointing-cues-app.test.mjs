// Actual renderer and saved take snapshot, with no media or external services.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire( import.meta.url );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-pointing-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-pointing-images-" ) );
const file = path.join( profile, "pointing.md" );
await fs.writeFile( file, `# Pointing cue check\n\n## Show the change {target: 0:30}\n\n[point left: "Growth chart"] Here is how the figures changed.\n\n${ "Leave space for the presenter to show the change clearly. ".repeat( 40 ) }\n\n[Say: "Look here"] Keep this spoken. [point up-right: results]\n\n## Next idea {target: 0:30}\n\n[point down: detail] Take a closer look.\n\n<!-- [point left: not exported] -->\n` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1200, height: 850, fontSize: 2, opacity: 1, recentFiles: [ file ], settings: { voiceCommands: "off", scrollMode: "steady", countdown: 0, slate: "off", scratchAudio: false, takeLoudness: "off", checkUpdates: false, streamDeck: false, remoteControl: false, hideFromCapture: false, obsEnabled: false } } ) );
const port = 9346;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true, () => false ), false, "Private test port must be free" );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", ( data ) => {
	stderr += data;
} );
const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let socket;
try {
	let target;
	for ( let i = 0; i < 100 && !target; i++ ) {
		target = await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).then( pages => pages.find( page => page.url.includes( "teleprompter.html" ) ) ).catch( () => null );
		if ( !target ) await wait( 100 );
	}
	assert.ok( target, stderr.slice( -1000 ) );
	socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0;
	const pending = new Map();
	const errors = [];
	socket.addEventListener( "message", ( event ) => {
		const message = JSON.parse( event.data );
		if ( message.id ) pending.get( message.id )?.( message );
		if ( message.method === "Runtime.exceptionThrown" ) errors.push( message.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++sequence;
		const timeout = setTimeout( () => {
			pending.delete( id );
			reject( new Error( `Timed out: ${ method }` ) );
		}, 10000 );
		pending.set( id, ( message ) => {
			clearTimeout( timeout );
			pending.delete( id );
			if ( message.error ) reject( new Error( message.error.message ) );
			else resolve( message.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const result = await call( "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true } );
		if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text );
		return result.result.value;
	};
	const until = async ( expression ) => {
		for ( let i = 0; i < 80; i++ ) {
			if ( await evaluate( expression ) ) return;
			await wait( 100 );
		}
		throw new Error( `Not ready: ${ expression }` );
	};
	await call( "Runtime.enable" );
	await until( "document.querySelectorAll('#md .pointing-cue').length===3 && !!window.EditorModule" );
	const state = await evaluate( "(async()=>{const root=document.getElementById('md');const {buildWordIndex}=await import('./word-index.js');const {collectPointingCues}=await import('./pointing-cues.js');const {words,ranges}=buildWordIndex(root);return {words,cues:collectPointingCues(root,ranges),spokenLabels:root.querySelectorAll('.pointing-cue .say').length,style:getComputedStyle(root.querySelector('.pointing-cue .dir-text')).fontStyle};})()" );
	assert.equal( state.spokenLabels, 0 );
	assert.ok( !state.words.includes( "growth" ) && !state.words.includes( "chart" ) );
	assert.ok( state.words.includes( "look" ) && state.words.includes( "here" ), "Existing quoted Say words remain spoken" );
	assert.deepEqual( state.cues.map( cue => [ cue.section, cue.direction, cue.directionBasis ] ), [ [ 1, "left", "presenter" ], [ 1, "up-right", "presenter" ], [ 2, "down", "presenter" ] ] );
	assert.equal( state.words[state.cues[0].anchor.beforeWordIndex], "here" );
	assert.equal( state.cues[0].anchor.afterWordIndex, null, "Heading words are not cue anchors" );
	assert.equal( state.cues[1].anchor.beforeWordIndex, null, "No spill into next section" );
	assert.equal( state.words[state.cues[1].anchor.afterWordIndex], "spoken" );
	assert.equal( state.words[state.cues[2].anchor.beforeWordIndex], "take" );
	assert.deepEqual( await evaluate( "(()=>{const body=document.body;const original=body.className;body.classList.remove('directions-dim','directions-normal');body.classList.add('directions-hide');const cueHidden=getComputedStyle(document.querySelector('#md .pointing-cue .dir-text')).display==='none';const sayVisible=getComputedStyle(document.querySelector('#md .direction .say')).display!=='none';body.classList.remove('directions-hide');body.classList.add('directions-normal');const cueVisible=getComputedStyle(document.querySelector('#md .pointing-cue .dir-text')).display!=='none';body.className=original;return {cueHidden,sayVisible,cueVisible};})()" ), { cueHidden: true, sayVisible: true, cueVisible: true }, "Existing visibility styles apply without hiding quoted Say speech" );
	await evaluate( "document.querySelector('#voice-offer button:last-child')?.click()" );
	const shot = await call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "pointing-cues.png" ), Buffer.from( shot.data, "base64" ) );
	await evaluate( "document.getElementById('cb-play').click()" );
	await until( "document.getElementById('cb-play').classList.contains('playing')" );
	await until( "document.querySelector('#hud-delivery-cue') && !document.querySelector('#hud-delivery-cue').hidden" );
	const hudCheck = await evaluate( "(()=>{const cue=document.querySelector('#hud-delivery-cue');const target=document.querySelector('.hud-point-target');const word=document.querySelector('#md .direction').parentElement;return {label:cue.textContent,visible:!cue.hidden,target:!target.hidden,inlineHidden:getComputedStyle(document.querySelector('#md .pointing-cue .dir-text')).display==='none',spokenSayVisible:getComputedStyle(document.querySelector('#md .say')).display!=='none',targetZ:getComputedStyle(document.querySelector('#hud-cue-markers')).zIndex,textZ:getComputedStyle(document.querySelector('#md')).zIndex};})()" );
	assert.match( hudCheck.label, /Point at marker/ ); assert.equal( hudCheck.target, true ); assert.equal( hudCheck.inlineHidden, true ); assert.equal( hudCheck.spokenSayVisible, true );
	assert.ok( Number( hudCheck.textZ ) > Number( hudCheck.targetZ ), "Words render in front of fixed targets" );
	const hudShot = await call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "hud-recording.png" ), Buffer.from( hudShot.data, "base64" ) );
	await evaluate( "window.electron.saveSettings({hudCues:false})" );
	await until( "document.querySelector('#hud-delivery-cue').hidden && !document.querySelector('#md').classList.contains('hud-reading')" );
	assert.equal( await evaluate( "getComputedStyle(document.querySelector('#md .pointing-cue .dir-text')).display!=='none'" ), true, "Disabling HUD during delivery restores inline directions" );
	await evaluate( "window.electron.saveSettings({hudCues:true})" );
	await until( "document.querySelector('#md').classList.contains('hud-reading')" );
	await wait( 3800 );
	await evaluate( "document.getElementById('cb-play').click()" );
	await until( "!document.getElementById('cb-play').classList.contains('playing')" );
	await until( "document.querySelector('#hud-delivery-cue').hidden && !document.querySelector('#md').classList.contains('hud-reading')" );
	await wait( 900 );
	const logs = await fs.readdir( path.join( profile, "take-logs" ) );
	const log = JSON.parse( await fs.readFile( path.join( profile, "take-logs", logs.find( name => name.endsWith( ".json" ) ) ), "utf8" ) );
	assert.equal( log.scriptSnapshots[0].pointingCues.length, 3, "Real captured script stores structured cues" );
	assert.equal( log.takes[0].scriptSnapshotId, log.scriptSnapshots[0].id );
	const { editPack } = await import( "../src/client/edit-pack.js" );
	const files = editPack( log );
	const manifest = JSON.parse( files["production-cues.json"] );
	assert.equal( manifest.occurrences.length, 2 );
	assert.equal( manifest.occurrences[0].gestureVerified, false );
	await fs.writeFile( path.join( artifacts, "production-cues.json" ), files["production-cues.json"] );
	await evaluate( "window.electron.openSample('pointing-cues.md')" );
	await until( "document.getElementById('md').textContent.includes('Show a chart')" );
	const sampleShot = await call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "pointing-sample.png" ), Buffer.from( sampleShot.data, "base64" ) );
	assert.deepEqual( errors, [] );
	console.log( JSON.stringify( { pass: true, artifacts, checks: "Actual renderer: silent quoted labels, legacy speech, section anchors, captured snapshot and take-linked edit pack; no hardware accessed" } ) );
} catch ( error ) {
	console.error( error, stderr.slice( -1000 ) );
	process.exitCode = 1;
} finally {
	socket?.close();
	child.kill();
}
