import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, screen, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { cpSync, existsSync, readFileSync } from "node:fs";
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
import { setSectionTargets } from "./utils/targets.js";
import { createPad } from "./pad.js";
import { createControl } from "./control.js";
import { createSpeech } from "./speech.js";
import { createGuide } from "./guide.js";
import { createGoogleDocs, GOOGLE_DOC_MESSAGES } from "./google-docs.js";
import { takeLogCsv } from "./client/take-log.js";
import { editPack } from "./client/edit-pack.js";
import { fitInside, keepTopReachable, sameRect } from "./utils/fit.js";
import { isNewer } from "./utils/version.js";
import { startRemoteServer, newToken } from "./remote.js";
import { heardReport } from "./heard-report.js";
import { deleteRecording, listRecordings, readRecording, recordingAudio, recordingPack, updateRecording, zipFiles } from "./recordings.js";
import { startPhoneServer, newPhoneKey, lanAddress } from "./phone.js";
import QRCode from "qrcode";
import {
	serialize as serializeSettings,
	parse as parseSettings,
	pickKnown
} from "./utils/settings-file.js";

const __dirname = import.meta.dirname; // eslint-disable-line n/no-unsupported-features/node-builtins

const MAX_RECENT_FILES = 10;

// Help > User Guide: the pages in docs/guide, in their own window.
const guide = createGuide( { dir: __dirname } );
// Scripts from Google Docs links, kept in the app's folder.
const googleDocs = createGoogleDocs( { dir: app.getPath( "userData" ) } );
ipcMain.on( "openGuide", ( _event, page ) => guide.open( page ) );

// The latest release on GitHub, compared with this version. The releases
// page redirects to the newest release's page, which names its version; it
// has no hourly limit, unlike GitHub's API.
const LATEST_RELEASE = "https://github.com/JoJo-1965/sightline-prompter/releases/latest";

