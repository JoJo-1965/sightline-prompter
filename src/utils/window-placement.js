import { fitInside } from "./fit.js";

export function windowPlacement( saved, parent, displays, size ) {
	const overlap = ( a, b ) => Math.max( 0, Math.min( a.x + a.width, b.x + b.width ) - Math.max( a.x, b.x ) ) * Math.max( 0, Math.min( a.y + a.height, b.y + b.height ) - Math.max( a.y, b.y ) );
	const valid = saved && [ "x", "y", "width", "height" ].every( k => Number.isFinite( saved[k] ) ) && saved.width > 0 && saved.height > 0;
	const parentDisplay = [ ...displays ].sort( ( a, b ) => overlap( b.workArea, parent ) - overlap( a.workArea, parent ) )[0];
	const remembered = valid && ( saved.displayId !== undefined ? displays.find( d => String( d.id ) === String( saved.displayId ) ) : displays.find( d => overlap( d.workArea, saved ) > 0 ) );
	const area = ( remembered || parentDisplay ).workArea;
	const bounds = remembered ? saved : { ...size, x: Math.round( area.x + ( area.width - size.width ) / 2 ), y: Math.round( area.y + ( area.height - size.height ) / 2 ) };
	return fitInside( bounds, area );
}

export function rememberWindow( win, key, { screen, getSettings, saveSettings } ) {
	let timer;
	const save = () => {
		clearTimeout( timer );
		if ( win.isDestroyed() ) return;
		const bounds = win.getNormalBounds();
		saveSettings( { utilityWindowBounds: { ...getSettings().utilityWindowBounds, [key]: { ...bounds, displayId: screen.getDisplayMatching( bounds ).id } } } );
	};
	const changed = () => {
		clearTimeout( timer );
		timer = setTimeout( save, 200 );
	};
	const refit = () => {
		if ( win.isDestroyed() ) return;
		const parent = win.getParentWindow();
		win.setBounds( windowPlacement( getSettings().utilityWindowBounds?.[key], parent?.getBounds() ?? win.getBounds(), screen.getAllDisplays(), win.getBounds() ) );
	};
	win.on( "move", changed );
	win.on( "resize", changed );
	win.on( "hide", save );
	win.on( "close", save );
	screen.on( "display-removed", refit );
	win.on( "closed", () => {
		clearTimeout( timer );
		screen.removeListener( "display-removed", refit );
	} );
	return save;
}
