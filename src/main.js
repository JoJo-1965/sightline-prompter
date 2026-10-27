import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, screen, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { cpSync, existsSync } from "node:fs";
import chokidar from "chokidar";
import stateFactory from "./utils/state.js";
import {
	convertMarkdown,
	readAndConvertScript,
	readRawMarkdown,
	readCuePhrases,
	isRichFile,
	SCRIPT_EXTENSIONS
} from "./utils/content.js";
import { buildMenus } from "./menus.js";
import { startRemoteServer, newToken } from "./remote.js";
import {
	serialize as serializeSettings,
	parse as parseSettings,
	pickKnown
} from "./utils/settings-file.js";

const __dirname = import.meta.dirname; // eslint-disable-line n/no-unsupported-features/node-builtins

const MAX_RECENT_FILES = 10;

// Recording settings, edited on the Settings page and persisted as `settings` in app state.
const defaultSettings = {
	scrollMode: "steady", // "steady" (fixed words per minute) or "voice" (Deepgram)
	steadyWpm: 140,
	countdown: 3,
	directions: "dim", // "dim", "hide" or "normal" for [bracketed] directions
	showReadingMarker: true,
	readingLine: 33, // % from the top of the window
	alwaysOnTop: false,
	highlightCues: true,
	cuesFile: null,
	eyeLine: false,
	eyeLineWidth: 45, // % of the screen
	eyeLineHeight: 40,
	eyeLineReadingLine: 15,
	marginX: 3, // % of the window width, each side
	marginTop: 0, // % of the window height where text fades out
	marginBottom: 0,
	lineHeight: 1.3,
	textOpacity: 1, // script text only; the controls stay solid
	textBrightness: 1, // dims the script without making it see-through
	showDirectives: false, // show {directives} as small tags for checking a script
	followScriptPace: true, // steady scrolling uses the script's {wpm} and {target} pace
	focusBand: false, // dim the lines away from the reading line
	focusStrength: 0.6, // how much the far lines are dimmed (0 to 0.9)
	textEffect: "none", // none, outline or shadow
	theme: "default", // default, yellow, contrast or cream
	scriptFont: "default", // default, atkinson, opendyslexic or verdana
	onAirLight: true, // ON AIR light while scrolling
	startBeep: false, // a short beep when the countdown ends (off: it would be recorded)
	hideFromCapture: false, // keep the window out of screen sharing and recordings
	clickThrough: false, // clicks on the script go to the window behind
	textAlign: "left", // "left" or "center"
	showProgress: true,
	controlsPinned: false, // keep the control bar visible instead of auto-hiding it
	remoteControl: false, // AI / script control over http://127.0.0.1 (see remote.js)
	remotePort: 47615
};

// Settings that a settings file or the remote API may not change.
const PROTECTED_SETTINGS = [ "remoteControl", "remotePort" ];

const SLOT_COUNT = 9;

const defaultConfig = {
	width: 800,
	height: 600,
	fontSize: 3,
	opacity: 0.07,
	mirrored: "off",
	recentFiles: [],
	deepgramApiKey: null,
	autoScrollSpeed: 1,
	audioDeviceId: null,
	settings: defaultSettings,
	normalBounds: null,
	slots: [], // script slots: { path, scrollY, section } or null
	activeSlot: 0
};

// The app was renamed from Electron Teleprompter: on first launch, bring the
// old settings, slots and saved scripts across so nothing is lost.
function migrateOldAppData() {
	const newDir = app.getPath( "userData" );
	const oldDir = path.join( app.getPath( "appData" ), "Electron Teleprompter" );
	if ( existsSync( path.join( newDir, "app-state.json" ) ) || !existsSync( oldDir ) ) return;
	try {
		for ( const name of [ "app-state.json", "scripts" ] ) {
			const from = path.join( oldDir, name );
			if ( existsSync( from ) ) cpSync( from, path.join( newDir, name ), { recursive: true } );
		}
	} catch ( err ) {
		console.log( "Could not copy settings from Electron Teleprompter:", err );
	}
}
migrateOldAppData();

const stateManager = stateFactory( defaultConfig );

// Sample scripts shipped in src/samples, for onboarding and testing.
export const SAMPLE_SCRIPTS = [
	{ file: "welcome.md", label: "Welcome tour" },
	{ file: "batch-module.md", label: "Batch recording, section by section" },
	{ file: "single-take.md", label: "Single continuous take" },
	{ file: "formatting-test.md", label: "Formatting test" },
	{ file: "plain-text-sections.txt", label: "Plain-text sections" }
];
let openSampleRef = null;
let watcher;
let watcherPaused = false;

