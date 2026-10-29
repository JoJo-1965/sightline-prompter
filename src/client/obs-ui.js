// Renderer-only OBS controls. The preload remains a pure IPC bridge.
export function obsStatusText( state ) {
	if ( !state?.enabled ) return "OBS disabled";
	if ( state.connection === "connecting" ) return "Connecting to OBS…";
	if ( state.connection !== "connected" ) return "OBS disconnected · recording status unknown";
	if ( !state.recording ) return "OBS connected · recording status unknown";
	return { recording: "OBS recording", paused: "OBS recording paused", stopped: "OBS stopped" }[state.recording];
}

export function obsActionBlock( state, name, { busy = false, canStart = true } = {} ) {
	if ( name !== "start" && name !== "stop" ) return null;
	if ( !state?.enabled ) return "OBS integration is disabled";
	if ( !state.controls ) return "OBS is in status-only mode";
	if ( state.connection !== "connected" ) return "OBS is not connected; recording status is unknown";
	if ( busy ) return "An OBS command is still waiting for confirmation";
	if ( ![ "stopped", "recording", "paused" ].includes( state.recording ) ) return "OBS recording status is unknown";
	if ( name === "start" && state.recording === "paused" ) return "OBS recording is paused; resume it in OBS first";
	if ( name === "start" && !canStart ) return "Stop the prompter, exit the editor and check voice setup before Record take";
	if ( name === "stop" && state.recording === "stopped" ) return "OBS is already stopped";
	return null;
}

