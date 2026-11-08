import assert from "node:assert/strict";
import { readDirectives, pausesForMode } from "../src/client/directives.js";

// Exercise the parser and mode selection together, with the same span contract
// decorateScript supplies. These are control directives, never spoken words.
const tags = [
	"{pause}", "{pause: 3s}", "{stop}", "{listen: off}",
	"{soundcheck: room}", "{pause: 2s, soundcheck: voice}",
	"{pause, listen: off}", "{PAUSE: 30s}"
].map( textContent => ( {
	tagName: "SPAN", textContent, dataset: {},
	classList: { contains: () => false }, closest: () => null
} ) );
const { pauses } = readDirectives( { querySelectorAll: () => tags } );
const steady = pausesForMode( pauses, "steady" );
assert.equal( steady.length, 10, "Scroll keeps bare/timed pauses and explicit holds" );
assert.deepEqual( steady.filter( pause => pause.scrollOnly ).map( pause => pause.seconds ), [ 0, 3, 2, 0, 30 ] );
assert.equal( tags[1].dataset.beat, "3s", "Timed pauses retain the visible beat mark" );
for ( const mode of [ "voice", "notes" ] ) {
	const active = pausesForMode( pauses, mode );
	assert.equal( active.length, 5, `${ mode } excludes every bare/timed pause` );
	assert.deepEqual( active.map( pause => pause.soundcheck ?? pause.listen ?? "stop" ), [ "stop", "off", "room", "voice", "off" ], "Compound directives retain their independent checks/holds" );
	assert.ok( active.every( pause => !pause.scrollOnly ) );
	assert.equal( active[0].el.textContent, "{stop}", "An explicit stop still needs deliberate continuation" );
}
assert.equal( pausesForMode( pauses, "steady" ).length, 10, "Changing modes does not discard saved pause directives" );
assert.deepEqual( pausesForMode( [], "voice" ), [] );
console.log( "Directive modes: scroll-only pauses, Voice/Notes exclusions, explicit holds and compound sound checks pass" );
