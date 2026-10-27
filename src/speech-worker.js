// On-device speech recognition, run in its own process so the prompter never
// waits on it. Audio arrives as 16 kHz mono Float32 chunks; words go back as
// soon as the recogniser is sure of them, without waiting for a pause.
//
// Engine: sherpa-onnx with the streaming Zipformer English model. On a real
// 9-minute take it kept the prompter on the reader's line 96% of the time,
// against 75% for Moonshine, which only hands over words at pauses.

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire( import.meta.url );

// The last word of a phrase in progress can still change, so it is held back
// until the next word arrives or the phrase ends.
const HOLD_BACK = 1;

let recognizer = null;
let stream = null;
let committed = 0;

const send = message => process.parentPort.postMessage( message );

function words( text ) {
	return text.trim().split( /\s+/ ).filter( Boolean );
}

function load( dir ) {
	const sherpa = require( "sherpa-onnx-node" );
	const file = name => path.join( dir, name );
	recognizer = new sherpa.OnlineRecognizer( {
		featConfig: { sampleRate: 16000, featureDim: 80 },
		modelConfig: {
			transducer: {
				encoder: file( "encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx" ),
				decoder: file( "decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx" ),
				joiner: file( "joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx" )
			},
			tokens: file( "tokens.txt" ),
			numThreads: 2,
			provider: "cpu",
			debug: 0
		},
		decodingMethod: "greedy_search",
		enableEndpoint: 1,
		rule1MinTrailingSilence: 1.2,
		rule2MinTrailingSilence: 0.4,
		rule3MinUtteranceLength: 20
	} );
}

function reset() {
	stream = recognizer.createStream();
	committed = 0;
}

function feed( samples ) {
	stream.acceptWaveform( { samples, sampleRate: 16000 } );
	while ( recognizer.isReady( stream ) ) recognizer.decode( stream );
	const now = words( recognizer.getResult( stream ).text );
	let out = [];
	if ( recognizer.isEndpoint( stream ) ) {
		out = now.slice( committed );
		committed = 0;
		recognizer.reset( stream );
	} else if ( now.length - HOLD_BACK > committed ) {
		out = now.slice( committed, now.length - HOLD_BACK );
		committed = now.length - HOLD_BACK;
	}
	if ( out.length ) send( { type: "words", words: out } );
}

process.parentPort.on( "message", ( { data } ) => {
	try {
		if ( data.type === "start" ) {
			if ( !recognizer ) load( data.dir );
			reset();
			send( { type: "ready" } );
		} else if ( data.type === "audio" && stream ) {
			feed( new Float32Array( data.samples ) );
		} else if ( data.type === "stop" ) {
			stream = null;
		}
	} catch ( err ) {
		send( { type: "error", message: err.message } );
	}
} );
