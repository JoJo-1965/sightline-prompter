import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildInstallerHelp } from "./build-installer-help.mjs";

const out = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-installer-help-" ) );
await buildInstallerHelp( process.cwd(), out, "1.1.0-rc.1" );
let checked = 0;
const broken = [];
const grid = JSON.parse( await fs.readFile( "docs/FEATURE-GRID.json", "utf8" ) );
for ( const file of await fs.readdir( out, { recursive: true } ) ) {
	if ( !file.endsWith( ".html" ) ) continue;
	const html = await fs.readFile( path.join( out, file ), "utf8" );
	if ( file.replace( /\\/g, "/" ) === "docs/FEATURE-GRID-search.html" ) {
		assert.ok( html.includes( 'type="search"' ), "The offline feature reference retains working search" );
		assert.ok( html.includes( grid.buildVersion ), "The reference identifies its reviewed build independently of the installer fixture" );
	} else {
		assert.ok( html.includes( "Installed version 1.1.0-rc.1" ), file );
		assert.ok( !/<script[\s>]/i.test( html ), "Guide pages need no JavaScript" );
	}
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
for ( const name of [ "FEATURE-GRID.csv", "FEATURE-GRID.json" ] ) assert.deepEqual( await fs.readFile( path.join( out, "docs", name ) ), await fs.readFile( path.join( process.cwd(), "docs", name ) ), "Offline comparison data matches the reviewed source" );
const notes = await fs.readFile( path.join( out, "release-notes.html" ), "utf8" );
assert.ok( notes.includes( "Read after installing" ) );
assert.ok( notes.includes( "1.0.6" ), "Published history is retained" );
const started = await fs.readFile( path.join( out, "docs/guide/01-getting-started.html" ), "utf8" );
assert.ok( started.includes( "Read Getting Started guide" ) );
assert.ok( started.includes( "id=\"installing-sightline\"" ) );
assert.ok( started.includes( "https://github.com/JoJo-1965/sightline-prompter/releases/latest" ) );
console.log( `PASS: version-matched offline help, release history and ${ checked } local links/pictures. ${ out }` );
