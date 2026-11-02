import fs from "node:fs/promises";
import { normaliseReadingTheme } from "./client/reading-appearance.js";

export async function readReadingTheme( file ) {
	if ( ( await fs.stat( file ) ).size > 100000 ) throw new Error( "Choose a reading-theme file smaller than 100 KB" );
	try {
		return normaliseReadingTheme( JSON.parse( await fs.readFile( file, "utf8" ) ) );
	} catch ( error ) {
		if ( error instanceof SyntaxError ) throw new Error( "This is not a valid reading-theme JSON file", { cause: error } );
		throw error;
	}
}
export async function writeReadingTheme( file, input ) {
	const theme = normaliseReadingTheme( input );
	await fs.writeFile( file, `${ JSON.stringify( theme, null, 2 ) }\n`, "utf8" );
	return theme;
}
