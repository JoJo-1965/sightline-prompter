// Keeping windows where they can be seen and used. Pure functions, so they can
// be tested without Electron: `area` is a display's work area (no taskbar).

const clamp = ( v, lo, hi ) => Math.min( Math.max( v, lo ), Math.max( lo, hi ) );

// Fit a window fully inside the work area: shrink it if it is bigger than the
// screen, then move it so no edge is off the screen.
export function fitInside( rect, area ) {
	const width = Math.min( rect.width, area.width );
	const height = Math.min( rect.height, area.height );
	return {
		x: clamp( rect.x, area.x, area.x + area.width - width ),
		y: clamp( rect.y, area.y, area.y + area.height - height ),
		width,
		height
	};
}

// After a drag: the window may hang off a side, but its top edge (where the
// control bar is) must stay on the screen, with enough of it showing to grab.
export function keepTopReachable( rect, area, grab = 160 ) {
	const width = Math.min( rect.width, area.width );
	const height = Math.min( rect.height, area.height );
	return {
		x: clamp( rect.x, area.x - width + grab, area.x + area.width - grab ),
		y: clamp( rect.y, area.y, area.y + area.height - 60 ),
		width,
		height
	};
}

export function sameRect( a, b ) {
	return (
		a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
	);
}
