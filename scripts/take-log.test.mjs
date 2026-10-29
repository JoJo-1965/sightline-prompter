// node scripts/take-log.test.mjs
import assert from "node:assert/strict";
import { createTakeLog, pickTakes, takeLogCsv } from "../src/client/take-log.js";
import { takeMarks } from "../src/client/edit-pack.js";

let now = Date.parse( "2026-10-28T10:00:00.000Z" );
const clock = () => now;
const wait = seconds => ( now += seconds * 1000 );
const log = createTakeLog( { clock } );

// Run the prompter for `seconds` in a section, the text moving on.
function run( index, seconds, title = `Section ${ index + 1 }` ) {
	for ( let s = 0; s < seconds; s += 0.5 ) {
		log.tick( { active: true, index, title, advanced: true } );
		wait( 0.5 );
	}
}

// Section 1 read through into section 2: one complete take.
run( 0, 10 );
// Section 2: a false start, then "Prompter, again".
run( 1, 4 );
log.jump( "again" );
// Back at the start of section 2: a good take, marked as a keeper while reading.
run( 1, 6 );
log.marker();
run( 1, 6 );
assert.deepEqual( log.rate( "keeper" ), { section: 2, take: 2, title: "Section 2", rating: "keeper" } );
// Into section 3, then stopped at its end, waiting at a {stop}: the wait isn't counted.
run( 2, 8 );
for ( let i = 0; i < 6; i++ ) {
	log.tick( { active: true, index: 2, title: "Section 3", advanced: false } );
	wait( 0.5 );
}
log.tick( { active: false, index: 2, atEnd: true } );
// Scrap it after stopping: rates the last take.
assert.equal( log.rate( "scrap" ).take, 1 );
// A blip under 1.5 s isn't a take.
run( 3, 1 );
log.tick( { active: false, index: 3 } );

const data = log.data();
assert.equal( data.startedAt, "2026-10-28T10:00:00.000Z" );
assert.deepEqual(
	data.takes.map( t => [ t.section, t.take, t.status, t.rating, t.duration ] ),
	[
		[ 1, 1, "complete", null, 10 ],
		[ 2, 1, "retake", null, 3.5 ],
		[ 2, 2, "complete", "keeper", 12 ],
		[ 3, 1, "complete", "scrap", 7.5 ]
	]
);
assert.equal( data.takes[2].markers.length, 1 );
assert.equal( data.takes[1].start, 10 );

// The pick: the keeper; the last complete take; nothing usable when all are scrapped.
assert.deepEqual(
	data.sections.map( s => [ s.section, s.takes, s.use, s.reason ] ),
	[
		[ 1, 1, 1, "last complete take" ],
		[ 2, 2, 2, "keeper" ],
		[ 3, 1, null, "no usable take" ]
	]
);
assert.equal(
	pickTakes( [
		{ section: 1, take: 1, status: "complete", rating: "keeper", title: "a" },
		{ section: 1, take: 2, status: "complete", rating: null, title: "a" }
	] )[0].use,
	1,
	"a keeper beats a later plain take"
);

// CSV: a header, one row per take, the pick marked, commas quoted.
const csv = takeLogCsv( { takes: [ { ...data.takes[2], title: "Why, then?" } ], sections: data.sections } );
const lines = csv.trim().split( "\r\n" );
assert.equal( lines.length, 2 );
assert.match( lines[1], /^2,"Why, then\?",2,/ );
assert.match( lines[1], /,keeper,,yes,/ );

// Reloading a saved log carries on the numbering.
const again = createTakeLog( { clock } );
again.load( JSON.parse( JSON.stringify( data ) ) );
for ( let s = 0; s < 5; s += 0.5 ) {
	again.tick( { active: true, index: 1, title: "Section 2", advanced: true } );
	wait( 0.5 );
}
again.tick( { active: false, index: 1 } );
assert.equal( again.data().takes.at( -1 ).take, 3 );

// Read to the end, then back for another go: the first take still counts as complete.
const back = createTakeLog( { clock } );
for ( let s = 0; s < 4; s += 0.5 ) {
	back.tick( { active: true, index: 0, title: "One", advanced: true, atEnd: s >= 3 } );
	wait( 0.5 );
}
back.jump( "back" );
assert.equal( back.data().takes[0].status, "complete" );

// A slate just before a take: the take records when its beep went off, and
// the first slate starts the log, so that beep is time 0.
const slated = createTakeLog( { clock } );
assert.equal( slated.nextTake( 2 ), 1 );
slated.slate( 2 );
wait( 1 );
for ( let s = 0; s < 3; s += 0.5 ) {
	slated.tick( { active: true, index: 2, title: "Three", advanced: true } );
	wait( 0.5 );
}
assert.equal( slated.nextTake( 2 ), 2, "counts the take in progress" );
slated.tick( { active: false, index: 2, atEnd: true } );
assert.equal( slated.data().takes[0].slate, 0 );
assert.equal( slated.data().takes[0].start, 1 );
assert.equal( slated.data().events[0].type, "slate" );

