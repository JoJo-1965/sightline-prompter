import { net } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

// Scripts from Google Docs links. The doc is downloaded as a Word file
// (Google's own export, which keeps the headings) into the app's folder and
// opened like any other script. Each time it's opened, and on File > Reload
// from Google Docs, the latest version is fetched; offline, the last copy is
// used. Only docs shared as "Anyone with the link" can be fetched: there is
// no Google sign-in.

export function googleDocId( link ) {
	const match = String( link ?? "" ).match(
		/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([\w-]{20,})/
	);
	return match?.[1] ?? null;
}

const safeName = title =>
	title
		.replace( /[<>:"/\\|?*]/g, "" )
		.replace( /\p{Cc}/gu, "" )
		.replace( /\s+/g, " " )
		.trim()
		.slice( 0, 80 ) || "Google Doc";

// "attachment; filename="x.docx"; filename*=UTF-8''My%20script.docx"
function titleFrom( disposition ) {
	const encoded = disposition?.match( /filename\*=UTF-8''([^;]+)/i )?.[1];
	const plain = disposition?.match( /filename="([^"]+)"/i )?.[1];
	let name = plain ?? "";
	try {
		if ( encoded ) name = decodeURIComponent( encoded );
	} catch {
		// a malformed name: keep the plain one
	}
	return name.replace( /\.docx$/i, "" );
}

export class GoogleDocError extends Error {
	constructor( reason ) {
		super( reason );
		this.reason = reason; // "link" | "private" | "missing" | "offline"
	}
}

export function createGoogleDocs( { dir } ) {
	const folder = path.join( dir, "google-docs" );
	const sourcesFile = path.join( folder, "sources.json" );
	let sources = null; // { [id]: { file, title } }
	const fetchedAt = new Map(); // id → when it was last downloaded

	async function load() {
		if ( sources ) return sources;
		try {
			sources = JSON.parse( await fs.readFile( sourcesFile, "utf-8" ) );
		} catch {
			sources = {};
		}
		return sources;
	}

	async function download( id ) {
		let res;
		try {
			res = await net.fetch(
				`https://docs.google.com/document/d/${ id }/export?format=docx`,
				{ cache: "no-store" }
			);
		} catch {
			throw new GoogleDocError( "offline" );
		}
		if ( res.status === 404 ) throw new GoogleDocError( "missing" );
		fetchedAt.set( id, Date.now() );
		const type = res.headers.get( "content-type" ) ?? "";
		// A doc that isn't shared sends you to the sign-in page instead.
		if ( !res.ok || !type.includes( "officedocument" ) ) {
			throw new GoogleDocError( "private" );
		}
		return {
			bytes: Buffer.from( await res.arrayBuffer() ),
			title: titleFrom( res.headers.get( "content-disposition" ) )
		};
	}

	// Writes the file only when it changed, so the prompter doesn't reload
	// (and lose its place) for nothing. Returns true when it changed.
	async function save( file, bytes ) {
		try {
			if ( ( await fs.readFile( file ) ).equals( bytes ) ) return false;
		} catch {
			// no copy yet
		}
		await fs.writeFile( file, bytes );
		return true;
	}

	// Fetches a doc from its link: { file, title }.
	async function open( link ) {
		const id = googleDocId( link );
		if ( !id ) throw new GoogleDocError( "link" );
		await load();
		const { bytes, title } = await download( id );
		await fs.mkdir( folder, { recursive: true } );
		let file = sources[id]?.file;
		if ( !file ) {
			const name = safeName( title );
			const taken = new Set( Object.values( sources ).map( s => s.file ) );
			file = path.join( folder, `${ name }.docx` );
			if ( taken.has( file ) )
				file = path.join( folder, `${ name } (${ id.slice( 0, 6 ) }).docx` );
		}
		await save( file, bytes );
		sources[id] = { file, title: title || path.basename( file, ".docx" ) };
		await fs.writeFile( sourcesFile, JSON.stringify( sources, null, 2 ) );
		return sources[id];
	}

	// The doc behind a downloaded copy, or null for any other file.
	async function sourceOf( file ) {
		await load();
		const id = Object.keys( sources ).find(
			key => path.resolve( sources[key].file ) === path.resolve( file ?? "" )
		);
		return id ? { id, ...sources[id] } : null;
	}

	// Fetches the latest version of a downloaded copy. Returns true when it
	// changed, false when it was already up to date (or was fetched moments
	// ago, as when a link has just been opened, unless `force`).
	async function refresh( file, force = false ) {
		const source = await sourceOf( file );
		if ( !source ) return false;
		if ( !force && Date.now() - ( fetchedAt.get( source.id ) ?? 0 ) < 15000 ) {
			return false;
		}
		const { bytes } = await download( source.id );
		return save( source.file, bytes );
	}

	return { open, sourceOf, refresh };
}

export const GOOGLE_DOC_MESSAGES = {
	link: "That doesn't look like a Google Docs link. Copy it from the address bar or from Share > Copy link",
	private:
    "Couldn't open that doc: it isn't shared. In Google Docs choose Share, set General access to \"Anyone with the link\", then try again",
	missing: "Google Docs couldn't find that doc. Check the link",
	offline: "Couldn't reach Google Docs. Check you're online"
};
