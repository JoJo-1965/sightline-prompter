// Annotation rectangles are added to the focus mask, before the edge fade.
// No script markup or word ranges are changed, so voice alignment stays intact.
export function annotationRect( rect, root, offset, height, mirrorX = false, mirrorY = false ) {
	const left = ( mirrorX ? root.right - rect.right : rect.left - root.left ) - 1;
	const top = ( mirrorY ? root.bottom - rect.bottom : rect.top - root.top ) - offset - 1;
	const x = Math.max( 0, left ), y = Math.max( 0, top );
	const right = Math.min( root.width, left + rect.width + 2 );
	const bottom = Math.min( height, top + rect.height + 2 );
	return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

export function annotationMask( root, { offset, height, mirrorX = false, mirrorY = false } ) {
	const bounds = root.getBoundingClientRect();
	if ( !bounds.width || !height ) return null;
	const rectangles = [ ...root.querySelectorAll( ".production-note, .direction" ) ].flatMap( element => [ ...element.getClientRects() ] )
		.map( rect => annotationRect( rect, bounds, offset, height, mirrorX, mirrorY ) ).filter( Boolean );
	if ( !rectangles.length ) return null;
	const number = value => value.toFixed( 2 );
	const shapes = rectangles.map( rect => `<rect x="${ number( rect.x ) }" y="${ number( rect.y ) }" width="${ number( rect.width ) }" height="${ number( rect.height ) }"/>` ).join( "" );
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ number( bounds.width ) }" height="${ number( height ) }"><g fill="white">${ shapes }</g></svg>`;
	return `url("data:image/svg+xml,${ encodeURIComponent( svg ) }")`;
}
