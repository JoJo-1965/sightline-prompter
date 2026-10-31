// Tiny archive fixture, not a candidate build. No window, microphone or OBS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { KIT_FILES } from "../src/components.js";

const require = createRequire( import.meta.url );
const builderRequire = createRequire( require.resolve( "electron-builder" ) );
const appBuilderRequire = createRequire( builderRequire.resolve( "app-builder-lib" ) );
const asar = appBuilderRequire( "@electron/asar" );
const temp = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-kit-archive-" ) );
try {
	const source = path.join( temp, "source" );
	for ( const file of [ ...KIT_FILES, "src/components.js" ] ) {
		const target = path.join( source, file );
		await fs.mkdir( path.dirname( target ), { recursive: true } );
		await fs.copyFile( file, target );
	}
	await fs.writeFile( path.join( source, "package.json" ), JSON.stringify( { name: "sightline-kit-test", version: "0.0.0", main: "probe.cjs", type: "module" } ) );
	await fs.writeFile( path.join( source, "probe.cjs" ), String.raw`const {app}=require('electron');app.whenReady().then(async()=>{const {createAgentKit}=await import('./src/components.js');const kit=createAgentKit({source:app.getAppPath(),folder:require('node:path').join(app.getPath('userData'),'ai-kit'),version:'archive-test'});await kit.change('install');const status=await kit.status();if(!status.installed||!status.current)throw new Error('Archive kit did not verify');console.log('PACKAGED_KIT_OK');app.quit();}).catch(error=>{console.error(error);app.exit(1);});` );
	const archive = path.join( temp, "fixture.asar" );
	await asar.createPackage( source, archive );
	const env = { ...process.env };
	delete env.ELECTRON_RUN_AS_NODE;
	const child = spawn( require( "electron" ), [ archive, `--user-data-dir=${ path.join( temp, "profile" ) }` ], { env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
	let output = "";
	child.stdout.on( "data", ( data ) => {
		output += data;
	} );
	child.stderr.on( "data", ( data ) => {
		output += data;
	} );
	const timeout = setTimeout( () => child.kill(), 20000 );
	const code = await new Promise( ( resolve, reject ) => {
		child.on( "exit", resolve );
		child.on( "error", reject );
	} );
	clearTimeout( timeout );
	assert.equal( code, 0, output );
	assert.match( output, /PACKAGED_KIT_OK/ );
	console.log( "PASS: Electron installs and verifies the standalone AI kit from inside an app archive" );
} finally {
	await fs.rm( temp, { recursive: true, force: true } );
}
