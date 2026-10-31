import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { componentCandidates, createExternalComponents } from "../src/external-components.js";
import { agentReadiness, obsInstallBlock } from "../src/client/component-availability.js";

const temp = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-component-checks-" ) );
try {
	const unavailable = async () => {
		throw new Error( "Not installed" );
	};
	const options = { folder: temp, platform: "win32", env: { APPDATA: temp }, candidates: () => [], runFile: unavailable };
	const apps = createExternalComponents( options );
	assert.equal( ( await apps.status() ).obs.installed, false );
	assert.equal( ( await apps.status() ).streamdeck.installed, false );
	const binary = path.join( temp, "obs64.exe" );
	await fs.writeFile( binary, "fixture only; never executed" );
	await apps.locate( "obs", binary );
	assert.equal( ( await apps.status() ).obs.installed, true, "Portable/custom locations are remembered" );
	await assert.rejects( apps.locate( "streamdeck", binary ), /Choose/ );
	await assert.rejects( apps.locate( "other", binary ), /Choose/ );
	await fs.unlink( binary );
	assert.equal( ( await apps.status() ).obs.installed, false, "Removed installations are detected again" );
	await fs.writeFile( binary, "fixture only" );
	const running = createExternalComponents( { ...options, folder: path.join( temp, "unsaved" ), runFile: async () => ( { stdout: binary + "\n" } ) } );
	assert.equal( ( await running.status() ).obs.installed, true, "A running portable installation can be detected" );
	const plugin = path.join( temp, "Elgato", "StreamDeck", "Plugins", "uk.co.seechangehappen.sightline.sdPlugin" );
	await fs.mkdir( plugin, { recursive: true } );
	await fs.writeFile( path.join( plugin, "manifest.json" ), JSON.stringify( { UUID: "uk.co.seechangehappen.sightline", Version: "0.1.9.0" } ) );
	assert.equal( ( await apps.status() ).streamdeck.plugin.version, "0.1.9.0" );
	await fs.writeFile( path.join( plugin, "manifest.json" ), "broken" );
	assert.equal( ( await apps.status() ).streamdeck.plugin, null, "Invalid manifests never count as installed plugins" );
	const linux = createExternalComponents( { ...options, platform: "linux", folder: path.join( temp, "linux" ) } );
	assert.equal( ( await linux.status() ).streamdeck.supported, false );
	const flatpak = createExternalComponents( { ...options, platform: "linux", folder: path.join( temp, "flatpak" ), runFile: async ( command ) => {
		if ( command !== "flatpak" ) throw new Error( "Not native" );
		return { stdout: "Installed Flatpak" };
	} } );
	assert.equal( ( await flatpak.status() ).obs.installed, true );
	assert.ok( componentCandidates( "obs", { platform: "win32", env: { ProgramFiles: "C:\\Apps" } } )[0].endsWith( "obs-studio\\bin\\64bit\\obs64.exe" ) );
	assert.ok( componentCandidates( "streamdeck", { platform: "darwin", home: "/Users/test" } ).some( candidate => candidate.includes( "/Users/test/Applications/" ) ) );
	assert.equal( obsInstallBlock( { installed: false }, "127.0.0.1" )?.includes( "not found" ), true );
	assert.equal( obsInstallBlock( { installed: false }, "[::1]" )?.includes( "not found" ), true );
	assert.equal( obsInstallBlock( { installed: true }, "localhost" ), null );
	assert.equal( obsInstallBlock( { installed: false }, "192.0.2.20" ), null, "Remote OBS does not require a local installation" );
	assert.equal( obsInstallBlock( { installed: false }, "localhost", true ), null, "A confirmed connection is positive availability evidence" );
	assert.match( obsInstallBlock( null, "localhost" ), /Checking/ );
	assert.match( agentReadiness( { kit: { installed: false }, node: { ready: false } } ), /kit.*Node.js/ );
	assert.match( agentReadiness( { kit: { installed: true }, node: { installed: true, ready: false } } ), /update Node.js/ );
	assert.match( agentReadiness( { kit: { installed: true, current: false }, node: { ready: true } } ), /ready.*refresh/ );
	assert.match( agentReadiness( { error: "failed" } ), /could not be checked/ );
	console.log( "PASS: missing/portable/removed applications, plugin manifests, Flatpak, remote OBS and AI kit prerequisites" );
} finally {
	await fs.rm( temp, { recursive: true, force: true } );
}
