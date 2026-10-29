// node scripts/level-meter.test.mjs
import assert from "node:assert/strict";
import { integratedLoudness, kWeighting, levelWarning, lufs, measure, noiseFloor, soundCheckVerdict } from "../src/client/level-meter.js";

const near = ( actual, expected, tolerance, what ) =>
	assert.ok( Math.abs( actual - expected ) <= tolerance, `${ what }: ${ actual } (expected ${ expected })` );

// The K-weighting coefficients at 48 kHz match the ones in BS.1770.
const k48 = kWeighting( 48000 );
near( k48.shelf.b0, 1.53512485958697, 1e-9, "shelf b0" );
near( k48.shelf.b1, -2.69169618940638, 1e-9, "shelf b1" );
near( k48.shelf.b2, 1.19839281085285, 1e-9, "shelf b2" );
near( k48.shelf.a1, -1.69065929318241, 1e-9, "shelf a1" );
near( k48.shelf.a2, 0.73248077421585, 1e-9, "shelf a2" );
near( k48.highpass.a1, -1.99004745483398, 1e-9, "high pass a1" );
near( k48.highpass.a2, 0.99007225036621, 1e-9, "high pass a2" );

// The same blocks the worklet makes (level-worklet.js), from samples.
function blocksOf( samples, fs ) {
	const { shelf: s1, highpass: s2 } = kWeighting( fs );
	const z1 = [ 0, 0 ], z2 = [ 0, 0 ];
	const size = Math.round( fs * 0.1 );
	const out = [];
	let n = 0, peak = 0, sq = 0, k = 0;
	for ( const x of samples ) {
		peak = Math.max( peak, Math.abs( x ) );
		sq += x * x;
		const y1 = s1.b0 * x + z1[0];
		z1[0] = s1.b1 * x - s1.a1 * y1 + z1[1];
		z1[1] = s1.b2 * x - s1.a2 * y1;
		const y2 = s2.b0 * y1 + z2[0];
		z2[0] = s2.b1 * y1 - s2.a1 * y2 + z2[1];
		z2[1] = s2.b2 * y1 - s2.a2 * y2;
		k += y2 * y2;
		if ( ++n === size ) {
			out.push( { peak, ms: sq / n, k: k / n } );
			n = peak = sq = k = 0;
		}
	}
	return out;
}
const sine = ( fs, hz, amplitude, seconds ) =>
	Float64Array.from( { length: fs * seconds }, ( _, i ) => amplitude * Math.sin( ( 2 * Math.PI * hz * i ) / fs ) );

// BS.1770's check: a 997 Hz sine at 0 dBFS in one channel reads -3.01 LUFS,
// at 48 kHz and at 44.1 kHz.
for ( const fs of [ 48000, 44100 ] ) {
	const blocks = blocksOf( sine( fs, 997, 1, 5 ), fs ).slice( 2 ); // past the filter settling
	near( integratedLoudness( blocks.map( b => b.k ) ), -3.01, 0.05, `997 Hz at ${ fs }` );
	near( lufs( blocks.at( -1 ).k ), -3.01, 0.05, `one block at ${ fs }` );
}

// 20 dB quieter reads 20 LU lower.
const quiet = blocksOf( sine( 48000, 997, 0.1, 5 ), 48000 ).slice( 2 );
near( integratedLoudness( quiet.map( b => b.k ) ), -23.01, 0.05, "-20 dBFS sine" );

// Gating: silence doesn't drag the loudness down.
const withSilence = [ ...quiet.map( b => b.k ), ...Array( 50 ).fill( 1e-12 ) ];
// (The few windows where the tone fades into silence pull it down a little.)
near( integratedLoudness( withSilence ), -23.01, 0.2, "gated silence" );
assert.equal( integratedLoudness( Array( 20 ).fill( 1e-12 ) ), null );

// Background noise: the quiet between words sets it, not the words.
const speechAndGaps = [ ...Array( 70 ).fill( 0.01 ), ...Array( 30 ).fill( 1e-6 ) ];
near( noiseFloor( speechAndGaps ), -60, 0.01, "noise floor" );
assert.equal( noiseFloor( [ 0.01 ] ), null );

// A take: a voice-like tone with a quiet room under it.
const take = measure( [
	...blocksOf( sine( 48000, 997, 0.1, 4 ), 48000 ).slice( 2 ),
	...blocksOf( sine( 48000, 200, 0.001, 1 ), 48000 )
] );
near( take.lufs, -23, 0.3, "take loudness" );
near( take.peak, -20, 0.1, "take peak" );
assert.ok( take.noise < -55, `take noise ${ take.noise }` );
assert.ok( take.aboveNoise > 30, `above noise ${ take.aboveNoise }` );
assert.equal( take.warning, null );
assert.equal( measure( [] ), null );

// Warnings, in order of how much they matter.
assert.equal( levelWarning( { lufs: -20, peak: -0.5, noise: -40 } ), "clipping" );
assert.equal( levelWarning( { lufs: -40, peak: -20, noise: -40 } ), "quiet" );
assert.equal( levelWarning( { lufs: -20, peak: -6, noise: -40 } ), "noisy" );
assert.equal( levelWarning( { lufs: -20, peak: -6, noise: -60 } ), null );
assert.equal( levelWarning( { lufs: null, peak: null, noise: null } ), null );

// {soundcheck}: what each check found, and how far to turn the gain.
assert.equal( soundCheckVerdict( "room", { noise: -62 } ).verdict, "quiet" );
assert.equal( soundCheckVerdict( "room", { noise: -50 } ).verdict, "ok" );
assert.equal( soundCheckVerdict( "room", { noise: -40 } ).verdict, "noisy" );
assert.equal( soundCheckVerdict( "room", null ).verdict, "unknown" );
assert.equal( soundCheckVerdict( "voice", { lufs: -24, peak: -8 } ).verdict, "good" );
assert.match( soundCheckVerdict( "voice", { lufs: -40, peak: -20 } ).advice, /up about 16 dB/ );
assert.equal( soundCheckVerdict( "voice", { lufs: -40, peak: -20 } ).verdict, "too-quiet" );
assert.match( soundCheckVerdict( "voice", { lufs: -18, peak: -0.2 } ).advice, /down about 6 dB/ );
assert.equal( soundCheckVerdict( "voice", { lufs: -12, peak: -3 } ).verdict, "loud" );
assert.equal( soundCheckVerdict( "voice", { lufs: null, peak: null } ).verdict, "silent" );
console.log( "level meter tests pass" );
