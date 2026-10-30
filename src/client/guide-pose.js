// Positions are percentages of the guide's fixed 16:9 coordinate space.
export function guidePose( value = {} ) {
	const finite = ( number, fallback ) => typeof number === "number" && Number.isFinite( number ) ? number : fallback;
	return {
		x: Math.max( -45, Math.min( 45, finite( value?.x, 0 ) ) ),
		y: Math.max( -45, Math.min( 45, finite( value?.y, 0 ) ) ),
		scale: Math.max( 0.4, Math.min( 2, finite( value?.scale, 1 ) ) ),
		width: Math.max( 0.4, Math.min( 2, finite( value?.width, 1 ) ) ),
		height: Math.max( 0.4, Math.min( 2, finite( value?.height, 1 ) ) )
	};
}
