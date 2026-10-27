import { Menu } from "electron";
import path from "node:path";

export function buildMenus(
	browserWindow,
	{
		openScriptFile,
		showOpenScriptDialog,
		recentFiles,
		clearRecentFiles,
		settings,
		updateSettings,
		slots,
		activeSlot,
		isMaximized,
		samples = [],
		openSample,
		displays = []
	}
) {
	const isMac = process.platform === "darwin";
	const send = ( channel, ...args ) =>
		browserWindow.webContents.send( channel, ...args );

	const recentSubmenu = recentFiles.map( filePath => ( {
		label: path.basename( filePath ),
		click: () => openScriptFile( filePath )
	} ) );

	if ( recentSubmenu.length > 0 ) {
		recentSubmenu.push( { type: "separator" } );
		recentSubmenu.push( {
			label: "Clear Recent",
			click: clearRecentFiles
		} );
	}

	const slotItems = slots.map( ( slot, i ) => ( {
		label: `${ i + 1 }: ${ slot ? path.basename( slot.path ) : "(empty)" }`,
		type: "radio",
		checked: i === activeSlot,
		accelerator: `CmdOrCtrl+${ i + 1 }`,
		click: () => send( "menuSwitchSlot", i )
	} ) );

	const template = [
		...( isMac ? [ { role: "appMenu" } ] : [] ),
		{
			label: "File",
			submenu: [
				{
					label: "New",
					accelerator: "CmdOrCtrl+N",
					click: () => send( "newFile" )
				},
				{
					label: "Open…",
					accelerator: "CmdOrCtrl+O",
					click: () => showOpenScriptDialog()
				},
				{
					label: "Open Recent",
					submenu:
						recentSubmenu.length > 0
							? recentSubmenu
							: [ { label: "No Recent Files", enabled: false } ]
				},
				{
					label: "Sample Scripts",
					submenu: samples.map( s => ( {
						label: s.label,
						click: () => openSample?.( s.file )
					} ) )
				},
				{ type: "separator" },
				{
					label: "Save",
					accelerator: "CmdOrCtrl+S",
					click: () => send( "menuSave" )
				},
				{
					label: "Save As...",
					accelerator: "CmdOrCtrl+Shift+S",
					click: () => send( "menuSaveAs" )
				},
				{ type: "separator" },
				{
					label: "Settings…",
					accelerator: "CmdOrCtrl+,",
					click: () => send( "menuSettings" )
				},
				{
					label: "Load Settings from File…",
					click: () => send( "menuImportSettings" )
				},
				{
					label: "Save Settings to File…",
					click: () => send( "menuExportSettings" )
				},
				{ type: "separator" },
				{ role: "quit" }
			]
		},
		{
			label: "Edit",
			submenu: [
				{
					label: "Toggle Editor",
					accelerator: "CmdOrCtrl+E",
					click: () => send( "toggleEditor" )
				},
				{ type: "separator" },
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" }
			]
		},
		{
			label: "Playback",
			submenu: [
				{
					label: "Start/Stop Scrolling (Space)",
					accelerator: "CmdOrCtrl+Shift+L",
					click: () => send( "toggleAutoScroll" )
				},
				{
					label: "Back to the Start",
					accelerator: "CmdOrCtrl+Home",
					click: () => send( "menuGoToStart" )
				},
				{
					label: "Scroll Mode",
					submenu: [
						{
							label: "Steady (words per minute)",
							type: "radio",
							checked: settings.scrollMode !== "voice",
							click: () => updateSettings( { scrollMode: "steady" } )
						},
						{
							label: "Voice (Follows What You Say)",
							type: "radio",
							checked: settings.scrollMode === "voice",
							click: () => updateSettings( { scrollMode: "voice" } )
						}
					]
				},
				{ type: "separator" },
				{
					label: "Increase Scroll Speed",
					accelerator: "CmdOrCtrl+]",
					click: () => send( "menuAdjustAutoScrollSpeed", "up" )
				},
				{
					label: "Decrease Scroll Speed",
					accelerator: "CmdOrCtrl+[",
					click: () => send( "menuAdjustAutoScrollSpeed", "down" )
				},
				{
					label: "Reset Scroll Speed",
					accelerator: "CmdOrCtrl+\\",
					click: () => send( "menuAdjustAutoScrollSpeed", "reset" )
				},
				{ type: "separator" },
				{
					label: "Highlight Slide Cues",
					type: "checkbox",
					checked: !!settings.highlightCues,
					click: menuItem =>
						updateSettings( { highlightCues: menuItem.checked } )
				},
				{ type: "separator" },
				{
					label: "Voice Scroll Sync (Key and Microphone)…",
					accelerator: "CmdOrCtrl+Shift+V",
					click: () => send( "menuVoice" )
				},
				{
					label: "Select Microphone…",
					click: () => send( "menuSelectMicrophone" )
				},
				{
					label: "Set Deepgram API Key…",
					click: () => send( "menuSetDeepgramKey" )
				}
			]
		},
		{
			label: "Slots",
			submenu: [
				...slotItems,
				{ type: "separator" },
				{
					label: "Clear This Slot",
					click: () => send( "menuClearSlot" )
				}
			]
		},
		{
			label: "View",
			submenu: [
				{
					label: "Layout and Margins…",
					accelerator: "CmdOrCtrl+Shift+K",
					click: () => send( "menuLayout" )
				},
				{
					label: "Keep Controls Visible",
					type: "checkbox",
					accelerator: "CmdOrCtrl+Shift+B",
					checked: !!settings.controlsPinned,
					click: menuItem =>
						updateSettings( { controlsPinned: menuItem.checked } )
				},
				{
					label: "Show Progress and Time Left",
					type: "checkbox",
					checked: settings.showProgress !== false,
					click: menuItem =>
						updateSettings( { showProgress: menuItem.checked } )
				},
				{ type: "separator" },
				{
					label: "Eye-line Mode",
					type: "checkbox",
					accelerator: "CmdOrCtrl+L",
					checked: !!settings.eyeLine,
					click: menuItem => updateSettings( { eyeLine: menuItem.checked } )
				},
				{
					label: "Floating Control Pad",
					type: "checkbox",
					accelerator: "CmdOrCtrl+Shift+P",
					checked: !!settings.showPad,
					click: menuItem => updateSettings( { showPad: menuItem.checked } )
				},
				{
					label: "Control Window (operator screen)",
					type: "checkbox",
					accelerator: "CmdOrCtrl+Shift+O",
					checked: !!settings.showControl,
					click: menuItem => updateSettings( { showControl: menuItem.checked } )
				},
				{
					label: "Keep on Top",
					type: "checkbox",
					checked: !!settings.alwaysOnTop,
					click: menuItem =>
						updateSettings( { alwaysOnTop: menuItem.checked } )
				},
				{ type: "separator" },
				{ role: "reload" },
				{ role: "toggleDevTools" }
			]
		},
		{
			label: "Window",
			submenu: [
				{
					label: "Minimise",
					accelerator: "CmdOrCtrl+Shift+M",
					click: () => send( "menuWindowControl", "minimize" )
				},
				{
					label: isMaximized ? "Restore Size" : "Maximise",
					accelerator: "Shift+F11",
					click: () => send( "menuWindowControl", "maximize" )
				},
				{
					label: "Full Screen",
					accelerator: "F11",
					click: () => send( "menuWindowControl", "fullscreen" )
				},
				{
					label: "Prompter Monitor",
					submenu: [
						{
							label: "Leave It Where It Is",
							type: "radio",
							checked: settings.prompterDisplay == null,
							click: () => updateSettings( { prompterDisplay: null } )
						},
						...displays.map( d => ( {
							label: `Full Screen on ${ d.label }`,
							type: "radio",
							checked: settings.prompterDisplay === d.id,
							click: () => updateSettings( { prompterDisplay: d.id } )
						} ) )
					]
				},
				{ type: "separator" },
				{
					label: "Close",
					accelerator: "CmdOrCtrl+W",
					click: () => send( "menuWindowControl", "close" )
				}
			]
		},
		{
			label: "Help",
			submenu: [
				{
					label: "Keyboard Shortcuts",
					accelerator: "F1",
					click: () => send( "menuHelp" )
				},
				{ type: "separator" },
				{
					label: "About Sightline Prompter",
					click: () => send( "menuAbout" )
				}
			]
		}
	];

	const menu = Menu.buildFromTemplate( template );
	Menu.setApplicationMenu( menu );
}
