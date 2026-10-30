// Positions are percentages of the guide's fixed 16:9 coordinate space.
export function guidePose( value = {} ) {
	const finite = ( number, fallback ) => typeof number === "number" && Number.isFinite( number ) ? number : fallback;
	return {
		x: Math.max( -45, Math.min( 45, finite( value?.x, 0 ) ) ),
		y: Math.max( -45, Math.min( 45, finite( value?.y, 0 ) ) ),
		scale: Math.max( 0.4, Math.min( 2, finite( value?.scale, 1 ) ) ),
		width: Math.max( 0.4, Math.min( 2, finite( value?.width, 1 ) ) ),
		height: Math.max( 0.4, Math.min( 2, finite( value?.height, 1 ) ) ),
		top: Math.max( 0.4, Math.min( 2, finite( value?.top, 1 ) ) ),
		bottom: Math.max( 0.4, Math.min( 2, finite( value?.bottom, 1 ) ) ),
		left: Math.max( 0.4, Math.min( 2, finite( value?.left, 1 ) ) ),
		right: Math.max( 0.4, Math.min( 2, finite( value?.right, 1 ) ) )
	};
}

// Independent edges in the fixed SVG space, before overall width/height/scale.
export function guideOutline( value ) {
	const p = guidePose( value );
	const left = 500 - 86 * p.left;
	const right = 500 + 86 * p.right;
	const top = 155 - 89 * p.top;
	const bottom = 155 + 153 * p.bottom;
	const shoulder = ( side, sign ) => {
		const x = distance => 500 + sign * distance * side;
		return `M${ x( 40 ) } ${ bottom - 10 } L${ x( 45 ) } ${ bottom + 21 } Q${ x( 76 ) } ${ bottom + 37 } ${ x( 132 ) } ${ bottom + 59 } Q${ x( 178 ) } ${ bottom + 76 } ${ x( 203 ) } ${ bottom + 151 }`;
	};
	return { cx: ( left + right ) / 2, cy: ( top + bottom ) / 2, rx: ( right - left ) / 2, ry: ( bottom - top ) / 2, shoulders: `${ shoulder( p.left, -1 ) } ${ shoulder( p.right, 1 ) }` };
}
