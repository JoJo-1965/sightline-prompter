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
import { createWordFixer } from "./word-fixes.js";
import { createCommandListener } from "./voice-commands.js";
import { createSpeechRecovery } from "./speech-recovery.js";

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
let localSerial = 0;
window.electron?.onSpeechWords?.( heard => localWords?.( heard ) );
window.electron?.onSpeechState?.( state => localState?.( state ) );

export function isActive() {
	return activeCtx !== null;
}

async function openLocal( stream, onWords, onStatus, reset = false ) {
	const session = ++localSerial;
	let started = false;
	let audioAt = Date.now();
	let engineAt = Date.now();
	let audioCtx;
	let source;
	let blocks;
	let timeout;
	let closed = false;
	const close = () => {
		if ( closed ) return;
		closed = true;
		clearTimeout( timeout );
		localWords = null;
		localState = null;
		window.electron.speechStop();
		if ( blocks ) blocks.port.onmessage = null;
		source?.disconnect();
		audioCtx?.close().catch( () => {} );
	};
	try {
		const ready = new Promise( ( resolve, reject ) => {
			timeout = setTimeout(
				() => reject( new Error( "The speech engine didn't start." ) ),
				20000
			);
			localState = ( state ) => {
				if ( state.session != null && state.session !== session ) return;
				if ( state.type === "ready" ) {
					clearTimeout( timeout );
					started = true;
					engineAt = Date.now();
					resolve();
				} else if ( state.type === "health" ) {
					engineAt = Date.now();
				} else if ( state.type === "error" ) {
					clearTimeout( timeout );
					if ( started ) onStatus?.( { type: "error", error: state.message } );
					else reject( new Error( state.message ) );
				}
			};
		} );
		window.electron.speechStart( { session, reset } );
		await ready;

		// The recogniser wants 16 kHz audio; the audio context resamples the mic.
		audioCtx = new AudioContext( { sampleRate: 16000 } );
		await audioCtx.resume();
		await audioCtx.audioWorklet.addModule(
			new URL( "./mic-worklet.js", import.meta.url )
		);
		source = audioCtx.createMediaStreamSource( stream );
		blocks = new AudioWorkletNode( audioCtx, "mic-blocks" );
		const silent = audioCtx.createGain();
		silent.gain.value = 0;
		blocks.port.onmessage = ( event ) => {
			audioAt = Date.now();
			window.electron.sendSpeechAudio( event.data );
		};
		source.connect( blocks ).connect( silent ).connect( audioCtx.destination );
		localWords = ( heard ) => {
			if ( heard.session == null || heard.session === session ) onWords( heard.words, null, heard.final, heard.at );
		};

		return {
			close,
			health: () => ( { audioAt, engineAt, contextState: audioCtx.state } )
		};
	} catch ( err ) {
		close();
		throw err;
	}
}

