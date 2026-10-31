// Floating control pad: a small always-on-top window with Start / Pause,
// Top, Previous and Next. It can be dragged anywhere. Over the prompter
// window it takes on the prompter's mirror setting, so it reads correctly in
// beam-splitter glass; anywhere else it reads normally.

import { BrowserWindow, ipcMain, screen } from "electron";
import { protectWindow } from "./capture-policy.js";
import path from "node:path";
import { normalisePadLayout, controlView } from "./client/control-actions.js";
import { createControlDispatcher } from "./control-dispatch.js";

const PAD_WIDTH = 360;
const PAD_HEIGHT = 110;

export function createPad( {
	dir,
	prompter,
	getMirror,
	getSettings,
	getStatus = () => ( {} ),
	onCommand,
	saveSettings
} ) {
	let pad = null;
	let mirror = "off";
	let status = {};
	let panelOpen = false;
	const controls = createControlDispatcher( { getStatus, onCommand } );
	function update() {
		controls.observe();
		if ( !pad ) return;
		const padLayout = normalisePadLayout( getSettings().padLayout );
		const current = { ...getStatus(), ...status, padLayout };
		const visible = padLayout.buttons.filter( id => !controlView( id, current ).hidden ).length;
		const area = screen.getDisplayMatching( pad.getBounds() ).workArea;
		const width = Math.min( area.width, panelOpen ? 460 : Math.max( 260, padLayout.columns * 88 + 18 ) );
		const height = Math.min( area.height - 24, panelOpen ? 670 : Math.max( 134, Math.ceil( visible / padLayout.columns ) * 72 + 64 ) );
		const bounds = pad.getBounds();
		pad.setBounds( { x: Math.max( area.x, Math.min( bounds.x, area.x + area.width - width ) ), y: Math.max( area.y, Math.min( bounds.y, area.y + area.height - height ) ), width, height } );
		pad.webContents.send( "padStatus", current );
	}

	// Keep a saved position only if it is still on a connected display.
	function startBounds() {
		const { padX, padY } = getSettings();
		if ( Number.isFinite( padX ) && Number.isFinite( padY ) ) {
			const rect = { x: padX, y: padY, width: PAD_WIDTH, height: PAD_HEIGHT };
			const area = screen.getDisplayMatching( rect ).workArea;
			const within = ( v, lo, hi ) => v >= lo && v <= hi;
			const left = area.x - PAD_WIDTH / 2;
			const right = area.x + area.width - PAD_WIDTH / 2;
			const bottom = area.y + area.height - PAD_HEIGHT / 2;
			if ( within( padX, left, right ) && within( padY, area.y, bottom ) ) {
				return rect;
			}
		}
		const b = prompter.getBounds();
		return {
			x: Math.round( b.x + ( b.width - PAD_WIDTH ) / 2 ),
			y: Math.round( b.y + b.height - PAD_HEIGHT - 80 ),
			width: PAD_WIDTH,
			height: PAD_HEIGHT
		};
	}

	// The pad mirrors when its centre is over the (visible) prompter window.
	function mirrorFor() {
		if (
			!pad
			|| prompter.isDestroyed()
			|| !prompter.isVisible()
			|| prompter.isMinimized()
		) {
			return "off";
		}
		const p = pad.getBounds();
		const w = prompter.getBounds();
		const cx = p.x + p.width / 2;
		const cy = p.y + p.height / 2;
		const over
			= cx >= w.x && cx < w.x + w.width && cy >= w.y && cy < w.y + w.height;
		return over ? getMirror() || "off" : "off";
	}

	function refreshMirror() {
		if ( !pad ) return;
		const next = mirrorFor();
		if ( next !== mirror ) {
			mirror = next;
			pad.webContents.send( "padMirror", mirror );
		}
	}

	function open() {
		if ( pad ) {
			pad.showInactive();
			return;
		}
		pad = new BrowserWindow( {
			...startBounds(),
			frame: false,
			transparent: true,
			resizable: false,
			maximizable: false,
			minimizable: false,
			fullscreenable: false,
			skipTaskbar: true,
			// Clicking the pad mustn't take keyboard focus from the prompter.
			focusable: false,
			show: false,
			title: "Control pad",
			webPreferences: {
				nodeIntegration: false,
				sandbox: false,
				preload: path.join( dir, "client", "pad-preload.mjs" )
			}
		} );
		pad.setAlwaysOnTop( true, "screen-saver" );
		protectWindow( pad, !!getSettings().hideFromCapture );
		pad.loadFile( path.join( dir, "client", "pad.html" ) );
		pad.once( "ready-to-show", () => pad?.showInactive() );
		pad.webContents.on( "did-finish-load", () => {
			mirror = mirrorFor();
			pad.webContents.send( "padMirror", mirror );
			pad.webContents.send( "padStatus", status );
			update();
		} );
		pad.webContents.on( "will-navigate", e => e.preventDefault() );
		pad.on( "move", refreshMirror );
		pad.on( "closed", () => {
			pad = null;
		} );
	}

	function close() {
		if ( pad && !pad.isDestroyed() ) pad.destroy();
		pad = null;
		panelOpen = false;
	}

	function apply() {
		if ( getSettings().showPad ) open();
		else close();
		protectWindow( pad, !!getSettings().hideFromCapture );
		update();
	}

	function sendStatus( next ) {
		status = next ?? {};
		update();
	}

	ipcMain.handle( "padCommand", async ( event, action, value ) => {
		if ( event.sender !== pad?.webContents || prompter.isDestroyed() ) return { ok: false, error: "Control pad is closed" };
		try {
			return await controls.command( action, value );
		} catch ( error ) {
			return { ok: false, error: error.message };
		}
	} );
	ipcMain.handle( "padHold", ( event, phase, token ) => {
		if ( event.sender !== pad?.webContents ) return { ok: false, error: "Control pad is closed" };
		try {
			return controls.hold( phase, token );
		} catch ( error ) {
			return { ok: false, error: error.message };
		}
	} );
	ipcMain.on( "padPanel", ( event, shown ) => {
		if ( event.sender !== pad?.webContents || typeof shown !== "boolean" ) return;
		panelOpen = shown;
		pad.setFocusable( shown );
		update();
		if ( shown ) pad.focus();
	} );
	ipcMain.on( "padMoveTo", ( event, x, y ) => {
		if ( event.sender === pad?.webContents && Number.isFinite( x ) && Number.isFinite( y ) ) {
			pad.setBounds( {
				x: Math.round( x ),
				y: Math.round( y ),
				width: pad.getBounds().width,
				height: pad.getBounds().height
			} );
			refreshMirror();
		}
	} );
	ipcMain.on( "padDragEnd", ( event ) => {
		if ( event.sender !== pad?.webContents ) return;
		const { x, y } = pad.getBounds();
		saveSettings( { padX: x, padY: y } );
	} );
	ipcMain.on( "padClose", ( event ) => {
		if ( event.sender === pad?.webContents ) saveSettings( { showPad: false } );
	} );
	ipcMain.on( "padCustomise", ( event ) => {
		if ( event.sender === pad?.webContents ) prompter.webContents.send( "menuSettings", "pad" );
	} );

	for ( const event of [
		"move",
		"resize",
		"show",
		"hide",
		"minimize",
		"restore"
	] ) {
		prompter.on( event, refreshMirror );
	}
	prompter.on( "closed", close );

	return {
		apply,
		refreshMirror,
		sendStatus,
		get window() {
			return pad;
		},
		observeControls: controls.observe
	};
}
