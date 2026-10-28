// Drive Sightline Prompter from the command line, for an AI agent (Claude
// Code, Codex) or a script: load scripts into slots, run the prompter, and
// fetch the take log and edit pack afterwards. Talks to the app's local API
// (Settings > Remotes > "Let an AI assistant or script on this computer…"),
// reading its address and token from remote-control.json, and never prints
// the token.
//
//   node scripts/sightline.mjs status
//   node scripts/sightline.mjs open <script file> [slot]
//   node scripts/sightline.mjs load <script file> [slot]      (sends the text; the app keeps a copy)
//   node scripts/sightline.mjs slot <1-9>
//   node scripts/sightline.mjs command <action> [value]       (play, pause, go-to-section 3, set-wpm 140…)
//   node scripts/sightline.mjs window <minimize|maximize|fullscreen>
//   node scripts/sightline.mjs logs                           (lists the take logs)
//   node scripts/sightline.mjs takelog [script name] [date]   (prints the take log's path)
//   node scripts/sightline.mjs pack [script name] [date] [output folder]
//   node scripts/sightline.mjs heard [script name] [date]       (what voice scrolling misheard)
//   node scripts/sightline.mjs pace [script name] [date] [--json]  (also "rehearsal": each section's pace and every take's)
//
// logs, takelog and pack read the files directly, so they work with the app
// closed. Dates are yyyy-mm-dd; the default is today and the current script.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editPack } from "../src/client/edit-pack.js";
import { pickTakes, takePace } from "../src/client/take-log.js";
import { heardReport, printHeardReport } from "./heard-report.mjs";

const here = path.dirname( fileURLToPath( import.meta.url ) );

function settingsFolder() {
	if ( process.env.SIGHTLINE_SETTINGS ) return process.env.SIGHTLINE_SETTINGS;
	if ( process.platform === "win32" ) return path.join( process.env.APPDATA ?? "", "Sightline Prompter" );
	if ( process.platform === "darwin" ) return path.join( os.homedir(), "Library", "Application Support", "Sightline Prompter" );
	return path.join( process.env.XDG_CONFIG_HOME ?? path.join( os.homedir(), ".config" ), "Sightline Prompter" );
}

const logDir = () => path.join( settingsFolder(), "take-logs" );
const today = () => new Date().toLocaleDateString( "en-CA" );
// Stops with a message and exit code 1.
class Stop extends Error {}
const fail = ( message ) => {
	throw new Stop( message );
};

async function api( method, route, body ) {
	let remote;
	try {
		remote = JSON.parse( fs.readFileSync( path.join( settingsFolder(), "remote-control.json" ), "utf8" ) );
	} catch {
		fail( "Sightline isn't open with remote control on. In the app: Settings > Remotes > tick \"Let an AI assistant or script on this computer load scripts and control the teleprompter\"." );
	}
	let res;
	try {
		res = await fetch( remote.url + route, {
			method,
			headers: { Authorization: `Bearer ${ remote.token }`, "Content-Type": "application/json" },
			body: body ? JSON.stringify( body ) : undefined
		} );
	} catch {
		fail( "Couldn't reach Sightline. Is it open, with remote control on?" );
	}
	const data = await res.json().catch( () => ( {} ) );
	if ( !res.ok ) fail( `Sightline said: ${ data.error ?? res.status }` );
	return data;
}

const slotOf = value => ( value === undefined ? undefined : Number( value ) );

// The take log for a script and date: "<script> <yyyy-mm-dd>.json".
async function findTakeLog( name, date = today() ) {
	let script = name;
	if ( !script ) {
		const status = await api( "GET", "/status" );
		if ( !status.file ) fail( "No script is open in Sightline. Name one: takelog \"My script\"" );
		script = path.basename( status.file, path.extname( status.file ) );
	}
	const file = path.join( logDir(), `${ script.replace( /\.(md|txt|json)$/i, "" ) } ${ date }.json` );
	if ( !fs.existsSync( file ) ) fail( `No take log for "${ script }" on ${ date }. See: node scripts/sightline.mjs logs` );
	return file;
}

const [ verb, ...args ] = process.argv.slice( 2 );
const print = data => console.log( JSON.stringify( data, null, 2 ) );

