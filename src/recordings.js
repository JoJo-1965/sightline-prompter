// The recordings library (File > Recordings, and the local API): each take
// log in the take-logs folder is one recording session. Names, notes and
// "processed" are kept beside the logs in library.json, so the logs
// themselves stay exactly as the take log wrote them.

import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { editPack } from "./client/edit-pack.js";
import { pickTakes } from "./client/take-log.js";

const LIBRARY = "library.json";

async function readLibrary( dir ) {
	try {
		return JSON.parse( await fs.readFile( path.join( dir, LIBRARY ), "utf-8" ) );
	} catch {
		return {};
	}
}

const writeLibrary = ( dir, library ) =>
	fs.writeFile( path.join( dir, LIBRARY ), JSON.stringify( library, null, 2 ) );

// Changes to library.json one at a time, so a name and a tick saved together
// don't overwrite each other.
let libraryQueue = Promise.resolve();
function changeLibrary( dir, change ) {
	const next = libraryQueue.then( async () => {
		const library = await readLibrary( dir );
		if ( change( library ) !== false ) await writeLibrary( dir, library );
	} );
	libraryQueue = next.catch( () => {} );
	return next;
}

// A session's id is its file name without .json, such as "M2 Intro 2026-10-28".
// Anything that isn't a take log in the folder is refused (a 404 for the API).
const unknown = message => Object.assign( new Error( message ), { status: 404 } );
async function logPath( dir, id ) {
	if ( typeof id !== "string" || !id || /[\\/]/.test( id ) || id + ".json" === LIBRARY ) {
		throw unknown( "Unknown recording" );
	}
	const file = path.join( dir, `${ id }.json` );
	try {
		await fs.access( file );
	} catch {
		throw unknown( `No recording called "${ id }". See the list: GET /recordings, or sightline.mjs recordings` );
	}
	return file;
}

const round1 = n => Math.round( n * 10 ) / 10;

function summarise( id, log, meta = {}, modified = null ) {
	const takes = log.takes ?? [];
	const sections = log.sections ?? pickTakes( takes );
	const used = sections
		.map( s => takes.find( t => t.section === s.section && t.take === s.use ) )
		.filter( Boolean );
	return {
		id,
		title: meta.title ?? null,
		note: meta.note ?? null,
		processed: meta.processed ?? null,
		script: log.script ?? null,
		date: log.date ?? null,
		startedAt: log.startedAt ?? null,
		modified,
		takes: takes.length,
		sections: sections.length,
		keepers: takes.filter( t => t.rating === "keeper" ).length,
		scrapped: takes.filter( t => t.rating === "scrap" ).length,
		// Seconds: every take, and only the takes the log picks for the edit.
		recordedSeconds: round1( takes.reduce( ( n, t ) => n + ( t.duration ?? 0 ), 0 ) ),
		editSeconds: round1( used.reduce( ( n, t ) => n + ( t.duration ?? 0 ), 0 ) ),
		voice: takes.some( t => t.words?.length )
	};
}

// Every session, newest first.
export async function listRecordings( dir ) {
	let names;
	try {
		names = await fs.readdir( dir );
	} catch {
		return [];
	}
	const library = await readLibrary( dir );
	const list = [];
	for ( const name of names ) {
		if ( !name.endsWith( ".json" ) || name === LIBRARY ) continue;
		const id = name.slice( 0, -5 );
		try {
			const file = path.join( dir, name );
			const log = JSON.parse( await fs.readFile( file, "utf-8" ) );
			// A log with no takes yet (a script opened, nothing read) isn't a recording.
			if ( !Array.isArray( log.takes ) || !log.takes.length ) continue;
			const { mtime } = await fs.stat( file );
			list.push( summarise( id, log, library[id], mtime.toISOString() ) );
		} catch {
			// not a take log, or half written: leave it out
		}
	}
	return list.sort( ( a, b ) => String( b.modified ).localeCompare( String( a.modified ) ) );
}

// One session: its summary and each take (without the word lists).
export async function readRecording( dir, id ) {
	const file = await logPath( dir, id );
	const log = JSON.parse( await fs.readFile( file, "utf-8" ) );
	const library = await readLibrary( dir );
	const { mtime } = await fs.stat( file );
	const sections = log.sections ?? pickTakes( log.takes ?? [] );
	const takes = ( log.takes ?? [] ).map( t => ( {
		section: t.section,
		title: t.title,
		take: t.take,
		duration: t.duration,
		status: t.status,
		rating: t.rating ?? null,
		used: sections.some( s => s.section === t.section && s.use === t.take ),
		words: t.words?.length ?? 0,
		markers: t.markerList?.length ?? t.markers?.length ?? 0,
		restarts: t.restarts?.length ?? 0
	} ) );
	return { ...summarise( id, log, library[id], mtime.toISOString() ), takeList: takes };
}

