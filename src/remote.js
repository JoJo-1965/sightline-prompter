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
	if ( !token ) return false;
	const a = Buffer.from( String( given ?? "" ) );
	const b = Buffer.from( token );
	return a.length === b.length && crypto.timingSafeEqual( a, b );
}

// routes: { "GET /status": async (body) => result, ... }
// events: { subscribe( send ) -> unsubscribe }: GET /events streams each
// change as a server-sent event (`data: {…}`), for buttons that show state
// such as the Stream Deck plugin.
// token: the full key (AI assistants and scripts), or null when that's off.
// buttonToken: a second key that may only use buttonRoutes and /events (the
// Stream Deck plugin), or null when that's off.
export function startRemoteServer( { port, token, buttonToken = null, buttonRoutes = new Set(), routes, events, onError } ) {
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
			const full = tokenMatches( auth, token );
			const buttons = !full && tokenMatches( auth, buttonToken );
			if ( !full && !buttons ) {
				return reply( 401, { error: "Missing or wrong token" } );
			}
			const url = new URL( req.url, "http://127.0.0.1" );
			if ( buttons && url.pathname !== "/events" && !buttonRoutes.has( `${ req.method } ${ url.pathname }` ) ) {
				return reply( 403, { error: "The Stream Deck key can only press buttons" } );
			}
			if ( events && req.method === "GET" && url.pathname === "/events" ) {
				res.writeHead( 200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive"
				} );
				const send = data => res.write( `data: ${ JSON.stringify( data ) }\n\n` );
				const unsubscribe = events.subscribe( send );
				// A comment now and then keeps idle connections open.
				const keepAlive = setInterval( () => res.write( ": still here\n\n" ), 15000 );
				req.on( "close", () => {
					clearInterval( keepAlive );
					unsubscribe();
				} );
				return;
			}
			const route = routes[`${ req.method } ${ url.pathname }`];
			if ( !route )
				return reply( 404, {
					error: "Unknown endpoint",
					endpoints: Object.keys( routes )
				} );
			// GET takes its values from the query: /recording?id=…
			const body = req.method === "GET" ? Object.fromEntries( url.searchParams ) : await readBody( req );
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
