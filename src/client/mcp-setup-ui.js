export function addMcpSetup( host ) {
	const doc = host.ownerDocument;
	const element = ( tag, text = "" ) => Object.assign( doc.createElement( tag ), { textContent: text } );
	const details = element( "details" );
	details.className = "mcp-connection-setup";
	details.append( element( "summary", "Connection setup and test" ) );
	const status = element( "p", "Open to get configuration for this running profile." );
	status.setAttribute( "role", "status" );
	status.setAttribute( "aria-live", "polite" );
	const label = element( "label", "Your AI client " ), format = element( "select" );
	format.id = "mcp-config-format";
	for ( const [ value, text ] of [ [ "json", "Claude Desktop / JSON clients" ], [ "codex", "Codex CLI" ] ] ) {
		const option = element( "option", text );
		option.value = value;
		format.append( option );
	}
	label.append( format );
	const code = element( "textarea" );
	code.id = "mcp-client-config";
	code.readOnly = true;
	code.rows = 11;
	code.spellcheck = false;
	code.setAttribute( "aria-label", "MCP configuration for this profile" );
	const actions = element( "div" );
	actions.className = "settings-inline-actions";
	const copy = element( "button", "Copy configuration" ), check = element( "button", "Check connection" );
	copy.type = check.type = "button";
	actions.append( copy, check );
	const hint = element( "p", "Apply API/MCP settings first. Merge the JSON entry into your client's existing configuration. Run the Codex command in PowerShell on Windows, or a shell on macOS/Linux. Reconnect the client and call sightline_status; eight tools should be available. No secret is included here." );
	hint.className = "field-hint";
	let info;
	const show = () => {
		if ( info ) code.value = info.configurations[format.value];
	};
	async function run( action ) {
		copy.disabled = check.disabled = true;
		try {
			info = await window.electron.mcpSetup( action, format.value );
			show();
			status.textContent = info.message;
		} catch {
			status.textContent = "Setup could not be read. Reopen Settings and try again.";
		} finally {
			copy.disabled = check.disabled = false;
		}
	}
	details.addEventListener( "toggle", () => {
		if ( details.open ) run( "info" );
	} );
	format.addEventListener( "change", show );
	copy.addEventListener( "click", () => run( "copy" ) );
	check.addEventListener( "click", () => run( "check" ) );
	details.append( status, label, code, actions, hint );
	host.append( details );
}
