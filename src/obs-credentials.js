// A separate OS-encrypted credential, never in settings, exports or the API.
import fs from "node:fs/promises";
import path from "node:path";

export function createObsCredentials( dir, safeStorage, { platform = process.platform } = {} ) {
	const file = path.join( dir, "obs-credentials.json" );
	const available = async () => await safeStorage.isAsyncEncryptionAvailable() && ( platform !== "linux" || safeStorage.getSelectedStorageBackend?.() !== "basic_text" );
	return {
		async hasSaved() {
			try {
				await fs.access( file );
				return true;
			} catch {
				return false;
			}
		},
		async read() {
			try {
				if ( !await available() ) return "";
				const saved = JSON.parse( await fs.readFile( file, "utf8" ) );
				return ( await safeStorage.decryptStringAsync( Buffer.from( saved.password, "base64" ) ) ).result;
			} catch {
				return "";
			}
		},
		async write( password ) {
			if ( !password ) {
				await fs.rm( file, { force: true } );
				return;
			}
			if ( !await available() ) throw new Error( "OS-protected password storage is unavailable; enable your system keyring before saving the OBS password" );
			const encrypted = ( await safeStorage.encryptStringAsync( password ) ).toString( "base64" );
			await fs.mkdir( dir, { recursive: true } );
			await fs.writeFile( file, JSON.stringify( { password: encrypted } ), { mode: 0o600 } );
		}
	};
}
