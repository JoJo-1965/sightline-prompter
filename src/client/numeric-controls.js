// UI precision is distinct from stored/model precision. Rendering a rounded
// control must not alter an existing preference until the user adjusts it.
export function roundControlNumber( value, decimals = 2 ) {
	return Number( Number( value ).toFixed( Math.max( 0, Math.min( 2, decimals ) ) ) );
}

export function steppedControlNumber( value, { min = 0, max = 100, step = 1 } = {} ) {
	const clamped = Math.min( max, Math.max( min, Number( value ) ) );
	if ( !Number.isFinite( clamped ) ) return NaN;
	if ( clamped === max ) return roundControlNumber( max );
	return roundControlNumber( Math.min( max, Math.max( min, min + Math.round( ( clamped - min ) / step ) * step ) ) );
}
