import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SCRIPT_TOOLS, SCRIPT_TOOL_GROUPS, scriptToolEdit } from "../src/client/script-tools.js";
import { parseDirective } from "../src/client/directives.js";
import { parsePointingCue, POINT_DIRECTIONS } from "../src/client/pointing-cues.js";

const spec = JSON.parse( fs.readFileSync( new URL( "../docs/script-directives.json", import.meta.url ), "utf8" ) );
assert.equal( new Set( SCRIPT_TOOLS.map( item => item.id ) ).size, SCRIPT_TOOLS.length );
const covered = new Set();
for ( const item of SCRIPT_TOOLS ) {
	assert.ok( SCRIPT_TOOL_GROUPS.some( group => group.id === item.group ) );
	if ( item.value ) assert.ok( item.text.includes( item.value ) );
	for ( const code of item.text.matchAll( /\{[^}]+\}/g ) ) for ( const [ name, value ] of Object.entries( parseDirective( code[0] ) ) ) {
		assert.ok( spec.directives[name], `${ item.id }: unsupported code` );
		covered.add( name );
		if ( spec.directives[name].value.type === "enum" ) assert.ok( spec.directives[name].value.values.includes( value ) );
	}
}
assert.deepEqual( [ ...covered ].sort(), Object.keys( spec.directives ).sort(), "Every supported directive family has an insert tool" );
assert.deepEqual( SCRIPT_TOOLS.filter( item => item.group === "pointing" ).map( item => parsePointingCue( item.text ).direction ), POINT_DIRECTIONS );
assert.ok( SCRIPT_TOOLS.filter( item => item.group === "pointing" ).every( item => parsePointingCue( item.text ).directionBasis === "presenter" ) );
const initial = "Before HERE after.";
let patch = scriptToolEdit( initial, 7, 11, "cue-direction" );
assert.equal( initial.slice( 0, patch.from ) + patch.insert + initial.slice( patch.to ), "Before [direction] after." );
assert.equal( patch.insert.slice( patch.anchor - patch.from, patch.head - patch.from ), "direction" );
patch = scriptToolEdit( initial, 7, 11, "section" );
assert.equal( patch.insert, "\n\n## Section heading\n\n" );
assert.equal( scriptToolEdit( "", 0, 0, "production-note" ).insert, "<!-- Production note -->\n\n" );
assert.equal( scriptToolEdit( "Before\n\nAfter", 8, 8, "section" ).insert, "## Section heading\n\n" );
assert.throws( () => scriptToolEdit( initial, -1, 2, "stop" ) );
assert.throws( () => scriptToolEdit( initial, 0, 0, "unknown" ) );
// Feed each actual code template through the canonical authoring checker in
// a valid section/script position. Warnings are allowed; unsupported syntax isn't.
const folder = fs.mkdtempSync( path.join( os.tmpdir(), "sightline-insert-tools-" ) );
try {
	const files = SCRIPT_TOOLS.filter( item => item.text.startsWith( "{" ) ).map( ( item ) => {
		const file = path.join( folder, item.id + ".md" );
		fs.writeFileSync( file, item.id.startsWith( "pacing-" ) ? `${ item.text }\n\n## Test\n\nHello there.\n` : `## Test\n\n${ item.text }\n\nHello there.\n` );
		return file;
	} );
	execFileSync( process.execPath, [ "scripts/check-script.mjs", ...files ], { cwd: path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." ), stdio: "pipe" } );
} finally {
	for ( const file of fs.readdirSync( folder ) ) fs.unlinkSync( path.join( folder, file ) );
	fs.rmdirSync( folder );
}
console.log( `${ SCRIPT_TOOLS.length } insert tools: canonical syntax, directive coverage, presenter directions, selected values, cursor replacement and block boundaries pass.` );
