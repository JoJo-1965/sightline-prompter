import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9364;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-guide-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = ""; child.stderr.on( "data", data => stderr += data ); child.stdout.resume();
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
const sockets = [], errors = [];
async function connect( fragment ) {
	let target;
	for ( let n = 0; n < 100; n++ ) {
		target = fragment === "main-process" ? { webSocketDebuggerUrl: stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1] } : ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( fragment ) );
		if ( target?.webSocketDebuggerUrl ) break;
		await pause( 100 );
	}
	assert.ok( target?.webSocketDebuggerUrl, `Missing ${ fragment }: ${ stderr.slice( -1000 ) }` );
	const socket = new WebSocket( target.webSocketDebuggerUrl ); sockets.push( socket ); await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let counter = 0; const pending = new Map();
	socket.addEventListener( "message", event => { const result = JSON.parse( event.data ); if ( result.id ) { pending.get( result.id )?.( result ); pending.delete( result.id ); } if ( result.method === "Runtime.exceptionThrown" ) errors.push( result.params.exceptionDetails.exception?.description ?? result.params.exceptionDetails.text ); } );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => { const id = ++counter; const timer = setTimeout( () => reject( new Error( `Timed out: ${ method } ${ params.expression ?? "" }` ) ), 15000 ); pending.set( id, result => { clearTimeout( timer ); result.error ? reject( new Error( result.error.message ) ) : resolve( result.result ); } ); socket.send( JSON.stringify( { id, method, params } ) ); } );
	const evaluate = async expression => { const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } ); if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ); return result.result.value; };
	await call( "Runtime.enable" ); return { call, evaluate };
}
try {
 const main = await connect("teleprompter.html"); await pause(500);
 const native = await connect("main-process");
 await native.evaluate("(()=>{const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');e.Menu.getApplicationMenu().items.find(x=>x.label==='Help').submenu.items.find(x=>x.label==='Download and installation help').click()})()");
 const guide = await connect("guide.html"); await pause(400);
 assert.match(await guide.evaluate("document.querySelector('#page h1').textContent"), /Download and install/);
 await guide.evaluate("Promise.all([...document.images].map(i=>i.decode()))");
 assert.equal(await guide.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length"),3);
 await guide.evaluate("document.querySelector('#contents .home').click()"); await pause(150);
 await guide.evaluate("[...document.querySelectorAll('#page a')].find(a=>a.textContent==='Grouped release notes').click()"); await pause(150);
 assert.match(await guide.evaluate("document.querySelector('#page h1').textContent"), /1.2.0/);
 await guide.evaluate("[...document.querySelectorAll('#page a')].find(a=>a.textContent==='current roadmap').click()"); await pause(150);
 assert.match(await guide.evaluate("document.querySelector('#page h1').textContent"), /roadmap/i);
 await guide.evaluate("document.querySelector('#contents .home').click()"); await pause(100);
 await guide.evaluate("[...document.querySelectorAll('#page a')].find(a=>a.textContent==='Feature grid').click()"); await pause(150);
 assert.equal(await guide.evaluate("document.querySelectorAll('#page table').length>10"),true);
 await guide.evaluate("document.querySelector('#contents [data-page=\"18-installation.md\"]').click()"); await pause(150);
 assert.match(await guide.evaluate("document.querySelector('#page h1').textContent"), /Download and install/);
 assert.deepEqual(errors,[]);
 console.log("PASS: packaged Help menu, installation illustrations, relative release/roadmap links, feature tables and guide navigation");
} finally {
 for(const socket of sockets)socket.close();
 await new Promise(resolve=>{const stop=spawn("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});stop.on("exit",resolve);stop.on("error",resolve);});
}
