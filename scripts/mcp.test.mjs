import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { startRemoteServer } from "../src/remote.js";
import { allowMcpRequest } from "../src/mcp-permissions.js";

const settings = { remoteControl: true, mcpEnabled: true, mcpScripts: false, mcpControls: false, mcpRecording: false, obsEnabled: true, obsControls: true };
let writes = 0;
const token = "ab".repeat( 24 );
const server = startRemoteServer( { port: 0, token: "full-api-test-only", mcpToken: token, allowMcp: ( ...args ) => allowMcpRequest( settings, ...args ), routes: {
	"GET /status": () => ( { appVersion: "test", scrolling: false, slot: 4 } ),
	"POST /load-text": input => { writes++; return { ok: true, name: input.name }; },
	"POST /command": input => { writes++; return { ok: true, action: input.action }; },
	"POST /slot": input => ( { ok: true, ...input } ),
	"POST /settings": () => { writes++; return { ok: true }; },
	"POST /recording/delete": () => { writes++; return { ok: true }; }
} } );
await once( server, "listening" );
const folder = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-mcp-" ) );
const descriptor = path.join( folder, "mcp-control.json" );
await fs.writeFile( descriptor, JSON.stringify( { url: `http://127.0.0.1:${ server.address().port }`, token } ) );
const client = new Client( { name: "sightline-integration-test", version: "1.0.0" } );
const transport = new StdioClientTransport( { command: process.execPath, args: [ path.resolve( "scripts/sightline-mcp.mjs" ) ], env: { ...process.env, SIGHTLINE_SETTINGS: folder }, stderr: "pipe" } );
let stderr = "";
transport.stderr?.on( "data", chunk => stderr += chunk );
try {
	await client.connect( transport );
	const tools = await client.listTools();
	assert.equal( tools.tools.length, 8 );
	const call = ( name, args = {} ) => client.callTool( { name, arguments: args } );
	const status = await call( "sightline_status" );
	assert.equal( JSON.parse( status.content[0].text ).slot, 4 );
	assert.equal( ( await call( "sightline_load_script", { text: "# Test" } ) ).isError, true );
	assert.equal( ( await call( "sightline_prompt", { action: "play" } ) ).isError, true );
	assert.equal( ( await call( "sightline_view", { action: "clean-view", value: "on" } ) ).isError, true );
	assert.equal( writes, 0, "Read-only defaults perform no mutations" );
	settings.mcpScripts = true;
	const loaded = JSON.parse( ( await call( "sightline_load_script", { text: "# Test", name: "Example" } ) ).content[0].text );
	assert.match( loaded.name, /^Example-[a-f\d]{8}$/ );
	settings.mcpControls = true;
	for ( const action of [ "mode-notes", "mode-voice", "mode-scroll", "mode-cycle" ] ) assert.equal( ( await call( "sightline_prompt", { action } ) ).isError, undefined, "Mode selection needs no recording grant" );
	for ( const action of [ "clean-view", "click-through", "always-on-top" ] ) {
		for ( const value of [ "on", "off" ] ) assert.equal( ( await call( "sightline_view", { action, value } ) ).isError, undefined );
		const count = writes;
		assert.equal( ( await call( "sightline_view", { action, value: "toggle" } ) ).isError, true );
		assert.equal( writes, count, "Explicit display values only" );
	}
	assert.equal( ( await call( "sightline_prompt", { action: "play" } ) ).isError, true, "Prompting cannot bypass enabled OBS recording permissions" );
	settings.mcpRecording = true;
	assert.equal( ( await call( "sightline_prompt", { action: "play" } ) ).isError, undefined );
	assert.equal( ( await call( "sightline_record", { action: "obs-pause" } ) ).isError, undefined );
	const before = writes;
	assert.equal( ( await call( "sightline_prompt", { action: "recording/delete" } ) ).isError, true );
	assert.equal( writes, before, "Schema validation prevents unsupported actions" );
	for ( const route of [ "/settings", "/recording/delete" ] ) {
		const result = await fetch( `http://127.0.0.1:${ server.address().port }${ route }`, { method: "POST", headers: { Authorization: `Bearer ${ token }`, "Content-Type": "application/json" }, body: "{}" } );
		assert.equal( result.status, 403, "The app enforces MCP restrictions even if the client bypasses its tools" );
	}
	settings.mcpEnabled = false;
	assert.equal( ( await call( "sightline_status" ) ).isError, true, "Disabling MCP revokes an already-connected client" );
	await fs.rm( descriptor );
	assert.equal( ( await call( "sightline_status" ) ).isError, true );
	assert.equal( stderr.includes( token ), false, "Credentials never appear in adapter diagnostics" );
	console.log( "PASS: official MCP SDK stdio handshake, eight tools, explicit display states, paused-mode permissions, read-only defaults, recording gates, server-side enforcement and live revocation" );
} finally {
	await client.close();
	await transport.close();
	server.closeAllConnections();
	await new Promise( resolve => server.close( resolve ) );
	await fs.rm( folder, { recursive: true, force: true } );
}
