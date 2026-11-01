// Renderer-only OBS controls. The preload remains a pure IPC bridge.
import { uiElement } from "./panel-windows.js";
import { obsInstallBlock } from "./component-availability.js";
export function obsStatusText( state ) {
	if ( !state?.enabled ) return "OBS disabled";
	if ( state.connection === "connecting" ) return "Connecting to OBS…";
	if ( state.connection !== "connected" ) return "OBS disconnected · recording status unknown";
	if ( !state.recording ) return "OBS connected · recording status unknown";
	return { recording: "OBS recording", paused: "OBS recording paused", stopped: "OBS stopped" }[state.recording];
}

export function obsActionBlock( state, name, { busy = false, canStart = true } = {} ) {
	if ( ![ "start", "stop", "pause", "resume" ].includes( name ) ) return null;
	if ( !state?.enabled ) return "OBS integration is disabled";
	if ( state.setupBusy ) return "OBS setup is in progress";
	if ( !state.controls ) return "OBS is in status-only mode";
	if ( state.connection !== "connected" ) return "OBS is not connected; recording status is unknown";
	if ( busy ) return "An OBS command is still waiting for confirmation";
	if ( ![ "stopped", "recording", "paused" ].includes( state.recording ) ) return "OBS recording status is unknown";
	if ( name === "start" && state.recording === "paused" ) return "OBS recording is paused; resume it in OBS first";
	if ( name === "start" && !canStart ) return "Stop the prompter, exit the editor and check voice setup before Record take";
	if ( name === "stop" && state.recording === "stopped" ) return "OBS is already stopped";
	if ( [ "pause", "resume" ].includes( name ) && state.recording === "stopped" ) return "Start OBS recording first";
	return null;
}

export function obsSlateSetupBlock( state, settings, busy = false ) {
	if ( busy ) return "Waiting for OBS confirmation…";
	if ( !state?.enabled ) return "Enable OBS integration in Recording > OBS connection, then Apply.";
	if ( !state.controls ) return "Allow Sightline to start and stop OBS recordings, then Apply.";
	if ( !settings.obsRecordedSlate ) return "Tick Include the slate in the OBS recording, then Apply.";
	if ( state.connection !== "connected" ) return "Connect OBS and use Test saved connection first.";
	if ( state.recording !== "stopped" ) return "OBS must be stopped before preparing the slate source.";
	if ( settings.slate === "off" ) return "Choose Flash or Flash and beep in Recording > Takes.";
	return null;
}

