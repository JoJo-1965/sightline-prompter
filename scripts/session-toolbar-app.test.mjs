// Real layout/input regression with a disposable profile and no media devices.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9378;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use an isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-session-toolbar-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) );
await fs.mkdir( artifacts, { recursive: true } );
const script = path.join( profile, "toolbar-check.md" );
await fs.writeFile( script, "<!-- Check your framing and sound before recording. -->\n\n## Section one\n\nRead at your own pace.\n\n## Section two\n\nKeep the reading position steady while the controls hide and return.\n" );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( {
	width: 1100, height: 760, fontSize: 3.25, opacity: 1, recentFiles: [ script ],
	settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, controlsPinned: false, speechEnabled: false, microphoneEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", checkUpdates: false, obsEnabled: false, remoteControl: false, phoneRemote: false, streamDeck: false, hideFromCapture: false, padEnabled: false, marginTop: 0, marginBottom: 0 }
} ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
let stderr = "", socket;
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
child.stderr.on( "data", value => stderr += value );
const measurements = [], errors = [];
try {
	let target;
	for ( let n = 0; n < 300 && !target; n++ ) {
		target = ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( "teleprompter.html" ) );
		if ( !target ) await pause( 100 );
	}
	assert.ok( target, stderr.slice( -1000 ) );
	socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0;
	const pending = new Map();
	socket.addEventListener( "message", ( event ) => {
		const result = JSON.parse( event.data );
		if ( result.id ) pending.get( result.id )?.( result );
		if ( result.method === "Runtime.exceptionThrown" ) errors.push( result.params.exceptionDetails.exception?.description ?? result.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++sequence, timer = setTimeout( () => reject( Error( `Timed out: ${ method }` ) ), 15000 );
		pending.set( id, ( value ) => {
			clearTimeout( timer );
			pending.delete( id );
			value.error ? reject( Error( value.error.message ) ) : resolve( value.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( result.exceptionDetails ) throw Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text );
		return result.result.value;
	};
	await call( "Runtime.enable" );
	for ( let n = 0; n < 100 && !await evaluate( "!!document.getElementById('session-controls')" ); n++ ) await pause( 50 );
	await pause( 500 );
	await evaluate( "for(const [id,display] of [['obs-status','flex'],['section-status','block']]){const e=document.getElementById(id);e.classList.remove('hidden');e.style.setProperty('display',display,'important')}document.getElementById('section-status').textContent='Section 1 / 2';for(const button of document.querySelectorAll('#obs-status button'))button.style.setProperty('display','inline-block','important');document.body.style.background='#141820'" );
	const geometry = () => evaluate( "(()=>{const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};return {hidden:document.body.classList.contains('controls-hidden'),bar:rect('control-bar'),row:rect('session-controls'),section:rect('section-status'),obs:rect('obs-status'),note:document.querySelector('.production-note').getBoundingClientRect().top,scroll:scrollY}})()" );
	const pointer = ( x, y ) => call( "Input.dispatchMouseEvent", { type: "mouseMoved", x, y } );
	const shot = async name => fs.writeFile( path.join( artifacts, name + ".png" ), Buffer.from( ( await call( "Page.captureScreenshot", { format: "png" } ) ).data, "base64" ) );
	for ( const [ name, width, height ] of [ [ "desktop", 1440, 900 ], [ "prompter", 1024, 600 ], [ "compact", 760, 500 ], [ "wrapped", 560, 500 ] ] ) {
		await call( "Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false } );
		await pointer( width / 2, 1 );
		await pause( 350 );
		await evaluate( "scrollTo(0,0)" );
		const shown = await geometry();
		assert.equal( shown.hidden, false );
		assert.ok( shown.row.top >= shown.bar.bottom + 7, `${ name }: row clears visible toolbar` );
		assert.ok( shown.note >= shown.row.bottom + 8, `${ name }: opening review note clears controls` );
		await shot( `${ name }-shown` );
		await pointer( width / 2, height - 30 );
		await pause( 350 );
		const hidden = await geometry();
		assert.equal( hidden.hidden, true );
		assert.equal( hidden.row.top, 8, `${ name }: hidden toolbar leaves only the top inset` );
		assert.ok( Math.abs( hidden.note - shown.note ) < 1 && hidden.scroll === shown.scroll, `${ name }: auto-hide preserves reading position` );
		await pointer( hidden.obs.left + 24, hidden.obs.top + 20 );
		await pause( 300 );
		const hovered = await geometry();
		assert.equal( hovered.hidden, true, `${ name }: reaching recorder controls does not reveal the toolbar` );
		assert.equal( hovered.row.top, hidden.row.top, `${ name }: recorder controls do not move away from the pointer` );
		assert.notEqual( await evaluate( "getComputedStyle(document.querySelector('#obs-status button')).cursor" ), "none", `${ name }: persistent buttons retain a visible pointer` );
		await shot( `${ name }-hidden` );
		measurements.push( { name, width, height, shown, hidden, hovered } );
	}
	// Resize while hidden, then reveal: review headroom must still fit the bar.
	await call( "Emulation.setDeviceMetricsOverride", { width: 1024, height: 600, deviceScaleFactor: 1, mobile: false } );
	await pause( 150 );
	assert.equal( ( await geometry() ).row.top, 8 );
	await pointer( 512, 1 );
	await pause( 350 );
	const resized = await geometry();
	assert.ok( resized.note >= resized.row.bottom + 8, "Opening notes clear a toolbar revealed after hidden resize" );
	await evaluate( "document.body.classList.add('controls-hidden','quick-editing')" );
	await pause( 350 );
	const editing = await geometry();
	assert.ok( editing.row.top >= editing.bar.bottom + 7, "Quick edit's visible toolbar retains row clearance" );
	await evaluate( "document.body.classList.remove('quick-editing');document.getElementById('cb-clean-view').click()" );
	assert.equal( await evaluate( "getComputedStyle(document.getElementById('session-controls')).visibility" ), "hidden", "Clean view still hides session controls" );
	await evaluate( "document.getElementById('overlay-restore').click();window.electron.saveSettings({controlsPinned:true})" );
	await pause( 350 );
	await pointer( 512, 570 );
	assert.equal( ( await geometry() ).hidden, false, "Pinned toolbar remains shown" );
	assert.deepEqual( errors, [] );
	await fs.writeFile( path.join( artifacts, "measurements.json" ), JSON.stringify( { measurements, resized, editing }, null, 2 ) );
	console.log( JSON.stringify( { pass: true, artifacts, checks: "Real pointer auto-hide/reveal at four widths, fixed top inset, stable script position, clickable persistent controls, hidden resize, quick edit, pinned toolbar and Clean view" } ) );
} catch ( error ) {
	console.error( error, stderr.slice( -1000 ) );
	process.exitCode = 1;
} finally {
	socket?.close();
	await new Promise( ( resolve ) => {
		const stop = spawn( "taskkill", [ "/PID", String( child.pid ), "/T", "/F" ], { windowsHide: true, stdio: "ignore" } );
		stop.on( "exit", resolve );
		stop.on( "error", resolve );
	} );
}