async function openDeepgram( deepgramKey, stream, onWords, onStatus ) {
	const dgSocket = new WebSocket( DEEPGRAM_URL, [ "token", deepgramKey ] );
	let closing = false;
	let audioAt = Date.now();

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
	} ).catch( ( err ) => {
		closing = true;
		dgSocket.close();
		throw err;
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
		if ( !closing ) onStatus?.( { type: "error", error: err?.message || "websocket error" } );
	} );

	dgSocket.addEventListener( "close", () => {
		if ( !closing ) onStatus?.( { type: "closed" } );
	} );

	const mimeType = MediaRecorder.isTypeSupported( "audio/webm;codecs=opus" )
		? "audio/webm;codecs=opus"
		: "audio/webm";
	let recorder;
	try {
		recorder = new MediaRecorder( stream, { mimeType } );
	} catch ( err ) {
		closing = true;
		dgSocket.close();
		throw err;
	}
	recorder.ondataavailable = async ( event ) => {
		audioAt = Date.now();
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
	try {
		recorder.start( 250 );
	} catch ( err ) {
		closing = true;
		dgSocket.close();
		throw err;
	}
	const keepAlive = setInterval( () => {
		if ( dgSocket.readyState === WebSocket.OPEN ) dgSocket.send( JSON.stringify( { type: "KeepAlive" } ) );
	}, 3000 );

	return {
		health: () => ( { audioAt, engineAt: dgSocket.readyState === WebSocket.OPEN ? Date.now() : 0 } ),
		close() {
			closing = true;
			clearInterval( keepAlive );
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
	onHeard = null, // ({ heard, final, from, to, script }): every chunk heard, for the heard log
	onCommand = null,
	onWake = () => {}, // the wake word was heard
	onMiss = () => {}, // ( words ): what followed it wasn't a command
	wakeWord = "prompter", // Settings > Voice: prompter, computer, teleprompter or director
	isPaused = null, // also counts as paused for a bare "go" (a {stop} in steady scrolling)
	followScript = true,
	wordFixes = [], // Settings > Voice > Your words (word-fixes.js)
	soundAlike = true, // ...and words that sound like script words or commands (sound-alike.js)
	commandWords = [], // Settings > Voice > Your words > Command words
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
	// Your words: heard forms count as the script word too (word-fixes.js).
	const wordFixer = createWordFixer( wordFixes, wordIndex.words );
	const aligner = createAligner( wordIndex.words, { synonyms: wordFixer.synonyms, soundAlike } );
	aligner.setPosition( findWordAtViewport( wordIndex.ranges ) );
	let takeCommands;
	const setCommandOptions = ( options ) => {
		takeCommands = options.onCommand ? createCommandListener( { onWake, onMiss, isPaused: () => held || !!isPaused?.(), ...options } ) : null;
	};
	setCommandOptions( { onCommand, wakeWord, commandWords, soundAlike } );
	let held = false; // "Prompter, pause": keep listening, stop following

	let stream;
	const context = { stream: null, source: null, wordIndex, stopped: false, recovery: null, timer: null };
	activeCtx = context;
	try {
		stream = await openMic( audioDeviceId, onStatus );
		context.stream = stream;
		if ( context.stopped ) {
			stream.getTracks().forEach( t => t.stop() );
			throw new Error( "Listening was cancelled." );
		}
	} catch ( err ) {
		if ( activeCtx === context ) activeCtx = null;
		throw err;
	}
	let muted = false;

	const onWords = ( heard, transcript, final, at = null ) => {
		const heardAt = Date.now();
		const before = aligner.currentPosition();
		// What was heard, with the script words around where it landed, so
		// mishearings can be found later (the heard log).
		const logHeard = ( after ) => {
			if ( !onHeard || !heard.length ) return;
			const from = Math.max( 0, Math.min( before, after ) - 2 );
			const to = Math.min( wordIndex.ranges.length - 1, Math.max( before, after ) + 2 );
			onHeard( {
				heard: heard.join( " " ),
				final,
				from,
				to,
				script: wordIndex.ranges.slice( from, to + 1 ).map( r => r.toString().trim() ).join( " " )
			} );
		};
		const words = wordFixer.join( takeCommands ? takeCommands( heard, final ) : heard );
		if ( !followScript || held || !words.length ) {
			logHeard( before );
			return;
		}
		const prevPos = aligner.currentPosition();
		for ( const w of words ) {
			aligner.addRecognized( w );
		}
		const newPos = aligner.step();
		logHeard( newPos );
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
	let recovery;
	const sourceStatus = ( status ) => {
		if ( context.stopped ) return;
		if ( recovery && ( status.type === "error" || status.type === "closed" ) ) recovery.fail( status.error ?? "speech connection closed" );
		else onStatus?.( status );
	};
	const openSource = reset => engine === "local" ? openLocal( stream, onWords, sourceStatus, reset ) : openDeepgram( deepgramKey, stream, onWords, sourceStatus );
	try {
		source = await openSource( false );
		if ( context.stopped ) {
			source.close();
			throw new Error( "Listening was cancelled." );
		}
		context.source = source;
	} catch ( err ) {
		stream?.getTracks().forEach( t => t.stop() );
		if ( activeCtx === context ) activeCtx = null;
		throw err;
	}

	recovery = createSpeechRecovery( {
		wanted: () => !context.stopped && !muted,
		probe: () => ( { ...source.health(), trackLive: stream.getAudioTracks().every( t => t.readyState === "live" ) } ),
		notify: ( state ) => {
			onStatus?.( state );
			if ( state.type === "failed" ) {
				clearInterval( context.timer );
				context.timer = null;
				source.close();
				stream.getTracks().forEach( t => t.stop() );
			}
		},
		restart: async () => {
			source.close();
			stream.getTracks().forEach( t => t.stop() );
			stream = await openMic( audioDeviceId, sourceStatus );
			context.stream = stream;
			if ( context.stopped ) {
				stream.getTracks().forEach( t => t.stop() );
				return;
			}
			for ( const track of stream.getAudioTracks() ) track.enabled = !muted;
			source = await openSource( true );
			if ( context.stopped ) {
				source.close();
				stream.getTracks().forEach( t => t.stop() );
				return;
			}
			context.source = source;
			if ( !context.timer ) context.timer = setInterval( () => recovery.tick(), 1000 );
		}
	} );
	context.recovery = recovery;
	context.timer = setInterval( () => recovery.tick(), 1000 );
	onStatus?.( { type: "started", wordCount: wordIndex.words.length } );

	const syncToViewport = () => {
		aligner.setPosition( findWordAtViewport( wordIndex.ranges ) );
		aligner.clearRecent();
	};
	return {
		setCommandOptions,
		restartListening: () => recovery.retry(),
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
		// {listen: off}: no sound reaches the speech engine until it's unmuted.
		setMuted( value ) {
			muted = !!value;
			for ( const track of stream.getAudioTracks() ) track.enabled = !value;
		},
		// "Prompter, resync": find the reader anywhere in the script from what
		// they say next.
		resync: () => aligner.relocate(),
		wordIndex
	};
}

export async function stopAutoScroll() {
	if ( !activeCtx ) return;
	const { stream, source } = activeCtx;
	activeCtx.stopped = true;
	activeCtx.recovery?.stop();
	clearInterval( activeCtx.timer );
	activeCtx = null;
	cancelScroll();
	try {
		source?.close();
	} catch ( err ) {
		console.warn( "[auto-scroll] close error", err );
	}
	try {
		stream?.getTracks().forEach( t => t.stop() );
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
