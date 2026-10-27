// Are the docs in step with the code about to be committed?
//   node scripts/check-docs-sync.mjs          (checks uncommitted changes)
//   node scripts/check-docs-sync.mjs --json   (machine-readable, for the hook)
// Exit code 1 when a document that must change with this code hasn't. A
// commit message containing "[docs-skip: reason]" is the way past it for
// changes nobody can see (refactors, tests, build tweaks).
// The full checklist is the sightline-docs-sync skill.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const git = ( ...args ) => execFileSync( "git", args, { cwd: root, encoding: "utf8" } );

// Everything not yet committed: staged, unstaged and new files.
const changed = new Set(
	git( "status", "--porcelain", "--untracked-files=all" )
		.split( "\n" )
		.filter( Boolean )
		.map( line => line.slice( 3 ).replace( /^"|"$/g, "" ).split( " -> " ).pop() )
);
const has = file => changed.has( file );
const any = test => [ ...changed ].some( test );

// Code people see or use (not the generated editor bundle).
const userFacing = any(
	f => /^src\/.+\.(js|mjs|html|css)$/.test( f ) && !f.endsWith( "editor-bundle.js" )
);
const guideChanged = any( f => f.startsWith( "docs/guide/" ) && f.endsWith( ".md" ) );

const missing = []; // must change too: the check fails
const reminders = []; // worth a look: reported, never fails

if ( userFacing && !has( "readme.md" ) ) {
	missing.push( "readme.md: add a change-log entry for what changed (or [docs-skip] if nobody would notice)" );
}

const uiFiles = [ "src/client/teleprompter.html", "src/menus.js", "src/client/shortcuts.js" ];
if ( uiFiles.some( has ) && !guideChanged ) {
	missing.push( "docs/guide/*.md: the menus, Settings or controls changed, so update the user guide pages that describe them" );
}

const directiveFiles = [ "src/client/decorate.js", "src/client/directives.js", "docs/script-directives.json" ];
if ( directiveFiles.some( has ) ) {
	for ( const doc of [ "docs/SCRIPT-DIRECTIVES.md", "docs/AI-SCRIPT-BRIEF.md", "docs/script-directives.json" ] ) {
		if ( !has( doc ) ) missing.push( `${ doc }: script directives changed, so keep the spec, the AI script prompt and the checker's rules in step` );
	}
}

if ( has( "src/client/voice-commands.js" ) && !has( "docs/guide/03-scrolling-and-voice.md" ) ) {
	missing.push( "docs/guide/03-scrolling-and-voice.md: the voice commands changed, so update the commands table" );
}

if ( has( "src/menus.js" ) && !has( "src/client/shortcuts.js" ) && !has( "docs/guide/08-shortcuts-and-troubleshooting.md" ) ) {
	reminders.push( "menus.js changed: if a keyboard shortcut was added or changed, update src/client/shortcuts.js (the F1 panel) and docs/guide/08" );
}
if ( userFacing && !has( "docs/FEATURES.md" ) ) {
	reminders.push( "docs/FEATURES.md: if this is a new feature, add it to the feature list (and its at-a-glance table)" );
}
if ( userFacing && !has( "ROADMAP.md" ) ) {
	reminders.push( "ROADMAP.md: if this finishes a roadmap item, tick it ✅" );
}
if ( any( f => /^src\/client\/.+\.(html|css)$/.test( f ) ) && !any( f => f.startsWith( "docs/guide/images/" ) ) ) {
	reminders.push( "docs/guide/images: the look changed, so retake any screenshots it affects (and the copies on joannelockwood.co.uk/sightline)" );
}
if ( userFacing ) {
	reminders.push( "src/samples: does a sample script show this off? The welcome tour and 'Voice control, stops and countdowns' are the showcases" );
	reminders.push( "joannelockwood.co.uk/sightline: does the page (features, controls, FAQ, carousel) need this? Deploying it needs Joanne's go" );
}

if ( process.argv.includes( "--json" ) ) {
	console.log( JSON.stringify( { missing, reminders, changed: [ ...changed ] } ) );
} else {
	if ( !changed.size ) console.log( "Nothing to commit." );
	for ( const m of missing ) console.log( `MISSING   ${ m }` );
	for ( const r of reminders ) console.log( `CHECK     ${ r }` );
	if ( changed.size && !missing.length ) console.log( "Docs are in step with the code." );
}
process.exitCode = missing.length ? 1 : 0;
