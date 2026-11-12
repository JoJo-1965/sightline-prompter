const CONTROLS = "#control-bar, .panel:not(.hidden), #app-menu:not(.hidden), .modal:not(.hidden), dialog[open], #auto-scroll-indicator:not(.hidden), #toast, #capture-override-note:not(.hidden), #session-controls, #overlay-restore";

// Transient view only: do not overwrite reading appearance or recorder state.
export function createOverlayChrome( { getSettings, editing, closePanels, reveal, notify, ignoreMouse, save } ) {
	const doc = document;
	let clean = false, lastPointer = null, lastIgnore = null;
	const restore = Object.assign( doc.createElement( "button" ), { id: "overlay-restore", type: "button", textContent: "Show controls", hidden: true, title: "Show Sightline controls. Ctrl+Shift+X turns click-through off from any app." } );
	restore.setAttribute( "aria-label", "Show Sightline controls and exit clean view" );
	doc.body.appendChild( restore );
	function pointer( event = null ) {
		if ( event ) lastPointer = { x: event.clientX, y: event.clientY };
		const settings = getSettings();
		if ( !settings.clickThrough ) {
			lastIgnore = null;
			return;
		}
		const target = lastPointer && doc.elementFromPoint( lastPointer.x, lastPointer.y );
		const control = target?.closest?.( CONTROLS );
		const usable = control && control.getClientRects().length && getComputedStyle( control ).visibility !== "hidden";
		const ignore = !editing() && !!lastPointer && !usable;
		if ( ignore !== lastIgnore ) {
			lastIgnore = ignore;
			ignoreMouse( ignore );
		}
	}
	function setClean( value ) {
		if ( value && editing() ) return;
		clean = value === true;
		if ( clean ) closePanels();
		doc.body.classList.toggle( "overlay-clean", clean );
		restore.hidden = !clean;
		notify( clean );
		if ( !clean ) reveal();
		sync();
	}
	function sync() {
		const settings = getSettings();
		for ( const [ id, value, label ] of [ [ "cb-click-through", settings.clickThrough, "Click-through" ], [ "cb-on-top", settings.alwaysOnTop, "On top" ] ] ) {
			const button = doc.getElementById( id );
			if ( !button ) continue;
			button.setAttribute( "aria-pressed", String( !!value ) );
			button.textContent = `${ label } ${ value ? "On" : "Off" }`;
		}
		doc.getElementById( "cb-clean-view" )?.setAttribute( "aria-pressed", String( clean ) );
		// Main reapplies native ignore after settings saves; do not trust its old value.
		lastIgnore = null;
		pointer();
	}
	doc.getElementById( "cb-clean-view" )?.addEventListener( "click", () => setClean( !clean ) );
	doc.getElementById( "cb-click-through" )?.addEventListener( "click", () => save( { clickThrough: !getSettings().clickThrough } ) );
	doc.getElementById( "cb-on-top" )?.addEventListener( "click", () => save( { alwaysOnTop: !getSettings().alwaysOnTop } ) );
	restore.addEventListener( "click", () => setClean( false ) );
	doc.addEventListener( "mousemove", pointer, { passive: true } );
	doc.addEventListener( "keydown", ( event ) => {
		if ( clean && event.key === "Escape" ) {
			event.preventDefault();
			setClean( false );
		}
	} );
	return { get active() {
		return clean;
	}, setClean, sync, pointer };
}
