// Local development harness; never connects to the user's OBS or profile.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = process.argv[2] ?? process.cwd();
if ( await fetch( "http://127.0.0.1:9335/json/version" ).then( () => true ).catch( () => false ) ) throw new Error( "Port 9335 is already in use; close the other development test before running this check" );
const require = createRequire( path.join( root, "package.json" ) );
const { WebSocketServer } = require( "ws" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-obs-smoke-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-production-check-" ) );
const screenshot = path.join( artifacts, "obs-settings.png" );
const mock = new WebSocketServer( { host: "127.0.0.1", port: 0 } );
await new Promise( r => mock.on( "listening", r ) );
const port = mock.address().port;
let active = false;
let connections = 0;
let authOK = false;
const requests = [];
const hash = s => createHash( "sha256" ).update( s ).digest( "base64" );
mock.on( "connection", ( socket ) => {
	connections++;
	socket.send( JSON.stringify( { op: 0, d: { rpcVersion: 1, authentication: { salt: "salt", challenge: "challenge" } } } ) );
	socket.on( "message", ( raw ) => {
		const { op, d } = JSON.parse( raw );
		if ( op === 1 ) {
			authOK = d.authentication === hash( hash( "sightline-test-onlysalt" ) + "challenge" );
			if ( !authOK ) return socket.close( 4009 );
			return socket.send( JSON.stringify( { op: 2, d: { negotiatedRpcVersion: 1 } } ) );
		}
		requests.push( d.requestType );
		let responseData = {};
		if ( d.requestType === "GetVersion" ) responseData = { availableRequests: [ "CreateRecordChapter" ] };
		if ( d.requestType === "StartRecord" ) active = true;
		if ( d.requestType === "StopRecord" ) {
			active = false;
			responseData = { outputPath: "/recordings/sightline-smoke.mp4" };
		}
		if ( d.requestType === "GetRecordStatus" ) responseData = { outputActive: active, outputPaused: false, outputDuration: 3000 };
		socket.send( JSON.stringify( { op: 7, d: { requestId: d.requestId, requestType: d.requestType, requestStatus: { result: true }, responseData } } ) );
	} );
} );
const testScript = path.join( profile, "recording-check.md" );
await fs.writeFile( testScript, `# Recording check\n\n## Welcome\n\n${ "A short recording test keeps the speaker and the script together. ".repeat( 60 ) }\n\n## Next section\n\n${ "This is the next part of the recording. ".repeat( 60 ) }` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( {
	width: 1100, height: 900, fontSize: 2, opacity: 1,
	recentFiles: [ testScript ],
	settings: { scrollMode: "steady", countdown: 0, slate: "off", voiceCommands: "off", checkUpdates: false, scratchAudio: false, takeLoudness: "off", debugMode: false, streamDeck: true, remotePort: 47717 }
} ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( require( "electron" ), [ ".", `--user-data-dir=${ profile }`, "--remote-debugging-port=9335" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let errors = "";
child.stderr.on( "data", ( b ) => {
	errors += b.toString();
} );
child.stdout.resume();
const pause = ms => new Promise( r => setTimeout( r, ms ) );
let ws;
let id = 0;
const pending = new Map();
const exceptions = [];
function send( method, params = {} ) {
	return new Promise( ( resolve, reject ) => {
		const n = ++id;
		const timer = setTimeout( () => reject( new Error( `CDP timed out: ${ method }` ) ), 8000 );
		pending.set( n, ( msg ) => {
			clearTimeout( timer );
			resolve( msg );
		} );
		ws.send( JSON.stringify( { id: n, method, params } ) );
	} );
}
async function evaluate( expression ) {
	const response = await send( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
	if ( response.result?.exceptionDetails ) throw new Error( response.result.exceptionDetails.exception?.description ?? response.result.exceptionDetails.text );
	return response.result?.result?.value;
}
async function until( expression ) {
	for ( let n = 0; n < 60; n++ ) {
		if ( await evaluate( expression ) ) return;
		await pause( 100 );
	}
	throw new Error( `Timed out waiting for ${ expression }` );
}
async function openSettings() {
	await evaluate( "document.getElementById('cb-settings').click()" );
	await until( "!document.getElementById('settings-modal').classList.contains('hidden')" );
	await evaluate( "document.querySelector('.settings-tabs [data-tab=obs]').click()" );
}
try {
	let target;
	for ( let n = 0; n < 80; n++ ) {
		try {
			target = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "teleprompter.html" ) );
		} catch { /* Wait for the isolated app to expose its test target. */ }
		if ( target ) break;
		await pause( 150 );
	}
	assert.ok( target, errors );
	ws = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( r => ws.addEventListener( "open", r ) );
	ws.addEventListener( "message", ( e ) => {
		const m = JSON.parse( e.data );
		if ( m.id ) {
			pending.get( m.id )?.( m );
			pending.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) exceptions.push( m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text );
	} );
	await send( "Runtime.enable" );
	await until( "document.getElementById('obs-status') && document.getElementById('md').textContent.trim().length > 100" );
	const directions = await evaluate( "(async()=>{const {decorateScript}=await import('./decorate.js');const {buildWordIndex}=await import('./word-index.js');const {indexSentences,scriptSentences}=await import('./sentence-highlight.js');const root=document.createElement('div');root.innerHTML='<p>[smile] Hello [shrug] there. [think] More [point] words.</p>';decorateScript(root);const words=buildWordIndex(root).words;indexSentences(root);const sentences=scriptSentences();indexSentences(document.getElementById('md'));return {words,text:root.textContent,directions:root.querySelectorAll('.dir-text').length,sentences:sentences.map(s=>s.text)};})()" );
	assert.deepEqual( directions.words, [ "hello", "there", "more", "words" ] );
	assert.equal( directions.directions, 4 );
	assert.ok( directions.text.includes( "smile" ) && directions.text.includes( "point" ) );
	assert.equal( directions.sentences.join( " " ), "Hello there. More words." );
	console.log( "PASS: delivery notes remain visible but stay out of speech alignment, counts and exported sentences." );
	await evaluate( "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true}))" );
	assert.equal( await evaluate( "document.querySelectorAll('#help-list [role=tab]').length" ), 5 );
	assert.equal( await evaluate( "/OBS recording|Record take|Finish recording/.test(document.querySelector('#help-list').textContent)" ), false );
	assert.equal( await evaluate( "document.querySelectorAll('#help-list [role=tabpanel]:not([hidden])').length" ), 1 );
	await evaluate( "document.querySelector('#help-list [role=tab]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))" );
	assert.equal( await evaluate( "document.querySelector('#help-list [aria-selected=true]').textContent" ), "Scripts" );
	assert.equal( await evaluate( "document.activeElement.textContent" ), "Scripts" );
	await evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].find(t=>t.textContent==='Head guide').click()" );
	const shotHelp = await send( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "help-tabs.png" ), Buffer.from( shotHelp.result.data, "base64" ) );
	await evaluate( "document.getElementById('help-close').click()" );
	console.log( "PASS: actual F1 tabs, hidden disabled modes, one visible panel and keyboard tab navigation." );

	// Exercise the actual app popup and the button-token route used by Stream Deck.
	await evaluate( "window.electron.headGuide()" );
	let guideTarget;
	for ( let n = 0; n < 60; n++ ) {
		guideTarget = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) );
		if ( guideTarget ) break;
		await pause( 100 );
	}
	assert.ok( guideTarget, "head guide must open" );
	const gws = new WebSocket( guideTarget.webSocketDebuggerUrl );
	await new Promise( r => gws.addEventListener( "open", r ) );
	let gid = 0;
	const gp = new Map();
	gws.addEventListener( "message", ( e ) => {
		const m = JSON.parse( e.data );
		if ( m.id ) {
			gp.get( m.id )?.( m );
			gp.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) exceptions.push( m.params.exceptionDetails.text );
	} );
	const gc = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++gid;
		const timer = setTimeout( () => reject( new Error( "guide CDP timeout" ) ), 8000 );
		gp.set( id, ( m ) => {
			clearTimeout( timer );
			resolve( m );
		} );
		gws.send( JSON.stringify( { id, method, params } ) );
	} );
	const ge = async ( expression ) => {
		const m = await gc( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( m.result?.exceptionDetails ) throw new Error( m.result.exceptionDetails.text );
		return m.result?.result?.value;
	};
	await gc( "Runtime.enable" );
	await pause( 1300 );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().width" ), 960 );
	await ge( "document.querySelector('#bigger').click();document.querySelector('#colour').click()" );
	await pause( 350 );
	assert.ok( ( await ge( "document.querySelector('#head').getAttribute('transform')" ) ).includes( "1.05" ) );
	await ge( "document.querySelector('#adjust').click();document.querySelector('[data-x=\"1\"]').click()" );
	await pause( 200 );
	await ge( "document.querySelector('[data-y=\"-1\"]').click()" );
	await pause( 200 );
	await ge( "document.querySelector('#save-ideal').click()" );
	await pause( 200 );
	const savedIdealTransform = await ge( "document.querySelector('#ideal-head').getAttribute('transform')" );
	await ge( "document.querySelector('[data-x=\"-1\"]').click();document.querySelector('#smaller').click()" );
	await pause( 250 );
	assert.equal( await ge( "document.querySelector('#ideal-head').getAttribute('transform')" ), savedIdealTransform, "moving actual must leave ideal fixed" );
	assert.notEqual( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	assert.equal( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform, "reset must restore ideal pose" );
	assert.equal( await ge( "document.querySelector('#ideal-head .pose-label').textContent" ), "Ideal position" );
	assert.equal( await ge( "document.querySelector('#head .pose-label').textContent" ), "Actual position" );
	// Real pointer input exercises the SVG coordinate mapping and drag capture.
	const dragPoint = await ge( "(()=>{const p=new DOMPoint(500,187).matrixTransform(document.querySelector('#head').getScreenCTM());return {x:p.x,y:p.y};})()" );
	await gc( "Input.dispatchMouseEvent", { type: "mousePressed", x: dragPoint.x, y: dragPoint.y, button: "left", clickCount: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseMoved", x: dragPoint.x + 48, y: dragPoint.y + 27, button: "left", buttons: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseReleased", x: dragPoint.x + 48, y: dragPoint.y + 27, button: "left", clickCount: 1 } );
	await pause( 250 );
	assert.notEqual( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform, "drag must move actual outline" );
	assert.equal( await ge( "document.querySelector('#ideal-head').getAttribute('transform')" ), savedIdealTransform );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	console.log( "PASS: labelled ideal/actual outlines, arrows, independent scale, saved ideal, reset and pointer dragging." );
	await ge( "window.headGuide.onState(v=>window.guideTestState=v);document.querySelector('[data-place=centre]').click()" );
	await pause( 350 );
	const centre = await ge( "window.guideTestState.bounds" );
	await ge( "document.querySelector('[data-place=beside]').click()" );
	await pause( 350 );
	await ge( "document.querySelector('[data-place=centre]').click()" );
	await pause( 350 );
	assert.deepEqual( await ge( "window.guideTestState.bounds" ), centre, "centre placement must restore its own saved bounds" );
	assert.equal( await ge( "window.guideTestState.placement" ), "centre" );
	assert.ok( await ge( "!!window.guideTestState.placements.centre && !!window.guideTestState.placements.beside" ) );
	assert.equal( await ge( "window.guideTestState.ideal.x" ), 1 );
	console.log( "PASS: separate saved Centre/Beside placements and live guide metadata." );
	await ge( "window.headGuide.action('resize-start');window.headGuide.action('resize');window.headGuide.action('resize-end')" );
	await ge( "window.headGuide.action('preferences',{x:9,y:2,scale:0.95});document.querySelector('#adjust').click()" );
	await pause( 250 );
	const shotGuide = await gc( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "head-guide-integrated.png" ), Buffer.from( shotGuide.result.data, "base64" ) );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 250 );
	await ge( "document.querySelector('#lock').click()" );
	await pause( 300 );
	assert.equal( await ge( "document.body.classList.contains('locked')" ), true );
	const config = JSON.parse( await fs.readFile( path.join( profile, "stream-deck.json" ), "utf8" ) );
	const headers = { Authorization: "Bearer " + config.token, "Content-Type": "application/json" };
	const getStatus = async () => await ( await fetch( config.url + "/status", { headers } ) ).json();
	assert.equal( ( await getStatus() ).headGuideLocked, true );
	const press = async () => {
		const res = await fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action: "head-guide" } ) } );
		assert.equal( res.status, 200 );
		await pause( 400 );
	};
	const fullscreenPress = async () => {
		const res = await fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action: "head-guide-fullscreen" } ) } );
		assert.equal( res.status, 200 );
		await pause( 500 );
	};
	await fullscreenPress();
	assert.equal( ( await getStatus() ).headGuideFullscreen, true );
	assert.equal( await ge( "document.body.classList.contains('fullscreen') && document.body.classList.contains('chromeless')" ), true );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().top" ), 0 );
	await press();
	assert.equal( await ge( "document.body.classList.contains('locked')" ), false );
	assert.equal( await ge( "document.body.classList.contains('fullscreen') && !document.body.classList.contains('chromeless')" ), true );
	assert.equal( await ge( "getComputedStyle(document.querySelector('header')).visibility" ), "visible" );
	await fullscreenPress();
	assert.equal( ( await getStatus() ).headGuideFullscreen, false );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().width" ), 960 );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().height" ), 540 );
	console.log( "PASS: fullscreen button-token command, chromeless screen-fill, reveal controls without exit, and original window size restored." );
	await press();
	assert.equal( ( await getStatus() ).showHeadGuide, false );
	gws.close();
	await press();
	const reopened = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) );
	assert.ok( reopened );
	const saved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( saved.settings.headGuideScale, 1.05 );
	assert.equal( saved.settings.headGuideColour, "gold" );
	assert.equal( saved.settings.headGuideBounds.width, 960 );
	assert.deepEqual( saved.settings.headGuideIdeal, { x: 1, y: -1, scale: 1.05 } );
	assert.equal( saved.settings.headGuideX, 1 );
	assert.equal( saved.settings.headGuideY, -1 );
	await press();
	console.log( "PASS: integrated popup, appearance persistence, size, lock/unlock/hide/reopen and Stream Deck button-token route." );

	assert.equal( connections, 0 );
	assert.equal( ( await evaluate( "window.electron.obs('status')" ) ).state.enabled, false );
	const command = async action => fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action } ) } );
	await command( "play" );
	await pause( 500 );
	assert.equal( ( await getStatus() ).scrolling, true );
	await command( "obs-finish" );
	await pause( 300 );
	assert.equal( ( await getStatus() ).scrolling, true, "disabled OBS Finish must not stop prompting" );
	await command( "pause" );
	await pause( 200 );
	console.log( "PASS: disabled OBS Finish leaves ordinary prompting running." );
	await openSettings();
	await evaluate( `(()=>{document.getElementById('set-obs-enabled').checked=true;document.getElementById('set-obs-host').value='127.0.0.1';document.getElementById('set-obs-port').value=${ port };document.getElementById('set-obs-password').value='sightline-test-only';document.getElementById('set-obs-markers').checked=true;document.getElementById('settings-apply').click()})()` );
	await until( "window.electron.obs('status').then(r=>r.state.connection==='connected' && r.state.recording==='stopped')" );
	assert.ok( authOK );
	assert.equal( ( await evaluate( "window.electron.obs('start')" ) ).ok, false );
	assert.equal( active, false );
	await evaluate( "document.getElementById('settings-close').click()" );
	await command( "play" );
	await pause( 400 );
	await command( "obs-finish" );
	await pause( 300 );
	assert.equal( ( await getStatus() ).scrolling, true, "status-only OBS Finish must not stop prompting" );
	await command( "pause" );
	await openSettings();
	await evaluate( "document.getElementById('set-obs-controls').checked=true;document.getElementById('settings-apply').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.controls)" );
	const shot = await send( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( screenshot, Buffer.from( shot.result.data, "base64" ) );
	await evaluate( "document.getElementById('settings-close').click();document.querySelector('#obs-status button').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='recording')" );
	await pause( 3300 );
	await evaluate( "document.querySelector('#obs-status button:last-child').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='stopped' && !!r.state.outputPath)" );
	await pause( 700 );
	const files = await fs.readdir( path.join( profile, "take-logs" ) );
	const log = JSON.parse( await fs.readFile( path.join( profile, "take-logs", files.find( n => n.endsWith( ".json" ) ) ), "utf8" ) );
	assert.ok( log.takes.length > 0, "prompter must log a take" );
	assert.ok( log.obs.some( e => e.outputPath === "/recordings/sightline-smoke.mp4" ), "take log must link the confirmed recording path" );
	assert.ok( requests.includes( "CreateRecordChapter" ), "section starts must send a chapter" );
	await evaluate( "window.electron.obs('start')" );
	assert.ok( active );
	const stops = requests.filter( r => r === "StopRecord" ).length;
	await openSettings();
	await evaluate( "document.getElementById('set-obs-enabled').checked=false;document.getElementById('settings-apply').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.connection==='disabled')" );
	assert.ok( active, "disable must leave OBS recording" );
	assert.equal( requests.filter( r => r === "StopRecord" ).length, stops );
	assert.equal( ( await evaluate( "window.electron.obs('test')" ) ).ok, false );
	assert.deepEqual( exceptions, [] );
	await evaluate( "window.electron.headGuide()" );
	await pause( 500 );
	console.log( JSON.stringify( { pass: true, authOK, connections, requests, takes: log.takes.length, obsObservations: log.obs.length, exceptions, screenshot, profile } ) );
} catch ( error ) {
	console.error( error.message );
	console.error( errors.slice( -2400 ) );
	process.exitCode = 1;
} finally {
	try {
		if ( ws?.readyState === 1 ) await send( "Browser.close" );
	} catch { /* The process may already have closed after a failed check. */ }
	ws?.close();
	child.kill();
	for ( const socket of mock.clients ) socket.terminate();
	mock.close();
}
