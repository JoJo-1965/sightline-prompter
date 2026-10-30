import { SHORTCUTS } from "./shortcuts.js";
import { COMMAND_HELP } from "./voice-commands.js";

const section = ( title, rows ) => ( { section: title, keys: rows.map( ( [ key, text ] ) => [ [ key ], text ] ) } );
const guideRows = [
	[ "Ctrl+Shift+H", "Show/unlock the head guide, or hide it when unlocked (global)" ],
	[ "Ctrl+Alt+H", "Fullscreen on its current screen / restore the saved window (global)" ],
	[ "Clean", "Hide guide controls; Ctrl+Shift+H brings them back" ],
	[ "Lock", "Pass clicks through the guide; Ctrl+Shift+H unlocks" ],
	[ "Adjust", "Drag or nudge Actual position, then resize with +/−; the dashed Ideal position stays fixed" ],
	[ "Save as ideal / Back to ideal", "Save a framing reference, or restore the actual outline to it (manual, no face tracking)" ],
	[ "Centre / Beside panel", "Recall separate saved overlay placements; these do not move either head outline" ],
	[ "Projector stack", "OBS preview at the bottom, guide in the middle, prompter text above" ],
	[ "Stream Deck", "Head-position guide (OFF/ON/LOCK) and Head guide fullscreen (FULL/WIN)" ]
];
export function voiceHelpTabs( settings ) {
	const groups = new Map();
	for ( const [ say, does, category ] of COMMAND_HELP ) {
		const obs = say === "record take · finish recording";
		if ( obs && ( !settings.obsEnabled || !settings.obsControls ) ) continue;
		const label = category ?? ( obs ? "OBS" : [ "again", "marker", "back to the marker", "keeper · scrap that" ].includes( say ) ? "Takes" : say === "bigger · smaller" ? "Display" : "Reading" );
		if ( !groups.has( label ) ) groups.set( label, [] );
		groups.get( label ).push( [ say, does ] );
	}
	return [ ...groups ].map( ( [ label, rows ] ) => ( { label, sections: [ section( label, rows ) ] } ) );
}
export function helpTabs( settings, notes = false ) {
	const get = name => SHORTCUTS.find( s => s.section === name );
	const guideKeys = new Set( [ "Ctrl+Shift+H", "Ctrl+Alt+H" ] );
	const takeKeys = new Set( [ "B", "K", "Shift+K", "Ctrl+Shift+R", "Ctrl+B", "Shift+B" ] );
	const scrolling = get( "Scrolling" );
	const reading = { ...scrolling, keys: scrolling.keys.filter( ( [ combos ] ) => !takeKeys.has( combos[0] ) ) };
	const takes = { section: "Takes, markers and exports", keys: scrolling.keys.filter( ( [ combos ] ) => takeKeys.has( combos[0] ) ) };
	const display = { ...get( "Window" ), keys: get( "Window" ).keys.filter( ( [ combos ] ) => !guideKeys.has( combos[0] ) ) };
	const readingSections = [ reading ];
	if ( notes ) readingSections.push( get( "Notes" ) );
	if ( settings.scrollMode === "voice" ) readingSections.push( get( "Voice scroll sync" ) );
	const recording = [ takes ];
	if ( settings.obsEnabled ) {
		const rows = [
			[ "Settings > Recording > OBS connection", "Saved address, port and protected password; Apply, then Test saved connection" ],
			[ "Status only", "Read recording status without starting or stopping OBS" ],
			[ "Edit pack", "Confirmed recording paths and observations stay in the take log" ],
			[ "Disable OBS", "Disconnects Sightline; leaves an existing OBS recording running" ]
		];
		if ( settings.obsControls ) rows.splice( 2, 0,
			[ "Record take", "Confirm OBS recording before starting the prompter's normal slate/countdown" ],
			[ "Finish recording", "Pause prompting, stop OBS and retain its confirmed file path" ],
			[ "Phone / control window", "The same dedicated recording actions; ordinary Play and On air stay independent" ] );
		if ( settings.obsControls && settings.obsMarkers ) rows.push( [ "Chapters", "Optional section/marker chapters, where the OBS format supports them" ] );
		if ( settings.obsControls && settings.obsRecordedSlate ) rows.push( [ "Recorded slate", "With OBS stopped: Apply, then Prepare recorded slate. Records its flash/tone on track 1; the guide stays separate" ] );
		if ( settings.obsControls && settings.streamDeck ) rows.push( [ "Stream Deck", "Record take / Finish recording keys and optional OBS layouts in the companion plug-in" ] );
		recording.push( section( "OBS recording", rows ) );
	}
	const tabs = [
		{ label: "Reading", sections: readingSections },
		{ label: "Scripts", sections: [ get( "Scripts and slots" ), get( "Script mark-up" ) ] },
		{ label: "Display", sections: [ get( "Text and layout" ), display ] },
		{ label: "Recording", sections: recording },
		{ label: "Head guide", sections: [ section( "Camera framing", guideRows.filter( ( [ label ] ) => label !== "Stream Deck" || settings.streamDeck ) ) ] }
	];
	if ( settings.voiceCommands !== "off" ) tabs.push( { label: "Voice", sections: voiceHelpTabs( settings ).flatMap( t => t.sections ) } );
	return tabs;
}

