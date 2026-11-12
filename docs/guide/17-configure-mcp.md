# Configure MCP

RC14 adds `sightline_view` for explicit Clean view, Click-through and On top,
and mode choices in `sightline_prompt`. Refresh the AI kit, then reconnect the
MCP client so its tool list is current. Use status first; eight tools are
available. [Examples and grants](../MCP.md).


1. Open **Connections > Apps and add-ons**. Install or refresh the AI kit and
   install Node.js 22.16 or later if it is not available. Open the installed kit
   folder and find `scripts/sightline-mcp.mjs`.
2. In **Connections > MCP, AI, and API**, enable the local API and **Enable local
   MCP**, then Apply. Keep Sightline running. Read access is the default;
   separately enable script loading, prompting or recording only as needed.
3. Add a local stdio MCP server to your AI client's configuration. Use command
   `node` and the absolute path to the installed script as its argument:

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

Clients with a different configuration format still use the same command and
argument. For a retained preview profile, add `SIGHTLINE_SETTINGS` to that
server's environment with the absolute preview profile directory. The RC14 launcher
on Joanne's PC uses `D:/Sightline/Dev/Profiles/1.3.0-RC14`.
Use the profile of the Sightline instance you actually launched.

Restart/reconnect the MCP server in your AI client and ask it to check Sightline's
status/version. This is a useful first read-only test before granting changes.
If the client reports the wrong app/profile, check its environment and reconnect.
If access is denied, enable the intended grant in Sightline and Apply.

No API key or token belongs in that client configuration or a chat. The adapter
reads the profile's private MCP connection file. Disable MCP and Apply to revoke
access. OBS recording actions additionally require OBS integration and recording
permission. MCP setup is independent of optional online script-writing services.

See [the full MCP reference](../MCP.md) and [setting up your AI](10-setting-up-your-ai.md).
