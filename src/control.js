// Control window: an ordinary, upright window for the operator screen. It
// shows a live copy of the script that follows the prompter, the pacing light,
// and the pad's buttons. Clicking a line in the copy moves the prompter there.

import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { fitInside } from "./utils/fit.js";

const CONTROL_COMMANDS = [
	"obs-record",
	"obs-finish",
	"toggle",
	"restart",
	"previous-section",
	"next-section",
	"faster",
	"slower",
	"marker",
	"keeper",
	"scrap",
	// The broadcast row: what you'd tweak on the prompter while recording.
	"on-air",
	"bigger",
	"smaller",
	"backing", // value: steps of 5%, + or -
	"mirror-h",
	"mirror-v",
	"eye-line",
	"sound-check",
	"scroll-mode"
];

// Saved bounds are kept only if most of the window is still on a display.
function onScreen( rect ) {
	if (
		!rect
		|| ![ rect.x, rect.y, rect.width, rect.height ].every( Number.isFinite )
	) {
		return false;
	}
	const area = screen.getDisplayMatching( rect ).workArea;
	const overlap = ( a, aSize, b, bSize ) =>
		Math.min( a + aSize, b + bSize ) - Math.max( a, b );
	const overlapX = overlap( rect.x, rect.width, area.x, area.width );
	const overlapY = overlap( rect.y, rect.height, area.y, area.height );
	return overlapX > rect.width / 2 && overlapY > 40;
}

// The screen the prompter fills, if it fills one (full screen on a prompter
// monitor such as the Elgato Prompter), or null.
function prompterScreen( prompter ) {
	if ( prompter.isDestroyed() ) return null;
	const b = prompter.getBounds();
	const d = screen.getDisplayMatching( b );
	const fills = prompter.isFullScreen() || ( b.width >= d.bounds.width - 2 && b.height >= d.bounds.height - 2 );
	return fills ? d : null;
}

// Where the window opens: where it was left (made to fit if the screen is
// smaller now), or centred on the main screen. Never on the screen the
// prompter fills, where it would be hidden behind it, if there's another.
function startBounds( saved, avoid ) {
	const others = screen.getAllDisplays().filter( d => d.id !== avoid?.id );
	const blocked = avoid && others.length && onScreen( saved ) && screen.getDisplayMatching( saved ).id === avoid.id;
	if ( onScreen( saved ) && !blocked ) return fitInside( saved, screen.getDisplayMatching( saved ).workArea );
	const primary = screen.getPrimaryDisplay();
	const d = others.find( x => x.id === primary.id ) ?? others[0] ?? primary;
	const area = d.workArea;
	const width = Math.min( 960, area.width );
	const height = Math.min( 680, area.height );
	return {
		width,
		height,
		x: area.x + Math.round( ( area.width - width ) / 2 ),
		y: area.y + Math.round( ( area.height - height ) / 2 )
	};
}

