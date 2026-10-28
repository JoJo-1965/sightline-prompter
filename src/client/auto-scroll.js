// Voice auto-scroll: capture the mic, turn speech into words (on this computer,
// or online with Deepgram), align the words against the rendered script, and
// smooth-scroll to the speaker's position. "Prompter, …" commands are picked
// out of the words first (voice-commands.js).

import {
	buildWordIndex,
	findWordAtViewport,
	scrollToWord,
	cancelScroll,
	setScrollSpeed,
	getScrollSpeed,
	SCROLL_SPEED_MIN,
	SCROLL_SPEED_MAX,
	SCROLL_SPEED_DEFAULT,
	SCROLL_SPEED_STEP
} from "./word-index.js";
import { createAligner } from "./aligner.js";
import { createCommandListener } from "./voice-commands.js";

const DEEPGRAM_QUERY = new URLSearchParams( {
	model: "nova-3",
	smart_format: "true",
	interim_results: "false",
	endpointing: "200",
	punctuate: "true",
	language: "en"
} ).toString();
const DEEPGRAM_URL = `wss://api.deepgram.com/v1/listen?${ DEEPGRAM_QUERY }`;

let activeCtx = null;

// On-device recognition (speech.js in the main process). The listeners are set
// once; each session points them at its own handlers.
let localWords = null;
let localState = null;
window.electron?.onSpeechWords?.( heard => localWords?.( heard ) );
window.electron?.onSpeechState?.( state => localState?.( state ) );

export function isActive() {
	return activeCtx !== null;
}

async function openLocal( stream, onWords, onStatus ) {
	let started = false;
	const ready = new Promise( ( resolve, reject ) => {
		const timeout = setTimeout(
			() => reject( new Error( "The speech engine didn't start." ) ),
			20000
		);
		localState = ( state ) => {
			if ( state.type === "ready" ) {
				clearTimeout( timeout );
				started = true;
				resolve();
			} else if ( state.type === "error" ) {
				clearTimeout( timeout );
				if ( started ) onStatus?.( { type: "error", error: state.message } );
				else reject( new Error( state.message ) );
			}
		};
	} );
	window.electron.speechStart();
	await ready;

	// The recogniser wants 16 kHz audio; the audio context resamples the mic.
	const audioCtx = new AudioContext( { sampleRate: 16000 } );
	await audioCtx.audioWorklet.addModule(
		new URL( "./mic-worklet.js", import.meta.url )
	);
	const source = audioCtx.createMediaStreamSource( stream );
	const blocks = new AudioWorkletNode( audioCtx, "mic-blocks" );
	const silent = audioCtx.createGain();
	silent.gain.value = 0;
	blocks.port.onmessage = event =>
		window.electron.sendSpeechAudio( event.data );
	source.connect( blocks ).connect( silent ).connect( audioCtx.destination );
	localWords = ( { words, final, at } ) => onWords( words, null, final, at );

	return {
		close() {
			localWords = null;
			localState = null;
			window.electron.speechStop();
			blocks.port.onmessage = null;
			source.disconnect();
			audioCtx.close().catch( () => {} );
		}
	};
}

async function openDeepgram( deepgramKey, stream, onWords, onStatus ) {
	const dgSocket = new WebSocket( DEEPGRAM_URL, [ "token", deepgramKey ] );

	await new Promise( ( resolve, reject ) => {
		const timeout = setTimeout(
			() => reject( new Error( "Deepgram open timeout" ) ),
			5000
		);
		dgSocket.addEventListener(
			"open",
			() => {
				clearTimeout( timeout );
				resolve();
			},
			{ once: true }
		);
		dgSocket.addEventListener(
			"error",
			( evt ) => {
				clearTimeout( timeout );
				reject(
					new Error( "Deepgram websocket error: " + ( evt?.message || "unknown" ) )
				);
			},
			{ once: true }
		);
	} );

	dgSocket.addEventListener( "message", ( event ) => {
		let data;
		try {
			data = JSON.parse( event.data );
		} catch ( err ) {
			console.warn( "[deepgram] invalid JSON", err );
			return;
		}
		if ( data.type !== "Results" || !data.is_final ) return;
		const alt = data.channel?.alternatives?.[0];
		const words = alt?.words?.map( w => w.word ) ?? [];
		if ( !words.length && !data.speech_final ) return;
		onWords( words, alt?.transcript, !!data.speech_final );
	} );

	dgSocket.addEventListener( "error", ( err ) => {
		onStatus?.( { type: "error", error: err?.message || "websocket error" } );
	} );

	dgSocket.addEventListener( "close", () => {
		onStatus?.( { type: "closed" } );
	} );

	const mimeType = MediaRecorder.isTypeSupported( "audio/webm;codecs=opus" )
		? "audio/webm;codecs=opus"
		: "audio/webm";
	const recorder = new MediaRecorder( stream, { mimeType } );
	recorder.ondataavailable = async ( event ) => {
		if (
			event.data
			&& event.data.size > 0
			&& dgSocket.readyState === WebSocket.OPEN
		) {
			try {
				const buf = await event.data.arrayBuffer();
				dgSocket.send( buf );
			} catch ( err ) {
				console.warn( "[deepgram] send failed", err );
			}
		}
	};
	recorder.start( 250 );

	return {
		close() {
			try {
				if ( recorder.state !== "inactive" ) recorder.stop();
			} catch ( err ) {
				console.warn( "[auto-scroll] recorder.stop error", err );
			}
			try {
				if ( dgSocket.readyState === WebSocket.OPEN ) {
					dgSocket.send( JSON.stringify( { type: "CloseStream" } ) );
				}
				dgSocket.close();
			} catch ( err ) {
				console.warn( "[auto-scroll] deepgram close error", err );
			}
		}
	};
}

