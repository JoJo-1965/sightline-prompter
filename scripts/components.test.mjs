import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createAgentKit, nodeStatus, KIT_FILES } from "../src/components.js";
import { createModelStore } from "../src/model-store.js";
import "./component-availability.test.mjs";

const temp = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-components-" ) );
try {
	const folder = path.join( temp, "ai-kit" );
	const kit = createAgentKit( { source: process.cwd(), folder, version: "test" } );
	assert.equal( ( await kit.status() ).installed, false );
	await kit.change( "install" );
	assert.equal( ( await kit.status() ).installed, true );
	const build = JSON.parse( await fs.readFile( "package.json", "utf8" ) ).build.files;
	for ( const file of KIT_FILES ) assert.ok( build.some( pattern => pattern === file || ( pattern.endsWith( "/**/*" ) && file.startsWith( pattern.slice( 0, -4 ) ) ) || ( pattern === "docs/*.md" && /^docs\/[^/]+\.md$/.test( file ) ) ), `Packaged app must supply ${ file }` );
	assert.equal( ( await nodeStatus() ).ready, true );
	const fixture = path.join( temp, "script.md" );
	await fs.writeFile( fixture, "# Check\n\n## One\n{target: 0:20}\n\nHello there.\n" );
	for ( const args of [ [ "scripts/check-script.mjs", fixture ], [ "scripts/sightline.mjs" ], [ "scripts/sightline.mjs", "recordings", "--json" ] ] ) {
		const result = spawnSync( process.execPath, args, { cwd: folder, env: { ...process.env, SIGHTLINE_SETTINGS: temp }, encoding: "utf8" } );
		assert.equal( result.status, 0, result.stderr );
	}
	const missing = createAgentKit( { source: path.join( temp, "missing" ), folder, version: "bad" } );
	await assert.rejects( missing.change( "reinstall" ), /ENOENT/ );
	assert.equal( ( await kit.status() ).installed, true, "Failed kit repair preserves the existing kit" );
	const first = path.join( folder, KIT_FILES[0] );
	const original = await fs.readFile( first );
	await fs.writeFile( first, Buffer.alloc( original.length ) );
	assert.equal( ( await kit.status() ).installed, false, "Same-size corruption is detected in the managed kit" );
	await fs.writeFile( first, original );
	await fs.unlink( path.join( folder, KIT_FILES[0] ) );
	assert.equal( ( await kit.status() ).installed, false, "Partial install is not called installed" );
	await kit.change( "reinstall" );
	await kit.change( "remove" );
	assert.equal( ( await kit.status() ).installed, false );
	await assert.rejects( kit.change( "../other" ), /Unknown/ );

	const modelFolder = path.join( temp, "models", "model" );
	let fail = false;
	let blocked = false;
	const model = createModelStore( { folder: modelFolder, files: [ [ "model.onnx", 3 ] ], busy: () => blocked, fetchFile: async () => new Response( fail ? "x" : "abc" ) } );
	assert.equal( ( await model.change( "install" ) ).installed, true );
	fail = true;
	assert.match( ( await model.change( "reinstall" ) ).error, /Incomplete/ );
	assert.equal( await fs.readFile( path.join( modelFolder, "model.onnx" ), "utf8" ), "abc" );
	blocked = true;
	await assert.rejects( model.change( "remove" ), /Stop/ );
	assert.equal( model.installed(), true );
	blocked = false;
	await model.change( "remove" );
	assert.equal( model.installed(), false );
	fail = false;
	await model.change( "install" );
	await fs.writeFile( path.join( modelFolder, "model.onnx" ), "x" );
	assert.equal( model.installed(), false, "Truncated model is not usable" );
	console.log( "PASS: standalone AI kit commands, repair rollback, partial installs, model size checks and busy guards" );
} finally {
	await fs.rm( temp, { recursive: true, force: true } );
}
