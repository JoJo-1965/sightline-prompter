import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, statSync } from "node:fs";

export const MODEL_NAME = "zipformer-en-2023-06-26";
const MODEL_URL = "https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26/resolve/main/";
export const MODEL_FILES = [
	[ "encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 71083163 ],
	[ "decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 1307236 ],
	[ "joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx", 259335 ],
	[ "tokens.txt", 5048 ]
];

// A repair downloads into staging. A failed download keeps the previous model.
export function createModelStore( { folder, files = MODEL_FILES, fetchFile = fetch, notify = () => {}, busy = () => false, trash = target => fs.rm( target, { recursive: true } ) } ) {
	let working = false;
	let received = 0;
	let error = null;
	const total = files.reduce( ( sum, [ , size ] ) => sum + size, 0 );
	const installed = () => files.every( ( [ name, size ] ) => {
		try {
			return statSync( path.join( folder, name ) ).size === size;
		} catch {
			return false;
		}
	} );
	const status = () => ( { installed: installed(), downloading: working, received, total, error } );
	async function change( action ) {
		if ( ![ "install", "reinstall", "remove" ].includes( action ) ) throw new Error( "Unknown model action" );
		if ( working ) throw new Error( "A model operation is already running" );
		if ( busy() ) throw new Error( "Stop voice listening and recording before changing the model" );
		working = true;
		error = null;
		received = 0;
		notify( status() );
		const staging = folder + ".staging";
		const previous = folder + ".previous";
		try {
			if ( action === "remove" ) {
				if ( existsSync( folder ) ) await trash( folder );
			} else if ( action !== "install" || !installed() ) {
				await fs.rm( staging, { recursive: true, force: true } );
				await fs.mkdir( staging, { recursive: true } );
				let lastSent = 0;
				for ( const [ name, size ] of files ) {
					const res = await fetchFile( MODEL_URL + name, { redirect: "follow", signal: AbortSignal.timeout( 180000 ) } );
					if ( !res.ok ) throw new Error( `Download failed (${ res.status })` );
					const file = await fs.open( path.join( staging, name ), "w" );
					let bytes = 0;
					try {
						for await ( const chunk of res.body ) {
							bytes += chunk.length;
							if ( bytes > size ) throw new Error( "Downloaded model has an unexpected size" );
							await file.writeFile( chunk );
							received += chunk.length;
							if ( Date.now() - lastSent > 250 ) {
								lastSent = Date.now();
								notify( status() );
							}
						}
					} finally {
						await file.close();
					}
					if ( bytes !== size ) throw new Error( "Incomplete model download; try again" );
				}
				await fs.rm( previous, { recursive: true, force: true } );
				if ( existsSync( folder ) ) await fs.rename( folder, previous );
				try {
					await fs.rename( staging, folder );
				} catch ( err ) {
					if ( existsSync( previous ) ) await fs.rename( previous, folder );
					throw err;
				}
				await fs.rm( previous, { recursive: true, force: true } );
			}
		} catch ( err ) {
			error = err.message;
		} finally {
			await fs.rm( staging, { recursive: true, force: true } ).catch( () => {} );
			working = false;
			notify( status() );
		}
		return status();
	}
	return { status, change, installed };
}