// Name, note and processed: null or "" clears one.
export async function updateRecording( dir, id, changes ) {
	await logPath( dir, id );
	await changeLibrary( dir, ( library ) => {
		const meta = { ...library[id] };
		for ( const key of [ "title", "note" ] ) {
			if ( !( key in changes ) ) continue;
			const value = String( changes[key] ?? "" ).trim().slice( 0, key === "title" ? 120 : 2000 );
			if ( value ) meta[key] = value;
			else delete meta[key];
		}
		if ( "processed" in changes ) {
			if ( changes.processed ) meta.processed = new Date().toISOString();
			else delete meta.processed;
		}
		if ( Object.keys( meta ).length ) library[id] = meta;
		else delete library[id];
	} );
	return ( await listRecordings( dir ) ).find( r => r.id === id );
}

// To the Recycle Bin (trash is Electron's shell.trashItem), with its name and note.
export async function deleteRecording( dir, id, trash ) {
	const file = await logPath( dir, id );
	await trash( file );
	await changeLibrary( dir, ( library ) => {
		if ( !library[id] ) return false;
		delete library[id];
	} );
	return { ok: true, deleted: id };
}

// The edit pack's files for a session: { "take-log.json": "…", … }.
export async function recordingPack( dir, id, readme = "" ) {
	const file = await logPath( dir, id );
	const log = JSON.parse( await fs.readFile( file, "utf-8" ) );
	return editPack( log, readme );
}

// A zip of { name: contents } (deflated, no folders), for "Export as zip".
export function zipFiles( files ) {
	const local = [];
	const central = [];
	let offset = 0;
	const stamp = dosTime( new Date() );
	for ( const [ name, contents ] of Object.entries( files ) ) {
		const data = Buffer.from( contents );
		const packed = zlib.deflateRawSync( data );
		const crc = zlib.crc32( data );
		const nameBuf = Buffer.from( name, "utf-8" );
		const head = Buffer.alloc( 30 );
		head.writeUInt32LE( 0x04034b50, 0 );
		head.writeUInt16LE( 20, 4 );
		head.writeUInt16LE( 0x0800, 6 ); // UTF-8 names
		head.writeUInt16LE( 8, 8 ); // deflate
		head.writeUInt32LE( stamp, 10 );
		head.writeUInt32LE( crc, 14 );
		head.writeUInt32LE( packed.length, 18 );
		head.writeUInt32LE( data.length, 22 );
		head.writeUInt16LE( nameBuf.length, 26 );
		local.push( head, nameBuf, packed );
		const entry = Buffer.alloc( 46 );
		entry.writeUInt32LE( 0x02014b50, 0 );
		entry.writeUInt16LE( 20, 4 );
		entry.writeUInt16LE( 20, 6 );
		entry.writeUInt16LE( 0x0800, 8 );
		entry.writeUInt16LE( 8, 10 );
		entry.writeUInt32LE( stamp, 12 );
		entry.writeUInt32LE( crc, 16 );
		entry.writeUInt32LE( packed.length, 20 );
		entry.writeUInt32LE( data.length, 24 );
		entry.writeUInt16LE( nameBuf.length, 28 );
		entry.writeUInt32LE( offset, 42 );
		central.push( entry, nameBuf );
		offset += head.length + nameBuf.length + packed.length;
	}
	const centralBuf = Buffer.concat( central );
	const end = Buffer.alloc( 22 );
	end.writeUInt32LE( 0x06054b50, 0 );
	const count = Object.keys( files ).length;
	end.writeUInt16LE( count, 8 );
	end.writeUInt16LE( count, 10 );
	end.writeUInt32LE( centralBuf.length, 12 );
	end.writeUInt32LE( offset, 16 );
	return Buffer.concat( [ ...local, centralBuf, end ] );
}

function dosTime( d ) {
	const time = ( d.getHours() << 11 ) | ( d.getMinutes() << 5 ) | ( d.getSeconds() >> 1 );
	const date = ( ( d.getFullYear() - 1980 ) << 9 ) | ( ( d.getMonth() + 1 ) << 5 ) | d.getDate();
	return ( ( date << 16 ) | time ) >>> 0;
}
