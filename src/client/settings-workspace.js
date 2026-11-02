import { prepareSettingsControls } from "./settings-controls.js";
import { READING_FONTS, READING_PALETTES, TEXT_TARGETS, TEXT_FIELDS, appearanceFromSettings, captureReadingTheme, settingsFromTheme } from "./reading-appearance.js";
import { INTERFACES, interfaceEnabled } from "./interface-state.js";

// Forms are assembled once, before their controllers attach. Settings keeps
// ownership for its lifetime; Tools never borrows any of these nodes.
export function createSettingsWorkspace( root, { getState, stage, navigate, toast } ) {
	const doc = root.ownerDocument;
	const box = root.querySelector( ".settings-content" );
	const oldLayout = doc.getElementById( "layout-panel" );
	prepareSettingsControls( root );
	prepareSettingsControls( oldLayout );
	const controls = new Map( [ ...root.querySelectorAll( "input[id], select[id], button[id]" ), ...oldLayout.querySelectorAll( "input[id], select[id], button[id]" ) ].map( el => [ el.id, el ] ) );
	const bindings = new Map();
	const sections = new Map();
	const selectValues = [ ...root.querySelectorAll( "fieldset[data-tab]" ) ];
	const el = ( tag, attrs = {}, text = "" ) => {
		const node = doc.createElement( tag );
		Object.assign( node, attrs );
		if ( text ) node.textContent = text;
		return node;
	};
	const section = ( id, title, existing = null ) => {
		if ( sections.has( id ) ) return sections.get( id );
		const node = existing ?? el( "fieldset" );
		node.dataset.tab = id;
		if ( !node.querySelector( "legend" ) ) node.prepend( el( "legend", {}, title ) );
		if ( !node.isConnected ) box.insertBefore( node, box.querySelector( ".modal-actions" ) );
		sections.set( id, node );
		return node;
	};
	const take = ( id, tag = "input" ) => {
		const node = controls.get( id ) ?? el( tag, { id } );
		const previous = node.closest( "[data-settings-control]" );
		node.remove();
		if ( previous && !previous.querySelector( "input,select,button,textarea" ) ) previous.remove();
		controls.set( id, node );
		return node;
	};
	function row( host, label, control, help = "" ) {
		const line = el( "div", { className: "settings-row settings-control-row" } );
		line.dataset.settingsControl = control.id;
		const name = el( "span", { className: "settings-option-name" } );
		name.append( control.matches( "input,select,textarea" ) ? el( "label", { htmlFor: control.id }, label ) : el( "span", {}, label ) );
		if ( help ) {
			const hint = el( "button", { type: "button", className: "settings-help-button", textContent: "?" } );
			hint.dataset.helpText = help;
			hint.setAttribute( "aria-label", `Help: ${ label }` );
			name.append( hint );
		}
		const value = el( "span", { className: "settings-control-value" } );
		value.append( control );
		line.append( name, value );
		host.append( line );
		return value;
	}
	function bind( control, key, kind, extra = {} ) {
		control.dataset.settingsKey = key;
		const descriptor = { control, key, kind, ...extra };
		bindings.set( control.id, descriptor );
		const change = () => {
			let value = kind === "check" ? control.checked : kind === "number" ? Number( control.value ) / ( extra.scale ?? 1 ) : control.value;
			if ( kind === "number" && !Number.isFinite( value ) ) return;
			if ( key === "audioDeviceId" ) value ||= null;
			stage( { [key]: value }, extra.preview === true );
		};
		control.addEventListener( kind === "number" || kind === "colour" ? "input" : "change", change );
		return descriptor;
	}
	function range( host, id, label, key, { min = 0, max = 100, scale = 1, unit = "%", step = 1, preview = true, help = "" } = {} ) {
		const input = take( id );
		input.type = "range";
		input.min = min;
		input.max = max;
		input.step = "any";
		input.dataset.pairedNumber = "true";
		input.setAttribute( "aria-label", label );
		const value = row( host, label, input, help );
		const number = el( "input", { id: `${ id }-number`, type: "number", min, max, step: "any" } );
		number.setAttribute( "aria-label", `${ label } (${ unit })` );
		value.append( number, el( "span", { className: "settings-unit" }, unit ) );
		const descriptor = bind( input, key, "number", { scale, preview, number } );
		const set = ( n ) => {
			if ( !Number.isFinite( n ) || n < min || n > max ) {
				number.setCustomValidity( `Choose ${ min }–${ max } ${ unit }` );
				return;
			}
			number.setCustomValidity( "" );
			input.value = number.value = Math.round( n * 1000 ) / 1000;
			input.dispatchEvent( new Event( "input", { bubbles: true } ) );
		};
		input.addEventListener( "input", () => {
			number.value = input.value;
			number.setCustomValidity( "" );
		} );
		number.addEventListener( "change", () => set( Number( number.value ) ) );
		for ( const control of [ input, number ] ) control.addEventListener( "keydown", ( event ) => {
			if ( ![ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ].includes( event.key ) ) return;
			event.preventDefault();
			set( Math.min( max, Math.max( min, Number( control.value ) + ( [ "ArrowUp", "ArrowRight" ].includes( event.key ) ? step : -step ) ) ) );
		} );
		return descriptor;
	}
	function check( host, id, label, key, preview = false, help = "" ) {
		const input = take( id );
		input.type = "checkbox";
		const value = row( host, label, input, help );
		value.append( el( "span", { className: "settings-on-off" } ) );
		return bind( input, key, "check", { preview } );
	}
	function choice( host, id, label, key, values, preview = false, help = "" ) {
		const input = take( id, "select" );
		input.replaceChildren( ...values.map( ( [ value, name ] ) => el( "option", { value, textContent: name } ) ) );
		row( host, label, input, help );
		return bind( input, key, "select", { preview } );
	}
	function colour( host, id, label, key, target ) {
		const input = take( id );
		input.type = "color";
		const value = row( host, label, input, "Choose a custom colour. Use theme restores the selected palette colour for this item only." );
		const hex = el( "span", { className: "settings-hex" } );
		const reset = el( "button", { type: "button" }, "Use theme" );
		reset.id = id.replace( /-colour$/, "-theme" );
		value.append( hex, reset );
		reset.addEventListener( "click", () => {
			stage( { [key]: "" }, true );
			reset.focus();
		} );
		return bind( input, key, "colour", { preview: true, hex, reset, target } );
	}
	const rename = { scrolling: "mode", voice: "engine", recording: "takes", audio: "sound", reading: "typography", directions: "typography", theme: "background", display: "screens", script: "aids", remotes: "api", phone: "pairing", buttons: "mappings", about: "version", debug: "health" };
	for ( const fieldset of selectValues ) fieldset.dataset.tab = rename[fieldset.dataset.tab] ?? fieldset.dataset.tab;
	for ( const fieldset of selectValues ) {
		const legend = fieldset.querySelector( "legend" )?.textContent;
		if ( legend === "Slate" ) fieldset.dataset.tab = "sync";
		if ( legend === "Screen capture" ) fieldset.dataset.tab = "capture";
		if ( legend === "Command-word tracing" ) fieldset.dataset.tab = "trace";
		if ( fieldset.id === "set-defaults-fieldset" ) fieldset.dataset.tab = "reset";
		if ( fieldset.dataset.tab.startsWith( "component-" ) ) {
			fieldset.dataset.componentChoice = fieldset.dataset.tab.slice( 10 );
			fieldset.dataset.tab = "components";
		}
	}
	const originalFontFieldset = controls.get( "set-font-size" ).closest( "fieldset" );
	const typography = section( "typography", "Text and directions", doc.getElementById( "set-reading-host" ) );
	typography.replaceChildren( el( "legend", {}, "Text and directions" ) );
	const targets = el( "div", { className: "settings-targets" } );
	targets.setAttribute( "role", "tablist" );
	targets.setAttribute( "aria-label", "Text type" );
	typography.append( targets );
	const targetPanels = new Map();
	for ( const [ target, title ] of TEXT_TARGETS ) {
		const button = el( "button", { type: "button" }, title );
		button.id = `settings-text-${ target }`;
		button.dataset.textTarget = target;
		button.setAttribute( "role", "tab" );
		targets.append( button );
		const panel = el( "section", { className: "settings-text-target" } );
		panel.id = `settings-text-panel-${ target }`;
		panel.setAttribute( "role", "tabpanel" );
		panel.setAttribute( "aria-labelledby", button.id );
		button.setAttribute( "aria-controls", panel.id );
		panel.dataset.textTargetPanel = target;
		panel.setAttribute( "aria-label", title );
		typography.append( panel );
		targetPanels.set( target, panel );
		button.addEventListener( "click", () => selectTarget( target ) );
		const f = TEXT_FIELDS[target];
		const fontId = ( { script: "lp-font", headings: "lp-heading-font", inline: "lp-direction-font", production: "lp-production-font" } )[target];
		choice( panel, fontId, "Font", f.font, Object.entries( READING_FONTS ).filter( ( [ id ] ) => target !== "script" || id !== "same" ), true, "Choose a font for this text type. Follow script follows the spoken font. Other fonts must be installed on this computer." );
		range( panel, ( { script: "set-font-size", headings: "lp-heading-scale", inline: "lp-direction-scale", production: "lp-production-scale" } )[target], "Size", target === "script" ? "fontSize" : f.size, { min: target === "script" ? 100 : 10, max: target === "script" ? 800 : target === "production" ? 200 : 400, scale: f.scale, help: target === "headings" ? "Section-heading size relative to the script; titles retain their larger hierarchy." : target === "script" ? "The same base text size as the main toolbar. 300% is the usual starting size." : "Size relative to the spoken script. Visibility and dimming do not change it." } );
		colour( panel, `lp-${ target === "headings" ? "heading" : target === "inline" ? "direction" : target }-colour`, "Colour", f.colour, target );
		const styles = el( "div", { className: "settings-style-buttons" } );
		for ( const [ name, key ] of [ [ "Bold", f.bold ], [ "Italic", f.italic ] ] ) {
			const toggle = el( "button", { type: "button", id: `appearance-${ target }-${ name.toLowerCase() }` }, name );
			toggle.addEventListener( "click", () => stage( { [key]: !getState()[key] }, true ) );
			bindings.set( toggle.id, { control: toggle, key, kind: "toggle" } );
			styles.append( toggle );
		}
		row( panel, "Style", styles );
		range( panel, ( { script: "lp-line-height", headings: "lp-heading-line-height", inline: "lp-direction-line-height", production: "lp-production-line-height" } )[target], "Line spacing", f.spacing, { min: 100, max: 250, scale: 100, help: "Line spacing as a percentage of this text type’s font height. Paragraph gaps remain as written." } );
		if ( target === "inline" ) choice( panel, "set-directions", "Visibility", "directions", [ [ "normal", "Normal" ], [ "dim", "Dimmed" ], [ "hide", "Hidden" ] ], true );
	}
	function selectTarget( target ) {
		for ( const button of targets.children ) {
			button.setAttribute( "aria-selected", String( button.dataset.textTarget === target ) );
			button.tabIndex = button.dataset.textTarget === target ? 0 : -1;
		}
		for ( const [ id, panel ] of targetPanels ) panel.hidden = id !== target;
	}
	targets.addEventListener( "keydown", ( event ) => {
		if ( ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
		event.preventDefault();
		event.stopPropagation();
		const buttons = [ ...targets.children ], index = buttons.indexOf( event.target );
		const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : ( index + ( event.key === "ArrowRight" ? 1 : -1 ) + buttons.length ) % buttons.length;
		buttons[next].click();
		buttons[next].focus();
	} );
	selectTarget( "script" );
	originalFontFieldset.remove();
	for ( const id of [ "set-directions-host", "set-production-notes-host" ] ) doc.getElementById( id )?.remove();
	const background = section( "background", "Theme and background", doc.getElementById( "set-theme-host" ) );
	background.replaceChildren( el( "legend", {}, "Theme and background" ) );
	const palette = choice( background, "lp-theme", "Script theme", "theme", Object.entries( READING_PALETTES ).map( ( [ id, item ] ) => [ id, item.name ] ), true );
	// The selector's custom themes restore an entire appearance snapshot.
	palette.control.replaceWith( palette.control.cloneNode( true ) );
	palette.control = background.querySelector( "#lp-theme" );
	controls.set( "lp-theme", palette.control );
	bindings.set( "lp-theme", palette );
	palette.control.addEventListener( "change", () => {
		const theme = ( getState().readingThemes ?? [] ).find( item => item.id === palette.control.value );
		if ( theme ) {
			const restored = settingsFromTheme( theme );
			stage( { ...restored.settings, fontSize: restored.fontSize, opacity: restored.opacity }, true );
		} else stage( { theme: palette.control.value, activeReadingTheme: "", scriptColour: "", headingColour: "", directionColour: "", productionNoteColour: "", backgroundColour: "" }, true );
	} );
	colour( background, "lp-background-colour", "Background colour", "backgroundColour", "background" );
	for ( const [ id, label, key, min ] of [ [ "lp-bg-opacity", "Background off air", "opacity", 0 ], [ "lp-backing-on-air", "Background on air", "backingOnAir", 0 ], [ "lp-text-opacity", "Text opacity", "textOpacity", 20 ], [ "lp-text-brightness", "Text brightness", "textBrightness", 30 ] ] ) range( background, id, label, key, { min, scale: 100 } );
	const themeActions = el( "div", { className: "settings-inline-actions" } );
	background.append( themeActions );
	for ( const [ label, action ] of [ [ "Save current as…", saveTheme ], [ "Import theme…", importTheme ], [ "Export theme…", exportTheme ] ] ) {
		const button = el( "button", { type: "button" }, label );
		button.addEventListener( "click", action );
		themeActions.append( button );
	}
	doc.getElementById( "set-background-host" )?.remove();
	const layout = section( "layout", "Layout", doc.getElementById( "set-layout-host" ) );
	layout.replaceChildren( el( "legend", {}, "Layout" ) );
	choice( layout, "lp-align", "Alignment", "textAlign", [ [ "left", "Left" ], [ "center", "Centre" ] ], true );
	for ( const [ id, label, key, min, max ] of [ [ "lp-margin-x", "Side margins", "marginX", 0, 35 ], [ "lp-margin-top", "Top margin", "marginTop", 0, 60 ], [ "lp-margin-bottom", "Bottom margin", "marginBottom", 0, 60 ], [ "lp-reading-line", "Reading line", "readingLine", 5, 80 ] ] ) range( layout, id, label, key, { min, max } );
	const aids = section( "aids", "Reading aids", doc.getElementById( "set-aids-host" ) );
	aids.replaceChildren( el( "legend", {}, "Reading aids" ) );
	for ( const [ id, label, key ] of [ [ "lp-marker", "Reading marker", "showReadingMarker" ], [ "lp-sentence", "Sentence highlight", "highlightSentence" ], [ "lp-progress", "Progress and time", "showProgress" ], [ "lp-focus-band", "Focus band", "focusBand" ] ] ) check( aids, id, label, key, true );
	range( aids, "lp-focus-strength", "Focus strength", "focusStrength", { min: 10, max: 90, scale: 100 } );
	choice( aids, "lp-text-effect", "Text edge", "textEffect", [ [ "none", "None" ], [ "outline", "Outline" ], [ "shadow", "Shadow" ] ], true );
	const mode = section( "mode", "Mode and pace", selectValues.find( f => f.dataset.tab === "mode" ) );
	check( mode, "lp-points", "Notes / page mode", "pointsMode" );
	check( mode, "lp-follow-pace", "Follow script pacing", "followScriptPace" );
	const takes = section( "takes", "Takes", doc.getElementById( "set-recording-host" ) );
	for ( const [ id, label, key ] of [ [ "lp-summary", "Take summary", "takeSummary" ], [ "lp-pacing", "Pacing light", "showPacing" ], [ "lp-on-air", "On-air light", "onAirLight" ], [ "lp-start-beep", "Start beep", "startBeep" ] ] ) check( takes, id, label, key );
	const screens = section( "screens", "Screens and mirroring", doc.getElementById( "set-display-host" ) );
	for ( const [ id, label, key ] of [ [ "lp-pinned", "Keep toolbar visible", "controlsPinned" ], [ "lp-hide-capture", "Hide from capture", "hideFromCapture" ], [ "lp-click-through", "Click-through", "clickThrough" ] ] ) check( screens, id, label, key );
	const mirror = oldLayout.querySelector( ".lp-mirror-row" );
	for ( const original of mirror?.querySelectorAll( "[data-axis]" ) ?? [] ) {
		const button = original.cloneNode( true );
		original.replaceWith( button );
		button.addEventListener( "click", () => {
			const mode = getState().mirrored;
			let horizontal = [ "horizontal", "both" ].includes( mode ), vertical = [ "vertical", "both" ].includes( mode );
			if ( button.dataset.axis === "h" ) horizontal = !horizontal;
			else vertical = !vertical;
			stage( { mirrored: horizontal && vertical ? "both" : horizontal ? "horizontal" : vertical ? "vertical" : "off" }, true );
		} );
	}
	if ( mirror ) doc.getElementById( "set-mirror-host" ).append( mirror );
	check( screens, "set-always-on-top", "Always on top", "alwaysOnTop" );
	row( screens, "Prompter monitor", take( "set-prompter-display", "select" ), "Choose a connected display to open the prompter full screen there. F11 restores its window." );
	controls.get( "set-prompter-display" ).addEventListener( "change", event => stage( { prompterDisplay: event.target.value ? Number( event.target.value ) : null } ) );
	if ( mirror ) {
		screens.append( mirror );
		doc.getElementById( "set-mirror-host" ).remove();
	}
	const windowChoices = el( "div", { className: "settings-window-choices" } );
	for ( const node of [ ...screens.querySelectorAll( ".settings-row" ) ] ) if ( node.querySelector( "input[type=checkbox]" ) ) windowChoices.append( node );
	screens.prepend( windowChoices );
	for ( const field of selectValues.filter( node => node.dataset.tab === "screens" && node !== screens && !node.querySelector( "#set-eye-line" ) ) ) if ( !field.querySelector( "input,select,button" ) ) field.remove();
	const scriptHost = doc.getElementById( "set-script-host" );
	scriptHost.dataset.tab = "aids";
	check( scriptHost, "lp-directives", "Show script directive tags", "showDirectives", true );
	oldLayout.remove();
	for ( const note of root.querySelectorAll( ".settings-live-note" ) ) note.remove();
	root.classList.add( "settings-redesign" );
	const choiceLink = el( "button", { type: "button", className: "settings-theme-link" }, "Choose theme" );
	choiceLink.addEventListener( "click", () => navigate( "background" ) );
	targets.before( choiceLink );
	// Values already owned by Settings keep their current controllers; the
	// workspace adds draft tracking without starting devices or services.
	for ( const [ id, key ] of Object.entries( { "set-scroll-mode": "scrollMode", "set-steady-wpm": "steadyWpm", "set-countdown": "countdown", "set-slate": "slate", "set-voice-engine": "voiceEngine", "set-voice-commands": "voiceCommands", "set-wake-word": "wakeWord", "set-scratch-audio": "scratchAudio", "set-coach-fillers": "coachFillers", "set-take-loudness": "takeLoudness", "set-sound-check-takes": "soundCheckDuringTakes", "set-sound-alike": "soundAlike", "set-always-on-top": "alwaysOnTop", "set-check-updates": "checkUpdates", "set-debug-mode": "debugMode", "set-highlight-cues": "highlightCues", "set-cues-file": "cuesFile", "set-eye-line": "eyeLine", "set-eye-line-width": "eyeLineWidth", "set-eye-line-height": "eyeLineHeight", "set-eye-line-reading": "eyeLineReadingLine", "set-remote-delete": "remoteDeleteRecordings", "set-remote-port": "remotePort", "set-trace-commands": "traceCommands", "set-microphone": "audioDeviceId" } ) ) {
		const input = controls.get( id );
		if ( input ) bind( input, key, input.type === "checkbox" ? "check" : [ "number", "range" ].includes( input.type ) ? "number" : "select" );
	}
	const masterIds = { engine: "set-speech-enabled", microphone: "set-microphone-enabled", pad: "set-pad-enabled", pairing: "set-phone", mappings: "set-keyboard-mappings", gamepad: "set-gamepad-enabled", streamdeck: "set-stream-deck", obs: "set-obs-enabled", api: "set-remote" };
	const engine = sections.get( "engine" ) ?? section( "engine", "Speech engine", selectValues.find( f => f.dataset.tab === "engine" ) );
	for ( const id of [ "set-speech-model-get", "set-speech-model-reinstall", "set-speech-model-remove" ] ) controls.get( id ).hidden = true;
	const modelSetup = el( "button", { type: "button" }, "Manage speech model…" );
	modelSetup.addEventListener( "click", () => navigate( "components" ) );
	engine.append( modelSetup );
	const microphone = section( "microphone", "Microphone" );
	const recognition = controls.get( "set-microphone" ).closest( "fieldset" );
	for ( const child of [ ...recognition.children ] ) if ( child.tagName !== "LEGEND" ) microphone.append( child );
	if ( recognition !== engine ) recognition.remove();
	const serviceKey = controls.get( "set-deepgram-key" ).closest( "[data-settings-control]" );
	if ( serviceKey ) engine.append( serviceKey );
	for ( const item of [ ...microphone.querySelectorAll( ".voice-deepgram-only" ) ] ) engine.append( item );
	const keyClear = check( engine, "set-deepgram-clear", "Remove saved service key on Apply", "clearDeepgramKey" );
	keyClear.control.closest( ".settings-row" ).classList.add( "voice-deepgram-only" );
	const micTest = el( "button", { type: "button", id: "set-microphone-test" }, "Test selected microphone" );
	microphone.append( micTest, doc.getElementById( "vp-meter" ), doc.getElementById( "vp-mic-status" ) );
	range( mode, "set-voice-speed", "Voice response", "autoScrollSpeed", { min: 10, max: 300, scale: 100, step: 5, preview: false, help: "Response to recognised speech. This changes following speed, not microphone gain." } );
	range( mode, "set-steady-wpm", "Steady speed", "steadyWpm", { min: 60, max: 300, unit: "wpm", step: 5, preview: false } );
	range( mode, "set-countdown", "Countdown before scrolling", "countdown", { min: 0, max: 10, unit: "s", preview: false, help: "A short countdown before prompting starts. Zero starts immediately; pauses in the script remain separate." } );
	for ( const [ id, key ] of Object.entries( { "set-obs-host": "obsHost", "set-obs-port": "obsPort", "set-obs-controls": "obsControls", "set-obs-follow-prompter": "obsFollowPrompter", "set-obs-markers": "obsMarkers", "set-obs-recorded-slate": "obsRecordedSlate" } ) ) {
		const input = controls.get( id );
		bind( input, key, input.type === "checkbox" ? "check" : input.type === "number" ? "number" : "select" );
	}
	const gamepad = section( "gamepad", "Game controller" ), mappingCopy = doc.getElementById( "set-mapping-fieldset" ).cloneNode( true );
	for ( const node of [ mappingCopy, ...mappingCopy.querySelectorAll( "[id]" ) ] ) node.id = node.id === "set-mapping-fieldset" ? "set-gamepad-mapping-fieldset" : node.id.replace( "set-map", "set-gamepad-map" );
	for ( const label of mappingCopy.querySelectorAll( "label[for]" ) ) label.htmlFor = label.htmlFor.replace( "set-map", "set-gamepad-map" );
	for ( const row of mappingCopy.querySelectorAll( "[data-settings-control]" ) ) row.dataset.settingsControl = row.dataset.settingsControl.replace( "set-map", "set-gamepad-map" );
	for ( const child of [ ...mappingCopy.children ] ) if ( child.tagName !== "LEGEND" ) gamepad.append( child );
	for ( const [ id, definition ] of Object.entries( INTERFACES ) ) {
		const host = section( id, definition.label, selectValues.find( f => f.dataset.tab === id ) );
		const master = check( host, masterIds[id], definition.label, definition.key );
		master.control.closest( ".settings-row" ).dataset.interfaceMaster = id;
		host.prepend( master.control.closest( ".settings-row" ) );
		host.dataset.interface = id;
	}
	// Configuration remains in the DOM with its values intact, but is neither
	// shown nor validated while the matching interface is disabled.
	for ( const [ id, host ] of sections ) {
		if ( !INTERFACES[id] ) continue;
		const config = el( "fieldset", { className: "settings-interface-config" } );
		config.dataset.interfaceConfig = id;
		const master = host.querySelector( "[data-interface-master]" );
		for ( const child of [ ...host.children ] ) if ( child !== master && child.tagName !== "LEGEND" ) config.append( child );
		const status = el( "p", { className: "settings-interface-status" } );
		status.dataset.interfaceStatus = id;
		host.append( status, config );
	}
	// Connection forms use the same compact rows as appearance. Long setup
	// explanations belong in help, rather than between connection fields.
	const compactForm = ( id, build ) => {
		const host = sections.get( id ), config = host.querySelector( "[data-interface-config]" );
		const keep = new Map( [ ...config.querySelectorAll( "[id]" ) ].map( node => [ node.id, node ] ) );
		build( config, keep );
	};
	compactForm( "obs", ( config, keep ) => {
		config.replaceChildren();
		for ( const [ id, label ] of [ [ "set-obs-host", "Address" ], [ "set-obs-port", "Port" ], [ "set-obs-password", "Password" ] ] ) row( config, label, take( id ), id === "set-obs-password" ? "Leave blank to keep the saved OS-protected password. Remove saved password clears it only when you Apply." : "Start the recording tool and enable its WebSocket server. Apply before testing the saved connection." );
		const clear = take( "set-obs-clear-password" );
		row( config, "Remove saved password", clear );
		config.append( keep.get( "set-obs-password-status" ) );
		const buttons = el( "div", { className: "settings-inline-actions" } );
		buttons.append( take( "set-obs-test", "button" ), take( "set-obs-components", "button" ) );
		config.append( buttons, keep.get( "set-obs-status" ) );
		const status = sections.get( "obs" ).querySelector( "[data-interface-status]" );
		status.after( keep.get( "set-obs-installation" ) );
		status.hidden = true;
	} );
	compactForm( "api", ( config, keep ) => {
		config.replaceChildren();
		row( config, "Port", take( "set-remote-port" ), "Apply starts the API on this local port. Authorised clients use the token below." );
		row( config, "Access token", take( "set-remote-token" ), "Treat this token as a password. Only share it with a client you trust. New token revokes existing access." );
		const tokens = el( "div", { className: "settings-inline-actions" } );
		tokens.append( take( "set-remote-copy", "button" ), take( "set-remote-new", "button" ) );
		config.append( tokens );
		row( config, "Allow remote recording deletion", take( "set-remote-delete" ), "Off by default. Enabling permits an authorised API client to delete saved Sightline take logs and scratch audio." );
		for ( const id of [ "set-remote-controls-hint", "set-remote-status", "set-agent-readiness" ] ) if ( keep.has( id ) ) config.append( keep.get( id ) );
		const links = el( "div", { className: "settings-inline-actions" } );
		links.append( take( "set-remote-help", "button" ), take( "set-remote-components", "button" ) );
		config.append( links );
	} );
	const move = ( id, destination ) => {
		const node = controls.get( id ) ?? doc.getElementById( id );
		if ( !node ) return;
		const previous = node.closest( "[data-settings-control],.button-row" );
		node.remove();
		if ( previous && !previous.querySelector( "input,select,button,textarea,a" ) ) previous.remove();
		destination.append( node );
	};
	const support = section( "support", "Help and support" );
	for ( const id of [ "settings-about-guide", "settings-about-support" ] ) move( id, support );
	const credits = section( "credits", "Credits" );
	credits.append( el( "p", {}, "Sightline Prompter is developed by Joanne Lockwood, SEE Change Happen Ltd, from David Neal’s Electron Teleprompter. Distributed under the MIT licence." ) );
	move( "settings-about-full", credits );
	const logs = section( "logs", "Support logs" );
	const soundDependency = section( "sound", "Microphone input" );
	soundDependency.dataset.settingsFirst = "true";
	const soundNotice = el( "p", { className: "field-hint" }, "Enable microphone input before configuring sound checks or scratch audio. Saved audio preferences are retained." );
	const soundEnable = el( "button", { type: "button" }, "Microphone settings…" );
	soundEnable.addEventListener( "click", () => navigate( "microphone" ) );
	soundDependency.append( soundNotice, soundEnable );
	const soundFields = [ ...root.querySelectorAll( "fieldset[data-tab=\"sound\"]" ) ].filter( field => field !== soundDependency );
	check( logs, "set-debug-mode", "Enable debug logging", "debugMode" );
	move( "settings-save-log", logs );
	const explain = ( id, title, text, actions = [] ) => {
		const host = section( id, title );
		host.append( el( "p", { className: "field-hint" }, text ) );
		const buttons = el( "div", { className: "settings-inline-actions" } );
		for ( const [ label, action ] of actions ) {
			const button = el( "button", { type: "button" }, label );
			button.dataset.settingsAction = action;
			buttons.append( button );
		}
		host.append( buttons );
		return host;
	};
	explain( "checklist", "Prepare a session", "Choose a script, check its reading appearance, then test the controls and recording route you will use. The session check shows what is ready.", [ [ "Run session check", "session" ], [ "Review script", "review" ], [ "Reading appearance", "typography" ], [ "Head guide", "guide" ] ] );
	explain( "getting-started", "Getting started", "Start with steady scrolling and adjust the reading appearance. Enable optional controllers only when you want to use them; installation and readiness checks live in Optional components.", [ [ "Initial setup", "onboarding" ], [ "Getting started guide", "help" ], [ "Optional components", "components" ] ] );
	explain( "guide", "Head guide", "Set the eye centre and level first, then fit top, bottom and sides. Save a recording reference to return to that position; the ideal template stays separate. Capture protection depends on your recording route.", [ [ "Show guide", "guide-show" ], [ "Adjust guide", "guide-adjust" ], [ "Fullscreen / restore", "guide-fullscreen" ] ] );
	const health = section( "health", "Health" );
	health.append( el( "p", { className: "field-hint" }, "Listening health and automatic recovery events are logged without recognised words. Enable command tracing separately only when investigating mishearings." ) );
	const screenTopics = el( "fieldset" );
	screenTopics.dataset.tab = "screens";
	screenTopics.dataset.settingsFirst = "true";
	const screenChoice = el( "select", { id: "settings-screen-topic" } );
	screenChoice.dataset.navigationChoice = "true";
	screenChoice.setAttribute( "aria-label", "Screen controls" );
	screenChoice.append( new Option( "Window and mirroring", "window" ), new Option( "Eye-line strip", "strip" ) );
	screenTopics.append( screenChoice );
	box.insertBefore( screenTopics, box.querySelector( ".modal-actions" ) );
	const screenFields = [ ...root.querySelectorAll( "fieldset[data-tab=\"screens\"]" ) ].filter( node => node !== screenTopics );
	const showScreens = () => {
		for ( const field of screenFields ) field.hidden = ( field.querySelector( "#set-eye-line" ) ? "strip" : "window" ) !== screenChoice.value;
	};
	screenChoice.addEventListener( "change", showScreens );
	showScreens();
	const aidTopics = el( "fieldset" );
	aidTopics.dataset.tab = "aids";
	aidTopics.dataset.settingsFirst = "true";
	const aidChoice = el( "select" );
	aidChoice.dataset.navigationChoice = "true";
	aidChoice.setAttribute( "aria-label", "Reading aids" );
	aidChoice.append( new Option( "Reading indicators", "indicators" ), new Option( "Slide cues and script tags", "cues" ) );
	aidTopics.append( aidChoice );
	box.insertBefore( aidTopics, box.querySelector( ".modal-actions" ) );
	const aidFields = [ ...root.querySelectorAll( "fieldset[data-tab=\"aids\"]" ) ].filter( node => node !== aidTopics );
	const showAids = () => {
		for ( const field of aidFields ) field.hidden = ( field.querySelector( "#set-highlight-cues,#lp-directives" ) ? "cues" : "indicators" ) !== aidChoice.value;
	};
	aidChoice.addEventListener( "change", showAids );
	showAids();
	const componentFields = [ ...root.querySelectorAll( "[data-component-choice]" ) ];
	if ( componentFields.length ) {
		const choose = el( "select", { id: "settings-component-choice" } );
		choose.dataset.navigationChoice = "true";
		choose.setAttribute( "aria-label", "Optional component" );
		for ( const item of componentFields ) choose.append( el( "option", { value: item.dataset.componentChoice }, item.querySelector( "legend" ).textContent ) );
		const host = section( "components", "Optional components" );
		host.dataset.settingsFirst = "true";
		host.append( choose );
		const paint = () => {
			for ( const item of componentFields ) item.hidden = item.dataset.componentChoice !== choose.value;
		};
		choose.addEventListener( "change", paint );
		paint();
	}
	// Small, named editors replace unbounded lists. Selecting another item never
	// depends on the current window height.
	for ( const [ id, label ] of [ [ "words-list", "Script word" ], [ "command-words-list", "Command phrase" ] ] ) {
		const list = doc.getElementById( id );
		const picker = el( "select", { id: `${ id }-selection` } );
		picker.dataset.navigationChoice = "true";
		picker.setAttribute( "aria-label", label );
		list.before( picker );
		let selected = null;
		const ids = new WeakMap();
		let count = 0;
		const paint = () => {
			const rows = [ ...list.children ];
			for ( const row of rows ) if ( !ids.has( row ) ) {
				ids.set( row, String( ++count ) );
				selected = ids.get( row );
			}
			if ( !rows.some( row => ids.get( row ) === selected ) ) selected = rows[0] ? ids.get( rows[0] ) : null;
			picker.replaceChildren( ...rows.map( ( row ) => {
				const text = row.querySelector( "input,select" );
				return new Option( text?.selectedOptions?.[0]?.textContent || text?.value || `New ${ label.toLowerCase() }`, ids.get( row ) );
			} ) );
			if ( !rows.length ) picker.append( new Option( `No ${ label.toLowerCase() } entries`, "" ) );
			picker.value = selected ?? "";
			for ( const row of rows ) row.hidden = ids.get( row ) !== selected;
		};
		picker.addEventListener( "change", () => {
			selected = picker.value;
			paint();
		} );
		list.addEventListener( "change", paint );
		new MutationObserver( paint ).observe( list, { childList: true } );
		paint();
	}
	const samples = [];
	for ( const host of [ typography, background ] ) {
		const sample = el( "aside", { className: "settings-reading-sample" } );
		sample.setAttribute( "aria-label", "Reading appearance preview" );
		sample.innerHTML = "<div class=\"sample-paper\"><p data-sample=\"headings\">Your next section</p><p data-sample=\"script\">Read naturally, at your own pace. <span data-sample=\"inline\">[smile]</span></p><p data-sample=\"production\">Preparation note — hidden while reading.</p></div>";
		host.append( sample );
		samples.push( sample );
	}
	for ( const button of root.querySelectorAll( "button[data-help-text]" ) ) {
		const popup = el( "div", { className: "settings-explanation" }, button.dataset.helpText );
		popup.setAttribute( "popover", "auto" );
		popup.id = `${ button.closest( "[data-settings-control]" ).dataset.settingsControl }-help`;
		root.append( popup );
		button.setAttribute( "aria-controls", popup.id );
		button.setAttribute( "aria-expanded", "false" );
		let pinned = false, leaveTimer;
		const open = () => {
			clearTimeout( leaveTimer );
			popup.showPopover();
			const rect = button.getBoundingClientRect(), view = root.ownerDocument.defaultView;
			popup.style.left = `${ Math.max( 8, Math.min( rect.left, view.innerWidth - popup.offsetWidth - 8 ) ) }px`;
			popup.style.top = `${ Math.max( 8, Math.min( rect.bottom + 6, view.innerHeight - popup.offsetHeight - 8 ) ) }px`;
		};
		button.addEventListener( "click", () => {
			if ( popup.matches( ":popover-open" ) && pinned ) {
				popup.hidePopover();
				pinned = false;
			} else {
				open();
				pinned = true;
			}
		} );
		const leave = () => {
			clearTimeout( leaveTimer );
			leaveTimer = setTimeout( () => {
				if ( !pinned && root.ownerDocument.activeElement !== button ) popup.hidePopover();
			}, 160 );
		};
		button.addEventListener( "mouseenter", open );
		button.addEventListener( "mouseleave", leave );
		popup.addEventListener( "mouseenter", () => clearTimeout( leaveTimer ) );
		popup.addEventListener( "mouseleave", leave );
		button.addEventListener( "focus", open );
		button.addEventListener( "blur", () => popup.hidePopover() );
		popup.addEventListener( "toggle", () => button.setAttribute( "aria-expanded", String( popup.matches( ":popover-open" ) ) ) );
	}
	root.addEventListener( "keydown", ( event ) => {
		if ( event.key !== "Escape" ) return;
		const popup = root.querySelector( ".settings-explanation:popover-open" );
		if ( !popup ) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		popup.hidePopover();
	}, true );
	const saveDialog = el( "dialog", { className: "reading-theme-dialog" } );
	saveDialog.innerHTML = "<form><h3>Save current as a theme</h3><p>Keep fonts, sizes, colours, styles, spacing and reading background. Other setup preferences are excluded.</p><label for=\"reading-theme-name\">Theme name</label><input id=\"reading-theme-name\" type=\"text\" maxlength=\"60\" required autocomplete=\"off\"><label class=\"theme-copy-choice\"><input id=\"reading-theme-copy\" type=\"checkbox\">Export a copy for another computer</label><p class=\"theme-save-error\" role=\"status\" hidden></p><div class=\"settings-inline-actions\"><button type=\"button\" data-cancel>Cancel</button><button type=\"submit\">Save theme</button></div></form>";
	root.append( saveDialog );
	saveDialog.querySelector( "[data-cancel]" ).addEventListener( "click", () => saveDialog.close() );
	saveDialog.querySelector( "form" ).addEventListener( "submit", async ( event ) => {
		event.preventDefault();
		const error = saveDialog.querySelector( ".theme-save-error" );
		error.hidden = true;
		try {
			const state = getState(), theme = captureReadingTheme( saveDialog.querySelector( "#reading-theme-name" ).value, state, state );
			const result = await window.electron.saveReadingTheme( { theme, exportCopy: saveDialog.querySelector( "#reading-theme-copy" ).checked } );
			if ( !result.ok ) throw new Error( result.error );
			stage( { activeReadingTheme: result.theme.id }, false );
			saveDialog.close();
			toast( result.exportError ? `Theme saved; export could not finish: ${ result.exportError }` : "Theme saved. Apply to keep the current look." );
		} catch ( failure ) {
			error.textContent = failure.message;
			error.hidden = false;
		}
	} );
	function saveTheme() {
		saveDialog.querySelector( "#reading-theme-name" ).value = "";
		saveDialog.querySelector( "#reading-theme-copy" ).checked = false;
		saveDialog.querySelector( ".theme-save-error" ).hidden = true;
		saveDialog.showModal();
		saveDialog.querySelector( "#reading-theme-name" ).focus();
	}
	async function importTheme() {
		const result = await window.electron.importReadingTheme();
		if ( !result.ok ) return toast( result.error );
		if ( result.cancelled ) return;
		const restored = settingsFromTheme( result.theme );
		stage( { ...restored.settings, fontSize: restored.fontSize, opacity: restored.opacity }, true );
	}
	async function exportTheme() {
		try {
			const state = getState(), name = ( state.readingThemes ?? [] ).find( t => t.id === state.activeReadingTheme )?.name ?? "Current reading look";
			const result = await window.electron.exportReadingTheme( captureReadingTheme( name, state, state ) );
			if ( !result.ok ) toast( result.error );
			else if ( !result.cancelled ) toast( "Reading theme exported" );
		} catch ( error ) {
			toast( error.message );
		}
	}
	function sync( state = getState() ) {
		const paletteInfo = READING_PALETTES[state.theme] ?? READING_PALETTES.default;
		for ( const field of soundFields ) {
			field.hidden = state.microphoneEnabled === false;
			field.disabled = state.microphoneEnabled === false;
		}
		soundDependency.hidden = state.microphoneEnabled !== false;
		const modeChoice = controls.get( "set-scroll-mode" );
		const voiceReady = state.speechEnabled !== false && state.microphoneEnabled !== false;
		for ( const option of modeChoice.options ) if ( option.value === "voice" ) option.disabled = !voiceReady;
		const voiceMode = state.scrollMode === "voice" && !state.pointsMode;
		controls.get( "set-voice-speed" ).closest( "[data-settings-control]" ).hidden = !voiceMode;
		controls.get( "set-steady-wpm" ).closest( "[data-settings-control]" ).hidden = voiceMode || state.pointsMode === true;
		controls.get( "set-coach-fillers" ).disabled = !voiceReady || !voiceMode;
		controls.get( "set-coach-fillers" ).title = voiceReady && voiceMode ? "Optional aggregate counts while following speech" : "Enable speech, microphone input and Voice mode first";
		for ( const descriptor of bindings.values() ) {
			const { control, key, kind, scale = 1 } = descriptor, value = state[key];
			if ( value === undefined ) continue;
			if ( kind === "check" ) {
				control.checked = value === true;
				const label = control.nextElementSibling;
				if ( label?.classList.contains( "settings-on-off" ) ) label.textContent = control.checked ? "On" : "Off";
			} else if ( kind === "toggle" ) control.setAttribute( "aria-pressed", String( value === true ) );
			else if ( kind === "colour" ) {
				const effective = value || paletteInfo[descriptor.target];
				control.value = effective;
				descriptor.hex.textContent = effective.toUpperCase();
				descriptor.reset.disabled = !value;
				descriptor.reset.title = value ? "Restore this item’s palette colour" : "Already using the palette colour";
			} else if ( control.ownerDocument.activeElement !== control && control.ownerDocument.activeElement !== descriptor.number ) {
				control.value = kind === "number" ? Math.round( value * scale * 1000 ) / 1000 : value ?? "";
				if ( descriptor.number ) {
					descriptor.number.value = control.value;
					descriptor.number.setCustomValidity( "" );
				}
			}
		}
		const themeOptions = [ ...Object.entries( READING_PALETTES ).map( ( [ id, item ] ) => el( "option", { value: id }, item.name ) ) ];
		const library = el( "optgroup", { label: "My saved themes" } );
		for ( const item of state.readingThemes ?? [] ) library.append( el( "option", { value: item.id }, item.name ) );
		if ( library.children.length ) themeOptions.push( library );
		palette.control.replaceChildren( ...themeOptions );
		palette.control.value = ( state.readingThemes ?? [] ).some( item => item.id === state.activeReadingTheme ) ? state.activeReadingTheme : state.theme ?? "default";
		for ( const [ id ] of Object.entries( INTERFACES ) ) {
			const host = sections.get( id ), enabled = interfaceEnabled( state, id ) || ( id === "pad" && state.phoneRemote === true );
			host.classList.toggle( "interface-disabled", !enabled );
			host.querySelector( "[data-interface-config]" ).disabled = !enabled;
			host.querySelector( "[data-interface-status]" ).textContent = enabled ? "Enabled. Apply to activate changes." : "Off. Enable to see configuration; saved values are retained.";
		}
		const appearance = appearanceFromSettings( state, state );
		for ( const sample of samples ) {
			const colour = state.backgroundColour || paletteInfo.background, rgb = [ 1, 3, 5 ].map( offset => parseInt( colour.slice( offset, offset + 2 ), 16 ) );
			const backing = `rgba(${ rgb.join( "," ) }, ${ state.opacity ?? 1 })`;
			sample.style.backgroundImage = `linear-gradient(${ backing },${ backing }),linear-gradient(135deg,#526b7b,#333d52)`;
			for ( const node of sample.querySelectorAll( "[data-sample]" ) ) {
				const target = node.dataset.sample, style = appearance.text[target];
				Object.assign( node.style, { color: style.color || paletteInfo[target], fontFamily: style.font === "Follow script" ? appearance.text.script.font : style.font, fontWeight: style.bold ? "700" : "400", fontStyle: style.italic ? "italic" : "normal", lineHeight: String( style.spacing / 100 ), fontSize: `${ target === "script" ? Math.min( 26, Math.max( 14, style.size / 18 ) ) : Math.min( 28, Math.max( 9, style.size / 100 * 17 ) ) }px`, opacity: String( ( state.textOpacity ?? 1 ) * ( target === "inline" && state.directions === "dim" ? 0.65 : 1 ) ), filter: `brightness(${ state.textBrightness ?? 1 })` } );
				node.hidden = target === "inline" && state.directions === "hide";
			}
		}
		fitSamples();
		return appearanceFromSettings( state, state );
	}
	function fitSamples() {
		for ( const sample of samples ) {
			if ( !sample.clientHeight ) continue;
			const paper = sample.querySelector( ".sample-paper" ), style = root.ownerDocument.defaultView.getComputedStyle( sample );
			const room = sample.clientHeight - parseFloat( style.paddingTop ) - parseFloat( style.paddingBottom );
			paper.style.transformOrigin = "top left";
			paper.style.transform = `scale(${ Math.min( 1, room / Math.max( 1, paper.scrollHeight ) ) })`;
		}
	}
	const resize = new ResizeObserver( fitSamples );
	for ( const sample of samples ) resize.observe( sample );
	return { sync, selectTarget, bindings, controls, sections, row, el };
}
