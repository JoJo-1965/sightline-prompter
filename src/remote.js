// Remote control: a small HTTP API on 127.0.0.1 so an AI assistant (or any local
// script) can load scripts and drive the teleprompter. Off until switched on in
// Settings. Every request needs the token; requests from web pages are refused.

import http from "node:http";
import crypto from "node:crypto";

const MAX_BODY = 2 * 1024 * 1024;

export function newToken() {
	return crypto.randomBytes( 24 ).toString( "hex" );
}

function readBody( req ) {
	return new Promise( ( resolve, reject ) => {
		let size = 0;
		const chunks = [];
		req.on( "data", ( chunk ) => {
			size += chunk.length;
			if ( size > MAX_BODY ) {
				reject( Object.assign( new Error( "Request too large" ), { status: 413 } ) );
				req.destroy();
				return;
			}
			chunks.push( chunk );
		} );
		req.on( "end", () => {
			const text = Buffer.concat( chunks ).toString( "utf-8" );
			if ( !text ) return resolve( {} );
			try {
				resolve( JSON.parse( text ) );
			} catch {
				reject( Object.assign( new Error( "Body must be JSON" ), { status: 400 } ) );
			}
		} );
		req.on( "error", reject );
	} );
}

function tokenMatches( given, token ) {
	const a = Buffer.from( String( given ?? "" ) );
	const b = Buffer.from( token );
	return a.length === b.length && crypto.timingSafeEqual( a, b );
}

// routes: { "GET /status": async (body) => result, ... }
export function startRemoteServer( { port, token, routes, onError } ) {
	const server = http.createServer( async ( req, res ) => {
		const reply = ( status, data ) => {
			res.writeHead( status, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( data ) );
		};
		try {
			// Only local callers by name (blocks DNS-rebinding from web pages), never browsers.
			const host = String( req.headers.host ?? "" ).replace( /:\d+$/, "" );
			if ( host !== "127.0.0.1" && host !== "localhost" ) {
				return reply( 403, { error: "Use http://127.0.0.1" } );
			}
			if ( req.headers.origin ) {
				return reply( 403, { error: "Browser requests are not allowed" } );
			}
			const auth = String( req.headers.authorization ?? "" ).replace(
				/^Bearer\s+/i,
				""
			);
			if ( !tokenMatches( auth, token ) ) {
				return reply( 401, { error: "Missing or wrong token" } );
			}
			const url = new URL( req.url, "http://127.0.0.1" );
			const route = routes[`${ req.method } ${ url.pathname }`];
			if ( !route )
				return reply( 404, {
					error: "Unknown endpoint",
					endpoints: Object.keys( routes )
				} );
			const body = req.method === "GET" ? {} : await readBody( req );
			const result = await route( body );
			reply( 200, result ?? { ok: true } );
		} catch ( err ) {
			reply( err.status ?? 400, { error: err.message } );
		}
	} );
	server.on( "error", err => onError?.( err ) );
	server.listen( port, "127.0.0.1" );
	return server;
}
