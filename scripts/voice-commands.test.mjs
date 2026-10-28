// node scripts/voice-commands.test.mjs
import assert from "node:assert/strict";
import { matchCommand, createCommandListener, sectionNumber } from "../src/client/voice-commands.js";

// What the on-device recogniser actually heard for each command (speech-lab/cmd).
const heard = {
	KEEPER: "keeper",
	KIPPER: "keeper",
	"KEEP THAT": "keeper",
	"THAT'S A KEEPER": "keeper",
	"SCRAP THAT": "scrap",
	"SCRUB THAT": "scrap",
	"BIN IT": "scrap",
	"KEEP GOING": "go",
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

// The wake word is acknowledged at once; a short phrase after it that isn't
// a command is reported, but a script line that mentions the prompter isn't.
const woke = [];
const missed = [];
const take4 = createCommandListener( {
	onCommand: id => woke.push( `command:${ id }` ),
	onWake: () => woke.push( "wake" ),
	onMiss: words => missed.push( words.join( " " ) )
} );
take4( [ "PROMPTER" ], false );
assert.deepEqual( woke, [ "wake" ] );
take4( [ "BANANA" ], true );
assert.deepEqual( missed, [ "BANANA" ] );
take4( [ "PROMPTER", "GO" ], true );
assert.deepEqual( woke, [ "wake", "wake", "command:go" ] );
take4( [ "THE", "PROMPTER", "SHOWS", "EVERY", "WORD", "YOU", "READ" ], true );
assert.deepEqual( missed, [ "BANANA" ], "a long script line isn't a miss" );
console.log( "wake and miss pass" );

// "Prompter, what can I say?" asks for the list.
assert.equal( matchCommand( [ "what", "can", "I", "say" ] ), "help" );
assert.equal( matchCommand( [ "help" ] ), "help" );
assert.equal( matchCommand( [ "commands" ] ), "help" );
console.log( "help command passes" );

// "Section 3" on its own (a spoken slate), or after "Prompter".
assert.equal( sectionNumber( [ "SECTION", "THREE" ] ), 3 );
assert.equal( sectionNumber( [ "section", "1" ] ), 1 );
assert.equal( sectionNumber( [ "SECTION", "TO" ] ), 2 );
assert.equal( sectionNumber( [ "THE", "SECTION", "ONE" ] ), null );
assert.equal( sectionNumber( [ "SECTION", "BANANA" ] ), null );
const got5 = [];
const take5 = createCommandListener( { onCommand: ( id, value ) => got5.push( `${ id }:${ value }` ) } );
assert.deepEqual( take5( [ "SECTION", "ONE" ], true ), [] );
assert.deepEqual( take5( [ "PROMPTER", "SECTION", "FOUR" ], true ), [] );
assert.deepEqual( take5( [ "IN", "THIS", "SECTION", "ONE", "THING" ], true ), [ "IN", "THIS", "SECTION", "ONE", "THING" ] );
assert.deepEqual( got5, [ "section:1", "section:4" ] );
assert.equal( matchCommand( [ "reset" ] ), "reset" );
assert.equal( matchCommand( [ "from", "the", "top" ] ), "top" );
console.log( "section and reset pass" );
assert.equal( matchCommand( [ "back", "to", "the", "marker" ] ), "back-to-marker" );
assert.equal( matchCommand( [ "marker" ] ), "marker" );
console.log( "back to the marker passes" );
