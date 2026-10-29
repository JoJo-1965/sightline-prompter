import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { readAndConvertScript } from "./utils/content.js";

const hash = value => createHash( "sha256" ).update( value ).digest( "hex" );
// Compare both sides of conversion. A file changed mid-read must not be
// presented as the source of a different rendered script.
export async function readScriptSnapshot( file ) {
	let before;
	try {
		before = await fs.readFile( file );
	} catch {
		return null;
	}
	const html = await readAndConvertScript( file );
	if ( !html ) return null;
	let after = null;
	try {
		after = await fs.readFile( file );
	} catch { /* Rendered content remains usable without a verified source. */ }
	const unchanged = after !== null && before.equals( after );
	return {
		id: hash( Buffer.concat( [ before, Buffer.from( html ) ] ) ), name: path.basename( file ), html,
		capturedAt: new Date().toISOString(), renderedSha256: hash( html ),
		source: unchanged ? { name: `recording-script${ path.extname( file ).toLowerCase() || ".txt" }`, encoding: "base64", content: before.toString( "base64" ), sha256: hash( before ) } : null,
		sourceVerified: unchanged
	};
}
