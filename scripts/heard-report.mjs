// What voice scrolling keeps mishearing: reads a heard log (Sightline's
// heard-logs folder, one line per chunk heard) and lines each chunk up with
// the script words around it, then counts the words heard in place of
// script words ("paws" for "pause"). The result is the list of corrections
// worth building in (roadmap 20).
//   node scripts/heard-report.mjs "path/to/<script> <date>.jsonl" [--json]

import fs from "node:fs";
import { heardReport } from "../src/heard-report.js";

export { heardReport };

export function printHeardReport( report ) {
	const share = report.words ? Math.round( ( report.matched / report.words ) * 100 ) : 0;
	console.log( `${ report.words } words heard in ${ report.chunks } chunks; ${ share }% matched the script word for word; ${ report.unplaced } couldn't be placed.` );
	console.log( "\nHeard in place of a script word (heard → script), most often first:" );
	for ( const { pair, count } of report.misheard.slice( 0, 40 ) ) console.log( `  ${ String( count ).padStart( 3 ) } × ${ pair }` );
	if ( !report.misheard.length ) console.log( "  none" );
	console.log( "\nHeard but not in the script (fillers, ad-libs, commands):" );
	for ( const { word, count } of report.notInScript.slice( 0, 20 ) ) console.log( `  ${ String( count ).padStart( 3 ) } × ${ word }` );
	if ( !report.notInScript.length ) console.log( "  none" );
}

if ( process.argv[1] && import.meta.url.endsWith( process.argv[1].replace( /\\/g, "/" ).split( "/" ).pop() ) ) {
	const [ file, flag ] = process.argv.slice( 2 );
	if ( !file ) {
		console.error( "Usage: node scripts/heard-report.mjs \"<script> <date>.jsonl\" [--json]" );
		process.exitCode = 1;
	} else {
		const report = heardReport( fs.readFileSync( file, "utf8" ).split( "\n" ) );
		if ( flag === "--json" ) console.log( JSON.stringify( report, null, 2 ) );
		else printHeardReport( report );
	}
}
