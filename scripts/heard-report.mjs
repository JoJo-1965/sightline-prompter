// What voice scrolling keeps mishearing: reads a heard log (Sightline's
// heard-logs folder, one line per chunk heard) and lines each chunk up with
// the script words around it, then counts the words heard in place of
// script words ("paws" for "pause"). The result is the list of corrections
// worth building in (roadmap 20).
//   node scripts/heard-report.mjs "path/to/<script> <date>.jsonl" [--json]

import fs from "node:fs";

const norm = w => w.toLowerCase().replace( /[^\w]/g, "" );

// How alike two words are, 0 to 1 (letters in common, in order).
function alike( a, b ) {
	const d = Array.from( { length: a.length + 1 }, ( _, i ) => [ i, ...new Array( b.length ).fill( 0 ) ] );
	for ( let j = 1; j <= b.length; j++ ) d[0][j] = j;
	for ( let i = 1; i <= a.length; i++ ) {
		for ( let j = 1; j <= b.length; j++ ) {
			d[i][j] = Math.min( d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + ( a[i - 1] === b[j - 1] ? 0 : 1 ) );
		}
	}
	const letters = 1 - d[a.length][b.length] / Math.max( a.length, b.length, 1 );
	// A word heard short or long ("set" for "setting", "you" for "you've").
	let prefix = 0;
	while ( prefix < a.length && prefix < b.length && a[prefix] === b[prefix] ) prefix++;
	const shorter = Math.min( a.length, b.length );
	return Math.max( letters, shorter >= 3 ? prefix / shorter : 0 );
}

// Word-level alignment (edit distance), returning [heard, script] pairs;
// null on one side for a word only on the other.
function align( heard, script ) {
	const n = heard.length;
	const m = script.length;
	const cost = Array.from( { length: n + 1 }, () => new Array( m + 1 ).fill( 0 ) );
	for ( let i = 0; i <= n; i++ ) cost[i][0] = i;
	for ( let j = 0; j <= m; j++ ) cost[0][j] = j * 0.5; // script words around the chunk are cheap to skip
	// Pairing two different words costs less the more alike they look, so a
	// mishearing ("paws") lines up with the word it should have been.
	const swap = ( a, b ) => {
		const x = norm( a );
		const y = norm( b );
		return x === y ? 0 : 1 - 0.6 * alike( x, y );
	};
	for ( let i = 1; i <= n; i++ ) {
		for ( let j = 1; j <= m; j++ ) {
			cost[i][j] = Math.min(
				cost[i - 1][j - 1] + swap( heard[i - 1], script[j - 1] ),
				cost[i - 1][j] + 1,
				cost[i][j - 1] + 0.5
			);
		}
	}
	const pairs = [];
	let i = n;
	let j = m;
	while ( i > 0 || j > 0 ) {
		if ( i > 0 && j > 0 && Math.abs( cost[i][j] - ( cost[i - 1][j - 1] + swap( heard[i - 1], script[j - 1] ) ) ) < 1e-9 ) {
			pairs.push( [ heard[i - 1], script[j - 1] ] );
			i--;
			j--;
		} else if ( i > 0 && Math.abs( cost[i][j] - ( cost[i - 1][j] + 1 ) ) < 1e-9 ) {
			pairs.push( [ heard[i - 1], null ] );
			i--;
		} else {
			j--;
		}
	}
	return pairs.reverse();
}

export function heardReport( lines ) {
	const swaps = new Map(); // "heard → script": count
	const extras = new Map(); // words heard that weren't in the script
	let chunks = 0;
	let words = 0;
	let matched = 0;
	let unplaced = 0; // heard where the follower wasn't sure of the place
	for ( const line of lines ) {
		let entry;
		try {
			entry = JSON.parse( line );
		} catch {
			continue;
		}
		if ( !entry?.heard ) continue;
		chunks++;
		const heard = entry.heard.split( /\s+/ ).filter( w => norm( w ) );
		const script = String( entry.script ?? "" ).split( /\s+/ ).filter( w => norm( w ) );
		words += heard.length;
		for ( const [ h, s ] of align( heard, script ) ) {
			if ( s === null ) {
				extras.set( norm( h ), ( extras.get( norm( h ) ) ?? 0 ) + 1 );
			} else if ( norm( h ) === norm( s ) ) {
				matched++;
			} else if ( alike( norm( h ), norm( s ) ) >= 0.5 ) {
				// Close enough to be the same word misheard.
				const key = `${ norm( h ) } → ${ norm( s ) }`;
				swaps.set( key, ( swaps.get( key ) ?? 0 ) + 1 );
			} else {
				unplaced++;
			}
		}
	}
	const top = map => [ ...map.entries() ].sort( ( a, b ) => b[1] - a[1] );
	return {
		chunks,
		words,
		matched,
		unplaced,
		misheard: top( swaps ).map( ( [ pair, count ] ) => ( { pair, count } ) ),
		notInScript: top( extras ).map( ( [ word, count ] ) => ( { word, count } ) )
	};
}

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
