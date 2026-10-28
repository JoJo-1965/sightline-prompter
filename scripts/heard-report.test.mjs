// node scripts/heard-report.test.mjs
import assert from "node:assert/strict";
import { heardReport } from "./heard-report.mjs";

const line = ( heard, script ) => JSON.stringify( { heard, script, final: true } );
const report = heardReport( [
	line( "PROMPTER PAWS", "the prompter pauses here" ),
	line( "HAVE YOU EVER WALKED", "Have you ever walked out" ),
	line( "SET THE CULTURE", "and setting the culture of" ),
	line( "UM SO HAVE", "So have you" ),
	"not json"
] );
assert.equal( report.chunks, 4 );
assert.ok( report.misheard.some( m => m.pair === "set → setting" ) );
assert.ok( report.misheard.some( m => m.pair === "paws → pauses" ) );
assert.ok( report.notInScript.some( n => n.word === "um" ) );
assert.ok( report.matched >= 8 );
console.log( "heard report passes" );
