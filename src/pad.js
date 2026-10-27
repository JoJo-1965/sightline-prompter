// Floating control pad: a small always-on-top window with Start / Pause,
// Top, Previous and Next. It can be dragged anywhere. Over the prompter
// window it takes on the prompter's mirror setting, so it reads correctly in
// beam-splitter glass; anywhere else it reads normally.

import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

const PAD_WIDTH = 360;
const PAD_HEIGHT = 76;
const PAD_COMMANDS = [ "toggle", "restart", "previous-section", "next-section" ];

export function createPad( {
	dir,
	prompter,
	getMirror,
	getSettings,
	saveSettings
} ) {
	let pad = null;
	let mirror = "off";
	let status = {};

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
		pad.setContentProtection( !!getSettings().hideFromCapture );
		pad.loadFile( path.join( dir, "client", "pad.html" ) );
		pad.once( "ready-to-show", () => pad?.showInactive() );
		pad.webContents.on( "did-finish-load", () => {
			mirror = mirrorFor();
			pad.webContents.send( "padMirror", mirror );
			pad.webContents.send( "padStatus", status );
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
	}

	function apply() {
		if ( getSettings().showPad ) open();
		else close();
		pad?.setContentProtection( !!getSettings().hideFromCapture );
	}

	function sendStatus( next ) {
		status = next ?? {};
		pad?.webContents.send( "padStatus", status );
	}

	ipcMain.on( "padCommand", ( _event, action ) => {
		if ( PAD_COMMANDS.includes( action ) && !prompter.isDestroyed() ) {
			prompter.webContents.send( "remoteCommand", action );
		}
	} );
	ipcMain.on( "padMoveTo", ( _event, x, y ) => {
		if ( pad && Number.isFinite( x ) && Number.isFinite( y ) ) {
			pad.setBounds( {
				x: Math.round( x ),
				y: Math.round( y ),
				width: PAD_WIDTH,
				height: PAD_HEIGHT
			} );
			refreshMirror();
		}
	} );
	ipcMain.on( "padDragEnd", () => {
		if ( !pad ) return;
		const { x, y } = pad.getBounds();
		saveSettings( { padX: x, padY: y } );
	} );
	ipcMain.on( "padClose", () => saveSettings( { showPad: false } ) );

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
		}
	};
}
