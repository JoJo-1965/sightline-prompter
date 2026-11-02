import { steppedControlNumber } from "./numeric-controls.js";

export function createLiveTools( panel, { getState, action, save, size, backing } ) {
	let current = "prepare";
	let signature = "";
	panel.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Escape" ) {
			event.preventDefault();
			event.stopPropagation();
			action( "close-tools" );
		}
	} );
	function render() {
		if ( !panel.classList.contains( "hidden" ) && panel.ownerDocument.hasFocus() && panel.contains( panel.ownerDocument.activeElement ) && panel.ownerDocument.activeElement.matches( "input" ) ) return;
		const doc = panel.ownerDocument, state = getState();
		const nextSignature = JSON.stringify( [ current, state.fontSize, state.opacity, state.lineHeight, state.onAir, state.scrolling, state.guideShown, state.microphoneEnabled, state.speechEnabled, state.padEnabled, state.voiceCommands, state.obsEnabled, state.obsControls, state.obs?.canRecord, state.obs?.canFinish ] );
		if ( signature === nextSignature && panel.children.length ) return;
		signature = nextSignature;
		const focused = panel.contains( doc.activeElement ) ? doc.activeElement.dataset.toolAction ?? ( doc.activeElement.getAttribute( "role" ) === "tab" ? "tab" : null ) : null;
		panel.replaceChildren();
		panel.classList.add( "tools-redesign" );
		const title = doc.createElement( "h4" );
		title.textContent = "Live adjustments";
		panel.append( title );
		const tabs = doc.createElement( "div" );
		tabs.className = "tools-tabs";
		tabs.setAttribute( "role", "tablist" );
		tabs.setAttribute( "aria-label", "Live tools" );
		panel.append( tabs );
		for ( const [ id, label ] of [ [ "prepare", "Prepare" ], [ "adjust", "Adjust" ], [ "take", "During take" ] ] ) {
			const button = doc.createElement( "button" );
			button.type = "button";
			button.textContent = label;
			button.setAttribute( "role", "tab" );
			button.setAttribute( "aria-selected", String( id === current ) );
			button.tabIndex = id === current ? 0 : -1;
			button.addEventListener( "click", () => {
				current = id;
				render();
				panel.querySelector( "[aria-selected=true]" ).focus();
			} );
			tabs.append( button );
		}
		const body = doc.createElement( "div" );
		tabs.addEventListener( "keydown", ( event ) => {
			if ( ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
			event.preventDefault();
			event.stopPropagation();
			const buttons = [ ...tabs.children ], index = buttons.indexOf( event.target );
			const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : ( index + ( event.key === "ArrowRight" ? 1 : -1 ) + buttons.length ) % buttons.length;
			buttons[next].click();
		} );
		body.className = "tools-body";
		panel.append( body );
		const buttons = doc.createElement( "div" );
		buttons.className = "tools-actions";
		const button = ( label, id, disabled = false ) => {
			const node = doc.createElement( "button" );
			node.type = "button";
			node.textContent = label;
			node.dataset.toolAction = id;
			node.disabled = disabled;
			node.addEventListener( "click", () => action( id ) );
			buttons.append( node );
		};
		if ( current === "prepare" ) {
			button( "Prepare to record", "prepare-recording" );
			button( "Session check", "session" );
			button( "Review script", "review" );
			button( state.guideShown ? "Hide head guide" : "Show head guide", "guide-toggle" );
			button( "Guide adjustments", "guide-adjust" );
			if ( state.microphoneEnabled ) button( "Sound check", "sound" );
			if ( state.padEnabled ) button( "Control pad", "pad" );
			button( "Settings", "settings" );
		} else if ( current === "adjust" ) {
			const row = ( label, value, min, max, unit, change, step = 1 ) => {
				const line = doc.createElement( "label" );
				line.className = "tools-range";
				const name = doc.createElement( "span" );
				name.textContent = label;
				const range = doc.createElement( "input" );
				range.type = "range";
				range.min = min;
				range.max = max;
				range.step = step;
				range.value = steppedControlNumber( value, { min, max, step } );
				const number = doc.createElement( "input" );
				number.type = "number";
				number.min = min;
				number.max = max;
				number.step = step;
				number.value = range.value;
				number.setAttribute( "aria-label", `${ label } ${ unit }` );
				const apply = ( v ) => {
					if ( !Number.isFinite( v ) || v < min || v > max ) {
						number.setCustomValidity( `Choose ${ min }–${ max } ${ unit }` );
						return;
					}
					number.setCustomValidity( "" );
					const next = steppedControlNumber( v, { min, max, step } );
					range.value = number.value = next;
					change( next );
				};
				range.addEventListener( "input", () => apply( Number( range.value ) ) );
				number.addEventListener( "change", () => apply( number.valueAsNumber ) );
				const suffix = doc.createElement( "span" );
				suffix.textContent = unit;
				line.append( name, range, number, suffix );
				body.append( line );
			};
			row( "Text size", state.fontSize * 100, 100, 800, "%", value => size( value / 100 ), 5 );
			row( state.onAir ? "On-air backing" : "Off-air backing", state.opacity * 100, 0, 100, "%", value => backing( value / 100 ) );
			row( "Line spacing", Math.round( ( state.lineHeight ?? 1.3 ) * 100 ), 100, 250, "%", value => save( { lineHeight: value / 100 } ), 5 );
			button( "Themes and text", "typography" );
			button( "Prompter layout", "layout" );
			button( "Guide adjustments", "guide-adjust" );
			button( "Screens and mirroring", "screens" );
		} else {
			button( state.scrolling ? "Pause prompting" : "Start prompting", "play" );
			button( "Marker", "marker" );
			button( "Keeper", "keeper" );
			button( "Scrap take", "scrap" );
			button( state.guideShown ? "Hide head guide" : "Show head guide", "guide-toggle" );
			if ( state.speechEnabled && state.microphoneEnabled && state.voiceCommands !== "off" ) button( "Toggle listening", "listen" );
			if ( state.obsEnabled && state.obsControls ) {
				button( "Record take", "record", !state.obs?.canRecord );
				button( "Finish recording", "finish", !state.obs?.canFinish );
			}
		}
		body.append( buttons );
		const note = doc.createElement( "p" );
		note.className = "tools-live-note";
		note.textContent = "Changes here apply immediately. Settings uses Apply or Save & close.";
		body.append( note );
		if ( focused ) {
			const target = focused === "tab" ? null : [ ...panel.querySelectorAll( "[data-tool-action]" ) ].find( button => button.dataset.toolAction === focused && !button.disabled );
			( target ?? panel.querySelector( "[aria-selected=true]" ) )?.focus();
		}
	}
	return { render };
}
