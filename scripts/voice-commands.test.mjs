// node scripts/voice-commands.test.mjs
import assert from "node:assert/strict";
import { COMMANDS, WAKE_WORDS, matchCommand, createCommandListener, sectionNumber } from "../src/client/voice-commands.js";

assert.equal( matchCommand( [ "record", "take" ] ), "obs-record" );
assert.equal( matchCommand( [ "guide", "on" ] ), "guide-on" );
assert.equal( matchCommand( [ "guide", "off" ] ), "guide-off" );
assert.equal( matchCommand( [ "show", "the", "guide" ] ), "guide-on" );
assert.equal( matchCommand( [ "hide", "the", "guide" ] ), "guide-off" );
assert.equal( matchCommand( [ "start", "recording" ] ), "obs-record" );
assert.equal( matchCommand( [ "finish", "recording" ] ), "obs-finish" );
assert.equal( matchCommand( [ "stop", "recording" ] ), "obs-finish" );
assert.equal( matchCommand( [ "stop" ] ), "pause", "ordinary Stop still pauses prompting" );

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
	"START AGAIN": "top",
	CLOSE: "close",
	CANCEL: "close",
	"NEVER MIND": "close"
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
assert.equal( matchCommand( [ "next", "page" ] ), "next" );
assert.equal( matchCommand( [ "previous", "page" ] ), "back" );
console.log( "page commands pass" );

// A different wake word (Settings > Voice): "Computer, pause".
const got6 = [];
const take6 = createCommandListener( { onCommand: id => got6.push( id ), wakeWord: "computer" } );
assert.deepEqual( take6( [ "COMPUTER", "PAUSE" ], true ), [] );
assert.deepEqual( take6( [ "PROMPTER", "PAUSE" ], true ), [ "PROMPTER", "PAUSE" ], "the old word is just a word now" );
assert.deepEqual( got6, [ "pause" ] );
console.log( "wake word choice passes" );

// Your command words (Settings > Voice > Your words) and sound-alikes.
const mine = [ { id: "wake", heard: [ "prompt her", "trumpeter" ] }, { id: "keeper", heard: "cheaper" }, { id: "go", heard: "gogo" } ];
assert.equal( matchCommand( [ "cheaper" ] ), null );
assert.equal( matchCommand( [ "cheaper" ], { extra: { keeper: [ "cheaper" ] } } ), "keeper" );
assert.equal( matchCommand( [ "slowa" ], { soundAlike: true } ), "slower" );
assert.equal( matchCommand( [ "banana" ], { soundAlike: true } ), null );
const got7 = [];
const take7 = createCommandListener( { onCommand: id => got7.push( id ), commandWords: mine } );
assert.deepEqual( take7( [ "TRUMPETER", "CHEAPER" ], true ), [] );
assert.deepEqual( take7( [ "PROMPT", "HER", "PAUSE" ], true ), [] );
assert.deepEqual( take7( [ "PROMPT" ], false ), [], "hold a possible wake prefix out of script tracking" );
assert.deepEqual( take7( [ "HER", "MARKER" ], true ), [], "a wake phrase split across chunks" );
assert.deepEqual( take7( [ "I", "PROMPT", "HER", "TO", "SPEAK", "UP", "EVERY", "DAY" ], true ).length > 0, true );
assert.deepEqual( got7, [ "keeper", "pause", "marker" ] );
// Sound-alike wake word: off unless asked for.
const got8 = [];
const take8 = createCommandListener( { onCommand: id => got8.push( id ), soundAlike: true } );
assert.deepEqual( take8( [ "PROMPTA", "PAUSE" ], true ), [] );
assert.deepEqual( take8( [ "THE", "PROMOTION", "WAS", "GREAT" ], true ), [ "THE", "PROMOTION", "WAS", "GREAT" ] );
assert.deepEqual( got8, [ "pause" ] );
const take9 = createCommandListener( { onCommand: () => assert.fail( "no sound-alike unless asked" ) } );
take9( [ "PROMPTA", "PAUSE" ], true );
console.log( "your command words and sound-alikes pass" );

// Every advertised alias works, including five-word help, for each selected
// wake word and every recogniser chunk boundary. Commands never reach alignment.
for ( const wakeWord of Object.keys( WAKE_WORDS ) ) {
	for ( const command of COMMANDS ) {
		for ( const phrase of command.phrases ) {
			assert.equal( matchCommand( phrase.split( " " ) ), command.id, phrase );
			const words = [ wakeWord, ...phrase.split( " " ) ];
			for ( let split = 0; split <= words.length; split++ ) {
				const commands = [];
				const listener = createCommandListener( { wakeWord, onCommand: id => commands.push( id ) } );
				assert.deepEqual( listener( words.slice( 0, split ), false ), [] );
				assert.deepEqual( listener( words.slice( split ), true ), [] );
				assert.deepEqual( commands, [ command.id ], `${ wakeWord } ${ phrase }, split ${ split }` );
			}
		}
	}
}