export function createControl( {
	dir,
	prompter,
	getSettings,
	saveSettings,
	saveBounds
} ) {
	let control = null;
	let quitting = false;
	let status = {};
	let content = null;

	app.on( "before-quit", () => {
		quitting = true;
	} );

	const send = ( channel, ...args ) => {
		if ( control && !control.isDestroyed() )
			control.webContents.send( channel, ...args );
	};
	const tellPrompter = ( channel, ...args ) => {
		if ( !prompter.isDestroyed() ) prompter.webContents.send( channel, ...args );
	};

	function open() {
		if ( control ) return;
		const saved = getSettings().controlBounds;
		control = new BrowserWindow( {
			...startBounds( saved, prompterScreen( prompter ) ),
			minWidth: 520,
			minHeight: 360,
			title: "Sightline Control",
			backgroundColor: "#16171b",
			show: false,
			webPreferences: {
				nodeIntegration: false,
				sandbox: false,
				preload: path.join( dir, "client", "control-preload.mjs" )
			}
		} );
		// No app menu here: its shortcuts act on the prompter (Ctrl+W would close it).
		control.removeMenu();
		control.setContentProtection( !!getSettings().hideFromCapture );
		control.loadFile( path.join( dir, "client", "control.html" ) );
		control.once( "ready-to-show", () => {
			if ( !control ) return;
			// On the prompter's screen anyway (the only screen): keep it in front.
			const covering = prompterScreen( prompter );
			if ( covering && screen.getDisplayMatching( control.getBounds() ).id === covering.id && prompter.isAlwaysOnTop() )
				control.setAlwaysOnTop( true, "pop-up-menu" );
			control.show();
			control.moveTop();
			control.focus();
		} );
		control.webContents.on( "will-navigate", e => e.preventDefault() );
		control.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		control.webContents.on( "did-finish-load", () => {
			if ( content !== null ) send( "controlContent", content );
			send( "controlStatus", status );
			tellPrompter( "controlOpen", true );
		} );
		const remember = () => {
			if ( control && !control.isMinimized() && !control.isMaximized() ) {
				saveBounds( control.getBounds() );
			}
		};
		// Saved a moment after it stops moving, and again as it closes.
		let timer = null;
		const rememberSoon = () => {
			clearTimeout( timer );
			timer = setTimeout( remember, 500 );
		};
		control.on( "move", rememberSoon );
		control.on( "resize", rememberSoon );
		control.on( "close", () => {
			clearTimeout( timer );
			remember();
			// Closed with its own × (not by quitting): switch it off.
			if ( !quitting && !prompter.isDestroyed() )
				saveSettings( { showControl: false } );
		} );
		control.on( "closed", () => {
			control = null;
			tellPrompter( "controlOpen", false );
		} );
	}

	function close() {
		if ( control && !control.isDestroyed() ) control.destroy();
		control = null;
		tellPrompter( "controlOpen", false );
	}

	function apply() {
		if ( getSettings().showControl ) open();
		else if ( control ) close();
		control?.setContentProtection( !!getSettings().hideFromCapture );
	}

	function sendStatus( next ) {
		status = next ?? {};
		send( "controlStatus", status );
	}

	ipcMain.on( "previewContent", ( event, html ) => {
		if ( event.sender !== prompter.webContents || typeof html !== "string" )
			return;
		content = html;
		send( "controlContent", content );
	} );
	ipcMain.on( "previewPosition", ( event, position ) => {
		if ( event.sender !== prompter.webContents || !position ) return;
		send( "controlPosition", position );
	} );
	ipcMain.on( "controlCommand", ( event, action, value ) => {
		if ( event.sender !== control?.webContents ) return;
		if ( !CONTROL_COMMANDS.includes( action ) ) return;
		if ( Number.isFinite( value ) ) tellPrompter( "remoteCommand", action, value );
		else tellPrompter( "remoteCommand", action );
	} );
	// The sound-check meter's readings, ten times a second while it runs.
	ipcMain.on( "previewLevel", ( event, level ) => {
		if ( event.sender !== prompter.webContents || !level || typeof level !== "object" ) return;
		send( "controlLevel", level );
	} );
	ipcMain.on( "controlJump", ( event, index, fraction ) => {
		if ( event.sender !== control?.webContents ) return;
		if ( Number.isInteger( index ) && Number.isFinite( fraction ) ) {
			tellPrompter( "previewJump", index, Math.min( 1, Math.max( 0, fraction ) ) );
		}
	} );
	ipcMain.on( "controlClose", ( event ) => {
		if ( event.sender === control?.webContents )
			saveSettings( { showControl: false } );
	} );

	// A monitor unplugged or changed: bring the window back onto a screen.
	const refit = () => {
		if ( !control || control.isDestroyed() || control.isMinimized() ) return;
		if ( control.isMaximized() ) return;
		const bounds = control.getBounds();
		if ( onScreen( bounds ) ) return;
		control.setBounds( fitInside( bounds, screen.getDisplayMatching( bounds ).workArea ) );
	};
	screen.on( "display-removed", () => setTimeout( refit, 300 ) );
	screen.on( "display-metrics-changed", refit );

	prompter.on( "closed", close );

	return {
		apply,
		sendStatus,
		get window() {
			return control;
		}
	};
}
