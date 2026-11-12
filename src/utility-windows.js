import { BrowserWindow, ipcMain, screen, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fitInside } from "./utils/fit.js";
import { protectWindow } from "./capture-policy.js";
import { windowPlacement, rememberWindow } from "./utils/window-placement.js";

// Only the local, same-origin panel hosts may retain an opener. Their live DOM
// and handlers belong to the prompter; no second speech or recording engine runs.
export function createUtilityWindows( { dir, prompter, getSettings, saveSettings } ) {
	const host = pathToFileURL( path.join( dir, "client", "utility-window.html" ) ).href;
	const windows = new Map();
	const owners = new Map();
	let dirty = false;
	let focused = null;
	const kinds = [ "settings", "help", "voicehelp", "workflow", "obssetup", "tools", "preview" ];
	const dialogParent = () => BrowserWindow.getFocusedWindow() ?? prompter;
	const kindOf = ( url, frameName ) => kinds.find( kind => url === `${ host }?panel=${ kind }` && frameName === `sightline-${ kind }` );
	const restack = () => {
		for ( const [ kind, win ] of [ ...windows ].sort( ( [ a ], [ b ] ) => Number( a === focused ) - Number( b === focused ) ) ) {
			if ( win.isDestroyed() || !win.isVisible() ) continue;
			win.setAlwaysOnTop( true, "screen-saver" );
			win.moveTop();
			if ( kind === focused && win.isMinimized() ) win.restore();
		}
	};
	const closeRequest = ( kind, quit = false ) => {
		const win = windows.get( kind );
		if ( win && !win.isDestroyed() ) {
			win.show();
			win.focus();
		}
		prompter.webContents.send( "utilityPanelClose", kind, quit );
	};
	const action = ( event, kind, name, value ) => {
		if ( event.sender !== prompter.webContents || !kinds.includes( kind ) ) return;
		if ( name === "dirty" && kind === "settings" ) dirty = value === true;
		const win = windows.get( kind );
		if ( !win || win.isDestroyed() ) return;
		if ( name === "failed" ) {
			windows.delete( kind );
			win.destroy();
			return;
		}
		if ( name === "show" ) {
			focused = kind;
			win.show();
			restack();
			win.focus();
			setImmediate( restack );
		}
		if ( name === "hide" ) win.hide();
	};
	ipcMain.on( "utilityPanel", action );
	const onFocus = () => setImmediate( restack );
	prompter.on( "focus", onFocus );
	const refit = () => {
		for ( const win of windows.values() ) {
			if ( !win.isDestroyed() ) win.setBounds( fitInside( win.getBounds(), screen.getDisplayMatching( win.getBounds() ).workArea ) );
		}
	};
	screen.on( "display-removed", refit );
	screen.on( "display-metrics-changed", refit );
	return {
		restack, isDirty: () => dirty, requestClose: closeRequest,
		apply() {
			for ( const win of windows.values() ) protectWindow( win, !!getSettings().hideFromCapture );
			restack();
		},
		dialogParent() {
			return dialogParent();
		},
		openHandler( { url, frameName } ) {
			const kind = kindOf( url, frameName );
			if ( !kind ) return null;
			const owner = kind === "preview" && windows.get( "settings" ) && !windows.get( "settings" ).isDestroyed() ? windows.get( "settings" ) : dialogParent();
			owners.set( kind, owner );
			const anchor = owner.getBounds();
			const area = screen.getDisplayMatching( anchor ).workArea;
			const size = kind === "preview" ? { width: 360, height: 560 } : kind === "tools" ? { width: 560, height: 440 } : kind === "settings" ? { width: 1080, height: 730 } : [ "workflow", "obssetup" ].includes( kind ) ? { width: 676, height: 599 } : kind === "voicehelp" ? { width: 776, height: 639 } : { width: 996, height: 679 };
			const candidate = getSettings().utilityWindowBounds?.[kind];
			const minimum = kind === "preview" ? { width: 300, height: 360 } : kind === "settings" ? { width: 576, height: 539 } : { width: 380, height: 420 };
			const saved = candidate && [ "x", "y", "width", "height" ].every( key => Number.isFinite( candidate[key] ) ) && candidate.width >= minimum.width && candidate.height >= minimum.height ? candidate : null;
			const placement = kind === "preview" ? { x: anchor.x + anchor.width + 12 + size.width <= area.x + area.width ? anchor.x + anchor.width + 12 : anchor.x - size.width - 12, y: anchor.y } : { x: Math.round( area.x + ( area.width - size.width ) / 2 ), y: Math.round( area.y + ( area.height - size.height ) / 2 ) };
			const bounds = saved ? windowPlacement( saved, anchor, screen.getAllDisplays(), size ) : fitInside( { ...size, ...placement }, area );
			return { action: "allow", overrideBrowserWindowOptions: { ...bounds, show: false, frame: true, transparent: false, backgroundColor: "#2a2d34", resizable: true, minimizable: false, maximizable: false, fullscreenable: false, minWidth: Math.min( minimum.width, area.width ), minHeight: Math.min( minimum.height, area.height ), autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, preload: path.join( dir, "client", "utility-window-preload.mjs" ) } } };
		},
		didCreate( win, details ) {
			const kind = kindOf( details.url, details.frameName );
			if ( !kind ) return;
			windows.set( kind, win );
			// A native owner keeps the panel above its prompter even when Windows
			// promotes the fullscreen owner after an asynchronous window.open.
			win.setParentWindow( owners.get( kind ) ?? prompter );
			rememberWindow( win, kind, { screen, getSettings, saveSettings } );
			protectWindow( win, !!getSettings().hideFromCapture );
			win.setAlwaysOnTop( true, "screen-saver" );
			win.on( "focus", () => {
				focused = kind;
			} );
			win.on( "close", ( event ) => {
				event.preventDefault();
				closeRequest( kind );
			} );
			let loaded = false;
			win.webContents.on( "did-navigate", ( _event, url ) => {
				if ( url === details.url ) loaded = true;
			} );
			win.webContents.on( "will-navigate", ( event, url ) => {
				if ( loaded || url !== details.url ) event.preventDefault();
			} );
			win.webContents.setWindowOpenHandler( ( { url } ) => {
				if ( /^https:\/\//.test( url ) ) shell.openExternal( url );
				return { action: "deny" };
			} );
		},
		dispose() {
			ipcMain.removeListener( "utilityPanel", action );
			prompter.removeListener( "focus", onFocus );
			screen.removeListener( "display-removed", refit );
			screen.removeListener( "display-metrics-changed", refit );
			for ( const win of windows.values() ) if ( !win.isDestroyed() ) win.destroy();
			windows.clear();
		}
	};
}
