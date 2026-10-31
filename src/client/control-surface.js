import { createControlButtons } from "./control-buttons.js";
import { controlView } from "./control-actions.js";
import { GUIDE_RANGES } from "./guide-values.js";

const labels = { x: "Eye centre left / right", y: "Eye level up / down", top: "Top of head", bottom: "Bottom of head", left: "Left edge", right: "Right edge", width: "Head width", height: "Head height", scale: "Overall size", background: "Background", opacity: "Outline" };
const axes = { eyes: [ "x", "y" ], outline: [ "top", "bottom", "left", "right", "width", "height", "scale" ], compare: [ "background", "opacity" ] };
export function createControlSurface( root, { command, hold, feedback, panel = () => {} } ) {
	let state = {};
	let offline = false;
	let pending = new Set();
	let mode = "eyes";
	let returnFocus;
	let sending = false;
	let timer;
	const queued = new Map();
	const dialog = document.createElement( "dialog" );
	dialog.className = "control-sheet";
	dialog.setAttribute( "aria-labelledby", "control-sheet-title" );
	dialog.innerHTML = `<header><h2 id="control-sheet-title">Guide adjustments</h2><button type="button" data-close aria-label="Close adjustments">×</button></header>
		<nav aria-label="Guide adjustment groups"><button type="button" data-tab="eyes">Eyes</button><button type="button" data-tab="outline">Outline</button><button type="button" data-tab="compare">Compare</button></nav>
		<p class="control-sheet-note" role="status"></p><div class="control-sheet-fields"></div><div class="control-sheet-actions"></div>
		<p class="control-sheet-message" role="status" aria-live="polite"></p>`;
	root.parentElement.append( dialog );
	const fields = dialog.querySelector( ".control-sheet-fields" );
	const actions = dialog.querySelector( ".control-sheet-actions" );
	const note = dialog.querySelector( ".control-sheet-note" );
	const message = dialog.querySelector( ".control-sheet-message" );
	function report( text, error = false ) {
		feedback( text, error );
		message.textContent = text;
		message.classList.toggle( "error", error );
	}
	async function send( id, value ) {
		if ( offline || pending.has( id ) ) return false;
		const label = controlView( id, state )?.label ?? "Adjustment";
		pending.add( id );
		paintBusy();
		try {
			report( `Sending ${ label }…` );
			await command( id, value );
			report( `${ label } sent` );
			return true;
		} catch ( error ) {
			report( error.noReply ? `${ label }: no reply` : error.message === "This control is unavailable" ? `${ label } unavailable` : error.message || "No reply from Sightline", true );
			return false;
		} finally {
			pending.delete( id );
			paintBusy();
		}
	}
	function paintBusy() {
		for ( const button of root.querySelectorAll( "button[data-action]" ) ) {
			const busy = pending.has( button.dataset.action );
			button.setAttribute( "aria-busy", String( busy ) );
			button.disabled = busy || offline || controlView( button.dataset.action, state ).disabled;
		}
	}
	const render = createControlButtons( root, ( id, value ) => {
		if ( id === "guide-adjustments" || id === "session-check" ) {
			open( id === "session-check" ? "session" : "eyes" );
			return;
		}
		return send( id, value );
	}, { hold, feedback: report } );
	function actionButton( id, text ) {
		const button = Object.assign( document.createElement( "button" ), { type: "button", textContent: text } );
		button.dataset.command = id;
		button.addEventListener( "click", () => send( id ) );
		actions.append( button );
	}
	function build() {
		fields.replaceChildren();
		actions.replaceChildren();
		dialog.querySelector( "h2" ).textContent = mode === "session" ? "Session check" : "Guide adjustments";
		dialog.querySelector( "nav" ).hidden = mode === "session";
		for ( const button of dialog.querySelectorAll( "[data-tab]" ) ) button.setAttribute( "aria-pressed", String( button.dataset.tab === mode ) );
		if ( mode === "session" ) {
			fields.append( Object.assign( document.createElement( "div" ), { className: "session-rows" } ) );
			actionButton( "session-check", "Full checklist on the PC" );
		} else {
			for ( const axis of axes[mode] ) {
				const [ min, max, step ] = GUIDE_RANGES[axis];
				const row = document.createElement( "div" );
				row.className = "control-slider";
				const label = Object.assign( document.createElement( "label" ), { htmlFor: `guide-value-${ axis }`, textContent: labels[axis] } );
				const output = document.createElement( "output" );
				output.setAttribute( "for", `guide-value-${ axis }` );
				const input = Object.assign( document.createElement( "input" ), { type: "range", id: `guide-value-${ axis }`, min, max, step } );
				input.dataset.axis = axis;
				input.addEventListener( "input", () => {
					output.textContent = format( axis, input.valueAsNumber );
					queued.set( axis, input.valueAsNumber );
					if ( !timer ) timer = setTimeout( flush, 120 );
				} );
				input.addEventListener( "change", flush );
				row.append( label, output, input );
				fields.append( row );
			}
			if ( mode === "eyes" ) {
				const arrows = document.createElement( "div" );
				arrows.className = "control-arrows";
				for ( const [ text, axis, steps ] of [ [ "← Left", "x", -1 ], [ "Up ↑", "y", -1 ], [ "Down ↓", "y", 1 ], [ "Right →", "x", 1 ] ] ) {
					const button = Object.assign( document.createElement( "button" ), { type: "button", textContent: text } );
					button.addEventListener( "click", () => send( "guide-adjust", { axis, steps } ) );
					arrows.append( button );
				}
				fields.append( arrows );
				actionButton( "guide-eyes-lock", "Lock eye position" );
			} else if ( mode === "compare" ) {
				actionButton( "guide-ideal-visible", "Show ideal reference" );
				actionButton( "guide-match-ideal", "Match actual to saved ideal" );
			}
		}
		paintPanel();
	}
	async function flush() {
		clearTimeout( timer );
		timer = null;
		if ( sending ) return;
		sending = true;
		try {
			while ( queued.size && dialog.open ) {
				if ( pending.has( "guide-adjust" ) ) {
					await new Promise( resolve => setTimeout( resolve, 30 ) );
					continue;
				}
				const [ axis, value ] = queued.entries().next().value;
				queued.delete( axis );
				await send( "guide-adjust", { axis, value } );
			}
		} finally {
			sending = false;
		}
	}
	function format( axis, value ) {
		return `${ Math.round( value * ( [ "x", "y" ].includes( axis ) ? 1 : 100 ) * 100 ) / 100 }%`;
	}
	function paintPanel() {
		if ( !dialog.open ) return;
		if ( mode === "session" ) {
			note.textContent = "Reported software state. Check the recorded picture, sound and sync separately.";
			const rows = [ [ "Script", state.scriptLoaded || state.file ? state.sectionTitle || "Script loaded" : "Open a script" ], [ "Listening", state.listeningControl?.suspended ? "Off for this session" : state.listenerHealth?.state === "failed" ? "Stopped · Restart listening" : state.listenerHealth?.state === "recovering" ? "Recovering…" : state.listening ? `On · ${ state.listening === "wake" ? "wake word" : "voice following" }` : "Idle · saved preference applies" ], [ "Guide", state.showHeadGuide ? state.headGuide?.eyesLocked ? "Visible · eyes locked" : "Visible · eyes free" : "Hidden" ] ];
			if ( state.obs?.enabled ) rows.push( [ "OBS", state.obs.connection === "connected" ? `${ state.obs.recording ?? "Unknown" }${ state.obs.controls ? "" : " · status only" }` : "Disconnected · recording state unknown" ] );
			if ( state.captureOverride ) rows.push( [ "Capture", "Debug override on · guide may be recorded" ] );
			for ( const button of root.querySelectorAll( "button[data-action]" ) ) {
				const view = controlView( button.dataset.action, state );
				if ( view.disabled && !view.hidden && view.reason ) rows.push( [ view.label, view.reason ] );
			}
			const list = fields.querySelector( ".session-rows" );
			list.replaceChildren( ...rows.map( ( [ title, text ] ) => {
				const row = document.createElement( "p" );
				row.append( Object.assign( document.createElement( "strong" ), { textContent: `${ title }: ` } ), document.createTextNode( text ) );
				return row;
			} ) );
		} else {
			note.textContent = !state.showHeadGuide ? "Show the head guide first." : state.headGuide?.eyesLocked ? "Eyes fixed. Fit the outline around them." : "Align the eye centre first, then lock it before fitting the outline.";
			for ( const input of fields.querySelectorAll( "input[data-axis]" ) ) {
				const axis = input.dataset.axis;
				input.disabled = offline || controlView( "guide-adjust", state ).disabled || ( [ "x", "y" ].includes( axis ) && !!state.headGuide?.eyesLocked );
				if ( document.activeElement !== input && !queued.has( axis ) && !sending ) {
					input.value = state.headGuide?.[axis] ?? ( [ "x", "y", "background" ].includes( axis ) ? 0 : 1 );
					input.previousElementSibling.textContent = format( axis, input.valueAsNumber );
				}
			}
			for ( const button of fields.querySelectorAll( ".control-arrows button" ) ) button.disabled = offline || !state.showHeadGuide || !!state.headGuide?.eyesLocked;
		}
		for ( const button of actions.querySelectorAll( "button[data-command]" ) ) {
			const view = controlView( button.dataset.command, state );
			button.disabled = offline || view.disabled;
			if ( button.dataset.command === "session-check" && state.scrolling ) {
				button.disabled = true;
				button.title = "Pause prompting before opening the full checklist";
			}
			if ( button.dataset.command !== "session-check" ) button.textContent = view.label;
			button.setAttribute( "aria-pressed", String( view.active ) );
		}
	}
	function open( next ) {
		mode = next;
		returnFocus = document.activeElement;
		panel( true );
		if ( !dialog.open ) dialog.showModal();
		build();
	}
	dialog.querySelector( "[data-close]" ).addEventListener( "click", () => dialog.close() );
	for ( const button of dialog.querySelectorAll( "[data-tab]" ) ) button.addEventListener( "click", () => {
		mode = button.dataset.tab;
		build();
	} );
	dialog.addEventListener( "close", () => {
		queued.clear();
		clearTimeout( timer );
		timer = null;
		panel( false );
		returnFocus?.focus?.();
	} );
	return ( layout, next, disconnected = false ) => {
		state = next;
		offline = disconnected;
		render( layout, state, disconnected );
		paintBusy();
		paintPanel();
	};
}