// One bounded page at a time, with roving keyboard focus and explicit panels.
export function renderHelpTabs( container, tabs, prefix ) {
	const selected = Math.max( 0, tabs.findIndex( t => t.label === container.dataset.selectedTab ) );
	container.replaceChildren();
	const nav = document.createElement( "div" );
	nav.className = "help-tabs";
	nav.setAttribute( "role", "tablist" );
	nav.setAttribute( "aria-label", "Help topics" );
	const pages = document.createElement( "div" );
	pages.className = "help-pages";
	const buttons = [];
	const panels = [];
	function choose( index, focus = false ) {
		container.dataset.selectedTab = tabs[index].label;
		buttons.forEach( ( b, i ) => {
			b.setAttribute( "aria-selected", String( i === index ) );
			b.tabIndex = i === index ? 0 : -1;
			panels[i].hidden = i !== index;
		} );
		if ( focus ) buttons[index].focus();
	}
	tabs.forEach( ( tab, index ) => {
		const button = document.createElement( "button" );
		button.type = "button";
		button.id = `${ prefix }-tab-${ index }`;
		button.textContent = tab.label;
		button.setAttribute( "role", "tab" );
		button.setAttribute( "aria-controls", `${ prefix }-page-${ index }` );
		const panel = document.createElement( "div" );
		panel.id = `${ prefix }-page-${ index }`;
		panel.className = "help-page";
		panel.setAttribute( "role", "tabpanel" );
		panel.setAttribute( "aria-labelledby", button.id );
		panel.tabIndex = 0;
		for ( const group of tab.sections ) {
			const wrap = document.createElement( "section" );
			wrap.className = "help-section";
			const heading = document.createElement( "h5" );
			heading.textContent = group.section;
			const dl = document.createElement( "dl" );
			for ( const [ combos, description ] of group.keys ) {
				const dt = document.createElement( "dt" );
				for ( const combo of combos ) {
					const key = document.createElement( "kbd" );
					key.textContent = combo;
					dt.append( key, " " );
				}
				const dd = document.createElement( "dd" );
				dd.textContent = description;
				dl.append( dt, dd );
			}
			wrap.append( heading, dl );
			panel.append( wrap );
		}
		button.addEventListener( "click", () => choose( index ) );
		button.addEventListener( "keydown", ( event ) => {
			const next = event.key === "ArrowRight" ? ( index + 1 ) % tabs.length : event.key === "ArrowLeft" ? ( index + tabs.length - 1 ) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
			if ( next !== null ) {
				event.preventDefault();
				event.stopPropagation();
				choose( next, true );
			}
		} );
		buttons.push( button );
		panels.push( panel );
		nav.append( button );
		pages.append( panel );
	} );
	container.append( nav, pages );
	choose( selected );
}
