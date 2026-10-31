// Shared input contract for sliders, buttons and authenticated API controls.
export const GUIDE_RANGES = {
	x: [ -45, 45, 0.25 ], y: [ -45, 45, 0.25 ],
	scale: [ 0.4, 2, 0.01 ], width: [ 0.4, 2, 0.01 ], height: [ 0.4, 2, 0.01 ],
	top: [ 0.4, 2, 0.01 ], bottom: [ 0.4, 2, 0.01 ], left: [ 0.4, 2, 0.01 ], right: [ 0.4, 2, 0.01 ],
	background: [ 0, 0.8, 0.02 ], opacity: [ 0.2, 1, 0.02 ]
};
export function guideValue( value ) {
	if ( !value || !Object.hasOwn( GUIDE_RANGES, value.axis ) ) throw new Error( "Choose a guide adjustment" );
	const absolute = Object.hasOwn( value, "value" );
	if ( absolute && Object.hasOwn( value, "steps" ) ) throw new Error( "Choose a guide value or relative steps, not both" );
	if ( !absolute ) {
		if ( !Number.isInteger( value.steps ) || value.steps === 0 || Math.abs( value.steps ) > 20 ) throw new Error( "Choose 1 to 20 whole steps" );
		return { axis: value.axis, steps: value.steps };
	}
	const [ min, max ] = GUIDE_RANGES[value.axis];
	if ( !Number.isFinite( value.value ) || value.value < min || value.value > max ) throw new Error( "Guide value is outside its allowed range" );
	return { axis: value.axis, value: Math.round( value.value * 100 ) / 100 };
}
