// Reading presets deliberately contain appearance only. This module is shared
// by the renderer, settings-file validation and native theme import/export.
export const READING_PALETTES = {
	default: { name: "Standard", script: "#ffffff", headings: "#f1d082", inline: "#c2d3d1", production: "#a8cedf", background: "#000000" },
	yellow: { name: "Yellow on dark", script: "#ffeb80", headings: "#fff4b3", inline: "#d9cf9b", production: "#d4c89f", background: "#000000" },
	contrast: { name: "High contrast", script: "#ffffff", headings: "#ffffff", inline: "#ffffff", production: "#ffffff", background: "#000000" },
	cream: { name: "Soft cream", script: "#28231e", headings: "#5c3518", inline: "#5a5148", production: "#4a5666", background: "#f5eddc" }
};
export const READING_FONTS = { default: "Segoe UI", verdana: "Verdana", atkinson: "Atkinson Hyperlegible", opendyslexic: "OpenDyslexic", same: "Follow script" };
export const TEXT_TARGETS = [ [ "script", "Spoken script" ], [ "headings", "Headings" ], [ "inline", "Inline directions" ], [ "production", "Production notes" ] ];
export const TEXT_FIELDS = {
	script: { font: "scriptFont", colour: "scriptColour", bold: "scriptBold", italic: "scriptItalic", spacing: "lineHeight", scale: 100 },
	headings: { font: "headingFont", colour: "headingColour", bold: "headingBold", italic: "headingItalic", spacing: "headingLineHeight", size: "headingScale", scale: 150 },
	inline: { font: "directionFont", colour: "directionColour", bold: "directionBold", italic: "directionItalic", spacing: "directionLineHeight", size: "directionScale", scale: 85 },
	production: { font: "productionNoteFont", colour: "productionNoteColour", bold: "productionNoteBold", italic: "productionNoteItalic", spacing: "productionNoteLineHeight", size: "productionNoteScale", scale: 55 }
};
export const APPEARANCE_DEFAULTS = {
	readingAppearanceVersion: 1,
	paragraphSpacing: 1,
	scriptColour: "", headingColour: "", backgroundColour: "",
	directionFont: "same", productionNoteFont: "same",
	scriptBold: false, scriptItalic: false, headingBold: true, headingItalic: false,
	directionBold: false, directionItalic: true, productionNoteBold: false, productionNoteItalic: false,
	readingThemes: [], activeReadingTheme: ""
};
export const APPEARANCE_KEYS = [ "theme", "directions", "lineHeight", "headingLineHeight", "directionLineHeight", "headingScale", "directionScale", "productionNoteScale", "productionNoteLineHeight", "directionColour", "productionNoteColour", "scriptFont", "headingFont", "textOpacity", "textBrightness", "backingOnAir", ...Object.keys( APPEARANCE_DEFAULTS ).filter( key => ![ "readingThemes", "activeReadingTheme" ].includes( key ) ) ];
const hex = value => typeof value === "string" && /^#[\da-f]{6}$/i.test( value );
const round = n => Math.round( n * 1000 ) / 1000;
const number = ( value, min, max, label ) => {
	if ( !Number.isFinite( value ) || value < min || value > max ) throw new Error( `${ label } must be between ${ min } and ${ max }` );
	return round( value );
};

export function upgradeReadingAppearance( previous = {} ) {
	if ( previous.readingAppearanceVersion >= 1 ) return { ...previous };
	const next = { ...previous, readingAppearanceVersion: 1 };
	// Normal directions used a larger font than dimmed ones. Preserve that
	// appearance once; visibility no longer changes their size afterwards.
	if ( previous.directions === "normal" ) next.directionScale = ( previous.directionScale ?? 1 ) / 0.85;
	next.directionFont = previous.headingFont ?? "same";
	next.productionNoteFont = previous.headingFont ?? "same";
	if ( previous.theme === "cream" ) Object.assign( next, { scriptColour: previous.scriptColour || "#f3e9d2", headingColour: previous.headingColour || "#f7d9a8", directionColour: previous.directionColour || "#c2d3d1", productionNoteColour: previous.productionNoteColour || "#f3e9d2", backgroundColour: previous.backgroundColour || "#000000" } );
	return next;
}

export function appearanceFromSettings( settings, { fontSize = 3, opacity = 1 } = {} ) {
	const text = {};
	for ( const [ target ] of TEXT_TARGETS ) {
		const f = TEXT_FIELDS[target];
		text[target] = {
			font: READING_FONTS[settings[f.font] ?? ( target === "script" ? "default" : "same" )] ?? "Segoe UI",
			size: round( target === "script" ? fontSize * 100 : ( settings[f.size] ?? 1 ) * f.scale ),
			color: hex( settings[f.colour] ) ? settings[f.colour] : null,
			bold: settings[f.bold] ?? APPEARANCE_DEFAULTS[f.bold], italic: settings[f.italic] ?? APPEARANCE_DEFAULTS[f.italic],
			spacing: round( ( settings[f.spacing] ?? ( target === "production" ? 1.4 : 1.3 ) ) * 100 )
		};
		if ( target === "inline" ) text[target].visibility = ( { dim: "Dimmed", hide: "Hidden", normal: "Normal" } )[settings.directions ?? "dim"];
		if ( target === "script" ) text.script.paragraphSpacing = round( ( settings.paragraphSpacing ?? 1 ) * 100 );
	}
	return {
		baseTheme: READING_PALETTES[settings.theme] ? READING_PALETTES[settings.theme].name : "Standard", text,
		background: { "background-1": round( opacity * 100 ), "background-2": round( ( settings.backingOnAir ?? 0.07 ) * 100 ), "background-3": round( ( settings.textOpacity ?? 1 ) * 100 ), "background-4": round( ( settings.textBrightness ?? 1 ) * 100 ), "background-colour": hex( settings.backgroundColour ) ? settings.backgroundColour : null }
	};
}

