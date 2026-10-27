// Export and import the teleprompter's settings as a JSON or XML file.
// The Deepgram API key is never written to these files.

import path from "node:path";

const XML_ROOT = "teleprompterSettings";

function escapeXml( text ) {
	return String( text )
		.replace( /&/g, "&amp;" )
		.replace( /</g, "&lt;" )
		.replace( />/g, "&gt;" )
		.replace( /"/g, "&quot;" );
}

function unescapeXml( text ) {
	return text
		.replace( /&quot;/g, "\"" )
		.replace( /&gt;/g, ">" )
		.replace( /&lt;/g, "<" )
		.replace( /&amp;/g, "&" );
}

function typeOf( value ) {
	if ( value === null ) return "null";
	return typeof value;
}

export function toXml( values ) {
	const lines = Object.entries( values ).map(
		( [ name, value ] ) =>
			`  <setting name="${ escapeXml( name ) }" type="${ typeOf( value ) }">${ value === null ? "" : escapeXml( value ) }</setting>`
	);
	return `<?xml version="1.0" encoding="UTF-8"?>\n<${ XML_ROOT } version="1">\n${ lines.join( "\n" ) }\n</${ XML_ROOT }>\n`;
}

export function fromXml( text ) {
	if ( !text.includes( `<${ XML_ROOT }` ) ) {
		throw new Error( "This isn't a teleprompter settings file." );
	}
	const values = {};
	const re
		= /<setting\s+name="([^"]*)"\s+type="([^"]*)"\s*(?:\/>|>([\s\S]*?)<\/setting>)/g;
	for ( const [ , name, type, raw = "" ] of text.matchAll( re ) ) {
		const value = unescapeXml( raw.trim() );
		if ( type === "number" ) values[unescapeXml( name )] = Number( value );
		else if ( type === "boolean" ) values[unescapeXml( name )] = value === "true";
		else if ( type === "null" ) values[unescapeXml( name )] = null;
		else values[unescapeXml( name )] = value;
	}
	return values;
}

export function serialize( values, filePath ) {
	return path.extname( filePath ).toLowerCase() === ".xml"
		? toXml( values )
		: `${ JSON.stringify( { teleprompterSettings: 1, ...values }, null, 2 ) }\n`;
}

export function parse( text, filePath ) {
	if ( path.extname( filePath ).toLowerCase() === ".xml" ) return fromXml( text );
	const data = JSON.parse( text );
	if ( !data || typeof data !== "object" || Array.isArray( data ) ) {
		throw new Error( "This isn't a teleprompter settings file." );
	}
	delete data.teleprompterSettings;
	return data;
}

// Keep only known keys whose value has the same type as the default.
export function pickKnown( values, defaults ) {
	const out = {};
	for ( const [ key, def ] of Object.entries( defaults ) ) {
		if ( !( key in values ) ) continue;
		const value = values[key];
		if ( def === null || value === null ) {
			if ( value === null || typeof value === "string" ) out[key] = value;
		} else if ( typeof value === typeof def ) {
			if ( typeof value === "number" && !Number.isFinite( value ) ) continue;
			out[key] = value;
		}
	}
	return out;
}
