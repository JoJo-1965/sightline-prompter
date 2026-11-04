import { settingsSectionAvailable } from "./interface-state.js";

export const SETTINGS_GROUPS = [
	{ id: "start", label: "Getting started", pages: [ [ "getting-started", "First setup" ], [ "reset", "Restore defaults" ] ] },
	{ id: "prepare", label: "Prepare to record", pages: [ [ "checklist", "Overview" ] ] },
	{ id: "reading", label: "Reading", pages: [ [ "mode", "Mode and pace" ], [ "typography", "Text and directions" ], [ "background", "Theme and background" ], [ "layout", "Prompter layout" ], [ "aids", "Reading aids" ], [ "screens", "Screens and mirroring" ], [ "guide", "Head guide" ] ] },
	{ id: "voice", label: "Voice", pages: [ [ "engine", "Speech engine" ], [ "microphone", "Microphone" ], [ "commands", "Commands" ], [ "words", "Your words" ] ] },
	{ id: "recording", label: "Recording", pages: [ [ "takes", "Takes" ], [ "sound", "Sound check" ], [ "sync", "Slate and sync" ] ] },
	{ id: "controls", label: "Connections", pages: [ [ "pad", "Pad and phone" ], [ "pairing", "Phone remote" ], [ "mappings", "Keyboard and clickers" ], [ "gamepad", "Game controller" ], [ "streamdeck", "Stream Deck" ], [ "obs", "OBS integration" ], [ "obs-recording", "OBS recording control" ], [ "obs-setup", "OBS profile and scenes" ], [ "api", "MCP, AI, and API" ], [ "components", "Apps and add-ons" ] ] },
	{ id: "debug", label: "Debug", pages: [ [ "health", "Status and recovery" ], [ "trace", "Speech trace" ], [ "capture", "Capture for demos" ], [ "logs", "Support log" ] ] },
	{ id: "about", label: "About", pages: [ [ "version", "Version and updates" ], [ "credits", "Credits and licences" ], [ "support", "Help and support" ] ] }
];
const ALIASES = { scrolling: "mode", reading: "typography", directions: "typography", theme: "background", display: "screens", script: "aids", files: "aids", voice: "engine", recording: "takes", audio: "sound", buttons: "mappings", phone: "pairing", remotes: "api", about: "version", debug: "health", "component-model": "components", "component-kit": "components", "component-node": "components", "component-obs": "components", "component-streamdeck": "streamdeck" };
const OBS_TOPICS = [ [ "obs", "Connection" ], [ "obs-recording", "Recording control" ], [ "obs-setup", "Profile and scenes" ] ];
const obsPage = name => OBS_TOPICS.some( ( [ id ] ) => id === name );
const obsChild = name => name === "obs-recording" || name === "obs-setup";