export function normaliseReadingTheme( value ) {
	if ( !value || value.schema !== "sightline-reading-theme" || value.version !== 1 || typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 60 ) throw new Error( "Choose a Sightline reading-theme JSON file" );
	if ( !Object.values( READING_PALETTES ).some( palette => palette.name === value.baseTheme ) ) throw new Error( "The theme uses an unsupported base palette" );
	const text = {};
	for ( const [ target ] of TEXT_TARGETS ) {
		const v = value.text?.[target];
		if ( !v || !Object.values( READING_FONTS ).includes( v.font ) || ( target === "script" && v.font === "Follow script" ) || typeof v.bold !== "boolean" || typeof v.italic !== "boolean" || ( v.color !== null && !hex( v.color ) ) ) throw new Error( `${ target }: invalid font, colour or style` );
		text[target] = { font: v.font, size: number( v.size, target === "script" ? 100 : 10, target === "script" ? 800 : target === "production" ? 200 : 400, `${ target } size` ), color: v.color, bold: v.bold, italic: v.italic, spacing: number( v.spacing, 100, 250, `${ target } line spacing` ) };
		if ( target === "script" ) text.script.paragraphSpacing = number( v.paragraphSpacing === undefined ? 100 : v.paragraphSpacing, 0, 300, "Script paragraph spacing" );
		if ( target === "inline" ) {
			if ( ![ "Normal", "Dimmed", "Hidden" ].includes( v.visibility ) ) throw new Error( "Invalid inline-direction visibility" );
			text.inline.visibility = v.visibility;
		}
	}
	const background = {};
	for ( const [ i, min ] of [ [ 1, 0 ], [ 2, 0 ], [ 3, 20 ], [ 4, 30 ] ] ) background[`background-${ i }`] = number( value.background?.[`background-${ i }`], min, 100, "Background value" );
	const colour = value.background?.["background-colour"] ?? null;
	if ( colour !== null && !hex( colour ) ) throw new Error( "Invalid background colour" );
	background["background-colour"] = colour;
	return { schema: "sightline-reading-theme", version: 1, id: typeof value.id === "string" && /^custom-[\da-z-]{1,100}$/i.test( value.id ) ? value.id : `custom-${ crypto.randomUUID() }`, name: value.name.trim(), baseTheme: value.baseTheme, text, background };
}

export function settingsFromTheme( input ) {
	const theme = normaliseReadingTheme( input ), settings = { readingAppearanceVersion: 1 };
	settings.theme = Object.keys( READING_PALETTES ).find( id => READING_PALETTES[id].name === theme.baseTheme );
	settings.paragraphSpacing = theme.text.script.paragraphSpacing / 100;
	for ( const [ target ] of TEXT_TARGETS ) {
		const f = TEXT_FIELDS[target], v = theme.text[target];
		settings[f.font] = Object.keys( READING_FONTS ).find( id => READING_FONTS[id] === v.font );
		settings[f.colour] = v.color ?? "";
		settings[f.bold] = v.bold;
		settings[f.italic] = v.italic;
		settings[f.spacing] = v.spacing / 100;
		if ( f.size ) settings[f.size] = v.size / f.scale;
	}
	settings.directions = ( { Normal: "normal", Dimmed: "dim", Hidden: "hide" } )[theme.text.inline.visibility];
	settings.backingOnAir = theme.background["background-2"] / 100;
	settings.textOpacity = theme.background["background-3"] / 100;
	settings.textBrightness = theme.background["background-4"] / 100;
	settings.backgroundColour = theme.background["background-colour"] ?? "";
	settings.activeReadingTheme = theme.id;
	return { settings, fontSize: theme.text.script.size / 100, opacity: theme.background["background-1"] / 100 };
}

export function captureReadingTheme( name, settings, display ) {
	return normaliseReadingTheme( { schema: "sightline-reading-theme", version: 1, name, ...appearanceFromSettings( settings, display ) } );
}

export function normaliseReadingThemes( value ) {
	if ( !Array.isArray( value ) || value.length > 50 ) throw new Error( "Keep at most 50 reading themes" );
	const themes = value.map( normaliseReadingTheme );
	if ( new Set( themes.map( theme => theme.id ) ).size !== themes.length || new Set( themes.map( theme => theme.name.toLocaleLowerCase() ) ).size !== themes.length ) throw new Error( "Saved reading themes need unique names and IDs" );
	return themes;
}
