// Check a Sightline Prompter script's {directives} before recording, or as a
// step in an AI script pipeline.
//   node scripts/check-script.mjs path/to/script.md [more files...]
// Exit code 0 means no errors (warnings are allowed); 1 means errors found.
// The rules come from docs/script-directives.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname( fileURLToPath( import.meta.url ) );
const spec = JSON.parse(
	fs.readFileSync( path.join( here, "..", "docs", "script-directives.json" ), "utf8" )
);
const KNOWN = spec.directives;
const BOM = String.fromCharCode( 0xfeff );
const SESSION_REGEX = /\{[^}]*\bpacing\s*:\s*session\b/i;
const HEADING_TARGET_REGEX = /^\s*\{[^}]*\b(?:target|wpm)\b[^}]*\}\s*$/i;

function check( file ) {
	const problems = [];
	const add = ( level, line, text ) => problems.push( { level, line, text } );
	let raw = fs.readFileSync( file, "utf8" );
	if ( raw.startsWith( BOM ) ) raw = raw.slice( 1 );
	const lines = raw.split( /\r?\n/ );
	// YAML front matter (between --- lines) holds settings, not directives.
	let inFront = lines[0]?.trim() === "---";
	let seenSection = false;
	let sectionHasTarget = true;
	let sectionLine = 0;
	let sections = 0;
	// Single takes are timed as a whole, so sections don't need their own targets.
	const session = SESSION_REGEX.test( raw );
	// Notes with pages (a # heading after the first ##, or {page}): the ##
	// headings are bullets, and any target belongs to the page.
	const firstH2 = lines.findIndex( l => /^##\s/.test( l ) );
	const pageBreaks = /\{\s*page\s*\}/i.test( raw ) || lines.some( ( l, k ) => firstH2 >= 0 && k > firstH2 && /^#\s/.test( l ) );
	const notesPages = /\{[^}]*\bmode\s*:\s*(notes|points)\b/i.test( raw ) && pageBreaks;

	const endSection = () => {
		if ( seenSection && !sectionHasTarget && !session && !notesPages ) {
			add( "warning", sectionLine, "Section has no {target: m:ss} or {wpm: n}" );
		}
	};

	lines.forEach( ( text, i ) => {
		const n = i + 1;
		if ( inFront ) {
			if ( i > 0 && text.trim() === "---" ) inFront = false;
			return;
		}
		const isHeading = /^##\s/.test( text ) || /^={3,}\s*SECTION/i.test( text );
		if ( isHeading ) {
			endSection();
			seenSection = true;
			sections++;
			sectionLine = n;
			sectionHasTarget = false;
		}
		// Braces must pair up (escaped \{ \} don't count).
		const unescaped = text.replace( /\\[{}]/g, "" );
		const opens = ( unescaped.match( /\{/g ) ?? [] ).length;
		const closes = ( unescaped.match( /\}/g ) ?? [] ).length;
		if ( opens !== closes ) add( "error", n, "Unmatched { or }" );

		for ( const match of unescaped.matchAll( /\{([^{}]*)\}/g ) ) {
			for ( const part of match[1].split( "," ) ) {
				const [ rawName, ...rest ] = part.split( ":" );
				const name = rawName.trim().toLowerCase();
				const value = rest.join( ":" ).trim();
				if ( !name ) {
					add( "error", n, "Empty directive {}" );
					continue;
				}
				const def = KNOWN[name];
				if ( !def ) {
					add( "error", n, `Unknown directive {${ name }} (allowed: ${ Object.keys( KNOWN ).join( ", " ) })` );
					continue;
				}
				const v = def.value;
				if ( v.type === "enum" && !v.values.includes( value.toLowerCase() ) ) {
					add( "error", n, `{${ name }} must be one of: ${ v.values.join( ", " ) }` );
				} else if ( v.type === "integer" ) {
					const num = Number( value );
					if ( !Number.isInteger( num ) || num < v.minimum || num > v.maximum ) {
						add( "error", n, `{${ name }} must be a whole number from ${ v.minimum } to ${ v.maximum }` );
					}
				} else if ( v.type === "duration" && !new RegExp( v.pattern ).test( value ) ) {
					add( "error", n, `{${ name }} must look like m:ss, for example ${ v.example }` );
				} else if ( v.type === "optional-seconds" && value && !new RegExp( v.pattern ).test( value ) ) {
					add( "error", n, `{${ name }} takes a number of seconds, for example ${ v.example }` );
				} else if ( v.type === "optional-text" && value && value.length > ( v.maxLength ?? 40 ) ) {
					add( "warning", n, `{${ name }} label is long; keep it to ${ v.maxLength ?? 40 } characters` );
				} else if ( v.type === "none" && value ) {
					add( "error", n, `{${ name }} doesn't take a value` );
				}
				if ( isHeading && ( name === "target" || name === "wpm" ) ) sectionHasTarget = true;
			}
		}
		// A directive on its own line straight after a heading belongs to it.
		const afterHeading = !isHeading && seenSection && n === sectionLine + 2;
		if ( afterHeading && HEADING_TARGET_REGEX.test( text ) ) sectionHasTarget = true;
		if ( /\[[^\]]*\{[^}]*\}[^\]]*\]/.test( unescaped ) ) {
			add( "error", n, "Directive inside a [note]: notes never control the app" );
		}
	} );
	endSection();
	if ( !sections ) add( "warning", 1, "No sections (## headings or === SECTION lines)" );
	return problems;
}

const files = process.argv.slice( 2 );
if ( !files.length ) {
	console.log( "Usage: node scripts/check-script.mjs script.md [more files...]" );
	process.exitCode = 2;
} else {
	let errors = 0;
	for ( const file of files ) {
		const problems = check( file );
		const e = problems.filter( p => p.level === "error" ).length;
		errors += e;
		const warnings = problems.length - e;
		console.log( `${ file }: ${ e ? `${ e } error(s)` : "OK" }${ warnings ? `, ${ warnings } warning(s)` : "" }` );
		for ( const p of problems.sort( ( a, b ) => a.line - b.line ) ) {
			console.log( `  line ${ p.line }: ${ p.level }: ${ p.text }` );
		}
	}
	process.exitCode = errors ? 1 : 0;
}
