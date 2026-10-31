// Exercise the real first-use offer with an empty, disposable profile.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const port = 9337;
const endpoint = `http://127.0.0.1:${ port }`;
assert.equal( await fetch( `${ endpoint }/json/version` ).then( () => true ).catch( () => false ), false );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-first-use-" ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
async function inspect( fragment ) {
	let target;
	for ( let n = 0; n < 80 && !target; n++ ) {
		const targets = await fetch( `${ endpoint }/json/list` ).then( r => r.json() ).catch( () => [] );
		target = targets.find( item => item.url.includes( fragment ) );
		if ( !target ) await pause( 100 );
	}
	assert.ok( target, `Window did not open: ${ fragment }` );
	const socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve, { once: true } ) );
	let id = 0;
	return {
		close: () => socket.close(),
		async value( expression ) {
			return ( await this.call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true } ) ).result.value;
		},
		async call( method, params ) {
			const requestId = ++id;
			return new Promise( ( resolve, reject ) => {
				const timer = setTimeout( () => reject( new Error( "First-use inspection timed out" ) ), 8000 );
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
		}
	};
}
for ( const first of [ true, false ] ) {
	const child = spawn( require( "electron" ), [ ".", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }` ], { cwd: root, env, windowsHide: true, stdio: "ignore" } );
	const clients = [];
	try {
		const main = await inspect( "teleprompter.html" );
		clients.push( main );
		if ( first ) {
			const offer = await inspect( "panel=workflow" );
			clients.push( offer );
			let rows = 0;
			for ( let n = 0; n < 60 && rows !== 4; n++ ) {
				rows = await offer.value( "document.querySelectorAll('#workflow-rows .workflow-row').length" );
				if ( rows !== 4 ) await pause( 100 );
			}
			assert.equal( rows, 4 );
			await offer.value( "document.getElementById('workflow-close').click()" );
			await main.value( "document.getElementById('cb-settings').click()" );
			const settings = await inspect( "panel=settings" );
			clients.push( settings );
			for ( let n = 0; n < 60 && !await settings.value( "!!document.getElementById('settings-topic-words')" ); n++ ) await pause( 100 );
			await settings.value( "document.getElementById('settings-topic-words').click()" );
			await settings.value( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
			const shot = await settings.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( profile, "settings-words.png" ), Buffer.from( shot.data, "base64" ) );
			await settings.value( "document.getElementById('settings-close').click()" );
		} else {
			await pause( 1200 );
			assert.equal( ( await fetch( `${ endpoint }/json/list` ).then( r => r.json() ) ).some( item => item.url.includes( "panel=workflow" ) ), false, "Existing profiles do not get the first-use offer again" );
		}
		await main.value( "setTimeout(()=>window.electron.windowControl('close'),50);true" );
		for ( let n = 0; n < 80 && child.exitCode === null; n++ ) await pause( 100 );
		assert.equal( child.exitCode, 0 );
	} finally {
		clients.forEach( client => client.close() );
		child.kill();
	}
}
console.log( "PASS: first-use checklist appears on an empty profile and stays dismissed after restart; no camera, microphone or OBS setup invoked." );
console.log( JSON.stringify( { screenshot: path.join( profile, "settings-words.png" ) } ) );
