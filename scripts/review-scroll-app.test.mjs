// Isolated layout regression: no user profile, camera, microphone or OBS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const port = 9347;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-review-scroll-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) );
await fs.mkdir( artifacts, { recursive: true } );
const file = path.join( profile, "review.md" );
await fs.writeFile( file, `<!-- Opening preparation comment. Read every line before starting the take.\n${ "Check the camera framing, microphone and script before recording. ".repeat( 12 ) }\nEnd of opening preparation comment. -->\n\n## Voice and framing\n\n[look into the lens]\n${ "The spoken script begins here, after the preparation notes. ".repeat( 15 ) }\n\n## A second section\n\nThe next section remains available.` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( {
	width: 960, height: 620, fontSize: 3.75, opacity: 1, recentFiles: [ file ],
	settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, productionNoteScale: 0.55, scrollMode: "steady", countdown: 0, slate: "off", speechEnabled: false, microphoneEnabled: false, voiceCommands: "off", scratchAudio: false, takeLoudness: "off", checkUpdates: false, obsEnabled: false, remoteControl: false, phoneRemote: false, streamDeck: false, hideFromCapture: false, marginTop: 0, marginBottom: 0, controlsPinned: false }
} ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", data => stderr += data );
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let socket;
try {
	let target;
	for ( let n = 0; n < 100 && !target; n++ ) {
		target = ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( "teleprompter.html" ) );
		if ( !target ) await pause( 100 );
	}
	assert.ok( target, stderr.slice( -1000 ) );
	socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0;
	const pending = new Map(), errors = [], measurements = [];
	socket.addEventListener( "message", ( event ) => {
		const message = JSON.parse( event.data );
		if ( message.id ) pending.get( message.id )?.( message );
		if ( message.method === "Runtime.exceptionThrown" ) errors.push( message.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++sequence, timer = setTimeout( () => reject( new Error( `Timed out: ${ method }` ) ), 10000 );
		pending.set( id, ( message ) => {
			clearTimeout( timer );
			pending.delete( id );
			if ( message.error ) reject( new Error( message.error.message ) );
			else resolve( message.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text );
		return result.result.value;
	};
	await call( "Runtime.enable" );
	await pause( 600 );
	// Show the real session-row elements without enabling recorder/camera services.
	await evaluate( "for(const [id,display] of [['obs-status','flex'],['guide-status','flex'],['guide-controls','inline-block']])document.getElementById(id).style.setProperty('display',display,'important')" );
	await evaluate( "for(const button of document.querySelectorAll('#obs-status button'))button.style.setProperty('display','inline-block','important')" );
	for ( const [ name, width, height ] of [ [ "desktop", 960, 588 ], [ "compact", 560, 500 ] ] ) {
		await call( "Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false } );
		await evaluate( "scrollTo(0,500)" );
		await call( "Input.dispatchMouseEvent", { type: "mouseWheel", x: width / 2, y: height / 2, deltaX: 0, deltaY: -10000 } );
		await pause( 500 );
		const measured = await evaluate( "(()=>{const note=document.querySelector('.production-note'),r=note.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(note);return {scroll:scrollY,noteTop:r.top,firstLine:range.getClientRects()[0].top,controlsBottom:document.getElementById('session-controls').getBoundingClientRect().bottom,noteVisible:getComputedStyle(note).display!=='none'};})()" );
		measurements.push( { name, ...measured } );
		const shot = await call( "Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } } );
		await fs.writeFile( path.join( artifacts, `${ name }-review.png` ), Buffer.from( shot.data, "base64" ) );
		await fs.writeFile( path.join( artifacts, "measurements.json" ), JSON.stringify( measurements, null, 2 ) );
		assert.equal( measured.scroll, 0, `${ name }: wheel reaches the beginning of the script` );
		assert.ok( measured.noteVisible && measured.firstLine >= measured.controlsBottom + 8, `${ name }: the first comment line clears the floating controls: ${ JSON.stringify( measured ) }` );
		if ( name === "compact" ) assert.ok( measured.controlsBottom > measurements[0].controlsBottom + 20, "The compact check exercises a wrapped controls row" );
	}
	await evaluate( "scrollTo(0,0);document.getElementById('cb-play').click()" );
	await pause( 500 );
	assert.equal( await evaluate( "getComputedStyle(document.querySelector('.production-note')).display" ), "none", "Delivery still hides preparation comments" );
	const deliveryPadding = await evaluate( "parseFloat(getComputedStyle(document.getElementById('preview-container')).paddingTop)" );
	assert.ok( deliveryPadding < 50, "Review headroom does not affect the delivery layout" );
	await evaluate( "document.getElementById('cb-play').click();scrollTo(0,0)" );
	await pause( 300 );
	assert.notEqual( await evaluate( "getComputedStyle(document.querySelector('.production-note')).display" ), "none", "Pausing restores the preparation comment" );
	assert.deepEqual( errors, [] );
	console.log( JSON.stringify( { pass: true, artifacts, measurements, checks: "Real wheel scroll, opening note clearance, wrapped session controls, delivery hide and review restore; no media or external recorder" } ) );
} catch ( error ) {
	console.error( error, stderr.slice( -1000 ) );
	process.exitCode = 1;
} finally {
	socket?.close();
	child.kill();
}
