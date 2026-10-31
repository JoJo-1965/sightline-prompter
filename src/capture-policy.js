// Keep each window's normal policy while a session-only debug override is on.
const windows = new Map();
let active = false;
export const captureOverride = () => active;
const notify = ( win ) => {
	if ( !win.isDestroyed() && !win.webContents.isDestroyed() ) win.webContents.send( "captureOverride", active );
};
export function trackCaptureWindow( win ) {
	if ( !win || win.isDestroyed() || windows.has( win ) ) return;
	windows.set( win, win.isContentProtected() );
	win.once( "closed", () => windows.delete( win ) );
	win.webContents.on( "did-finish-load", () => notify( win ) );
	if ( active ) win.setContentProtection( false );
}
export function protectWindow( win, normal ) {
	if ( !win || win.isDestroyed() ) return;
	trackCaptureWindow( win );
	windows.set( win, !!normal );
	win.setContentProtection( !active && !!normal );
}
export function setCaptureOverride( enabled ) {
	active = enabled === true;
	for ( const [ win, normal ] of windows ) {
		if ( win.isDestroyed() ) continue;
		win.setContentProtection( !active && normal );
		notify( win );
	}
	return active;
}
