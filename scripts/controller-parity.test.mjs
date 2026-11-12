import assert from "node:assert/strict";
import { CONTROL_ACTIONS, PAD_PRESETS, DEFAULT_PAD_LAYOUT, controlView, normalisePadLayout } from "../src/client/control-actions.js";
import { MAPPING_ACTIONS } from "../src/client/input-mappings.js";
import { controlIcon } from "../src/client/control-icons.js";
import { allowMcpRequest } from "../src/mcp-permissions.js";
const shared = [ "clean-view", "click-through", "always-on-top", "mode-notes", "mode-voice", "mode-scroll", "mode-cycle" ];
for ( const id of shared ) {
	assert.ok( CONTROL_ACTIONS.some( a => a.id === id ) );
	assert.ok( MAPPING_ACTIONS.some( a => a.id === id ) );
	assert.ok( controlIcon( id, {} ).includes( "<svg" ) );
	assert.equal( controlView( id, { editing: true } ).disabled, true );
}
assert.deepEqual( DEFAULT_PAD_LAYOUT, { columns: 4, buttons: [ "restart", "previous-section", "toggle", "next-section" ] } );
assert.deepEqual( normalisePadLayout( PAD_PRESETS.call ), PAD_PRESETS.call );
assert.equal( PAD_PRESETS.call.buttons.some( a => a.startsWith( "obs-" ) ), false );
assert.equal( controlView( "mode-scroll", { scrolling: true, readingModeBusy: false } ).disabled, false );
assert.equal( controlView( "mode-scroll", { scrolling: true } ).disabled, true, "Older state stays conservative" );
assert.equal( controlView( "clean-view", { cleanOverlay: true } ).label, "Show controls" );
assert.equal( controlView( "always-on-top", { alwaysOnTop: true } ).active, true );
const grants = { remoteControl: true, mcpEnabled: true, mcpControls: true, obsEnabled: true, obsControls: true, mcpRecording: false };
for ( const action of [ "clean-view", "click-through", "always-on-top" ] ) {
	assert.equal( allowMcpRequest( grants, "POST", "/command", { action, value: "off" } ), true );
	assert.equal( allowMcpRequest( grants, "POST", "/command", { action } ), false );
	assert.equal( allowMcpRequest( { ...grants, mcpControls: false }, "POST", "/command", { action, value: "on" } ), false );
}
assert.equal( allowMcpRequest( grants, "POST", "/command", { action: "play" } ), false );
console.log( "Controller parity: optional call preset, shared/mappable controls, held-mode guards, recovery state and bounded MCP grants pass" );
