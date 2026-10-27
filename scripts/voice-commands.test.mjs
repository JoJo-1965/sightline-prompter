// node scripts/voice-commands.test.mjs
import assert from "node:assert/strict";
import { matchCommand, createCommandListener } from "../src/client/voice-commands.js";

// What the on-device recogniser actually heard for each command (speech-lab/cmd).
const heard = {
	PAUS: "pause",
	HAWSE: "pause",
	"SLOW DOWN": "slower",
	SLOWDON: "slower",
	FASTER: "faster",
	GO: "go",
	GOAT: "go",
	BACK: "back",
	"NEXT SECTION": "next",
	REZINC: "resync",
	RECINC: "resync",
	MARKA: "marker",
	MARKER: "marker",
	"FROM THE TOP": "top",
	AGAIN: "retake",
	"CARRY ON": "go",
	CARRION: "go",
	BIGGER: "bigger",
	"START AGAIN": "top"
};
for ( const [ text, id ] of Object.entries( heard ) ) {
	assert.equal( matchCommand( text.split( " " ) ), id, text );
}
assert.equal( matchCommand( [ "IS", "A", "THING" ] ), null );
assert.equal( matchCommand( [ "TO" ] ), null );

// A command ends the phrase; mid-sentence it is script.
const got = [];
const take = createCommandListener( { onCommand: id => got.push( id ) } );
assert.deepEqual( take( [ "AND", "SO", "THE", "PROMPTER", "PAUSE" ], false ), [ "AND", "SO", "THE" ] );
assert.deepEqual( take( [ "IS", "A", "THING" ], true ), [ "PROMPTER", "PAUSE", "IS", "A", "THING" ] );
assert.deepEqual( got, [] );

assert.deepEqual( take( [ "WE", "SAID", "PROMPTER" ], false ), [ "WE", "SAID" ] );
assert.deepEqual( take( [ "SLOW", "DOWN" ], true ), [] );
assert.deepEqual( got, [ "slower" ] );

assert.deepEqual( take( [ "PROMPTER", "HAWSE" ], true ), [] );
assert.deepEqual( got, [ "slower", "pause" ] );

console.log( "voice command tests pass" );

// "PROMPTER" and "GO" heard as two phrases (a pause after the wake word).
const got2 = [];
const take2 = createCommandListener( { onCommand: id => got2.push( id ) } );
assert.deepEqual( take2( [ "PROMPTER" ], true ), [] );
assert.deepEqual( take2( [ "GO" ], true ), [] );
assert.deepEqual( got2, [ "go" ] );
console.log( "split wake word passes" );

// While paused, "go" on its own resumes; otherwise it is just a word.
const got3 = [];
let paused = true;
const take3 = createCommandListener( { onCommand: id => got3.push( id ), isPaused: () => paused } );
assert.deepEqual( take3( [ "GO" ], true ), [] );
paused = false;
assert.deepEqual( take3( [ "GO" ], true ), [ "GO" ] );
assert.deepEqual( got3, [ "go" ] );
console.log( "go while paused passes" );