async function openMic( audioDeviceId, onStatus ) {
	const baseAudio = {
		echoCancellation: true,
		noiseSuppression: true
	};
	if ( audioDeviceId ) {
		try {
			return await navigator.mediaDevices.getUserMedia( {
				audio: { ...baseAudio, deviceId: { exact: audioDeviceId } }
			} );
		} catch ( err ) {
			// Saved device is gone (unplugged, USB hub removed, etc) — fall back
			// to the system default rather than failing the whole session.
			if ( err.name !== "OverconstrainedError" && err.name !== "NotFoundError" ) {
				throw err;
			}
			onStatus?.( { type: "device-fallback", requestedDeviceId: audioDeviceId } );
		}
	}
	return navigator.mediaDevices.getUserMedia( { audio: baseAudio } );
}

// engine: "local" (on this computer) or "deepgram" (online, needs deepgramKey).
// followScript: false listens for "Prompter, …" commands only (while steady
// scrolling). onCommand( id ) gets each command; null turns commands off.
export async function startAutoScroll( {
	engine = "deepgram",
	deepgramKey,
	scriptEl,
	onStatus,
	onScroll,
	onFollow = null, // ({ from, to, start, end, ranges }): script words passed, and when they were said
	onCommand = null,
	onWake = () => {}, // the wake word was heard
	onMiss = () => {}, // ( words ): what followed it wasn't a command
	isPaused = null, // also counts as paused for a bare "go" (a {stop} in steady scrolling)
	followScript = true,
	audioDeviceId
} ) {
	if ( activeCtx ) {
		throw new Error( "Auto-scroll already active." );
	}
	if ( !scriptEl ) {
		throw new Error( "scriptEl is required." );
	}
	if ( engine === "deepgram" && !deepgramKey ) {
		throw new Error( "Deepgram API key is required." );
	}

	const wordIndex = buildWordIndex( scriptEl );
	const aligner = createAligner( wordIndex.words );
	aligner.setPosition( findWordAtViewport( wordIndex.ranges ) );
	const takeCommands = onCommand ? createCommandListener( { onCommand, onWake, onMiss, isPaused: () => held || !!isPaused?.() } ) : null;
	let held = false; // "Prompter, pause": keep listening, stop following

	const stream = await openMic( audioDeviceId, onStatus );

	const onWords = ( heard, transcript, final, at = null ) => {
		const heardAt = Date.now();
		const words = takeCommands ? takeCommands( heard, final ) : heard;
		if ( !followScript || held || !words.length ) return;
		const prevPos = aligner.currentPosition();
		for ( const w of words ) {
			aligner.addRecognized( w );
		}
		const newPos = aligner.step();
		const moved = newPos !== prevPos;
		if ( moved ) {
			onScroll?.( newPos, wordIndex.ranges );
			// Moving on: the script words just passed were said between the first
			// and last heard words. A long jump (a resync) only counts the last few.
			if ( newPos > prevPos ) {
				onFollow?.( {
					from: Math.max( prevPos, newPos - words.length - 2 ),
					to: newPos,
					start: at?.[0] ?? heardAt,
					end: at?.at( -1 ) ?? heardAt,
					ranges: wordIndex.ranges
				} );
			}
		}
		onStatus?.( {
			type: "transcript",
			wordIdx: newPos,
			transcript: transcript ?? words.join( " " ),
			moved
		} );
	};

	let source;
	try {
		source
			= engine === "local"
				? await openLocal( stream, onWords, onStatus )
				: await openDeepgram( deepgramKey, stream, onWords, onStatus );
	} catch ( err ) {
		stream.getTracks().forEach( t => t.stop() );
		throw err;
	}

	activeCtx = { stream, source, wordIndex };
	onStatus?.( { type: "started", wordCount: wordIndex.words.length } );

	const syncToViewport = () => {
		aligner.setPosition( findWordAtViewport( wordIndex.ranges ) );
		aligner.clearRecent();
	};
	return {
		getPosition: () => aligner.currentPosition(),
		// Re-anchor to the visible text after the user scrolls by hand.
		syncToViewport,
		// "Prompter, pause" / "Prompter, go": stop and start following without
		// letting go of the mic, so the next command is still heard.
		setHold( value ) {
			held = !!value;
			if ( !held ) syncToViewport();
		},
		isHeld: () => held,
		// "Prompter, resync": find the reader anywhere in the script from what
		// they say next.
		resync: () => aligner.relocate(),
		wordIndex
	};
}

export async function stopAutoScroll() {
	if ( !activeCtx ) return;
	const { stream, source } = activeCtx;
	activeCtx = null;
	cancelScroll();
	try {
		source.close();
	} catch ( err ) {
		console.warn( "[auto-scroll] close error", err );
	}
	try {
		stream.getTracks().forEach( t => t.stop() );
	} catch ( err ) {
		console.warn( "[auto-scroll] stream stop error", err );
	}
}

export {
	scrollToWord,
	cancelScroll,
	setScrollSpeed,
	getScrollSpeed,
	SCROLL_SPEED_MIN,
	SCROLL_SPEED_MAX,
	SCROLL_SPEED_DEFAULT,
	SCROLL_SPEED_STEP
};
