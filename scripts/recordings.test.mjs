// node scripts/recordings.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { deleteRecording, listRecordings, readRecording, recordingPack, updateRecording, zipFiles } from "../src/recordings.js";

const dir = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-recordings-" ) );
const take = ( section, n, duration, rating = null ) => ( {
	section, title: `Section ${ section }`, take: n, start: 0, end: duration, duration,
	status: "complete", rating, markers: [], words: [ { i: 0, w: "hello", t: 0.5 } ]
} );
const log = {
	app: "Sightline Prompter test", script: "M2 Intro.md", date: "2026-10-28",
	startedAt: "2026-10-28T10:00:00.000Z",
	takes: [ take( 1, 1, 20 ), take( 1, 2, 18, "keeper" ), take( 2, 1, 30, "scrap" ), take( 2, 2, 31 ) ],
	events: []
};
await fs.writeFile( path.join( dir, "M2 Intro 2026-10-28.json" ), JSON.stringify( log ) );
await fs.writeFile( path.join( dir, "not a log.json" ), "{ broken" );
await fs.writeFile( path.join( dir, "notes.txt" ), "ignored" );

// The list: only real take logs, with the counts worked out.
let list = await listRecordings( dir );
assert.equal( list.length, 1 );
const r = list[0];
assert.equal( r.id, "M2 Intro 2026-10-28" );
assert.equal( r.takes, 4 );
assert.equal( r.sections, 2 );
assert.equal( r.keepers, 1 );
assert.equal( r.scrapped, 1 );
assert.equal( r.recordedSeconds, 99 );
assert.equal( r.editSeconds, 18 + 31 ); // the keeper, and the last complete take
assert.equal( r.voice, true );
assert.equal( r.title, null );

// Name, note and processed live in library.json; the log is untouched.
const before = await fs.readFile( path.join( dir, "M2 Intro 2026-10-28.json" ), "utf-8" );
const named = await updateRecording( dir, r.id, { title: "  Module 2 intro  ", note: "Camera B", processed: true } );
assert.equal( named.title, "Module 2 intro" );
assert.equal( named.note, "Camera B" );
assert.ok( named.processed );
assert.equal( await fs.readFile( path.join( dir, "M2 Intro 2026-10-28.json" ), "utf-8" ), before );
const cleared = await updateRecording( dir, r.id, { note: "", processed: false } );
assert.equal( cleared.note, null );
assert.equal( cleared.processed, null );
assert.equal( cleared.title, "Module 2 intro" );

// Saved at the same moment, neither change is lost.
await Promise.all( [
	updateRecording( dir, r.id, { note: "Both" } ),
	updateRecording( dir, r.id, { processed: true } )
] );
const both = ( await listRecordings( dir ) )[0];
assert.equal( both.note, "Both" );
assert.ok( both.processed );

// One recording: each take, which ones the edit uses, no word lists.
const detail = await readRecording( dir, r.id );
assert.equal( detail.takeList.length, 4 );
assert.deepEqual( detail.takeList.filter( t => t.used ).map( t => `${ t.section }.${ t.take }` ), [ "1.2", "2.2" ] );
assert.equal( detail.log, undefined );

// Ids can't reach outside the folder.
for ( const bad of [ "../secret", "a/b", "library", "", "nope" ] ) {
	await assert.rejects( readRecording( dir, bad ) );
}

// The edit pack, and a zip that a real unzipper can read.
const files = await recordingPack( dir, r.id, "# Brief" );
assert.ok( files["take-log.json"] && files["words.csv"] && files["README.md"] === "# Brief" );
const zipPath = path.join( dir, "pack.zip" );
await fs.writeFile( zipPath, zipFiles( files ) );
if ( process.platform === "win32" ) {
	const out = path.join( dir, "unzipped" );
	execFileSync( "powershell", [ "-NoProfile", "-Command", `Expand-Archive -LiteralPath '${ zipPath }' -DestinationPath '${ out }'` ] );
	for ( const [ name, contents ] of Object.entries( files ) ) {
		assert.equal( await fs.readFile( path.join( out, name ), "utf-8" ), contents, name );
	}
}

// Delete: through the trash function given, and the name goes too.
const trashed = [];
await deleteRecording( dir, r.id, async ( file ) => {
	trashed.push( path.basename( file ) );
	await fs.rm( file );
} );
assert.deepEqual( trashed, [ "M2 Intro 2026-10-28.json" ] );
list = await listRecordings( dir );
assert.equal( list.length, 0 );
assert.deepEqual( JSON.parse( await fs.readFile( path.join( dir, "library.json" ), "utf-8" ) ), {} );

await fs.rm( dir, { recursive: true, force: true } );
console.log( "recordings tests pass" );