// Follow the signed-off composition, not the old category/tab arrangement.
export function createSettingsNavigation( modal, { onShow = () => {}, getState = () => ( {} ) } = {} ) {
	const doc = modal.ownerDocument;
	const box = modal.querySelector( ".settings-content" );
	const primary = modal.querySelector( ".settings-tabs" );
	const secondary = modal.querySelector( ".settings-subtabs" );
	primary.removeAttribute( "role" );
	secondary.removeAttribute( "role" );
	primary.append( secondary );
	const workspace = doc.createElement( "div" );
	workspace.className = "settings-workspace";
	const navigation = doc.createElement( "nav" );
	navigation.className = "settings-navigation";
	navigation.setAttribute( "aria-label", "Settings areas and sections" );
	navigation.append( primary );
	const header = box.querySelector( ".settings-head" );
	const searchBox = doc.createElement( "div" );
	searchBox.className = "settings-search";
	const search = doc.createElement( "input" );
	search.type = "search";
	search.placeholder = "Find a setting, e.g. comments";
	search.setAttribute( "aria-label", "Find a setting" );
	search.dataset.navigationChoice = "true";
	const results = doc.createElement( "div" );
	results.className = "settings-search-results";
	results.id = "settings-search-results";
	results.hidden = true;
	results.setAttribute( "aria-label", "Matching settings" );
	search.setAttribute( "aria-controls", results.id );
	search.setAttribute( "aria-expanded", "false" );
	searchBox.append( search, results );
	header.querySelector( "#settings-close" ).before( searchBox );
	const compact = doc.createElement( "div" );
	compact.className = "settings-compact-nav";
	const area = doc.createElement( "select" );
	const topic = doc.createElement( "select" );
	for ( const [ input, label ] of [ [ area, "Area" ], [ topic, "Section" ] ] ) {
		const name = doc.createElement( "label" );
		name.append( label, input );
		input.setAttribute( "aria-label", "Settings " + label.toLowerCase() );
		input.dataset.navigationChoice = "true";
		compact.append( name );
	}
	const content = doc.createElement( "main" );
	content.className = "settings-section-content";
	const breadcrumb = doc.createElement( "p" );
	breadcrumb.className = "settings-breadcrumb";
	const headingRow = doc.createElement( "div" );
	headingRow.className = "settings-section-heading";
	const heading = doc.createElement( "h4" );
	heading.className = "settings-section-title";
	headingRow.append( heading );
	const theme = modal.querySelector( ".settings-theme-link" );
	if ( theme ) headingRow.append( theme );
	const intro = doc.createElement( "p" );
	intro.className = "settings-section-intro";
	intro.textContent = "One set of formatting controls for each kind of text.";
	content.append( breadcrumb, headingRow, intro );
	workspace.append( navigation, content, modal.querySelector( ".settings-preview-pane" ) );
	header.after( compact, workspace );
	const save = modal.querySelector( "#settings-save" );
	save.textContent = "Save and close";
	const fields = [ ...modal.querySelectorAll( "fieldset[data-tab]" ) ];
	const parents = new Map(), pages = new Map(), groupButtons = new Map(), pageButtons = new Map(), lists = new Map();
	let current = "checklist";
	for ( const group of SETTINGS_GROUPS ) {
		const wrapper = doc.createElement( "div" );
		wrapper.className = "settings-area";
		wrapper.dataset.settingsArea = group.id;
		const button = doc.createElement( "button" );
		button.type = "button";
		button.textContent = group.label;
		button.dataset.settingsGroup = group.id;
		const list = doc.createElement( "div" );
		list.className = "settings-area-sections";
		list.id = "settings-area-" + group.id;
		button.setAttribute( "aria-controls", list.id );
		wrapper.append( button, list );
		secondary.append( wrapper );
		lists.set( group.id, list );
		groupButtons.set( group.id, button );
		area.append( new Option( group.label, group.id ) );
		button.addEventListener( "click", () => show( group.pages[0][0] ) );
		for ( const [ name, label ] of group.pages ) {
			parents.set( name, group );
			const panel = doc.createElement( "section" );
			panel.id = "settings-page-" + name;
			panel.dataset.settingsPage = name;
			panel.setAttribute( "aria-label", label );
			if ( obsPage( name ) ) {
				const tabs = doc.createElement( "div" );
				tabs.className = "settings-targets settings-topic-tabs";
				tabs.setAttribute( "role", "tablist" );
				tabs.setAttribute( "aria-label", "OBS integration" );
				tabs.dataset.navigationChoice = "true";
				for ( const [ target, title ] of OBS_TOPICS ) {
					const tab = doc.createElement( "button" );
					tab.type = "button";
					tab.textContent = title;
					tab.dataset.obsTopic = target;
					tab.setAttribute( "role", "tab" );
					tab.setAttribute( "aria-controls", "settings-page-" + target );
					tab.addEventListener( "click", () => show( target ) );
					tabs.append( tab );
				}
				tabs.addEventListener( "keydown", event => {
					if ( ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
					event.preventDefault();
					const choices = [ ...tabs.children ].filter( tab => !tab.hidden && !tab.disabled );
					const index = choices.indexOf( event.target );
					const next = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 : ( index + ( event.key === "ArrowLeft" ? -1 : 1 ) + choices.length ) % choices.length;
					show( choices[next].dataset.obsTopic );
					pages.get( current ).querySelector( `[data-obs-topic="${ current }"]` ).focus();
				} );
				panel.append( tabs );
			}
			for ( const field of fields.filter( set => set.dataset.tab === name ).sort( ( a, b ) => Number( b.hasAttribute( "data-settings-first" ) ) - Number( a.hasAttribute( "data-settings-first" ) ) ) ) panel.append( field );
			content.append( panel );
			pages.set( name, panel );
			const item = doc.createElement( "button" );
			item.type = "button";
			item.id = "settings-topic-" + name;
			item.textContent = label;
			item.dataset.tab = name;
			item.setAttribute( "aria-controls", panel.id );
			item.addEventListener( "click", () => show( name ) );
			list.append( item );
			pageButtons.set( name, item );
		}
	}
	function available( name ) {
		return settingsSectionAvailable( getState(), name );
	}
	function hideSearch() {
		results.hidden = true;
		search.setAttribute( "aria-expanded", "false" );
	}
	function show( requested ) {
		let name = ALIASES[requested] ?? requested;
		if ( !parents.has( name ) ) name = "checklist";
		if ( !available( name ) ) name = name.startsWith( "obs" ) ? "obs" : "engine";
		if ( current !== name ) content.scrollTop = 0;
		current = name;
		const group = parents.get( name );
		for ( const [ id, button ] of groupButtons ) {
			button.classList.toggle( "active", id === group.id );
			button.setAttribute( "aria-expanded", String( id === group.id ) );
			button.setAttribute( "aria-pressed", String( id === group.id ) );
			lists.get( id ).hidden = id !== group.id;
		}
		for ( const [ id, button ] of pageButtons ) {
			button.hidden = obsChild( id ) || !available( id );
			const selected = id === name || ( id === "obs" && obsChild( name ) );
			button.classList.toggle( "active", selected );
			button.setAttribute( "aria-current", selected ? "page" : "false" );
			pages.get( id ).hidden = id !== name;
			if ( [ "commands", "words", "obs-recording", "obs-setup" ].includes( id ) ) for ( const field of pages.get( id ).querySelectorAll( "fieldset" ) ) field.disabled = !available( id );
			for ( const tab of pages.get( id ).querySelectorAll( "[data-obs-topic]" ) ) {
				const target = tab.dataset.obsTopic;
				tab.hidden = tab.disabled = !available( target );
				tab.setAttribute( "aria-selected", String( target === name ) );
				tab.tabIndex = target === name ? 0 : -1;
			}
		}
		pageButtons.get( "obs" ).setAttribute( "aria-controls", pages.get( obsPage( name ) ? name : "obs" ).id );
		area.value = group.id;
		topic.replaceChildren( ...group.pages.filter( ( [ id ] ) => !obsChild( id ) && available( id ) ).map( ( [ id, label ] ) => new Option( label, id ) ) );
		topic.value = obsPage( name ) ? "obs" : name;
		breadcrumb.textContent = group.label;
		heading.textContent = obsPage( name ) ? "OBS integration" : pageButtons.get( name ).textContent;
		intro.hidden = name !== "typography";
		if ( theme ) theme.hidden = name !== "typography";
		hideSearch();
		try {
			localStorage.setItem( "settingsTab", name );
		} catch { /* Optional persistence. */ }
		onShow( name );
		modal.dispatchEvent( new CustomEvent( "settings-section-change", { detail: name } ) );
		return name;
	}
	area.addEventListener( "change", () => show( SETTINGS_GROUPS.find( group => group.id === area.value ).pages[0][0] ) );
	topic.addEventListener( "change", () => show( topic.value ) );
	search.addEventListener( "input", () => {
		const query = search.value.trim().toLowerCase();
		results.replaceChildren();
		const aliases = { typography: "comments instructions delivery cues production notes fonts italic", background: "themes backing transparency opacity", mappings: "keyboard pedal clicker", guide: "head eyes framing actual ideal", components: "install setup node model agent kit" };
		if ( !query ) return hideSearch();
		for ( const [ name, button ] of [ ...pageButtons ].filter( ( [ name, button ] ) => available( name ) && ( button.textContent + " " + parents.get( name ).label + " " + pages.get( name ).textContent + " " + ( aliases[name] ?? "" ) ).toLowerCase().includes( query ) ).slice( 0, 6 ) ) {
			const result = doc.createElement( "button" );
			result.type = "button";
			result.textContent = button.textContent;
			const small = doc.createElement( "small" );
			small.textContent = parents.get( name ).label;
			result.append( small );
			result.addEventListener( "click", () => {
				show( name );
				search.value = "";
				heading.tabIndex = -1;
				heading.focus();
			} );
			results.append( result );
		}
		if ( !results.children.length ) results.textContent = "No matching settings";
		results.hidden = false;
		search.setAttribute( "aria-expanded", "true" );
	} );
	search.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Enter" && !results.hidden ) {
			event.preventDefault();
			results.querySelector( "button" )?.click();
		}
		if ( event.key === "ArrowDown" && !results.hidden ) {
			event.preventDefault();
			results.querySelector( "button" )?.focus();
		}
		if ( event.key === "Escape" && !results.hidden ) {
			event.preventDefault();
			event.stopPropagation();
			hideSearch();
		}
	} );
	modal.addEventListener( "click", ( event ) => {
		if ( !searchBox.contains( event.target ) ) hideSearch();
	} );
	return { show, refresh: () => show( current ), get current() {
		return current;
	}, focus: () => ( compact.getClientRects().length ? topic : obsChild( current ) ? pages.get( current ).querySelector( `[data-obs-topic="${ current }"]` ) : pageButtons.get( current ) ).focus( { preventScroll: true } ), pages };
}
