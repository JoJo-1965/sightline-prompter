import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Separate app-owned renderer windows join the existing listener; they never
// open a microphone or accept arbitrary script/code from the prompter.
export function connectDialogVoice( prompter, dir ) {
	const actions = new Map();
	const allowed = ( win ) => {
		if ( !win || win.isDestroyed() ) return false;
		try {
			const file = fileURLToPath( new URL( win.webContents.getURL() ) );
			return [ "guide.html", "recording-review.html", "head-guide.html" ].some( name => path.resolve( file ) === path.resolve( dir, "client", name ) );
		} catch {
			return false;
		}
	};
	const publish = () => {
		if ( prompter.isDestroyed() ) return;
		const win = BrowserWindow.getFocusedWindow();
		prompter.webContents.send( "dialogVoiceContext", allowed( win ) && win.isVisible() ? { id: win.webContents.id, actions: actions.get( win.webContents.id ) ?? [] } : null );
	};
	const report = ( event, values ) => {
		const win = BrowserWindow.fromWebContents( event.sender );
		if ( !allowed( win ) || !Array.isArray( values ) ) return;
		actions.set( event.sender.id, values.filter( item => typeof item.id === "string" && typeof item.label === "string" ).slice( 0, 100 ).map( item => ( { id: item.id.slice( 0, 80 ), label: item.label.slice( 0, 100 ) } ) ) );
		publish();
	};
	const request = ( event, owner, id ) => {
		if ( event.sender !== prompter.webContents ) return false;
		const win = BrowserWindow.getFocusedWindow();
		if ( !allowed( win ) || !win.isVisible() || win.webContents.id !== owner || !actions.get( owner )?.some( action => action.id === id ) ) return false;
		win.webContents.send( "dialogVoiceAction", id );
		return true;
	};
	ipcMain.on( "dialogVoiceInventory", report );
	ipcMain.handle( "dialogVoiceAction", request );
	app.on( "browser-window-focus", publish );
	app.on( "browser-window-blur", publish );
	prompter.once( "closed", () => {
		ipcMain.removeListener( "dialogVoiceInventory", report );
		ipcMain.removeHandler( "dialogVoiceAction" );
		app.removeListener( "browser-window-focus", publish );
		app.removeListener( "browser-window-blur", publish );
	} );
}
