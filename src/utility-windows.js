import { ipcMain, screen, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fitInside } from "./utils/fit.js";

// Only the two local, same-origin hosts may retain an opener. Their live DOM
// and handlers belong to the prompter; no second speech or recording engine runs.
export function createUtilityWindows( { dir, prompter, getSettings, saveSettings } ) {
	const host = pathToFileURL( path.join( dir, "client", "utility-window.html" ) ).href;
	const windows = new Map();
	let dirty = false;
	let focused = null;
	let timer;
	const kindOf = ( url, frameName ) => [ "settings", "help" ].find( kind => url === `${ host }?panel=${ kind }` && frameName === `sightline-${ kind }` );
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
		if ( event.sender !== prompter.webContents || ![ "settings", "help" ].includes( kind ) ) return;
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
		dialogParent() {
			for ( const win of windows.values() ) if ( !win.isDestroyed() && win.isFocused() ) return win;
			return prompter;
		},
		openHandler( { url, frameName } ) {
			const kind = kindOf( url, frameName );
			if ( !kind ) return null;
			const area = screen.getDisplayMatching( prompter.getBounds() ).workArea;
			const size = kind === "settings" ? { width: 676, height: 599 } : { width: 996, height: 679 };
			const candidate = getSettings().utilityWindowBounds?.[kind];
			const saved = candidate && [ "x", "y", "width", "height" ].every( key => Number.isFinite( candidate[key] ) ) && candidate.width >= 380 && candidate.height >= 420 ? candidate : null;
			const bounds = fitInside( saved ?? { ...size, x: Math.round( area.x + ( area.width - size.width ) / 2 ), y: Math.round( area.y + ( area.height - size.height ) / 2 ) }, area );
			return { action: "allow", overrideBrowserWindowOptions: { ...bounds, show: false, frame: true, transparent: false, backgroundColor: "#2a2d34", resizable: true, minimizable: false, maximizable: false, fullscreenable: false, minWidth: Math.min( 380, area.width ), minHeight: Math.min( 420, area.height ), autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, preload: path.join( dir, "client", "utility-window-preload.mjs" ) } } };
		},
		didCreate( win, details ) {
			const kind = kindOf( details.url, details.frameName );
			if ( !kind ) return;
			windows.set( kind, win );
			win.setContentProtection( true );
			win.setAlwaysOnTop( true, "screen-saver" );
			win.on( "focus", () => {
				focused = kind;
			} );
			win.on( "close", ( event ) => {
				event.preventDefault();
				closeRequest( kind );
			} );
			const remember = () => {
				clearTimeout( timer );
				timer = setTimeout( () => {
					const bounds = Object.fromEntries( [ ...windows ].filter( ( [ , window ] ) => !window.isDestroyed() ).map( ( [ name, window ] ) => [ name, window.getBounds() ] ) );
					saveSettings( { utilityWindowBounds: { ...getSettings().utilityWindowBounds, ...bounds } } );
				}, 200 );
			};
			win.on( "move", remember );
			win.on( "resize", remember );
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
			clearTimeout( timer );
			ipcMain.removeListener( "utilityPanel", action );
			prompter.removeListener( "focus", onFocus );
			screen.removeListener( "display-removed", refit );
			screen.removeListener( "display-metrics-changed", refit );
			for ( const win of windows.values() ) if ( !win.isDestroyed() ) win.destroy();
			windows.clear();
		}
	};
}