// Similar spelling alone must not change the guide or recording state, jump a
// section or rate a take. Test both settings of optional phonetic matching.
const negatives = [ "guide in", "guide of", "head guide of", "show the slide", "hide the slide", "not recording", "started recording", "restart recording", "start reading", "stop reading", "do not record", "next question", "market", "resetting", "bigger picture" ];
for ( const soundAlike of [ false, true ] ) {
	for ( const phrase of negatives ) {
		assert.equal( matchCommand( phrase.split( " " ), { soundAlike } ), null, phrase );
		const commands = [];
		const listener = createCommandListener( { soundAlike, onCommand: id => commands.push( id ) } );
		const words = [ "prompter", ...phrase.split( " " ) ];
		assert.deepEqual( listener( words, true ), words );
		assert.deepEqual( commands, [] );
	}
}
assert.equal( matchCommand( [ "banana" ], { extra: { keeper: [ "banana" ], scrap: [ "banana" ] } } ), null, "conflicting taught aliases are not guessed" );
assert.equal( matchCommand( [ "pause" ], { extra: { reset: [ "pause" ] } } ), "pause", "built-in meanings remain stable" );
assert.equal( matchCommand( [ "guide", "of" ], { extra: { "guide-off": [ "guide of" ] } } ), "guide-off", "an explicitly taught form still works" );
assert.equal( matchCommand( [ "slowa" ], { soundAlike: false } ), null );

let now = 1000;
const timed = [];
const timedTake = createCommandListener( { clock: () => now, onCommand: id => timed.push( id ) } );
timedTake( [ "prompter" ], true );
now += 4001;
assert.deepEqual( timedTake( [ "reset" ], true ), [ "prompter", "reset" ], "an expired wake cannot reset a later phrase" );
assert.deepEqual( timed, [] );
timedTake( [ "prompter" ], true );
now += 3000;
assert.deepEqual( timedTake( [ "pause" ], true ), [] );
assert.deepEqual( timed, [ "pause" ] );
assert.deepEqual( timedTake( [ "prompter", "prompter", "go" ], true ), [] );
assert.deepEqual( timed, [ "pause", "go" ], "repeating the wake word starts a fresh request" );

// A bare section or paused resume can straddle chunks without leaking words.
for ( const phrase of [ "section one", "section twenty one", "section ninety nine", "carry on" ] ) {
	const words = phrase.split( " " );
	for ( let split = 1; split < words.length; split++ ) {
		const commands = [];
		const listener = createCommandListener( { isPaused: () => true, onCommand: ( ...args ) => commands.push( args ) } );
		assert.deepEqual( listener( words.slice( 0, split ), false ), [] );
		assert.deepEqual( listener( words.slice( split ), true ), [] );
		assert.equal( commands.length, 1, phrase );
	}
}
assert.equal( sectionNumber( [ "section", "twenty-one" ] ), 21 );
assert.equal( sectionNumber( [ "section", "ninety", "nine" ] ), 99 );
assert.equal( sectionNumber( [ "section", "twenty", "ten" ] ), null );
assert.equal( sectionNumber( [ "section", "100" ] ), null );
const passThrough = createCommandListener( { commandWords: mine, onCommand: () => assert.fail( "ordinary speech is not a command" ) } );
assert.deepEqual( passThrough( [ "section" ], false ), [] );
assert.deepEqual( passThrough( [ "one", "explains", "this" ], true ), [ "section", "one", "explains", "this" ] );
assert.deepEqual( passThrough( [ "prompt" ], false ), [] );
assert.deepEqual( passThrough( [ "her", "to", "read" ], true ), [ "prompt", "her", "to", "read" ] );
assert.deepEqual( passThrough( [ "prompt" ], true ), [ "prompt" ] );
assert.deepEqual( passThrough( [ "her", "pause" ], true ), [ "her", "pause" ], "incomplete wake prefixes do not span separate phrases" );
const longWords = Array( 10000 ).fill( "reading" );
assert.deepEqual( passThrough( longWords, false ), longWords );
assert.deepEqual( passThrough( [], true ), [] );
assert.deepEqual( passThrough( [ "the", "prompter", "follows", "my", "prompter", "device" ], true ), [ "the", "prompter", "follows", "my", "prompter", "device" ], "repeated mentions preserve ordinary speech" );
console.log( "command alias matrix, chunk boundaries, negative phrases, expiry and bounded buffering pass" );

// Observed on-device split spelling of the chosen Teleprompter wake word.
for ( let split = 0; split <= 4; split++ ) {
	const commands = [];
	const listener = createCommandListener( { wakeWord: "teleprompter", onCommand: id => commands.push( id ) } );
	const words = [ "TELE", "PROMPTER", "GUIDE", "OFF" ];
	assert.deepEqual( listener( words.slice( 0, split ), false ), [] );
	assert.deepEqual( listener( words.slice( split ), true ), [] );
	assert.deepEqual( commands, [ "guide-off" ] );
}
const disabledSplitWake = createCommandListener( { wakeWord: "computer", onCommand: () => assert.fail( "selected wake word only" ) } );
assert.deepEqual( disabledSplitWake( [ "TELE", "PROMPTER", "PAUSE" ], true ), [ "TELE", "PROMPTER", "PAUSE" ] );
assert.equal( matchCommand( [ "culer" ], { soundAlike: true, extra: { keeper: [ "colour" ], scrap: [ "color" ] } } ), null, "ambiguous phonetics are declined" );
assert.equal( matchCommand( [ "cansel" ], { soundAlike: true } ), "close", "observed on-device Cancel spelling" );
const conflictingResume = createCommandListener( { isPaused: () => true, commandWords: [ { id: "go", heard: "pause" } ], onCommand: () => assert.fail( "a taught resume form cannot override built-in Pause" ) } );
assert.deepEqual( conflictingResume( [ "pause" ], true ), [ "pause" ] );
