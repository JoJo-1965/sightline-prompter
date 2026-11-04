import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const logFingerprint = data => crypto.createHash( "sha256" ).update( JSON.stringify( data ) ).digest( "hex" );
const reviewFile = ( profile, data ) => path.join( profile, "recording-reviews", logFingerprint( data ) + ".json" );

export async function reviewInputsUnchanged( review ) {
	for ( const input of review.inputs ?? [] ) {
		try { const stat = await fs.stat( input.localPath ); if ( stat.size !== input.size || stat.mtimeMs !== input.mtimeMs ) return false; } catch { return false; }
	}
	return true;
}

export async function saveReview( data, review, profile ) {
	const result = { ...review, sourceFingerprint: logFingerprint( data ), createdAt: new Date().toISOString() };
	await fs.mkdir( path.join( profile, "recording-reviews" ), { recursive: true } );
	const target = reviewFile( profile, data ), temporary = target + ".tmp";
	await fs.writeFile( temporary, JSON.stringify( result, null, 2 ) );
	await fs.rename( temporary, target );
	return result;
}

export async function reviewedLog( data, profile ) {
	try {
		const file = reviewFile( profile, data );
		if ( ( await fs.stat( file ) ).size > 80 * 1024 * 1024 ) return data;
		const sidecar = JSON.parse( await fs.readFile( file, "utf8" ) );
		if ( sidecar.sourceFingerprint !== logFingerprint( data ) || sidecar.schemaVersion !== 1 || !Array.isArray( sidecar.transcripts ) || !Array.isArray( sidecar.takes ) || !Array.isArray( sidecar.recordings ) || !Array.isArray( sidecar.commandRanges ) ) return data;
		if ( !sidecar.takes.every( t => t && Array.isArray( t.words ) && Array.isArray( t.issues ) ) || !sidecar.transcripts.every( t => t && Array.isArray( t.words ) ) ) return data;
		if ( !await reviewInputsUnchanged( sidecar ) ) return data;
		return { ...data, postRecord: sidecar, recordings: [ ...( data.recordings ?? [] ), ...sidecar.recordings ] };
	} catch { return data; }
}
