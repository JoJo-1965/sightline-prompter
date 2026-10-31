import { showPanelWindow, hidePanelWindow } from "./panel-windows.js";

export function workflowRows( state, session = false ) {
	const { settings, components, obs, microphone, guideShown, scriptTitle, phone } = state;
	const voice = settings.scrollMode === "voice";
	const readyVoice = settings.voiceEngine === "deepgram" ? settings.hasDeepgramKey : components?.speech?.installed && !components.speech.downloading;
	if ( !session ) return [
		[ "Prompting and microphone", voice ? readyVoice ? "Voice following is configured; try a sample aloud." : "Voice setup needs attention. Choose an engine and microphone." : "Steady scrolling is ready. Voice following is optional.", "Choose setup…", "scrolling" ],
		[ "OBS recording", settings.obsEnabled ? obs.connection === "connected" ? "OBS is connected. Review your recording setup before a session." : "OBS is enabled; the connection needs attention." : "Optional: create a separate recording profile and scenes.", "Set up OBS…", "obs-setup" ],
		[ "Your controls", "Use the keyboard or pad. Phone and Stream Deck control are optional.", "Choose controls…", "pad" ],
		[ "Work with your AI", components?.kit?.installed && components.node?.ready ? "Local kit commands are ready. Assistant/API permissions are separate." : "Optional: authoring skills, script checks and automation tools.", "Set up my AI…", "remotes" ]
	];
	const rows = [
		[ "Script and prompting", `${ scriptTitle || "Open a script or sample" } · ${ voice ? "Voice" : "Steady" }${ voice && !readyVoice ? " — voice setup needs attention" : "" }`, "Script review…", "review" ],
		[ "Microphone and sound", `${ microphone || "Default microphone" }. Check room noise and spoken level before recording.`, "Sound check…", "sound" ],
		[ "Framing", guideShown ? "Head guide visible. Compare Ideal and Actual against the camera preview." : "Show your saved guide and check the camera preview.", "Head guide…", "guide" ]
	];
	if ( settings.obsEnabled ) rows.push( [ "OBS recording", obs.connection === "connected" ? `Connection confirmed · ${ obs.recording || "recording state unknown" }. Verify your selected output folder in OBS.` : "Connection not confirmed. Recording controls are unavailable.", "OBS settings…", "obs-recording" ] );
	rows.push( [ "Sync reference", settings.obsEnabled && settings.obsRecordedSlate ? obs.recordedSlate?.ready ? "Recorded source prepared. Verify the flash and tone in a test file." : "Prepare the recorded source, then verify a test file." : "On-screen slate is an optional reference; a camera clap checks lip sync.", "Slate settings…", settings.obsEnabled ? "obs-recording" : "recording" ] );
	rows.push( [ "Controls", settings.phoneRemote ? phone?.running ? "Phone remote server is running. Test your chosen buttons." : "Phone remote is enabled; check its connection." : "Test the keyboard, pad or Stream Deck buttons you plan to use.", "Control settings…", "pad" ] );
	return rows;
}

export function createWorkflow( root, { getState, navigate, act, isBusy, toast } ) {
	let mode = "start";
	let generation = 0;
	const field = id => root.querySelector( `#${ id }` );
	function close() {
		generation++;
		root.classList.add( "hidden" );
		hidePanelWindow( "workflow" );
	}
	async function refresh() {
		const id = ++generation;
		field( "workflow-status" ).textContent = "Checking this setup…";
		try {
			const state = await getState();
			if ( id !== generation ) return;
			field( "workflow-rows" ).replaceChildren();
			for ( const [ title, text, label, target ] of workflowRows( state, mode === "session" ) ) {
				const row = document.createElement( "section" );
				row.className = "workflow-row";
				const description = document.createElement( "div" );
				const heading = Object.assign( document.createElement( "strong" ), { textContent: title } );
				const hint = Object.assign( document.createElement( "p" ), { textContent: text } );
				const button = Object.assign( document.createElement( "button" ), { textContent: label, type: "button" } );
				button.addEventListener( "click", async () => {
					close();
					if ( [ "sound", "guide", "review" ].includes( target ) ) act( target );
					else await navigate( target );
				} );
				description.append( heading, hint );
				row.append( description, button );
				field( "workflow-rows" ).append( row );
			}
			field( "workflow-status" ).textContent = mode === "session" ? "This checklist does not start a recording or certify the captured picture/sound." : "Optional tools can be skipped. Reopen Getting started from Help.";
		} catch ( error ) {
			if ( id === generation ) field( "workflow-status" ).textContent = error.message;
		}
	}
	field( "workflow-close" ).addEventListener( "click", close );
	field( "workflow-sample" ).addEventListener( "click", () => {
		close();
		window.electron.openSample( "welcome.md" );
	} );
	field( "workflow-refresh" ).addEventListener( "click", refresh );
	field( "workflow-guide" ).addEventListener( "click", () => window.electron.openGuide( mode === "session" ? "12-production-handover.md" : "01-getting-started.md" ) );
	root.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Escape" ) {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	} );
	return {
		close,
		async open( next = "start" ) {
			if ( isBusy() ) return toast( "Pause prompting before opening the checklist" );
			mode = next;
			field( "workflow-title" ).textContent = mode === "session" ? "Session check" : "Get ready with Sightline";
			field( "workflow-sample" ).hidden = mode === "session";
			field( "workflow-close" ).textContent = mode === "session" ? "Done" : "Later";
			root.classList.remove( "hidden" );
			await showPanelWindow( "workflow", root );
			await refresh();
			field( "workflow-close" ).focus();
		}
	};
}
