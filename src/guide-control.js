// Bounded relative controls for the actual framing reference, never the window.
import { guidePose } from "./client/guide-pose.js";
import { guideValue, GUIDE_RANGES } from "./client/guide-values.js";

export const GUIDE_AXES = [ "x", "y", "scale", "width", "height", "top", "bottom", "left", "right", "background", "opacity" ];
export const GUIDE_CONTROLS = [ "adjust", "eyes-lock", "ideal-visible", "reset-pose" ];

export function guideAdjustment( settings, value ) {
	if ( !settings.showHeadGuide ) throw new Error( "Show the head guide before adjusting it" );
	const input = guideValue( value );
	const { axis, steps } = input;
	if ( settings.headGuideEyesLocked === true && [ "x", "y" ].includes( axis ) ) throw new Error( "Unlock the eye position before moving it" );
	const key = `headGuide${ axis[0].toUpperCase() }${ axis.slice( 1 ) }`;
	const base = [ "background", "opacity" ].includes( axis ) ? Number.isFinite( settings[key] ) ? settings[key] : axis === "background" ? 0.12 : 0.75 : guidePose( { [axis]: settings[key] } )[axis];
	const [ min, max, step ] = GUIDE_RANGES[axis];
	return { [key]: input.value ?? Math.round( Math.max( min, Math.min( max, base + steps * step ) ) * 100 ) / 100 };
}
