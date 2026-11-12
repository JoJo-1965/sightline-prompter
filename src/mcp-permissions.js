export const MCP_PROMPT_ACTIONS = [ "play", "pause", "restart", "next-section", "previous-section", "go-to-section", "set-wpm", "marker", "keeper", "scrap", "mode-notes", "mode-voice", "mode-scroll", "mode-cycle" ];
export const MCP_MODE_ACTIONS = [ "mode-notes", "mode-voice", "mode-scroll", "mode-cycle" ];
export const MCP_VIEW_ACTIONS = [ "clean-view", "click-through", "always-on-top" ];
export const MCP_RECORD_ACTIONS = [ "obs-on", "obs-off", "obs-pause", "obs-resume" ];

// Enforced by the app, independently of what tools an MCP client displays.
export function allowMcpRequest( settings, method, route, body = {} ) {
	if ( !settings.remoteControl || !settings.mcpEnabled ) return false;
	if ( method === "GET" ) return [ "/status", "/recordings", "/recording", "/recording/pack" ].includes( route );
	if ( method !== "POST" ) return false;
	if ( route === "/slot" ) return settings.mcpScripts === true && Number.isInteger( body.slot ) && body.slot >= 1 && body.slot <= 9;
	if ( route === "/load-text" ) return settings.mcpScripts === true && typeof body.text === "string" && body.text.trim().length > 0 && body.text.length <= 500000;
	if ( route !== "/command" ) return false;
	if ( MCP_VIEW_ACTIONS.includes( body.action ) ) return settings.mcpControls === true && [ "on", "off" ].includes( body.value );
	if ( MCP_MODE_ACTIONS.includes( body.action ) ) return settings.mcpControls === true && body.value === undefined;
	if ( MCP_RECORD_ACTIONS.includes( body.action ) ) return settings.mcpRecording === true && settings.obsEnabled === true && settings.obsControls === true;
	if ( !MCP_PROMPT_ACTIONS.includes( body.action ) || !settings.mcpControls ) return false;
	if ( body.action === "set-wpm" && ( !Number.isInteger( body.value ) || body.value < 40 || body.value > 400 ) ) return false;
	if ( body.action === "go-to-section" && ( !Number.isInteger( body.value ) || body.value < 1 || body.value > 400 ) ) return false;
	// Prompting can trigger linked recording or script {record: …} directives.
	return !settings.obsEnabled || !settings.obsControls || settings.mcpRecording === true;
}
