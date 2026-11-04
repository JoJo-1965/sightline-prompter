// Renderer-only OBS controls. The preload remains a pure IPC bridge.
import { uiElement } from "./panel-windows.js";
import { obsInstallBlock } from "./component-availability.js";
export function obsStatusText( state ) {
	if ( !state?.enabled ) return "OBS disabled";
	if ( state.connection === "connecting" ) return "Connecting to OBS…";
	if ( state.connection !== "connected" ) return "OBS disconnected · recording status unknown";
	if ( !state.recording ) return "OBS connected · recording status unknown";
	return { recording: "OBS connected · recording", paused: "OBS connected · recording paused", stopped: "OBS connected · not recording" }[state.recording] ?? "OBS connected · recording status unknown";
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
	if ( !state?.enabled ) return "Enable OBS integration in Connections > OBS integration, then Apply.";
	if ( !state.controls ) return "Allow Sightline to start and stop OBS recordings, then Apply.";
	if ( !settings.obsRecordedSlate ) return "Tick Include the slate in the OBS recording, then Apply.";
	if ( state.connection !== "connected" ) return "Connect OBS and use Test saved connection first.";
	if ( state.recording !== "stopped" ) return "OBS must be stopped before preparing the slate source.";
	if ( settings.slate === "off" ) return "Choose Flash or Flash and beep in Recording > Slate and sync.";
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
	let connectionTest = "idle";
	let testedEndpoint = null;
	const endpoint = () => JSON.stringify( [ getSettings().obsEnabled === true, getSettings().obsHost ?? "127.0.0.1", getSettings().obsPort ?? 4455 ] );
	const unsavedConnection = () => field( "enabled" ).checked !== ( getSettings().obsEnabled === true ) || field( "host" ).value !== ( getSettings().obsHost ?? "127.0.0.1" ) || Number( field( "port" ).value ) !== ( getSettings().obsPort ?? 4455 ) || !!field( "password" ).value || field( "clear-password" ).checked;
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
	const testResult = Object.assign( document.createElement( "span" ), { className: "obs-test-result", hidden: true } );
	testResult.setAttribute( "role", "status" );
	testResult.setAttribute( "aria-live", "polite" );
	start.title = "Confirm OBS is recording, then start the prompter";
	finish.title = "Pause the prompter and stop OBS recording";
	bar.append( label, testResult, start, finish );
	document.body.append( bar );
	function paint() {
		const localSetup = [ "127.0.0.1", "localhost", "::1", "[::1]" ].includes( ( getSettings().obsHost ?? "127.0.0.1" ).toLowerCase() );
		const setupReason = !state.enabled || state.connection !== "connected" ? "Enable local OBS, Apply and test its connection first." : !localSetup ? "The assistant needs local OBS. Remote OBS can use the configuration guide." : state.recording !== "stopped" || state.setupBusy ? "Finish the current OBS operation before opening setup." : null;
		field( "setup-open" ).disabled = !!setupReason;
		field( "setup-open" ).setAttribute( "aria-describedby", "set-obs-setup-status" );
		field( "setup-status" ).textContent = setupReason ?? "Ready to inspect configured sources. Recording, streaming and replay buffer must stay stopped. Review the plan before creating it.";
		const installBlock = obsInstallBlock( installation, field( "host" ).value, state.connection === "connected" && field( "host" ).value === ( getSettings().obsHost ?? "127.0.0.1" ) );
		field( "installation" ).textContent = installBlock ?? ( state.connection === "connected" ? "OBS connection confirmed. Recording controls still need your permission." : installation?.installed ? "OBS Studio is installed. Start OBS and enable its WebSocket server, then Apply and test." : "Using an OBS address on another computer. Apply and test the connection." );
		field( "installation" ).hidden = !installBlock && state.connection === "connected";
		field( "enabled" ).disabled = !!installBlock && !field( "enabled" ).checked;
		field( "enabled" ).setAttribute( "aria-describedby", "set-obs-installation" );
		const optionsReady = field( "enabled" ).checked && !installBlock;
		for ( const id of [ "port", "password", "clear-password", "controls", "markers", "recorded-slate" ] ) {
			field( id ).disabled = !optionsReady;
			field( id ).setAttribute( "aria-describedby", "set-obs-installation" );
		}
		const recordingBlock = installBlock ?? ( !field( "enabled" ).checked ? "Enable OBS in Connections > OBS integration to use recording options." : !field( "controls" ).checked ? "Allow recording controls to use chapters and the recorded slate." : null );
		field( "recording-availability" ).textContent = recordingBlock ?? "Recording options are available. Apply changes before using them; the saved connection must be confirmed.";
		for ( const id of [ "markers", "recorded-slate" ] ) {
			field( id ).disabled = !!recordingBlock;
			field( id ).setAttribute( "aria-describedby", "set-obs-recording-availability" );
		}
		field( "follow-prompter" ).disabled = !!recordingBlock || [ "recording", "paused" ].includes( state.recording );
		const pendingConnection = unsavedConnection();
		field( "test" ).disabled = !!installBlock || !state.enabled || busy || pendingConnection;
		field( "test" ).title = installBlock ?? ( pendingConnection ? "Apply connection changes before testing" : !state.enabled ? "Enable OBS and Apply before testing the saved connection" : "Test the saved OBS connection" );
		bar.classList.toggle( "hidden", !state.enabled );
		bar.classList.toggle( "obs-recording", state.recording === "recording" && state.connection === "connected" );
		label.textContent = obsStatusText( state );
		const known = state.connection === "connected" && [ "stopped", "recording", "paused" ].includes( state.recording );
		label.textContent = known ? `OBS ${ { stopped: "OFF", recording: "RECORDING", paused: "PAUSED" }[state.recording] }` : "OBS UNKNOWN";
		label.className = "obs-recording-pill";
		label.dataset.recording = known ? state.recording : "unknown";
		label.title = obsStatusText( state );
		field( "connection-state" ).textContent = `Connection: ${ !state.enabled ? "Disabled" : state.connection === "connected" ? "Connected" : state.connection === "connecting" ? "Connecting…" : "Disconnected" }`;
		field( "recording-state" ).textContent = `Recording: ${ known ? { stopped: "Not recording", recording: "Recording", paused: "Paused" }[state.recording] : "Unknown — connection required" }`;
		field( "status-detail" ).textContent = [ pendingConnection ? "Apply connection changes before testing." : "", state.error, state.enabled && !state.controls ? "Status only · recording controls are off." : "", state.markers && !state.chapters ? "Chapters need a supported OBS connection." : "" ].filter( Boolean ).join( " " );
		const testState = connectionTest === "passed" && ( testedEndpoint !== endpoint() || pendingConnection || state.connection !== "connected" ) ? "stale" : connectionTest;
		const feedback = { idle: "Connection not tested. This checks connectivity; review a test clip for picture and sound.", running: "Testing the saved OBS connection…", passed: "Passed · OBS connection confirmed. Picture and sound still need a test recording.", failed: "Failed · OBS could not confirm the connection. Check OBS, its WebSocket settings and the saved password, then retry.", stale: "Connection test needs repeating: the connection or its settings changed." }[testState];
		for ( const output of [ field( "test-result" ), testResult ] ) {
			output.dataset.result = testState;
			if ( output.textContent !== feedback ) output.textContent = feedback;
		}
		testResult.hidden = connectionTest === "idle";
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
		if ( name === "test" && ( !state.enabled || unsavedConnection() ) ) {
			toast( "Enable OBS and Apply connection changes before testing." );
			return false;
		}
		const blocked = name === "slate-prepare" ? ( unsavedSlateOptions() ? "Apply your OBS changes before preparing the recorded slate." : obsSlateSetupBlock( state, getSettings(), busy ) ) : obsActionBlock( state, name, { busy, canStart: name !== "start" || !prompt || canStart() } );
		if ( blocked ) {
			if ( name === "slate-prepare" ) field( "slate-status" ).textContent = blocked;
			toast( blocked );
			return false;
		}
		if ( busy ) return false;
		busy = true;
		if ( name === "test" ) connectionTest = "running";
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
			if ( name === "test" ) {
				if ( state.connection !== "connected" ) throw new Error( "OBS did not confirm a connection" );
				connectionTest = "passed";
				testedEndpoint = endpoint();
				toast( "OBS connection confirmed" );
			}
			if ( name === "slate-prepare" ) toast( "Recorded slate prepared in the current OBS scene" );
			return true;
		} catch ( error ) {
			if ( name === "test" ) connectionTest = "failed";
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
	for ( const id of [ "host", "port", "password", "clear-password" ] ) field( id ).addEventListener( "input", paint );
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
		options() {
			const password = field( "password" ).value;
			return { enabled: field( "enabled" ).checked, host: field( "host" ).value, port: Number( field( "port" ).value ), controls: field( "controls" ).checked, followPrompter: field( "follow-prompter" ).checked, markers: field( "markers" ).checked, recordedSlate: field( "recorded-slate" ).checked, ...( password ? { password } : {} ), clearPassword: field( "clear-password" ).checked };
		},
		saved( result ) {
			connectionTest = "idle";
			field( "password" ).value = "";
			field( "clear-password" ).checked = false;
			field( "password-status" ).textContent = result?.hasPassword ? "An OS-protected password is saved." : "No OBS password saved.";
		},
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
