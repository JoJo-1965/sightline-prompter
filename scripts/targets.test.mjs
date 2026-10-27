import { setSectionTargets, formatTarget } from "../src/utils/targets.js";
import assert from "node:assert/strict";

assert.equal( formatTarget( 83 ), "1:25" );
assert.equal( formatTarget( 1 ), "0:05" );
assert.equal( formatTarget( 600 ), "10:00" );

const md = [
	"---",
	"## not a heading (front matter)",
	"---",
	"# Title",
	"{pacing: section}",
	"## One",
	"text",
	"## Two {target: 1:20}",
	"```",
	"## code, not a heading",
	"```",
	"## Three",
	"",
	"{wpm: 140, target: 2:00}",
	"### Sub",
	"## Four {wpm: 150}",
	"## Five"
].join( "\n" );
const r = setSectionTargets( md, { 0: 61, 1: 92, 2: 150, 3: 44 } );
const out = r.text.split( "\n" );
assert.equal( r.changed, 4 );
assert.equal( out[1], "## not a heading (front matter)" );
assert.equal( out[5], "## One {target: 1:00}" );
assert.equal( out[7], "## Two {target: 1:30}" );
assert.equal( out[9], "## code, not a heading" );
assert.equal( out[11], "## Three" );
assert.equal( out[13], "{wpm: 140, target: 2:30}" );
assert.equal( out[15], "## Four {wpm: 150} {target: 0:45}" );
assert.equal( out[16], "## Five" );

const txt = "=== SECTION 1 · OPEN ===\r\nHello\r\n=== SECTION 2\r\nBye";
const t = setSectionTargets( txt, { 0: 30, 1: 40 } );
assert.equal( t.text, "=== SECTION 1 · OPEN {target: 0:30} ===\r\nHello\r\n=== SECTION 2 {target: 0:40}\r\nBye" );
console.log( "targets tests pass" );
