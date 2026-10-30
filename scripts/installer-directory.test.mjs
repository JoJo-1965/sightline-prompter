import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
if ( process.platform === "win32" ) {
	const run = promisify( execFile );
	const out = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-install-directory-" ) );
	const exe = path.join( out, "directory-preview.exe" ), result = path.join( out, "result.txt" );
	await run( path.join( process.env.LOCALAPPDATA, "electron-builder/Cache/nsis/nsis-3.0.4.1/makensis.exe" ), [ "/V1", `/DPREVIEW_OUT=${ exe }`, `/DPREVIEW_RESULT=${ result }`, "scripts/installer-directory-preview.nsi" ], { windowsHide: true } );
	for ( const destination of [ "C:\\Program Files\\Sightline Prompter", "D:\\Test builds\\Sightline Prompter" ] ) {
		await run( "pwsh", [ "-NoProfile", "-Command", ". $env:SIGHTLINE_INSTALL_SCRIPT; $sightlineArguments=Get-SightlineInstallArguments -Directory $env:SIGHTLINE_INSTALL_TARGET -Silent; $fixture=Start-Process -FilePath $env:SIGHTLINE_INSTALL_FIXTURE -ArgumentList $sightlineArguments -WindowStyle Hidden -Wait -PassThru; exit $fixture.ExitCode" ], { windowsHide: true, env: { ...process.env, SIGHTLINE_INSTALL_SCRIPT: path.resolve( "scripts/install-candidate.ps1" ), SIGHTLINE_INSTALL_FIXTURE: exe, SIGHTLINE_INSTALL_TARGET: destination } } );
		assert.equal( await fs.readFile( result, "utf8" ), destination, "NSIS must retain the complete folder, including spaces" );
	}
	console.log( "Installer directory: real NSIS parser retained complete paths with spaces; no installation/elevation or app changes." );
}
