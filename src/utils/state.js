import { app } from "electron";
import { join } from "node:path";
import fs from "node:fs/promises";
import { atomicStateWriter } from "./atomic-state.js";

export default ( defaultConfig ) => {
	const userFolder = app.getPath( "userData" );
	const appStateFile = join( userFolder, "app-state.json" );

	async function readAppState() {
		try {
			const data = await fs.readFile( appStateFile, "utf-8" );
			return JSON.parse( data );
		} catch ( err ) {
			if ( err.code !== "ENOENT" ) {
				console.log( "Error reading state file." );
				console.log( err );
			}
			return defaultConfig;
		}
	}

	const writeAppState = atomicStateWriter( appStateFile );

	return {
		readAppState,
		writeAppState
	};
};
