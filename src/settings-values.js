import { pickKnown } from "./utils/settings-file.js";
import { normalisePadLayout } from "./client/control-actions.js";
import { normaliseMappings } from "./client/input-mappings.js";
import { READING_FONTS, normaliseReadingThemes } from "./client/reading-appearance.js";

// The file importer and local API use the same validation and protected keys.
export function settingsValues( values, defaults, protectedKeys = [] ) {
	if ( !values || typeof values !== "object" || Array.isArray( values ) ) throw Object.assign( new Error( "Settings must be an object" ), { status: 400 } );
	const known = pickKnown( values, defaults );
	for ( const [ key, min, max ] of [ [ "productionNoteScale", 10 / 55, 200 / 55 ], [ "productionNoteLineHeight", 1, 2.5 ], [ "directionScale", 10 / 85, 400 / 85 ], [ "headingScale", 10 / 150, 400 / 150 ] ] ) {
		if ( Object.hasOwn( known, key ) && ( known[key] < min || known[key] > max ) ) throw Object.assign( new Error( `${ key } must be between ${ min } and ${ max }` ), { status: 400 } );
	}
	for ( const key of [ "scriptColour", "headingColour", "directionColour", "productionNoteColour", "backgroundColour" ] ) {
		if ( Object.hasOwn( known, key ) && known[key] !== "" && !/^#[\da-f]{6}$/i.test( known[key] ) ) throw Object.assign( new Error( `${ key } must be a six-digit hex colour or empty for Theme` ), { status: 400 } );
	}
	for ( const key of [ "scriptFont", "headingFont", "directionFont", "productionNoteFont" ] ) if ( Object.hasOwn( known, key ) && ( !Object.hasOwn( READING_FONTS, known[key] ) || ( key === "scriptFont" && known[key] === "same" ) ) ) throw Object.assign( new Error( `Unsupported ${ key }` ), { status: 400 } );
	if ( Object.hasOwn( values, "readingThemes" ) && Object.hasOwn( defaults, "readingThemes" ) ) {
		try {
			known.readingThemes = normaliseReadingThemes( values.readingThemes );
		} catch ( error ) {
			throw Object.assign( error, { status: 400 } );
		}
	}
	if ( Object.hasOwn( defaults, "inputMappings" ) && Object.hasOwn( values, "inputMappings" ) ) {
		try {
			known.inputMappings = values.inputMappings === null ? null : normaliseMappings( values.inputMappings );
		} catch ( err ) {
			throw Object.assign( err, { status: 400 } );
		}
	}
	if ( Object.hasOwn( defaults, "padLayout" ) && Object.hasOwn( values, "padLayout" ) ) {
		const value = values.padLayout;
		if ( value !== null && ( typeof value !== "object" || Array.isArray( value ) || !Array.isArray( value.buttons ) || ( value.columns !== undefined && ![ 2, 3, 4, 6 ].includes( value.columns ) ) ) ) {
			throw Object.assign( new Error( "padLayout needs a buttons list and 2, 3, 4 or 6 columns" ), { status: 400 } );
		}
		known.padLayout = value === null ? null : normalisePadLayout( value );
	}
	for ( const key of protectedKeys ) delete known[key];
	return known;
}
