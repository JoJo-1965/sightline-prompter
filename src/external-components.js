import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify( execFile );
const names = { obs: "OBS Studio", streamdeck: "Stream Deck" };
export function componentCandidates( component, { platform = process.platform, env = process.env, home = os.homedir() } = {} ) {
	if ( !names[component] ) throw new Error( "Unknown application" );
	const join = platform === "win32" ? path.win32.join : path.posix.join;
	if ( platform === "win32" ) {
		const suffix = component === "obs" ? [ "obs-studio", "bin", "64bit", "obs64.exe" ] : [ "Elgato", "StreamDeck", "StreamDeck.exe" ];
		return [ env.ProgramW6432, env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA ].filter( Boolean ).map( base => join( base, ...suffix ) );
	}
	if ( platform === "darwin" ) return [ "/Applications", join( home, "Applications" ) ].map( base => join( base, component === "obs" ? "OBS.app/Contents/MacOS/OBS" : "Elgato Stream Deck.app/Contents/MacOS/Stream Deck" ) );
	return component === "obs" ? [ "/usr/bin/obs", "/usr/local/bin/obs", "/snap/bin/obs" ] : [];
}

// Detection never launches an application or installs software. Portable paths
// are chosen explicitly and stored separately from portable settings exports.
export function createExternalComponents( { folder, platform = process.platform, env = process.env, home = os.homedir(), runFile = run, candidates = componentCandidates } ) {
	const config = path.join( folder, "external-components.json" );
	const fileExists = async file => fs.stat( file ).then( value => value.isFile(), () => false );
	const savedPaths = () => fs.readFile( config, "utf8" ).then( JSON.parse ).catch( () => ( {} ) );
	async function probe( component ) {
		const supported = component === "obs" || [ "win32", "darwin" ].includes( platform );
		if ( !supported ) return { supported: false, installed: false };
		const saved = await savedPaths();
		const paths = [ saved[component], ...candidates( component, { platform, env, home } ) ].filter( file => typeof file === "string" && file );
		let installed = false;
		for ( const file of new Set( paths ) ) if ( await fileExists( file ) ) {
			installed = true;
			break;
		}
		if ( !installed ) {
			try {
				if ( platform === "win32" ) {
					const processName = component === "obs" ? "obs64,obs32" : "StreamDeck";
					const { stdout } = await runFile( "powershell.exe", [ "-NoProfile", "-NonInteractive", "-Command", `Get-Process -Name ${ processName } -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }` ], { timeout: 3000, windowsHide: true } );
					for ( const file of stdout.trim().split( /\r?\n/ ) ) if ( file && await fileExists( file ) ) installed = true;
				} else if ( platform !== "darwin" ) {
					const { stdout } = await runFile( "which", [ "obs" ], { timeout: 2000 } );
					installed = await fileExists( stdout.trim() );
					if ( !installed ) throw new Error( "No native OBS" );
				}
			} catch { /* A stopped portable application can be located explicitly. */ }
			if ( !installed && platform === "linux" && component === "obs" ) {
				try {
					await runFile( "flatpak", [ "info", "com.obsproject.Studio" ], { timeout: 2000 } );
					installed = true;
				} catch { /* Flatpak is optional. */ }
			}
		}
		let plugin = null;
		if ( component === "streamdeck" ) {
			const base = platform === "win32" ? env.APPDATA && path.join( env.APPDATA, "Elgato", "StreamDeck", "Plugins" ) : path.join( home, "Library", "Application Support", "com.elgato.StreamDeck", "Plugins" );
			if ( base ) {
				try {
					const manifest = JSON.parse( await fs.readFile( path.join( base, "uk.co.seechangehappen.sightline.sdPlugin", "manifest.json" ), "utf8" ) );
					if ( manifest.UUID === "uk.co.seechangehappen.sightline" && /^\d+\.\d+\.\d+(?:\.\d+)?$/.test( manifest.Version ) ) plugin = { installed: true, version: manifest.Version };
				} catch { /* Runtime compatibility is checked separately. */ }
			}
		}
		return { supported, installed, ...( component === "streamdeck" ? { plugin } : {} ) };
	}
	return {
		status: async () => Object.fromEntries( await Promise.all( Object.keys( names ).map( async name => [ name, await probe( name ) ] ) ) ),
		async locate( component, file ) {
			if ( !names[component] || typeof file !== "string" || !path.isAbsolute( file ) ) throw new Error( "Choose the application" );
			if ( platform === "darwin" && file.endsWith( ".app" ) ) file = path.join( file, "Contents", "MacOS", component === "obs" ? "OBS" : "Stream Deck" );
			const expected = component === "obs" ? /^(obs64\.exe|obs32\.exe|obs)$/i : /^(StreamDeck\.exe|Stream Deck)$/i;
			if ( !expected.test( path.basename( file ) ) || !await fileExists( file ) ) throw new Error( `Choose the ${ names[component] } application, then check again` );
			const saved = await savedPaths();
			saved[component] = file;
			await fs.writeFile( config, JSON.stringify( saved ) );
		}
	};
}
