// Voice scrolling without the internet: fetches the speech model once (about
// 73 MB) into the app's data folder, then runs the recogniser in a separate
// process (speech-worker.js). Audio comes from the prompter page and the words
// go back to it; nothing leaves the computer after the download.

import { app, ipcMain, utilityProcess } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

const MODEL_NAME = "zipformer-en-2023-06-26";
const MODEL_URL
	= "https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/";
const MODEL_FILES = [
	[ "encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 71083163 ],
	[ "decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 1307236 ],
	[ "joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 259335 ],
	[ "tokens.txt", 5048 ]
];
const MODEL_BYTES = MODEL_FILES.reduce( ( sum, [ , size ] ) => sum + size, 0 );

export function createSpeech( { dir, win } ) {
	const modelDir = path.join(
		app.getPath( "userData" ),
		"speech-models",
		MODEL_NAME
	);
	let worker = null;
	let speechSession = null;
	let download = null; // { received, error } while fetching

	const installed = () =>
		MODEL_FILES.every( ( [ name ] ) => existsSync( path.join( modelDir, name ) ) );
	const fromPrompter = event =>
		!win.isDestroyed() && event.sender === win.webContents;
	const tell = ( channel, value ) => {
		if ( !win.isDestroyed() ) win.webContents.send( channel, value );
	};

	function sendModel() {
		tell( "speechModel", {
			installed: installed(),
			downloading: !!download && !download.error,
			received: download?.received ?? 0,
			total: MODEL_BYTES,
			error: download?.error ?? null
		} );
	}

	async function fetchModel() {
		if ( download && !download.error ) return;
		download = { received: 0, error: null };
		sendModel();
		let lastSent = 0;
		try {
			await fs.mkdir( modelDir, { recursive: true } );
			for ( const [ name ] of MODEL_FILES ) {
				const target = path.join( modelDir, name );
				if ( existsSync( target ) ) {
					download.received += ( await fs.stat( target ) ).size;
					continue;
				}
				const res = await fetch( MODEL_URL + name, { redirect: "follow" } );
				if ( !res.ok ) throw new Error( `Download failed (${ res.status })` );
				const part = target + ".part";
				const file = await fs.open( part, "w" );
				try {
					for await ( const chunk of res.body ) {
						await file.write( chunk );
						download.received += chunk.length;
						if ( Date.now() - lastSent > 250 ) {
							lastSent = Date.now();
							sendModel();
						}
					}
				} finally {
					await file.close();
				}
				await fs.rename( part, target );
			}
			download = null;
		} catch ( err ) {
			download.error = err.message || "Download failed";
		}
		sendModel();
	}

	function ensureWorker() {
		if ( worker ) return worker;
		worker = utilityProcess.fork( path.join( dir, "speech-worker.js" ), [], {
			serviceName: "Sightline speech"
		} );
		const current = worker;
		worker.on( "message", ( message ) => {
			if ( worker !== current || message.session !== speechSession ) return;
			if ( message.type === "words" ) tell( "speechWords", { words: message.words, final: message.final, at: message.at, session: message.session } );
			else tell( "speechState", message );
		} );
		worker.on( "exit", () => {
			if ( worker !== current ) return;
			worker = null;
			tell( "speechState", {
				type: "error",
				message: "The speech engine stopped.", session: speechSession
			} );
		} );
		return worker;
	}

	ipcMain.on( "speechModelStatus", ( event ) => {
		if ( fromPrompter( event ) ) sendModel();
	} );
	ipcMain.on( "speechModelDownload", ( event ) => {
		if ( fromPrompter( event ) ) fetchModel();
	} );
	ipcMain.on( "speechStart", ( event, options = {} ) => {
		if ( !fromPrompter( event ) ) return;
		if ( !installed() ) {
			tell( "speechState", {
				type: "error",
				message: "The speech model isn't downloaded yet."
			} );
			return;
		}
		speechSession = Number.isSafeInteger( options?.session ) ? options.session : null;
		if ( options?.reset === true ) {
			const previous = worker;
			worker = null;
			previous?.kill();
		}
		ensureWorker().postMessage( { type: "start", dir: modelDir, session: speechSession } );
	} );
	ipcMain.on( "speechAudio", ( event, samples ) => {
		if ( fromPrompter( event ) && worker )
			worker.postMessage( { type: "audio", samples } );
	} );
	ipcMain.on( "speechStop", ( event ) => {
		if ( fromPrompter( event ) && worker ) worker.postMessage( { type: "stop" } );
	} );

	app.on( "before-quit", () => worker?.kill() );
}
