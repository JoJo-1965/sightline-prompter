// Control window: an ordinary, upright window for the operator screen. It
// shows a live copy of the script that follows the prompter, the pacing light,
// and the pad's buttons. Clicking a line in the copy moves the prompter there.

import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

const CONTROL_COMMANDS = [
	"toggle",
	"restart",
	"previous-section",
	"next-section",
	"faster",
	"slower",
	"marker"
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
			...( onScreen( saved ) ? saved : { width: 960, height: 680, center: true } ),
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
		control.once( "ready-to-show", () => control?.show() );
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
	ipcMain.on( "controlCommand", ( event, action ) => {
		if ( event.sender !== control?.webContents ) return;
		if ( CONTROL_COMMANDS.includes( action ) )
			tellPrompter( "remoteCommand", action );
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

	prompter.on( "closed", close );

	return {
		apply,
		sendStatus,
		get window() {
			return control;
		}
	};
}
