// A separate loopback-only browser source, never the protected head guide.
import http from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";

export const RECORDED_SLATE_SOURCE = "Sightline recorded sync";

export function slateWave() {
	const rate = 48000;
	const samples = rate / 4;
	const wav = Buffer.alloc( 44 + samples * 2 );
	wav.write( "RIFF", 0 );
	wav.writeUInt32LE( wav.length - 8, 4 );
	wav.write( "WAVEfmt ", 8 );
	wav.writeUInt32LE( 16, 16 );
	wav.writeUInt16LE( 1, 20 );
	wav.writeUInt16LE( 1, 22 );
	wav.writeUInt32LE( rate, 24 );
	wav.writeUInt32LE( rate * 2, 28 );
	wav.writeUInt16LE( 2, 32 );
	wav.writeUInt16LE( 16, 34 );
	wav.write( "data", 36 );
	wav.writeUInt32LE( samples * 2, 40 );
	for ( let i = 0; i < samples; i++ ) wav.writeInt16LE( Math.round( Math.sin( 2 * Math.PI * 1000 * i / rate ) * 0.35 * 32767 ), 44 + i * 2 );
	return wav;
}

export function createRecordedSlate( { readyMs = 5000, timeoutMs = 4500, onState = () => {} } = {} ) {
	let server = null;
	let opening = null;
	let generation = 0;
	let token = "";
	let origin = "";
	let readyAt = 0;
	let lastSent = 0;
	let job = null;
	const clients = new Set();
	const state = () => ( { ready: clients.size > 0 && Date.now() - readyAt < readyMs, busy: !!job, route: "obs-browser-source" } );
	const finish = ( error, value ) => {
		if ( !job ) return;
		const pending = job;
		job = null;
		clearTimeout( pending.timer );
		if ( error ) pending.reject( error );
		else pending.resolve( value );
		onState();
	};
	async function handle( req, res, html ) {
		const url = new URL( req.url, origin );
		const supplied = Buffer.from( url.searchParams.get( "key" ) ?? "" );
		const expected = Buffer.from( token );
		res.setHeader( "Cache-Control", "no-store" );
		res.setHeader( "X-Content-Type-Options", "nosniff" );
		if ( req.headers.host !== new URL( origin ).host || supplied.length !== expected.length || !timingSafeEqual( supplied, expected ) || ( req.headers.origin && ![ origin, "null" ].includes( req.headers.origin ) ) ) {
			res.writeHead( 403 );
			res.end();
			return;
		}
		if ( req.headers.origin === "null" ) res.setHeader( "Access-Control-Allow-Origin", "null" );
		if ( req.method === "OPTIONS" ) {
			res.writeHead( 204, { "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Private-Network": "true" } );
			res.end();
			return;
		}
		if ( req.method === "GET" && url.pathname === "/slate" ) {
			res.setHeader( "Content-Type", "text/html; charset=utf-8" );
			res.setHeader( "Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; frame-ancestors 'none'" );
			res.end( html );
			return;
		}
		if ( req.method === "GET" && url.pathname === "/beep.wav" ) {
			res.setHeader( "Content-Type", "audio/wav" );
			res.end( slateWave() );
			return;
		}
		if ( req.method === "GET" && url.pathname === "/events" ) {
			res.writeHead( 200, { "Content-Type": "text/event-stream", Connection: "keep-alive" } );
			res.write( ": connected\n\n" );
			clients.add( res );
			req.on( "close", () => {
				clients.delete( res );
				if ( !clients.size ) readyAt = 0;
				onState();
			} );
			return;
		}
		if ( req.method === "POST" && [ "/ready", "/ack" ].includes( url.pathname ) ) {
			let body = "";
			for await ( const chunk of req ) {
				body += chunk;
				if ( body.length > 2048 ) {
					res.writeHead( 413 );
					res.end();
					return;
				}
			}
			const data = JSON.parse( body );
			if ( url.pathname === "/ready" ) {
				readyAt = data.audioState === "running" ? Date.now() : 0;
				onState();
			} else if ( job && data.id === job.info.id ) {
				if ( data.audioState !== "running" || !Number.isFinite( data.renderedAt ) || Math.abs( data.renderedAt - Date.now() ) > 10000 ) finish( new Error( "The OBS slate source did not confirm its audio and picture" ) );
				else finish( null, { ...job.info, renderedAt: new Date( data.renderedAt ).toISOString(), completedAt: new Date().toISOString(), status: "browser-acknowledged", audioState: data.audioState } );
			}
			res.writeHead( 204 );
			res.end();
			return;
		}
		res.writeHead( 404 );
		res.end();
	}
	return {
		state,
		async preparePage( file ) {
			await this.open();
			const html = ( await fs.readFile( new URL( "./client/obs-slate.html", import.meta.url ), "utf8" ) )
				.replace( "<head>", `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src ${ origin }; base-uri 'none'; form-action 'none'">` )
				.replace( "const key = new URLSearchParams(location.search).get(\"key\");", `const key = ${ JSON.stringify( token ) };` )
				.replace( "const endpoint = name => `/${name}?key=${encodeURIComponent(key)}`;", `const endpoint = name => ${ JSON.stringify( origin ) } + \`/\${name}?key=\${encodeURIComponent(key)}\`;` );
			await fs.writeFile( `${ file }.tmp`, html );
			await fs.rename( `${ file }.tmp`, file );
			return { file };
		},
		async open() {
			if ( opening ) return opening;
			if ( server ) return `${ origin }/slate?key=${ token }`;
			const current = ++generation;
			opening = ( async () => {
				const html = await fs.readFile( new URL( "./client/obs-slate.html", import.meta.url ), "utf8" );
				if ( current !== generation ) throw new Error( "Recorded slate preparation was cancelled" );
				token = randomBytes( 32 ).toString( "hex" );
				server = http.createServer( ( req, res ) => handle( req, res, html ).catch( () => {
					if ( !res.headersSent ) res.writeHead( 400 );
					res.end();
				} ) );
				const listening = server;
				await new Promise( ( resolve, reject ) => {
					listening.once( "error", reject );
					listening.listen( 0, "127.0.0.1", resolve );
				} );
				if ( current !== generation ) {
					listening.close();
					throw new Error( "Recorded slate preparation was cancelled" );
				}
				origin = `http://127.0.0.1:${ server.address().port }`;
				return `${ origin }/slate?key=${ token }`;
			} )().finally( () => {
				if ( current === generation ) opening = null;
			} );
			return opening;
		},
		play( { section, take, title, mode = "beep" } = {} ) {
			if ( !state().ready ) return Promise.reject( new Error( "Prepare the recorded slate in Settings > OBS and check its source is visible" ) );
			if ( job || Date.now() - lastSent < 1000 ) return Promise.reject( new Error( "Wait for the previous recorded slate to finish" ) );
			lastSent = Date.now();
			const info = { id: randomUUID(), route: "obs-browser-source", sourceName: RECORDED_SLATE_SOURCE, requestedAt: new Date().toISOString(), section: Number( section ) || null, take: Number( take ) || null, title: String( title ?? "" ).slice( 0, 160 ), mode: mode === "flash" ? "flash" : "beep", frequency: 1000, beepMs: 250, flashMs: 150, cardMs: 1100, timingQuality: "browser acknowledgement; verify the recorded file", cameraLipSync: "not measured" };
			return new Promise( ( resolve, reject ) => {
				job = { info, resolve, reject, timer: setTimeout( () => finish( new Error( "The OBS slate source did not acknowledge the reference; prompting has not started" ) ), timeoutMs ) };
				for ( const client of clients ) client.write( `data: ${ JSON.stringify( info ) }\n\n` );
				onState();
			} );
		},
		close() {
			generation++;
			opening = null;
			finish( new Error( "Recorded slate was disabled" ) );
			for ( const client of clients ) client.end();
			clients.clear();
			readyAt = 0;
			server?.closeAllConnections();
			server?.close();
			server = null;
			onState();
		}
	};
}