async function latestRelease() {
	const current = app.getVersion();
	try {
		const res = await fetch( LATEST_RELEASE, {
			method: "HEAD",
			redirect: "follow",
			headers: { "User-Agent": `Sightline-Prompter/${ current }` },
			signal: AbortSignal.timeout( 10000 )
		} );
		const latest = res.url.match( /\/tag\/v?([^/?#]+)/ )?.[1];
		if ( !res.ok || !latest ) throw new Error( `GitHub said ${ res.status }` );
		return { current, latest, newer: isNewer( latest, current ), url: res.url };
	} catch ( err ) {
		return { current, error: err.message };
	}
}

// Help > Copy the AI script prompt: the part of docs/AI-SCRIPT-BRIEF.md below
// the first rule, ready to paste into ChatGPT, Claude or Gemini.
async function copyAiPrompt( win ) {
	try {
		const brief = await fs.readFile(
			path.join( __dirname, "..", "docs", "AI-SCRIPT-BRIEF.md" ),
			"utf-8"
		);
		const prompt = brief.replace( /\r\n/g, "\n" ).split( /\n---\n/ ).slice( 1 ).join( "\n---\n" ).trim();
		clipboard.writeText( prompt );
		win?.webContents.send(
			"toast",
			"AI script prompt copied: paste it into ChatGPT, Claude or Gemini, then describe your script"
		);
	} catch ( err ) {
		console.log( "AI prompt:", err.message );
		win?.webContents.send( "toast", "Couldn't copy the AI script prompt" );
	}
}

// Recording settings, edited on the Settings page and persisted as `settings` in app state.
const defaultSettings = {
	scrollMode: "steady", // "steady" (fixed words per minute) or "voice" (follows what you say)
	voiceEngine: "local", // "local" (on this computer) or "deepgram" (online, needs a key)
	voiceCommands: "voice", // "Prompter, pause": "voice" (voice mode), "always" (steady too) or "off"
	wakeWord: "prompter", // prompter, computer, teleprompter or director
	// Settings > Voice > Your words: [{ word: "Moshe", heard: [ "marsha" ] }]
	wordFixes: [],
	scratchAudio: false, // Settings > Scrolling: a scratch audio track for syncing (scratch-audio.js)
	takeLoudness: "voice", // Settings > Scrolling: measure each take's loudness: voice (when the mic is on anyway), always or off (level-meter.js)
	soundCheckDuringTakes: false, // Settings > Voice: keep the sound-check meter on screen while a take runs
	soundAlike: true, // ...and words that sound like script words or commands count as them
	commandWords: [], // ...and your own forms of the wake word and commands: [{ id: "wake", heard: [ … ] }]
	steadyWpm: 140,
	countdown: 3,
	slate: "off", // at the start of each take: "beep" (flash and beep), "flash" or "off"
	directions: "dim", // "dim", "hide" or "normal" for [bracketed] directions
	showReadingMarker: true,
	highlightSentence: true, // light up the sentence you're on (the next to say, in voice mode)
	readingLine: 33, // % from the top of the window
	alwaysOnTop: false,
	checkUpdates: true, // look for a newer release on GitHub when the app starts
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
	headingScale: 1, // section headings, as a share of their usual size next to the text
	textOpacity: 1, // script text only; the controls stay solid
	backingOnAir: 0.07, // backing while on air: nearly see-through (Backing is the level off air)
	textBrightness: 1, // dims the script without making it see-through
	showDirectives: false, // show {directives} as small tags for checking a script
	followScriptPace: true, // steady scrolling uses the script's {wpm} and {target} pace
	focusBand: false, // dim the lines away from the reading line
	focusStrength: 0.6, // how much the far lines are dimmed (0 to 0.9)
	textEffect: "none", // none, outline or shadow
	theme: "default", // default, yellow, contrast or cream
	scriptFont: "default", // default, atkinson, opendyslexic or verdana
	headingFont: "same", // section headings: same as the text, or one of the fonts above
	onAirLight: true, // ON AIR light while scrolling
	showPacing: true, // pacing light: time and pace against the target
	pointsMode: false, // talking points: one section at a time, no scrolling
	takeSummary: true, // per-section summary when a take stops
	startBeep: false, // a short beep when the countdown ends (off: it would be recorded)
	hideFromCapture: false, // keep the window out of screen sharing and recordings
	showPad: false, // the floating control pad (View menu, Ctrl+Shift+P)
	showControl: false, // the control window for the operator screen (Ctrl+Shift+O)
	controlBounds: null, // where the control window was left
	prompterDisplay: null, // monitor id: open the prompter full screen there
	padX: null, // where the pad was left
	padY: null,
	clickThrough: false, // clicks on the script go to the window behind
	textAlign: "left", // "left" or "center"
	showProgress: true,
	controlsPinned: false, // keep the control bar visible instead of auto-hiding it
	remoteControl: false, // AI / script control over http://127.0.0.1 (see remote.js)
	streamDeck: false, // the Stream Deck plugin: buttons only, its own key (stream-deck.json)
	remotePort: 47615,
	remoteDeleteRecordings: false, // the local API may delete recordings (Settings > Remotes)
	phoneRemote: false, // phone remote over the home network (Settings > Phone remote)
	phonePort: 47616
};

// Settings that a settings file or the remote API may not change.
const PROTECTED_SETTINGS = [ "remoteControl", "remotePort", "remoteDeleteRecordings", "streamDeck", "phoneRemote", "phonePort" ];

// Take logs, one per script per day: the recordings library (recordings.js).
const takeLogFolder = () => path.join( app.getPath( "userData" ), "take-logs" );
// The brief for editing agents, the edit pack's README.
async function editPackBrief() {
	try {
		return await fs.readFile( path.join( __dirname, "..", "docs", "EDIT-PACK.md" ), "utf-8" );
	} catch {
		return ""; // the pack is still useful without its brief
	}
}

const SLOT_COUNT = 9;

const defaultConfig = {
	width: 800,
	height: 600,
	fontSize: 3,
	opacity: 1, // off air: an ordinary solid window
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
	{ file: "voice-and-stops.md", label: "Voice control, stops and countdowns" },
	{ file: "batch-module.md", label: "Batch recording, section by section" },
	{ file: "single-take.md", label: "Single continuous take" },
	{ file: "notes.md", label: "Notes, a page at a time" },
	{ file: "talking-points.md", label: "Notes, one section per page" },
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
let streamDeckToken = null; // Settings > Remotes > Stream Deck: buttons only
let phoneKey = null;
let phoneServer = null;
let phoneError = null;
let remoteServer = null;
let remoteError = null;
let rendererStatus = {};
let onSettingsChanged = () => {};
let controlPad = null;
let controlWindow = null;

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
		streamDeckToken,
		phoneKey,
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
		win.setBounds( fitInside( normalBounds, screen.getDisplayMatching( normalBounds ).workArea ) );
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

// When this version was released (package.json "releaseDate"; update it with the version).
function releaseDate() {
	try {
		const pkg = JSON.parse( readFileSync( path.join( __dirname, "..", "package.json" ), "utf8" ) );
		return pkg.releaseDate ?? null;
	} catch {
		return null;
	}
}

// Monitors for the prompter, numbered as Windows numbers them in Display settings.
function displayList() {
	const primary = screen.getPrimaryDisplay().id;
	return screen.getAllDisplays().map( ( d, i ) => ( {
		id: d.id,
		label: `${ i + 1 }: ${ d.label || "Monitor" } · ${ d.size.width }×${ d.size.height }${ d.id === primary ? " (main)" : "" }`
	} ) );
}

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
		frame: false,
		// Installed builds take the icon from the app; running from source needs it here.
		...( app.isPackaged ? {} : { icon: path.join( __dirname, "..", "build", "icon.png" ) } )
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
				setWindowRect( fitInside( preMaxBounds, screen.getDisplayMatching( preMaxBounds ).workArea ) );
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

	// Full screen on the chosen monitor (Settings > Display, or Window > Prompter Monitor).
	// Leaving full screen (F11) gives a normal window on that monitor.
	function placeOnDisplay() {
		const display = screen.getAllDisplays().find( d => d.id === settings.prompterDisplay );
		if ( !display || settings.eyeLine ) return;
		const current = preMaxBounds ?? win.getBounds();
		const area = display.workArea;
		const width = Math.min( current.width, area.width );
		const height = Math.min( current.height, area.height );
		preMaxBounds = {
			x: area.x + Math.round( ( area.width - width ) / 2 ),
			y: area.y + Math.round( ( area.height - height ) / 2 ),
			width,
			height
		};
		windowMode = "fullscreen";
		setWindowRect( display.bounds );
		win.setAlwaysOnTop( true, "screen-saver" );
		sendWindowState();
		refreshMenus();
	}
	ipcMain.on( "getDisplays", () => win.webContents.send( "displays", displayList() ) );
	// Keep the window on screen and its control bar reachable: when it starts,
	// when monitors change, and after it is dragged. Full: shrink and move it
	// fully inside; otherwise only bring the top edge back into view.
	function keepInView( full ) {
		if ( win.isDestroyed() || win.isMinimized() || settings.eyeLine ) return;
		const bounds = win.getBounds();
		const display = screen.getDisplayMatching( bounds );
		let next;
		if ( windowMode === "fullscreen" ) next = display.bounds;
		else if ( windowMode === "maximized" ) next = display.workArea;
		else if ( full ) next = fitInside( bounds, display.workArea );
		else next = keepTopReachable( bounds, display.workArea );
		if ( !sameRect( bounds, next ) ) setWindowRect( next );
	}
	let dragTimer = null;
	win.on( "move", () => {
		clearTimeout( dragTimer );
		dragTimer = setTimeout( () => keepInView( false ), 400 );
	} );
	screen.on( "display-metrics-changed", () => keepInView( true ) );

	for ( const event of [ "display-added", "display-removed" ] ) {
		screen.on( event, () => {
			if ( event === "display-removed" ) setTimeout( () => keepInView( true ), 300 );
			refreshMenus();
			if ( !win.isDestroyed() ) win.webContents.send( "displays", displayList() );
		} );
	}

	async function updateSettings( partial ) {
		const wasEyeLine = settings.eyeLine;
		const moveTo
			= "prompterDisplay" in partial && partial.prompterDisplay !== settings.prompterDisplay;
		const cuesChanged
			= "cuesFile" in partial && partial.cuesFile !== settings.cuesFile;
		settings = { ...settings, ...partial };
		applyWindowSettings( win, wasEyeLine );
		if ( moveTo ) placeOnDisplay();
		else if ( windowMode === "fullscreen" ) win.setAlwaysOnTop( true, "screen-saver" );
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
			refreshGoogleDoc( scriptFile );
			sendTakeLog( scriptFile );
			sendSlots();
			refreshMenus();
			await saveState( win );
		}
		return md;
	}

	// A script from a Google Docs link: fetch the latest version in the
	// background. `announce` (File > Reload from Google Docs) reports the
	// outcome either way; otherwise only an update is mentioned.
	async function refreshGoogleDoc( file, announce = false ) {
		const toast = text => win.webContents.send( "toast", text );
		if ( !( await googleDocs.sourceOf( file ) ) ) {
			if ( announce ) toast( "This script isn't from a Google Docs link" );
			return;
		}
		try {
			const changed = await googleDocs.refresh( file, announce );
			if ( changed && currentFilePath === file ) {
				win.webContents.send( "content", await readAndConvertScript( file ) );
				toast( "Updated from Google Docs" );
			} else if ( announce ) {
				toast( "Already up to date with Google Docs" );
			}
		} catch ( err ) {
			if ( announce ) toast( GOOGLE_DOC_MESSAGES[err.reason] ?? "Couldn't reach Google Docs" );
		}
	}

	// --- Take log (File > Export Take Log) ---
	// One log per script per day, saved as the takes happen, in the app's
	// take-logs folder: "<script> <yyyy-mm-dd>.json".
	const takeLogDir = takeLogFolder();
	const today = () => new Date().toLocaleDateString( "en-CA" ); // yyyy-mm-dd
	const scriptName = file =>
		path.basename( file ?? "Script", path.extname( file ?? "" ) )
			.replace( /[<>:"/\\|?*]/g, "" )
			.trim() || "Script";
	const takeLogFile = file => path.join( takeLogDir, `${ scriptName( file ) } ${ today() }.json` );
	let takeLog = null; // the current script's log, as last saved

	async function sendTakeLog( file ) {
		try {
			takeLog = JSON.parse( await fs.readFile( takeLogFile( file ), "utf-8" ) );
		} catch {
			takeLog = null;
		}
		win.webContents.send( "takeLog", takeLog );
	}

	function withHeader( data ) {
		return {
			app: `Sightline Prompter ${ app.getVersion() }`,
			script: path.basename( currentFilePath ?? "" ),
			date: today(),
			timesAre: "seconds from startedAt; startedAt and endedAt are wall-clock times (UTC)",
			...data
		};
	}

	ipcMain.on( "saveTakeLog", async ( _event, data ) => {
		if ( !currentFilePath || !data?.startedAt ) return;
		try {
			takeLog = withHeader( data );
			await fs.mkdir( takeLogDir, { recursive: true } );
			await fs.writeFile( takeLogFile( currentFilePath ), JSON.stringify( takeLog, null, 2 ) );
		} catch ( err ) {
			console.log( "Take log:", err.message );
		}
	} );

	// Save the take log where you choose, as JSON and a CSV beside it.
	async function exportTakeLog() {
		const toast = text => win.webContents.send( "toast", text );
		if ( !takeLog?.takes?.length ) {
			toast( "No takes logged yet for this script today" );
			return;
		}
		const result = await dialog.showSaveDialog( win, {
			title: "Export take log",
			defaultPath: `${ scriptName( currentFilePath ) } take log ${ today() }.json`,
			filters: [ { name: "Take log (JSON, with a CSV beside it)", extensions: [ "json" ] } ]
		} );
		if ( result.canceled || !result.filePath ) return;
		const json = result.filePath.replace( /\.json$/i, "" ) + ".json";
		const csv = json.replace( /\.json$/i, ".csv" );
		try {
			await fs.writeFile( json, JSON.stringify( takeLog, null, 2 ) );
			await fs.writeFile( csv, takeLogCsv( takeLog ) );
			toast( `Take log saved: ${ path.basename( json ) } and .csv` );
		} catch ( err ) {
			console.log( "Take log export:", err.message );
			toast( "Couldn't save the take log" );
		}
	}

	// The edit pack: the take log, word timings, sentences, edit marks and
	// captions in one new folder, with the brief for editing agents as its
	// README (docs/EDIT-PACK.md).
	async function exportEditPack() {
		const toast = text => win.webContents.send( "toast", text );
		if ( !takeLog?.takes?.length ) {
			toast( "No takes logged yet for this script today" );
			return;
		}
		const result = await dialog.showOpenDialog( win, {
			title: "Choose where to save the edit pack",
			buttonLabel: "Save the edit pack here",
			properties: [ "openDirectory", "createDirectory" ]
		} );
		if ( result.canceled || !result.filePaths?.[0] ) return;
		const name = `${ scriptName( currentFilePath ) } edit pack ${ takeLog.date ?? today() }`;
		let folder = path.join( result.filePaths[0], name );
		for ( let n = 2; existsSync( folder ); n++ ) folder = path.join( result.filePaths[0], `${ name } (${ n })` );
		try {
			await fs.mkdir( folder, { recursive: true } );
			for ( const [ file, contents ] of Object.entries( editPack( takeLog, await editPackBrief() ) ) ) {
				await fs.writeFile( path.join( folder, file ), contents );
			}
			await copyScratchAudio( takeLog, folder );
			toast( `Edit pack saved: ${ path.basename( folder ) }` );
			shell.openPath( folder );
		} catch ( err ) {
			console.log( "Edit pack:", err.message );
			toast( "Couldn't save the edit pack" );
		}
	}

	// The heard log: everything voice scrolling heard, next to the script words
	// it was matched with, one line per chunk, per script per day, in the
	// heard-logs folder. Used to find words it keeps mishearing (roadmap 20).
	const heardLogDir = path.join( app.getPath( "userData" ), "heard-logs" );
	let heardQueue = Promise.resolve();
	ipcMain.on( "appendHeardLog", ( _event, entry ) => {
		if ( !currentFilePath || !entry || typeof entry.heard !== "string" ) return;
		const line = JSON.stringify( {
			t: new Date().toISOString(),
			heard: entry.heard.slice( 0, 500 ),
			final: !!entry.final,
			from: entry.from,
			to: entry.to,
			script: String( entry.script ?? "" ).slice( 0, 500 )
		} ) + "\n";
		const file = path.join( heardLogDir, `${ scriptName( currentFilePath ) } ${ today() }.jsonl` );
		heardQueue = heardQueue
			.then( () => fs.mkdir( heardLogDir, { recursive: true } ) )
			.then( () => fs.appendFile( file, line ) )
			.catch( err => console.log( "Heard log:", err.message ) );
	} );

	// Scratch audio for syncing: one file per run, in the scratch-audio folder
	// beside the take logs, named like the take log with the time.
	// WAV (16-bit mono PCM), written as the blocks arrive; the header's sizes
	// are brought up to date every few seconds and at the end.
	const scratchDir = path.join( takeLogDir, "..", "scratch-audio" );
	let scratch = null; // { handle, file, rate, bytes, queue, sinceHeader }
	const wavHeader = ( rate, bytes ) => {
		const h = Buffer.alloc( 44 );
		h.write( "RIFF", 0 );
		h.writeUInt32LE( 36 + bytes, 4 );
		h.write( "WAVEfmt ", 8 );
		h.writeUInt32LE( 16, 16 );
		h.writeUInt16LE( 1, 20 ); // PCM
		h.writeUInt16LE( 1, 22 ); // mono
		h.writeUInt32LE( rate, 24 );
		h.writeUInt32LE( rate * 2, 28 );
		h.writeUInt16LE( 2, 32 );
		h.writeUInt16LE( 16, 34 );
		h.write( "data", 36 );
		h.writeUInt32LE( bytes, 40 );
		return h;
	};
	ipcMain.handle( "scratchAudioStart", async ( _event, { sampleRate = 16000 } = {} ) => {
		if ( scratch || !currentFilePath ) return null;
		const time = new Date().toTimeString().slice( 0, 8 ).replace( /:/g, "" );
		const file = `${ scriptName( currentFilePath ) } ${ today() } ${ time }.wav`;
		await fs.mkdir( scratchDir, { recursive: true } );
		const handle = await fs.open( path.join( scratchDir, file ), "w" );
		await handle.write( wavHeader( sampleRate, 0 ), 0, 44, 0 );
		scratch = { handle, file, rate: sampleRate, bytes: 0, queue: Promise.resolve(), sinceHeader: 0 };
		return file;
	} );
	ipcMain.on( "scratchAudioData", ( _event, data ) => {
		const s = scratch;
		if ( !s || !( data instanceof ArrayBuffer || ArrayBuffer.isView( data ) ) ) return;
		const chunk = Buffer.from( data instanceof ArrayBuffer ? data : data.buffer );
		s.queue = s.queue.then( async () => {
			await s.handle.write( chunk, 0, chunk.length, 44 + s.bytes );
			s.bytes += chunk.length;
			s.sinceHeader += chunk.length;
			if ( s.sinceHeader >= s.rate * 2 * 5 ) {
				s.sinceHeader = 0;
				await s.handle.write( wavHeader( s.rate, s.bytes ), 0, 44, 0 );
			}
		} ).catch( err => console.log( "Scratch audio:", err.message ) );
	} );
	ipcMain.handle( "scratchAudioStop", async ( _event, { keep = true } = {} ) => {
		const s = scratch;
		scratch = null;
		if ( !s ) return null;
		await s.queue;
		await s.handle.write( wavHeader( s.rate, s.bytes ), 0, 44, 0 );
		await s.handle.close();
		if ( !keep || !s.bytes ) {
			await fs.rm( path.join( scratchDir, s.file ), { force: true } );
			return null;
		}
		return { file: s.file, samples: s.bytes / 2 };
	} );
	// Copy a log's scratch audio into an edit pack folder.
	async function copyScratchAudio( log, folder ) {
		const files = ( log?.audio ?? [] ).map( a => a.file ).filter( f => typeof f === "string" && !/[\\/]/.test( f ) );
		if ( !files.length ) return;
		await fs.mkdir( path.join( folder, "scratch-audio" ), { recursive: true } );
		for ( const file of files ) {
			await fs.copyFile( path.join( scratchDir, file ), path.join( folder, "scratch-audio", file ) ).catch( () => {} );
		}
	}

	// Settings > Voice > Your words > Suggest: what every heard log says it
	// misheard more than once, most often first.
	ipcMain.handle( "heardSuggestions", async () => {
		let files;
		try {
			files = ( await fs.readdir( heardLogDir ) ).filter( f => f.endsWith( ".jsonl" ) );
		} catch {
			return { logs: 0, suggestions: [] };
		}
		const lines = [];
		for ( const file of files ) {
			lines.push( ...( await fs.readFile( path.join( heardLogDir, file ), "utf-8" ) ).split( "\n" ) );
		}
		const report = heardReport( lines );
		const suggestions = report.misheard
			.filter( m => m.count >= 2 )
			.map( ( { pair, count } ) => {
				const [ heard, word ] = pair.split( " → " );
				return { heard, word, count };
			} )
			// Half a word ("set" for "setting") is the engine catching up, not a mishearing.
			.filter( ( { heard, word } ) => !word.startsWith( heard ) && !heard.startsWith( word ) )
			.slice( 0, 20 );
		return { logs: files.length, words: report.words, suggestions };
	} );

	ipcMain.on( "exportTakeLog", () => exportTakeLog() );
	ipcMain.on( "exportEditPack", () => exportEditPack() );

	// Start afresh: today's log is kept under a new name with the time.
	async function newTakeLog() {
		if ( !currentFilePath ) return;
		const file = takeLogFile( currentFilePath );
		const stamp = new Date().toTimeString().slice( 0, 5 ).replace( ":", "" );
		try {
			await fs.rename( file, file.replace( /\.json$/, ` ${ stamp }.json` ) );
		} catch {
			// nothing logged yet
		}
		takeLog = null;
		win.webContents.send( "takeLog", null );
		win.webContents.send( "toast", "New take log started. Take numbers start again at 1" );
	}

	// --- Recordings (File > Recordings): every take log, see recordings.js ---
	const recordingName = r => r.title ?? r.id;

	async function exportRecording( id, asZip ) {
		const files = await recordingPack( takeLogDir, id, await editPackBrief() );
		for ( const a of await recordingAudio( takeLogDir, id ) ) files[`scratch-audio/${ a.file }`] = await fs.readFile( a.path );
		const name = `${ ( await readRecording( takeLogDir, id ) ).title ?? id } edit pack`.replace( /[<>:"/\\|?*]/g, "" );
		if ( asZip ) {
			const result = await dialog.showSaveDialog( win, {
				title: "Export the edit pack as a zip",
				defaultPath: `${ name }.zip`,
				filters: [ { name: "Zip", extensions: [ "zip" ] } ]
			} );
			if ( result.canceled || !result.filePath ) return null;
			await fs.writeFile( result.filePath, zipFiles( files ) );
			shell.showItemInFolder( result.filePath );
			return path.basename( result.filePath );
		}
		const result = await dialog.showOpenDialog( win, {
			title: "Choose where to save the edit pack",
			buttonLabel: "Save the edit pack here",
			properties: [ "openDirectory", "createDirectory" ]
		} );
		if ( result.canceled || !result.filePaths?.[0] ) return null;
		let folder = path.join( result.filePaths[0], name );
		for ( let n = 2; existsSync( folder ); n++ ) folder = path.join( result.filePaths[0], `${ name } (${ n })` );
		await fs.mkdir( folder, { recursive: true } );
		for ( const [ file, contents ] of Object.entries( files ) ) {
			await fs.writeFile( path.join( folder, file ), contents );
		}
		shell.openPath( folder );
		return path.basename( folder );
	}

	// The id of the log being written now, if a script is open.
	const currentLogId = () => ( currentFilePath ? path.basename( takeLogFile( currentFilePath ), ".json" ) : null );

	ipcMain.handle( "recordings", async ( _event, action, args = {} ) => {
		switch ( action ) {
			case "list":
				return { list: await listRecordings( takeLogDir ), current: currentLogId() };
			case "read": {
				return readRecording( takeLogDir, args.id );
			}
			case "update":
				return updateRecording( takeLogDir, args.id, args.changes ?? {} );
			case "delete": {
				const r = await readRecording( takeLogDir, args.id );
				const { response } = await dialog.showMessageBox( win, {
					type: "warning",
					buttons: [ "Delete", "Cancel" ],
					defaultId: 1,
					cancelId: 1,
					message: `Delete "${ recordingName( r ) }"?`,
					detail: `Its take log (${ r.takes } take${ r.takes === 1 ? "" : "s" }) and any scratch audio go to the Recycle Bin, so you can get them back from there. Your own video and audio recordings aren't touched.`
				} );
				if ( response !== 0 ) return { ok: false };
				const current = currentLogId() === args.id;
				await deleteRecording( takeLogDir, args.id, file => shell.trashItem( file ) );
				if ( current ) {
					takeLog = null;
					win.webContents.send( "takeLog", null );
				}
				return { ok: true };
			}
			case "export":
				return { saved: await exportRecording( args.id, !!args.zip ) };
			case "newLog":
				await newTakeLog();
				return { ok: true };
			case "folder":
				await fs.mkdir( takeLogDir, { recursive: true } );
				shell.openPath( takeLogDir );
				return { ok: true };
			default:
				throw new Error( "Unknown action" );
		}
	} );

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
			openGoogleDoc: () => win.webContents.send( "showGoogleDocDialog" ),
			copyAiPrompt: () => copyAiPrompt( win ),
			exportEditPack: () => exportEditPack(),
			showRecordings: () => win.webContents.send( "showRecordings" ),
			reloadGoogleDoc: () => refreshGoogleDoc( currentFilePath, true ),
			openGuide: page => guide.open( page ),
			isMaximized: windowMode === "maximized",
			displays: displayList()
		} );
	refreshMenus();
	applyWindowSettings( win, false );
	if ( settings.prompterDisplay != null ) placeOnDisplay();
	else keepInView( true );

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

// One Sightline at a time: starting it again brings the open one to the front.
// (The lock belongs to the settings folder, so a copy run with its own
// --user-data-dir, as the screenshot and test scripts do, still starts.)
const firstInstance = app.requestSingleInstanceLock();
let mainWindow = null;
if ( !firstInstance ) {
	app.quit();
} else {
	app.on( "second-instance", () => {
		if ( !mainWindow || mainWindow.isDestroyed() ) return;
		if ( mainWindow.isMinimized() ) mainWindow.restore();
		mainWindow.show();
		mainWindow.focus();
	} );
}

app.whenReady().then( async () => {
	if ( !firstInstance ) return;
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
	streamDeckToken = state.streamDeckToken || newToken();
	phoneKey = state.phoneKey || newPhoneKey();
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
		controlPad?.refreshMirror();
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
	mainWindow = win;

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
			opacity: 1,
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
			controlPad?.refreshMirror();
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
		"marker",
		"keeper",
		"scrap",
		"back-to-marker",
		"help",
		// For buttons (the Stream Deck plugin): toggles and steps.
		"on-air",
		"mirror",
		"mirror-h",
		"mirror-v",
		"bigger",
		"smaller",
		"layout",
		"reading",
		"recording",
		"eye-line",
		"click-through",
		"scroll", // value: lines, + down or - up
		"backing" // value: steps of 5%, + or -
	];

	// The prompter's state, for GET /status and the GET /events stream.
	const remoteStatus = () => ( {
		file: currentFilePath,
		slot: activeSlot + 1,
		slots: slots.map( ( s, i ) => ( { slot: i + 1, file: s?.path ?? null } ) ),
		scrollMode: settings.scrollMode,
		steadyWpm: settings.steadyWpm,
		fontSize: currentFontSize,
		opacity: currentOpacity,
		mirrored: currentMirrored,
		eyeLine: settings.eyeLine,
		clickThrough: !!settings.clickThrough,
		windowMode,
		...rendererStatus,
		commands: REMOTE_COMMANDS
	} );
	const remoteListeners = new Set();
	let lastPublished = "";
	// Tell every listener when something they can show has changed.
	function publishRemoteState() {
		if ( !remoteListeners.size ) return;
		const state = remoteStatus();
		const text = JSON.stringify( state );
		if ( text === lastPublished ) return;
		lastPublished = text;
		for ( const send of remoteListeners ) send( state );
	}
	const remoteEvents = {
		subscribe( send ) {
			remoteListeners.add( send );
			send( remoteStatus() );
			return () => remoteListeners.delete( send );
		}
	};

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
		"GET /status": remoteStatus,
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
		// The recordings library: see recordings.js and docs/EDIT-PACK.md.
		"GET /recordings": async () => ( { recordings: await listRecordings( takeLogFolder() ) } ),
		"GET /recording": async ( { id } ) => {
			return readRecording( takeLogFolder(), id );
		},
		"GET /recording/pack": async ( { id } ) => ( {
			id,
			files: await recordingPack( takeLogFolder(), id, await editPackBrief() ),
			// Scratch audio stays a file: where it is, and its place on the clock.
			audio: await recordingAudio( takeLogFolder(), id )
		} ),
		"POST /recording/update": ( { id, title, note, processed } ) => {
			const changes = {};
			if ( title !== undefined ) changes.title = title;
			if ( note !== undefined ) changes.note = note;
			if ( processed !== undefined ) changes.processed = processed;
			return updateRecording( takeLogFolder(), id, changes );
		},
		"POST /recording/delete": async ( { id } ) => {
			if ( !settings.remoteDeleteRecordings ) {
				throw Object.assign( new Error( "Deleting recordings isn't allowed. In the app: Settings > Remotes > tick \"Let it delete recordings\"" ), { status: 403 } );
			}
			const result = await deleteRecording( takeLogFolder(), id, file => shell.trashItem( file ) );
			win.webContents.send( "recordingsChanged", id );
			return result;
		},
		"POST /window": async ( { action } ) => {
			if ( ![ "minimize", "maximize", "fullscreen" ].includes( action ) ) {
				throw new Error( "action must be minimize, maximize or fullscreen" );
			}
			await windowControl( action );
			return { ok: true, windowMode };
		}
	};

	// The Stream Deck plugin's key: the state, the live stream, the commands
	// and the slots, nothing else (no scripts, settings or recordings).
	const STREAM_DECK_FILE = path.join( app.getPath( "userData" ), "stream-deck.json" );
	const BUTTON_ROUTES = new Set( [ "GET /status", "POST /command", "POST /slot" ] );
	// Close the server now: open event streams (the Stream Deck) would otherwise keep it waiting.
	const closeServer = server => new Promise( ( r ) => {
		server.close( r );
		server.closeAllConnections();
	} );

	function remoteInfo() {
		return {
			enabled: !!settings.remoteControl,
			streamDeck: !!settings.streamDeck,
			running: !!remoteServer,
			url: `http://127.0.0.1:${ settings.remotePort }`,
			token: remoteToken,
			file: REMOTE_FILE_LABEL,
			error: remoteError
		};
	}

	async function syncRemoteServer() {
		const on = settings.remoteControl || settings.streamDeck;
		const wanted = on ? settings.remotePort : null;
		// Restart when the port or which keys work changes.
		const keys = `${ wanted }|${ !!settings.remoteControl }|${ !!settings.streamDeck }`;
		if ( remoteServer && remoteServer.teleprompterKeys === keys ) return;
		if ( remoteServer ) {
			await closeServer( remoteServer );
			remoteServer = null;
		}
		remoteError = null;
		if ( wanted ) {
			remoteServer = startRemoteServer( {
				port: wanted,
				token: settings.remoteControl ? remoteToken : null,
				buttonToken: settings.streamDeck ? streamDeckToken : null,
				buttonRoutes: BUTTON_ROUTES,
				routes: remoteRoutes,
				events: remoteEvents,
				onError: ( err ) => {
					remoteError = err.code === "EADDRINUSE" ? `Port ${ wanted } is already in use` : err.message;
					remoteServer = null;
					win.webContents.send( "remoteInfo", remoteInfo() );
				}
			} );
			remoteServer.teleprompterKeys = keys;
		}
		// Lets a local assistant, or the Stream Deck plugin, find the address and its key.
		const url = remoteInfo().url;
		if ( wanted && settings.remoteControl ) await fs.writeFile( REMOTE_FILE, JSON.stringify( { url, token: remoteToken }, null, 2 ) );
		else await fs.rm( REMOTE_FILE, { force: true } );
		if ( wanted && settings.streamDeck ) await fs.writeFile( STREAM_DECK_FILE, JSON.stringify( { url, token: streamDeckToken }, null, 2 ) );
		else await fs.rm( STREAM_DECK_FILE, { force: true } );
		win.webContents.send( "remoteInfo", remoteInfo() );
	}

	controlPad = createPad( {
		dir: __dirname,
		prompter: win,
		getMirror: () => currentMirrored,
		getSettings: () => settings,
		saveSettings: partial => updateSettings( partial )
	} );
	controlPad.apply();
	createSpeech( { dir: __dirname, win } );
	ipcMain.on( "copyAiPrompt", () => copyAiPrompt( win ) );

	ipcMain.on( "openGoogleDoc", async ( _event, link ) => {
		try {
			const { file, title } = await googleDocs.open( link );
			if ( await openScriptFile( file ) ) {
				win.webContents.send( "googleDocResult", { ok: true } );
				win.webContents.send( "toast", `Opened “${ title }” from Google Docs` );
			} else {
				win.webContents.send( "googleDocResult", { ok: true } );
			}
		} catch ( err ) {
			console.log( "Google Docs:", err.message );
			win.webContents.send( "googleDocResult", {
				ok: false,
				message: GOOGLE_DOC_MESSAGES[err.reason] ?? "Couldn't open that doc"
			} );
		}
	} );
	win.on( "closed", () => guide.close() );
	controlWindow = createControl( {
		dir: __dirname,
		prompter: win,
		getSettings: () => settings,
		saveSettings: partial => updateSettings( partial ),
		// Moving the window only needs saving, not a full settings update.
		saveBounds: ( bounds ) => {
			settings.controlBounds = bounds;
			saveState( win );
		}
	} );
	controlWindow.apply();
	// --- Phone remote ---
	async function phoneInfo() {
		const address = lanAddress();
		const url = address ? `http://${ address }:${ settings.phonePort }/?k=${ phoneKey }` : null;
		const running = !!phoneServer;
		return {
			enabled: !!settings.phoneRemote,
			running,
			url: running ? url : null,
			qr: running && url ? await QRCode.toDataURL( url, { margin: 1, width: 240 } ) : null,
			error: phoneError ?? ( settings.phoneRemote && !address ? "No network connection found" : null )
		};
	}
	const sendPhoneInfo = async () => win.webContents.send( "phoneInfo", await phoneInfo() );

	async function syncPhoneServer( restart = false ) {
		const wanted = settings.phoneRemote ? settings.phonePort : null;
		if ( !restart && phoneServer?.phonePort === wanted && phoneServer ) return;
		if ( !restart && !phoneServer && !wanted ) return;
		if ( phoneServer ) {
			phoneServer.closeAllConnections?.();
			await new Promise( r => phoneServer.close( r ) );
			phoneServer = null;
		}
		phoneError = null;
		if ( wanted ) {
			phoneServer = startPhoneServer( {
				port: wanted,
				key: phoneKey,
				pagePath: path.join( __dirname, "client", "phone.html" ),
				getStatus: () => ( {
					scrolling: !!rendererStatus.scrolling,
					editing: !!rendererStatus.editing,
					points: !!rendererStatus.points,
					sectionTitle: rendererStatus.sectionTitle ?? "",
					progress: rendererStatus.progress ?? ""
				} ),
				onCommand: action => win.webContents.send( "remoteCommand", action ),
				onError: ( err ) => {
					phoneError = err.code === "EADDRINUSE" ? `Port ${ wanted } is already in use` : err.message;
					phoneServer = null;
					sendPhoneInfo();
				}
			} );
			phoneServer.phonePort = wanted;
		}
		await sendPhoneInfo();
	}
	ipcMain.on( "getPhoneInfo", () => sendPhoneInfo() );
	ipcMain.on( "newPhoneKey", async () => {
		phoneKey = newPhoneKey();
		await saveState( win );
		await syncPhoneServer( true );
	} );
	syncPhoneServer();

	onSettingsChanged = () => {
		syncRemoteServer();
		syncPhoneServer();
		controlPad.apply();
		controlWindow.apply();
	};
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
			releaseDate: releaseDate(),
			electron: process.versions.electron,
			platform: process.platform
		} )
	);
	// Settings > About > Check for updates, and a quiet check at start-up:
	// asks GitHub for the latest release and says if it's newer. Nothing is
	// downloaded, and nothing is sent but the request itself.
	ipcMain.on( "checkForUpdates", async ( _event, { quiet = false } = {} ) => {
		win.webContents.send( "updateInfo", { quiet, ...await latestRelease() } );
	} );
	setTimeout( () => {
		if ( settings.checkUpdates === false ) return;
		latestRelease().then( ( info ) => {
			if ( info.newer && win && !win.isDestroyed() ) win.webContents.send( "updateInfo", { quiet: true, ...info } );
		} );
	}, 8000 );

	ipcMain.on( "newRemoteToken", async () => {
		remoteToken = newToken();
		await saveState( win );
		if ( remoteServer ) {
			await closeServer( remoteServer );
			remoteServer = null;
		}
		await syncRemoteServer();
	} );
	ipcMain.on( "rendererStatus", ( _event, status ) => {
		if ( status && typeof status === "object" ) rendererStatus = status;
		controlPad?.sendStatus( rendererStatus );
		// The control window shows the broadcast settings too (size, mirror…).
		controlWindow?.sendStatus( remoteStatus() );
		publishRemoteState();
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
			const kind = ( await googleDocs.sourceOf( currentFilePath ) )
				? "google"
				: path.extname( currentFilePath ).toLowerCase() === ".pdf" ? "pdf" : "rich";
			win.webContents.send( "editorUnavailable", path.basename( currentFilePath ), kind );
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

	// Rehearsal timer: write a practice run's section times into the script.
	ipcMain.on( "applySectionTargets", async ( _event, targets ) => {
		const toast = text => win.webContents.send( "toast", text );
		if ( !currentFilePath ) return toast( "Save the script first, then try again" );
		if ( isRichFile( currentFilePath ) ) {
			return toast( "Targets can only be written into .md and .txt scripts" );
		}
		if ( hasUnsavedChanges ) return toast( "Save or discard your edits first" );
		try {
			const raw = await fs.readFile( currentFilePath, "utf-8" );
			const { text, changed } = setSectionTargets( raw, targets ?? {} );
			if ( !changed ) return toast( "No sections to update" );
			await fs.writeFile( currentFilePath, text, "utf-8" );
			win.webContents.send( "content", await readAndConvertScript( currentFilePath ) );
			toast( `Targets saved for ${ changed } section${ changed === 1 ? "" : "s" }` );
		} catch ( err ) {
			console.log( "Targets error:", err );
			toast( "Couldn't save the targets" );
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
