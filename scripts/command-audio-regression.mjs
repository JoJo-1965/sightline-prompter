// Read-only replay of production command clips through the exact live worker.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createCommandListener } from "../src/client/voice-commands.js";
const require = createRequire( import.meta.url );
const model = process.env.SIGHTLINE_SPEECH_MODEL, file = process.env.SIGHTLINE_COMMAND_AUDIO;
if ( !model || !file ) throw Error( "Set SIGHTLINE_SPEECH_MODEL and SIGHTLINE_COMMAND_AUDIO to local test inputs" );
const { samples, sampleRate } = require( "sherpa-onnx-node" ).readWave( file );
if ( sampleRate !== 16000 ) throw Error( "Use the 16 kHz scratch WAV" );
let receive, listener, clock = 0, current = null;
process.parentPort = { on: ( name, callback ) => { receive = callback; }, postMessage: message => {
	if ( message.type === "error" ) throw Error( message.error );
	if ( message.type === "words" ) { current.chunks.push( { at: clock / 1000, words: message.words, final: message.final } ); listener( message.words, message.final ); }
} };
await import( "../src/speech-worker.js" );
const report = [];
for ( const clip of [ { name: "section-seven", start: 246, end: 259 }, { name: "section-twelve", start: 337, end: 369 }, { name: "finish-tail", start: 387, end: 419.7 } ] ) {
	current = { ...clip, chunks: [], commands: [], misses: [] };
	listener = createCommandListener( { clock: () => clock, isPaused: () => true, onCommand: ( action, value ) => current.commands.push( { at: clock / 1000, action, value: value ?? null } ), onMiss: words => current.misses.push( { at: clock / 1000, words } ) } );
	receive( { data: { type: "start", dir: model, session: clip.name } } );
	const audio = samples.subarray( Math.floor( clip.start * 16000 ), Math.floor( clip.end * 16000 ) );
	for ( let i = 0; i < audio.length + 32000; i += 1600 ) {
		clock = ( clip.start + i / 16000 ) * 1000;
		const block = i < audio.length ? audio.slice( i, i + 1600 ) : new Float32Array( 1600 );
		receive( { data: { type: "audio", samples: block.buffer } } );
	}
	receive( { data: { type: "stop" } } ); report.push( current );
}
if ( process.env.SIGHTLINE_COMMAND_REPORT ) fs.writeFileSync( process.env.SIGHTLINE_COMMAND_REPORT, JSON.stringify( report, null, 2 ) );
console.log( JSON.stringify( report.map( r => ( { clip: r.name, commands: r.commands, unmatched: r.misses.length } ) ), null, 2 ) );
assert.deepEqual( report[0].commands.map( c => [ c.action, c.value ] ), [ [ "section", 7 ], [ "section", 7 ] ] );
assert.deepEqual( report[1].commands.map( c => [ c.action, c.value ] ), Array.from( { length: 5 }, () => [ "section", 12 ] ) );
assert.deepEqual( report[2].commands.map( c => c.action ), [ "pause", "obs-finish", "obs-finish", "obs-finish" ] );
console.log( "PASS: both section-seven attempts, five section-twelve attempts and all four tail commands through the exact live worker" );
