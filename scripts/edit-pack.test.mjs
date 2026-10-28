// node scripts/edit-pack.test.mjs
import assert from "node:assert/strict";
import { createTakeLog } from "../src/client/take-log.js";
import { timedWords, takeSentences, takeMarks, takeCues, captions, editPack } from "../src/client/edit-pack.js";

// Section 1 (index 0): two sentences, words 0-4 and 5-8.
const SENTENCES = [
	{ s: 0, section: -1, from: 0, to: 0, text: "Intro" },
	{ s: 1, section: 0, from: 1, to: 5, text: "Have you ever walked out?" },
	{ s: 2, section: 0, from: 6, to: 9, text: "Most of us have." },
	{ s: 3, section: 1, from: 10, to: 11, text: "Next section." }
];

let now = Date.parse( "2026-10-28T10:00:00.000Z" );
const clock = () => now;
const log = createTakeLog( { clock, sentences: () => SENTENCES } );
const at = seconds => Date.parse( "2026-10-28T10:00:00.000Z" ) + seconds * 1000;

log.slate( 0 ); // time 0
now += 1000;
log.tick( { active: true, index: 0, title: "One", advanced: true } );
// "Have you ever walked" ... went back ... "Have you ever walked out" "Most of" (pause) "us have."
log.words( [ { i: 1, w: "Have", at: at( 1.2 ) }, { i: 2, w: "you", at: at( 1.4 ) }, { i: 3, w: "ever", at: at( 1.6 ) }, { i: 4, w: "walked", at: at( 1.9 ) } ] );
log.words( [ { i: 1, w: "Have", at: at( 3.0 ) }, { i: 2, w: "you", at: at( 3.2 ) }, { i: 3, w: "ever", at: at( 3.4 ) }, { i: 4, w: "walked", at: at( 3.7 ) }, { i: 5, w: "out?", at: at( 4.0 ) } ] );
log.words( [ { i: 6, w: "Most", at: at( 4.6 ) }, { i: 7, w: "of", at: at( 4.8 ) }, { i: 9, w: "have.", at: at( 7.0 ) } ] );
now = at( 7.5 );
log.tick( { active: true, index: 0, title: "One", advanced: true } );
log.tick( { active: false, index: 0, atEnd: true } );

const data = log.data();
const take = data.takes[0];
assert.equal( take.slate, 0 );
assert.deepEqual( take.rereads, [ { t: 3, from: 1, after: 4 } ] );
assert.deepEqual( take.sentences.map( s => s.s ), [ 1, 2 ], "only the take's own section" );
assert.deepEqual( take.words.map( w => w.i ), [ 1, 2, 3, 4, 5, 6, 7, 9 ], "the re-read replaces the first reading" );

// Word ends: the next word's start, or a word's own length before a gap.
const words = timedWords( take );
assert.equal( words[0].end, 3.2 );
assert.equal( words[6].start, 4.8 );
assert.ok( words[6].end < 5.3, "a word before a long gap ends on its own" );

// Sentences: the first said in full, the second missing "us".
const sentences = takeSentences( take );
assert.equal( sentences[0].complete, true );
assert.equal( sentences[0].start, 3 );
assert.deepEqual( sentences[1].missing, [ "us" ] );
assert.equal( sentences[1].said, 3 );
assert.equal( sentences[1].of, 4 );

// Marks: sentence starts, the re-read, the skipped word and the long pause.
const types = takeMarks( take ).map( m => m.type );
for ( const type of [ "take-start", "slate", "sentence", "reread", "skipped", "pause", "take-end" ] ) {
	assert.ok( types.includes( type ), `a ${ type } mark` );
}
const pause = takeMarks( take ).find( m => m.type === "pause" );
assert.ok( pause.duration >= 1.5 );

// Captions in the script's wording, on the log's clock.
const cues = takeCues( take );
assert.equal( cues[0].text, "Have you ever walked out?" );
assert.equal( cues[1].text, "Most of have." );
const srt = captions( data );
assert.match( srt, /^1\n00:00:03,000 --> 00:00:04,\d{3}\nHave you ever walked out\?\n/ );
assert.match( captions( data, "vtt" ), /^WEBVTT\n\n00:00:03\.000 --> / );

// A long sentence splits into cues of two balanced lines.
const long = {
	section: 1, take: 1, start: 0, end: 20, status: "complete", markers: [], rereads: [],
	sentences: [ { s: 0, from: 0, to: 29, text: Array.from( { length: 30 }, ( _, k ) => `word${ k }` ).join( " " ) } ],
	words: Array.from( { length: 30 }, ( _, k ) => ( { i: k, w: `word${ k }`, t: k * 0.4 } ) )
};
const longCues = takeCues( long );
assert.ok( longCues.length > 1 );
for ( const c of longCues ) {
	assert.ok( c.text.split( "\n" ).length <= 2 );
	for ( const line of c.text.split( "\n" ) ) assert.ok( line.length <= 50, line );
}
for ( let k = 1; k < longCues.length; k++ ) assert.ok( longCues[k - 1].end <= longCues[k].start );

// An older log, without sentences: captions from the words heard.
const old = { ...take, sentences: undefined, rereads: undefined };
assert.equal( takeCues( old )[0].text.startsWith( "Have you ever" ), true );

// The pack: every file, with the README when given.
const pack = editPack( data, "# brief" );
assert.deepEqual( Object.keys( pack ).sort(), [
	"README.md", "captions.srt", "captions.vtt", "edit-marks.csv", "edit-marks.json",
	"sentences.csv", "take-log.json", "takes.csv", "words.csv"
] );
assert.match( pack["words.csv"], /^section,take,sentence,word_index,word,start,end\r\n1,1,1,1,Have,3,3\.2\r\n/ );
assert.match( pack["sentences.csv"], /1,1,yes,2,4\.6,[\d.]+,3,4,no,us,Most of us have\./ );

console.log( "edit pack tests pass" );
