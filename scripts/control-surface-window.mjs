// Native pad + real phone server, with a simulated state source. No camera,
// microphone, real OBS or installed user profile is accessed.
import { app, BrowserWindow } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPad } from "../src/pad.js";
import { startPhoneServer } from "../src/phone.js";
import { CONTROL_ACTIONS, PAD_PRESETS, controlAction } from "../src/client/control-actions.js";
import { guideAdjustment } from "../src/guide-control.js";
import { guidePose } from "../src/client/guide-pose.js";
const out = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-control-shots-" ) );
app.setPath( "userData", out );
app.disableHardwareAcceleration();
app.whenReady().then( async () => {
	const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
	const state = { scriptLoaded: true, sectionTitle: "Framing check", padLayout: PAD_PRESETS.framing, commands: [ ...new Set( CONTROL_ACTIONS.map( a => controlAction( a.id ).action ).filter( Boolean ) ), "head-guide-adjust" ], showHeadGuide: true, headGuide: { ...guidePose(), showIdeal: true, eyesLocked: false, background: 0.12, opacity: 0.75 }, listening: "wake", listeningControl: { available: true, suspended: false, canRestart: true }, obs: { enabled: true, controls: true, connection: "connected", recording: "recording", recordingId: "fixture-one", canRecord: false, canFinish: true } };
	const settings = { showPad: true, padLayout: state.padLayout, hideFromCapture: false };
	const calls = [];
	let pad;
	function command( id, value ) {
		calls.push( { id, value } );
		if ( id === "guide-adjust" ) {
			const saved = { showHeadGuide: true, headGuideEyesLocked: state.headGuide.eyesLocked };
			for ( const [ key, number ] of Object.entries( state.headGuide ) ) saved[`headGuide${ key[0].toUpperCase() }${ key.slice( 1 ) }`] = number;
			for ( const [ key, number ] of Object.entries( guideAdjustment( saved, value ) ) ) {
				const axis = key.slice( 9 );
				state.headGuide[axis[0].toLowerCase() + axis.slice( 1 )] = number;
			}
		}
		if ( id === "guide-eyes-lock" ) state.headGuide.eyesLocked = !state.headGuide.eyesLocked;
		if ( id === "guide-ideal-visible" ) state.headGuide.showIdeal = !state.headGuide.showIdeal;
		if ( id === "listening-toggle" ) {
			state.listeningControl.suspended = !state.listeningControl.suspended;
			state.listening = state.listeningControl.suspended ? null : "wake";
		}
		if ( id === "obs-finish" ) {
			state.obs.recording = "stopped";
			state.obs.canFinish = false;
		}
		pad?.sendStatus( state );
	}
	const dummy = new BrowserWindow( { show: false, width: 1100, height: 850 } );
	await dummy.loadURL( "data:text/html,fixture" );
	pad = createPad( { dir: path.resolve( "src" ), prompter: dummy, getMirror: () => "off", getSettings: () => settings, getStatus: () => state, onCommand: command, saveSettings: value => Object.assign( settings, value ) } );
	const server = startPhoneServer( { port: 0, key: "fixture-phone-key", pagePath: path.resolve( "src/client/phone.html" ), getStatus: () => state, onCommand: command } );
	await new Promise( resolve => server.listening ? resolve() : server.once( "listening", resolve ) );
	const phone = new BrowserWindow( { show: false, width: 390, height: 844, backgroundColor: "#18181c", webPreferences: { offscreen: true, backgroundThrottling: false } } );
	const evaluate = ( window, code ) => window.webContents.executeJavaScript( code, true );
	async function until( window, code ) {
		for ( let n = 0; n < 100; n++ ) {
			if ( await evaluate( window, code ) ) return;
			await pause( 50 );
		}
		throw new Error( `UI not ready: ${ code }` );
	}
	const click = ( window, selector ) => evaluate( window, `document.querySelector(${ JSON.stringify( selector ) }).click()` );
	async function shot( window, name ) {
		await pause( 120 );
		await fs.writeFile( path.join( out, name ), ( await window.webContents.capturePage() ).toPNG() );
	}
	try {
		pad.apply();
		pad.window.setOpacity( 0 );
		pad.window.setIgnoreMouseEvents( true );
		await until( pad.window, "document.querySelectorAll('#pad-buttons button').length===12" );
		await phone.loadURL( `http://127.0.0.1:${ server.address().port }/?k=fixture-phone-key` );
		await until( phone, "document.querySelectorAll('#phone-buttons button').length===12" );
		assert.deepEqual( await evaluate( phone, "[...document.querySelectorAll('#phone-buttons button')].map(b=>b.dataset.action)" ), await evaluate( pad.window, "[...document.querySelectorAll('#pad-buttons button')].map(b=>b.dataset.action)" ) );
		await shot( phone, "phone-framing.png" );
		for ( const window of [ pad.window, phone ] ) {
			await click( window, "[data-action='guide-adjustments']" );
			await until( window, "document.querySelector('dialog').open&&document.getElementById('guide-value-x')" );
			await evaluate( window, "(()=>{const input=document.getElementById('guide-value-x');input.value='2.5';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()" );
			for ( let n = 0; n < 80 && state.headGuide.x !== 2.5; n++ ) await pause( 50 );
			assert.equal( state.headGuide.x, 2.5 );
			await click( window, "[data-command='guide-eyes-lock']" );
			for ( let n = 0; n < 80 && !state.headGuide.eyesLocked; n++ ) await pause( 50 );
			if ( window === phone ) await pause( 1100 );
			await until( window, "document.getElementById('guide-value-x').disabled" );
			await click( window, "[data-tab='outline']" );
			await evaluate( window, "(()=>{const input=document.getElementById('guide-value-top');input.value='1.2';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()" );
			for ( let n = 0; n < 80 && state.headGuide.top !== 1.2; n++ ) await pause( 50 );
			assert.equal( state.headGuide.top, 1.2 );
			assert.equal( state.headGuide.x, 2.5 );
			await shot( window, window === phone ? "phone-guide-outline.png" : "pad-guide-outline.png" );
			await click( window, "[data-close]" );
			state.headGuide.eyesLocked = false;
			pad.sendStatus( state );
		}
		await click( phone, "[data-action='session-check']" );
		await until( phone, "document.querySelector('.session-rows')?.textContent.includes('recording')" );
		await shot( phone, "phone-session.png" );
		await click( phone, "[data-close]" );
		await click( phone, "[data-action='listening-toggle']" );
		for ( let n = 0; n < 80 && !state.listeningControl.suspended; n++ ) await pause( 50 );
		assert.equal( state.listeningControl.suspended, true );
		assert.equal( state.obs.recording, "recording" );
		// Native keyboard events exercise the same hold path as touch/pointer input.
		await evaluate( phone, "document.querySelector('[data-action=obs-finish]').focus()" );
		phone.webContents.sendInputEvent( { type: "keyDown", keyCode: "Space" } );
		await pause( 250 );
		phone.webContents.sendInputEvent( { type: "keyUp", keyCode: "Space" } );
		await pause( 1000 );
		assert.equal( state.obs.recording, "recording" );
		phone.webContents.sendInputEvent( { type: "keyDown", keyCode: "Space" } );
		await pause( 1500 );
		phone.webContents.sendInputEvent( { type: "keyUp", keyCode: "Space" } );
		assert.equal( state.obs.recording, "stopped" );
		assert.equal( calls.filter( call => call.id === "obs-finish" ).length, 1 );
		phone.setSize( 844, 390 );
		await shot( phone, "phone-framing-landscape.png" );
		console.log( JSON.stringify( { pass: true, checks: "native pad IPC, shared phone order, bounded sliders, locked eyes, outline fitting, session panel, listening and early/full keyboard holds", screenshots: out } ) );
	} finally {
		server.closeAllConnections();
		server.close();
		phone.destroy();
		dummy.destroy();
		app.quit();
	}
} ).catch( ( error ) => {
	console.error( error.stack );
	app.exit( 1 );
} );
