export function agentReadiness( status ) {
	if ( !status ) return "Checking local AI kit commands…";
	if ( status.error ) return "Local AI kit commands could not be checked. Use Components > Check again.";
	const missing = [];
	if ( !status.kit.installed ) missing.push( "install the AI agent kit" );
	if ( !status.node.ready ) missing.push( status.node.installed ? "update Node.js to 22.16 or later" : "install Node.js 22.16 or later" );
	return missing.length ? `Local AI kit commands need setup: ${ missing.join( " and " ) }.` : `Local AI kit commands ready.${ status.kit.current ? "" : " A kit refresh is available in Components." }`;
}

export function obsInstallBlock( installed, host, connected = false ) {
	if ( connected ) return null;
	const local = /^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?|\[?::ffff:127(?:\.\d{1,3}){3}\]?)$/i.test( host.trim() ) || !host.trim();
	if ( !local ) return null;
	if ( !installed ) return "Checking for OBS Studio on this computer…";
	if ( installed.installed ) return null;
	return "OBS Studio was not found. Install it or use Locate in Components. For OBS on another computer, enter its address.";
}

export function createComponentAvailability( root, { navigate } ) {
	const field = id => root.querySelector( `#${ id }` );
	let components = null;
	let remote = {};
	function paint() {
		field( "set-agent-readiness" ).textContent = agentReadiness( components );
		const on = field( "set-remote" ).checked;
		const tokenReady = on && remote.enabled && remote.running && !!remote.token;
		const reason = !on ? remote.enabled ? "Off in this draft. Apply turns off the saved API; these controls retain their values." : "Enable AI & API, then Apply, to use these controls." : !tokenReady ? "Choose a port and Apply. Token controls need the saved API to be running." : "Apply saves changes to the port and deletion permission.";
		field( "set-remote-controls-hint" ).textContent = reason;
		for ( const id of [ "set-remote-port", "set-remote-delete", "set-remote-token", "set-remote-copy", "set-remote-new" ] ) {
			const control = field( id );
			control.disabled = [ "set-remote-port", "set-remote-delete" ].includes( id ) ? !on : !tokenReady;
			control.title = control.disabled ? reason : "";
			control.setAttribute( "aria-describedby", "set-remote-controls-hint" );
		}
		const app = components?.streamdeck;
		const confirmed = remote.streamDeckPeer?.connected;
		const available = app?.installed || confirmed;
		const enabled = field( "set-stream-deck" );
		enabled.disabled = !enabled.checked && !available;
		enabled.setAttribute( "aria-describedby", "set-stream-deck-installation" );
		field( "set-stream-deck-installation" ).textContent = available ? "Stream Deck is available. Enable control and Apply, then check the plugin connection below." : app?.supported === false ? "Stream Deck software is available for Windows and macOS. Phone and pad controls remain available." : components ? "Stream Deck was not found. Install it or use Locate in Components." : "Checking for Stream Deck…";
	}
	for ( const id of [ "set-remote", "set-stream-deck" ] ) field( id ).addEventListener( "change", paint );
	for ( const [ id, topic ] of [ [ "set-remote-components", "component-kit" ], [ "set-stream-deck-components", "component-streamdeck" ], [ "set-obs-components", "component-obs" ] ] ) field( id ).addEventListener( "click", () => navigate( topic ) );
	return {
		fill: paint,
		components( next ) {
			components = next;
			paint();
		},
		remote( next ) {
			remote = next;
			paint();
		}
	};
}
