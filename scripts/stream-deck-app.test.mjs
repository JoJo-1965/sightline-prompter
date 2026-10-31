// Real buttons-only API and guide windows on a disposable profile. No actual
// OBS connection, microphone, Stream Deck profile or user settings are touched.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-deck-controls-" ) );
const file = path.join( profile, "framing-check.md" );
await fs.writeFile( file, "# Framing check\n\n## One\n\nA disposable script for guide controls." );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 850, recentFiles: [ file ], slots: [ { path: file } ], activeSlot: 0, settings: { checkUpdates: false, streamDeck: true, remotePort: 47719, voiceCommands: "off", scrollMode: "steady", obsEnabled: false, phoneRemote: false, scratchAudio: false } } ) );
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
assert.equal( await fetch( "http://127.0.0.1:47719/status" ).then( () => true ).catch( () => false ), false, "isolated API port must be free" );
const child = spawn( require( "electron" ), [ ".", `--user-data-dir=${ profile }` ], { cwd: root, env, windowsHide: true, stdio: "ignore" } );
async function until( read, predicate = Boolean ) {
	for ( let n = 0; n < 120; n++ ) {
		const value = await read().catch( () => null );
		if ( predicate( value ) ) return value;
		await pause( 100 );
	}
	throw new Error( "The isolated app did not reach the expected state" );
}
try {
	const remote = await until( async () => JSON.parse( await fs.readFile( path.join( profile, "stream-deck.json" ), "utf8" ) ) );
	const request = ( route, body ) => fetch( `${ remote.url }/${ route }`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${ remote.token }`, "Content-Type": "application/json" }, ...( body ? { body: JSON.stringify( body ) } : {} ) } );
	const status = async () => ( await request( "status" ) ).json();
	const command = async ( action, value ) => {
		const result = await request( "command", { action, value } );
		return { status: result.status, body: await result.json() };
	};
	await until( status, s => !!s?.listeningControl && s.file === file );
	assert.equal( ( await request( "settings", { voiceCommands: "always" } ) ).status, 403 );
	assert.equal( ( await command( "head-guide-adjust", { axis: "x", steps: 1 } ) ).status, 400 );
	await command( "head-guide" );
	await until( status, s => s?.headGuide?.shown );
	await command( "head-guide-adjust", { axis: "y", steps: -4 } );
	assert.equal( ( await status() ).headGuide.y, -1 );
	await command( "head-guide-control", "eyes-lock" );
	assert.equal( ( await status() ).headGuide.eyesLocked, true );
	assert.equal( ( await command( "head-guide-adjust", { axis: "x", steps: 2 } ) ).status, 400 );
	await command( "head-guide-adjust", { axis: "top", steps: 10 } );
	assert.equal( ( await status() ).headGuide.top, 1.1 );
	assert.equal( ( await status() ).headGuide.y, -1, "shaping keeps the eye centre fixed" );
	await command( "head-guide-fullscreen" );
	await until( status, s => s?.headGuide?.fullscreen );
	await command( "head-guide-control", "adjust" );
	await command( "head-guide-adjust", { axis: "left", steps: -10 } );
	assert.equal( ( await status() ).headGuide.left, 0.9 );
	const ideal = ( await status() ).headGuide.ideal;
	await command( "head-guide-control", "ideal-visible" );
	assert.equal( ( await status() ).headGuide.showIdeal, false );
	await command( "head-guide-control", "reset-pose" );
	assert.equal( ( await status() ).headGuide.y, ideal.y );
	assert.deepEqual( ( await status() ).headGuide.ideal, ideal );
	assert.equal( ( await command( "head-guide-control", "save-ideal" ) ).status, 400, "remote controls cannot overwrite the ideal reference" );
	await command( "head-guide" );
	await until( status, s => s?.headGuide?.chromeless === false );
	await command( "head-guide" );
	await until( status, s => !s?.headGuide?.shown );
	await command( "listening-toggle" );
	await until( status, s => s?.listeningControl?.suspended === true );
	await command( "listening-toggle" );
	await until( status, s => s?.listeningControl?.suspended === false );
	await command( "listening-restart" );
	await command( "session-check" );
	await pause( 400 );
	const saved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( saved.settings.voiceCommands, "off" );
	assert.equal( saved.settings.obsEnabled, false );
	assert.equal( ( await status() ).scrolling, false );
	assert.equal( ( await status() ).listening, null );
	console.log( JSON.stringify( { pass: true, checks: "real button API, guide/eye lock/fullscreen adjustments, ideal retained, invalid operations blocked, session listening preference retained and no recording started", profile } ) );
} finally {
	child.kill();
	await new Promise( resolve => child.exitCode !== null ? resolve() : child.once( "exit", resolve ) );
}
