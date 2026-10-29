// Renderer-only OBS controls. The preload remains a pure IPC bridge.
export function obsStatusText( state ) {
	if ( !state?.enabled ) return "OBS disabled";
	if ( state.connection === "connecting" ) return "Connecting to OBS…";
	if ( state.connection !== "connected" ) return "OBS disconnected · recording status unknown";
	if ( !state.recording ) return "OBS connected · recording status unknown";
	return { recording: "OBS recording", paused: "OBS recording paused", stopped: "OBS stopped" }[state.recording];
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
	}
	function receive( next ) {
		state = next;
		paint();
		onChange( state );
	}
	async function action( name ) {
		if ( busy ) return;
		if ( name === "start" && !canStart() ) {
			toast( "Stop the prompter, exit the editor and check voice setup before Record take" );
			return;
		}
		busy = true;
		paint();
		try {
			if ( name === "stop" ) onFinish();
			const result = await window.electron.obs( name );
			if ( result.state ) receive( result.state );
			if ( !result.ok ) throw new Error( result.error );
			if ( name === "start" && state.enabled && state.connection === "connected" && state.recording === "recording" ) onStart();
			if ( name === "stop" ) toast( "OBS recording finished" );
			if ( name === "test" ) toast( "OBS connection confirmed" );
		} catch ( error ) {
			toast( error.message || "OBS could not confirm the request" );
		} finally {
			busy = false;
			paint();
		}
	}
	start.addEventListener( "click", () => action( "start" ) );
	finish.addEventListener( "click", () => action( "stop" ) );
	field( "test" ).addEventListener( "click", () => action( "test" ) );
	window.electron.onObsState( receive );
	window.electron.obs( "status" ).then( ( result ) => {
		if ( result.state ) receive( result.state );
	} ).catch( () => {} );
	return {
		state: () => state,
		refresh: paint,
		action,
		fill() {
			const settings = getSettings();
			field( "enabled" ).checked = settings.obsEnabled === true;
			field( "host" ).value = settings.obsHost ?? "127.0.0.1";
			field( "port" ).value = settings.obsPort ?? 4455;
			field( "controls" ).checked = settings.obsControls === true;
			field( "markers" ).checked = settings.obsMarkers === true;
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
