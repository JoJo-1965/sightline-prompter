// node scripts/take-log.test.mjs
import assert from "node:assert/strict";
import { createTakeLog, pickTakes, takeLogCsv } from "../src/client/take-log.js";

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

console.log( "take log tests pass" );