export function createObsUi( { getSettings, canStart, onStart, onFinish, onChange, toast } ) {
	const field = id => uiElement( `set-obs-${ id }` );
	let state = { enabled: false, connection: "disabled" };
	let busy = false;
	let markerError = null;
	let slateFeedback = null;
	let preparingSlate = false;
	let installation = null;
	const unsavedSlateOptions = () => field( "enabled" ).checked !== !!state.enabled || field( "controls" ).checked !== !!state.controls || field( "recorded-slate" ).checked !== !!getSettings().obsRecordedSlate;
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
		const localSetup = [ "127.0.0.1", "localhost", "::1", "[::1]" ].includes( ( getSettings().obsHost ?? "127.0.0.1" ).toLowerCase() );
		const setupReason = !state.enabled || state.connection !== "connected" ? "Enable local OBS, Apply and test its connection first." : !localSetup ? "The assistant needs local OBS. Remote OBS can use the configuration guide." : state.recording !== "stopped" || state.setupBusy ? "Finish the current OBS operation before opening setup." : null;
		field( "setup-open" ).disabled = !!setupReason;
		field( "setup-open" ).setAttribute( "aria-describedby", "set-obs-setup-status" );
		field( "setup-status" ).textContent = setupReason ?? "Ready to inspect configured sources. Recording, streaming and replay buffer must stay stopped. Review the plan before creating it.";
		const installBlock = obsInstallBlock( installation, field( "host" ).value, state.connection === "connected" && field( "host" ).value === ( getSettings().obsHost ?? "127.0.0.1" ) );
		field( "installation" ).textContent = installBlock ?? ( state.connection === "connected" ? "OBS connection confirmed. Recording controls still need your permission." : installation?.installed ? "OBS Studio is installed. Start OBS and enable its WebSocket server, then Apply and test." : "Using an OBS address on another computer. Apply and test the connection." );
		field( "enabled" ).disabled = !!installBlock && !field( "enabled" ).checked;
		field( "enabled" ).setAttribute( "aria-describedby", "set-obs-installation" );
		const optionsReady = field( "enabled" ).checked && !installBlock;
		for ( const id of [ "port", "password", "clear-password", "controls", "markers", "recorded-slate" ] ) {
			field( id ).disabled = !optionsReady;
			field( id ).setAttribute( "aria-describedby", "set-obs-installation" );
		}
		const recordingBlock = installBlock ?? ( !field( "enabled" ).checked ? "Enable OBS in Recording > OBS connection to use recording options." : !field( "controls" ).checked ? "Allow recording controls to use chapters and the recorded slate." : null );
		field( "recording-availability" ).textContent = recordingBlock ?? "Recording options are available. Apply changes before using them; the saved connection must be confirmed.";
		for ( const id of [ "markers", "recorded-slate" ] ) {
			field( id ).disabled = !!recordingBlock;
			field( id ).setAttribute( "aria-describedby", "set-obs-recording-availability" );
		}
		field( "follow-prompter" ).disabled = !!recordingBlock || [ "recording", "paused" ].includes( state.recording );
		field( "test" ).disabled = !!installBlock || !state.enabled || busy;
		field( "test" ).title = installBlock ?? ( !state.enabled ? "Enable OBS and Apply before testing the saved connection" : "Test the saved OBS connection" );
		bar.classList.toggle( "hidden", !state.enabled );
		bar.classList.toggle( "obs-recording", state.recording === "recording" && state.connection === "connected" );
		label.textContent = obsStatusText( state );
		const known = state.connection === "connected" && [ "stopped", "recording", "paused" ].includes( state.recording );
		label.textContent = known ? `OBS ${ { stopped: "OFF", recording: "RECORDING", paused: "PAUSED" }[state.recording] }` : "OBS UNKNOWN";
		label.className = "obs-recording-pill";
		label.dataset.recording = known ? state.recording : "unknown";
		label.title = obsStatusText( state );
		field( "status" ).textContent = [ obsStatusText( state ), state.error, state.enabled && !state.controls ? "Status only" : "", state.markers && !state.chapters ? "Chapters unavailable until a supported OBS connection is confirmed" : "" ].filter( Boolean ).join( " · " );
		const ready = state.enabled && state.connection === "connected" && state.controls && !busy && !state.setupBusy;
		start.disabled = !ready || !canStart();
		finish.disabled = !ready || ![ "recording", "paused" ].includes( state.recording );
		start.hidden = finish.hidden = !state.controls;
		const slateBlock = installBlock ?? ( unsavedSlateOptions() ? "Apply your OBS changes before preparing the recorded slate." : obsSlateSetupBlock( state, getSettings(), busy ) );
		field( "prepare-slate" ).disabled = !!slateBlock;
		field( "prepare-slate" ).title = slateBlock ?? "Add the recorded slate source to the current OBS scene";
		field( "prepare-slate" ).textContent = preparingSlate ? "Preparing recorded slate…" : "Prepare recorded slate";
		field( "slate-status" ).textContent = preparingSlate ? "Preparing the recorded slate in the current OBS scene…" : slateBlock ?? slateFeedback ?? ( state.recordedSlate?.ready ? "Recorded slate source ready · verify the recorded file before a session" : "Prepare the source in this OBS scene before recording" );
	}
	function receive( next ) {
		state = next;
		paint();
		onChange( state );
	}
	async function action( name, { prompt = true } = {} ) {
		const blocked = name === "slate-prepare" ? ( unsavedSlateOptions() ? "Apply your OBS changes before preparing the recorded slate." : obsSlateSetupBlock( state, getSettings(), busy ) ) : obsActionBlock( state, name, { busy, canStart: name !== "start" || !prompt || canStart() } );
		if ( blocked ) {
			if ( name === "slate-prepare" ) field( "slate-status" ).textContent = blocked;
			toast( blocked );
			return false;
		}
		if ( busy ) return false;
		busy = true;
		preparingSlate = name === "slate-prepare";
		if ( preparingSlate ) slateFeedback = null;
		paint();
		onChange( state );
		try {
			if ( ( name === "stop" || name === "pause" ) && prompt ) onFinish();
			const result = await window.electron.obs( name );
			if ( result.state ) receive( result.state );
			if ( !result.ok ) throw new Error( result.error );
			if ( ( name === "start" || name === "resume" ) && prompt && state.enabled && state.connection === "connected" && state.recording === "recording" ) onStart();
			if ( name === "stop" ) toast( "OBS recording finished" );
			if ( name === "test" ) toast( "OBS connection confirmed" );
			if ( name === "slate-prepare" ) toast( "Recorded slate prepared in the current OBS scene" );
			return true;
		} catch ( error ) {
			if ( name === "slate-prepare" ) slateFeedback = `Could not prepare the recorded slate: ${ error.message }`;
			toast( error.message || "OBS could not confirm the request" );
			return false;
		} finally {
			busy = false;
			preparingSlate = false;
			paint();
			onChange( state );
		}
	}
	start.addEventListener( "click", () => action( "start" ) );
	finish.addEventListener( "click", () => action( "stop" ) );
	field( "test" ).addEventListener( "click", () => action( "test" ) );
	field( "prepare-slate" ).addEventListener( "click", () => action( "slate-prepare" ) );
	for ( const id of [ "enabled", "controls", "recorded-slate" ] ) field( id ).addEventListener( "change", () => {
		slateFeedback = null;
		paint();
	} );
	field( "host" ).addEventListener( "input", paint );
	window.electron.onObsState( receive );
	window.electron.obs( "status" ).then( ( result ) => {
		if ( result.state ) receive( result.state );
	} ).catch( () => {} );
	return {
		installation( value ) {
			installation = value;
			paint();
		},
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
			field( "follow-prompter" ).checked = settings.obsFollowPrompter === true;
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
				followPrompter: field( "follow-prompter" ).checked,
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