export function createObsUi( { getSettings, canStart, onStart, onFinish, onChange, toast } ) {
	const field = id => document.getElementById( `set-obs-${ id }` );
	let state = { enabled: false, connection: "disabled" };
	let busy = false;
	let markerError = null;
	const bar = document.createElement( "div" );
	bar.id = "obs-status";
	bar.className = "hidden";
	bar.setAttribute( "aria-label", "OBS recording controls" );
	const label = document.createElement( "span" );
	label.setAttribute( "role", "status" );
	label.setAttribute( "aria-live", "polite" );
	const start = Object.assign( document.createElement( "button" ), { type: "button", textContent: "Record take" } );
	const finish = Object.assign( document.createElement( "button" ), { type: "button", textContent: "Finish recording" } );
	start.title = "Confirm OBS is recording, then start the prompter";
	finish.title = "Pause the prompter and stop OBS recording";
	bar.append( label, start, finish );
	document.body.append( bar );
	function paint() {
		bar.classList.toggle( "hidden", !state.enabled );
		bar.classList.toggle( "obs-recording", state.recording === "recording" && state.connection === "connected" );
		label.textContent = obsStatusText( state );
		field( "status" ).textContent = [ obsStatusText( state ), state.error, state.enabled && !state.controls ? "Status only" : "", state.markers && !state.chapters ? "Chapters unavailable until a supported OBS connection is confirmed" : "" ].filter( Boolean ).join( " · " );
		const ready = state.enabled && state.connection === "connected" && state.controls && !busy;
		start.disabled = !ready || !canStart();
		finish.disabled = !ready || ![ "recording", "paused" ].includes( state.recording );
		start.hidden = finish.hidden = !state.controls;
		field( "prepare-slate" ).disabled = !ready || !getSettings().obsRecordedSlate || state.recording !== "stopped";
		field( "slate-status" ).textContent = !getSettings().obsRecordedSlate ? "Recorded slate off" : getSettings().slate === "off" ? "Choose Flash or Flash and beep in Settings > Scrolling > Slate" : state.recordedSlate?.ready ? "Recorded slate source ready · verify the recorded file before a session" : "Prepare the source in this OBS scene before recording";
	}
	function receive( next ) {
		state = next;
		paint();
		onChange( state );
	}
	async function action( name ) {
		const blocked = obsActionBlock( state, name, { busy, canStart: name !== "start" || canStart() } );
		if ( blocked ) {
			toast( blocked );
			return;
		}
		if ( busy ) return;
		busy = true;
		paint();
		onChange( state );
		try {
			if ( name === "stop" ) onFinish();
			const result = await window.electron.obs( name );
			if ( result.state ) receive( result.state );
			if ( !result.ok ) throw new Error( result.error );
			if ( name === "start" && state.enabled && state.connection === "connected" && state.recording === "recording" ) onStart();
			if ( name === "stop" ) toast( "OBS recording finished" );
			if ( name === "test" ) toast( "OBS connection confirmed" );
			if ( name === "slate-prepare" ) toast( "Recorded slate prepared in the current OBS scene" );
		} catch ( error ) {
			toast( error.message || "OBS could not confirm the request" );
		} finally {
			busy = false;
			paint();
			onChange( state );
		}
	}
	start.addEventListener( "click", () => action( "start" ) );
	finish.addEventListener( "click", () => action( "stop" ) );
	field( "test" ).addEventListener( "click", () => action( "test" ) );
	field( "prepare-slate" ).addEventListener( "click", () => action( "slate-prepare" ) );
	window.electron.onObsState( receive );
	window.electron.obs( "status" ).then( ( result ) => {
		if ( result.state ) receive( result.state );
	} ).catch( () => {} );
	return {
		state: () => ( {
			...state, controlBusy: busy,
			canRecord: !obsActionBlock( state, "start", { busy, canStart: state.enabled && state.controls && canStart() } ),
			canFinish: !obsActionBlock( state, "stop", { busy } )
		} ),
		refresh: paint,
		action,
		fill() {
			const settings = getSettings();
			field( "enabled" ).checked = settings.obsEnabled === true;
			field( "host" ).value = settings.obsHost ?? "127.0.0.1";
			field( "port" ).value = settings.obsPort ?? 4455;
			field( "controls" ).checked = settings.obsControls === true;
			field( "markers" ).checked = settings.obsMarkers === true;
			field( "recorded-slate" ).checked = settings.obsRecordedSlate === true;
			field( "password" ).value = "";
			field( "clear-password" ).checked = false;
			window.electron.obs( "status" ).then( ( result ) => {
				field( "password-status" ).textContent = result.hasPassword ? "An OS-protected password is saved. Leave blank to keep it." : "No OBS password saved.";
			} ).catch( () => {} );
			paint();
		},
		async save() {
			const password = field( "password" ).value;
			const result = await window.electron.saveObsSettings( {
				enabled: field( "enabled" ).checked,
				host: field( "host" ).value,
				port: Number( field( "port" ).value ),
				controls: field( "controls" ).checked,
				markers: field( "markers" ).checked,
				recordedSlate: field( "recorded-slate" ).checked,
				...( password ? { password } : {} ),
				clearPassword: field( "clear-password" ).checked
			} );
			if ( !result.ok ) {
				toast( result.error );
				return false;
			}
			field( "password" ).value = "";
			field( "clear-password" ).checked = false;
			field( "password-status" ).textContent = result.hasPassword ? "An OS-protected password is saved." : "No OBS password saved.";
			return true;
		},
		async recordedSlate( info ) {
			if ( !getSettings().obsRecordedSlate || !state.enabled || !state.controls || state.recording !== "recording" ) return null;
			try {
				const result = await window.electron.obs( "slate", info );
				if ( !result.ok ) throw new Error( result.error );
				return result.slate;
			} catch ( error ) {
				toast( error.message );
				return { status: "failed", requestedAt: new Date().toISOString(), ...info, error: error.message, route: "obs-browser-source" };
			}
		},
		chapter( text ) {
			if ( !state.enabled || !state.controls || !state.markers || !state.chapters || state.recording !== "recording" ) return;
			window.electron.obs( "marker", text ).then( ( result ) => {
				if ( !result.ok && markerError !== state.recordingId ) {
					markerError = state.recordingId;
					toast( "OBS could not add chapters. The Sightline markers are still saved; check the OBS recording format." );
				}
			} ).catch( () => {} );
		}
	};
}
