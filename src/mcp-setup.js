import fs from "node:fs/promises";
import path from "node:path";

export function mcpConfigurations( { adapter, profile, platform = process.platform } ) {
	const portable = value => value.replaceAll( "\\", "/" );
	const script = portable( adapter ), settings = portable( profile );
	const quote = value => platform === "win32" ? `'${ value.replaceAll( "'", "''" ) }'` : `'${ value.replaceAll( "'", "'\\''" ) }'`;
	return {
		json: JSON.stringify( { mcpServers: { sightline: { command: "node", args: [ script ], env: { SIGHTLINE_SETTINGS: settings } } } }, null, 2 ),
		codex: `codex mcp add sightline --env ${ quote( `SIGHTLINE_SETTINGS=${ settings }` ) } -- node ${ quote( script ) }`
	};
}

export async function checkMcpConnection( profile, fetcher = fetch ) {
	let descriptor;
	try {
		const file = path.join( profile, "mcp-control.json" );
		if ( ( await fs.stat( file ) ).size > 8192 ) throw Error();
		descriptor = JSON.parse( await fs.readFile( file, "utf8" ) );
	} catch {
		return { ok: false, message: "Enable the local API and MCP, then Apply. Use the profile of the running Sightline instance." };
	}
	let url;
	try {
		url = new URL( descriptor.url );
	} catch {
		return { ok: false, message: "The local connection file is invalid. Apply MCP settings again." };
	}
	if ( url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !/^[a-f\d]{48}$/.test( descriptor.token ) ) return { ok: false, message: "The local connection file is invalid. Apply MCP settings again." };
	try {
		const response = await fetcher( new URL( "/status", url ), { redirect: "error", signal: AbortSignal.timeout( 5000 ), headers: { Authorization: `Bearer ${ descriptor.token }` } } );
		if ( !response.ok ) return { ok: false, message: response.status === 401 ? "Access was revoked. Apply MCP settings and reconnect your client." : response.status === 403 ? "Status access was refused. Check the applied MCP settings." : "The local status check failed. Check Debug > Status and recovery." };
		const status = await response.json();
		return { ok: true, message: "Sightline answered the read-only connection check. Reconnect your AI client and call sightline_status to verify its MCP setup.", version: status.version ?? status.appVersion ?? null };
	} catch {
		return { ok: false, message: "Sightline is not answering at this profile's address. Start the matching instance, Apply and try again." };
	}
}
