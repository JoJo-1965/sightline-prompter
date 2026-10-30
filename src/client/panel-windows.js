// Reparent the live form rather than copying it: listeners, unsaved values and
// previews keep their original controller. Only exact local hosts are allowed.
const panels = new Map();

export function uiElement( id ) {
	const local = document.getElementById( id );
	if ( local ) return local;
	for ( const { popup } of panels.values() ) {
		if ( !popup.closed ) {
			const el = popup.document.getElementById( id );
			if ( el ) return el;
		}
	}
	return null;
}

export async function showPanelWindow( kind, node, onResize = () => {} ) {
	let panel = panels.get( kind );
	if ( !panel || panel.popup.closed ) {
		const popup = window.open( `./utility-window.html?panel=${ kind }`, `sightline-${ kind }` );
		// Keep the existing inline dialog usable if window creation is unavailable.
		if ( !popup ) return false;
		panel = { popup, home: node.parentNode };
		panels.set( kind, panel );
		panel.ready = new Promise( ( resolve, reject ) => {
			const timeout = setTimeout( () => reject( new Error( "The floating window did not load" ) ), 8000 );
			popup.addEventListener( "load", () => {
				clearTimeout( timeout );
				popup.document.title = kind === "settings" ? "Sightline Settings" : kind === "voicehelp" ? "Sightline Voice commands" : "Sightline Help and shortcuts";
				popup.document.body.append( popup.document.adoptNode( node ) );
				node.setAttribute( "aria-modal", "false" );
				popup.addEventListener( "resize", () => {
					node.dispatchEvent( new Event( "utility-resize" ) );
					onResize();
				} );
				resolve();
			}, { once: true } );
		} );
	}
	try {
		await panel.ready;
	} catch ( error ) {
		if ( node.ownerDocument !== document ) panel.home.append( document.adoptNode( node ) );
		panels.delete( kind );
		window.electron.utilityPanel( kind, "failed" );
		window.electron.debugLog( `Floating ${ kind }: ${ error.message }. Using the inline dialog.` );
		return false;
	}
	window.electron.utilityPanel( kind, "show" );
	onResize();
	return true;
}

export function hidePanelWindow( kind ) {
	window.electron.utilityPanel( kind, "hide" );
}
