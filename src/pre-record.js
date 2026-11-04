import { app, BrowserWindow, dialog, ipcMain, net, protocol } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { protectWindow } from "./capture-policy.js";
import { checkedFramingReference } from "./client/framing-position.js";
import { guidePose } from "./client/guide-pose.js";

protocol.registerSchemesAsPrivileged( [ { scheme: "sightline", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } } ] );

export function createPreRecord( { dir, prompter, getSettings, saveSettings, busy } ) {
	let window = null, recording = false, quitting = false, lastTestFile = null;
	let status = { test: { state: getSettings().preRecordReference?.testReviewed ? "saved" : "idle", at: getSettings().preRecordReference?.savedAt ?? null }, meter: { active: false } };
	const publish = ( value ) => {
		if ( [ "idle", "recording", "saving", "review", "passed", "failed", "stale" ].includes( value?.test?.state ) ) status.test = { state: value.test.state, at: new Date().toISOString() };
		if ( typeof value?.meter?.active === "boolean" ) status.meter = { active: value.meter.active, level: Math.max( -100, Math.min( 0, Number.isFinite( value.meter.level ) ? value.meter.level : -100 ) ), peak: Math.max( -100, Math.min( 0, Number.isFinite( value.meter.peak ) ? value.meter.peak : -100 ) ), phase: value.meter.phase === "voice" ? "voice" : "room" };
		if ( !prompter.isDestroyed() ) prompter.webContents.send( "preRecordStatus", status );
	};
	protocol.handle( "sightline", ( request ) => {
		const url = new URL( request.url ), name = url.pathname.slice( 1 );
		const allowed = /^(pre-record\.(html|css|js)|framing-position\.js|framing-worker-bundle\.js|vision-runtime\/[a-zA-Z0-9_.-]+)$/.test( name );
		if ( url.hostname !== "prepare" || !allowed ) return new Response( "Not found", { status: 404 } );
		return net.fetch( pathToFileURL( path.join( dir, "client", name ) ).href );
	} );
	const trusted = event => window && event.sender === window.webContents;
	const open = async ( event ) => {
		if ( event && event.sender !== prompter.webContents ) return;
		if ( busy() ) {
			await dialog.showMessageBox( prompter, { type: "info", message: "Pause prompting and stop the current recording before preparing a new setup." } );
			return;
		}
		if ( window && !window.isDestroyed() ) {
			window.show();
			window.focus();
			return;
		}
		window = new BrowserWindow( { width: 1440, height: 980, minWidth: 600, minHeight: 580, title: "Sightline · Prepare to record", parent: prompter, modal: false, backgroundColor: "#14171c", webPreferences: { nodeIntegration: false, sandbox: false, preload: path.join( dir, "client/pre-record-preload.mjs" ) } } );
		protectWindow( window, getSettings().hideFromCapture === true );
		window.setAlwaysOnTop( true, "screen-saver" );
		window.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		window.webContents.on( "will-navigate", event => event.preventDefault() );
		window.loadURL( "sightline://prepare/pre-record.html" );
		window.on( "close", ( event ) => {
			if ( recording && !quitting ) {
				event.preventDefault();
				const choice = dialog.showMessageBoxSync( window, { type: "question", message: "Stop the test recording and close preparation?", detail: "The current test clip will not be saved. Your previously saved reference is retained.", buttons: [ "Keep recording", "Stop and close" ], cancelId: 0, defaultId: 0 } );
				if ( choice === 1 ) {
					quitting = true;
					window.close();
				}
			}
		} );
		window.on( "closed", () => {
			publish( { ...( [ "recording", "saving" ].includes( status.test.state ) ? { test: { state: "failed" } } : {} ), meter: { active: false } } );
			window = null;
			recording = false;
			quitting = false;
		} );
	};
	const action = async ( event, name, value ) => {
		if ( !trusted( event ) ) throw new Error( "Preparation window required" );
		if ( name === "load" ) return { reference: getSettings().preRecordReference ?? null, guide: { x: getSettings().headGuideX ?? 0, y: ( getSettings().headGuideY ?? 0 ) - 14 / 562.5 * 100, size: ( getSettings().headGuideScale ?? 1 ) * 100 }, microphoneId: getSettings().preRecordMicrophone ?? "default" };
		if ( name === "model" ) return new Uint8Array( await fs.readFile( path.join( dir, "client/vision-model/blaze-face-short-range-v1.tflite" ) ) );
		if ( name === "save" ) {
			if ( busy() || recording ) throw new Error( "Finish the current recording before replacing its reference" );
			const reference = checkedFramingReference( value );
			if ( !lastTestFile ) throw new Error( "Save a real test clip before saving this reference" );
			reference.testFile = lastTestFile;
			const pose = guidePose( { ...Object.fromEntries( [ "x", "y", "scale", "width", "height", "top", "bottom", "left", "right" ].map( key => [ key, getSettings()[`headGuide${ key[0].toUpperCase() }${ key.slice( 1 ) }`] ] ) ), x: reference.target.x, y: reference.target.y + 14 / 562.5 * 100, scale: reference.target.size / 100 } );
			await saveSettings( { preRecordReference: reference, preRecordMicrophone: reference.microphoneId, headGuideX: pose.x, headGuideY: pose.y, headGuideScale: pose.scale, headGuideReference: { savedAt: reference.savedAt, pose, eyesLocked: false, bounds: getSettings().headGuideBounds ?? null } } );
			return reference;
		}
		if ( name === "test" ) {
			if ( !( value instanceof Uint8Array ) || value.byteLength < 128 || value.byteLength > 60 * 1024 * 1024 ) throw new Error( "Invalid test clip" );
			const folder = path.join( app.getPath( "userData" ), "pre-record-tests" );
			await fs.mkdir( folder, { recursive: true } );
			const file = path.join( folder, `test-${ Date.now() }.webm` );
			await fs.writeFile( file, value );
			lastTestFile = file;
			return { file };
		}
		if ( name === "read-test" ) {
			const file = getSettings().preRecordReference?.testFile, folder = path.join( app.getPath( "userData" ), "pre-record-tests" );
			if ( !file || path.dirname( file ) !== folder || !/^test-\d+\.webm$/.test( path.basename( file ) ) ) throw new Error( "Saved test clip is unavailable" );
			const stat = await fs.stat( file );
			if ( stat.size > 60 * 1024 * 1024 ) throw new Error( "Saved test clip is too large" );
			return new Uint8Array( await fs.readFile( file ) );
		}
		throw new Error( "Unknown preparation action" );
	};
	const activity = ( event, value ) => {
		if ( trusted( event ) ) recording = value === true;
	};
	const report = ( event, value ) => {
		if ( trusted( event ) ) publish( value );
	};
	const getStatus = event => event.sender === prompter.webContents ? status : null;
	const close = ( event ) => {
		if ( trusted( event ) ) window.close();
	};
	ipcMain.on( "openPreRecord", open );
	ipcMain.on( "preRecordActivity", activity );
	ipcMain.on( "preRecordReport", report );
	ipcMain.handle( "preRecordStatus", getStatus );
	ipcMain.on( "closePreRecord", close );
	ipcMain.handle( "preRecord", action );
	return { open, dispose() {
		quitting = true;
		window?.destroy();
		ipcMain.removeListener( "openPreRecord", open );
		ipcMain.removeListener( "preRecordActivity", activity );
		ipcMain.removeListener( "preRecordReport", report );
		ipcMain.removeHandler( "preRecordStatus" );
		ipcMain.removeListener( "closePreRecord", close );
		ipcMain.removeHandler( "preRecord" );
		protocol.unhandle( "sightline" );
	} };
}
