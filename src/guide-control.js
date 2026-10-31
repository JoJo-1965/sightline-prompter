// Bounded relative controls for the actual framing reference, never the window.
import { guidePose } from "./client/guide-pose.js";

export const GUIDE_AXES = [ "x", "y", "scale", "width", "height", "top", "bottom", "left", "right", "background", "opacity" ];
export const GUIDE_CONTROLS = [ "adjust", "eyes-lock", "ideal-visible", "reset-pose" ];

export function guideAdjustment( settings, value ) {
	if ( !settings.showHeadGuide ) throw new Error( "Show the head guide before adjusting it" );
	if ( !value || !GUIDE_AXES.includes( value.axis ) || !Number.isInteger( value.steps ) || Math.abs( value.steps ) > 20 || value.steps === 0 ) throw new Error( "Choose a guide axis and 1 to 20 whole steps" );
	const { axis, steps } = value;
	if ( settings.headGuideEyesLocked === true && [ "x", "y" ].includes( axis ) ) throw new Error( "Unlock the eye position before moving it" );
	const key = `headGuide${ axis[0].toUpperCase() }${ axis.slice( 1 ) }`;
	const base = [ "background", "opacity" ].includes( axis ) ? Number.isFinite( settings[key] ) ? settings[key] : axis === "background" ? 0.12 : 0.75 : guidePose( { [axis]: settings[key] } )[axis];
	const step = [ "x", "y" ].includes( axis ) ? 0.25 : [ "background", "opacity" ].includes( axis ) ? 0.02 : 0.01;
	const range = [ "x", "y" ].includes( axis ) ? [ -45, 45 ] : axis === "background" ? [ 0, 0.8 ] : axis === "opacity" ? [ 0.2, 1 ] : [ 0.4, 2 ];
	return { [key]: Math.round( Math.max( range[0], Math.min( range[1], base + steps * step ) ) * 100 ) / 100 };
}
