# Connect a desktop AI client with MCP

Sightline provides a local stdio MCP server in its optional AI kit. It supports
checking the app/version, loading a new script, selecting a slot, prompting
controls, explicit OBS recording commands, listing recordings and reading a
textual edit pack. It uses the official Model Context Protocol SDK.

1. Install Node.js 22.16 or later. In **Connections > Apps and add-ons**, install
   or refresh the AI kit and open its folder.
2. In **Connections > AI and API**, enable the local API and **Enable local MCP**,
   then Apply. Read access is the default. Grant script loading, prompting and
   recording separately, only when needed.
3. Add this stdio server to your desktop client's MCP configuration, replacing
   the example script path with the installed kit's absolute path:

```json
{
  "mcpServers": {
    "sightline": {
      "command": "node",
      "args": ["D:/your-installed-kit/scripts/sightline-mcp.mjs"]
    }
  }
}
```

The JSON shape shown is used by clients with a `mcpServers` configuration.
Clients with another configuration format still use command `node` and the
same script argument. No token goes in your client configuration or chat.
The adapter reads the app's private `mcp-control.json` each time it calls a tool.
For an isolated preview profile, set the client's `SIGHTLINE_SETTINGS` environment
variable to that profile's absolute directory. Otherwise the normal Sightline
profile is used. No npm install is required in the installed kit.

Keep Sightline running. Disable MCP and Apply to revoke access, including an
already-connected client. The MCP key is separate from the full local API key
and Stream Deck key. The app enforces MCP permissions; the full API remains
separately authorised. MCP cannot change settings, read arbitrary files, delete
recordings, open a camera or start microphone capture.

Prompting may trigger recording through linked OBS control or script directives.
Therefore, prompting through MCP also requires its recording grant whenever
OBS recording controls are enabled. Recording commands additionally require
OBS integration and its recording-control permission. Ask your AI client to
get your approval before changing a recording. Use a test session first.

The adapter communicates over stdio and a token-protected loopback app API.
It does not expose a network MCP endpoint, a cloud service or OAuth login.
The seven tools are `sightline_status`, `sightline_load_script`,
`sightline_select_slot`, `sightline_prompt`, `sightline_record`,
`sightline_recordings` and `sightline_edit_pack`. Edit-pack word and caption
timings are live estimates requiring review against the recording.
