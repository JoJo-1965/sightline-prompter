import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const run = promisify( execFile );
// Explicit files keep the exported kit independent of Electron and npm packages.
export const KIT_FILES = [
	"LICENSE",
	"scripts/sightline.mjs", "scripts/check-script.mjs", "scripts/heard-report.mjs", "scripts/edit-pack.mjs",
	"src/heard-report.js", "src/recordings.js", "src/client/edit-pack.js", "src/client/take-log.js", "src/client/obs-position.js",
	"docs/script-directives.json", "docs/AI-SCRIPT-BRIEF.md", "docs/SCRIPT-DIRECTIVES.md", "docs/EDIT-PACK.md",
	"src/samples/batch-module.md", "src/samples/single-take.md", "src/samples/voice-and-stops.md", "src/samples/talking-points.md", "src/samples/notes.md",
	"skills/sightline-script/SKILL.md", "skills/sightline-session/SKILL.md"
];
export async function nodeStatus() {
	try {
		const { stdout } = await run( "node", [ "--version" ], { timeout: 4000, windowsHide: true } );
		const version = stdout.trim();
		const [ major, minor ] = version.slice( 1 ).split( "." ).map( Number );
		return { installed: true, version, ready: major > 22 || ( major === 22 && minor >= 16 ) };
	} catch {
		return { installed: false, ready: false };
	}
}

export function createAgentKit( { source, folder, version, trash = target => fs.rm( target, { recursive: true } ) } ) {
	let working = false;
	const digest = async file => createHash( "sha256" ).update( await fs.readFile( file ) ).digest( "hex" );
	async function status() {
		try {
			const manifest = JSON.parse( await fs.readFile( path.join( folder, "sightline-kit.json" ), "utf8" ) );
			const hashes = await Promise.all( KIT_FILES.map( async ( file ) => {
				const hash = await digest( path.join( folder, file ) );
				if ( manifest.files?.[file] !== hash ) throw new Error( "Kit file changed" );
				return hash === await digest( path.join( source, file ) );
			} ) );
			return { installed: true, version: manifest.version, current: manifest.version === version && hashes.every( Boolean ) };
		} catch {
			return { installed: false };
		}
	}
	async function change( action ) {
		if ( working ) throw new Error( "An AI kit operation is already running" );
		if ( ![ "install", "reinstall", "remove" ].includes( action ) ) throw new Error( "Unknown kit action" );
		working = true;
		const staging = folder + ".staging";
		const previous = folder + ".previous";
		try {
			if ( action === "remove" ) {
				await fs.access( folder ).then( () => trash( folder ), () => {} );
			} else {
				await fs.rm( staging, { recursive: true, force: true } );
				for ( const file of KIT_FILES ) {
					const target = path.join( staging, file );
					await fs.mkdir( path.dirname( target ), { recursive: true } );
					await fs.copyFile( path.join( source, file ), target );
				}
				await fs.writeFile( path.join( staging, "package.json" ), JSON.stringify( { private: true, type: "module" } ) );
				const files = Object.fromEntries( await Promise.all( KIT_FILES.map( async file => [ file, await digest( path.join( staging, file ) ) ] ) ) );
				await fs.writeFile( path.join( staging, "sightline-kit.json" ), JSON.stringify( { version, files } ) );
				await fs.writeFile( path.join( staging, "START-HERE.md" ), "# Sightline AI kit\n\nInstall Node.js 22.16 or later to run the commands. No npm install is needed.\n\n- Check a script: `node scripts/check-script.mjs your-script.md`\n- Check Sightline: `node scripts/sightline.mjs status`\n- Authoring instructions: skills/sightline-script/SKILL.md\n- Session instructions: skills/sightline-session/SKILL.md\n\nGive your assistant this kit folder as the Sightline source location. If its skill mentions `<sightline>`, use this folder. Enable AI & API in Sightline before sending commands. Installing this kit does not enable remote access or install skills into another application. Keep your own files elsewhere: Reinstall replaces this managed folder; Remove moves it to the system bin.\n" );
				await fs.rm( previous, { recursive: true, force: true } );
				await fs.rename( folder, previous ).catch( ( err ) => {
					if ( err.code !== "ENOENT" ) throw err;
				} );
				try {
					await fs.rename( staging, folder );
				} catch ( err ) {
					await fs.rename( previous, folder ).catch( () => {} );
					throw err;
				}
				await fs.rm( previous, { recursive: true, force: true } );
			}
			return await status();
		} finally {
			await fs.rm( staging, { recursive: true, force: true } ).catch( () => {} );
			working = false;
		}
	}
	return { status, change };
}
