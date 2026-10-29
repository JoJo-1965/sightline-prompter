// The sound-check meter and loudness per take (roadmap 41 and 42).
// Measures the microphone as other apps hear it (no echo cancellation, noise
// suppression or gain control) in 100 ms blocks (level-worklet.js), and works
// out from them:
// - the level (dBFS) and the sample peak, for the meter;
// - loudness in LUFS (ITU-R BS.1770 / EBU R 128): momentary (0.4 s),
//   short-term (3 s), and integrated over a take (gated);
// - the room's background noise: the quiet between words, as the 10th
//   percentile of the blocks' levels.
// Sightline doesn't record, so these describe the mic as Sightline hears it,
// before OBS or Riverside process it: a good guide, not the final figure.

const BLOCK_SECONDS = 0.1;
const KEEP_BLOCKS = 4 * 60 * 60 * 10; // four hours of blocks

// Levels stop at -120 dB: below that is digital silence, not a reading.
const db = x => ( x > 0 ? Math.max( -120, 10 * Math.log10( x ) ) : -120 );
const round1 = n => ( Number.isFinite( n ) ? Math.round( n * 10 ) / 10 : null );

// The K-weighting filter (BS.1770) for any sample rate: a high shelf, then a
// high pass. Coefficients as in libebur128.
export function kWeighting( fs ) {
	let K = Math.tan( Math.PI * 1681.974450955533 / fs );
	const Q1 = 0.7071752369554196;
	const Vh = 10 ** ( 3.999843853973347 / 20 );
	const Vb = Vh ** 0.4996667741545416;
	let a0 = 1 + K / Q1 + K * K;
	const shelf = {
		b0: ( Vh + Vb * K / Q1 + K * K ) / a0,
		b1: 2 * ( K * K - Vh ) / a0,
		b2: ( Vh - Vb * K / Q1 + K * K ) / a0,
		a1: 2 * ( K * K - 1 ) / a0,
		a2: ( 1 - K / Q1 + K * K ) / a0
	};
	K = Math.tan( Math.PI * 38.13547087602444 / fs );
	const Q2 = 0.5003270373238773;
	a0 = 1 + K / Q2 + K * K;
	const highpass = {
		b0: 1,
		b1: -2,
		b2: 1,
		a1: 2 * ( K * K - 1 ) / a0,
		a2: ( 1 - K / Q2 + K * K ) / a0
	};
	return { shelf, highpass };
}

// Loudness of a K-weighted mean square (one channel).
export const lufs = k => -0.691 + db( k );

// Integrated loudness from 100 ms K-weighted mean squares: 400 ms windows
// every 100 ms, gated at -70 LUFS, then 10 LU below the mean of what's left.
export function integratedLoudness( k ) {
	const windows = [];
	for ( let i = 3; i < k.length; i++ ) windows.push( ( k[i] + k[i - 1] + k[i - 2] + k[i - 3] ) / 4 );
	const loud = windows.filter( w => lufs( w ) > -70 );
	if ( !loud.length ) return null;
	const mean = list => list.reduce( ( s, w ) => s + w, 0 ) / list.length;
	const gate = lufs( mean( loud ) ) - 10;
	const kept = loud.filter( w => lufs( w ) > gate );
	return kept.length ? lufs( mean( kept ) ) : null;
}

// The room's background noise: the 10th percentile of the blocks' levels
// (dBFS), so the gaps between words, not the words, set it.
export function noiseFloor( ms ) {
	if ( ms.length < 10 ) return null;
	const levels = ms.map( db ).sort( ( a, b ) => a - b );
	return levels[Math.floor( levels.length * 0.1 )];
}

// Whether a take's level is worth a second look. Peaks within 1 dB of full
// scale have probably clipped; speech below -36 LUFS is very quiet for a mic
// before processing; background noise above -45 dBFS will be heard under it.
export function levelWarning( { lufs: loudness, peak, noise } ) {
	if ( peak !== null && peak >= -1 ) return "clipping";
	if ( loudness !== null && loudness < -36 ) return "quiet";
	if ( noise !== null && noise > -45 ) return "noisy";
	return null;
}

// A summary of 100 ms blocks ({ k, ms, peak }) for a take or a stretch of time.
export function measure( blocks ) {
	if ( blocks.length < 4 ) return null;
	const loudness = integratedLoudness( blocks.map( b => b.k ) );
	const peak = db( Math.max( ...blocks.map( b => b.peak ) ) ** 2 );
	const noise = noiseFloor( blocks.map( b => b.ms ) );
	const result = { lufs: round1( loudness ), peak: round1( peak ), noise: round1( noise ) };
	// How far the voice sits above the room.
	result.aboveNoise = result.lufs !== null && result.noise !== null ? round1( result.lufs - result.noise ) : null;
	result.warning = levelWarning( result );
	return result;
}

