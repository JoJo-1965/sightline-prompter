import { prepareSettingsControls } from "./settings-controls.js";

// Keep settings readable without scrolling or shrinking their text. Longer
// topics use short pages; the controls themselves never leave their fieldsets.
export function createSettingsPages( modal ) {
	const box = modal.querySelector( ".settings-content" );
	const footer = box.querySelector( ".settings-actions" );
	const nav = document.createElement( "nav" );
	nav.className = "settings-pagination";
	nav.setAttribute( "aria-label", "Pages in this settings topic" );
	const previous = document.createElement( "button" );
	previous.type = "button";
	previous.textContent = "← Previous";
	const status = document.createElement( "span" );
	status.setAttribute( "role", "status" );
	const next = document.createElement( "button" );
	next.type = "button";
	next.textContent = "Next →";
	nav.append( previous, status, next );
	footer.before( nav );
	let pages = [];
	let index = 0;
	let topic = null;
	let queued = false;
	const exclude = ( el, off ) => {
		if ( off && !el.hasAttribute( "data-settings-overflow" ) ) el.setAttribute( "data-settings-overflow", "hidden" );
		else if ( !off && el.hasAttribute( "data-settings-overflow" ) ) el.removeAttribute( "data-settings-overflow" );
	};
	function paint( page ) {
		for ( const item of pages.flat() ) exclude( item, !page.includes( item ) );
		for ( const set of topic.querySelectorAll( "fieldset" ) ) {
			exclude( set, !page.some( item => set.contains( item ) ) );
		}
		for ( const list of topic.querySelectorAll( "#words-list, #command-words-list, #words-suggestions" ) ) {
			exclude( list, !page.some( item => list.contains( item ) ) );
		}
	}
	function choose( n, focus = false ) {
		index = Math.max( 0, Math.min( pages.length - 1, n ) );
		paint( pages[index] ?? [] );
		previous.disabled = index === 0;
		next.disabled = index === pages.length - 1;
		const first = pages[index]?.[0];
		let heading = pages[index]?.find( item => item.matches( "h4, h5" ) ) ?? first;
		while ( heading && !heading.matches( "h4, h5, legend" ) ) heading = heading.previousElementSibling;
		const rawTitle = heading?.textContent.trim() ?? first?.closest( "fieldset" ).querySelector( "legend" ).textContent.trim() ?? "Settings";
		const title = rawTitle === rawTitle.toUpperCase() ? rawTitle[0] + rawTitle.slice( 1 ).toLowerCase() : rawTitle;
		const label = `${ title } · ${ index + 1 } of ${ pages.length }`;
		if ( status.textContent !== label ) status.textContent = label;
		box.scrollTop = 0;
		if ( focus ) {
			const first = pages[index]?.flatMap( item => [ item, ...item.querySelectorAll( "input, select, button, textarea" ) ] )
				.find( el => el.matches( "input, select, button:not(.settings-help-button), textarea" ) && !el.disabled && el.getClientRects().length );
			first?.focus( { preventScroll: true } );
		}
	}
	function layout() {
		queued = false;
		if ( modal.classList.contains( "hidden" ) ) return;
		const active = modal.querySelector( "[data-settings-page]:not([hidden])" );
		if ( !active ) return;
		const same = topic === active;
		const focused = modal.ownerDocument.activeElement;
		const anchor = same ? pages[index]?.[0] : null;
		topic = active;
		for ( const el of topic.querySelectorAll( "[data-settings-overflow]" ) ) exclude( el, false );
		exclude( nav, true );
		box.scrollTop = 0;
		const fits = () => box.scrollHeight <= box.clientHeight + 1;
		if ( fits() ) {
			pages = [];
			index = 0;
			return;
		}
		const items = [];
		for ( const set of topic.querySelectorAll( "fieldset" ) ) {
			for ( const el of set.children ) {
				if ( el.tagName === "LEGEND" || el.classList.contains( "settings-live-note" ) || !el.getClientRects().length || !el.getBoundingClientRect().height ) continue;
				if ( [ "words-list", "command-words-list", "words-suggestions" ].includes( el.id ) && el.children.length ) {
					items.push( ...[ ...el.children ].filter( row => row.getClientRects().length ) );
				} else items.push( el );
			}
		}
		exclude( nav, false );
		pages = [ items ];
		const result = [];
		let chunk = [];
		for ( let n = 0; n < items.length; n++ ) {
			const bundle = [ items[n] ];
			if ( items[n].matches( "h4, h5" ) && items[n + 1] ) bundle.push( items[++n] );
			if ( items[n + 1]?.classList.contains( "settings-help-anchor" ) ) bundle.push( items[++n] );
			paint( [ ...chunk, ...bundle ] );
			if ( chunk.length && !fits() ) {
				result.push( chunk );
				chunk = [];
			}
			chunk.push( ...bundle );
		}
		if ( chunk.length ) result.push( chunk );
		pages = result;
		const focusPage = same ? pages.findIndex( page => page.some( item => item === focused || item.contains( focused ) ) ) : -1;
		const anchorPage = pages.findIndex( page => page.includes( anchor ) );
		choose( focusPage >= 0 ? focusPage : Math.max( 0, anchorPage ) );
	}
	function schedule() {
		if ( queued ) return;
		queued = true;
		modal.ownerDocument.defaultView.requestAnimationFrame( layout );
	}
	previous.addEventListener( "click", () => choose( index - 1, true ) );
	next.addEventListener( "click", () => choose( index + 1, true ) );
	window.addEventListener( "resize", schedule );
	modal.addEventListener( "utility-resize", schedule );
	modal.addEventListener( "input", schedule );
	modal.addEventListener( "focusin", ( event ) => {
		const n = pages.findIndex( page => page.some( item => item === event.target || item.contains( event.target ) ) );
		if ( n >= 0 && n !== index ) choose( n );
	} );
	new MutationObserver( schedule ).observe( box, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [ "hidden", "class" ] } );
	return {
		layout, schedule,
		reveal( control ) {
			layout();
			const n = pages.findIndex( page => page.some( item => item === control || item.contains( control ) ) );
			if ( n >= 0 ) choose( n );
			control.focus( { preventScroll: true } );
		}
	};
}

