// Real reset IPC and persistence, on a disposable profile. Relaunch/confirmation
// are intercepted in that process; the test then reopens the same profile.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-defaults-" ) );
const port = 9338;
const url = `http://127.0.0.1:${ port }`;
assert.equal( await fetch( `${ url }/json/version` ).then( () => true ).catch( () => false ), false );
const personal = path.join( profile, "kept-script.md" );
await fs.writeFile( personal, "# Keep this script\n\n## One\n\nThese words stay saved." );
const sentinels = [ "speech-models/existing/model.bin", "take-logs/kept.json", "scratch-audio/kept.wav", "external-components.json", "obs-credentials.json" ];
for ( const name of sentinels ) {
	await fs.mkdir( path.dirname( path.join( profile, name ) ), { recursive: true } );
	await fs.writeFile( path.join( profile, name ), name.endsWith( ".json" ) ? "{}" : "preserve this file" );
}
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 850, fontSize: 5, opacity: 0.4, mirrored: "both", recentFiles: [ personal ], slots: [ null, null, { path: personal, scrollY: 0, section: 0 } ], activeSlot: 2, deepgramApiKey: "fixture-service-key", remoteToken: "old-token", phoneKey: "old-phone", settings: { scrollMode: "steady", voiceCommands: "off", theme: "cream", padLayout: { buttons: [ "play" ], columns: 1 }, checkUpdates: false, obsEnabled: false, scratchAudio: false } } ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let stderr = "";
const clients = [];
let child;
function launch( inspect = false ) {
	stderr = "";
	child = spawn( require( "electron" ), [ ".", ...( inspect ? [ "--inspect=0" ] : [] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }` ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
	child.stderr.on( "data", ( value ) => {
		stderr += value;
	} );
}
async function connect( fragment ) {
	let endpoint;
	for ( let n = 0; n < 80 && !endpoint; n++ ) {
		if ( fragment === "native" ) endpoint = stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1];
		else endpoint = ( await fetch( `${ url }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( target => target.url.includes( fragment ) )?.webSocketDebuggerUrl;
		if ( !endpoint ) await pause( 100 );
	}
	assert.ok( endpoint, `Missing ${ fragment }` );
	const socket = new WebSocket( endpoint );
	await new Promise( resolve => socket.addEventListener( "open", resolve, { once: true } ) );
	clients.push( socket );
	let id = 0;
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const requestId = ++id;
		const timer = setTimeout( () => reject( new Error( `Timed out: ${ method }` ) ), 10000 );
		const receive = ( event ) => {
			const message = JSON.parse( event.data );
			if ( message.id !== requestId ) return;
			clearTimeout( timer );
			socket.removeEventListener( "message", receive );
			if ( message.error || message.result.exceptionDetails ) reject( new Error( JSON.stringify( message ) ) );
			else resolve( message.result );
		};
		socket.addEventListener( "message", receive );
		socket.send( JSON.stringify( { id: requestId, method, params } ) );
	} );
	const value = async expression => ( await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } ) ).result.value;
	const until = async ( expression ) => {
		for ( let n = 0; n < 80; n++ ) {
			if ( await value( expression ) ) return;
			await pause( 100 );
		}
		throw new Error( `Not ready: ${ expression }` );
	};
	return { value, until, call, socket };
}
try {
	launch( true );
	let main = await connect( "teleprompter.html" );
	await main.until( "document.getElementById('md')?.textContent.includes('Keep this script')&&!!document.getElementById('obs-status')" );
	const native = await connect( "native" );
	await native.value( "(()=>{const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');const w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html'));globalThis.resetResponse=0;globalThis.relaunchCount=0;globalThis.quitCount=0;globalThis.realClose=w.close.bind(w);e.app.relaunch=()=>{relaunchCount++};w.close=()=>{quitCount++};e.dialog.showMessageBox=async(_w,options)=>{globalThis.resetQuestion=options;return{response:resetResponse}};return true;})()" );
	assert.equal( ( await main.value( "window.electron.components('kit','install')" ) ).kit.installed, true );
	const kitBefore = await fs.readFile( path.join( profile, "ai-kit/sightline-kit.json" ), "utf8" );
	await main.value( "localStorage.setItem('reset-test-layout','keep until confirmed');document.getElementById('cb-settings').click()" );
	const settings = await connect( "panel=settings" );
	await settings.until( "!!document.getElementById('settings-topic-about')" );
	await settings.value( "document.getElementById('settings-topic-about').click()" );
	for ( let n = 0; n < 8 && !await settings.value( "document.getElementById('settings-restore-defaults').getClientRects().length>0" ); n++ ) await settings.value( "document.querySelector('.settings-pagination button:last-child').click()" );
	const picture = await settings.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( profile, "settings-defaults.png" ), Buffer.from( picture.data, "base64" ) );
	await settings.value( "document.getElementById('settings-restore-defaults').click()" );
	await settings.until( "document.getElementById('settings-restore-defaults-status').textContent.includes('Cancelled')" );
	assert.equal( await native.value( "resetQuestion.defaultId" ), 0 );
	assert.equal( await native.value( "relaunchCount+quitCount" ), 0 );
	assert.equal( await main.value( "localStorage.getItem('reset-test-layout')" ), "keep until confirmed" );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).fontSize, 5 );
	await native.value( "resetResponse=1" );
	await native.value( "(()=>{const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');const s=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.session;globalThis.resetSession=s;globalThis.realClear=s.clearStorageData.bind(s);s.clearStorageData=async()=>{throw Error('Fixture storage failure')};return true;})()" );
	await settings.value( "document.getElementById('settings-restore-defaults').click()" );
	await settings.until( "document.getElementById('settings-restore-defaults-status').textContent.includes('Fixture storage failure')" );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).fontSize, 5, "A failed reset restores the previous state" );
	assert.equal( await native.value( "relaunchCount+quitCount" ), 0 );
	await native.value( "resetSession.clearStorageData=realClear" );
	await settings.value( "document.getElementById('settings-restore-defaults').click()" );
	await settings.until( "document.getElementById('settings-restore-defaults-status').textContent.includes('Restarting')" );
	assert.equal( await native.value( "relaunchCount" ), 1 );
	assert.equal( await native.value( "quitCount" ), 1 );
	assert.equal( await main.value( "localStorage.getItem('reset-test-layout')" ), null );
	const reset = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( reset.fontSize, 3 );
	assert.equal( reset.opacity, 1 );
	assert.equal( reset.mirrored, "off" );
	assert.equal( reset.settings.padLayout, null );
	assert.equal( reset.settings.theme, "default" );
	for ( const key of [ "obsEnabled", "remoteControl", "streamDeck", "phoneRemote" ] ) assert.equal( reset.settings[key], false );
	assert.deepEqual( reset.slots, [] );
	assert.deepEqual( reset.recentFiles, [] );
	assert.equal( reset.showGettingStarted, true );
	assert.equal( reset.deepgramApiKey, "fixture-service-key" );
	assert.notEqual( reset.remoteToken, "old-token" );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.before-defaults.json" ), "utf8" ) ).fontSize, 5 );
	assert.equal( await fs.readFile( path.join( profile, "ai-kit/sightline-kit.json" ), "utf8" ), kitBefore );
	for ( const name of sentinels ) assert.equal( await fs.readFile( path.join( profile, name ), "utf8" ), name.endsWith( ".json" ) ? "{}" : "preserve this file" );
	assert.match( await fs.readFile( personal, "utf8" ), /These words stay saved/ );
	await native.value( "setTimeout(realClose,50);true" );
	native.socket.close();
	for ( let n = 0; n < 80 && child.exitCode === null; n++ ) await pause( 100 );
	assert.equal( child.exitCode, 0 );
	launch();
	main = await connect( "teleprompter.html" );
	const welcome = await connect( "panel=workflow" );
	await welcome.until( "document.querySelectorAll('#workflow-rows .workflow-row').length===4" );
	await main.until( "document.getElementById('md')?.textContent.includes('short script')" );
	assert.equal( ( await main.value( "window.electron.components()" ) ).kit.installed, true );
	await main.value( "setTimeout(()=>window.electron.windowControl('close'),50);true" );
	for ( let n = 0; n < 80 && child.exitCode === null; n++ ) await pause( 100 );
	assert.equal( child.exitCode, 0 );
	console.log( JSON.stringify( { pass: true, checks: "native confirmation/cancel, saved defaults, retained kit/model/files/credentials, rotated pairings, clean restart and onboarding", screenshot: path.join( profile, "settings-defaults.png" ) } ) );
} finally {
	clients.forEach( socket => socket.close() );
	child?.kill();
}
