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
	const previousName = document.createElement( "span" );
	previousName.className = "settings-page-label";
	previousName.textContent = "Previous";
	const previousArrow = document.createElement( "span" );
	previousArrow.className = "settings-page-arrow";
	previousArrow.textContent = "←";
	previousArrow.setAttribute( "aria-hidden", "true" );
	previous.append( previousArrow, previousName );
	const status = document.createElement( "span" );
	status.setAttribute( "role", "status" );
	const statusName = document.createElement( "span" );
	statusName.className = "settings-page-label";
	const statusCount = document.createElement( "span" );
	statusCount.className = "settings-page-count";
	status.append( statusName, statusCount );
	const next = document.createElement( "button" );
	next.type = "button";
	const nextName = document.createElement( "span" );
	nextName.className = "settings-page-label";
	nextName.textContent = "Next";
	const nextArrow = document.createElement( "span" );
	nextArrow.className = "settings-page-arrow";
	nextArrow.textContent = "→";
	nextArrow.setAttribute( "aria-hidden", "true" );
	next.append( nextName, nextArrow );
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
		previous.disabled = !pages.length || index <= 0;
		next.disabled = !pages.length || index >= pages.length - 1;
		const destination = ( page ) => {
			const item = page?.find( el => el.matches( "h4, h5, [data-settings-control]" ) || el.querySelector( "[data-settings-control]" ) ) ?? page?.[0];
			const groupName = item?.closest( "fieldset" )?.dataset.settingsPageLabel;
			if ( groupName ) return groupName;
			const label = item?.querySelector( ".settings-option-name label" ) ?? item?.querySelector( "legend" );
			return ( label?.textContent ?? ( item?.matches( "h4, h5" ) ? item.textContent : item?.closest( "fieldset" )?.querySelector( "legend" )?.textContent ) ?? "Settings" ).replace( /\s+/g, " " ).trim();
		};
		const previousLabel = previous.disabled ? "Previous" : destination( pages[index - 1] );
		const nextLabel = next.disabled ? "Next" : destination( pages[index + 1] );
		if ( previousName.textContent !== previousLabel ) previousName.textContent = previousLabel;
		if ( nextName.textContent !== nextLabel ) nextName.textContent = nextLabel;
		previous.setAttribute( "aria-label", previous.disabled ? "No previous page" : `Previous: ${ destination( pages[index - 1] ) }` );
		next.setAttribute( "aria-label", next.disabled ? "No next page" : `Next: ${ destination( pages[index + 1] ) }` );
		previous.title = previous.getAttribute( "aria-label" );
		next.title = next.getAttribute( "aria-label" );
		const first = pages[index]?.[0];
		let heading = pages[index]?.find( item => item.matches( "h4, h5" ) ) ?? first;
		while ( heading && !heading.matches( "h4, h5, legend" ) ) heading = heading.previousElementSibling;
		const rawTitle = heading?.textContent.trim() ?? first?.closest( "fieldset" ).querySelector( "legend" ).textContent.trim() ?? "Settings";
		const title = rawTitle === rawTitle.toUpperCase() ? rawTitle[0] + rawTitle.slice( 1 ).toLowerCase() : rawTitle;
		const label = `${ title } · ${ index + 1 } of ${ pages.length }`;
		if ( status.getAttribute( "aria-label" ) !== label ) {
			statusName.textContent = `${ title } ·`;
			statusCount.textContent = `${ index + 1 } of ${ pages.length }`;
			status.setAttribute( "aria-label", label );
			status.title = label;
		}
		box.scrollTop = 0;
		if ( focus ) {
			const first = pages[index]?.flatMap( item => [ item, ...item.querySelectorAll( "input, select, button, textarea" ) ] )
				.find( el => el.matches( "input, select, button:not(.settings-help-button), textarea" ) && !el.disabled && el.getClientRects().length );
			( first ?? ( next.disabled ? previous : next ) ).focus( { preventScroll: true } );
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
			previous.disabled = next.disabled = true;
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
			const set = items[n].closest( "fieldset[data-settings-keep-together]" );
			const group = set ? items.slice( n ).filter( item => item.closest( "fieldset" ) === set ) : [];
			if ( group.length > 1 ) {
				paint( group );
				if ( fits() ) {
					bundle.splice( 0, 1, ...group );
					n += group.length - 1;
				}
			}
			if ( bundle.length === 1 && items[n].matches( "h4, h5" ) && items[n + 1] ) bundle.push( items[++n] );
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
	previous.addEventListener( "click", () => {
		if ( !previous.disabled ) choose( index - 1, true );
	} );
	next.addEventListener( "click", () => {
		if ( !next.disabled ) choose( index + 1, true );
	} );
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
		[ "set-remote", "The API can be used by any authorised local client. Only the supplied AI kit commands require Node.js and the kit. Enable and Apply before using token controls; Components explains missing local setup." ],
		[ "set-stream-deck", "Stream Deck needs Elgato's app and the separate Sightline plugin. Components checks installed files; Check compatibility confirms the running plugin version and protocol. A missing app can be installed or located without enabling control." ],
		[ "set-obs-enabled", "A local OBS connection needs OBS Studio installed. Components offers its installer and Locate for portable copies. For OBS on another computer, enter its address instead. Start OBS, enable its WebSocket server, Apply and test; finding an installation does not grant recording permission." ],
		[ "set-countdown", "This countdown runs before prompting starts, giving you time to settle and look at the camera. It is separate from pauses written into a script. A zero starts prompting immediately." ],
		[ "set-wake-word", "Say the wake word, leave a brief beat, then finish your command within four seconds. For example: Prompter, section one. Applying a new wake word refreshes the listener immediately." ],
		[ "set-pad-columns", "The floating pad and phone share selected buttons and their order. Narrow phones use two columns; short landscape screens use four or six. Stream Deck profiles keep their own assignments. Presets replace the selection; Compact resets it. OBS buttons appear only when OBS and recording controls are enabled." ],
		[ "set-voice-speed", "Responsiveness changes how quickly the display catches up with recognised speech. Increase it if the text lags; reduce it if movement feels abrupt. It does not change your target speaking pace or microphone sensitivity." ],
		[ "set-directions", "Inline directions such as [smile] and [point] guide your performance. Unquoted directions stay out of speech tracking, word counts and timing. Quoted words that you are meant to read aloud remain visible and spoken. This visibility control does not hide production notes; those appear while paused and hide during delivery. Changes save immediately." ],
		[ "lp-bg-opacity", "The saved background level while off air. Switching ON AIR uses Background on air instead. Higher percentages give a more opaque background; lower percentages reveal more of the window behind Sightline." ],
		[ "lp-backing-on-air", "The saved background level while ON AIR is enabled. A low percentage lets you see more of your camera preview, slides or call through the prompting window." ],
		[ "lp-heading-scale", "Scales titles and section headings relative to their usual size. Reduce this if headings take up too much room after increasing the size of the words you read." ],
		[ "lp-line-height", "Space between lines of spoken script, as a percentage of its font size. Heading spacing is separate. Inline directions and production notes have their own spacing controls in Appearance > Directions. Paragraph gaps stay as written." ],
		[ "lp-heading-line-height", "Space between wrapped lines of a title or heading, independently of script, inline directions and production notes. Heading size and font are in Appearance > Text." ],
		[ "lp-direction-line-height", "Space between wrapped lines of square-bracket inline directions. Direction-only paragraphs can be tighter than the spoken script. Directions within a spoken line share space with neighbouring words; quoted words to read aloud retain script spacing. Production note spacing is separate." ],
		[ "lp-production-line-height", "Space between lines of long production notes written as HTML comments. 100% is one note-font height; 140% is the usual spacing. Script, heading and inline direction spacing are independent. Notes hide during delivery and remain excluded from speech tracking." ],
		[ "lp-theme", "Choose Standard, Yellow on dark, High contrast or Soft cream for the script. The controls keep their usual colours. Background controls transparency and brightness; Text controls fonts. Inline direction and production note colours are in Appearance > Directions." ],
		[ "lp-heading-font", "Choose a separate font for titles and section headings. Same as the text follows your body font; choosing another font changes the headings while keeping the body font you selected." ],
		[ "lp-direction-scale", "Scales square-bracket inline directions such as [smile], independently of headings and production notes. 100% keeps their usual size: smaller when Dimmed, full size when Normal. Directions use Heading font. Quoted words to read aloud keep the script style." ],
		[ "lp-direction-colour", "Choose a colour for square-bracket inline directions. Theme restores the usual Dimmed or Normal colour, including high contrast. Hidden directions stay hidden. Quoted words to read aloud and production notes keep their own colours." ],
		[ "lp-production-scale", "Scales long production notes independently of headings and inline directions. 100% keeps their usual size, 55% of the script text. The range is 40–200% of that usual note size. Notes use Heading font and hide during delivery. Their quoted words are silent too." ],
		[ "lp-production-colour", "Choose a colour for production notes only. Theme follows the surrounding script theme again. This does not change square-bracket inline directions or spoken text. High contrast removes note dimming so the chosen colour stays clear." ],
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
