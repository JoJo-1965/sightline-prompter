import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildInstallerHelp } from "./build-installer-help.mjs";

const out = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-installer-help-" ) );
await buildInstallerHelp( process.cwd(), out, "1.0.7-rc.9" );
let checked = 0;
const broken = [];
for ( const file of await fs.readdir( out, { recursive: true } ) ) {
	if ( !file.endsWith( ".html" ) ) continue;
	const html = await fs.readFile( path.join( out, file ), "utf8" );
	assert.ok( html.includes( "Installed version 1.0.7-rc.9" ), file );
	assert.ok( !/<script[\s>]/i.test( html ), "Offline help needs no JavaScript" );
	for ( const [ , ref ] of html.matchAll( /(?:href|src)="([^"]+)"/g ) ) {
		if ( /^[a-z]+:|^#|^\/\//i.test( ref ) ) continue;
		const target = decodeURIComponent( ref.split( /[?#]/ )[0] );
		if ( !target ) continue;
		checked++;
		try {
			await fs.access( path.resolve( out, path.dirname( file ), target ) );
		} catch {
			broken.push( `${ file }: ${ target }` );
		}
	}
}
assert.deepEqual( broken, [], "Bundled help links and pictures must work offline" );
const notes = await fs.readFile( path.join( out, "release-notes.html" ), "utf8" );
assert.ok( notes.includes( "Read after installing" ) );
assert.ok( notes.includes( "1.0.6" ), "Published history is retained" );
const started = await fs.readFile( path.join( out, "docs/guide/01-getting-started.html" ), "utf8" );
assert.ok( started.includes( "Read Getting Started guide" ) );
assert.ok( started.includes( "id=\"installing-sightline\"" ) );
assert.ok( started.includes( "https://github.com/JoJo-1965/sightline-prompter/releases/latest" ) );
console.log( `PASS: version-matched offline help, release history and ${ checked } local links/pictures. ${ out }` );
