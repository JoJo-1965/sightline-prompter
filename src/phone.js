// Phone remote: a page on the home network that a phone opens by scanning a
// QR code. Off until switched on in Settings. Every request needs the key from
// the QR code; addresses that keep sending wrong keys are shut out.

import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONTROL_ACTIONS, controlView } from "./client/control-actions.js";

export const PHONE_COMMANDS = CONTROL_ACTIONS.map( a => a.id );

const MAX_BAD_TRIES = 20;

export function newPhoneKey() {
	return crypto.randomBytes( 16 ).toString( "hex" );
}

// The computer's address on the home network (Wi-Fi or Ethernet).
export function lanAddress() {
	const candidates = [];
	for ( const [ name, list ] of Object.entries( os.networkInterfaces() ) ) {
		for ( const a of list ?? [] ) {
			if ( a.family !== "IPv4" || a.internal ) continue;
			// Skip virtual adapters (WSL, Hyper-V, VirtualBox, VPNs) when we can.
			const virtual
				= /vethernet|virtual|vmware|vbox|wsl|tailscale|zerotier|loopback/i.test(
					name
				);
			const privateRange = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
				a.address
			);
			candidates.push( {
				address: a.address,
				score: ( privateRange ? 2 : 0 ) + ( virtual ? 0 : 1 )
			} );
		}
	}
	candidates.sort( ( a, b ) => b.score - a.score );
	return candidates[0]?.address ?? null;
}

function keyMatches( given, key ) {
	const a = Buffer.from( String( given ?? "" ) );
	const b = Buffer.from( key );
	return a.length === b.length && crypto.timingSafeEqual( a, b );
}

export function startPhoneServer( {
	port,
	key,
	pagePath,
	getStatus,
	onCommand,
	onError
} ) {
	const badTries = new Map();
	const server = http.createServer( async ( req, res ) => {
		const send = ( status, type, body ) => {
			res.writeHead( status, {
				"Content-Type": type,
				"Cache-Control": "no-store",
				"X-Content-Type-Options": "nosniff",
				"Referrer-Policy": "no-referrer"
			} );
			res.end( body );
		};
		const json = ( status, data ) =>
			send( status, "application/json", JSON.stringify( data ) );
		try {
			const ip = req.socket.remoteAddress ?? "";
			if ( ( badTries.get( ip ) ?? 0 ) >= MAX_BAD_TRIES ) {
				return json( 429, {
					error: "Too many wrong keys. Turn the phone remote off and on again."
				} );
			}
			const url = new URL( req.url, "http://phone" );
			// Only these generic UI assets are public; scripts, state and commands
			// still require the pairing key. Never resolve arbitrary URL paths.
			const asset = /^\/assets\/(pad\.css|control-actions\.js|control-buttons\.js|control-icons\.js|phone-controls\.js)$/.exec( url.pathname );
			if ( req.method === "GET" && asset ) return send( 200, asset[1].endsWith( ".css" ) ? "text/css" : "text/javascript", await readFile( path.join( path.dirname( pagePath ), asset[1] ), "utf8" ) );
			if ( url.pathname === "/favicon.ico" ) return send( 204, "text/plain", "" );
			const given = url.searchParams.get( "k" ) ?? req.headers["x-sightline-key"];
			if ( !keyMatches( given, key ) ) {
				badTries.set( ip, ( badTries.get( ip ) ?? 0 ) + 1 );
				if ( req.method === "GET" && url.pathname === "/" ) {
					return send(
						401,
						"text/plain; charset=utf-8",
						"Scan the QR code in Sightline Prompter (Settings > Phone remote)."
					);
				}
				return json( 401, { error: "Wrong key" } );
			}
			badTries.delete( ip );
			if ( req.method === "GET" && url.pathname === "/" ) {
				return send(
					200,
					"text/html; charset=utf-8",
					await readFile( pagePath, "utf-8" )
				);
			}
			if ( req.method === "GET" && url.pathname === "/status" ) {
				return json( 200, getStatus() );
			}
			if ( req.method === "POST" && url.pathname === "/command" ) {
				const action = url.searchParams.get( "action" );
				if ( !PHONE_COMMANDS.includes( action ) )
					return json( 400, { error: "Unknown action" } );
				const view = controlView( action, getStatus() );
				if ( view.hidden || view.disabled ) return json( 409, { error: "This control is unavailable" } );
				onCommand( action );
				return json( 200, { ok: true } );
			}
			return json( 404, { error: "Not found" } );
		} catch ( err ) {
			json( 500, { error: err.message } );
		}
	} );
	server.on( "error", err => onError?.( err ) );
	server.listen( port, "0.0.0.0" );
	return server;
}
