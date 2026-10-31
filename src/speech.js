// Voice scrolling without the internet: fetches the speech model once (about
// 73 MB) into the app's data folder, then runs the recogniser in a separate
// process (speech-worker.js). Audio comes from the prompter page and the words
// go back to it; nothing leaves the computer after the download.

import { app, ipcMain, utilityProcess, shell } from "electron";
import path from "node:path";
import { createModelStore, MODEL_NAME } from "./model-store.js";

export function createSpeech( { dir, win, busy = () => false } ) {
	const modelDir = path.join(
		app.getPath( "userData" ),
		"speech-models",
		MODEL_NAME
	);
	let worker = null;
	let speechSession = null;
	let listening = false;
	const fromPrompter = event =>
		!win.isDestroyed() && event.sender === win.webContents;
	const tell = ( channel, value ) => {
		if ( !win.isDestroyed() ) win.webContents.send( channel, value );
	};

	const store = createModelStore( { folder: modelDir, busy: () => listening || busy(), trash: target => shell.trashItem( target ), notify: value => tell( "speechModel", value ) } );
	const sendModel = () => tell( "speechModel", store.status() );
	async function changeModel( action ) {
		// Release native model handles before replacing or moving files on Windows.
		if ( listening || busy() ) throw new Error( "Stop listening and recording before changing the speech model" );
		worker?.kill();
		worker = null;
		return store.change( action );
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
			listening = false;
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
		if ( fromPrompter( event ) ) changeModel( "install" ).catch( err => tell( "speechModel", { ...store.status(), error: err.message } ) );
	} );
	ipcMain.handle( "speechModelChange", async ( event, action ) => {
		if ( !fromPrompter( event ) ) return { error: "Unavailable" };
		try {
			return await changeModel( action );
		} catch ( err ) {
			return { ...store.status(), error: err.message };
		}
	} );
	ipcMain.on( "speechStart", ( event, options = {} ) => {
		if ( !fromPrompter( event ) ) return;
		if ( !store.installed() || store.status().downloading ) {
			tell( "speechState", {
				type: "error",
				message: "The speech model isn't downloaded yet.", session: options?.session ?? null
			} );
			return;
		}
		speechSession = Number.isSafeInteger( options?.session ) ? options.session : null;
		listening = true;
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
	ipcMain.on( "speechStop", ( event, session ) => {
		if ( !fromPrompter( event ) ) return;
		if ( Number.isSafeInteger( session ) && session !== speechSession ) return;
		listening = false;
		if ( fromPrompter( event ) && worker ) worker.postMessage( { type: "stop" } );
	} );

	app.on( "before-quit", () => worker?.kill() );
	return { status: store.status, change: changeModel };
}
