// Scratch audio for syncing (Settings > Scrolling): a plain recording of the
// microphone while the prompter runs, kept beside the take log, so an edit
// can line the master recording (Riverside, OBS, a camera) up with the take
// log by matching the two soundtracks. It's a sync reference, not a
// recording to use: WAV, 16 kHz, 16-bit, mono, written to disk as it goes
// (main.js), so a long run never fills memory and a crash loses little.
//
// A contract with the Academy's production pipeline, which lines the master
// recording up by this audio: keep the format (WAV, 16 kHz, mono, unprocessed)
// and the take log's `audio` fields (file, startedAt, endedAt, start, end;
// session time = file time + start), or tell them first. Add fields only.

const RATE = 16000;
const BLOCK_MS = 100; // mic-worklet.js sends 100 ms blocks

// start( deviceId ) opens the microphone and starts writing; stop( keep )
// ends it and resolves to { file, startedAt, endedAt } (wall-clock ms), or
// null (nothing recorded, or keep false: the file is deleted).
export function createScratchRecorder() {
	let stream = null;
	let ctx = null;
	let startedAt = null;
	let samples = 0;

	async function openMic( deviceId ) {
		// No processing: the soundtrack should match what other microphones heard.
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

	return {
		get recording() {
			return !!ctx;
		},
		async start( deviceId ) {
			if ( ctx ) return;
			stream = await openMic( deviceId );
			await window.electron.scratchAudioStart( { sampleRate: RATE } );
			ctx = new AudioContext( { sampleRate: RATE } );
			await ctx.audioWorklet.addModule( new URL( "./mic-worklet.js", import.meta.url ) );
			const source = ctx.createMediaStreamSource( stream );
			const blocks = new AudioWorkletNode( ctx, "mic-blocks" );
			const silent = ctx.createGain();
			silent.gain.value = 0;
			startedAt = null;
			samples = 0;
			blocks.port.onmessage = ( event ) => {
				const block = event.data;
				// The first block began a block's length before it arrived.
				startedAt ??= Date.now() - BLOCK_MS;
				const pcm = new Int16Array( block.length );
				for ( let i = 0; i < block.length; i++ ) {
					const v = Math.max( -1, Math.min( 1, block[i] ) );
					pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
				}
				samples += pcm.length;
				window.electron.scratchAudioData( pcm.buffer );
			};
			source.connect( blocks ).connect( silent ).connect( ctx.destination );
		},
		async stop( keep = true ) {
			if ( !ctx ) return null;
			const closing = ctx;
			ctx = null;
			await closing.close();
			for ( const track of stream.getTracks() ) track.stop();
			stream = null;
			const result = await window.electron.scratchAudioStop( { keep: keep && samples > 0 } );
			if ( !result?.file || startedAt === null ) return null;
			// The end follows from the samples written, so it matches the file exactly.
			return { file: result.file, startedAt, endedAt: startedAt + ( result.samples / RATE ) * 1000 };
		}
	};
}