let currentFontSize = defaultConfig.fontSize;
let currentOpacity = defaultConfig.opacity;
let currentMirrored = defaultConfig.mirrored;
let currentDeepgramApiKey = null;
let currentAutoScrollSpeed = defaultConfig.autoScrollSpeed;
let currentAudioDeviceId = null;
let settings = { ...defaultSettings };
let normalBounds = null; // window bounds to restore when leaving eye-line mode
let preMaxBounds = null; // normal window bounds while maximised or full screen
let windowMode = "normal"; // "normal", "maximized" or "fullscreen" (done by hand: see setWindowRect)
let slots = Array( SLOT_COUNT ).fill( null );
let activeSlot = 0;
let cuePhrases = [];
let recentFiles = [];
let currentFilePath = null;
let hasUnsavedChanges = false;
let isClosing = false;
let refreshMenus = () => {};
let remoteToken = null;
let remoteServer = null;
let remoteError = null;
let rendererStatus = {};
let onSettingsChanged = () => {};

function addRecentFile( filePath ) {
	recentFiles = [ filePath, ...recentFiles.filter( f => f !== filePath ) ].slice(
		0,
		MAX_RECENT_FILES
	);
}

const saveState = async ( win ) => {
	// In eye-line mode, maximised or full screen, remember the normal window so it comes back.
	let bounds;
	if ( settings.eyeLine && normalBounds ) {
		bounds = normalBounds;
	} else if ( preMaxBounds ) {
		bounds = preMaxBounds;
	} else {
		bounds = win.getBounds();
	}

	stateManager.writeAppState( {
		width: bounds.width,
		height: bounds.height,
		x: bounds.x,
		y: bounds.y,
		fontSize: currentFontSize,
		opacity: currentOpacity,
		mirrored: currentMirrored,
		recentFiles,
		deepgramApiKey: currentDeepgramApiKey,
		autoScrollSpeed: currentAutoScrollSpeed,
		audioDeviceId: currentAudioDeviceId,
		remoteToken,
		settings,
		normalBounds,
		slots,
		activeSlot
	} );
};

function eyeLineBounds( win ) {
	const area = screen.getDisplayMatching( win.getBounds() ).workArea;
	const width = Math.round( ( area.width * settings.eyeLineWidth ) / 100 );
	const height = Math.round( ( area.height * settings.eyeLineHeight ) / 100 );
	return {
		x: area.x + Math.round( ( area.width - width ) / 2 ),
		y: area.y,
		width,
		height
	};
}

// Eye-line mode: a strip at the top-centre of the screen, just under the webcam, kept on top.
function applyWindowSettings( win, wasEyeLine ) {
	if ( settings.eyeLine ) {
		if ( !wasEyeLine ) {
			normalBounds = preMaxBounds ?? win.getBounds();
			preMaxBounds = null;
			windowMode = "normal";
		}
		win.setBounds( eyeLineBounds( win ) );
	} else if ( wasEyeLine && normalBounds ) {
		win.setBounds( normalBounds );
		normalBounds = null;
	}
	win.setAlwaysOnTop( settings.eyeLine || settings.alwaysOnTop, "floating" );
	win.setContentProtection( !!settings.hideFromCapture );
	// Click-through: the renderer turns mouse events back on while the pointer
	// is over the control bar or a panel, so the controls stay usable.
	win.setIgnoreMouseEvents( !!settings.clickThrough, { forward: true } );
}

const emptySlotHtml = index =>
	`<h1>Slot ${ index + 1 } is empty</h1>`
	+ "<p>Open a script with Ctrl+O, the Open button, or drop a file onto this window. "
	+ "It goes into this slot, and Ctrl+1 to Ctrl+9 swap between slots.</p>";