try {
	switch ( verb ) {
		case "status":
			print( await api( "GET", "/status" ) );
			break;
		case "open": {
			if ( !args[0] ) fail( "Usage: open <script file> [slot]" );
			print( await api( "POST", "/open", { path: path.resolve( args[0] ), slot: slotOf( args[1] ) } ) );
			break;
		}
		case "load": {
			if ( !args[0] ) fail( "Usage: load <script file> [slot]" );
			const text = fs.readFileSync( args[0], "utf8" );
			const ext = path.extname( args[0] ).toLowerCase();
			print( await api( "POST", "/load-text", {
				text,
				name: path.basename( args[0], ext ),
				format: ext === ".txt" ? "txt" : "md",
				slot: slotOf( args[1] )
			} ) );
			break;
		}
		case "slot":
			print( await api( "POST", "/slot", { slot: slotOf( args[0] ) } ) );
			break;
		case "command": {
			if ( !args[0] ) fail( "Usage: command <action> [value]" );
			const value = args[1] === undefined ? undefined : Number.isNaN( Number( args[1] ) ) ? args[1] : Number( args[1] );
			print( await api( "POST", "/command", { action: args[0], value } ) );
			break;
		}
		case "window":
			print( await api( "POST", "/window", { action: args[0] } ) );
			break;
		case "logs": {
			const files = fs.existsSync( logDir() ) ? fs.readdirSync( logDir() ).filter( f => f.endsWith( ".json" ) ) : [];
			if ( !files.length ) console.log( "No take logs yet." );
			for ( const f of files.sort() ) console.log( path.join( logDir(), f ) );
			break;
		}
		// A run's pace (a rehearsal or a recording): each section's summary, then
		// every take, from the take log's word timings (voice mode).
		case "pace":
		case "rehearsal": {
			const json = args.includes( "--json" );
			const [ name, day ] = args.filter( a => a !== "--json" );
			const file = await findTakeLog( name, day );
			const data = JSON.parse( fs.readFileSync( file, "utf8" ) );
			const sections = pickTakes( data.takes ?? [] );
			const takes = ( data.takes ?? [] ).map( t => ( { section: t.section, take: t.take, title: t.title, status: t.status, rating: t.rating, duration: t.duration, targetSeconds: t.target ?? null, ...( takePace( t ) ?? {} ) } ) );
			if ( json ) {
				print( { file, sections, takes } );
				break;
			}
			console.log( file );
			for ( const s of sections ) console.log( s.summary ?? `S${ s.section }: no word timings (steady scrolling)` );
			console.log( "\nsection,take,status,rating,duration,words,spoken_seconds,speaking_seconds,speaking_wpm,overall_wpm,target_seconds,vs_target_seconds" );
			for ( const t of takes ) {
				console.log( [ t.section, t.take, t.status, t.rating ?? "", t.duration ?? "", t.words ?? "", t.spokenSeconds ?? "", t.speakingSeconds ?? "", t.speakingWpm ?? "", t.overallWpm ?? "", t.targetSeconds ?? "", t.vsTargetSeconds ?? "" ].join( "," ) );
			}
			break;
		}
		case "takelog":
			console.log( await findTakeLog( args[0], args[1] ) );
			break;
		case "heard": {
			let script = args[0];
			if ( !script ) {
				const status = await api( "GET", "/status" );
				if ( !status.file ) fail( "No script is open in Sightline. Name one: heard \"My script\"" );
				script = path.basename( status.file, path.extname( status.file ) );
			}
			const day = args[1] ?? today();
			const file = path.join( settingsFolder(), "heard-logs", `${ script.replace( /\.(md|txt|jsonl?)$/i, "" ) } ${ day }.jsonl` );
			if ( !fs.existsSync( file ) ) fail( `No heard log for "${ script }" on ${ day }. It's written while voice scrolling listens.` );
			console.log( file );
			printHeardReport( heardReport( fs.readFileSync( file, "utf8" ).split( /\r?\n/ ) ) );
			break;
		}
		case "pack": {
			const file = await findTakeLog( args[0], args[1] );
			const data = JSON.parse( fs.readFileSync( file, "utf8" ) );
			const folder = args[2] ?? path.join( process.cwd(), `${ path.basename( file, ".json" ) } edit pack` );
			const readme = fs.readFileSync( path.join( here, "..", "docs", "EDIT-PACK.md" ), "utf8" );
			fs.mkdirSync( folder, { recursive: true } );
			for ( const [ name, contents ] of Object.entries( editPack( data, readme ) ) ) {
				fs.writeFileSync( path.join( folder, name ), contents );
			}
			console.log( `${ folder }: ${ data.takes.length } takes` );
			break;
		}
		default:
			console.log( fs.readFileSync( fileURLToPath( import.meta.url ), "utf8" ).split( "\n" ).filter( l => l.startsWith( "//" ) ).map( l => l.slice( 3 ) ).join( "\n" ) );
	}
} catch ( err ) {
	if ( !( err instanceof Stop ) ) throw err;
	console.error( err.message );
	process.exitCode = 1;
}