// onLevel( { level, peak, momentary, shortTerm, room } ), ten times a second:
// level and peak in dBFS, loudness in LUFS, room (background noise over the
// last ten seconds) in dBFS; null where there isn't enough yet.
export function createLevelMeter( { onLevel } = {} ) {
	let ctx = null;
	let stream = null;
	let starting = null;
	const blocks = []; // { t (ms, the block's end), k, ms, peak }

	async function openMic( deviceId ) {
		const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 };
		if ( deviceId ) {
			try {
				return await navigator.mediaDevices.getUserMedia( { audio: { ...audio, deviceId: { exact: deviceId } } } );
			} catch {
				// the saved microphone has gone: use the default one
			}
		}
		return navigator.mediaDevices.getUserMedia( { audio } );
	}

	function received( block ) {
		blocks.push( { t: Date.now(), ...block } );
		if ( blocks.length > KEEP_BLOCKS ) blocks.splice( 0, blocks.length - KEEP_BLOCKS );
		if ( !onLevel ) return;
		const last = n => blocks.slice( -n );
		const meanK = list => list.reduce( ( s, b ) => s + b.k, 0 ) / list.length;
		onLevel( {
			level: round1( db( block.ms ) ),
			peak: round1( db( block.peak ** 2 ) ),
			momentary: blocks.length >= 4 ? round1( lufs( meanK( last( 4 ) ) ) ) : null,
			shortTerm: blocks.length >= 30 ? round1( lufs( meanK( last( 30 ) ) ) ) : null,
			room: round1( noiseFloor( last( 100 ).map( b => b.ms ) ) )
		} );
	}

	async function start( deviceId ) {
		const s = await openMic( deviceId );
		const c = new AudioContext();
		await c.audioWorklet.addModule( new URL( "./level-worklet.js", import.meta.url ) );
		const node = new AudioWorkletNode( c, "level-blocks", {
			processorOptions: { ...kWeighting( c.sampleRate ), blockSize: Math.round( c.sampleRate * BLOCK_SECONDS ) }
		} );
		node.port.onmessage = event => received( event.data );
		const silent = c.createGain();
		silent.gain.value = 0;
		c.createMediaStreamSource( s ).connect( node ).connect( silent ).connect( c.destination );
		stream = s;
		ctx = c;
	}

	return {
		get running() {
			return !!ctx || !!starting;
		},
		// Starting twice, or stopping while it starts, is safe.
		async start( deviceId ) {
			if ( ctx || starting ) return starting;
			starting = start( deviceId ).finally( () => {
				starting = null;
			} );
			return starting;
		},
		async stop() {
			await starting?.catch( () => {} );
			if ( !ctx ) return;
			const c = ctx;
			ctx = null;
			stream?.getTracks().forEach( t => t.stop() );
			stream = null;
			await c.close().catch( () => {} );
		},
		// The loudness, peak and background noise between two times (ms), or
		// null when the meter wasn't running for long enough of it.
		measure( from, to ) {
			return measure( blocks.filter( b => b.t > from && b.t <= to + 50 ) );
		}
	};
}

// What a {soundcheck} in the script found ({ lufs, peak, noise } from
// measure()), in words: { verdict, text, advice }. Sightline can't set the
// mic's gain (the recording isn't its own), so the advice says how far to turn
// it. Verdicts: room quiet | ok | noisy; voice good | too-quiet | loud |
// clipping | silent; unknown when nothing was measured.
export function soundCheckVerdict( kind, m ) {
	if ( kind === "room" ) {
		const noise = m?.noise ?? null;
		if ( noise === null ) return { verdict: "unknown", text: "Couldn't measure the room", advice: "Is a microphone connected?" };
		if ( noise < -55 ) return { verdict: "quiet", text: `Quiet room ✓ (background ${ Math.round( noise ) } dB)`, advice: "" };
		if ( noise <= -45 ) return { verdict: "ok", text: `OK: a little background noise (${ Math.round( noise ) } dB)`, advice: "Fine for most recordings; quieter is better if you can." };
		return { verdict: "noisy", text: `Noisy ✗ (background ${ Math.round( noise ) } dB)`, advice: "A fan, traffic or hum? Check again once it's quieter." };
	}
	const lufs = m?.lufs ?? null;
	const peak = m?.peak ?? null;
	if ( lufs === null || lufs < -50 ) return { verdict: "silent", text: "Didn't hear you", advice: "Is the right microphone chosen (Voice panel), and is it unmuted?" };
	if ( peak !== null && peak >= -1 ) return { verdict: "clipping", text: `Clipping ✗ (peak ${ peak } dBFS)`, advice: `Turn the mic gain down about ${ Math.max( 3, Math.ceil( peak + 6 ) ) } dB.` };
	if ( lufs < -36 ) return { verdict: "too-quiet", text: `Too quiet (${ Math.round( lufs ) } LUFS)`, advice: `Turn the mic gain up about ${ Math.round( -24 - lufs ) } dB, or move closer.` };
	if ( lufs > -14 ) return { verdict: "loud", text: `Loud (${ Math.round( lufs ) } LUFS)`, advice: `Turn the mic gain down about ${ Math.round( lufs + 20 ) } dB.` };
	return { verdict: "good", text: `Good level ✓ (${ Math.round( lufs ) } LUFS, peak ${ Math.round( peak ) } dBFS)`, advice: "" };
}
