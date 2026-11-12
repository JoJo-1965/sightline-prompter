import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { autoFormatScript } from "../src/client/script-autoformat.js";
import { readingMode, readingModePatch } from "../src/client/reading-mode.js";
import { controlView, controlAction } from "../src/client/control-actions.js";

assert.equal( readingMode( { scrollMode: "voice" } ), "voice" );
assert.equal( readingMode( { scrollMode: "steady" }, "notes" ), "notes" );
assert.equal( readingMode( { pointsMode: true }, "points", "voice" ), "voice", "An explicit operator choice can override script Notes mode" );
for ( const mode of [ "voice", "notes", "scroll" ] ) {
	const patch = readingModePatch( mode );
	assert.equal( patch.pointsMode, mode === "notes" );
	assert.ok( Object.keys( patch ).every( key => [ "pointsMode", "scrollMode" ].includes( key ) ), "Mode choice must not change OBS, theme or capture preferences" );
	assert.throws( () => readingModePatch( mode, { busy: true } ), /Pause/ );
	assert.throws( () => readingModePatch( mode, { editing: true } ), /Pause/ );
}
assert.throws( () => readingModePatch( "voice", { voice: false } ), /Enable/ );
assert.throws( () => readingModePatch( "unknown" ) );
assert.equal( controlView( "clean-view", { cleanOverlay: true } ).active, true );
assert.equal( controlAction( "clean-view" ).action, "clean-view" );
const source = "Dr. Smith said, “Take your time.” We can pause naturally. This is my third sentence. Here is a fourth sentence. And a fifth.\r\n\r\nA second paragraph\r\nwraps across two lines, with £5 and emoji 🙂 intact.";
const normalize = text => text.replace( /\s+/g, " " ).trim();
const plain = autoFormatScript( source );
assert.equal( normalize( plain.text.replace( /^## .*$/gm, "" ) ), normalize( source ), "All original words, punctuation, quotes, amounts and order remain" );
assert.equal( plain.sections, 1 );
assert.ok( plain.paragraphs >= 3 );
assert.equal( /\{/.test( plain.text ), false, "No controls or recorder actions are added by default" );
const enhanced = autoFormatScript( source, { title: "My call", sections: true, cue: true, audio: true, pacing: true, wpm: 150 } );
assert.ok( enhanced.text.includes( "{soundcheck: room}" ) && enhanced.text.includes( "{soundcheck: voice}" ) );
assert.ok( enhanced.text.includes( "[breathe]" ) && enhanced.text.includes( "{wpm: 150}" ) );
assert.equal( enhanced.sections, enhanced.paragraphs );
assert.equal( /\{(?:record|pause|stop|mode)\b/.test( enhanced.text ), false, "No recorder, forced stop or reading-mode change is invented" );
assert.equal( autoFormatScript( source, { paragraphs: false } ).paragraphs, 2 );
assert.equal( /\{record/.test( autoFormatScript( "Hello.", { title: "Opening {record: on}" } ).text ), false, "A heading field cannot inject an executable code" );
for ( const existing of [ "## Existing\n\nWords.", "<!-- A note -->\nWords.", "{record: on}\nWords.", "[smile] Words.", "- Existing list" ] ) assert.throws( () => autoFormatScript( existing ), /already/ );
assert.throws( () => autoFormatScript( "" ) );
assert.throws( () => autoFormatScript( "a".repeat( 200001 ) ) );
assert.throws( () => autoFormatScript( source, { wpm: 500 } ) );
const folder = fs.mkdtempSync( path.join( os.tmpdir(), "sightline-format-" ) );
try {
	const file = path.join( folder, "formatted.md" );
	fs.writeFileSync( file, enhanced.text );
	execFileSync( process.execPath, [ "scripts/check-script.mjs", file ], { cwd: path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." ), stdio: "pipe" } );
	fs.unlinkSync( file );
} finally {
	fs.rmdirSync( folder );
}
console.log( "Reading modes: explicit three-way choice, script override and unchanged unrelated settings pass. Auto format: unchanged words/order, optional starter codes, no recorder/hold actions, markup protection and canonical validation pass." );
