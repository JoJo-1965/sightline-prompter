// Build an edit pack from a take log, without the app: the same files as
// File > Export Edit Pack. For an editing agent, or any take log you have.
//   node scripts/edit-pack.mjs "path/to/take log.json" [output folder]
// The output folder defaults to "<take log name> edit pack" beside the log.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editPack } from "../src/client/edit-pack.js";

const here = path.dirname( fileURLToPath( import.meta.url ) );

function run( input, output ) {
	if ( !input ) return "Usage: node scripts/edit-pack.mjs \"take log.json\" [output folder]";
	let data;
	try {
		data = JSON.parse( fs.readFileSync( input, "utf8" ) );
	} catch ( err ) {
		return `Couldn't read ${ input }: ${ err.message }`;
	}
	if ( !Array.isArray( data.takes ) ) return `${ input } isn't a Sightline take log (no takes)`;

	const folder = output ?? path.join( path.dirname( input ), `${ path.basename( input, ".json" ) } edit pack` );
	const readme = fs.readFileSync( path.join( here, "..", "docs", "EDIT-PACK.md" ), "utf8" );
	fs.mkdirSync( folder, { recursive: true } );
	for ( const [ name, contents ] of Object.entries( editPack( data, readme ) ) ) {
		fs.writeFileSync( path.join( folder, name ), contents );
	}
	const words = data.takes.reduce( ( n, t ) => n + ( t.words?.length ?? 0 ), 0 );
	console.log( `${ folder }: ${ data.takes.length } takes, ${ words } words` );
	return null;
}

const problem = run( ...process.argv.slice( 2 ) );
if ( problem ) {
	console.error( problem );
	process.exitCode = 1;
}
