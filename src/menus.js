import { Menu, shell } from "electron";
import path from "node:path";
import { SUPPORT_URL } from "./client/links.js";

// Native menus retain keyboard/platform access; detailed preferences live in Settings.
export function buildMenus( browserWindow, {
	openScriptFile, showOpenScriptDialog, recentFiles, clearRecentFiles,
	settings, updateSettings, slots, activeSlot, isMaximized, samples = [],
	openSample, openGoogleDoc, copyAiPrompt, exportEditPack, showRecordings,
	reloadGoogleDoc, openGuide, toggleHeadGuide, toggleHeadGuideFullscreen, displays = []
} ) {
	const send = ( channel, ...args ) => browserWindow.webContents.send( channel, ...args );
	const item = ( label, channel, accelerator, ...args ) => ( {
		label, ...( accelerator ? { accelerator } : {} ), click: () => send( channel, ...args )
	} );
	const separator = { type: "separator" };
	const recent = recentFiles.map( file => ( { label: path.basename( file ), click: () => openScriptFile( file ) } ) );
	if ( recent.length ) recent.push( separator, { label: "Clear recent files", click: clearRecentFiles } );
	const check = ( label, key, accelerator ) => ( {
		label, type: "checkbox", checked: !!settings[key], ...( accelerator ? { accelerator } : {} ),
		click: entry => updateSettings( { [key]: entry.checked } )
	} );
	const template = [
		...( process.platform === "darwin" ? [ { role: "appMenu" } ] : [] ),
		{ label: "File", submenu: [
			item( "New script", "newFile", "CmdOrCtrl+N" ),
			{ label: "Open script…", accelerator: "CmdOrCtrl+O", click: showOpenScriptDialog },
			{ label: "Open a Google Doc…", click: () => openGoogleDoc?.() },
			{ label: "Reload from Google Docs", click: () => reloadGoogleDoc?.() },
			{ label: "Recent scripts", submenu: recent.length ? recent : [ { label: "No recent scripts", enabled: false } ] },
			{ label: "Sample scripts", submenu: samples.map( sample => ( { label: sample.label, click: () => openSample?.( sample.file ) } ) ) },
			{ label: "Script slots", submenu: [
				...slots.map( ( slot, index ) => ( {
					label: `${ index + 1 }: ${ slot ? path.basename( slot.path ) : "(empty)" }`, type: "radio", checked: index === activeSlot,
					accelerator: `CmdOrCtrl+${ index + 1 }`, click: () => send( "menuSwitchSlot", index )
				} ) ), separator, item( "Clear this slot", "menuClearSlot" )
			] },
			separator, item( "Save", "menuSave", "CmdOrCtrl+S" ), item( "Save as…", "menuSaveAs", "CmdOrCtrl+Shift+S" ),
			separator,
			{ label: "Recordings…", accelerator: "CmdOrCtrl+Shift+R", click: () => showRecordings?.() },
			{ label: "Export edit pack…", click: () => exportEditPack?.() },
			separator, item( "Import settings…", "menuImportSettings" ), item( "Export settings…", "menuExportSettings" ),
			item( "Settings…", "menuSettings", "CmdOrCtrl+," ), separator, { role: "quit" }
		] },
		{ label: "Edit", submenu: [
			item( "Edit script / return to prompter", "toggleEditor", "CmdOrCtrl+E" ),
			separator, { role: "undo" }, { role: "redo" }, separator,
			{ role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }
		] },
		{ label: "Playback", submenu: [
			item( "Start / pause (Space)", "toggleAutoScroll", "CmdOrCtrl+Shift+L" ),
			item( "Back to the start", "menuGoToStart", "CmdOrCtrl+Home" ), separator,
			item( "Faster", "menuAdjustAutoScrollSpeed", "CmdOrCtrl+]", "up" ),
			item( "Slower", "menuAdjustAutoScrollSpeed", "CmdOrCtrl+[", "down" ),
			item( "Reset speed", "menuAdjustAutoScrollSpeed", "CmdOrCtrl+\\", "reset" )
		] },
		{ label: "Tools", submenu: [
			item( "Sound check", "menuSoundCheck", "CmdOrCtrl+Shift+D" ),
			{ label: "Head guide / unlock (Ctrl+Shift+H)", type: "checkbox", checked: !!settings.showHeadGuide, click: () => toggleHeadGuide?.() },
			{ label: "Guide fullscreen / restore (Ctrl+Alt+H)", type: "checkbox", checked: !!settings.showHeadGuide && !!settings.headGuideFullscreen, click: () => toggleHeadGuideFullscreen?.() },
			separator, check( "Control window", "showControl", "CmdOrCtrl+Shift+O" ), check( "Control pad", "showPad", "CmdOrCtrl+Shift+P" ),
			separator, item( "Spacing and mirror…", "menuLayout", "CmdOrCtrl+Shift+K", "layout" ),
			item( "Text and colour…", "menuLayout", undefined, "reading" ), item( "Take display…", "menuLayout", undefined, "recording" ),
			item( "Voice and microphone…", "menuVoice", "CmdOrCtrl+Shift+V" ), check( "Keep controls visible", "controlsPinned", "CmdOrCtrl+Shift+B" )
		] },
		{ label: "Window", submenu: [
			item( "Minimise", "menuWindowControl", "CmdOrCtrl+Shift+M", "minimize" ),
			item( isMaximized ? "Restore size" : "Maximise", "menuWindowControl", "Shift+F11", "maximize" ),
			item( "Full screen", "menuWindowControl", "F11", "fullscreen" ),
			{ label: "Prompter monitor", submenu: [
				{ label: "Leave it where it is", type: "radio", checked: settings.prompterDisplay == null, click: () => updateSettings( { prompterDisplay: null } ) },
				...displays.map( display => ( {
					label: `Full screen on ${ display.label }`, type: "radio", checked: settings.prompterDisplay === display.id,
					click: () => updateSettings( { prompterDisplay: display.id } )
				} ) )
			] }, separator, item( "Close", "menuWindowControl", "CmdOrCtrl+W", "close" )
		] },
		{ label: "Help", submenu: [
			{ label: "User guide", accelerator: "Shift+F1", click: () => openGuide?.() }, item( "Help and shortcuts", "menuHelp", "F1" ),
			{ label: "Copy the AI script prompt", click: () => copyAiPrompt?.() }, separator,
			{ label: "Support Sightline (Joanne's tip jar)…", click: () => shell.openExternal( SUPPORT_URL ) },
			{ label: "Diagnostics", submenu: [ { role: "reload" }, { role: "toggleDevTools" } ] },
			item( "About Sightline Prompter", "menuAbout" )
		] }
	];
	Menu.setApplicationMenu( Menu.buildFromTemplate( template ) );
}