// Contextual explanations stay out of the form until asked for. The same help
// works with a mouse, keyboard or touch; it never changes the setting's value.
export function addSettingsHelp( modal ) {
	prepareSettingsControls( modal );
	prepareSettingsControls( document.getElementById( "layout-panel" ) );
	let shown = null;
	let leaveTimer;
	const hide = () => {
		clearTimeout( leaveTimer );
		if ( !shown ) return;
		shown.panel.hidePopover();
		shown.button.setAttribute( "aria-expanded", "false" );
		shown = null;
	};
	const extraHints = [];
	for ( const [ id, text ] of [
		[ "set-countdown", "This countdown runs before prompting starts, giving you time to settle and look at the camera. It is separate from pauses written into a script. A zero starts prompting immediately." ],
		[ "set-wake-word", "Say the wake word, leave a brief beat, then finish your command within four seconds. For example: Prompter, section one. Applying a new wake word refreshes the listener immediately." ],
		[ "set-pad-columns", "The floating pad and phone share selected buttons and their order. Narrow phones use two columns; short landscape screens use four or six. Stream Deck profiles keep their own assignments. Presets replace the selection; Compact resets it. OBS buttons appear only when OBS and recording controls are enabled." ],
		[ "set-voice-speed", "Responsiveness changes how quickly the display catches up with recognised speech. Increase it if the text lags; reduce it if movement feels abrupt. It does not change your target speaking pace or microphone sensitivity." ],
		[ "set-directions", "Delivery notes such as [smile] and [point] guide your performance. They stay out of speech tracking, word counts and timing. Hiding a direction still keeps any quoted words that you are meant to read aloud." ],
		[ "lp-bg-opacity", "The saved background level while off air. Switching ON AIR uses Background on air instead. Higher percentages give a more opaque background; lower percentages reveal more of the window behind Sightline." ],
		[ "lp-backing-on-air", "The saved background level while ON AIR is enabled. A low percentage lets you see more of your camera preview, slides or call through the prompting window." ],
		[ "lp-heading-scale", "Scales titles and section headings relative to their usual size. Reduce this if headings take up too much room after increasing the size of the words you read." ],
		[ "lp-heading-font", "Choose a separate font for titles and section headings. Same as the text follows your body font; choosing another font changes the headings while keeping the body font you selected." ],
		[ "lp-direction-scale", "Scales square-bracket delivery comments such as [smile], independently of heading size. 100% keeps their usual size: smaller when Dimmed, full size when Normal. Comments use Heading font. Quoted words to read aloud keep the script style." ],
		[ "lp-direction-colour", "Choose a colour for square-bracket delivery comments. Theme restores the usual Dimmed or Normal colour, including high contrast. Hidden comments stay hidden. Quoted words to read aloud keep their normal colour." ],
		[ "lp-hide-capture", "Asks supported capture tools to exclude the prompter, Settings, keyboard and voice Help, and guide adjustments. Turn it off to capture these windows for support. The head guide overlay stays protected independently. Whole-screen and third-party capture can behave differently; check with a short test recording." ],
		[ "lp-click-through", "Mouse clicks pass to the application behind Sightline. Use Ctrl+Shift+X to turn click-through off again, or use the control window or Stream Deck." ],
		[ "lp-points", "Show speaking notes one page at a time. H1 headings or {page} divide pages; H2 headings are points within a page. Next and Back change pages instead of scrolling through a script." ]
	] ) {
		const control = document.getElementById( id );
		if ( !control ) continue;
		const hint = document.createElement( "p" );
		hint.className = "field-hint";
		hint.textContent = text;
		control.closest( "[data-settings-control]" ).after( hint );
		extraHints.push( hint );
	}
	let count = 0;
	const panels = new Map();
	for ( const hint of new Set( [ ...modal.querySelectorAll( "fieldset > p.field-hint:not([id])" ), ...extraHints ] ) ) {
		if ( hint.textContent.trim().length < 85 || hint.classList.contains( "voice-deepgram-only" ) || hint.hasAttribute( "data-essential" ) || hint.querySelector( "a, button, input, select" ) ) continue;
		const set = hint.closest( "fieldset" );
		const previous = hint.previousElementSibling;
		const control = previous?.querySelector( "input[id], select[id]" );
		const anchor = previous?.querySelector( ".settings-option-name" ) ?? ( previous?.matches( "h4, h5" ) ? previous : set?.querySelector( "legend" ) );
		if ( !anchor ) continue;
		const label = anchor.querySelector( "label" )?.textContent.trim().replace( /\s+/g, " " ) ?? anchor.textContent.trim();
		const paragraph = document.createElement( "p" );
		paragraph.append( ...hint.childNodes );
		if ( panels.has( anchor ) ) {
			panels.get( anchor ).append( paragraph );
			hint.remove();
			continue;
		}
		const button = document.createElement( "button" );
		button.type = "button";
		button.className = "settings-help-button";
		const pill = document.createElement( "span" );
		pill.textContent = "?";
		pill.setAttribute( "aria-hidden", "true" );
		button.append( pill );
		button.setAttribute( "aria-label", `Help: ${ label }` );
		button.setAttribute( "aria-expanded", "false" );
		const panel = document.createElement( "div" );
		panel.id = `settings-explanation-${ ++count }`;
		panel.className = "settings-explanation";
		panel.setAttribute( "popover", "manual" );
		panel.setAttribute( "role", "tooltip" );
		panel.append( paragraph );
		button.setAttribute( "aria-controls", panel.id );
		button.setAttribute( "aria-describedby", panel.id );
		if ( control ) control.setAttribute( "aria-describedby", [ control.getAttribute( "aria-describedby" ), panel.id ].filter( Boolean ).join( " " ) );
		anchor.append( button );
		panels.set( anchor, panel );
		hint.remove();
		modal.append( panel );
		const open = () => {
			clearTimeout( leaveTimer );
			if ( shown?.button === button ) return;
			hide();
			panel.showPopover();
			const r = button.getBoundingClientRect();
			const p = panel.getBoundingClientRect();
			const view = modal.ownerDocument.defaultView;
			panel.style.left = `${ Math.max( 8, Math.min( r.left, view.innerWidth - p.width - 8 ) ) }px`;
			panel.style.top = `${ Math.max( 8, Math.min( r.bottom + 6, view.innerHeight - p.height - 8 ) ) }px`;
			button.setAttribute( "aria-expanded", "true" );
			shown = { button, panel, pinned: false };
		};
		const leave = () => {
			clearTimeout( leaveTimer );
			leaveTimer = setTimeout( () => {
				if ( shown?.button === button && !shown.pinned && modal.ownerDocument.activeElement !== button ) hide();
			}, 160 );
		};
		button.addEventListener( "mouseenter", open );
		button.addEventListener( "focus", open );
		button.addEventListener( "click", () => {
			if ( shown?.button === button && shown.pinned ) return hide();
			open();
			shown.pinned = true;
		} );
		button.addEventListener( "mouseleave", leave );
		panel.addEventListener( "mouseenter", () => clearTimeout( leaveTimer ) );
		panel.addEventListener( "mouseleave", leave );
		button.addEventListener( "blur", hide );
	}
	modal.addEventListener( "keydown", ( event ) => {
		if ( event.key !== "Escape" || !shown ) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		hide();
	}, true );
	modal.addEventListener( "click", ( event ) => {
		if ( shown && !shown.button.contains( event.target ) && !shown.panel.contains( event.target ) ) hide();
	} );
	window.addEventListener( "resize", hide );
	modal.addEventListener( "utility-resize", hide );
	new MutationObserver( hide ).observe( modal, { attributes: true, attributeFilter: [ "class" ] } );
}