// Words said while following the voice land on the take in progress, in
// seconds on the log's clock to a hundredth.
{
	const words = createTakeLog( { clock } );
	const start = now;
	for ( let s = 0; s < 3; s += 0.5 ) {
		words.tick( { active: true, index: 0, title: "Intro", advanced: true } );
		wait( 0.5 );
	}
	words.words( [ { i: 0, w: "Hello", at: start + 1234 }, { i: 1, w: "there.", at: start + 1500 } ] );
	// Reading "there." again replaces the first reading.
	words.words( [ { i: 1, w: "there.", at: start + 2000 } ] );
	words.tick( { active: false, index: 0, atEnd: true } );
	assert.deepEqual( words.data().takes[0].words, [ { i: 0, w: "Hello", t: 1.23 }, { i: 1, w: "there.", t: 2 } ] );
	// (checked below, after a re-read)
	// Nothing is logged between takes.
	words.words( [ { i: 2, w: "Lost", at: now } ] );
	assert.equal( words.data().takes.length, 1 );
}

// {listen: off} to {listen: on}: the time off script, on the take; one
// still open when the take ends closes with it. The edit pack marks it.
{
	const off = createTakeLog( { clock } );
	for ( let s = 0; s < 2; s += 0.5 ) {
		off.tick( { active: true, index: 0, title: "Demo", advanced: true } );
		wait( 0.5 );
	}
	off.listen( false );
	wait( 3 );
	off.listen( false ); // a second off while off changes nothing
	off.listen( true );
	off.tick( { active: true, index: 0, title: "Demo", advanced: true } );
	wait( 1 );
	off.listen( false );
	wait( 2 );
	off.tick( { active: true, index: 0, title: "Demo", advanced: true } );
	off.tick( { active: false, index: 0, atEnd: true } );
	const take = off.data().takes[0];
	assert.equal( take.offScript.length, 2 );
	assert.deepEqual( take.offScript[0], { start: 2, end: 5 } );
	assert.equal( take.offScript[1].start, 6 );
	assert.ok( take.offScript[1].end >= 8, "closed with the take" );
	const marks = takeMarks( take ).filter( m => m.type === "off-script" );
	assert.equal( marks.length, 2 );
	assert.equal( marks[0].duration, 3 );
	assert.deepEqual( off.data().events.map( e => e.type ).filter( t => t.startsWith( "listen" ) ), [ "listen-off", "listen-off", "listen-on", "listen-off" ] );
}

console.log( "take log tests pass" );

// Loudness per take (roadmap 42): measured over the take's own time, and
// handed to onTake as the take is logged.
{
	let now = 1000;
	const seen = [];
	const asked = [];
	const log = createTakeLog( {
		clock: () => now,
		loudness: ( from, to ) => {
			asked.push( [ from, to ] );
			return { lufs: -21.5, peak: -0.4, noise: -58, aboveNoise: 36.5, warning: "clipping" };
		},
		onTake: take => seen.push( take )
	} );
	log.tick( { active: true, index: 0, title: "One" } );
	now = 2000;
	log.tick( { active: true, index: 0, title: "One", advanced: true } );
	now = 5000;
	log.tick( { active: true, index: 0, title: "One", advanced: true } );
	now = 5200;
	log.tick( { active: false, index: 0, atEnd: true } );
	const [ take ] = log.data().takes;
	assert.deepEqual( take.loudness, { lufs: -21.5, peak: -0.4, noise: -58, aboveNoise: 36.5, warning: "clipping" } );
	assert.deepEqual( asked, [ [ 1000, 5000 ] ] );
	assert.equal( seen.length, 1 );
	// A log without a meter gives null, and a meter that throws doesn't stop it.
	const plain = createTakeLog( { clock: () => now, loudness: () => {
		throw new Error( "no mic" );
	} } );
	plain.tick( { active: true, index: 0, title: "One" } );
	now = 9000;
	plain.tick( { active: true, index: 0, advanced: true } );
	plain.tick( { active: false, index: 0 } );
	assert.equal( plain.data().takes[0].loudness, null );
	console.log( "loudness per take passes" );
}

// {soundcheck} results go in soundChecks, and one before any take starts the log.
{
	let now = Date.parse( "2026-10-29T10:00:00Z" );
	const log = createTakeLog( { clock: () => now } );
	log.soundCheck( { kind: "room", noise: -58.2, verdict: "quiet" }, -1 );
	now += 8000;
	log.soundCheck( { kind: "voice", lufs: -40, peak: -20, verdict: "too-quiet", advice: "Turn the mic gain up about 16 dB, or move closer." }, 0 );
	const data = log.data();
	assert.equal( data.startedAt, "2026-10-29T10:00:00.000Z" );
	assert.deepEqual( data.soundChecks.map( c => [ c.t, c.kind, c.section, c.verdict ] ), [ [ 0, "room", null, "quiet" ], [ 8, "voice", 1, "too-quiet" ] ] );
	assert.equal( data.soundChecks[1].lufs, -40 );
	// Saved logs from before keep working.
	log.load( { startedAt: data.startedAt, takes: [], events: [] } );
	assert.deepEqual( log.data().soundChecks, [] );
	console.log( "sound checks pass" );
}
