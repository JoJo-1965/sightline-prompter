// A framing aid above the camera preview, never an OBS scene source.
import { BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "node:path";

const HOTKEY = "CommandOrControl+Shift+H";
export function createHeadGuide( { dir, prompter, getSettings, saveSettings, saveBounds, onChange } ) {
	let overlay = null;
	let locked = false;
	let resizing = null;
	let saveTimer;
	const state = () => {
		const s = getSettings();
		return { locked, scale: Math.max( 0.7, Math.min( 1.4, Number( s.headGuideScale ) || 1 ) ), opacity: Math.max( 0.2, Math.min( 1, Number( s.headGuideOpacity ) || 0.75 ) ), colour: s.headGuideColour === "gold" ? "gold" : "mint" };
	};
	const send = () => overlay?.webContents.send( "headGuideState", state() );
	function remember() {
		clearTimeout( saveTimer );
		saveTimer = setTimeout( () => {
			if ( overlay ) saveBounds( overlay.getBounds() );
		}, 200 );
	}
	function unlock() {
		if ( !overlay ) return;
		locked = false;
		overlay.setIgnoreMouseEvents( false );
		overlay.show();
		send();
		onChange();
	}
	function close() {
		clearTimeout( saveTimer );
		if ( overlay ) {
			saveBounds( overlay.getBounds() );
			overlay.destroy();
		}
		overlay = null;
		locked = false;
		resizing = null;
	}
	function apply() {
		if ( !getSettings().showHeadGuide ) {
			close();
			return;
		}
		if ( !overlay ) {
			const saved = getSettings().headGuideBounds;
			const area = screen.getDisplayMatching( saved && Number.isFinite( saved.x ) && Number.isFinite( saved.y ) ? { x: saved.x, y: saved.y, width: 480, height: 318 } : prompter.getBounds() ).workArea;
			const width = Math.round( Math.max( 320, Math.min( Number( saved?.width ) || 960, area.width, ( area.height - 48 ) * 16 / 9 ) ) );
			const height = Math.round( width * 9 / 16 + 48 );
			const x = Math.round( Math.max( area.x, Math.min( Number.isFinite( saved?.x ) ? saved.x : area.x + 40, area.x + area.width - width ) ) );
			const y = Math.round( Math.max( area.y, Math.min( Number.isFinite( saved?.y ) ? saved.y : area.y + 60, area.y + area.height - height ) ) );
			overlay = new BrowserWindow( { x, y, width, height, frame: false, transparent: true, backgroundColor: "#00000000", resizable: false, maximizable: false, minimizable: false, fullscreenable: false, show: false, title: "Sightline head-position guide", webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, preload: path.join( dir, "client", "head-guide-preload.mjs" ) } } );
			overlay.setAlwaysOnTop( true, "floating" );
			// Independent of the prompter's Hide from capture preference.
			overlay.setContentProtection( true );
			overlay.loadFile( path.join( dir, "client", "head-guide.html" ) );
			overlay.once( "ready-to-show", () => overlay?.show() );
			overlay.on( "move", remember );
			overlay.on( "close", ( event ) => {
				event.preventDefault();
				saveSettings( { showHeadGuide: false } );
			} );
			overlay.webContents.on( "will-navigate", event => event.preventDefault() );
			overlay.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		}
		send();
	}
	function toggle() {
		if ( overlay && locked ) unlock();
		else saveSettings( { showHeadGuide: !getSettings().showHeadGuide } );
	}
	function action( event, name, value ) {
		const fromOverlay = overlay && event.sender === overlay.webContents;
		if ( !fromOverlay && event.sender !== prompter.webContents ) return;
		if ( name === "toggle" ) {
			toggle();
			return;
		}
		if ( !fromOverlay ) return;
		if ( name === "ready" ) {
			send();
			if ( !hotkeyRegistered ) prompter.webContents.send( "toast", "Head guide hotkey is in use. Use the Window menu or Stream Deck to unlock or hide it." );
		}
		if ( name === "hide" ) saveSettings( { showHeadGuide: false } );
		if ( name === "lock" ) {
			locked = true;
			send();
			overlay.setIgnoreMouseEvents( true, { forward: true } );
			onChange();
		}
		if ( name === "preferences" ) {
			const patch = {};
			if ( Number.isFinite( value?.scale ) ) patch.headGuideScale = Math.max( 0.7, Math.min( 1.4, value.scale ) );
			if ( Number.isFinite( value?.opacity ) ) patch.headGuideOpacity = Math.max( 0.2, Math.min( 1, value.opacity ) );
			if ( Object.keys( patch ).length ) saveSettings( patch );
		}
		if ( name === "colour" ) saveSettings( { headGuideColour: state().colour === "mint" ? "gold" : "mint" } );
		if ( name === "resize-start" ) resizing = { cursor: screen.getCursorScreenPoint(), bounds: overlay.getBounds() };
		if ( name === "resize-end" ) {
			resizing = null;
			remember();
		}
		if ( name === "resize" && resizing ) {
			const area = screen.getDisplayMatching( overlay.getBounds() ).workArea;
			const width = Math.round( Math.max( 320, Math.min( resizing.bounds.width + screen.getCursorScreenPoint().x - resizing.cursor.x, area.width, ( area.height - 48 ) * 16 / 9 ) ) );
			overlay.setBounds( { ...resizing.bounds, width, height: Math.round( width * 9 / 16 + 48 ) } );
		}
	}
	ipcMain.on( "headGuideAction", action );
	const hotkeyRegistered = globalShortcut.register( HOTKEY, toggle );
	return {
		apply, toggle, isLocked: () => locked,
		dispose() {
			close();
			ipcMain.removeListener( "headGuideAction", action );
			if ( hotkeyRegistered ) globalShortcut.unregister( HOTKEY );
		}
	};
}
