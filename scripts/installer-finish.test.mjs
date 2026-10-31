// Exercises the real NSIS page without installing or shell-opening anything.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

if ( process.platform !== "win32" ) {
	console.log( "SKIP: native NSIS finish page requires Windows" );
} else {
	const run = promisify( execFile );
	const cache = path.join( process.env.LOCALAPPDATA, "electron-builder/Cache/nsis/nsis-3.0.4.1/makensis.exe" );
	const out = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-installer-finish-" ) );
	const executable = path.join( out, "finish-preview.exe" );
	await run( cache, [ "/V1", `/DPREVIEW_OUT=${ executable }`, "scripts/installer-finish-preview.nsi" ], { windowsHide: true } );
	const results = path.join( out, "finish-results.txt" );
	const defaults = path.join( out, "finish-defaults.txt" );
	for ( let choice = 0; choice < 8; choice++ ) {
		await fs.writeFile( results, "" );
		await run( executable, [ `/CASE=${ choice }` ], { windowsHide: true, timeout: 15000 } );
		assert.equal( await fs.readFile( defaults, "utf8" ), "1,0,0", "Run checked; reading options unchecked" );
		const selected = ( await fs.readFile( results, "utf8" ) ).trim().split( /\r?\n/ ).filter( Boolean );
		assert.equal( selected.length, Number( !!( choice & 1 ) ) + Number( !!( choice & 2 ) ) + Number( !!( choice & 4 ) ) );
		assert.equal( selected.some( s => s === "Sightline Prompter|" ), !!( choice & 1 ), `Run choice ${ choice }` );
		assert.equal( selected.some( s => s.endsWith( "\\release-notes.html|" ) ), !!( choice & 2 ), `Notes choice ${ choice }` );
		assert.equal( selected.some( s => s.endsWith( "\\01-getting-started.html|" ) ), !!( choice & 4 ), `Getting Started choice ${ choice }` );
	}
	await fs.writeFile( results, "" );
	await fs.writeFile( defaults, "" );
	await run( executable, [ "/S", "/CASE=7" ], { windowsHide: true, timeout: 15000 } );
	assert.equal( await fs.readFile( results, "utf8" ), "", "Silent installation opens nothing from the finish page" );
	assert.equal( await fs.readFile( defaults, "utf8" ), "", "Silent installation never shows the finish page" );
	console.log( `PASS: all eight native finish choices, initial defaults and silent mode. ${ out }` );
}
