import { prepareSettingsControls } from "./settings-controls.js";

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
		[ "set-remote", "The API can be used by any authorised local client. Only the supplied AI kit commands require Node.js and the kit. Enable and Apply before using token controls; Components > Installed components explains missing local setup." ],
		[ "set-stream-deck", "Stream Deck needs Elgato's app and the separate Sightline plugin. Components > Installed components checks installed files; Check compatibility confirms the running plugin version and protocol. A missing app can be installed or located without enabling control." ],
		[ "set-obs-enabled", "A local OBS connection needs OBS Studio installed. Components > Installed components offers its installer and Locate for portable copies. For OBS on another computer, enter its address instead. Start OBS, enable its WebSocket server, Apply and test; finding an installation does not grant recording permission." ],
		[ "set-countdown", "This countdown runs before prompting starts, giving you time to settle and look at the camera. It is separate from pauses written into a script. A zero starts prompting immediately." ],
		[ "set-wake-word", "Say the wake word, leave a brief beat, then finish your command within four seconds. For example: Prompter, section one. Applying a new wake word refreshes the listener immediately." ],
		[ "set-pad-columns", "The floating pad and phone share selected buttons and their order. Narrow phones use two columns; short landscape screens use four or six. Stream Deck profiles keep their own assignments. Presets replace the selection; Compact resets it. OBS buttons appear only when OBS and recording controls are enabled." ],
		[ "set-voice-speed", "Responsiveness changes how quickly the display catches up with recognised speech. Increase it if the text lags; reduce it if movement feels abrupt. It does not change your target speaking pace or microphone sensitivity." ],
		[ "set-directions", "Inline directions such as [smile] and [point] guide your performance. Unquoted directions stay out of speech tracking, word counts and timing. Quoted words that you are meant to read aloud remain visible and spoken. This visibility control does not hide production notes; those appear while paused and hide during delivery. Use Apply to save this choice, or Cancel to restore it." ],
		[ "lp-bg-opacity", "The saved background level while off air. Switching ON AIR uses Background on air instead. Higher percentages give a more opaque background; lower percentages reveal more of the window behind Sightline." ],
		[ "lp-backing-on-air", "The saved background level while ON AIR is enabled. A low percentage lets you see more of your camera preview, slides or call through the prompting window." ],
		[ "lp-heading-scale", "Scales titles and section headings relative to their usual size. Reduce this if headings take up too much room after increasing the size of the words you read." ],
		[ "lp-line-height", "Space between lines of spoken script, as a percentage of its font size. Heading spacing is separate. Inline directions and production notes have their own spacing controls in Reading > Text and directions. Paragraph gaps stay as written." ],
		[ "lp-heading-line-height", "Space between wrapped lines of a title or heading, independently of script, inline directions and production notes. Heading size and font are in Reading > Text and directions." ],
		[ "lp-direction-line-height", "Space between wrapped lines of square-bracket inline directions. Direction-only paragraphs can be tighter than the spoken script. Directions within a spoken line share space with neighbouring words; quoted words to read aloud retain script spacing. Production note spacing is separate." ],
		[ "lp-production-line-height", "Space between lines of long production notes written as HTML comments. 100% is one note-font height; 140% is the usual spacing. Script, heading and inline direction spacing are independent. Notes hide during delivery and remain excluded from speech tracking." ],
		[ "lp-theme", "Choose Standard, Yellow on dark, High contrast or Soft cream for the script. The controls keep their usual colours. Reading > Theme and background controls backing colour and transparency. Reading > Text and directions controls each text type separately." ],
		[ "lp-heading-font", "Choose a separate font for titles and section headings. Same as the text follows your body font; choosing another font changes the headings while keeping the body font you selected." ],
		[ "lp-direction-scale", "Scales square-bracket inline directions such as [smile], independently of headings and production notes. Size is a percentage of spoken script. Font, colour and spacing are independent of visibility. Quoted words to read aloud keep the script style." ],
		[ "lp-direction-colour", "Choose a colour for square-bracket inline directions. Use theme restores the palette colour. Hidden directions stay hidden. Quoted words to read aloud and production notes keep their own colours." ],
		[ "lp-production-scale", "Scales long production notes independently of headings and inline directions. Size is a percentage of spoken script, from 10–200%. Notes have their own font and hide during delivery. Their quoted words are silent too." ],
		[ "lp-production-colour", "Choose a colour for production notes only. Theme follows the surrounding script theme again. This does not change square-bracket inline directions or spoken text. High contrast removes note dimming so the chosen colour stays clear." ],
		[ "lp-hide-capture", "Asks supported capture tools to exclude the prompter, Settings, keyboard and voice Help, and guide adjustments. Turn it off to capture these windows for support. The head guide overlay stays protected independently. Whole-screen and third-party capture can behave differently; check with a short test recording." ],
		[ "lp-click-through", "Mouse clicks pass to the application behind Sightline. Use Ctrl+Shift+X to turn click-through off again, or use the control window or Stream Deck." ],
		[ "lp-points", "Show speaking notes one page at a time. H1 headings or {page} divide pages; H2 headings are points within a page. Next and Back change pages instead of scrolling through a script." ]
	] ) {
		const control = document.getElementById( id );
		if ( !control ) continue;
		if ( control.closest( "[data-settings-control]" )?.querySelector( "[data-help-text]" ) ) continue;
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
		if ( anchor.querySelector( "[data-help-text]" ) ) {
			hint.remove();
			continue;
		}
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
