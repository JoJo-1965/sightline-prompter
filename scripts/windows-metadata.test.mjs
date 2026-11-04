// Inspect the packaged PE resource that Windows uses for its process label.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
const exe = path.resolve( process.argv[2] ?? "dist/win-unpacked/Sightline Prompter.exe" );
const text = execFileSync( "powershell.exe", [ "-NoProfile", "-Command", "(Get-Item -LiteralPath $env:SIGHTLINE_METADATA_TEST_EXE).VersionInfo | Select-Object FileDescription,ProductName,LegalCopyright | ConvertTo-Json -Compress" ], { env: { ...process.env, SIGHTLINE_METADATA_TEST_EXE: exe }, windowsHide: true, encoding: "utf8" } );
const info = JSON.parse( text );
assert.equal( info.FileDescription, "Sightline Prompter" );
assert.equal( info.ProductName, "Sightline Prompter" );
assert.match( info.LegalCopyright, /David Neal/ );
assert.match( info.LegalCopyright, /Joanne Lockwood/ );
console.log( "Windows executable has the short Sightline Prompter label and retains both copyright credits." );
