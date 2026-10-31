import { normalisePadLayout, controlView } from "./control-actions.js";
import { controlIcon } from "./control-icons.js";

export function createControlButtons( root, onCommand, options = {} ) {
	let signature = "";
	let current = {};
	let offline = false;
	let hold = null;
	let ignoreClickUntil = 0;
	const recording = status => JSON.stringify( [ status.obs?.recordingId ?? null, status.obs?.outputPath ?? null ] );
	const protectedFinish = button => button?.dataset.action === "obs-finish" && current.padLayout?.holdToFinish !== false;
	function cancelHold() {
		if ( !hold ) return;
		const previous = hold;
		hold = null;
		previous.cancelled = true;
		clearInterval( previous.timer );
		previous.button.classList.remove( "holding" );
		previous.button.style.removeProperty( "--hold-progress" );
		previous.button.lastElementChild.textContent = "Finish recording";
		if ( previous.token ) Promise.resolve( options.hold?.cancel( previous.token ) ).catch( () => {} );
		ignoreClickUntil = Date.now() + 500;
	}
	async function beginHold( button ) {
		if ( hold || button.disabled || offline ) return;
		const pending = { button, identity: recording( current ), cancelled: false };
		hold = pending;
		button.classList.add( "holding" );
		options.feedback?.( "Keep holding to finish the recording…" );
		try {
			const reply = await options.hold.begin();
			if ( pending.cancelled ) {
				await options.hold.cancel( reply.token );
				return;
			}
			pending.token = reply.token;
			const started = performance.now();
			pending.timer = setInterval( async () => {
				if ( offline || button.disabled || button.hidden || recording( current ) !== pending.identity ) {
					cancelHold();
					return;
				}
				const progress = Math.min( 100, Math.floor( ( performance.now() - started ) / 1000 * 100 ) );
				button.style.setProperty( "--hold-progress", `${ progress }%` );
				button.lastElementChild.textContent = `Hold · ${ progress }%`;
				if ( progress < 100 ) return;
				const token = pending.token;
				pending.token = null;
				cancelHold();
				await onCommand( "obs-finish", { holdToken: token } );
			}, 100 );
		} catch ( error ) {
			cancelHold();
			options.feedback?.( error.message, true );
		}
	}
	root.addEventListener( "click", ( event ) => {
		const button = event.target.closest( "button[data-action]" );
		if ( !button || button.disabled || button.hidden ) return;
		if ( protectedFinish( button ) ) {
			if ( Date.now() > ignoreClickUntil ) options.feedback?.( "Hold Finish for one second. With a keyboard, hold Enter or Space." );
			return;
		}
		onCommand( button.dataset.action );
	} );
	root.addEventListener( "pointerdown", ( event ) => {
		const button = event.target.closest( "button[data-action]" );
		if ( event.button !== 0 || !protectedFinish( button ) || button.disabled ) return;
		button.setPointerCapture?.( event.pointerId );
		beginHold( button );
	} );
	for ( const name of [ "pointerup", "pointercancel", "lostpointercapture" ] ) root.addEventListener( name, cancelHold );
	root.addEventListener( "keydown", ( event ) => {
		const button = event.target.closest( "button[data-action]" );
		if ( !protectedFinish( button ) || ![ "Enter", " " ].includes( event.key ) ) return;
		event.preventDefault();
		if ( !event.repeat ) beginHold( button );
	} );
	root.addEventListener( "keyup", ( event ) => {
		if ( [ "Enter", " " ].includes( event.key ) ) cancelHold();
	} );
	root.addEventListener( "contextmenu", ( event ) => {
		if ( protectedFinish( event.target.closest( "button[data-action]" ) ) ) event.preventDefault();
	} );
	window.addEventListener( "blur", cancelHold );
	window.addEventListener( "pagehide", cancelHold );
	document.addEventListener( "visibilitychange", () => {
		if ( document.hidden ) cancelHold();
	} );
	return ( layout, status, disconnected = false ) => {
		current = { ...status, padLayout: layout };
		offline = disconnected;
		const next = normalisePadLayout( layout );
		const key = next.buttons.join( "," );
		if ( signature !== key ) {
			cancelHold();
			root.replaceChildren( ...next.buttons.map( ( id ) => {
				const button = document.createElement( "button" );
				button.type = "button";
				button.dataset.action = id;
				const icon = document.createElement( "span" );
				icon.className = "control-icon";
				icon.setAttribute( "aria-hidden", "true" );
				button.append( icon, document.createElement( "span" ) );
				return button;
			} ) );
			signature = key;
		}
		root.style.setProperty( "--pad-columns", next.columns );
		for ( const button of root.children ) {
			const view = controlView( button.dataset.action, status );
			const icon = controlIcon( view.id, status );
			if ( button.firstElementChild.dataset.icon !== icon ) {
				button.firstElementChild.innerHTML = icon;
				button.firstElementChild.dataset.icon = icon;
			}
			if ( hold?.button !== button ) button.lastElementChild.textContent = view.label;
			button.hidden = view.hidden;
			button.disabled = offline || view.disabled;
			button.classList.toggle( "active", view.active );
			button.classList.toggle( "primary", view.id === "toggle" );
			button.title = view.reason || view.label;
			if ( protectedFinish( button ) && !view.disabled ) button.title = "Hold for one second to finish recording";
			button.setAttribute( "aria-pressed", String( view.active ) );
		}
		if ( hold && ( offline || hold.button.disabled || hold.button.hidden || hold.identity !== recording( current ) ) ) cancelHold();
	};
}
