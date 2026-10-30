// Actual native windows, using an isolated profile and no user's camera/OBS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const port = 9336;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Test port must be free" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-floating-panels-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-floating-shots-" ) );
const file = path.join( profile, "framing.md" );
await fs.writeFile( file, `# Framing check\n\n## Welcome\n\n${ "These words help check a floating panel while prompting continues. ".repeat( 150 ) }` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 900, fontSize: 2, opacity: 1, recentFiles: [ file ], settings: { voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: false, checkUpdates: false, obsEnabled: false } } ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( require( "electron" ), [ ".", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", ( b ) => {
	stderr += b;
} );
child.stdout.resume();
const pause = ms => new Promise( r => setTimeout( r, ms ) );
const clients = [];
const errors = [];
async function target( fragment ) {
	for ( let n = 0; n < 70; n++ ) {
		try {
			const found = ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ) ).find( t => t.url.includes( fragment ) );
			if ( found ) return found;
		} catch { /* Wait for the test app. */ }
		await pause( 100 );
	}
	const pages = await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] );
	throw new Error( `Missing ${ fragment }: ${ JSON.stringify( pages.map( p => ( { url: p.url, title: p.title } ) ) ) } ${ stderr.slice( -1800 ) }` );
}
async function connect( fragment ) {
	const page = await target( fragment );
	const socket = new WebSocket( page.webSocketDebuggerUrl );
	await new Promise( r => socket.addEventListener( "open", r ) );
	clients.push( socket );
	let next = 0;
	const pending = new Map();
	socket.addEventListener( "message", ( event ) => {
		const m = JSON.parse( event.data );
		if ( m.id ) {
			pending.get( m.id )?.( m );
			pending.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) errors.push( m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++next;
		const timer = setTimeout( () => reject( new Error( `Timed out: ${ method }` ) ), 8000 );
		pending.set( id, ( m ) => {
			clearTimeout( timer );
			if ( m.error ) reject( new Error( m.error.message ) );
			else resolve( m.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const r = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( r.exceptionDetails ) throw new Error( r.exceptionDetails.exception?.description ?? r.exceptionDetails.text );
		return r.result.value;
	};
	const until = async ( expression ) => {
		for ( let n = 0; n < 70; n++ ) {
			if ( await evaluate( expression ) ) return;
			await pause( 100 );
		}
		throw new Error( `Not ready: ${ expression }` );
	};
	await call( "Runtime.enable" );
	return { call, evaluate, until, id: page.id };
}
try {
	const main = await connect( "teleprompter.html" );
	await main.until( "document.getElementById('md')?.textContent.includes('Framing check') && !!document.getElementById('obs-status')" );
	await main.evaluate( "document.querySelector('#voice-offer button:last-child')?.click();document.getElementById('cb-settings').click()" );
	const settings = await connect( "panel=settings" );
	await settings.until( "!!document.getElementById('set-countdown')" );
	assert.equal( await main.evaluate( "document.getElementById('settings-modal')===null" ), true, "Settings is in a different native window" );
	assert.equal( await settings.evaluate( "typeof window.electron" ), "undefined", "Utility host has no privileged bridge" );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click()" );
	await settings.evaluate( "document.getElementById('set-countdown').focus();document.getElementById('set-countdown').select()" );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" } );
	await settings.until( "document.getElementById('settings-applied').textContent==='Unsaved changes'" );
	await main.evaluate( "document.getElementById('cb-settings').click()" );
	assert.equal( await settings.evaluate( "document.getElementById('set-countdown').value" ), "1", "Opening again retains the existing draft" );
	await settings.evaluate( "window.close()" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-keep').click();document.getElementById('settings-apply').click()" );
	await settings.until( "document.getElementById('settings-applied').textContent==='Saved'" );
	console.log( "PASS: native Settings window, trusted typing, draft retention, native Close guard and Apply." );
	const size = await settings.evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return {width:r.width,height:r.height};})()" );
	for ( const group of await settings.evaluate( "[...document.querySelectorAll('[data-settings-group]')].map(b=>b.dataset.settingsGroup)" ) ) {
		await settings.evaluate( `document.querySelector('[data-settings-group=${ group }]').click()` );
		for ( const tab of await settings.evaluate( "[...document.querySelectorAll('.settings-subtabs [data-tab]')].filter(b=>!b.hidden).map(b=>b.dataset.tab)" ) ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab=${ tab }]').click()` );
			await settings.evaluate( "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))" );
			await settings.until( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" );
			assert.deepEqual( await settings.evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return {width:r.width,height:r.height};})()" ), size );
			assert.equal( await settings.evaluate( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" ), true, `No scrolling in ${ tab }` );
		}
	}
	const bounds = await settings.evaluate( "({left:window.screenX,top:window.screenY})" );
	await settings.evaluate( "window.moveTo(window.screenX+100,window.screenY+50)" );
	await pause( 300 );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.utilityWindowBounds.settings.x, bounds.left + 100, "Window position is persisted for the next launch" );
	await settings.evaluate( "document.getElementById('settings-close').click()" );
	await main.evaluate( "document.getElementById('cb-settings').click()" );
	await pause( 200 );
	assert.equal( await settings.evaluate( "window.screenX" ), bounds.left + 100, "Reopening preserves the native window position" );
	await main.evaluate( "document.getElementById('cb-mirror-h').click();document.getElementById('cb-mirror-v').click()" );
	assert.equal( await settings.evaluate( "getComputedStyle(document.body).transform" ), "none", "Settings stays upright" );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click();document.querySelector('[data-tab=scrolling]').focus()" );
	const picture = await settings.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "floating-settings.png" ), Buffer.from( picture.data, "base64" ) );
	await settings.evaluate( "window.resizeTo(576,539)" );
	await pause( 200 );
	for ( const group of await settings.evaluate( "[...document.querySelectorAll('[data-settings-group]')].map(b=>b.dataset.settingsGroup)" ) ) {
		await settings.evaluate( `document.querySelector('[data-settings-group=${ group }]').click()` );
		for ( const tab of await settings.evaluate( "[...document.querySelectorAll('.settings-subtabs [data-tab]')].filter(b=>!b.hidden).map(b=>b.dataset.tab)" ) ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab=${ tab }]').click()` );
			await settings.evaluate( "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))" );
			await settings.until( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" );
			assert.equal( await settings.evaluate( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" ), true, `No scrolling in smaller ${ tab }` );
		}
	}
	await settings.evaluate( "window.resizeTo(676,599);document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click()" );
	await main.evaluate( "document.getElementById('cb-tools').click();[...document.querySelectorAll('#tools-panel button')].find(b=>b.textContent.includes('Spacing and mirror')).click()" );
	await settings.until( "!document.querySelector('[data-settings-page=layout]').hidden" );
	assert.ok( await settings.evaluate( "!!document.getElementById('lp-margin-x')" ), "Quick layout tools focus the shared Settings controls rather than an empty panel" );
	console.log( "PASS: fixed Settings frame across all topics without scrolling; native movement, remembered position and upright mirrored prompting." );
	await main.evaluate( "document.getElementById('cb-help').click()" );
	const help = await connect( "panel=help" );
	await help.until( "!!document.querySelector('#help-list [role=tab]')" );
	assert.equal( await main.evaluate( "document.getElementById('help-modal')===null" ), true );
	const helpSizes = await help.evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].map(b=>{b.click();const r=document.querySelector('.help-content').getBoundingClientRect();return [r.width,r.height];})" );
	assert.ok( helpSizes.every( v => v[0] === helpSizes[0][0] && v[1] === helpSizes[0][1] ) );
	assert.equal( await help.evaluate( "getComputedStyle(document.body).transform" ), "none" );
	assert.equal( await help.evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].some(t=>t.textContent==='Voice')" ), false );
	await main.evaluate( "window.electron.saveSettings({voiceCommands:'voice'})" );
	await pause( 150 );
	await main.evaluate( "document.getElementById('cb-help').click()" );
	await help.until( "[...document.querySelectorAll('#help-list [role=tab]')].some(t=>t.textContent==='Voice')" );
	const helpPicture = await help.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "floating-help.png" ), Buffer.from( helpPicture.data, "base64" ) );
	await help.evaluate( "window.close()" );
	await pause( 200 );
	assert.equal( await help.evaluate( "document.getElementById('help-modal').classList.contains('hidden')" ), true );
	assert.equal( await settings.evaluate( "document.getElementById('settings-modal').classList.contains('hidden')" ), false, "Closing Help leaves Settings open" );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click();document.getElementById('set-countdown').focus();document.getElementById('set-countdown').select()" );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" } );
	await settings.until( "document.getElementById('settings-applied').textContent==='Unsaved changes'" );
	await main.evaluate( "window.electron.windowControl('close')" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-keep').click()" );
	assert.equal( await main.evaluate( "!!document.getElementById('cb-settings')" ), true, "Keeping the Settings draft cancels app exit" );
	console.log( "PASS: separate stable Help window, mode-aware live help, independent Close and Settings guard on app exit." );
	assert.deepEqual( errors, [] );
	await main.evaluate( "window.electron.windowControl('close')" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-discard').click()" );
	for ( let n = 0; n < 50 && child.exitCode === null; n++ ) await pause( 100 );
	assert.equal( child.exitCode, 0, "Discarding the Settings draft allows normal app exit and closes the utility windows" );
	console.log( JSON.stringify( { pass: true, errors, artifacts } ) );
} catch ( error ) {
	console.error( error, JSON.stringify( errors ), stderr.slice( -2400 ) );
	process.exitCode = 1;
} finally {
	for ( const socket of clients ) socket.close();
	child.kill();
}
