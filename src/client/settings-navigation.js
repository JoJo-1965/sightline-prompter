// Keep the existing controls and saved values; give each topic a single home.
export const SETTINGS_GROUPS = [
	{ id: "prompting", label: "Prompting", pages: [ [ "scrolling", "Scrolling" ], [ "voice", "Voice" ], [ "commands", "Commands" ], [ "words", "Your words" ], [ "script", "Script" ] ] },
	{ id: "appearance", label: "Appearance", pages: [ [ "reading", "Text" ], [ "background", "Background" ], [ "aids", "Reading aids" ], [ "layout", "Spacing" ], [ "display", "Screens" ] ] },
	{ id: "recording", label: "Recording", pages: [ [ "recording", "Takes" ], [ "audio", "Audio" ], [ "obs", "OBS connection" ], [ "obs-recording", "OBS recording" ], [ "obs-setup", "OBS setup" ] ] },
	{ id: "controls", label: "Controls", pages: [ [ "pad", "Pad" ], [ "buttons", "Buttons & keys" ], [ "phone", "Phone" ], [ "streamdeck", "Stream Deck" ], [ "remotes", "AI & API" ] ] },
	{ id: "components", label: "Components", pages: [ [ "component-model", "Speech model" ], [ "component-kit", "AI kit" ], [ "component-node", "Node.js" ], [ "component-obs", "OBS" ], [ "component-streamdeck", "Stream Deck" ] ] },
	{ id: "debug", label: "Debug", pages: [ [ "debug", "Debug" ] ] },
	{ id: "about", label: "About", pages: [ [ "about", "About" ] ] }
];

export function createSettingsNavigation( modal, { onShow = () => {} } = {} ) {
	const primary = modal.querySelector( ".settings-tabs" );
	const secondary = modal.querySelector( ".settings-subtabs" );
	const box = modal.querySelector( ".settings-content" );
	const footer = box.querySelector( ".modal-actions" );
	const fields = [ ...modal.querySelectorAll( "fieldset[data-tab]" ) ];
	const parents = new Map();
	const pages = new Map();
	const remembered = new Map();
	const groupButtons = new Map();
	const pageButtons = new Map();
	const tab = ( list, id, label, controls ) => {
		const button = document.createElement( "button" );
		button.type = "button";
		button.id = id;
		button.textContent = label;
		button.setAttribute( "role", "tab" );
		button.setAttribute( "aria-controls", controls );
		list.append( button );
		return button;
	};
	for ( const group of SETTINGS_GROUPS ) {
		const groupPanel = document.createElement( "div" );
		groupPanel.id = `settings-group-panel-${ group.id }`;
		groupPanel.setAttribute( "role", "tabpanel" );
		groupPanel.setAttribute( "aria-labelledby", `settings-group-${ group.id }` );
		box.insertBefore( groupPanel, footer );
		const button = tab( primary, `settings-group-${ group.id }`, group.label, groupPanel.id );
		button.dataset.settingsGroup = group.id;
		groupButtons.set( group.id, { button, panel: groupPanel } );
		button.addEventListener( "click", () => show( remembered.get( group.id ) ?? group.pages[0][0] ) );
		for ( const [ name, label ] of group.pages ) {
			parents.set( name, group );
			const panel = document.createElement( "section" );
			panel.id = `settings-page-${ name }`;
			panel.dataset.settingsPage = name;
			panel.setAttribute( "role", "tabpanel" );
			panel.setAttribute( "aria-labelledby", `settings-topic-${ name }` );
			groupPanel.append( panel );
			for ( const field of fields.filter( set => set.dataset.tab === name ) ) panel.append( field );
			pages.set( name, panel );
			const topic = tab( secondary, `settings-topic-${ name }`, label, panel.id );
			topic.dataset.tab = name;
			pageButtons.set( name, topic );
			topic.addEventListener( "click", () => show( name ) );
		}
	}
	const select = ( button, active ) => {
		button.classList.toggle( "active", active );
		button.setAttribute( "aria-selected", String( active ) );
		button.tabIndex = active ? 0 : -1;
	};
	function show( requested ) {
		const alias = { files: "script", components: "component-model" }[requested] ?? requested;
		const name = parents.has( alias ) ? alias : "scrolling";
		const group = parents.get( name );
		remembered.set( group.id, name );
		for ( const [ id, entry ] of groupButtons ) {
			select( entry.button, id === group.id );
			entry.panel.hidden = id !== group.id;
		}
		secondary.hidden = group.pages.length === 1;
		secondary.setAttribute( "aria-label", `${ group.label } topics` );
		for ( const [ page, button ] of pageButtons ) {
			button.hidden = parents.get( page ) !== group;
			select( button, page === name );
			pages.get( page ).hidden = page !== name;
		}
		onShow( name );
		try {
			localStorage.setItem( "settingsTab", name );
		} catch { /* Navigation works without persistent browser storage. */ }
		return name;
	}
	function keys( event ) {
		const current = event.target.closest( "[role=tab]" );
		if ( !current || ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
		event.preventDefault();
		event.stopPropagation();
		const list = [ ...event.currentTarget.querySelectorAll( "[role=tab]" ) ].filter( button => !button.hidden );
		const index = list.indexOf( current );
		const next = event.key === "Home" ? 0 : event.key === "End" ? list.length - 1 : ( index + ( event.key === "ArrowRight" ? 1 : -1 ) + list.length ) % list.length;
		list[next].click();
		list[next].focus();
	}
	primary.addEventListener( "keydown", keys );
	secondary.addEventListener( "keydown", keys );
	return { show, focus: () => primary.querySelector( "[aria-selected=true]" )?.focus( { preventScroll: true } ) };
}
