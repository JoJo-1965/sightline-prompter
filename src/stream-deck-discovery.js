import fs from "node:fs";
import path from "node:path";

// Existing plugins read the standard profile. Temporarily advertise a custom
// preview there, and restore only our own descriptor when it closes.
export function createStreamDeckDiscovery( { standardFile, localFile, claimCustom = true } ) {
	let original;
	let advertised = null;
	const custom = claimCustom && path.resolve( standardFile ).toLowerCase() !== path.resolve( localFile ).toLowerCase();
	const read = () => {
		try {
			return fs.readFileSync( standardFile, "utf8" );
		} catch {
			return null;
		}
	};
	return {
		publish( descriptor ) {
			if ( !custom ) return;
			if ( advertised === null ) original = read();
			advertised = JSON.stringify( { ...descriptor, profile: "Preview" }, null, 2 );
			fs.mkdirSync( path.dirname( standardFile ), { recursive: true } );
			fs.writeFileSync( standardFile, advertised );
		},
		release() {
			if ( !custom || advertised === null ) return;
			if ( read() === advertised ) {
				if ( original === null ) fs.rmSync( standardFile, { force: true } );
				else fs.writeFileSync( standardFile, original );
			}
			advertised = null;
		}
	};
}
