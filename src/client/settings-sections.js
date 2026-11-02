import { settingsSectionAvailable } from "./interface-state.js";

export const SETTINGS_GROUPS = [
	{ id: "prepare", label: "Prepare", pages: [ [ "checklist", "Session checklist" ] ] },
	{ id: "reading", label: "Reading", pages: [ [ "mode", "Mode and pace" ], [ "typography", "Text and directions" ], [ "background", "Theme and background" ], [ "layout", "Layout" ], [ "aids", "Reading aids" ], [ "screens", "Screens and mirroring" ], [ "guide", "Head guide" ] ] },
	{ id: "voice", label: "Voice", pages: [ [ "engine", "Speech engine" ], [ "microphone", "Microphone" ], [ "commands", "Voice commands" ], [ "words", "Your words" ] ] },
	{ id: "recording", label: "Recording", pages: [ [ "takes", "Takes" ], [ "sound", "Sound and scratch audio" ], [ "sync", "Slate and sync" ] ] },
	{ id: "controls", label: "Controls", pages: [ [ "pad", "Pad and phone buttons" ], [ "pairing", "Phone pairing" ], [ "mappings", "Keyboard and clickers" ], [ "gamepad", "Game controller" ], [ "streamdeck", "Stream Deck" ], [ "obs", "OBS connection" ], [ "obs-recording", "OBS recording" ], [ "obs-setup", "OBS profile and scenes" ], [ "api", "AI and local API" ] ] },
	{ id: "components", label: "Setup", pages: [ [ "getting-started", "Getting started" ], [ "components", "Optional components" ], [ "reset", "Restore defaults" ] ] },
	{ id: "debug", label: "Debug", pages: [ [ "health", "Health" ], [ "trace", "Command tracing" ], [ "capture", "Screen capture" ], [ "logs", "Support logs" ] ] },
	{ id: "about", label: "About", pages: [ [ "version", "Version and updates" ], [ "credits", "Credits" ], [ "support", "Help and support" ] ] }
];
const ALIASES = { scrolling: "mode", reading: "typography", directions: "typography", theme: "background", display: "screens", script: "aids", files: "aids", voice: "engine", recording: "takes", audio: "sound", buttons: "mappings", phone: "pairing", remotes: "api", about: "version", debug: "health", "component-model": "components", "component-kit": "components", "component-node": "components", "component-obs": "components", "component-streamdeck": "streamdeck" };

// Permanent sections; no automatic pagination or control borrowing.
export function createSettingsNavigation( modal, { onShow = () => {}, getState = () => ( {} ) } = {} ) {
	const doc = modal.ownerDocument, box = modal.querySelector( ".settings-content" );
	const primary = modal.querySelector( ".settings-tabs" ), secondary = modal.querySelector( ".settings-subtabs" );
	primary.removeAttribute( "role" );
	secondary.removeAttribute( "role" );
	const workspace = doc.createElement( "div" );
	workspace.className = "settings-workspace";
	const navigation = doc.createElement( "nav" );
	navigation.className = "settings-navigation";
	navigation.setAttribute( "aria-label", "Settings areas" );
	const search = doc.createElement( "input" );
	search.type = "search";
	search.placeholder = "Find a setting";
	search.setAttribute( "aria-label", "Find a setting" );
	navigation.append( search, primary, secondary );
	const compact = doc.createElement( "div" );
	compact.className = "settings-compact-nav";
	const area = doc.createElement( "select" ), topic = doc.createElement( "select" );
	area.setAttribute( "aria-label", "Settings area" );
	topic.setAttribute( "aria-label", "Settings section" );
	compact.append( area, topic );
	const content = doc.createElement( "main" );
	content.className = "settings-section-content";
	const heading = doc.createElement( "h4" );
	heading.className = "settings-section-title";
	content.append( heading );
	workspace.append( navigation, content );
	box.querySelector( ".settings-head" ).after( compact, workspace );
	const fields = [ ...modal.querySelectorAll( "fieldset[data-tab]" ) ], parents = new Map(), pages = new Map(), groupButtons = new Map(), pageButtons = new Map(), remembered = new Map();
	let current = "checklist";
	for ( const group of SETTINGS_GROUPS ) {
		const button = doc.createElement( "button" );
		button.type = "button";
		button.textContent = group.label;
		button.dataset.settingsGroup = group.id;
		primary.append( button );
		groupButtons.set( group.id, button );
		area.append( new Option( group.label, group.id ) );
		button.addEventListener( "click", () => show( remembered.get( group.id ) ?? group.pages[0][0] ) );
		for ( const [ name, label ] of group.pages ) {
			parents.set( name, group );
			const panel = doc.createElement( "section" );
			panel.id = `settings-page-${ name }`;
			panel.dataset.settingsPage = name;
			panel.setAttribute( "aria-label", label );
			for ( const field of fields.filter( set => set.dataset.tab === name ).sort( ( a, b ) => Number( b.hasAttribute( "data-settings-first" ) ) - Number( a.hasAttribute( "data-settings-first" ) ) ) ) panel.append( field );
			content.append( panel );
			pages.set( name, panel );
			const item = doc.createElement( "button" );
			item.type = "button";
			item.id = `settings-topic-${ name }`;
			item.textContent = label;
			item.dataset.tab = name;
			item.setAttribute( "aria-controls", panel.id );
			item.addEventListener( "click", () => show( name ) );
			secondary.append( item );
			pageButtons.set( name, item );
		}
	}
	function available( name ) {
		return settingsSectionAvailable( getState(), name );
	}
	function show( requested ) {
		let name = ALIASES[requested] ?? requested;
		if ( !parents.has( name ) ) name = "checklist";
		if ( !available( name ) ) name = name.startsWith( "obs" ) ? "obs" : "engine";
		current = name;
		const group = parents.get( name );
		remembered.set( group.id, name );
		for ( const [ id, button ] of groupButtons ) {
			button.classList.toggle( "active", id === group.id );
			button.setAttribute( "aria-current", id === group.id ? "true" : "false" );
		}
		const query = search.value.trim().toLowerCase();
		for ( const [ id, button ] of pageButtons ) {
			button.hidden = !available( id ) || ( query ? !`${ button.textContent } ${ pages.get( id ).textContent }`.toLowerCase().includes( query ) : parents.get( id ) !== group );
			button.classList.toggle( "active", id === name );
			button.setAttribute( "aria-current", id === name ? "page" : "false" );
			pages.get( id ).hidden = id !== name;
			if ( [ "commands", "words", "obs-recording", "obs-setup" ].includes( id ) ) for ( const field of pages.get( id ).querySelectorAll( "fieldset" ) ) field.disabled = !available( id );
		}
		area.value = group.id;
		topic.replaceChildren( ...group.pages.filter( ( [ id ] ) => available( id ) ).map( ( [ id, label ] ) => new Option( label, id ) ) );
		topic.value = name;
		heading.textContent = pageButtons.get( name ).textContent;
		try {
			localStorage.setItem( "settingsTab", name );
		} catch { /* Optional persistence. */ }
		onShow( name );
		return name;
	}
	area.addEventListener( "change", () => {
		const group = SETTINGS_GROUPS.find( entry => entry.id === area.value );
		show( remembered.get( group.id ) ?? group.pages[0][0] );
	} );
	topic.addEventListener( "change", () => show( topic.value ) );
	search.addEventListener( "input", () => show( current ) );
	return { show, refresh: () => show( current ), get current() {
		return current;
	}, focus: () => ( compact.getClientRects().length ? topic : pageButtons.get( current ) ).focus( { preventScroll: true } ), pages };
}
