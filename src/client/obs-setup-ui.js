import { showPanelWindow, hidePanelWindow } from "./panel-windows.js";

export function createObsSetupUi( root, { navigate, isBusy, toast } ) {
	const field = id => root.querySelector( `#setup-${ id }` );
	let busy = false;
	let reviewed = null;
	let directory = false;
	let ready = false;
	let stage = "choices";
	const call = async ( action, value ) => {
		const result = await window.electron.obsSetup( action, value );
		if ( !result.ok ) throw new Error( result.error );
		return result;
	};
	function paint() {
		for ( const button of root.querySelectorAll( "[data-setup-stage]" ) ) {
			const active = button.dataset.setupStage === stage;
			button.setAttribute( "aria-selected", String( active ) );
			button.tabIndex = active ? 0 : -1;
			button.disabled = busy || ( button.dataset.setupStage === "review" && !reviewed ) || ( button.dataset.setupStage === "result" && !field( "result" ).textContent );
		}
		for ( const panel of root.querySelectorAll( "[data-setup-panel]" ) ) panel.hidden = panel.dataset.setupPanel !== stage;
		for ( const control of root.querySelectorAll( "select,input,#setup-folder,#setup-refresh,#setup-connection,#setup-restore" ) ) control.disabled = busy;
		field( "review" ).disabled = busy || !ready || !directory || !field( "camera" ).value || !field( "microphone" ).value;
		field( "apply" ).disabled = busy || !reviewed;
		field( "apply" ).hidden = stage !== "review";
		field( "review" ).hidden = stage !== "choices";
		field( "close" ).disabled = busy;
	}
	function choose( next ) {
		stage = next;
		paint();
	}
	function close() {
		if ( busy ) return toast( "OBS setup is in progress. Wait for its result before closing." );
		root.classList.add( "hidden" );
		hidePanelWindow( "obssetup" );
	}
	async function refresh() {
		if ( busy ) return;
		busy = true;
		ready = false;
		reviewed = null;
		stage = "choices";
		field( "status" ).textContent = "Reading configured sources from OBS…";
		paint();
		try {
			const { result } = await call( "inspect" );
			for ( const [ id, choices ] of [ [ "camera", result.cameras ], [ "microphone", result.microphones ], [ "presentation", result.presentations ] ] ) {
				const select = field( id );
				const previous = select.value;
				select.replaceChildren( new Option( id === "presentation" ? "Add a presentation later" : `Choose ${ id } source…`, "" ) );
				for ( const item of choices ) select.append( new Option( item.inputName, item.inputName ) );
				if ( choices.some( item => item.inputName === previous ) ) select.value = previous;
			}
			ready = true;
			field( "status" ).textContent = result.cameras.length && result.microphones.length ? "Choose configured OBS sources. Their device settings are copied; filters and sync offsets are not." : "No supported camera/microphone pair was found. Check sources in OBS, then Refresh. For other source types, use the configuration guide.";
		} catch ( error ) {
			field( "status" ).textContent = error.message;
		} finally {
			busy = false;
			paint();
		}
	}
	field( "folder" ).addEventListener( "click", async () => {
		if ( busy ) return;
		busy = true;
		paint();
		try {
			const result = await call( "folder" );
			if ( !result.cancelled ) {
				directory = true;
				reviewed = null;
				field( "directory" ).textContent = result.directoryLabel;
			}
		} catch ( error ) {
			field( "status" ).textContent = error.message;
		} finally {
			busy = false;
			paint();
		}
	} );
	field( "review" ).addEventListener( "click", async () => {
		if ( busy || field( "review" ).disabled ) return;
		busy = true;
		paint();
		try {
			const { result } = await call( "plan", { name: field( "name" ).value, camera: field( "camera" ).value, microphone: field( "microphone" ).value, presentation: field( "presentation" ).value, height: Number( field( "height" ).value ) } );
			reviewed = result;
			const summary = field( "plan" );
			summary.replaceChildren();
			for ( const line of [ `New profile and collection: ${ result.name }`, `Recording folder: ${ result.directory }`, `Camera: ${ result.camera } · microphone: ${ result.microphone }`, `Presentation: ${ result.presentation }`, `Canvas/output: ${ result.width } × ${ result.height }, ${ result.fps } fps`, ...result.scenes, ...result.notes ] ) summary.append( Object.assign( document.createElement( "p" ), { textContent: line } ) );
			stage = "review";
			field( "status" ).textContent = "Review the complete plan. Create changes OBS; it never starts recording.";
		} catch ( error ) {
			field( "status" ).textContent = error.message;
		} finally {
			busy = false;
			paint();
		}
	} );
	field( "apply" ).addEventListener( "click", async () => {
		if ( busy || !reviewed ) return;
		busy = true;
		field( "status" ).textContent = "Creating the reviewed setup in OBS…";
		paint();
		try {
			const { result } = await call( "apply", reviewed.id );
			field( "result" ).textContent = result.ok ? `${ result.name } is selected in OBS. Existing profiles and collections are retained. Make a test recording and verify camera mode, encoder quality, tracks, clean output and sync before using it for production.` : `${ result.error } (${ result.step }). ${ result.partial ? `Inspect any partial setup named ${ result.partial } in OBS. ` : "" }${ result.restored ? "Previous selection restored." : "Previous selection could not be restored; check OBS before recording." }`;
			field( "restore" ).hidden = !result.ok;
			stage = "result";
			field( "status" ).textContent = result.ok ? "Setup created; a physical recording test remains." : "Setup needs attention. No recording was started.";
		} catch ( error ) {
			field( "status" ).textContent = error.message;
		} finally {
			reviewed = null;
			busy = false;
			paint();
		}
	} );
	field( "restore" ).addEventListener( "click", async () => {
		busy = true;
		paint();
		try {
			await call( "restore" );
			field( "status" ).textContent = "Previous OBS profile and collection selected. The new setup remains available in OBS.";
		} catch ( error ) {
			field( "status" ).textContent = error.message;
		} finally {
			busy = false;
			paint();
		}
	} );
	for ( const input of root.querySelectorAll( "input,select" ) ) input.addEventListener( "change", () => {
		reviewed = null;
		paint();
	} );
	for ( const button of root.querySelectorAll( "[data-setup-stage]" ) ) button.addEventListener( "click", () => choose( button.dataset.setupStage ) );
	root.querySelector( "[role=tablist]" ).addEventListener( "keydown", ( event ) => {
		if ( ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
		event.preventDefault();
		const tabs = [ ...root.querySelectorAll( "[data-setup-stage]:not(:disabled)" ) ];
		const index = tabs.indexOf( event.target );
		const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : ( index + ( event.key === "ArrowLeft" ? -1 : 1 ) + tabs.length ) % tabs.length;
		choose( tabs[next].dataset.setupStage );
		tabs[next].focus();
	} );
	field( "close" ).addEventListener( "click", close );
	field( "refresh" ).addEventListener( "click", refresh );
	field( "guide" ).addEventListener( "click", () => window.electron.openGuide( "15-obs-setup.md" ) );
	field( "connection" ).addEventListener( "click", async () => {
		close();
		await navigate( "obs" );
	} );
	root.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Escape" ) {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	} );
	return {
		close,
		async open() {
			if ( isBusy() ) return toast( "Pause prompting before opening OBS setup" );
			root.classList.remove( "hidden" );
			await showPanelWindow( "obssetup", root );
			await refresh();
			field( "close" ).focus();
		}
	};
}