const createWindow = ( state ) => {
	const win = new BrowserWindow( {
		width: state.width,
		height: state.height,
		...( state.x != null && state.y != null ? { x: state.x, y: state.y } : {} ),
		center: state.x == null,
		webPreferences: {
			nodeIntegration: false,
			sandbox: false,
			preload: path.join( __dirname, "client", "teleprompter-preload.mjs" )
		},
		transparent: true,
		frame: false
	} );

	win.webContents.session.setPermissionRequestHandler(
		( _wc, permission, callback ) => {
			callback( permission === "media" );
		}
	);

	win.loadFile( path.join( __dirname, "client", "teleprompter.html" ) );
	// Links (About page) open in the browser; the window itself never navigates away.
	win.webContents.setWindowOpenHandler( ( { url } ) => {
		if ( /^https:\/\//.test( url ) ) shell.openExternal( url );
		return { action: "deny" };
	} );
	win.webContents.on( "will-navigate", e => e.preventDefault() );

	win.webContents.on( "did-finish-load", () => {
		win.webContents.send( "fontSize", state.fontSize || defaultConfig.fontSize );
		win.webContents.send( "opacity", state.opacity ?? defaultConfig.opacity );
		win.webContents.send( "mirrored", state.mirrored || "off" );
		win.webContents.send(
			"autoScrollSpeed",
			state.autoScrollSpeed ?? defaultConfig.autoScrollSpeed
		);
		sendSettings();
		sendSlots();
		sendWindowState();
		win.webContents.send( "cuePhrases", cuePhrases );
	} );

	function sendSettings() {
		win.webContents.send( "settings", {
			...settings,
			hasDeepgramKey: !!currentDeepgramApiKey
		} );
	}

	function sendSlots() {
		win.webContents.send( "slots", {
			active: activeSlot,
			slots: slots.map( s => ( s ? { name: path.basename( s.path ) } : null ) ),
			recent: recentFiles.map( p => ( { path: p, name: path.basename( p ) } ) ),
			samples: SAMPLE_SCRIPTS
		} );
	}

	// --- Window controls ---
	// Transparent frameless windows don't maximise reliably on Windows, so
	// maximise is done by hand: fill the work area and remember the old bounds.

	function sendWindowState() {
		win.webContents.send( "windowState", {
			maximized: windowMode === "maximized",
			fullScreen: windowMode === "fullscreen",
			bounds: win.getBounds()
		} );
	}

	// Shrinking a transparent window with setBounds alone leaves the page at the
	// old size on Windows, so set the size and position again.
	function setWindowRect( rect ) {
		win.setBounds( rect );
		win.setSize( rect.width, rect.height );
		win.setPosition( rect.x, rect.y );
	}

	async function windowControl( action ) {
		if ( action === "minimize" ) {
			win.minimize();
		} else if ( action === "close" ) {
			win.close();
		} else if ( action === "maximize" || action === "fullscreen" ) {
			const target = action === "maximize" ? "maximized" : "fullscreen";
			if ( windowMode === target ) {
				// Toggle back to the normal window.
				windowMode = "normal";
				setWindowRect( preMaxBounds );
				preMaxBounds = null;
			} else {
				if ( settings.eyeLine ) await updateSettings( { eyeLine: false } );
				if ( windowMode === "normal" ) preMaxBounds = win.getBounds();
				windowMode = target;
				const display = screen.getDisplayMatching( preMaxBounds );
				setWindowRect( target === "maximized" ? display.workArea : display.bounds );
			}
			// Full screen sits above the taskbar.
			if ( windowMode === "fullscreen" ) {
				win.setAlwaysOnTop( true, "screen-saver" );
			} else {
				win.setAlwaysOnTop( settings.eyeLine || settings.alwaysOnTop, "floating" );
			}
		}
		sendWindowState();
		refreshMenus();
	}

	async function updateSettings( partial ) {
		const wasEyeLine = settings.eyeLine;
		const cuesChanged
			= "cuesFile" in partial && partial.cuesFile !== settings.cuesFile;
		settings = { ...settings, ...partial };
		applyWindowSettings( win, wasEyeLine );
		if ( cuesChanged ) {
			cuePhrases = await readCuePhrases( settings.cuesFile );
			win.webContents.send( "cuePhrases", cuePhrases );
		}
		sendSettings();
		refreshMenus();
		await saveState( win );
		onSettingsChanged();
	}

	win.on( "close", async ( event ) => {
		if ( isClosing ) {
			await saveState( win );
			return;
		}
		if ( hasUnsavedChanges ) {
			event.preventDefault();
			const result = await dialog.showMessageBox( win, {
				type: "warning",
				buttons: [ "Save", "Don't Save", "Cancel" ],
				defaultId: 0,
				cancelId: 2,
				message: "You have unsaved changes.",
				detail: "Do you want to save your changes before closing?"
			} );
			if ( result.response === 0 ) {
				// Save — tell renderer to save, then we'll close via saveAndClose IPC
				win.webContents.send( "requestSaveBeforeClose" );
			} else if ( result.response === 1 ) {
				// Don't Save — close without saving
				isClosing = true;
				win.close();
			}
			// Cancel (2) — do nothing, window stays open
		} else {
			await saveState( win );
		}
	} );

	async function watchScriptFile( scriptFile ) {
		if ( watcher ) {
			await watcher.close();
		}
		watcherPaused = false;
		watcher = chokidar.watch( scriptFile );
		watcher.on( "change", async () => {
			if ( watcherPaused ) return;
			const md = await readAndConvertScript( scriptFile );
			win.webContents.send( "content", md );
		} );
	}

	// Returns false when the reader wants to keep their unsaved edits.
	async function confirmLeave( detail ) {
		if ( !hasUnsavedChanges ) return true;
		const result = await dialog.showMessageBox( win, {
			type: "warning",
			buttons: [ "Save", "Don't Save", "Cancel" ],
			defaultId: 0,
			cancelId: 2,
			message: "You have unsaved changes.",
			detail
		} );
		if ( result.response === 0 ) {
			// Tell renderer to save; the reader can try again after saving
			win.webContents.send( "menuSave" );
			return false;
		}
		if ( result.response === 2 ) return false;
		hasUnsavedChanges = false;
		return true;
	}

	// Opens a script into the active slot; `restore` puts the reader back where they were.
	async function openScriptFile( scriptFile, restore = null ) {
		if (
			!restore
			&& !( await confirmLeave(
				"Do you want to save your changes before opening a new file?"
			) )
		) {
			return null;
		}

		const md = await readAndConvertScript( scriptFile );
		if ( md ) {
			currentFilePath = scriptFile;
			slots[activeSlot] = {
				path: scriptFile,
				scrollY: restore?.scrollY ?? 0,
				section: restore?.section ?? 0
			};
			if ( restore ) win.webContents.send( "restorePosition", restore );
			win.webContents.send( "content", md );
			addRecentFile( scriptFile );
			watchScriptFile( scriptFile );
			sendSlots();
			refreshMenus();
			await saveState( win );
		}
		return md;
	}

	async function showEmptySlot( note = "" ) {
		if ( watcher ) {
			await watcher.close();
			watcher = null;
		}
		currentFilePath = null;
		win.webContents.send( "content", emptySlotHtml( activeSlot ) + note );
	}

	async function switchSlot( index, position ) {
		if ( !Number.isInteger( index ) || index < 0 || index >= SLOT_COUNT ) return;
		if ( index === activeSlot ) return;
		if ( !( await confirmLeave( "Save your changes before switching scripts?" ) ) ) {
			return;
		}
		if ( slots[activeSlot] && position ) {
			slots[activeSlot] = { ...slots[activeSlot], ...position };
		}
		activeSlot = index;
		const slot = slots[index];
		if ( slot?.path ) {
			const md = await openScriptFile( slot.path, {
				scrollY: slot.scrollY ?? 0,
				section: slot.section ?? 0
			} );
			if ( !md ) {
				slots[index] = null;
				await showEmptySlot(
					`<p>(${ path.basename( slot.path ) } could not be opened, so the slot was cleared.)</p>`
				);
			}
		} else {
			await showEmptySlot();
		}
		sendSlots();
		refreshMenus();
		await saveState( win );
	}

	async function clearSlot() {
		if ( !( await confirmLeave( "Save your changes before clearing this slot?" ) ) ) {
			return;
		}
		slots[activeSlot] = null;
		await showEmptySlot();
		sendSlots();
		refreshMenus();
		await saveState( win );
	}

	async function showOpenScriptDialog() {
		const results = await dialog.showOpenDialog( win, {
			properties: [ "openFile" ],
			filters: [
				{
					name: "Scripts (Markdown, text, rich text, Word, HTML)",
					extensions: SCRIPT_EXTENSIONS
				},
				{ name: "All Files", extensions: [ "*" ] }
			]
		} );
		if ( !results.canceled ) {
			await openScriptFile( results.filePaths[0] );
		}
	}

	refreshMenus = () =>
		buildMenus( win, {
			openScriptFile,
			showOpenScriptDialog,
			recentFiles,
			clearRecentFiles: () => {
				recentFiles = [];
				refreshMenus();
				sendSlots();
			},
			settings,
			updateSettings,
			slots,
			activeSlot,
			samples: SAMPLE_SCRIPTS,
			openSample: name => openSampleRef?.( name ),
			isMaximized: windowMode === "maximized"
		} );
	refreshMenus();
	applyWindowSettings( win, false );

	return {
		win,
		openScriptFile,
		showOpenScriptDialog,
		switchSlot,
		clearSlot,
		windowControl,
		updateSettings,
		sendSettings,
		sendSlots
	};
};

app.whenReady().then( async () => {
	const state = await stateManager.readAppState();
	currentFontSize = state.fontSize || defaultConfig.fontSize;
	currentOpacity = state.opacity ?? defaultConfig.opacity;
	currentMirrored = state.mirrored || "off";
	recentFiles = state.recentFiles || [];
	currentDeepgramApiKey = state.deepgramApiKey || null;
	currentAutoScrollSpeed
		= state.autoScrollSpeed ?? defaultConfig.autoScrollSpeed;
	currentAudioDeviceId = state.audioDeviceId || null;
	remoteToken = state.remoteToken || newToken();
	settings = { ...defaultSettings, ...state.settings };
	normalBounds = state.normalBounds ?? null;
	slots = Array.from( { length: SLOT_COUNT }, ( _, i ) =>
		state.slots?.[i]?.path ? state.slots[i] : null
	);
	activeSlot = Number.isInteger( state.activeSlot )
		? Math.min( SLOT_COUNT - 1, Math.max( 0, state.activeSlot ) )
		: 0;
	// Before slots existed, the most recent file was reopened: keep that.
	if ( !slots.some( Boolean ) && recentFiles.length > 0 ) {
		slots[0] = { path: recentFiles[0], scrollY: 0, section: 0 };
		activeSlot = 0;
	}
	cuePhrases = await readCuePhrases( settings.cuesFile );

	ipcMain.on( "fontSize", ( _event, size ) => {
		currentFontSize = size;
	} );

	ipcMain.on( "opacity", ( _event, value ) => {
		currentOpacity = value;
	} );

	ipcMain.on( "mirrored", ( _event, value ) => {
		currentMirrored = value;
	} );

	ipcMain.on( "autoScrollSpeed", ( _event, value ) => {
		if ( Number.isFinite( value ) ) {
			currentAutoScrollSpeed = value;
		}
	} );

	const {
		win,
		openScriptFile,
		showOpenScriptDialog,
		switchSlot,
		clearSlot,
		windowControl,
		updateSettings,
		sendSettings,
		sendSlots
	} = createWindow( state );

	ipcMain.on( "resizeWindow", ( _event, width, height ) => {
		win.setSize( width, height, false );
	} );

	// Control bar IPC
	ipcMain.on( "windowControl", ( _event, action ) => windowControl( action ) );
	ipcMain.on( "switchSlot", ( _event, index, position ) =>
		switchSlot( index, position )
	);
	ipcMain.on( "clearSlot", () => clearSlot() );
	// Where the reader is in the active slot, so it reopens there.
	ipcMain.on( "slotPosition", ( _event, position ) => {
		if ( slots[activeSlot] && position && Number.isFinite( position.scrollY ) ) {
			slots[activeSlot] = {
				...slots[activeSlot],
				scrollY: position.scrollY,
				section: Number.isInteger( position.section ) ? position.section : 0
			};
		}
	} );
	ipcMain.on( "openFileDialog", () => showOpenScriptDialog() );
	ipcMain.on( "openRecent", ( _event, filePath ) => {
		if ( recentFiles.includes( filePath ) ) openScriptFile( filePath );
	} );

	// Settings files (JSON or XML). The Deepgram key and microphone stay on this computer.
	const SETTINGS_FILTERS = [
		{ name: "JSON", extensions: [ "json" ] },
		{ name: "XML", extensions: [ "xml" ] }
	];

	// Applies settings from a file or the remote API (never the protected ones).
	async function applySettingValues( values ) {
		const extra = pickKnown( values, {
			fontSize: 3,
			opacity: 0.07,
			mirrored: "off",
			voiceResponsiveness: 1
		} );
		if ( "fontSize" in extra ) {
			currentFontSize = extra.fontSize;
			win.webContents.send( "fontSize", currentFontSize );
		}
		if ( "opacity" in extra ) {
			currentOpacity = extra.opacity;
			win.webContents.send( "opacity", currentOpacity );
		}
		if ( "mirrored" in extra ) {
			currentMirrored = extra.mirrored;
			win.webContents.send( "mirrored", currentMirrored );
		}
		if ( "voiceResponsiveness" in extra ) {
			currentAutoScrollSpeed = extra.voiceResponsiveness;
			win.webContents.send( "autoScrollSpeed", currentAutoScrollSpeed );
		}
		const known = pickKnown( values, defaultSettings );
		for ( const key of PROTECTED_SETTINGS ) delete known[key];
		await updateSettings( known );
		return { applied: [ ...Object.keys( extra ), ...Object.keys( known ) ] };
	}

	// --- Remote control (AI assistants, scripts): see remote.js ---

	const REMOTE_FILE = path.join( app.getPath( "userData" ), "remote-control.json" );
	// Shown in the UI: a portable form of the path, without the user's name.
	const APP_DATA_LABEL = { win32: "%APPDATA%", darwin: "~/Library/Application Support" }[process.platform] ?? "~/.config";
	const REMOTE_FILE_LABEL = REMOTE_FILE.replace( app.getPath( "appData" ), APP_DATA_LABEL );
	const REMOTE_COMMANDS = [
		"play",
		"pause",
		"toggle",
		"restart",
		"next-section",
		"previous-section",
		"faster",
		"slower",
		"reset-speed",
		"set-wpm",
		"go-to-section",
		"help"
	];

	function slotNumber( value ) {
		if ( value == null ) return null;
		const n = Number( value );
		if ( !Number.isInteger( n ) || n < 1 || n > SLOT_COUNT ) {
			throw new Error( `slot must be 1 to ${ SLOT_COUNT }` );
		}
		return n - 1;
	}

	async function remoteOpen( filePath, slot ) {
		const ext = path.extname( filePath ).slice( 1 ).toLowerCase();
		if ( !SCRIPT_EXTENSIONS.includes( ext ) ) {
			throw new Error( `Scripts must be ${ SCRIPT_EXTENSIONS.join( ", " ) }` );
		}
		await fs.access( filePath );
		if ( slot != null && slot !== activeSlot ) {
			win.webContents.send( "menuSwitchSlot", slot );
			// Wait for the swap (it saves the current slot's place first).
			for ( let i = 0; i < 40 && activeSlot !== slot; i++ ) {
				await new Promise( r => setTimeout( r, 50 ) );
			}
		}
		const md = await openScriptFile( filePath );
		if ( !md ) throw new Error( "Not opened: the script couldn't be read, or there are unsaved edits" );
		return { ok: true, slot: activeSlot + 1, file: filePath };
	}

	const remoteRoutes = {
		"GET /status": () => ( {
			file: currentFilePath,
			slot: activeSlot + 1,
			slots: slots.map( ( s, i ) => ( { slot: i + 1, file: s?.path ?? null } ) ),
			scrollMode: settings.scrollMode,
			steadyWpm: settings.steadyWpm,
			fontSize: currentFontSize,
			opacity: currentOpacity,
			eyeLine: settings.eyeLine,
			windowMode,
			...rendererStatus,
			commands: REMOTE_COMMANDS
		} ),
		"POST /open": ( { path: filePath, slot } ) => {
			if ( typeof filePath !== "string" || !path.isAbsolute( filePath ) ) {
				throw new Error( "path must be an absolute file path" );
			}
			return remoteOpen( filePath, slotNumber( slot ) );
		},
		// Write a script sent as text into the scripts folder, then open it.
		"POST /load-text": async ( { text, name = "script", format = "md", slot } ) => {
			if ( typeof text !== "string" || !text.trim() ) throw new Error( "text is required" );
			const ext = format === "txt" ? "txt" : "md";
			const safe = String( name ).replace( /[^\w .-]+/g, "_" ).replace( /^[. ]+/, "" ).slice( 0, 80 ) || "script";
			const dir = path.join( app.getPath( "userData" ), "scripts" );
			await fs.mkdir( dir, { recursive: true } );
			const filePath = path.join( dir, `${ safe }.${ ext }` );
			await fs.writeFile( filePath, text, "utf-8" );
			return remoteOpen( filePath, slotNumber( slot ) );
		},
		"POST /command": ( { action, value } ) => {
			if ( !REMOTE_COMMANDS.includes( action ) ) {
				throw new Error( `action must be one of: ${ REMOTE_COMMANDS.join( ", " ) }` );
			}
			win.webContents.send( "remoteCommand", action, value );
			return { ok: true, action };
		},
		"POST /slot": ( { slot } ) => {
			const index = slotNumber( slot );
			if ( index == null ) throw new Error( "slot is required" );
			win.webContents.send( "menuSwitchSlot", index );
			return { ok: true, slot: index + 1 };
		},
		"POST /settings": values => applySettingValues( values ?? {} ),
		"POST /window": async ( { action } ) => {
			if ( ![ "minimize", "maximize", "fullscreen" ].includes( action ) ) {
				throw new Error( "action must be minimize, maximize or fullscreen" );
			}
			await windowControl( action );
			return { ok: true, windowMode };
		}
	};

	function remoteInfo() {
		return {
			enabled: !!settings.remoteControl,
			running: !!remoteServer,
			url: `http://127.0.0.1:${ settings.remotePort }`,
			token: remoteToken,
			file: REMOTE_FILE_LABEL,
			error: remoteError
		};
	}

	async function syncRemoteServer() {
		const wanted = settings.remoteControl ? settings.remotePort : null;
		if ( remoteServer && remoteServer.teleprompterPort === wanted ) return;
		if ( remoteServer ) {
			await new Promise( r => remoteServer.close( r ) );
			remoteServer = null;
		}
		remoteError = null;
		if ( wanted ) {
			remoteServer = startRemoteServer( {
				port: wanted,
				token: remoteToken,
				routes: remoteRoutes,
				onError: ( err ) => {
					remoteError = err.code === "EADDRINUSE" ? `Port ${ wanted } is already in use` : err.message;
					remoteServer = null;
					win.webContents.send( "remoteInfo", remoteInfo() );
				}
			} );
			remoteServer.teleprompterPort = wanted;
			// Lets a local assistant find the address and token.
			await fs.writeFile( REMOTE_FILE, JSON.stringify( { url: remoteInfo().url, token: remoteToken }, null, 2 ) );
		} else {
			await fs.rm( REMOTE_FILE, { force: true } );
		}
		win.webContents.send( "remoteInfo", remoteInfo() );
	}

	onSettingsChanged = () => syncRemoteServer();
	// Samples are copied into the app's folder first, so editing one never
	// changes the original (which is read-only inside an installed app).
	async function openSample( name ) {
		const sample = SAMPLE_SCRIPTS.find( s => s.file === name );
		if ( !sample ) return null;
		const dir = path.join( app.getPath( "userData" ), "samples" );
		await fs.mkdir( dir, { recursive: true } );
		const copy = path.join( dir, sample.file );
		await fs.copyFile( path.join( __dirname, "samples", sample.file ), copy );
		return openScriptFile( copy );
	}
	openSampleRef = openSample;
	ipcMain.on( "openSample", ( _event, name ) => openSample( name ) );

	ipcMain.on( "getRemoteInfo", () => win.webContents.send( "remoteInfo", remoteInfo() ) );
	ipcMain.on( "getAppInfo", () =>
		win.webContents.send( "appInfo", {
			version: app.getVersion(),
			electron: process.versions.electron,
			platform: process.platform
		} )
	);
	ipcMain.on( "newRemoteToken", async () => {
		remoteToken = newToken();
		await saveState( win );
		if ( remoteServer ) {
			await new Promise( r => remoteServer.close( r ) );
			remoteServer = null;
		}
		await syncRemoteServer();
	} );
	ipcMain.on( "rendererStatus", ( _event, status ) => {
		if ( status && typeof status === "object" ) rendererStatus = status;
	} );
	syncRemoteServer();

	ipcMain.on( "exportSettings", async () => {
		const result = await dialog.showSaveDialog( win, {
			title: "Save settings",
			defaultPath: "teleprompter-settings.json",
			filters: SETTINGS_FILTERS
		} );
		if ( result.canceled || !result.filePath ) return;
		const shareable = { ...settings };
		for ( const key of PROTECTED_SETTINGS ) delete shareable[key];
		const values = {
			...shareable,
			fontSize: currentFontSize,
			opacity: currentOpacity,
			mirrored: currentMirrored,
			voiceResponsiveness: currentAutoScrollSpeed
		};
		try {
			await fs.writeFile(
				result.filePath,
				serializeSettings( values, result.filePath ),
				"utf-8"
			);
			win.webContents.send(
				"notice",
				`Settings saved to ${ path.basename( result.filePath ) }`
			);
		} catch ( err ) {
			dialog.showErrorBox( "Couldn't save the settings", err.message );
		}
	} );

	ipcMain.on( "importSettings", async () => {
		const result = await dialog.showOpenDialog( win, {
			title: "Load settings",
			properties: [ "openFile" ],
			filters: [
				{ name: "Settings (JSON or XML)", extensions: [ "json", "xml" ] },
				...SETTINGS_FILTERS
			]
		} );
		if ( result.canceled ) return;
		const filePath = result.filePaths[0];
		try {
			const values = parseSettings(
				await fs.readFile( filePath, "utf-8" ),
				filePath
			);
			await applySettingValues( values );
			win.webContents.send(
				"notice",
				`Settings loaded from ${ path.basename( filePath ) }`
			);
		} catch ( err ) {
			dialog.showErrorBox( "Couldn't load the settings", err.message );
		}
	} );
	ipcMain.on( "openDroppedFile", ( _event, filePath ) => {
		if ( typeof filePath === "string" && filePath ) openScriptFile( filePath );
	} );
	ipcMain.on( "popupMenu", ( _event, x, y ) => {
		Menu.getApplicationMenu()?.popup( {
			window: win,
			x: Math.round( x ),
			y: Math.round( y )
		} );
	} );

	// Editor IPC handlers
	ipcMain.on( "requestRawMarkdown", async () => {
		if ( currentFilePath && isRichFile( currentFilePath ) ) {
			win.webContents.send( "editorUnavailable", path.basename( currentFilePath ) );
		} else if ( currentFilePath ) {
			const raw = await readRawMarkdown( currentFilePath );
			win.webContents.send( "rawMarkdown", raw, currentFilePath );
		} else {
			win.webContents.send( "rawMarkdown", "", null );
		}
	} );

	async function saveFileAs( content ) {
		const result = await dialog.showSaveDialog( win, {
			defaultPath:
				currentFilePath && !isRichFile( currentFilePath )
					? currentFilePath
					: "untitled.md",
			filters: [
				{ name: "Markdown", extensions: [ "md", "txt" ] },
				{ name: "All Files", extensions: [ "*" ] }
			]
		} );
		if ( !result.canceled && result.filePath ) {
			try {
				await fs.writeFile( result.filePath, content, { encoding: "utf-8" } );
				currentFilePath = result.filePath;
				hasUnsavedChanges = false;
				addRecentFile( result.filePath );
				slots[activeSlot] = { path: result.filePath, scrollY: 0, section: 0 };
				refreshMenus();
				const md = await readAndConvertScript( result.filePath );
				win.webContents.send( "content", md );
				win.webContents.send( "saveResult", true, result.filePath );
				sendSlots();
				await saveState( win );
			} catch ( err ) {
				console.log( "Save As error:", err );
				win.webContents.send( "saveResult", false, null );
			}
		}
	}

	ipcMain.on( "saveFile", async ( _event, content ) => {
		if ( currentFilePath ) {
			try {
				await fs.writeFile( currentFilePath, content, { encoding: "utf-8" } );
				hasUnsavedChanges = false;
				const md = await readAndConvertScript( currentFilePath );
				win.webContents.send( "content", md );
				win.webContents.send( "saveResult", true, currentFilePath );
			} catch ( err ) {
				console.log( "Save error:", err );
				win.webContents.send( "saveResult", false, currentFilePath );
			}
		} else {
			await saveFileAs( content );
		}
	} );

	ipcMain.on( "saveFileAs", async ( _event, content ) => {
		await saveFileAs( content );
	} );

	ipcMain.on( "editorDirty", ( _event, dirty ) => {
		hasUnsavedChanges = dirty;
	} );

	ipcMain.on( "pauseWatcher", () => {
		watcherPaused = true;
	} );

	ipcMain.on( "resumeWatcher", () => {
		watcherPaused = false;
	} );

	ipcMain.on( "previewMarkdown", async ( _event, markdown ) => {
		const html = await convertMarkdown( markdown );
		win.webContents.send( "content", html );
	} );

	ipcMain.on( "reloadContent", async () => {
		if ( currentFilePath ) {
			const md = await readAndConvertScript( currentFilePath );
			if ( md ) {
				win.webContents.send( "content", md );
			}
		}
	} );

	ipcMain.on( "saveAndClose", async () => {
		isClosing = true;
		await saveState( win );
		win.close();
	} );

	ipcMain.on( "getDeepgramKey", () => {
		win.webContents.send( "deepgramKey", {
			key: currentDeepgramApiKey,
			error: currentDeepgramApiKey ? null : "No Deepgram API key saved."
		} );
	} );

	ipcMain.on( "setDeepgramKey", async ( _event, key ) => {
		const trimmed = typeof key === "string" ? key.trim() : "";
		currentDeepgramApiKey = trimmed || null;
		await saveState( win );
		win.webContents.send( "deepgramKeySaved", {
			hasKey: !!currentDeepgramApiKey
		} );
		sendSettings();
	} );

	ipcMain.on( "getAudioDeviceId", () => {
		win.webContents.send( "audioDeviceId", { deviceId: currentAudioDeviceId } );
	} );

	ipcMain.on( "setAudioDeviceId", async ( _event, deviceId ) => {
		const value = typeof deviceId === "string" && deviceId ? deviceId : null;
		currentAudioDeviceId = value;
		await saveState( win );
	} );

	// Settings page IPC
	ipcMain.on( "getSettings", () => {
		sendSettings();
	} );

	ipcMain.on( "setIgnoreMouse", ( _event, ignore ) => {
		if ( settings.clickThrough ) win.setIgnoreMouseEvents( !!ignore, { forward: true } );
	} );

	// Works even when another app has focus, so click-through can always be undone.
	globalShortcut.register( "CommandOrControl+Shift+X", async () => {
		const on = !settings.clickThrough;
		await updateSettings( { clickThrough: on } );
		win.webContents.send(
			"toast",
			on ? "Click-through on · clicks go to the window behind · Ctrl+Shift+X to stop" : "Click-through off"
		);
	} );
	app.on( "will-quit", () => globalShortcut.unregisterAll() );

	ipcMain.on( "saveSettings", async ( _event, partial ) => {
		if ( partial && typeof partial === "object" ) {
			await updateSettings( partial );
		}
	} );

	ipcMain.on( "browseCuesFile", async () => {
		const result = await dialog.showOpenDialog( win, {
			properties: [ "openFile" ],
			filters: [
				{ name: "Cues", extensions: [ "yaml", "yml" ] },
				{ name: "All Files", extensions: [ "*" ] }
			]
		} );
		if ( !result.canceled ) {
			win.webContents.send( "cuesFileChosen", result.filePaths[0] );
		}
	} );

	// On startup, reopen the active slot where the reader left it. With no
	// scripts at all (a first run), open the welcome tour instead.
	win.webContents.once( "did-finish-load", async () => {
		const slot = slots[activeSlot];
		if ( !slots.some( Boolean ) ) {
			await openSample( "welcome.md" );
		} else if ( slot?.path ) {
			const md = await openScriptFile( slot.path, {
				scrollY: slot.scrollY ?? 0,
				section: slot.section ?? 0
			} );
			if ( !md ) {
				slots[activeSlot] = null;
				win.webContents.send( "content", emptySlotHtml( activeSlot ) );
			}
		} else if ( slots.some( Boolean ) ) {
			win.webContents.send( "content", emptySlotHtml( activeSlot ) );
		}
	} );
} );
