import {
	startAutoScroll,
	stopAutoScroll,
	scrollToWord,
	cancelScroll,
	setScrollSpeed,
	SCROLL_SPEED_MIN,
	SCROLL_SPEED_MAX,
	SCROLL_SPEED_DEFAULT,
	SCROLL_SPEED_STEP
} from "./auto-scroll.js";
import {
	setReadingAnchor,
	getReadingAnchor,
	buildWordIndex
} from "./word-index.js";
import { helpTabs, voiceHelpTabs, renderHelpTabs } from "./help-tabs.js";
import { createPadSettings } from "./pad-settings.js";
import { createMappingSettings } from "./mapping-settings.js";
import { keyInput, normaliseMappings, mappedAction, createButtonEdges } from "./input-mappings.js";
import { controlAction, controlView } from "./control-actions.js";
import { createComponentSettings } from "./component-settings.js";
import { createComponentAvailability } from "./component-availability.js";
import { healthSections } from "./health-script-dom.js";
import { scriptHealth } from "./script-health.js";
import { rehearsalCoach } from "./rehearsal-coach.js";
import { createScriptReview } from "./script-review.js";
import { createWorkflow } from "./workflow.js";
import { createObsSetupUi } from "./obs-setup-ui.js";
import {
	startSteadyScroll,
	stopSteadyScroll,
	isRunning as isSteadyRunning,
	setWpm,
	getWpm,
	recalculate as recalculateSteady,
	setLocalPxPerWord,
	WPM_STEP
} from "./steady-scroll.js";
import { decorateScript } from "./decorate.js";
import { setProductionNotesActive } from "./production-notes.js";
import { readDirectives, parseDirective, parseDuration } from "./directives.js";
import { createTakeLog } from "./take-log.js";
import { COMMANDS, wakeLabel } from "./voice-commands.js";
import { heardForms, normalizeWord } from "./word-fixes.js";
import { createScratchRecorder } from "./scratch-audio.js";
import { createLevelMeter, soundCheckVerdict } from "./level-meter.js";
import { SUPPORT_URL } from "./links.js";
import { createObsUi } from "./obs-ui.js";
import { createRecordingLink } from "./recording-link.js";
import { createSettingsNavigation } from "./settings-navigation.js";
import { addSettingsHelp, createSettingsPages } from "./settings-pages.js";
import { uiElement, showPanelWindow, hidePanelWindow } from "./panel-windows.js";
import {
	indexSentences,
	scriptSentences,
	setSentenceHighlight,
	clearSentence,
	showSentenceAt,
	showSentenceAtReadingLine
} from "./sentence-highlight.js";

let scriptIndex = 0;

// State shared by the directive, pacing, talking-points and display code
// further down. Declared here so nothing can use it before it exists.
let scriptDirectives = {
	script: {},
	sections: [],
	pauses: [],
	markers: [],
	paceChanges: [],
	listenOns: [],
	prompterCommands: []
};
let directivePoints = {
	pauses: [],
	markers: [],
	paceChanges: [],
	listenOns: [],
	prompterCommands: [],
	sections: [],
	wordTops: []
};
let liveMarkers = []; // markers dropped with B during this session
let cuePaused = false;
let lastReadingY = null;
let appliedPace = null;
let pointsIndex = 0;
let pointsRunning = false;
let pacing = null; // { mode, total, sectionIndex, sectionTime, lastTick }
let takeLog = new Map(); // section index -> result
let controlOpen = false; // the control window is showing a copy of the script
const pacingEl = uiElement( "pacing" );
const summaryModal = uiElement( "take-summary" );
let headGuideState = null;
window.electron.onHeadGuideState( ( value ) => {
	headGuideState = value;
	const restore = uiElement( "guide-controls" );
	restore?.classList.toggle( "hidden", !value.shown );
	restore?.setAttribute( "aria-pressed", String( value.controlsShown ) );
} );
// Every take of every section, for the edit (File > Export Take Log), each
// with its section's sentences for the edit pack.
const recording = createTakeLog( {
	sentences: scriptSentences,
	loudness: ( from, to ) => levelMeter.measure( from, to ),
	onTake: takeLogged,
	snapshot: () => recordingScriptSnapshot(),
	obsState: () => obsUi.state(),
	guideState: () => headGuideState
		? { ...headGuideState, pose: { x: headGuideState.x, y: headGuideState.y, scale: headGuideState.scale, width: headGuideState.width, height: headGuideState.height, top: headGuideState.top, bottom: headGuideState.bottom, left: headGuideState.left, right: headGuideState.right } }
		: ( {
			shown: !!settings.showHeadGuide, fullscreen: !!settings.headGuideFullscreen,
			chromeless: !!settings.headGuideChromeless, bounds: settings.headGuideBounds,
			pose: { x: settings.headGuideX, y: settings.headGuideY, scale: settings.headGuideScale, width: settings.headGuideWidth ?? 1, height: settings.headGuideHeight ?? 1, top: settings.headGuideTop ?? 1, bottom: settings.headGuideBottom ?? 1, left: settings.headGuideLeft ?? 1, right: settings.headGuideRight ?? 1 },
			background: settings.headGuideBackground ?? 0.12,
			eyesLocked: settings.headGuideEyesLocked === true,
			ideal: settings.headGuideIdeal, showIdeal: settings.headGuideShowIdeal !== false,
			captureStatus: "Separate protected overlay; actual OBS capture route requires verification"
		} ),
	onOpen: ( index, title, take ) => obsUi.chapter( `Section ${ index + 1 } · Take ${ take } · ${ title }` ),
	onMarker: label => obsUi.chapter( label || "Sightline marker" )
} );
const obsUi = createObsUi( {
	getSettings: () => settings,
	canStart: () => !isEditMode && !isScrolling() && !autoScrollStarting && !slating && !pointsRunning && !!md.textContent.trim() && ( pointsMode() || settings.scrollMode !== "voice" || ( usesLocalVoice() ? speechModel.installed && !speechModel.downloading && !modelMaintenance : settings.hasDeepgramKey ) ),
	onStart: () => runRemoteAction( "play" ),
	onFinish: () => {
		stopSteadySession();
		stopAutoScrollSession();
		if ( pointsRunning ) togglePoints();
		feedTakeLog( false );
	},
	onChange: () => sendStatus(),
	toast: text => showToast( text, 4500 )
} );
const linkedRecording = createRecordingLink( { getSettings: () => settings, getState: () => obsUi.state(), command: action => obsUi.action( action, { prompt: false } ) } );
let recordingSaved = 0; // the take log version last sent to be saved
let recordingY = null; // reading line at the last tick, to see the text move on
let pendingJumpReason = null; // "again" when a jump is a voice retake
const onAirEl = uiElement( "on-air" );
const THEMES = [ "default", "yellow", "contrast", "cream" ];
const FONTS = [ "default", "atkinson", "opendyslexic", "verdana" ];
const EFFECTS = [ "none", "outline", "shadow" ];
const md = uiElement( "md" );

// Recording settings (from main; edited on the Settings page).
let settings = {
	scrollMode: "steady",
	steadyWpm: 140,
	countdown: 3,
	directions: "dim",
	showReadingMarker: true,
	readingLine: 33,
	highlightCues: true,
	eyeLine: false,
	eyeLineReadingLine: 15,
	hasDeepgramKey: false
};
let syncPadSettings = () => {};
let mappingSettings = null;
let componentSettings = null;
let componentAvailability = null;
let componentStatus = null;
let phoneStatus = null;
let workflow = null;
let obsSetupUi = null;
let modelMaintenance = false;
let scriptReview = null;
let reviewedRecording = null;
let cuePhrases = [];
let lastScriptHtml = null;
let sourceSnapshot = null;
let recordingSnapshotCache = null;
function recordingScriptSnapshot() {
	const sections = [ ...md.querySelectorAll( "h2" ) ].map( ( el, i ) => ( { section: i + 1, id: el.id || String( i + 1 ), title: el.textContent } ) );
	const key = JSON.stringify( { source: sourceSnapshot?.id, html: lastScriptHtml, cues: cuePhrases, sections } );
	if ( recordingSnapshotCache?.key === key ) return recordingSnapshotCache.value;
	const value = { ...sourceSnapshot, id: crypto.randomUUID(), html: lastScriptHtml ?? "", renderedHtml: md.innerHTML, capturedAt: new Date().toISOString(), sections, cuePhrases: [ ...cuePhrases ] };
	recordingSnapshotCache = { key, value };
	return value;
}

function renderScript( html ) {
	md.innerHTML = html;
	decorateScript( md, { cuePhrases, highlight: settings.highlightCues } );
	// A comments-only paragraph has no body-text line box holding it open.
	for ( const paragraph of md.querySelectorAll( "p" ) ) {
		const onlyComments = [ ...paragraph.childNodes ].every( node =>
			node.nodeType === Node.TEXT_NODE ? !node.textContent.trim() : node.nodeType === Node.ELEMENT_NODE && node.matches( ".direction" )
		);
		paragraph.classList.toggle( "direction-only", onlyComments && !!paragraph.querySelector( ".direction" ) );
	}
	scriptDirectives = readDirectives( md );
	liveMarkers = [];
	tagSections();
	applyPointsView();
	sendPreviewContent();
	indexSentences( md );
	updateSentence();
	requestAnimationFrame( () => updateReadingMarker() );
}

// The sentence highlight (Settings > Display). Voice scrolling moves it as you
// speak (handleAutoScrollPosition); otherwise it follows the reading line.
function updateSentence() {
	if ( settings.highlightSentence === false || isEditMode || pointsMode() ) {
		clearSentence();
	} else if ( !autoScrollActive ) {
		showSentenceAtReadingLine();
	}
}

let sentenceFrame = 0;
window.addEventListener(
	"scroll",
	() => {
		if ( sentenceFrame ) return;
		sentenceFrame = requestAnimationFrame( () => {
			sentenceFrame = 0;
			updateSentence();
		} );
	},
	{ passive: true }
);

const DEFAULT_FONT_SIZE = 3;
const FONT_SIZE_STEP = 0.25;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 8;
let fontSize = DEFAULT_FONT_SIZE;

function setFontSize( size, save = true ) {
	fontSize = Math.min( MAX_FONT_SIZE, Math.max( MIN_FONT_SIZE, size ) );
	document.body.style.fontSize = `${ fontSize }em`;
	document.body.style.setProperty( "--script-size", `${ fontSize }rem` );
	requestAnimationFrame( () => updateReadingMarker() );
	if ( isSteadyRunning() ) {
		requestAnimationFrame( recalculateSteady );
	}
	if ( save ) {
		window.electron.saveFontSize( fontSize );
	}
	syncControls();
	scheduleMeasure();
}

window.electron.onFontSize( ( size ) => {
	setFontSize( size, false );
} );

const DEFAULT_OPACITY = 1; // off air: an ordinary solid window
const OPACITY_STEP = 0.05;
let opacity = DEFAULT_OPACITY;

// The backing has two levels: Backing while you set up (off air), and
// Background on air while the prompter runs or the On air button is lit.
// On air by hand (the On air button), or while the prompter runs.
let manualOnAir = false;

function onAir() {
	return manualOnAir || isScrolling() || cuePaused || pointsRunning;
}

function toggleOnAir() {
	manualOnAir = !manualOnAir;
	updateOnAir();
	refreshControlsVisibility();
	showToast( manualOnAir ? "On air" : "Off air" );
}

function applyBacking() {
	if ( isEditMode ) return;
	document.body.style.backgroundColor = `rgba(0, 0, 0, ${ liveBacking() })`;
}

// The level in use now.
function liveBacking() {
	return onAir() ? settings.backingOnAir ?? LAYOUT_DEFAULTS.backingOnAir : opacity;
}

// The bar's Backing slider and Ctrl+Shift+↑/↓ change the level in use.
function setLiveBacking( value, save = true ) {
	if ( !onAir() ) {
		setOpacity( value, save );
		return;
	}
	settings.backingOnAir = Math.min( 1, Math.max( 0, Math.round( value * 100 ) / 100 ) );
	applyBacking();
	if ( save ) window.electron.saveSettings( { backingOnAir: settings.backingOnAir } );
	syncControls();
}

function setOpacity( value, save = true ) {
	opacity = Math.min( 1, Math.max( 0, Math.round( value * 100 ) / 100 ) );
	applyBacking();
	if ( save ) {
		window.electron.saveOpacity( opacity );
	}
	syncControls();
}

window.electron.onOpacity( ( value ) => {
	setOpacity( value, false );
} );

const MIRROR_MODES = [ "off", "horizontal", "vertical", "both" ];
const MIRROR_LABELS = {
	off: "Off",
	horizontal: "Horizontal",
	vertical: "Vertical",
	both: "Both"
};
let mirrored = "off";

// Older settings stored mirroring as true / false.
function normalizeMirror( value ) {
	if ( value === true ) return "horizontal";
	return MIRROR_MODES.includes( value ) ? value : "off";
}

function mirroredVertically() {
	return mirrored === "vertical" || mirrored === "both";
}

// Everything pinned to the window (control bar, panels, dialogs, progress,
// reading marker) lives on one window-sized layer. Mirroring flips that layer
// and the script together around the middle of the window, so the whole
// prompter display reads correctly in a beam-splitter or reflector.
const hud = document.createElement( "div" );
hud.id = "hud";
for ( const el of [ ...document.body.children ] ) {
	if ( el.id === "resize-handle" || el.tagName === "SCRIPT" ) continue;
	if ( getComputedStyle( el ).position === "fixed" ) hud.appendChild( el );
}
document.body.appendChild( hud );

function applyMirror() {
	const md = uiElement( "md" );
	if ( !md ) return;
	const sx = mirrored === "horizontal" || mirrored === "both" ? -1 : 1;
	const sy = mirroredVertically() ? -1 : 1;
	if ( sx === 1 && sy === 1 ) {
		md.style.transform = "";
		md.style.transformOrigin = "";
		hud.style.transform = "";
		return;
	}
	const originY = window.scrollY + window.innerHeight / 2 - md.offsetTop;
	md.style.transformOrigin = `50% ${ originY }px`;
	md.style.transform = `scale(${ sx }, ${ sy })`;
	hud.style.transform = `scale(${ sx }, ${ sy })`;
}

window.addEventListener(
	"scroll",
	() => {
		if ( mirroredVertically() ) applyMirror();
	},
	{ passive: true }
);
window.addEventListener( "resize", applyMirror );

function showMirrorButton() {
	// Keep the toolbar, quick panel and Settings toggles in step.
	for ( const pill of [ ...document.querySelectorAll( ".mirror-pills [data-axis], .cb-mirror-axis" ), ...uiElement( "settings-modal" ).querySelectorAll( ".mirror-pills [data-axis]" ) ] ) {
		const on = pill.dataset.axis === "h"
			? mirrored === "horizontal" || mirrored === "both"
			: mirrored === "vertical" || mirrored === "both";
		pill.classList.toggle( "on", on );
		pill.setAttribute( "aria-pressed", String( on ) );
	}
}

// Each toggle stays on until clicked again; both on mirrors both ways.
function toggleMirrorAxis( axis ) {
	let h = mirrored === "horizontal" || mirrored === "both";
	let v = mirrored === "vertical" || mirrored === "both";
	if ( axis === "h" ) h = !h;
	else v = !v;
	setMirrored( h && v ? "both" : h ? "horizontal" : v ? "vertical" : "off" );
}

// Direct listeners travel with the controls into the separate Settings document.
for ( const pill of document.querySelectorAll( ".mirror-pills [data-axis], .cb-mirror-axis" ) ) {
	pill.addEventListener( "click", () => toggleMirrorAxis( pill.dataset.axis ) );
}

function setMirrored( value, save = true ) {
	mirrored = normalizeMirror( value );
	applyMirror();
	showMirrorButton();
	updateReadingMarker();
	if ( save ) {
		window.electron.saveMirrored( mirrored );
	}
	syncControls();
}

// Ctrl+M steps through off, horizontal, vertical and both.
function cycleMirror() {
	const next
		= MIRROR_MODES[( MIRROR_MODES.indexOf( mirrored ) + 1 ) % MIRROR_MODES.length];
	setMirrored( next );
	showToast( `Mirror: ${ MIRROR_LABELS[next] }` );
}

function showToast( text, ms = 1400 ) {
	let toast = uiElement( "toast" );
	if ( !toast ) {
		toast = document.createElement( "div" );
		toast.id = "toast";
		toast.setAttribute( "role", "status" );
		hud.appendChild( toast );
	}
	toast.textContent = text;
	toast.classList.add( "visible" );
	clearTimeout( showToast.timer );
	showToast.timer = setTimeout( () => toast.classList.remove( "visible" ), ms );
}

window.electron.onMirrored( ( value ) => {
	setMirrored( value, false );
} );

// Where a section starts: its first line after the heading at the reading
// line, where following your voice puts the line you're on, so the reading
// arrow points at the middle of it. The start of the script is the top.
function sectionStartScroll( index ) {
	if ( index <= 0 ) return 0;
	const anchor = document.getElementsByName( index )[0];
	if ( !anchor ) return null;
	let el = anchor.nextElementSibling;
	if ( el?.tagName === "H2" && el.nextElementSibling ) el = el.nextElementSibling;
	// Past anything not shown (a settings line, a hidden note).
	while ( el && !el.offsetHeight && el.nextElementSibling ) el = el.nextElementSibling;
	const top = layoutTop( el ?? anchor );
	return Math.max( 0, top - window.innerHeight * getReadingAnchor() );
}

function jumpToSection( index ) {
	const y = sectionStartScroll( index );
	if ( y !== null ) window.scrollTo( 0, y );
}

// --- Editor mode state ---
let isEditMode = false;
let isDirty = false;
let isLoadingContent = false;
let isNewFile = false;
let isSaving = false;
let editorView = null;
let editorReadOnly = false;
let previewManuallyScrolled = false;
let pendingScrollToCursor = false;
let savedScrollY = 0;

const previewContainer = uiElement( "preview-container" );
const editorContainer = uiElement( "editor-container" );
const editorDiv = uiElement( "editor" );
const toolbarFilename = uiElement( "toolbar-filename" );
const toolbarDirty = uiElement( "toolbar-dirty" );
const btnSave = uiElement( "btn-save" );
const btnSaveAs = uiElement( "btn-save-as" );
const btnCancel = uiElement( "btn-cancel" );
const resizeHandle = uiElement( "resize-handle" );
const autoScrollIndicator = uiElement( "auto-scroll-indicator" );
const apiKeyModal = uiElement( "api-key-modal" );
const apiKeyInput = uiElement( "api-key-input" );
const apiKeySaveBtn = uiElement( "api-key-save" );
const apiKeyCancelBtn = uiElement( "api-key-cancel" );
const apiKeyClearBtn = uiElement( "api-key-clear" );
const micModal = uiElement( "mic-modal" );
const micSelect = uiElement( "mic-modal-select" );
const micHint = uiElement( "mic-modal-hint" );
const micSaveBtn = uiElement( "mic-modal-save" );
const micCancelBtn = uiElement( "mic-modal-cancel" );

// --- Auto-scroll state ---
let autoScrollActive = false;
let autoScrollStarting = false;
let autoScrollHandle = null;
let manualScrollSyncTimer = null;
let pendingDeepgramKey = null;
let pendingStartAfterKeySave = false;
let lastManualScrollTs = 0;
let autoScrollSpeed = SCROLL_SPEED_DEFAULT;
let audioDeviceId = null;
let speedHintTimer = null;
const MANUAL_SCROLL_GRACE_MS = 3000;
const MANUAL_SCROLL_SYNC_MS = 300;
const SPEED_HINT_MS = 1500;

// Track manual scrolling in preview mode
let ignoreNextScroll = false;
window.addEventListener( "scroll", () => {
	if ( isEditMode ) return;
	if ( ignoreNextScroll ) {
		ignoreNextScroll = false;
		return;
	}
	if ( window.scrollY > 0 ) {
		previewManuallyScrolled = true;
	}
} );

function noteManualScroll() {
	if ( autoScrollActive ) {
		lastManualScrollTs = Date.now();
		cancelScroll();
		// Once the user stops scrolling, re-anchor the aligner to what's on screen.
		clearTimeout( manualScrollSyncTimer );
		manualScrollSyncTimer = setTimeout( () => {
			autoScrollHandle?.syncToViewport();
		}, MANUAL_SCROLL_SYNC_MS );
	}
}
window.addEventListener( "wheel", noteManualScroll, { passive: true } );
window.addEventListener( "mousedown", noteManualScroll );
const SCROLL_KEYS = new Set( [
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"PageUp",
	"PageDown",
	"Home",
	"End",
	" "
] );
document.addEventListener(
	"keydown",
	( e ) => {
		const input = keyInput( e );
		if ( input && mappedAction( normaliseMappings( settings.inputMappings ), input ) !== undefined ) return;
		if ( SCROLL_KEYS.has( e.key ) ) noteManualScroll();
	},
	true
);

function scrollPreviewToCursorLine() {
	if ( !editorView || !md ) return;
	const cursorLine = window.EditorModule.getCursorLine( editorView );
	const totalLines = editorView.state.doc.lines;
	if ( totalLines <= 1 ) return;

	// Use cursor line ratio to scroll the preview to the same relative position
	const ratio = ( cursorLine - 1 ) / ( totalLines - 1 );
	const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
	if ( maxScroll > 0 ) {
		ignoreNextScroll = true;
		window.scrollTo( 0, Math.round( ratio * maxScroll ) );
	}
}

function setDirty( dirty ) {
	isDirty = dirty;
	window.electron.setEditorDirty( dirty );
	if ( toolbarDirty ) {
		toolbarDirty.classList.toggle( "hidden", !dirty );
	}
}

function showEditor() {
	stopSteadySession();
	previewContainer.classList.add( "hidden" );
	editorContainer.classList.remove( "hidden" );
	if ( resizeHandle ) resizeHandle.classList.add( "hidden" );
	closePanels();
	document.body.classList.add( "editing" );
	document.body.style.backgroundColor = "#282c34";
	document.body.style.overflow = "hidden";
}

function showPreview() {
	editorContainer.classList.add( "hidden" );
	previewContainer.classList.remove( "hidden" );
	if ( resizeHandle ) resizeHandle.classList.remove( "hidden" );
	document.body.classList.remove( "editing" );
	applyBacking();
	document.body.style.overflow = "";
}

function enterEditMode() {
	if ( isEditMode ) return;
	if ( autoScrollActive || autoScrollStarting ) {
		stopAutoScrollSession();
	}
	savedScrollY = window.scrollY;
	isEditMode = true;

	window.electron.pauseWatcher();
	window.electron.requestRawMarkdown();
}

function loadEditorContent( content, filePath, access = {} ) {
	const rawContent = content ?? "";
	editorReadOnly = access.readOnly === true;
	btnSave.disabled = editorReadOnly;
	btnSaveAs.textContent = editorReadOnly ? "Save a copy…" : "Save As";
	btnCancel.textContent = editorReadOnly ? "Back to prompter" : "Cancel";

	showEditor();

	if ( toolbarFilename ) {
		toolbarFilename.textContent = filePath
			? `${ filePath.split( /[\\/]/ ).pop() }${ editorReadOnly ? " · Sample · read-only" : "" }`
			: "New file";
	}
	setDirty( false );

	isLoadingContent = true;
	if ( editorView ) {
		window.EditorModule.setEditorContent( editorView, rawContent );
		window.EditorModule.setEditorReadOnly( editorView, editorReadOnly );
	} else {
		editorView = window.EditorModule.createEditor( editorDiv, rawContent, () => {
			scriptReview?.changed();
			if ( !isDirty && !isLoadingContent ) {
				setDirty( true );
			}
		}, editorReadOnly );
	}
	isLoadingContent = false;
	editorView.focus();
}

window.electron.onRawMarkdown( ( content, filePath, access ) => {
	if ( !isEditMode ) return;
	loadEditorContent( content, filePath, access );
} );

function discardAndExitEditor() {
	if ( !isEditMode ) return;
	isEditMode = false;
	isNewFile = false;

	showPreview();
	setDirty( false );
	window.electron.resumeWatcher();
	window.electron.reloadContent();
}

function toggleEditMode() {
	if ( isEditMode ) {
		// Switch to preview without discarding — keep editor state intact
		isEditMode = false;
		pendingScrollToCursor = !previewManuallyScrolled;
		// Update preview with current editor content
		if ( editorView ) {
			const content = window.EditorModule.getEditorContent( editorView );
			window.electron.previewMarkdown( content );
		}
		showPreview();
	} else if ( editorView ) {
		if ( autoScrollActive || autoScrollStarting ) {
			stopAutoScrollSession();
		}
		// Save preview scroll position before switching to editor
		savedScrollY = window.scrollY;
		// Resume editing — just swap visibility back
		isEditMode = true;
		window.electron.pauseWatcher();
		showEditor();
		editorView.focus();
	} else {
		enterEditMode();
	}
}

function saveEditorContent() {
	if ( !editorView || editorReadOnly ) return;
	isSaving = true;
	const content = window.EditorModule.getEditorContent( editorView );
	if ( isNewFile ) {
		window.electron.saveFileAs( content );
	} else {
		window.electron.saveFile( content );
	}
}

function saveEditorContentAs() {
	if ( !editorView ) return;
	isSaving = true;
	const content = window.EditorModule.getEditorContent( editorView );
	window.electron.saveFileAs( content );
}

// Close coordination — save editor content then signal main to close
let pendingSaveAndClose = false;

// Listen for save result
window.electron.onSaveResult( ( success, filePath ) => {
	isSaving = false;
	if ( success ) {
		editorReadOnly = false;
		btnSave.disabled = false;
		btnSaveAs.textContent = "Save As";
		btnCancel.textContent = "Cancel";
		if ( editorView ) window.EditorModule.setEditorReadOnly( editorView, false );
		setDirty( false );
		isNewFile = false;
		if ( filePath && toolbarFilename ) {
			toolbarFilename.textContent = filePath.split( "/" ).pop();
		}
	}
	if ( pendingSaveAndClose ) {
		pendingSaveAndClose = false;
		window.electron.saveAndClose();
	}
} );

// Listen for toggle editor from menu
window.electron.onToggleEditor( toggleEditMode );

// New file — enter edit mode with empty content
function newScript() {
	if ( isDirty ) {
		const discard = confirm(
			"You have unsaved changes. Discard and create a new file?"
		);
		if ( !discard ) return;
	}
	isNewFile = true;
	isEditMode = true;
	window.electron.pauseWatcher();
	loadEditorContent( "", null );
}
window.electron.onNewFile( newScript );

// Listen for menu save/save-as (works from editor or preview with pending edits)
window.electron.onMenuSave( () => {
	if ( isDirty ) {
		saveEditorContent();
	}
} );

window.electron.onMenuSaveAs( () => {
	if ( editorView ) {
		saveEditorContentAs();
	}
} );

window.electron.onRequestSaveBeforeClose( () => {
	if ( editorView && isDirty ) {
		pendingSaveAndClose = true;
		saveEditorContent();
	}
} );

// Toolbar buttons
if ( btnSave ) {
	btnSave.addEventListener( "click", saveEditorContent );
}
if ( btnSaveAs ) {
	btnSaveAs.addEventListener( "click", saveEditorContentAs );
}
if ( btnCancel ) {
	btnCancel.addEventListener( "click", () => {
		if ( isDirty ) {
			const discard = confirm( "You have unsaved changes. Discard changes?" );
			if ( !discard ) return;
		}
		discardAndExitEditor();
	} );
}

// --- Keyboard handling ---
document.addEventListener( "keydown", ( event ) => {
	// Suppress teleprompter shortcuts when in edit mode
	if ( isEditMode ) return;
	// Leave keys alone while a dialog (Settings, API key, mic) is open.
	if ( document.querySelector( ".modal:not(.hidden)" ) ) return;
	if ( event.target.closest?.( "#voice-help" ) ) return;

	const plainKey = !event.metaKey && !event.ctrlKey && !event.altKey;
	if ( event.key === "Escape" && closePanels() ) {
		event.preventDefault();
		return;
	}
	// Typing or nudging a slider in the control bar or a panel.
	if ( event.target.closest?.( "input, select, textarea" ) ) return;
	// Let native button activation handle Space/Enter without also starting a take.
	if ( [ " ", "Enter" ].includes( event.key ) && event.target.closest?.( "button, a, [role=tab]" ) ) return;
	const customInput = keyInput( event );
	const customAction = customInput && mappedAction( normaliseMappings( settings.inputMappings ), customInput );
	if ( customAction !== undefined && customAction !== null ) {
		event.preventDefault();
		if ( !event.repeat ) runMappedAction( customAction );
		return;
	}
	if ( handlePointsKey( event ) ) return;
	if ( event.key === "F1" && event.shiftKey ) {
		event.preventDefault();
		window.electron.openGuide();
		return;
	}
	if (
		event.key === "F1"
		|| ( event.key === "?" && !event.ctrlKey && !event.metaKey )
	) {
		event.preventDefault();
		openHelp();
		return;
	}
	if ( ( event.key === "a" || event.key === "A" ) && event.ctrlKey && event.shiftKey && !event.altKey ) {
		event.preventDefault();
		toggleOnAir();
		return;
	}
	if ( ( event.key === "k" || event.key === "K" ) && plainKey ) {
		event.preventDefault();
		rateTake( event.shiftKey ? "scrap" : "keeper" );
		return;
	}
	if ( ( event.key === "b" || event.key === "B" ) && plainKey && !event.shiftKey ) {
		event.preventDefault();
		dropMarker();
		return;
	}
	if ( ( event.key === "b" || event.key === "B" ) && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey ) {
		event.preventDefault();
		jumpToPreviousMarker();
		return;
	}
	if (
		( event.key === "b" || event.key === "B" )
		&& ( event.ctrlKey || event.metaKey )
		&& !event.shiftKey
	) {
		event.preventDefault();
		jumpToNextMarker();
		return;
	}
	// Presenter clickers send Page Down / Page Up.
	if ( event.key === "PageDown" && plainKey ) {
		event.preventDefault();
		toggleAutoScrollSession();
		return;
	}
	if ( event.key === "PageUp" && plainKey && scriptIndex > 0 ) {
		event.preventDefault();
		scriptIndex--;
		previewManuallyScrolled = true;
		jumpToSection( scriptIndex );
		return;
	}
	if ( event.key === " " && plainKey ) {
		event.preventDefault();
		toggleAutoScrollSession();
		return;
	}
	if (
		steadySessionActive()
		&& plainKey
		&& ( event.key === "ArrowUp" || event.key === "ArrowDown" )
	) {
		event.preventDefault();
		adjustAutoScrollSpeed( event.key === "ArrowUp" ? "up" : "down" );
		return;
	}

	if (
		( event.key === "ArrowDown" || event.key === "ArrowUp" )
		&& !( ( event.metaKey || event.ctrlKey ) && event.shiftKey )
	) {
		// Allow default scroll behavior, but track it
		previewManuallyScrolled = true;
	} else if ( event.key === "ArrowRight" ) {
		event.preventDefault();
		jumpSection( 1 );
	} else if ( event.key === "ArrowLeft" ) {
		event.preventDefault();
		jumpSection( -1 );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& !event.shiftKey
		&& ( event.key === "=" || event.key === "+" )
	) {
		event.preventDefault();
		setFontSize( fontSize + FONT_SIZE_STEP );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& !event.shiftKey
		&& event.key === "-"
	) {
		event.preventDefault();
		setFontSize( fontSize - FONT_SIZE_STEP );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& !event.shiftKey
		&& event.key === "0"
	) {
		event.preventDefault();
		setFontSize( DEFAULT_FONT_SIZE );
	} else if ( ( event.metaKey || event.ctrlKey ) && event.key === "m" ) {
		event.preventDefault();
		cycleMirror();
	} else if (
		( event.metaKey || event.ctrlKey )
		&& event.shiftKey
		&& event.key === "ArrowUp"
	) {
		event.preventDefault();
		setLiveBacking( liveBacking() + OPACITY_STEP );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& event.shiftKey
		&& event.key === "ArrowDown"
	) {
		event.preventDefault();
		setLiveBacking( liveBacking() - OPACITY_STEP );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& event.shiftKey
		&& ( event.key === ")" || event.key === "0" )
	) {
		event.preventDefault();
		setOpacity( DEFAULT_OPACITY );
	}
} );

// Resize handle
if ( resizeHandle ) {
	resizeHandle.addEventListener( "mousedown", ( e ) => {
		e.preventDefault();
		const startX = e.screenX;
		const startY = e.screenY;
		const startWidth = window.outerWidth;
		const startHeight = window.outerHeight;

		function onMouseMove( moveEvent ) {
			const newWidth = Math.max( 200, startWidth + moveEvent.screenX - startX );
			const newHeight = Math.max( 150, startHeight + moveEvent.screenY - startY );
			window.electron.resizeWindow( newWidth, newHeight );
		}

		function onMouseUp() {
			document.removeEventListener( "mousemove", onMouseMove );
			document.removeEventListener( "mouseup", onMouseUp );
		}

		document.addEventListener( "mousemove", onMouseMove );
		document.addEventListener( "mouseup", onMouseUp );
	} );
}

// Handle content loaded from main process
window.electron.onContent( ( content, snapshot ) => {
	// A different script must not reopen the previous script's cached editor.
	if ( snapshot && !isEditMode && !isSaving && !isDirty && editorView ) {
		editorView.destroy();
		editorView = null;
	}
	sourceSnapshot = snapshot ?? null;
	recordingSnapshotCache = null;
	if ( md ) {
		lastScriptHtml = content;
		renderScript( content );
		if ( pendingRestore ) {
			// Swapped back to a slot: put the reader where they left it.
			const { scrollY = 0, section = 0 } = pendingRestore;
			pendingRestore = null;
			scriptIndex = section;
			savedScrollY = scrollY;
			previewManuallyScrolled = scrollY > 0;
			requestAnimationFrame( () => {
				ignoreNextScroll = true;
				window.scrollTo( 0, scrollY );
				updateProgress();
			} );
		} else if ( pendingScrollToCursor ) {
			pendingScrollToCursor = false;
			requestAnimationFrame( () => scrollPreviewToCursorLine() );
		} else if ( previewManuallyScrolled && !isSaving ) {
			// Restore saved scroll position after layout completes
			requestAnimationFrame( () => {
				ignoreNextScroll = true;
				window.scrollTo( 0, savedScrollY );
			} );
		} else if ( !isSaving ) {
			scriptIndex = 0;
			previewManuallyScrolled = false;
		}
	}
	// If in edit mode, reload the editor with the new file's raw markdown
	// (skip if the content update was triggered by our own save)
	if ( isEditMode && !isSaving ) {
		window.electron.requestRawMarkdown();
	}
	// Reloaded HTML invalidates the word index; stop auto-scroll if active.
	if ( autoScrollActive ) {
		stopAutoScrollSession();
	}
	if ( steadySessionActive() ) {
		requestAnimationFrame( recalculateSteady );
	}
	scheduleMeasure();
} );

// --- Auto-scroll toggle ---

function setIndicator( text, variant ) {
	updatePlayButton();
	if ( !autoScrollIndicator ) return;
	if ( !text ) {
		autoScrollIndicator.classList.add( "hidden" );
		autoScrollIndicator.textContent = "";
		return;
	}
	autoScrollIndicator.textContent = text;
	autoScrollIndicator.classList.remove(
		"hidden",
		"connecting",
		"error",
		"stopped",
		"counting"
	);
	if ( variant ) autoScrollIndicator.classList.add( variant );
}

// Voice following: when each script word was said, into the take log, so
// the edit can cut on words. Words passed together share out the time between
// the first and last word heard.
function logSpokenWords( { from, to, start, end, ranges } ) {
	const count = to - from;
	const words = [];
	for ( let i = from + 1; i <= to; i++ ) {
		const k = i - from - 1;
		const at = count > 1 ? start + ( ( end - start ) * k ) / ( count - 1 ) : end;
		words.push( { i, w: ranges[i]?.toString().trim() ?? "", at } );
	}
	recording.words( words );
	// A {marker} is passed when the word after it is said.
	for ( const m of directivePoints.scriptMarkers ?? [] ) {
		const said = words.find( w => w.i === m.word );
		if ( said ) recording.marker( { label: m.label, at: said.at, from: "script", key: m.key } );
	}
}

// The index of the first script word after an element (a {marker}).
function wordAfter( el, ranges ) {
	const here = document.createRange();
	here.setStartAfter( el );
	const i = ranges.findIndex( r => r.compareBoundaryPoints( Range.START_TO_START, here ) >= 0 );
	return i < 0 ? null : i;
}

function handleAutoScrollPosition( wordIdx, ranges ) {
	// The words just heard end here, so the next thing to say is the word after.
	if ( settings.highlightSentence !== false ) showSentenceAt( wordIdx + 1 );
	const before = voiceWordIdx;
	const pause = voicePauseCrossed( wordIdx, ranges );
	if ( before !== null && wordIdx > before && !autoScrollHandle?.isHeld() ) {
		for ( const c of directivePoints.prompterCommands ) {
			const last = lastWordBefore( c, ranges );
			if ( last > before && last <= wordIdx ) runScriptCommand( c.command );
		}
	}
	if ( Date.now() - lastManualScrollTs < MANUAL_SCROLL_GRACE_MS ) return;
	scrollToWord( wordIdx, ranges );
	if ( pause ) pauseVoiceAt( pause );
	else if ( wordIdx >= ranges.length - 1 ) {
		autoScrollHandle?.setHold( true );
		linkedRecording.finish();
		showPausePill( 0 );
	}
}

// --- Stops and timed pauses: {stop} or {pause}, and {pause: 5s} ---
// A stop waits for the speaker ("Prompter, go", Space or the clicker); a timed
// pause shows a countdown and carries on by itself. The pill says which.

let pauseTicker = null;
// The last word voice scrolling placed, to spot a pause being passed: -1
// before the first word, null when unknown (after a jump).
let voiceWordIdx = null;

function voiceCanResume() {
	return settings.voiceCommands !== "off" && usesLocalVoice() && speechModel.installed;
}

function stopText() {
	if ( autoScrollActive ) return `Stopped · say “${ wakeLabel( settings.wakeWord ) }, go”`;
	return voiceCanResume()
		? `Stopped · say “${ wakeLabel( settings.wakeWord ) }, go” or press Space`
		: "Stopped · Space to carry on";
}

function clearPausePill() {
	clearInterval( pauseTicker );
	pauseTicker = null;
	// Moving on from a stop closes a sound check held there.
	endScriptSoundCheck();
}

// seconds = 0: a stop. Otherwise count down, then onDone().
function showPausePill( seconds, onDone ) {
	clearPausePill();
	if ( !seconds ) {
		setIndicator( stopText(), "stopped" );
		return;
	}
	let left = seconds;
	// Start the draining bar afresh.
	autoScrollIndicator?.classList.remove( "counting" );
	void autoScrollIndicator?.offsetWidth;
	autoScrollIndicator?.style.setProperty( "--pause-seconds", `${ seconds }s` );
	setIndicator( `Carrying on in ${ left }`, "counting" );
	pauseTicker = setInterval( () => {
		left--;
		if ( left > 0 ) {
			if ( autoScrollIndicator ) autoScrollIndicator.textContent = `Carrying on in ${ left }`;
			return;
		}
		clearPausePill();
		onDone();
	}, 1000 );
}

// "Prompter, pause" during a countdown: wait for the speaker instead.
function holdPauseCountdown() {
	if ( !pauseTicker ) return false;
	clearPausePill();
	setIndicator( stopText(), "stopped" );
	return true;
}

// The script word just before a directive (a stop, {prompter: …}), found by
// halving and kept with it until the word index changes.
function lastWordBefore( point, ranges ) {
	if ( point.ranges !== ranges ) {
		let lo = 0;
		let hi = ranges.length;
		while ( lo < hi ) {
			const mid = ( lo + hi ) >> 1;
			if ( ranges[mid].comparePoint( point.el, 0 ) < 0 ) hi = mid;
			else lo = mid + 1;
		}
		point.ranges = ranges;
		point.lastWord = lo - 1;
	}
	return point.lastWord;
}

// The stop whose last word before it the speaker has just said, if any. Timed
// pauses don't hold in voice mode: the text only moves when the speaker does,
// so they see {pause: 3s} in the script and take the beat themselves.
function voicePauseCrossed( wordIdx, ranges ) {
	const before = voiceWordIdx;
	voiceWordIdx = wordIdx;
	if ( before === null || wordIdx <= before || autoScrollHandle?.isHeld() ) return null;
	return directivePoints.pauses.find( ( pause ) => {
		if ( pause.seconds && !linkedRecording.enabled() ) return false;

		const last = lastWordBefore( pause, ranges );
		return last > before && last <= wordIdx;
	} );
}

// {prompter: slower} and the rest: run as the reading reaches them.
const SCRIPT_COMMAND_LABELS = { slower: "slower", faster: "faster", bigger: "bigger text", smaller: "smaller text", marker: "marker" };
async function runScriptCommand( command ) {
	if ( command.startsWith( "record:" ) ) {
		if ( !settings.obsEnabled || !settings.obsControls ) return;
		const resumeVoice = autoScrollActive && !autoScrollHandle?.isHeld();
		const resumeSteady = isSteadyRunning();
		autoScrollHandle?.setHold( true );
		if ( resumeSteady ) stopSteadyScroll();
		const action = command.slice( 7 );
		const ok = await obsUi.action( { on: "start", off: "stop", pause: "pause", resume: "resume" }[action], { prompt: false } );
		if ( ok && [ "on", "resume" ].includes( action ) ) {
			if ( resumeVoice ) autoScrollHandle?.setHold( false );
			if ( resumeSteady ) startSteadyScroll( { el: md, wordsPerMinute: settings.steadyWpm, onFinished: () => linkedRecording.finish() } );
		} else if ( resumeSteady ) {
			cuePaused = true;
			cueWasStop = true;
			showPausePill( 0 );
		} else if ( resumeVoice ) {
			showPausePill( 0 );
		}
		return;
	}
	runRemoteAction( command );
	showToast( `Script: ${ SCRIPT_COMMAND_LABELS[command] ?? command }`, 1500 );
}

// --- {soundcheck: room} and {soundcheck: voice}: checks the script asks for ---
// A stop that measures the mic first (level-meter.js): the room's background
// noise while you stay quiet, or your voice while you read a line. The result,
// and what to turn up or down, show on a card and go in the take log
// (soundChecks). "Prompter, again" or Check again measures again; carrying on
// (Space, "Prompter, go") closes it. Sightline can't set the mic's gain: the
// recording isn't its own, so it says how far to turn it instead.
const VOICE_CHECK_LINE = "Testing, one, two, three. This is my normal speaking voice, at the level I'll use for the recording.";
const CHECK_SECONDS = { room: 5, voice: 7 };
let scriptCheck = null; // { kind, pause, timer, done }
const checkCard = document.createElement( "div" );
checkCard.id = "soundcheck-card";
checkCard.className = "hidden";
checkCard.setAttribute( "role", "status" );
hud.appendChild( checkCard );

function drawCheckCard( { title, line = "", count = null, result = null, done = false } ) {
	checkCard.textContent = "";
	const add = ( tag, cls, text ) => {
		const el = document.createElement( tag );
		el.className = cls;
		el.textContent = text;
		checkCard.appendChild( el );
		return el;
	};
	add( "div", "sc-title", title );
	if ( line ) add( "div", "sc-line", line );
	if ( count !== null ) add( "div", "sc-count", String( count ) );
	if ( result ) {
		add( "div", `sc-result ${ result.verdict }`, result.text );
		if ( result.advice ) add( "div", "sc-advice", result.advice );
	}
	if ( done ) {
		const proceed = add( "button", "sc-continue", result && ![ "good", "quiet", "ok" ].includes( result.verdict ) ? "Continue anyway" : "Continue" );
		proceed.type = "button";
		proceed.addEventListener( "click", () => {
			if ( !scriptCheck?.done ) return;
			recording.soundCheck( { ...scriptCheck.measured, kind: scriptCheck.kind, verdict: result?.verdict, advice: result?.advice ?? "", accepted: true }, sectionIndexAt( readingLineY() ) );
			if ( autoScrollActive ) carryOnFromVoiceCheck();
			else if ( cuePaused ) resumeFromCue();
			else endScriptSoundCheck();
		} );
		const wake = wakeLabel( settings.wakeWord );
		add( "div", "sc-hint", autoScrollActive
			? `Space or “${ wake }, go” to carry on · “${ wake }, again” to check again`
			: "Space to carry on" );
		const again = add( "button", "sc-again", "Check again" );
		again.type = "button";
		again.addEventListener( "click", () => startScriptSoundCheck( scriptCheck?.kind ?? "voice", scriptCheck?.pause ) );
	}
	checkCard.classList.remove( "hidden" );
}

async function startScriptSoundCheck( kind, pause = null ) {
	endScriptSoundCheck();
	const run = { kind, pause, timer: null, done: false };
	scriptCheck = run;
	const title = kind === "room" ? "Room check: stay quiet" : "Voice check: read this at your normal level";
	const line = kind === "voice" ? VOICE_CHECK_LINE : "";
	drawCheckCard( { title, line, count: "…" } );
	setIndicator( kind === "room" ? "Room check · stay quiet" : "Voice check · read the card", "stopped" );
	syncLevelMeter( isScrolling() || cuePaused || pointsRunning );
	// A moment for the microphone to open, then count.
	await new Promise( r => setTimeout( r, 700 ) );
	if ( scriptCheck !== run ) return;
	const from = Date.now();
	let left = CHECK_SECONDS[kind];
	drawCheckCard( { title, line, count: left } );
	await new Promise( ( resolve ) => {
		run.timer = setInterval( () => {
			left--;
			if ( scriptCheck !== run || left <= 0 ) {
				clearInterval( run.timer );
				resolve();
				return;
			}
			const count = checkCard.querySelector( ".sc-count" );
			if ( count ) count.textContent = String( left );
		}, 1000 );
	} );
	if ( scriptCheck !== run ) return;
	const measured = levelMeter.measure( from, Date.now() );
	run.measured = measured;
	const result = soundCheckVerdict( kind, measured );
	recording.soundCheck( {
		kind,
		lufs: measured?.lufs ?? null,
		peak: measured?.peak ?? null,
		noise: measured?.noise ?? null,
		verdict: result.verdict,
		advice: result.advice ?? ""
	}, sectionIndexAt( readingLineY() ) );
	run.done = true;
	drawCheckCard( { title: kind === "room" ? "Room check" : "Voice check", result, done: true } );
	setIndicator( stopText(), "stopped" );
	syncLevelMeter( isScrolling() || cuePaused || pointsRunning );
}

// The sound check straight after this one, with nothing to read between them
// (room, then voice): carrying on from one goes to the next.
function nextSoundCheck( pause ) {
	const list = directivePoints.pauses;
	const next = list[list.indexOf( pause ) + 1];
	if ( !pause || !next?.soundcheck ) return null;
	return directivePoints.wordTops.some( t => t > pause.y + 1 && t < next.y - 1 ) ? null : next;
}

// The sound check a script opens with: starting from the top, it's already
// above the reading line, so it would never be passed. It runs straight away.
function openingSoundCheck() {
	if ( window.scrollY > 4 ) return null;
	const first = directivePoints.pauses[0];
	return first?.soundcheck && first.y <= readingLineY() + 1 ? first : null;
}

// Voice scrolling, carrying on from a sound check: the next check, or back to
// following the script.
async function carryOnFromVoiceCheck() {
	const next = nextSoundCheck( scriptCheck?.pause );
	if ( next ) {
		pauseVoiceAt( next );
		return;
	}
	if ( !await prepareReading() ) return;
	clearPausePill();
	autoScrollHandle?.setHold( false );
	setIndicator( "Listening" );
	// The take starts now: the slate it skipped at the start.
	showSlate();
}

function endScriptSoundCheck() {
	if ( !scriptCheck ) return;
	clearInterval( scriptCheck.timer );
	scriptCheck = null;
	checkCard.classList.add( "hidden" );
	syncLevelMeter( isScrolling() || cuePaused || pointsRunning );
}

// {listen: off}: the microphone is muted and the prompter holds, for an ad-lib,
// a demo or questions; Space, a clicker, the remote or the Stream Deck carries
// on from the next {listen: on}. The take log notes the time off script.
const OFF_SCRIPT_TEXT = "Off script · mic off · Space to carry on";
let offScript = null; // the {listen: off} voice scrolling is holding at

function goOffScript( pause ) {
	offScript = pause;
	autoScrollHandle?.setHold( true );
	autoScrollHandle?.setMuted( true );
	cancelScroll();
	recording.listen( false );
	setIndicator( OFF_SCRIPT_TEXT, "stopped" );
}

// The {listen: on} after a {listen: off}: the reading line goes there.
function goToListenOn( pause ) {
	const on = directivePoints.listenOns.find( o => o.y > pause.y + 1 );
	if ( on ) window.scrollTo( 0, Math.max( 0, on.y - window.innerHeight * getReadingAnchor() ) );
}

function backOnScript() {
	const pause = offScript;
	offScript = null;
	if ( !pause ) return;
	goToListenOn( pause );
	recording.listen( true );
	if ( !autoScrollActive || !autoScrollHandle ) return;
	autoScrollHandle.setMuted( false );
	voiceWordIdx = null;
	// Once the jump has settled, follow from the new place.
	setTimeout( () => autoScrollHandle?.setHold( false ), 300 );
	setIndicator( "Listening" );
}

async function pauseVoiceAt( pause ) {
	if ( !autoScrollHandle ) return;
	if ( pause.listen === "off" ) {
		goOffScript( pause );
		return;
	}
	if ( pause.soundcheck ) {
		autoScrollHandle.setHold( true );
		cancelScroll();
		showPausePill( 0 );
		startScriptSoundCheck( pause.soundcheck, pause );
		return;
	}
	autoScrollHandle.setHold( true );
	cancelScroll();
	const atEnd = !directivePoints.wordTops.some( y => y > pause.y + 2 );
	if ( atEnd ) await linkedRecording.finish();
	else await linkedRecording.pause();
	showPausePill( pause.seconds, async () => {
		if ( !autoScrollActive || !autoScrollHandle ) return;
		if ( !await prepareReading() ) return;
		autoScrollHandle.setHold( false );
		setIndicator( "Listening" );
	} );
}

let preparingRead = false;
let readingRequest = 0;
async function prepareReading() {
	if ( preparingRead ) return false;
	preparingRead = true;
	const request = readingRequest;
	try {
		// A recording directive before the first spoken word runs on Play,
		// never while loading or previewing a script.
		if ( settings.obsEnabled && settings.obsControls && window.scrollY < 4 ) {
			const { ranges } = buildWordIndex( md );
			const spoken = ranges.filter( range => !range.startContainer.parentElement?.closest( "h1, h2, h3, h4, h5, h6" ) );
			for ( const c of directivePoints.prompterCommands ) {
				if ( [ "record:on", "record:resume" ].includes( c.command ) && lastWordBefore( c, spoken ) < 0 ) {
					if ( !await obsUi.action( c.command === "record:on" ? "start" : "resume", { prompt: false } ) ) return false;
				}
			}
		}
		if ( !await linkedRecording.start() ) {
			showToast( "Recording was not confirmed. Check OBS before starting the take.", 5000 );
			return false;
		}
		if ( request !== readingRequest ) {
			linkedRecording.pause();
			return false;
		}
		setProductionNotesActive( md, true, { alignFirst: window.scrollY < 4, readingAnchor: getReadingAnchor() } );
		measureDirectives( buildWordIndex( md ).ranges );
		return true;
	} finally {
		preparingRead = false;
	}
}

async function startAutoScrollSession() {
	if ( autoScrollActive || autoScrollStarting ) return;
	if ( listeningSuspended ) {
		showToast( "Listening is off for this session. Turn it on with Stream Deck or Restart listening." );
		return;
	}
	if ( usesLocalVoice() && ( modelMaintenance || speechModel.downloading ) ) {
		showToast( "Wait for speech model maintenance to finish, then press Play again" );
		return;
	}
	if ( isEditMode ) {
		alert( "Exit the editor before starting auto-scroll." );
		return;
	}
	if ( usesLocalVoice() && !speechModel.installed ) {
		// The speech model comes down once; send the reader to where that happens.
		openSettings();
		showSettingsTab( "voice" );
		showToast(
			"Download the speech model first (Settings > Prompting > Voice), then press Play again"
		);
		return;
	}
	if ( !openingSoundCheck() && !await prepareReading() ) return;
	autoScrollStarting = true;
	pendingDeepgramKey = null;
	// From the top, a pause after the first few words still counts.
	voiceWordIdx = window.scrollY < 4 ? -1 : null;
	await stopCommandListening();
	if ( usesLocalVoice() ) {
		setIndicator( "Starting…", "connecting" );
		beginVoice( "local", null );
		return;
	}
	setIndicator( "Connecting…", "connecting" );
	window.electron.getDeepgramKey();
}

async function tryStartFlow() {
	if ( !autoScrollStarting || !pendingDeepgramKey ) return;
	const dgKey = pendingDeepgramKey;
	pendingDeepgramKey = null;

	if ( !dgKey.key ) {
		autoScrollStarting = false;
		setIndicator( null );
		pendingStartAfterKeySave = true;
		showApiKeyModal();
		return;
	}
	beginVoice( "deepgram", dgKey.key );
}

// Voice scrolling on this computer unless Deepgram is chosen (Settings > Voice).
function usesLocalVoice() {
	return settings.voiceEngine !== "deepgram";
}

let speechModel = { installed: false };
window.electron.onSpeechModel( ( status ) => {
	speechModel = status;
	showSpeechModel();
	componentSettings?.paintSpeech( status );
	syncCommandListening();
	offerSpeechModel();
} );

// A new user doesn't know voice scrolling needs a download: offer it once, in
// a small note at the bottom right, and show its progress there. "Not now"
// doesn't ask again; Settings > Voice and the Voice panel still have it.
const VOICE_OFFERED = "sightline.voiceOffered";
let voiceOffer = null;

function offerSpeechModel() {
	if ( !usesLocalVoice() ) return;
	if ( voiceOffer ) {
		updateVoiceOffer();
		return;
	}
	if ( speechModel.installed || speechModel.downloading ) return;
	try {
		if ( localStorage.getItem( VOICE_OFFERED ) ) return;
	} catch {
		return;
	}
	voiceOffer = document.createElement( "div" );
	voiceOffer.id = "voice-offer";
	voiceOffer.setAttribute( "role", "status" );
	const text = document.createElement( "span" );
	text.className = "vo-text";
	// Non-breaking spaces and hyphen keep "one-off 73 MB download" together.
	text.textContent = "Voice scrolling follows what you say, with speech recognition on this computer. It's a one‑off 73 MB download.";
	const get = document.createElement( "button" );
	get.type = "button";
	get.className = "vo-get";
	get.textContent = "Download";
	get.addEventListener( "click", () => {
		rememberVoiceOffer();
		window.electron.speechModelDownload();
	} );
	const close = document.createElement( "button" );
	close.type = "button";
	close.textContent = "×";
	close.title = "Not now (Settings > Prompting > Voice has it)";
	close.setAttribute( "aria-label", "Not now" );
	close.addEventListener( "click", () => {
		rememberVoiceOffer();
		voiceOffer?.remove();
		voiceOffer = null;
	} );
	voiceOffer.append( text, get, close );
	hud.appendChild( voiceOffer );
}

function rememberVoiceOffer() {
	try {
		localStorage.setItem( VOICE_OFFERED, new Date().toISOString() );
	} catch {
		// it may offer again next time; that's all
	}
}

function updateVoiceOffer() {
	const text = voiceOffer.querySelector( ".vo-text" );
	const get = voiceOffer.querySelector( ".vo-get" );
	if ( speechModel.downloading ) {
		const pct = Math.floor( ( 100 * speechModel.received ) / ( speechModel.total || 1 ) );
		text.textContent = `Downloading the speech model… ${ pct }%. You can carry on meanwhile.`;
		get.classList.add( "hidden" );
	} else if ( speechModel.installed ) {
		text.textContent = "Voice scrolling is ready: choose Voice in the Voice panel (Ctrl+Shift+V), then press Space and read.";
		get.classList.add( "hidden" );
		const done = voiceOffer;
		setTimeout( () => {
			done.remove();
			if ( voiceOffer === done ) voiceOffer = null;
		}, 12000 );
	} else if ( speechModel.error ) {
		text.textContent = "The download didn't finish. Check you're online and try again.";
		get.classList.remove( "hidden" );
		get.textContent = "Try again";
	}
}
window.electron.speechModelStatus();

// The model line on Settings > Voice: installed, downloading (with progress) or not yet.
function showSpeechModel() {
	showSpeechModelIn( "set-speech-model-status", "set-speech-model-get" );
	showSpeechModelIn( "vp-model-status", "vp-model-get" );
}

function showSpeechModelIn( statusId, buttonId ) {
	const status = uiElement( statusId );
	const button = uiElement( buttonId );
	if ( !status || !button ) return;
	const mb = bytes => Math.round( bytes / 1e6 );
	if ( speechModel.downloading ) {
		const pct = Math.floor( ( 100 * speechModel.received ) / speechModel.total );
		status.textContent = `Downloading… ${ mb( speechModel.received ) } of ${ mb( speechModel.total ) } MB (${ pct }%)`;
		button.classList.add( "hidden" );
	} else if ( speechModel.installed ) {
		status.textContent
			= "Speech model installed. Voice scrolling works offline.";
		button.classList.add( "hidden" );
	} else {
		const failed = speechModel.error
			? `Download failed: ${ speechModel.error }. `
			: "";
		status.textContent = `${ failed }One-off download of ${ mb( speechModel.total ?? 73e6 ) } MB, then no internet needed.`;
		button.textContent = speechModel.error
			? "Try again"
			: "Download speech model";
		button.classList.remove( "hidden" );
	}
}

async function beginVoice( engine, deepgramKey ) {
	try {
		autoScrollHandle = await startAutoScroll( {
			engine,
			deepgramKey,
			scriptEl: md,
			audioDeviceId,
			onStatus: ( status ) => {
				showListeningStatus( status );
				if ( status.type === "closed" || status.type === "error" || status.type === "failed" ) {
					if ( autoScrollActive ) stopAutoScrollSession();
				} else if ( status.type === "device-fallback" ) {
					showTransientHint( "Saved mic unavailable — using default", 2500 );
				}
			},
			onScroll: handleAutoScrollPosition,
			onFollow: logSpokenWords,
			onHeard: entry => window.electron.appendHeardLog( entry ),
			onReview: ( { words, engine: usedEngine } ) => {
				if ( settings.coachFillers === true && !offScript && !cuePaused ) recording.reviewWords( words, usedEngine );
			},
			wordFixes: settings.wordFixes ?? [],
			soundAlike: settings.soundAlike !== false,
			commandWords: settings.commandWords ?? [],
			onCommand: settings.voiceCommands === "off" ? null : runVoiceCommand,
			onWake: voiceWake,
			onMiss: voiceMiss,
			wakeWord: settings.wakeWord ?? "prompter"
		} );
		autoScrollActive = true;
		autoScrollStarting = false;
		lastManualScrollTs = 0;
		setIndicator( "Listening" );
		const opening = openingSoundCheck();
		if ( opening ) pauseVoiceAt( opening );
		else showSlate();
	} catch ( err ) {
		autoScrollStarting = false;
		if ( err.message === "Listening was cancelled." ) return;
		console.error( "[auto-scroll] start failed", err );
		setIndicator( "Error", "error" );
		setTimeout( () => {
			if ( !autoScrollActive ) setIndicator( null );
		}, 3000 );
		alert( `Failed to start auto-scroll: ${ err.message }` );
	}
}

async function stopAutoScrollSession() {
	readingRequest++;
	if ( !autoScrollActive && !autoScrollStarting ) return;
	autoScrollActive = false;
	linkedRecording.pause();
	autoScrollStarting = false;
	autoScrollHandle = null;
	offScript = null;
	clearTimeout( manualScrollSyncTimer );
	clearPausePill();
	voiceWordIdx = null;
	setIndicator( null );
	try {
		await stopAutoScroll();
	} catch ( err ) {
		console.warn( "[auto-scroll] stop error", err );
	}
	updateSentence();
	syncCommandListening();
}

// --- "Prompter, …" voice commands ---
// In voice mode the voice session hears them. With "also while steady
// scrolling" chosen, the mic listens for commands only, the rest of the time.

const COMMAND_LABELS = {
	"guide-on": "guide on",
	"guide-off": "guide off",
	pause: "pause",
	go: "go",
	slower: "slower",
	faster: "faster",
	back: "back",
	next: "next section",
	top: "from the top",
	retake: "again",
	marker: "marker",
	resync: "resync",
	bigger: "bigger",
	smaller: "smaller",
	keeper: "keeper",
	scrap: "scrap that",
	reset: "reset",
	"back-to-marker": "back to the marker",
	help: "what can I say"
};

let commandListening = false;
let listeningSuspended = false;
let listeningChange = Promise.resolve();
let commandChange = Promise.resolve();
let commandConfig = "";
let commandFailure = false;
let listenerHealth = { state: "off" };
const commandPill = uiElement( "command-listening" );

function showListeningStatus( status ) {
	if ( status.type === "transcript" || status.type === "device-fallback" ) return;
	const failed = [ "failed", "error", "closed" ].includes( status.type );
	const recovering = status.type === "recovering";
	listenerHealth = { state: failed ? "failed" : recovering ? "recovering" : "listening", reason: status.reason ?? status.error ?? null, audioAt: status.audioAt ?? listenerHealth.audioAt ?? null, engineAt: status.engineAt ?? listenerHealth.engineAt ?? null };
	const label = recovering ? "Restarting listening…" : failed ? "Listening stopped · use Restart listening" : `Listening for “${ wakeLabel( settings.wakeWord ) }”`;
	if ( field( "set-listening-status" ) ) field( "set-listening-status" ).textContent = label;
	if ( commandPill ) commandPill.textContent = label;
	if ( recovering || failed ) window.electron.debugLog?.( `${ status.reason === "manual restart" ? "voice" : "error" }: speech listener ${ status.type }: ${ status.reason ?? status.error ?? "connection stopped" }` );
	if ( status.type === "recovered" ) showToast( "Listening restored", 1800 );
	if ( failed ) showToast( "Listening stopped. Use Restart listening in Prompting > Commands.", 5000 );
	sendStatus();
}

async function restartListeningNow() {
	if ( isEditMode || offScript || modelMaintenance || speechModel.downloading ) return showToast( "Finish editing, off-script mode or model maintenance before restarting listening" );
	listeningSuspended = false;
	if ( autoScrollActive ) return autoScrollHandle?.restartListening();
	if ( !wantCommandListening() && !commandFailure ) {
		showToast( "Enable Always listening in Prompting > Commands first", 3000 );
		return;
	}
	commandFailure = false;
	showListeningStatus( { type: "recovering", reason: "manual restart" } );
	await stopCommandListening();
	await syncCommandListening();
}
function restartListening() {
	listeningChange = listeningChange.catch( () => {} ).then( restartListeningNow );
	return listeningChange;
}
function toggleSessionListening() {
	listeningChange = listeningChange.catch( () => {} ).then( async () => {
		listeningSuspended = !listeningSuspended;
		if ( listeningSuspended ) {
			if ( autoScrollActive || autoScrollStarting ) await stopAutoScrollSession();
			await stopCommandListening();
			listenerHealth = { state: "off" };
			showToast( "Listening off · voice following paused · OBS keeps recording", 3000 );
		} else {
			commandFailure = false;
			await syncCommandListening();
			showToast( commandListening ? "Listening restored" : "Listening available · press Play for voice following", 3000 );
		}
		sendStatus();
	} );
	return listeningChange;
}
commandPill?.addEventListener( "click", restartListening );
uiElement( "set-listening-restart" )?.addEventListener( "click", restartListening );

// Also at a {stop} in steady scrolling, so "Prompter, go" can carry on.
// Always (Settings > Voice > Voice commands) listens for the wake word
// whenever Sightline is open, stopped or running, in either mode: in voice
// mode until you start, when the voice session takes over, so "Prompter, go"
// starts it hands-free.
function wantCommandListening() {
	const always = settings.voiceCommands === "always";
	const wanted = always || ( cuePaused && lastCue?.listen !== "off" && settings.voiceCommands !== "off" );
	return (
		wanted
		&& !listeningSuspended
		&& ( settings.scrollMode !== "voice" || always )
		&& usesLocalVoice()
		&& speechModel.installed
		&& !speechModel.downloading
		&& !isEditMode
		&& !autoScrollActive
		&& !autoScrollStarting
		&& !teachingWord
		&& !commandFailure
		&& !modelMaintenance
	);
}

// Start or stop the commands-only listener to match the settings. Changes are
// queued so a quick on-off-on can't open the mic twice.
function syncCommandListening() {
	commandChange = commandChange.then( async () => {
		const want = wantCommandListening();
		const config = JSON.stringify( [ settings.wakeWord, settings.commandWords, settings.soundAlike, audioDeviceId ] );
		if ( want === commandListening && ( !want || config === commandConfig ) ) return;
		if ( commandListening ) {
			await stopAutoScroll();
			commandListening = false;
		}
		if ( want ) {
			try {
				await startAutoScroll( {
					engine: "local",
					scriptEl: md,
					audioDeviceId,
					followScript: false,
					onCommand: runVoiceCommand,
					onWake: voiceWake,
					onMiss: voiceMiss,
					wakeWord: settings.wakeWord ?? "prompter",
					commandWords: settings.commandWords ?? [],
					soundAlike: settings.soundAlike !== false,
					isPaused: () => cuePaused,
					onHeard: ( entry ) => {
						if ( settings.traceCommands ) window.electron.appendHeardLog( { ...entry, mode: "commands" } );
					},
					onStatus: ( status ) => {
						showListeningStatus( status );
						if ( status.type === "failed" ) {
							commandFailure = true;
							stopCommandListening();
						}
					}
				} );
				commandListening = true;
				commandConfig = config;
			} catch ( err ) {
				if ( err.message !== "Listening was cancelled." ) {
					console.warn( "[voice commands] couldn't start", err );
					commandFailure = true;
					showListeningStatus( { type: "failed", reason: err.message } );
				}
			}
		} else {
			await stopAutoScroll();
			commandListening = false;
		}
		if ( commandPill ) commandPill.textContent = `🎙 Listening for “${ wakeLabel( settings.wakeWord ) }”`;
		commandPill?.classList.toggle( "hidden", !commandListening );
		if ( !want && !commandFailure && !autoScrollActive ) {
			listenerHealth = { state: "off" };
			if ( field( "set-listening-status" ) ) field( "set-listening-status" ).textContent = "Listening is off.";
		}
		sendStatus();
	} );
	return commandChange;
}

function stopCommandListening() {
	if ( !commandListening ) return commandChange;
	commandChange = commandChange.then( async () => {
		if ( !commandListening ) return;
		await stopAutoScroll();
		commandListening = false;
		commandPill?.classList.add( "hidden" );
	} );
	return commandChange;
}

// After a jump, voice scrolling picks up from the new place.
function resyncAfterJump() {
	voiceWordIdx = null;
	if ( autoScrollActive ) setTimeout( () => autoScrollHandle?.syncToViewport(), 700 );
}

// "Prompter": say so straight away, so you know it's listening for the rest.
function voiceWake() {
	if ( isEditMode ) return;
	showToast( "Listening… go · pause · again · marker", 3000 );
	window.electron.debugLog?.( "voice: wake word acknowledged" );
}

function voiceMiss( words ) {
	if ( isEditMode ) return;
	showToast( `Didn't catch that: “${ words.join( " " ) }”`, 2500 );
	window.electron.debugLog?.( "voice: wake heard; command not matched (see heard log)" );
}

// "Prompter, what can I say?": every command on a card, until the next
// command, Close or Esc. Tabs stay open while the speaker reads them.
let voiceHelpGeneration = 0;
export async function showVoiceHelp() {
	const generation = ++voiceHelpGeneration;
	let card = uiElement( "voice-help" );
	if ( !card ) {
		card = document.createElement( "div" );
		card.id = "voice-help";
		card.setAttribute( "role", "dialog" );
		card.setAttribute( "aria-label", "Voice commands" );
		const title = document.createElement( "h4" );
		title.id = "voice-help-title";
		const list = document.createElement( "div" );
		list.id = "voice-help-list";
		const close = document.createElement( "button" );
		close.type = "button";
		close.textContent = "Close";
		close.addEventListener( "click", hideVoiceHelp );
		card.append( title, list, close );
		card.addEventListener( "keydown", ( event ) => {
			if ( event.key === "Escape" ) hideVoiceHelp();
		} );
		hud.appendChild( card );
	}
	uiElement( "voice-help-title" ).textContent = `Say “${ wakeLabel( settings.wakeWord ) }”, then:`;
	renderHelpTabs( uiElement( "voice-help-list" ), voiceHelpTabs( settings ), "voice-help" );
	card.classList.remove( "hidden" );
	clearTimeout( showVoiceHelp.timer );
	await showPanelWindow( "voicehelp", card );
	if ( generation !== voiceHelpGeneration || card.classList.contains( "hidden" ) ) hidePanelWindow( "voicehelp" );
	else card.lastElementChild?.focus( { preventScroll: true } );
}

function hideVoiceHelp() {
	voiceHelpGeneration++;
	clearTimeout( showVoiceHelp.timer );
	uiElement( "voice-help" )?.classList.add( "hidden" );
	hidePanelWindow( "voicehelp" );
}

document.addEventListener( "keydown", ( e ) => {
	if ( e.key === "Escape" ) hideVoiceHelp();
} );

// "Section 3", said on its own or after "Prompter": to the start of that
// section. Said again for the section you're in, it's a retake.
function goToSpokenSection( n, voice ) {
	const anchor = document.getElementsByName( n )[0];
	if ( !anchor ) {
		showToast( `There's no section ${ n } in this script`, 2500 );
		return;
	}
	if ( pointsMode() ) {
		goToPoint( n - 1 );
		return;
	}
	pendingJumpReason = sectionOnScreen() === n ? "again" : null;
	jumpSection( n - sectionOnScreen() );
	pendingJumpReason = null;
	resyncAfterJump();
	if ( voice ) {
		clearPausePill();
		autoScrollHandle.setHold( false );
		setIndicator( "Listening" );
	}
}

// "Prompter, reset": back to the top with the speed and the pacing clock
// reset, ready for a fresh run.
function resetPrompter() {
	pacing = null;
	takeLog = new Map();
	pacingEl?.classList.add( "hidden" );
	if ( isScrolling() && !autoScrollActive ) toggleAutoScrollSession();
	runRemoteAction( "restart" );
	adjustAutoScrollSpeed( "reset" );
	resyncAfterJump();
	showToast( "Reset: back to the top, speed and clock reset", 2500 );
}

async function runVoiceCommand( id, value ) {
	if ( isEditMode ) return;
	if ( id.startsWith( "obs-" ) ) {
		if ( !settings.obsEnabled || !settings.obsControls ) return;
		runRemoteAction( id );
		return;
	}
	if ( id === "guide-on" || id === "guide-off" ) {
		hideVoiceHelp();
		window.electron.headGuide( id === "guide-on" ? "show" : "hide" );
		showToast( id === "guide-on" ? "Head guide on" : "Head guide off" );
		return;
	}
	hideVoiceHelp();
	showToast( id === "section" ? `Heard: “Section ${ value }”` : `Heard: “${ wakeLabel( settings.wakeWord ) }, ${ COMMAND_LABELS[id] ?? id }”` );
	if ( id === "help" ) {
		showVoiceHelp();
		return;
	}
	// "Prompter, close" (or cancel): hides the card, which any command does.
	if ( id === "close" ) return;
	const voice = autoScrollActive && autoScrollHandle;
	if ( id === "section" ) {
		goToSpokenSection( value, voice );
		return;
	}
	if ( id === "reset" ) {
		resetPrompter();
		return;
	}
	if ( id === "pause" ) {
		if ( holdPauseCountdown() ) return;
		if ( voice ) {
			autoScrollHandle.setHold( true );
			linkedRecording.pause();
			cancelScroll();
			setIndicator( `Paused · say “${ wakeLabel( settings.wakeWord ) }, go”` );
		} else if ( isScrolling() ) runRemoteAction( "pause" );
	} else if ( id === "go" ) {
		if ( voice && scriptCheck ) carryOnFromVoiceCheck();
		else if ( voice ) {
			if ( !await prepareReading() ) return;
			clearPausePill();
			autoScrollHandle.setHold( false );
			setIndicator( "Listening" );
		} else if ( !isScrolling() ) runRemoteAction( "play" );
	} else if ( id === "slower" || id === "faster" ) {
		const step = id === "faster" ? "faster" : "slower";
		runRemoteAction( step );
		// Steady pace moves 10 words a minute a time when spoken.
		if ( settings.scrollMode !== "voice" ) runRemoteAction( step );
	} else if ( id === "back" ) {
		runRemoteAction( "previous-section" );
		resyncAfterJump();
	} else if ( id === "next" ) {
		runRemoteAction( "next-section" );
		resyncAfterJump();
	} else if ( id === "top" ) {
		runRemoteAction( "restart" );
		resyncAfterJump();
	} else if ( id === "retake" && scriptCheck ) {
		// Held at a sound check: check again.
		startScriptSoundCheck( scriptCheck.kind, scriptCheck.pause );
	} else if ( id === "retake" ) {
		// Mark where it went wrong, then back to the start of the section.
		dropMarker();
		pendingJumpReason = "again";
		runRemoteAction( "previous-section" );
		pendingJumpReason = null;
		resyncAfterJump();
		// Voice mode: a fresh slate for the retake, once the jump has settled.
		if ( voice ) setTimeout( showSlate, 800 );
	} else if ( id === "back-to-marker" ) {
		jumpToPreviousMarker();
		if ( voice ) {
			clearPausePill();
			autoScrollHandle.setHold( false );
		}
	} else if ( id === "marker" ) {
		runRemoteAction( "marker" );
	} else if ( id === "keeper" || id === "scrap" ) {
		rateTake( id );
	} else if ( id === "resync" ) {
		if ( voice ) {
			autoScrollHandle.setHold( false );
			autoScrollHandle.resync();
			setIndicator( "Finding you… keep reading" );
			setTimeout( () => {
				if ( autoScrollActive && !autoScrollHandle?.isHeld() ) setIndicator( "Listening" );
			}, 4000 );
		} else {
			showToast( "Resync is for voice scrolling" );
		}
	} else if ( id === "bigger" ) {
		setFontSize( fontSize + FONT_SIZE_STEP );
	} else if ( id === "smaller" ) {
		setFontSize( fontSize - FONT_SIZE_STEP );
	}
}

// --- Steady scroll (fixed words per minute) ---

const countdownEl = uiElement( "countdown" );
let countdownTimer = null;

function steadyIndicatorText() {
	return `Scrolling · ${ getWpm() } wpm`;
}

function steadySessionActive() {
	return isSteadyRunning() || countdownTimer !== null || slating;
}

// --- The slate: a sync point for the edit at the start of each take ---
// A white flash (and a beep, if chosen) marks the moment; then the section and
// take number show for a second. The take log notes when it went off.

const slateEl = uiElement( "slate" );
let slating = false; // a slate is showing, and something waits for it
let slateDue = false; // the slate is about to go off: the take log waits for it
let slateTimer = null;
const slateOn = () => settings.slate === "beep" || settings.slate === "flash";

// The section the next take will be in: the one at the reading line, or the
// next one when this has been read to its end (carrying on from a stop);
// -1 at the end of the script.
function slateSection() {
	const y = readingLineY();
	const index = sectionIndexAt( y );
	const next = directivePoints.sections[index + 1];
	const left = directivePoints.wordTops.filter(
		t => t > y + 24 && t < ( next?.y ?? Infinity )
	).length;
	if ( left <= 3 && !next ) return -1; // the end of the script: no take to slate
	return Math.max( 0, left <= 3 ? index + 1 : index );
}

// The slate is a sync mark other tools detect (the Academy's production
// pipeline, slate.py). Keep these stable, or tell them first: a 1 kHz beep
// of at least 100 ms, a full-window white flash that's gone within 0.5 s,
// and no more than one slate a second.
function showSlate() {
	if ( !slateOn() || !slateEl ) return Promise.resolve();
	const index = slateSection();
	if ( index < 0 ) return Promise.resolve();
	const section = directivePoints.sections[index];
	const take = recording.nextTake( index );
	slateEl.querySelector( ".slate-take" ).textContent = section
		? `Section ${ index + 1 } · Take ${ take }`
		: `Take ${ take }`;
	slateEl.querySelector( ".slate-title" ).textContent
		= section?.heading.textContent.replace( /\{[^}]*\}/g, "" ).trim() ?? "";
	clearTimeout( slateTimer );
	slateDue = false;
	slateEl.classList.remove( "hidden" );
	slateEl.classList.add( "flash" );
	recording.slate( index );
	const slateLog = recording.data().startedAt;
	const recorded = obsUi.recordedSlate( { section: index + 1, take, title: slateEl.querySelector( ".slate-title" ).textContent, mode: settings.slate } ).then( ( result ) => {
		if ( result && recording.data().startedAt === slateLog ) recording.recordedSync( result );
		if ( result?.status === "failed" ) {
			stopSteadySession();
			stopAutoScrollSession();
			setIndicator( "Recorded slate failed · check OBS", "error" );
			return false;
		}
		return true;
	} );
	pendingRecordedSlates.add( recorded );
	recorded.then( () => pendingRecordedSlates.delete( recorded ), () => pendingRecordedSlates.delete( recorded ) );
	if ( settings.slate === "beep" ) playTone( 1000, 0.25, 0.35 );
	setTimeout( () => slateEl.classList.remove( "flash" ), 150 );
	const local = new Promise( ( resolve ) => {
		slateTimer = setTimeout( () => {
			slateEl.classList.add( "hidden" );
			resolve();
		}, 1100 );
	} );
	return Promise.all( [ local, recorded ] ).then( ( [ , ok ] ) => ok );
}

function hideSlate() {
	clearTimeout( slateTimer );
	slating = false;
	slateDue = false;
	slateEl?.classList.add( "hidden" );
}

// Run `start` after the slate (straight away when the slate is off). Stopping
// in the meantime cancels it.
function afterSlate( start ) {
	if ( !slateOn() ) {
		start();
		return;
	}
	slating = true;
	setIndicator( settings.slate === "beep" ? "Get ready · start after the beep" : "Get ready", "connecting" );
	// Scratch audio starts first, so the slate's beep is on it too.
	slateDue = true;
	syncScratchAudio( true );
	scratchChange
		.then( () => scratch.recording && new Promise( r => setTimeout( r, 300 ) ) )
		.then( () => ( slating ? showSlate() : null ) )
		.then( ( ok ) => {
			if ( !slating ) return;
			slating = false;
			if ( ok === false ) return;
			start();
		} );
}

function hideCountdown() {
	clearInterval( countdownTimer );
	countdownTimer = null;
	countdownEl?.classList.add( "hidden" );
}

async function startSteadySession() {
	if ( isEditMode ) {
		alert( "Exit the editor before starting to scroll." );
		return;
	}
	if ( !openingSoundCheck() && !await prepareReading() ) return;
	const begin = () => {
		hideCountdown();
		afterSlate( () => {
			startSteadyScroll( {
				el: md,
				wordsPerMinute: settings.steadyWpm,
				onFinished: () => {
					setIndicator( null );
					linkedRecording.finish();
				}
			} );
			startCueTracking();
			feedTakeLog( true );
			if ( settings.slate !== "beep" ) startBeep();
			setIndicator( steadyIndicatorText() );
		} );
	};
	let remaining = Math.max( 0, Math.round( settings.countdown ?? 0 ) );
	if ( !remaining || !countdownEl ) {
		begin();
		return;
	}
	countdownEl.textContent = remaining;
	countdownEl.classList.remove( "hidden" );
	countdownTimer = setInterval( () => {
		remaining--;
		if ( remaining <= 0 ) {
			begin();
		} else {
			countdownEl.textContent = remaining;
		}
	}, 1000 );
}

function stopSteadySession() {
	readingRequest++;
	linkedRecording.pause();
	hideSlate();
	clearCuePause();
	hideCountdown();
	stopSteadyScroll();
	setIndicator( null );
}

function toggleAutoScrollSession() {
	if ( preparingRead ) {
		readingRequest++;
		linkedRecording.pause();
		return;
	}
	if ( pointsMode() ) {
		togglePoints();
		return;
	}
	if ( cuePaused ) {
		resumeFromCue();
		return;
	}
	if ( offScript ) {
		backOnScript();
		return;
	}
	if ( autoScrollActive && scriptCheck ) {
		carryOnFromVoiceCheck();
		return;
	}
	if ( steadySessionActive() ) {
		stopSteadySession();
	} else if ( autoScrollActive || autoScrollStarting ) {
		stopAutoScrollSession();
	} else if ( settings.scrollMode === "voice" ) {
		startAutoScrollSession();
	} else {
		startSteadySession();
	}
}

if ( autoScrollIndicator ) {
	autoScrollIndicator.addEventListener( "click", () => {
		stopSteadySession();
		stopAutoScrollSession();
	} );
}

window.electron.onToggleAutoScroll( toggleAutoScrollSession );
window.electron.onDeepgramKey( ( payload ) => {
	pendingDeepgramKey = payload;
	tryStartFlow();
} );

// --- API key modal ---

function showApiKeyModal() {
	if ( !apiKeyModal ) return;
	apiKeyInput.value = "";
	apiKeyModal.classList.remove( "hidden" );
	setTimeout( () => apiKeyInput.focus(), 0 );
}

function hideApiKeyModal() {
	if ( !apiKeyModal ) return;
	apiKeyModal.classList.add( "hidden" );
	apiKeyInput.value = "";
}

if ( apiKeySaveBtn ) {
	apiKeySaveBtn.addEventListener( "click", () => {
		const value = apiKeyInput.value.trim();
		if ( !value ) return;
		window.electron.setDeepgramKey( value );
		hideApiKeyModal();
	} );
}

if ( apiKeyCancelBtn ) {
	apiKeyCancelBtn.addEventListener( "click", () => {
		pendingStartAfterKeySave = false;
		hideApiKeyModal();
	} );
}

if ( apiKeyClearBtn ) {
	apiKeyClearBtn.addEventListener( "click", () => {
		pendingStartAfterKeySave = false;
		window.electron.setDeepgramKey( "" );
		hideApiKeyModal();
	} );
}

if ( apiKeyInput ) {
	apiKeyInput.addEventListener( "keydown", ( e ) => {
		if ( e.key === "Enter" ) {
			apiKeySaveBtn?.click();
		} else if ( e.key === "Escape" ) {
			apiKeyCancelBtn?.click();
		}
	} );
}

window.electron.onMenuSetDeepgramKey( () => {
	pendingStartAfterKeySave = false;
	showApiKeyModal();
} );

window.electron.onDeepgramKeySaved( ( payload ) => {
	if ( pendingStartAfterKeySave && payload.hasKey ) {
		pendingStartAfterKeySave = false;
		startAutoScrollSession();
	}
} );

// --- Auto-scroll speed control ---

function applyAutoScrollSpeed( value, save = true ) {
	const clamped = Math.max( SCROLL_SPEED_MIN, Math.min( SCROLL_SPEED_MAX, value ) );
	autoScrollSpeed = Math.round( clamped * 100 ) / 100;
	setScrollSpeed( autoScrollSpeed );
	if ( save ) {
		window.electron.saveAutoScrollSpeed( autoScrollSpeed );
	}
}

function showTransientHint( text, durationMs ) {
	if ( !autoScrollIndicator ) return;
	autoScrollIndicator.textContent = text;
	autoScrollIndicator.classList.remove( "hidden", "connecting", "error" );
	if ( speedHintTimer ) clearTimeout( speedHintTimer );
	speedHintTimer = setTimeout( () => {
		speedHintTimer = null;
		if ( isSteadyRunning() ) {
			setIndicator( steadyIndicatorText() );
		} else if ( autoScrollActive ) {
			setIndicator( "Listening" );
		} else if ( autoScrollStarting ) {
			setIndicator( "Connecting…", "connecting" );
		} else {
			setIndicator( null );
		}
	}, durationMs );
}

function showSpeedHint() {
	const text = `Speed ${ autoScrollSpeed.toFixed( 2 ).replace( /\.?0+$/, "" ) }×`;
	showTransientHint( text, SPEED_HINT_MS );
}

function adjustAutoScrollSpeed( action ) {
	if ( settings.scrollMode !== "voice" ) {
		const wpm
			= action === "up"
				? settings.steadyWpm + WPM_STEP
				: action === "down"
					? settings.steadyWpm - WPM_STEP
					: action === "reset"
						? 140
						: null;
		if ( wpm === null ) return;
		settings.steadyWpm = setWpm( wpm );
		window.electron.saveSettings( { steadyWpm: settings.steadyWpm } );
		showTransientHint( `${ settings.steadyWpm } wpm`, SPEED_HINT_MS );
		return;
	}
	if ( action === "up" ) {
		applyAutoScrollSpeed( autoScrollSpeed + SCROLL_SPEED_STEP );
	} else if ( action === "down" ) {
		applyAutoScrollSpeed( autoScrollSpeed - SCROLL_SPEED_STEP );
	} else if ( action === "reset" ) {
		applyAutoScrollSpeed( SCROLL_SPEED_DEFAULT );
	} else {
		return;
	}
	showSpeedHint();
}

window.electron.onAutoScrollSpeed( ( value ) => {
	applyAutoScrollSpeed( value, false );
} );

window.electron.onMenuAdjustAutoScrollSpeed( adjustAutoScrollSpeed );

// --- Microphone selection ---

async function populateMicSelect() {
	if ( !micSelect ) return;
	let devices = [];
	try {
		devices = await navigator.mediaDevices.enumerateDevices();
	} catch ( err ) {
		console.warn( "[mic] enumerateDevices failed", err );
	}
	const inputs = devices.filter( d => d.kind === "audioinput" );
	micSelect.innerHTML = "";

	const defaultOpt = document.createElement( "option" );
	defaultOpt.value = "";
	defaultOpt.textContent = "System default";
	micSelect.appendChild( defaultOpt );

	let hasLabels = false;
	let matchedSelection = false;
	for ( const d of inputs ) {
		const opt = document.createElement( "option" );
		opt.value = d.deviceId;
		opt.textContent = d.label || `Microphone (${ d.deviceId.slice( 0, 6 ) }…)`;
		if ( d.label ) hasLabels = true;
		if ( d.deviceId === audioDeviceId ) {
			opt.selected = true;
			matchedSelection = true;
		}
		micSelect.appendChild( opt );
	}
	if ( !matchedSelection ) {
		defaultOpt.selected = true;
	}

	if ( inputs.length === 0 ) {
		micHint.textContent = "No microphones detected.";
	} else if ( !hasLabels ) {
		micHint.textContent
			= "Start auto-scroll once and grant mic access to see device names.";
	} else {
		micHint.textContent
			= "Used by auto-scroll for speech recognition. Takes effect next time auto-scroll starts.";
	}
}

function showMicModal() {
	if ( !micModal ) return;
	populateMicSelect();
	micModal.classList.remove( "hidden" );
	setTimeout( () => micSelect?.focus(), 0 );
}

function hideMicModal() {
	micModal?.classList.add( "hidden" );
}

if ( micSaveBtn ) {
	micSaveBtn.addEventListener( "click", () => {
		const value = micSelect.value || "";
		audioDeviceId = value || null;
		window.electron.setAudioDeviceId( value );
		hideMicModal();
	} );
}

if ( micCancelBtn ) {
	micCancelBtn.addEventListener( "click", hideMicModal );
}

if ( micSelect ) {
	micSelect.addEventListener( "keydown", ( e ) => {
		if ( e.key === "Enter" ) micSaveBtn?.click();
		else if ( e.key === "Escape" ) hideMicModal();
	} );
}

if ( navigator.mediaDevices?.addEventListener ) {
	navigator.mediaDevices.addEventListener( "devicechange", () => {
		if ( micModal && !micModal.classList.contains( "hidden" ) ) {
			populateMicSelect();
		}
	} );
}

window.electron.onMenuSelectMicrophone( showMicModal );
window.electron.onAudioDeviceId( ( payload ) => {
	audioDeviceId = payload?.deviceId || null;
} );
window.electron.getAudioDeviceId();

// --- Recording settings ---

const readingMarker = uiElement( "reading-marker" );

// Half the height of a line of script text, in ems of the page's text size:
// the scroll puts the top of the text on the reading line, so the arrow sits
// this far below it, at the middle of the words. Fonts differ (OpenDyslexic is
// taller than Arial), so it's measured.
// Half the spacing of a line of text, from the first paragraph that shows
// (not a hidden settings line), in em of the script's size.
function halfTextHeightEm() {
	const px = parseFloat( getComputedStyle( document.body ).fontSize );
	const p = [ ...( md?.querySelectorAll( "p, li" ) ?? [] ) ].find( el => el.offsetHeight );
	const lineHeight = p ? parseFloat( getComputedStyle( p ).lineHeight ) : NaN;
	return px && lineHeight > 0 ? lineHeight / px / 2 : 0.65;
}

// A font that finishes loading changes the height of the text.
document.fonts?.addEventListener( "loadingdone", () => updateReadingMarker() );

function updateReadingMarker() {
	if ( !readingMarker ) return;
	readingMarker.style.top = `calc(${ getReadingAnchor() * 100 }vh + ${ halfTextHeightEm().toFixed( 3 ) }em)`;
	readingMarker.classList.toggle( "hidden", !settings.showReadingMarker );
	if ( settings.focusBand ) updateEdgeMask();
}

function rerenderScript() {
	if ( !lastScriptHtml ) return;
	const y = window.scrollY;
	if ( autoScrollActive ) stopAutoScrollSession();
	renderScript( lastScriptHtml );
	ignoreNextScroll = true;
	window.scrollTo( 0, y );
}

function applySettings( next ) {
	const prev = settings;
	settings = { ...settings, ...next };
	if ( prev.voiceCommands !== settings.voiceCommands ) commandFailure = false;
	autoScrollHandle?.setCommandOptions( { onCommand: settings.voiceCommands === "off" ? null : runVoiceCommand, wakeWord: settings.wakeWord ?? "prompter", commandWords: settings.commandWords ?? [], soundAlike: settings.soundAlike !== false } );
	syncPadSettings( settings.padLayout );
	mappingSettings?.sync( settings.inputMappings );
	const body = document.body;
	body.classList.remove(
		"directions-dim",
		"directions-hide",
		"directions-normal"
	);
	body.classList.add( `directions-${ settings.directions ?? "dim" }` );
	body.classList.toggle( "cues-on", !!settings.highlightCues );
	body.classList.toggle( "eye-line", !!settings.eyeLine );
	setReadingAnchor(
		( settings.eyeLine ? settings.eyeLineReadingLine : settings.readingLine )
		/ 100
	);
	updateReadingMarker();
	// Again once the new font and size are laid out.
	requestAnimationFrame( () => updateReadingMarker() );
	setWpm( settings.steadyWpm );
	if ( isSteadyRunning() ) setIndicator( steadyIndicatorText() );
	const engineChanged = prev.voiceEngine !== settings.voiceEngine;
	if ( prev.scrollMode !== settings.scrollMode || engineChanged ) {
		stopSteadySession();
		stopAutoScrollSession();
	}
	setSentenceHighlight( settings.highlightSentence !== false );
	// Voice mode shows timed pauses as beat marks, since it doesn't count them down.
	document.body.classList.toggle( "voice-scroll", settings.scrollMode === "voice" );
	if ( prev.highlightCues !== settings.highlightCues ) rerenderScript();
	applyDisplayClasses();
	if ( prev.pointsMode !== settings.pointsMode ) applyPointsView();
	applyLayout();
	syncControls();
	refreshControlsVisibility();
	updateSentence();
	syncCommandListening();
}

window.electron.onSettings( applySettings );
window.electron.onCuePhrases( ( phrases ) => {
	cuePhrases = Array.isArray( phrases ) ? phrases : [];
	rerenderScript();
} );

window.addEventListener( "resize", () => {
	updateReadingMarker();
	if ( isSteadyRunning() ) recalculateSteady();
} );

// Rich files (.rtf, .docx, .pdf) and Google Docs are edited where they came
// from; the watcher (or File > Reload from Google Docs) brings the changes in.
const EDIT_ELSEWHERE = {
	google: name => `${ name } comes from Google Docs, so edit it there. Sightline fetches the latest version each time you open it, or choose File > Reload from Google Docs.`,
	pdf: name => `${ name } is a PDF, so it can't be edited here. Change the original document and save the PDF again: the teleprompter reloads it.`,
	rich: name => `${ name } is a rich-text or Word file, so edit it in Word or WordPad. The teleprompter reloads it each time you save.`
};
window.electron.onEditorUnavailable( ( fileName, kind ) => {
	isEditMode = false;
	window.electron.resumeWatcher();
	alert( ( EDIT_ELSEWHERE[kind] ?? EDIT_ELSEWHERE.rich )( fileName ) );
} );

// --- Open a Google Doc ---

const gdocModal = uiElement( "gdoc-modal" );
const gdocInput = uiElement( "gdoc-input" );
const gdocError = uiElement( "gdoc-error" );
const gdocOpenBtn = uiElement( "gdoc-open" );
const GOOGLE_DOC_LINK = /docs\.google\.com\/document\//;

function showGdocError( text ) {
	gdocError.textContent = text;
	gdocError.classList.toggle( "hidden", !text );
}

function showGoogleDocDialog( link = "" ) {
	gdocInput.value = link;
	showGdocError( "" );
	gdocOpenBtn.disabled = false;
	gdocModal.classList.remove( "hidden" );
	setTimeout( () => gdocInput.focus(), 0 );
}

function hideGoogleDocDialog() {
	gdocModal.classList.add( "hidden" );
}

function openGoogleDoc( link ) {
	if ( !GOOGLE_DOC_LINK.test( link ) ) {
		showGdocError( "That doesn't look like a Google Docs link. Copy it from the address bar or from Share > Copy link" );
		return;
	}
	showGdocError( "" );
	gdocOpenBtn.disabled = true;
	gdocOpenBtn.textContent = "Opening…";
	window.electron.openGoogleDoc( link.trim() );
}

window.electron.onGoogleDocResult( ( { ok, message } ) => {
	gdocOpenBtn.disabled = false;
	gdocOpenBtn.textContent = "Open";
	if ( ok ) hideGoogleDocDialog();
	else if ( !gdocModal.classList.contains( "hidden" ) ) showGdocError( message );
	else showToast( message );
} );
window.electron.onShowGoogleDocDialog( () => showGoogleDocDialog() );
gdocOpenBtn.addEventListener( "click", () => openGoogleDoc( gdocInput.value ) );
uiElement( "gdoc-cancel" ).addEventListener( "click", hideGoogleDocDialog );
gdocInput.addEventListener( "keydown", ( e ) => {
	e.stopPropagation();
	if ( e.key === "Enter" ) gdocOpenBtn.click();
	else if ( e.key === "Escape" ) hideGoogleDocDialog();
} );

// --- Settings page ---

const settingsModal = uiElement( "settings-modal" );
const field = id => uiElement( id );
let settingsSnapshot = null;
let settingsReturnFocus = null;

function numberValue( id, min, max, fallback ) {
	const value = Number( field( id ).value );
	return Number.isFinite( value )
		? Math.min( max, Math.max( min, value ) )
		: fallback;
}

// Changes made since Settings opened or was last applied. The Layout,
// Reading and Recording tabs apply as you go, so they don't count.
let settingsDirty = false;
let afterSettingsClose = null;
const LIVE_TABS = "#set-layout-host, #set-theme-host, #set-reading-host, #set-directions-host, #set-production-notes-host, #set-background-host, #set-aids-host, #set-display-host, #set-recording-host, #set-script-host, #set-pad-fieldset, #set-capture-fieldset, #set-mapping-fieldset";

field( "set-capture-override" )?.addEventListener( "change", event => window.electron.setCaptureOverride( event.target.checked ) );
field( "capture-override-off" )?.addEventListener( "click", () => window.electron.setCaptureOverride( false ) );
window.electron.onCaptureOverride( ( active ) => {
	field( "set-capture-override" ).checked = active;
	field( "capture-override-note" ).classList.toggle( "hidden", !active );
} );
window.electron.getCaptureOverride();

function markSettingsDirty( event ) {
	if ( !event.isTrusted || event.target.closest( LIVE_TABS ) ) return;
	if ( !event.target.matches( "input, select, textarea" ) ) return;
	wordsChanged();
}

// Each step of opening Settings goes in sightline.log, so if it freezes, the
// last line says where. (Looking into a freeze on Joanne's computer.)
// (main.js only keeps them in debug mode, Settings > Debug.)
const settingsTrail = step => window.electron.debugLog?.( `settings: ${ step }` );

uiElement( "settings-save-log" )?.addEventListener( "click", async () => {
	const saved = await window.electron.saveSupportLog();
	if ( saved ) showToast( "Log saved: attach it to your GitHub issue or email", 3500 );
} );

async function openSettings() {
	if ( !settingsModal ) return;
	if ( !settingsModal.classList.contains( "hidden" ) ) {
		await showPanelWindow( "settings", settingsModal, () => settingsPages.layout() );
		return;
	}
	settingsReturnFocus = document.activeElement;
	closePanels();
	settingsTrail( "opening" );
	settingsSnapshot = { fontSize, opacity };
	settingsDirty = false;
	window.electron.utilityPanel( "settings", "dirty", false );
	field( "settings-unsaved" )?.classList.add( "hidden" );
	if ( field( "settings-applied" ) ) field( "settings-applied" ).textContent = "";
	field( "settings-applied" )?.removeAttribute( "data-pending" );
	field( "set-scroll-mode" ).value = settings.scrollMode ?? "steady";
	field( "set-steady-wpm" ).value = settings.steadyWpm;
	field( "set-countdown" ).value = settings.countdown;
	field( "set-slate" ).value = settings.slate ?? "off";
	for ( const radio of settingsModal.querySelectorAll( "input[name=slate-choice]" ) ) radio.checked = radio.value === field( "set-slate" ).value;
	field( "set-voice-speed" ).value = autoScrollSpeed;
	field( "set-voice-engine" ).value = usesLocalVoice() ? "local" : "deepgram";
	field( "set-voice-commands" ).value = settings.voiceCommands ?? "voice";
	field( "set-wake-word" ).value = settings.wakeWord ?? "prompter";
	field( "set-scratch-audio" ).checked = settings.scratchAudio === true;
	field( "set-coach-fillers" ).checked = settings.coachFillers === true;
	field( "set-take-loudness" ).value = settings.takeLoudness ?? "voice";
	field( "set-sound-check-takes" ).checked = settings.soundCheckDuringTakes === true;
	field( "set-sound-alike" ).checked = settings.soundAlike !== false;
	settingsTrail( "scrolling and voice fields filled" );
	fillWordRows( settings.wordFixes ?? [] );
	fillCommandRows( settings.commandWords ?? [] );
	settingsTrail( "your words filled" );
	showVoiceEngineFields();
	window.electron.speechModelStatus();
	field( "set-deepgram-key" ).value = "";
	field( "set-deepgram-status" ).textContent = settings.hasDeepgramKey
		? "A key is saved. Type a new one to replace it; Clear in Tools > Voice and microphone removes it."
		: "No key saved. Only needed for Deepgram.";
	field( "set-font-size" ).value = fontSize;
	field( "set-directions" ).value = settings.directions ?? "dim";
	field( "set-trace-commands" ).checked = settings.traceCommands === true;
	field( "set-always-on-top" ).checked = !!settings.alwaysOnTop;
	field( "set-check-updates" ).checked = settings.checkUpdates !== false;
	field( "set-debug-mode" ).checked = settings.debugMode !== false;
	settingsTrail( "display fields filled; asking for monitors" );
	window.electron.getDisplays();
	field( "set-highlight-cues" ).checked = !!settings.highlightCues;
	field( "set-cues-file" ).value = settings.cuesFile ?? "";
	field( "set-eye-line" ).checked = !!settings.eyeLine;
	field( "set-eye-line-width" ).value = settings.eyeLineWidth;
	field( "set-eye-line-height" ).value = settings.eyeLineHeight;
	field( "set-eye-line-reading" ).value = settings.eyeLineReadingLine;
	field( "set-remote" ).checked = !!settings.remoteControl;
	obsUi.fill();
	field( "set-stream-deck" ).checked = !!settings.streamDeck;
	field( "set-remote-delete" ).checked = !!settings.remoteDeleteRecordings;
	field( "set-remote-port" ).value = settings.remotePort ?? 47615;
	componentAvailability?.fill();
	window.electron.getRemoteInfo();
	field( "set-phone" ).checked = !!settings.phoneRemote;
	window.electron.getPhoneInfo();
	settingsTrail( `showing tab ${ lastSettingsTab() }` );
	showSettingsTab( lastSettingsTab() );
	settingsModal.classList.remove( "hidden" );
	await showPanelWindow( "settings", settingsModal, () => settingsPages.layout() );
	settingsNavigation.focus();
	settingsTrail( "visible" );
	requestAnimationFrame( () => requestAnimationFrame( () => settingsTrail( "painted" ) ) );
	requestAnimationFrame( () => settingsPages.layout() );
	settingsTrail( "listing microphones" );
	await populateMicSelect();
	field( "set-microphone" ).innerHTML = micSelect.innerHTML;
	field( "set-microphone" ).value = audioDeviceId ?? "";
	settingsTrail( "done" );
}

// Errors in the page go in sightline.log too.
window.addEventListener( "error", e => window.electron.debugLog?.( `error: ${ e.message } (${ String( e.filename ).split( "/" ).pop() }:${ e.lineno })` ) );
window.addEventListener( "unhandledrejection", e => window.electron.debugLog?.( `unhandled rejection: ${ e.reason?.stack ?? e.reason }` ) );

window.electron.onDisplays( ( displays ) => {
	const select = field( "set-prompter-display" );
	if ( !select ) return;
	select.innerHTML = "";
	select.append( new Option( "Leave it where it is", "" ) );
	for ( const d of displays )
		select.append( new Option( `Full screen on ${ d.label }`, String( d.id ) ) );
	const chosen = settings.prompterDisplay;
	if ( chosen != null && !displays.some( d => d.id === chosen ) ) {
		select.append(
			new Option( "The monitor chosen before (not connected)", String( chosen ) )
		);
	}
	select.value = chosen == null ? "" : String( chosen );
} );

// Settings > Voice shows the model download for on-device recognition, or the
// key for Deepgram, whichever is chosen.
function showVoiceEngineFields() {
	const local = field( "set-voice-engine" ).value !== "deepgram";
	for ( const el of settingsModal.querySelectorAll( ".voice-local-only" ) )
		el.classList.toggle( "hidden", !local );
	for ( const el of settingsModal.querySelectorAll( ".voice-deepgram-only" ) )
		el.classList.toggle( "hidden", local );
}

field( "set-voice-engine" )?.addEventListener( "change", showVoiceEngineFields );
field( "set-speech-model-get" )?.addEventListener( "click", () => window.electron.speechModelDownload() );

// Close, but ask first when there are changes that haven't been saved.
// then: what to do once it's closed (open the About page, a file…).
function requestCloseSettings( then = null ) {
	if ( settingsModal?.classList.contains( "hidden" ) ) {
		then?.();
		return;
	}
	if ( settingsDirty ) {
		afterSettingsClose = then;
		field( "settings-unsaved" ).classList.remove( "hidden" );
		field( "settings-unsaved-keep" ).focus();
		return;
	}
	closeSettings( true );
	then?.();
}

async function finishSettingsClose( save ) {
	mappingSettings?.cancel();
	const then = afterSettingsClose;
	afterSettingsClose = null;
	field( "settings-unsaved" ).classList.add( "hidden" );
	if ( save ) {
		if ( !await saveSettingsPage() ) {
			afterSettingsClose = then;
			return;
		}
	} else closeSettings( true );
	then?.();
}

function closeSettings( restore ) {
	settingsDirty = false;
	window.electron.utilityPanel( "settings", "dirty", false );
	if ( restore && settingsSnapshot ) {
		setFontSize( settingsSnapshot.fontSize, false );
		setOpacity( settingsSnapshot.opacity, false );
	}
	settingsSnapshot = null;
	returnLayoutPanel();
	settingsModal?.classList.add( "hidden" );
	hidePanelWindow( "settings" );
	const target = settingsReturnFocus?.isConnected && settingsReturnFocus.getClientRects().length ? settingsReturnFocus : field( "cb-settings" );
	target?.focus( { preventScroll: true } );
}

// Save and close (Save), or save and stay (Apply).
// --- Settings > Voice > Your words: what it mishears (word-fixes.js) ---

const wordsList = field( "words-list" );
let teachingWord = false;

function wordsChanged() {
	settingsDirty = true;
	window.electron.utilityPanel( "settings", "dirty", true );
	field( "settings-applied" ).textContent = "Unsaved changes";
	field( "settings-applied" ).dataset.pending = "true";
}

function addWordRow( word = "", heard = [] ) {
	const row = document.createElement( "div" );
	row.className = "word-row";
	const wordInput = Object.assign( document.createElement( "input" ), {
		type: "text", className: "wf-word", value: word, placeholder: "Your word", maxLength: 60
	} );
	wordInput.setAttribute( "aria-label", "Your word" );
	const heardInput = Object.assign( document.createElement( "input" ), {
		type: "text", className: "wf-heard", value: heardForms( heard ).join( ", " ),
		placeholder: "What it hears, such as marsha, mosher"
	} );
	heardInput.setAttribute( "aria-label", "What it hears instead" );
	const teach = Object.assign( document.createElement( "button" ), {
		type: "button", className: "wf-teach", textContent: "Teach…",
		title: "Say the word a few times, with a pause between, and it adds what it hears"
	} );
	teach.addEventListener( "click", () => teachWord( row ) );
	const remove = Object.assign( document.createElement( "button" ), {
		type: "button", className: "wf-remove", textContent: "×", title: "Remove"
	} );
	remove.setAttribute( "aria-label", "Remove this word" );
	remove.addEventListener( "click", () => {
		row.remove();
		wordsChanged();
	} );
	row.append( wordInput, Object.assign( document.createElement( "span" ), { textContent: "heard as" } ), heardInput, teach, remove );
	wordsList.append( row );
	return row;
}

function fillWordRows( fixes ) {
	wordsList.innerHTML = "";
	for ( const fix of fixes ) addWordRow( fix.word, fix.heard );
	field( "words-suggestions" ).hidden = true;
}

function readWordRows() {
	return [ ...wordsList.querySelectorAll( ".word-row" ) ]
		.map( row => ( {
			word: row.querySelector( ".wf-word" ).value.trim(),
			heard: heardForms( row.querySelector( ".wf-heard" ).value )
		} ) )
		.filter( fix => fix.word && fix.heard.length );
}

// Add heard forms to a word's row, making the row if there isn't one.
function addHeardForms( word, forms ) {
	const target = normalizeWord( word );
	let row = [ ...wordsList.querySelectorAll( ".word-row" ) ]
		.find( r => normalizeWord( r.querySelector( ".wf-word" ).value ) === target );
	row ??= addWordRow( word );
	const input = row.querySelector( ".wf-heard" );
	const all = heardForms( [ ...heardForms( input.value ), ...forms ] ).filter( f => f.replace( / /g, "" ) !== target );
	input.value = all.join( ", " );
	wordsChanged();
	return row;
}

field( "words-add" ).addEventListener( "click", () => {
	const row = addWordRow();
	row.scrollIntoView( { block: "nearest" } );
	row.querySelector( ".wf-word" ).focus();
} );

field( "words-suggest" ).addEventListener( "click", async () => {
	const box = field( "words-suggestions" );
	box.hidden = false;
	box.textContent = "Looking through what it heard…";
	const { logs, suggestions } = await window.electron.heardSuggestions();
	box.innerHTML = "";
	if ( !logs ) {
		box.textContent = "Nothing heard yet. Read a script in voice mode, then try again.";
		return;
	}
	if ( !suggestions.length ) {
		box.textContent = "No word misheard more than once. Nothing to fix.";
		return;
	}
	for ( const { heard, word, count } of suggestions ) {
		const line = document.createElement( "div" );
		line.className = "suggestion";
		line.append( Object.assign( document.createElement( "span" ), {
			textContent: `“${ heard }” for “${ word }”, ${ count } times`
		} ) );
		const add = Object.assign( document.createElement( "button" ), { type: "button", textContent: "Add" } );
		add.addEventListener( "click", () => {
			addHeardForms( word, [ heard ] );
			line.remove();
			if ( !box.querySelector( ".suggestion" ) ) box.hidden = true;
		} );
		line.append( add );
		box.append( line );
	}
} );

// Teach…: listen for a few seconds while the word is said, with a pause
// between each time, and add each phrase heard. Local speech only.
async function teachWord( row ) {
	const word = row.spokenWord?.() ?? row.querySelector( ".wf-word" ).value.trim();
	if ( !word ) {
		showToast( "Type the word first", 2000 );
		return;
	}
	if ( teachingWord ) return;
	if ( autoScrollActive || autoScrollStarting ) {
		showToast( "Stop voice scrolling first", 2500 );
		return;
	}
	if ( !usesLocalVoice() || !speechModel.installed ) {
		showToast( "Teaching needs the speech model on this computer (Speech recognition, above)", 3500 );
		return;
	}
	teachingWord = true;
	const button = row.querySelector( ".wf-teach" );
	row.classList.add( "teaching" );
	await stopCommandListening();
	const phrases = [];
	let phrase = [];
	try {
		await startAutoScroll( {
			engine: "local",
			scriptEl: md,
			audioDeviceId,
			followScript: false,
			onHeard: ( { heard, final } ) => {
				phrase.push( heard );
				if ( final ) {
					phrases.push( phrase.join( " " ) );
					phrase = [];
				}
			}
		} );
		for ( let left = 8; left > 0; left-- ) {
			button.textContent = `Say “${ word }”… ${ left }`;
			await new Promise( r => setTimeout( r, 1000 ) );
		}
	} catch ( err ) {
		console.warn( "[teach]", err );
		showToast( "Couldn't start the microphone", 2500 );
	} finally {
		await stopAutoScroll();
		if ( phrase.length ) phrases.push( phrase.join( " " ) );
		teachingWord = false;
		row.classList.remove( "teaching" );
		button.textContent = "Teach…";
		syncCommandListening();
	}
	const target = normalizeWord( word );
	// Leave out anything that has the word right ("for a manager").
	const forms = heardForms( phrases ).filter( f => f.replace( / /g, "" ) !== target && !f.split( " " ).includes( target ) );
	if ( !phrases.length ) {
		showToast( "Didn't hear anything. Check the microphone, then try again", 3000 );
	} else if ( !forms.length ) {
		showToast( `It heard “${ word }” right every time`, 3000 );
	} else {
		if ( row.addForms ) row.addForms( forms );
		else addHeardForms( word, forms );
		showToast( `Added: ${ forms.join( ", " ) }`, 3000 );
	}
}

// Command words: your own forms of the wake word and the commands.
const commandWordsList = field( "command-words-list" );
// What to say for each, in the list and for Teach….
const COMMAND_SAY = { next: "next section", top: "from the top", retake: "again", scrap: "scrap that", help: "what can I say" };
const commandSay = id => ( id === "wake" ? wakeLabel( settings.wakeWord ) : COMMAND_SAY[id] ?? COMMANDS.find( c => c.id === id )?.phrases[0] ?? id );

function addCommandRow( id = "wake", heard = [] ) {
	const row = document.createElement( "div" );
	row.className = "word-row";
	const select = document.createElement( "select" );
	select.className = "wf-command";
	select.setAttribute( "aria-label", "Wake word or command" );
	const group = ( label, values ) => {
		const g = Object.assign( document.createElement( "optgroup" ), { label } );
		for ( const value of values ) g.append( new Option( commandSay( value ), value, false, value === id ) );
		select.append( g );
	};
	group( "Wake word", [ "wake" ] );
	group( "Commands", COMMANDS.map( c => c.id ) );
	const heardInput = Object.assign( document.createElement( "input" ), {
		type: "text", className: "wf-heard", value: heardForms( heard ).join( ", " ),
		placeholder: "What it hears, such as prompt her"
	} );
	heardInput.setAttribute( "aria-label", "What it hears instead" );
	const teach = Object.assign( document.createElement( "button" ), {
		type: "button", className: "wf-teach", textContent: "Teach…",
		title: "Say it a few times, with a pause between, and it adds what it hears"
	} );
	teach.addEventListener( "click", () => teachWord( row ) );
	const remove = Object.assign( document.createElement( "button" ), {
		type: "button", className: "wf-remove", textContent: "×", title: "Remove"
	} );
	remove.setAttribute( "aria-label", "Remove this command word" );
	remove.addEventListener( "click", () => {
		row.remove();
		wordsChanged();
	} );
	row.spokenWord = () => commandSay( select.value );
	row.addForms = ( forms ) => {
		const target = normalizeWord( commandSay( select.value ) );
		heardInput.value = heardForms( [ ...heardForms( heardInput.value ), ...forms ] )
			.filter( f => f.replace( / /g, "" ) !== target ).join( ", " );
		wordsChanged();
	};
	row.append( select, Object.assign( document.createElement( "span" ), { textContent: "heard as" } ), heardInput, teach, remove );
	commandWordsList.append( row );
	return row;
}

function fillCommandRows( entries ) {
	commandWordsList.innerHTML = "";
	for ( const entry of entries ) addCommandRow( entry.id, entry.heard );
}

function readCommandRows() {
	return [ ...commandWordsList.querySelectorAll( ".word-row" ) ]
		.map( row => ( { id: row.querySelector( ".wf-command" ).value, heard: heardForms( row.querySelector( ".wf-heard" ).value ) } ) )
		.filter( entry => entry.heard.length );
}

field( "command-words-add" ).addEventListener( "click", () => {
	const row = addCommandRow();
	row.scrollIntoView( { block: "nearest" } );
	row.querySelector( "select" ).focus();
} );

async function saveSettingsPage( close = true ) {
	const invalid = [ ...settingsModal.querySelectorAll( "input, select, textarea" ) ]
		.find( control => !control.disabled && control.willValidate && !control.checkValidity() );
	if ( invalid ) {
		showSettingsTab( invalid.closest( "[data-settings-page]" ).dataset.settingsPage );
		settingsPages.reveal( invalid );
		invalid.reportValidity();
		return false;
	}
	if ( !await obsUi.save() ) return false;
	window.electron.saveSettings( {
		scrollMode: field( "set-scroll-mode" ).value === "voice" ? "voice" : "steady",
		voiceEngine: field( "set-voice-engine" ).value === "deepgram" ? "deepgram" : "local",
		voiceCommands: field( "set-voice-commands" ).value,
		wakeWord: field( "set-wake-word" ).value,
		scratchAudio: field( "set-scratch-audio" ).checked,
		coachFillers: field( "set-coach-fillers" ).checked,
		takeLoudness: field( "set-take-loudness" ).value,
		soundCheckDuringTakes: field( "set-sound-check-takes" ).checked,
		soundAlike: field( "set-sound-alike" ).checked,
		wordFixes: readWordRows(),
		commandWords: readCommandRows(),
		steadyWpm: numberValue( "set-steady-wpm", 60, 300, settings.steadyWpm ),
		countdown: numberValue( "set-countdown", 0, 10, settings.countdown ),
		slate: field( "set-slate" ).value,
		directions: field( "set-directions" ).value,
		traceCommands: field( "set-trace-commands" ).checked,
		alwaysOnTop: field( "set-always-on-top" ).checked,
		checkUpdates: field( "set-check-updates" ).checked,
		debugMode: field( "set-debug-mode" ).checked,
		prompterDisplay: field( "set-prompter-display" ).value
			? Number( field( "set-prompter-display" ).value )
			: null,
		highlightCues: field( "set-highlight-cues" ).checked,
		cuesFile: field( "set-cues-file" ).value || null,
		eyeLine: field( "set-eye-line" ).checked,
		eyeLineWidth: numberValue(
			"set-eye-line-width",
			20,
			100,
			settings.eyeLineWidth
		),
		eyeLineHeight: numberValue(
			"set-eye-line-height",
			15,
			100,
			settings.eyeLineHeight
		),
		eyeLineReadingLine: numberValue(
			"set-eye-line-reading",
			5,
			80,
			settings.eyeLineReadingLine
		),
		remoteControl: field( "set-remote" ).checked,
		streamDeck: field( "set-stream-deck" ).checked,
		remoteDeleteRecordings: field( "set-remote-delete" ).checked,
		phoneRemote: field( "set-phone" ).checked,
		remotePort: numberValue(
			"set-remote-port",
			1024,
			65535,
			settings.remotePort ?? 47615
		)
	} );
	setFontSize( Number( field( "set-font-size" ).value ) );
	applyAutoScrollSpeed( Number( field( "set-voice-speed" ).value ) );
	const key = field( "set-deepgram-key" ).value.trim();
	if ( key ) {
		window.electron.setDeepgramKey( key );
	}
	const mic = field( "set-microphone" ).value || null;
	if ( mic !== audioDeviceId ) {
		audioDeviceId = mic;
		window.electron.setAudioDeviceId( mic ?? "" );
	}
	settingsDirty = false;
	if ( close ) {
		window.electron.utilityPanel( "settings", "dirty", false );
		closeSettings( false );
		return true;
	}
	// Applied: Cancel now goes back to these, not to how it was when opened.
	window.electron.utilityPanel( "settings", "dirty", false );
	settingsSnapshot = { fontSize, opacity };
	field( "set-deepgram-key" ).value = "";
	field( "settings-applied" ).textContent = "Saved";
	field( "settings-applied" ).removeAttribute( "data-pending" );
	return true;
}

if ( settingsModal ) {
	for ( const radio of settingsModal.querySelectorAll( "input[name=slate-choice]" ) ) radio.addEventListener( "change", () => {
		if ( radio.checked ) field( "set-slate" ).value = radio.value;
	} );
	// Preview text size while its slider moves. Backing uses the shared live control.
	field( "set-font-size" ).addEventListener( "input", e =>
		setFontSize( Number( e.target.value ), false )
	);
	field( "set-cues-browse" ).addEventListener( "click", () =>
		window.electron.browseCuesFile()
	);
	field( "set-cues-clear" ).addEventListener( "click", () => {
		field( "set-cues-file" ).value = "";
		wordsChanged();
	} );
	field( "settings-save" ).addEventListener( "click", () => saveSettingsPage( true ) );
	field( "settings-apply" ).addEventListener( "click", () => saveSettingsPage( false ) );
	field( "settings-cancel" ).addEventListener( "click", () => requestCloseSettings() );
	field( "settings-close" ).addEventListener( "click", () => requestCloseSettings() );
	field( "settings-unsaved-save" ).addEventListener( "click", () => finishSettingsClose( true ) );
	field( "settings-unsaved-discard" ).addEventListener( "click", () => finishSettingsClose( false ) );
	field( "settings-unsaved-keep" ).addEventListener( "click", () => {
		afterSettingsClose = null;
		field( "settings-unsaved" ).classList.add( "hidden" );
	} );
	settingsModal.addEventListener( "input", markSettingsDirty );
	settingsModal.addEventListener( "change", markSettingsDirty );
	settingsModal.addEventListener( "keydown", ( e ) => {
		if ( e.key === "Tab" ) {
			const focusable = [ ...settingsModal.querySelectorAll( "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]" ) ].filter( el => el.tabIndex >= 0 && el.getClientRects().length );
			const end = e.shiftKey ? focusable[0] : focusable.at( -1 );
			if ( settingsModal.ownerDocument.activeElement === end ) {
				e.preventDefault();
				( e.shiftKey ? focusable.at( -1 ) : focusable[0] )?.focus();
			}
		}
		if ( e.key !== "Escape" ) return;
		e.preventDefault();
		e.stopPropagation();
		if ( !field( "settings-unsaved" ).classList.contains( "hidden" ) ) {
			field( "settings-unsaved-keep" ).click();
			return;
		}
		requestCloseSettings();
	} );
}

window.electron.onCuesFileChosen( ( filePath ) => {
	if ( filePath ) {
		field( "set-cues-file" ).value = filePath;
		wordsChanged();
	}
} );
window.electron.onMenuSettings( async ( topic ) => {
	await openSettings();
	if ( topic === "pad" ) showSettingsTab( "pad" );
} );
window.electron.onUtilityPanelClose( ( kind, quit ) => {
	if ( kind === "settings" ) requestCloseSettings( quit ? () => window.electron.windowControl( "close" ) : null );
	if ( kind === "help" ) closeHelp();
	if ( kind === "voicehelp" ) hideVoiceHelp();
	if ( kind === "workflow" ) workflow?.close();
	if ( kind === "obssetup" ) obsSetupUi?.close();
} );
window.electron.getSettings();
// --- Layout: margins, line spacing, alignment, edge fade ---

const LAYOUT_DEFAULTS = {
	marginX: 3,
	marginTop: 0,
	marginBottom: 0,
	lineHeight: 1.3,
	headingLineHeight: 1.3,
	directionLineHeight: 1.3,
	headingScale: 1,
	directionScale: 1,
	directionColour: "",
	productionNoteScale: 1,
	productionNoteLineHeight: 1.4,
	productionNoteColour: "",
	textOpacity: 1,
	textBrightness: 1,
	backingOnAir: 0.07,
	textAlign: "left"
};
const EDGE_FADE = 4; // % of the window height over which text fades at a margin

function applyLayout() {
	applyBacking();
	const style = document.body.style;
	style.setProperty(
		"--margin-x",
		`${ settings.marginX ?? LAYOUT_DEFAULTS.marginX }vw`
	);
	style.setProperty( "--margin-top", `${ settings.marginTop ?? 0 }vh` );
	style.setProperty(
		"--line-height",
		settings.lineHeight ?? LAYOUT_DEFAULTS.lineHeight
	);
	style.setProperty( "--heading-line-height", settings.headingLineHeight ?? LAYOUT_DEFAULTS.headingLineHeight );
	style.setProperty( "--direction-line-height", settings.directionLineHeight ?? LAYOUT_DEFAULTS.directionLineHeight );
	style.setProperty(
		"--heading-scale",
		settings.headingScale ?? LAYOUT_DEFAULTS.headingScale
	);
	style.setProperty( "--direction-scale", settings.directionScale ?? LAYOUT_DEFAULTS.directionScale );
	style.setProperty( "--production-note-scale", settings.productionNoteScale ?? LAYOUT_DEFAULTS.productionNoteScale );
	style.setProperty( "--production-note-line-height", settings.productionNoteLineHeight ?? LAYOUT_DEFAULTS.productionNoteLineHeight );
	if ( /^#[\da-f]{6}$/i.test( settings.directionColour ?? "" ) ) style.setProperty( "--direction-colour", settings.directionColour );
	else style.removeProperty( "--direction-colour" );
	if ( /^#[\da-f]{6}$/i.test( settings.productionNoteColour ?? "" ) ) style.setProperty( "--production-note-colour", settings.productionNoteColour );
	else style.removeProperty( "--production-note-colour" );
	style.setProperty(
		"--text-opacity",
		settings.textOpacity ?? LAYOUT_DEFAULTS.textOpacity
	);
	// Only filter when dimmed: a filter on the whole script costs a little on every frame.
	const brightness = settings.textBrightness ?? LAYOUT_DEFAULTS.textBrightness;
	style.setProperty(
		"--text-filter",
		brightness < 1 ? `brightness(${ brightness })` : "none"
	);
	style.setProperty(
		"--text-align",
		settings.eyeLine ? "center" : ( settings.textAlign ?? "left" )
	);
	updateEdgeMask();
	scheduleMeasure();
	if ( isSteadyRunning() ) requestAnimationFrame( recalculateSteady );
}

// Top and bottom margins hide the text near the window edges. The mask is one
// window tall and follows the scroll, so it stays put on screen.
// The script's visibility down the window, as a mask: the top and bottom
// margins fade to nothing, and the focus band (optional) dims lines away from
// the reading line. Both are worked out per point and combined.
function edgeAlpha( p, top, bottom ) {
	if ( p < top - EDGE_FADE || p > 100 - bottom + EDGE_FADE ) return 0;
	if ( p < top ) return ( p - ( top - EDGE_FADE ) ) / EDGE_FADE;
	if ( p > 100 - bottom ) return 1 - ( p - ( 100 - bottom ) ) / EDGE_FADE;
	return 1;
}

function focusAlpha( p, centre, half, fade, floor ) {
	const d = Math.abs( p - centre );
	if ( d <= half ) return 1;
	if ( d >= half + fade ) return floor;
	return 1 - ( 1 - floor ) * ( ( d - half ) / fade );
}

function updateEdgeMask() {
	const top = settings.marginTop ?? 0;
	const bottom = settings.marginBottom ?? 0;
	const focus = !!settings.focusBand;
	if ( !top && !bottom && !focus ) {
		md.style.webkitMaskImage = "";
		return;
	}
	const centre = getReadingAnchor() * 100;
	const linePx = parseFloat( getComputedStyle( md ).lineHeight ) || 60;
	const linePct = ( linePx / window.innerHeight ) * 100;
	const half = linePct * 0.9; // the reading line and a little either side
	const fade = linePct * 1.5;
	const floor = 1 - Math.min( 0.9, Math.max( 0, settings.focusStrength ?? 0.6 ) );
	const points = new Set( [ 0, 100, top, 100 - bottom ] );
	points.add( Math.max( 0, top - EDGE_FADE ) );
	points.add( Math.min( 100, 100 - bottom + EDGE_FADE ) );
	if ( focus ) {
		for ( const p of [
			centre - half - fade,
			centre - half,
			centre + half,
			centre + half + fade
		] ) {
			points.add( Math.min( 100, Math.max( 0, p ) ) );
		}
	}
	const stops = [ ...points ]
		.sort( ( a, b ) => a - b )
		.map( ( p ) => {
			let a = edgeAlpha( p, top, bottom );
			if ( focus ) a *= focusAlpha( p, centre, half, fade, floor );
			return `rgba(0, 0, 0, ${ a.toFixed( 3 ) }) ${ p.toFixed( 2 ) }%`;
		} );
	md.style.webkitMaskImage = `linear-gradient(to bottom, ${ stops.join( ", " ) })`;
	md.style.webkitMaskRepeat = "no-repeat";
	md.style.webkitMaskSize = "100% 100vh";
	const mdTop = md.getBoundingClientRect().top + window.scrollY;
	md.style.webkitMaskPosition = `0 ${ window.scrollY - mdTop }px`;
}

// --- Progress and time left ---

const progressBar = uiElement( "progress-bar" );
const progressFill = uiElement( "progress-fill" );
const progressText = uiElement( "cb-progress-text" );
let textSpan = null; // { top, bottom, words } of the script text, in page pixels
let measureQueued = false;

function scheduleMeasure() {
	if ( measureQueued ) return;
	measureQueued = true;
	// A hidden window (minimised, screen locked) gets no animation frames.
	const later = document.hidden
		? cb => setTimeout( cb, 0 )
		: requestAnimationFrame;
	later( () => {
		measureQueued = false;
		const mirrorTransform = md.style.transform;
		md.style.transform = "";
		const { ranges } = buildWordIndex( md );
		measureDirectives( ranges );
		if ( ranges.length < 2 ) {
			textSpan = null;
		} else {
			const first = ranges[0].getBoundingClientRect();
			const last = ranges[ranges.length - 1].getBoundingClientRect();
			textSpan = {
				top: first.top + window.scrollY,
				bottom: last.bottom + window.scrollY,
				words: ranges.length
			};
		}
		md.style.transform = mirrorTransform;
		drawProgressTicks();
		updateProgress();
	} );
}

function formatMinutes( minutes ) {
	const total = Math.max( 0, Math.round( minutes * 60 ) );
	return `${ Math.floor( total / 60 ) }:${ String( total % 60 ).padStart( 2, "0" ) }`;
}

function updateProgress() {
	const hasScript = !!slotState.slots[slotState.active];
	// Talking points don't scroll, so "time left" means nothing there.
	const points = document.body.classList.contains( "points-mode" );
	const wanted = settings.showProgress !== false && !points;
	const show = wanted && !!textSpan && !isEditMode && hasScript;
	progressBar?.classList.toggle( "hidden", !show );
	if ( !show ) {
		if ( progressText ) progressText.textContent = "";
		return;
	}
	const readingY = window.scrollY + window.innerHeight * getReadingAnchor();
	const fraction = Math.min(
		1,
		Math.max(
			0,
			( readingY - textSpan.top ) / Math.max( 1, textSpan.bottom - textSpan.top )
		)
	);
	progressFill.style.width = `${ fraction * 100 }%`;
	progressBar.setAttribute( "aria-valuenow", String( Math.round( fraction * 100 ) ) );
	const wordsLeft = textSpan.words * ( 1 - fraction );
	const wpm = settings.steadyWpm || 140;
	if ( progressText ) {
		progressText.textContent = `${ Math.round( fraction * 100 ) }% · ${ formatMinutes( wordsLeft / wpm ) } left of ${ formatMinutes( textSpan.words / wpm ) }`;
	}
}

// The progress bar is also a way to move: click or drag to jump anywhere in
// the script, with the section and time at that point in a tip, and a tick
// where each section starts. Ignored while the prompter runs, so a stray
// click can't jump a take; pause first.
const progressTicks = uiElement( "progress-ticks" );
const progressTip = uiElement( "progress-tip" );
let progressDragging = false;

const spanHeight = () => Math.max( 1, textSpan.bottom - textSpan.top );

function drawProgressTicks() {
	if ( !progressTicks ) return;
	progressTicks.innerHTML = "";
	if ( !textSpan ) return;
	for ( const s of directivePoints.sections ) {
		const at = ( s.y - textSpan.top ) / spanHeight();
		if ( at <= 0.005 || at >= 0.995 ) continue;
		const tick = document.createElement( "div" );
		tick.className = "progress-tick";
		tick.style.left = `${ at * 100 }%`;
		progressTicks.appendChild( tick );
	}
}

// Where along the bar the pointer is, 0 to 1 (mirroring flips the bar).
function progressFractionAt( event ) {
	const rect = progressBar.getBoundingClientRect();
	let at = ( event.clientX - rect.left ) / Math.max( 1, rect.width );
	if ( mirrored === "horizontal" || mirrored === "both" ) at = 1 - at;
	return Math.min( 1, Math.max( 0, at ) );
}

function showProgressTip( at ) {
	if ( !progressTip || !textSpan ) return;
	if ( isScrolling() ) {
		progressTip.textContent = "Pause to jump";
	} else {
		const y = textSpan.top + at * spanHeight();
		const section = directivePoints.sections[sectionIndexAt( y )];
		const title = section?.heading.textContent.replace( /{[^}]*}/g, "" ).trim();
		const wordsBefore = directivePoints.wordTops.filter( t => t < y ).length;
		const wpm = settings.steadyWpm || 140;
		const time = `${ formatMinutes( wordsBefore / wpm ) } of ${ formatMinutes( textSpan.words / wpm ) }`;
		progressTip.textContent = title ? `${ title } · ${ time }` : time;
	}
	progressTip.classList.remove( "hidden" );
	// Centred on the pointer, but kept inside the window.
	const width = progressBar.clientWidth;
	const half = progressTip.offsetWidth / 2 + 4;
	progressTip.style.left = `${ Math.min( width - half, Math.max( half, at * width ) ) }px`;
}

function jumpToProgress( at ) {
	if ( !textSpan || isScrolling() ) return;
	const readingY = textSpan.top + at * spanHeight();
	window.scrollTo( { top: Math.max( 0, readingY - window.innerHeight * getReadingAnchor() ), behavior: "auto" } );
}

progressBar?.addEventListener( "pointerdown", ( event ) => {
	if ( event.button !== 0 || !textSpan || isScrolling() ) return;
	event.preventDefault();
	progressDragging = true;
	progressBar.setPointerCapture( event.pointerId );
	progressBar.classList.add( "dragging" );
	const at = progressFractionAt( event );
	jumpToProgress( at );
	showProgressTip( at );
} );

progressBar?.addEventListener( "pointermove", ( event ) => {
	const at = progressFractionAt( event );
	if ( progressDragging ) jumpToProgress( at );
	showProgressTip( at );
} );

function endProgressDrag() {
	progressDragging = false;
	progressBar?.classList.remove( "dragging" );
}
progressBar?.addEventListener( "pointerup", endProgressDrag );
progressBar?.addEventListener( "pointercancel", endProgressDrag );
progressBar?.addEventListener( "pointerleave", () => {
	if ( !progressDragging ) progressTip?.classList.add( "hidden" );
} );

// --- Slots: up to nine scripts, each remembering its place ---

const slotsEl = uiElement( "cb-slots" );
let slotState = { active: 0, slots: [], recent: [] };
let pendingRestore = null;
let slotPositionTimer = null;

function currentPosition() {
	return { scrollY: Math.round( window.scrollY ), section: scriptIndex };
}

function renderSlots() {
	if ( !slotsEl ) return;
	slotsEl.innerHTML = "";
	slotState.slots.forEach( ( slot, i ) => {
		const btn = document.createElement( "button" );
		btn.className = "cb-slot";
		btn.textContent = String( i + 1 );
		btn.classList.toggle( "filled", !!slot );
		btn.classList.toggle( "current", i === slotState.active );
		btn.title = `Slot ${ i + 1 }: ${ slot ? slot.name : "empty" } (Ctrl+${ i + 1 })`;
		btn.addEventListener( "click", () => switchToSlot( i ) );
		slotsEl.appendChild( btn );
	} );
}

function switchToSlot( index ) {
	if ( index === slotState.active ) return;
	stopSteadySession();
	stopAutoScrollSession();
	window.electron.switchSlot( index, currentPosition() );
}

window.electron.onSlots( ( state ) => {
	slotState = { active: 0, slots: [], recent: [], ...state };
	renderSlots();
	updateProgress();
	if ( !appMenu.classList.contains( "hidden" ) ) renderAppMenu();
} );
window.electron.onRestorePosition( ( position ) => {
	pendingRestore = position;
} );
window.electron.onMenuSwitchSlot( switchToSlot );
window.electron.onMenuClearSlot( () => window.electron.clearSlot() );

window.addEventListener(
	"scroll",
	() => {
		updateEdgeMask();
		updateProgress();
		clearTimeout( slotPositionTimer );
		slotPositionTimer = setTimeout(
			() => window.electron.saveSlotPosition( currentPosition() ),
			800
		);
	},
	{ passive: true }
);

// --- Control bar ---

const controlBar = uiElement( "control-bar" );
const playBtn = uiElement( "cb-play" );
const speedInput = uiElement( "cb-speed" );
const speedLabel = uiElement( "cb-speed-label" );
const speedValue = uiElement( "cb-speed-value" );
const fontInput = uiElement( "cb-font" );
const opacityInput = uiElement( "cb-opacity" );
const maxBtn = uiElement( "cb-max" );
const fullBtn = uiElement( "cb-full" );
let idleTimer = null;
const IDLE_MS_SCROLLING = 1500;
const IDLE_MS_STOPPED = 5000;

function isScrolling() {
	return (
		steadySessionActive()
		|| autoScrollActive
		|| autoScrollStarting
		|| pointsRunning
	);
}

function updatePlayButton() {
	updateOnAir();
	if ( !playBtn ) return;
	const playing = isScrolling();
	playBtn.textContent = playing ? "❚❚" : "▶";
	playBtn.setAttribute( "aria-label", playing ? "Pause scrolling" : "Start scrolling" );
	playBtn.setAttribute( "aria-pressed", String( playing ) );
	playBtn.classList.toggle( "playing", playing );
	refreshControlsVisibility();
}

function formatSpeed( value ) {
	return `${ Number( value )
		.toFixed( 2 )
		.replace( /\.?0+$/, "" ) }×`;
}

function syncControls() {
	if ( !controlBar ) return;
	const voice = settings.scrollMode === "voice";
	if ( document.activeElement !== speedInput ) {
		if ( voice ) {
			speedInput.min = 0.25;
			speedInput.max = 4;
			speedInput.step = 0.05;
			speedInput.value = autoScrollSpeed;
		} else {
			speedInput.min = 60;
			speedInput.max = 300;
			speedInput.step = 5;
			speedInput.value = settings.steadyWpm;
		}
	}
	speedLabel.textContent = voice ? "Response" : "Speed";
	speedInput.setAttribute( "aria-labelledby", "cb-speed-label" );
	speedInput.closest( "label" ).title = voice
		? "Voice response: how quickly scrolling follows your speech"
		: "Scroll speed in words per minute (Ctrl+[ and Ctrl+])";
	speedValue.textContent = voice
		? formatSpeed( autoScrollSpeed )
		: `${ settings.steadyWpm } wpm`;
	if ( document.activeElement !== fontInput ) fontInput.value = fontSize;
	if ( document.activeElement !== opacityInput ) opacityInput.value = liveBacking();
	const bgInput = uiElement( "lp-bg-opacity" );
	if ( bgInput && bgInput.ownerDocument.activeElement !== bgInput ) bgInput.value = opacity;
	const mode = uiElement( "cb-mode" );
	if ( mode ) {
		mode.textContent = voice ? "Voice" : "Steady";
		mode.setAttribute( "aria-label", voice ? "Voice scrolling; switch to steady" : "Steady scrolling; switch to voice" );
		mode.setAttribute( "aria-pressed", String( voice ) );
	}
	syncLayoutPanel();
	syncVoicePanel();
	positionToolsPanel();
}

function panelOpen() {
	return !!document.querySelector(
		".panel:not(.hidden), #app-menu:not(.hidden), .modal:not(.hidden)"
	);
}

function refreshControlsVisibility() {
	clearTimeout( idleTimer );
	const pinned = !!settings.controlsPinned;
	document.body.classList.toggle( "controls-pinned", pinned );
	if ( pinned || panelOpen() || controlBar?.matches( ":hover" ) || ( controlBar?.contains( document.activeElement ) && document.activeElement?.matches( ":focus-visible" ) ) ) {
		document.body.classList.remove( "controls-hidden" );
		return;
	}
	idleTimer = setTimeout(
		() => {
			if (
				!settings.controlsPinned
				&& !panelOpen()
				&& !controlBar?.matches( ":hover" )
				&& !( controlBar?.contains( document.activeElement ) && document.activeElement?.matches( ":focus-visible" ) )
			) {
				document.body.classList.add( "controls-hidden" );
			}
		},
		// On air (scrolling, or the On air button) the bar gets out of the way quickly.
		onAir() ? IDLE_MS_SCROLLING : IDLE_MS_STOPPED
	);
}

function showControls( event ) {
	const focused = controlBar?.contains( document.activeElement ) && document.activeElement?.matches( ":focus-visible" );
	const farAway = event?.type === "mousemove" && event.clientY > ( controlBar?.getBoundingClientRect().bottom ?? 48 ) + window.innerHeight * 0.1;
	if ( farAway && !settings.controlsPinned && !panelOpen() && !focused ) {
		clearTimeout( idleTimer );
		document.body.classList.add( "controls-hidden" );
		return;
	}
	document.body.classList.remove( "controls-hidden" );
	updateProgress();
	refreshControlsVisibility();
}

document.addEventListener( "mousemove", showControls, { passive: true } );
controlBar?.addEventListener( "mouseleave", refreshControlsVisibility );
// Keep the script clear of the bar when it's pinned open.
if ( controlBar && window.ResizeObserver ) {
	new ResizeObserver( () => {
		document.body.style.setProperty( "--bar-h", `${ controlBar.offsetHeight }px` );
	} ).observe( controlBar );
}

function goToStart() {
	recording.jump( "top" );
	scriptIndex = 0;
	previewManuallyScrolled = false;
	window.scrollTo( 0, 0 );
}

function saveFromBar() {
	if ( editorView && isDirty ) {
		saveEditorContent();
	} else {
		showTransientHint( "Nothing to save: edit the script first (Edit)", 2500 );
	}
}

const onClick = ( id, handler ) =>
	uiElement( id )?.addEventListener( "click", handler );

onClick( "cb-menu", ( e ) => {
	e.stopPropagation();
	toggleAppMenu();
} );
onClick( "cb-restart", goToStart );
onClick( "cb-play", toggleAutoScrollSession );
onClick( "cb-on-air", toggleOnAir );
onClick( "cb-mode", () => window.electron.saveSettings( { scrollMode: settings.scrollMode === "voice" ? "steady" : "voice" } ) );
onClick( "cb-edit", toggleEditMode );
onClick( "guide-controls", () => window.electron.headGuide( "adjust" ) );
onClick( "cb-tools", () => {
	renderTools();
	togglePanel( "tools-panel" );
	if ( !field( "tools-panel" ).classList.contains( "hidden" ) ) field( "tools-panel" ).querySelector( "button" )?.focus();
} );
onClick( "cb-help", openHelp );
onClick( "help-ai-prompt", () => window.electron.copyAiPrompt() );
onClick( "cb-settings", openSettings );
for ( const id of [ "cb-menu", "cb-tools" ] ) {
	uiElement( id )?.addEventListener( "keydown", ( event ) => {
		if ( event.key !== "ArrowDown" ) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.click();
	} );
}
onClick( "cb-min", () => window.electron.windowControl( "minimize" ) );
onClick( "cb-max", () => window.electron.windowControl( "maximize" ) );
onClick( "cb-full", () => window.electron.windowControl( "fullscreen" ) );
onClick( "cb-close", () => window.electron.windowControl( "close" ) );
controlBar?.addEventListener( "dblclick", ( e ) => {
	if ( e.target === controlBar || e.target.classList.contains( "cb-spacer" ) ) {
		window.electron.windowControl( "maximize" );
	}
} );

speedInput?.addEventListener( "input", () => {
	const value = Number( speedInput.value );
	if ( settings.scrollMode === "voice" ) {
		applyAutoScrollSpeed( value, false );
	} else {
		settings.steadyWpm = setWpm( value );
		if ( isSteadyRunning() ) setIndicator( steadyIndicatorText() );
	}
	syncControls();
	updateProgress();
} );
speedInput?.addEventListener( "change", () => {
	if ( settings.scrollMode === "voice" ) {
		applyAutoScrollSpeed( Number( speedInput.value ) );
	} else {
		window.electron.saveSettings( { steadyWpm: settings.steadyWpm } );
	}
} );
fontInput?.addEventListener( "input", () =>
	setFontSize( Number( fontInput.value ), false )
);
fontInput?.addEventListener( "change", () =>
	setFontSize( Number( fontInput.value ) )
);
opacityInput?.addEventListener( "input", () =>
	setLiveBacking( Number( opacityInput.value ), false )
);
opacityInput?.addEventListener( "change", () =>
	setLiveBacking( Number( opacityInput.value ) )
);
// The Layout panel's background slider is the same setting as the bar's Backing.
document
	.getElementById( "lp-bg-opacity" )
	?.addEventListener( "input", e => setOpacity( Number( e.target.value ), false ) );
document
	.getElementById( "lp-bg-opacity" )
	?.addEventListener( "change", e => setOpacity( Number( e.target.value ) ) );

window.electron.onWindowState( ( state ) => {
	window.lastWindowState = state;
	if ( maxBtn ) {
		maxBtn.textContent = state.maximized ? "❐" : "▢";
		maxBtn.title = state.maximized
			? "Restore size (Shift+F11)"
			: "Maximise (Shift+F11)";
	}
	fullBtn?.classList.toggle( "active", !!state.fullScreen );
	fullBtn?.setAttribute( "aria-pressed", String( !!state.fullScreen ) );
} );
window.electron.onMenuWindowControl( action =>
	window.electron.windowControl( action )
);
window.electron.onMenuGoToStart( goToStart );
window.electron.onNotice( text => showTransientHint( text, 2500 ) );

// --- Panels (layout, voice) and the in-app menu ---

const appMenu = uiElement( "app-menu" );

function positionToolsPanel() {
	const panel = field( "tools-panel" );
	if ( !panel || panel.classList.contains( "hidden" ) ) return;
	const edge = 8;
	const top = controlBar.offsetHeight + 6;
	const anchor = field( "cb-tools" ).getBoundingClientRect();
	const anchorLeft = mirrored === "horizontal" || mirrored === "both" ? window.innerWidth - anchor.right : anchor.left;
	const left = Math.max( edge, Math.min( anchorLeft, window.innerWidth - panel.offsetWidth - edge ) );
	panel.style.left = `${ left }px`;
	panel.style.right = "auto";
	panel.style.top = `${ top }px`;
	panel.style.maxHeight = `${ Math.max( 0, window.innerHeight - top - edge ) }px`;
}
window.addEventListener( "resize", () => requestAnimationFrame( positionToolsPanel ) );

function togglePanel( id ) {
	const panel = uiElement( id );
	if ( !panel ) return;
	const opening = panel.classList.contains( "hidden" );
	closePanels();
	if ( opening ) {
		panel.classList.remove( "hidden" );
		if ( id === "tools-panel" ) field( "cb-tools" ).setAttribute( "aria-expanded", "true" );
		if ( id === "voice-panel" ) openVoicePanel();
		syncControls();
	}
	showControls();
	if ( id === "tools-panel" ) positionToolsPanel();
}

// Closes any open panel or menu; returns true if something was open.
function closePanels() {
	let closed = false;
	document
		.querySelectorAll( ".panel:not(.hidden), #app-menu:not(.hidden)" )
		.forEach( ( el ) => {
			el.classList.add( "hidden" );
			closed = true;
		} );
	stopMicMeter();
	field( "cb-menu" )?.setAttribute( "aria-expanded", "false" );
	field( "cb-tools" )?.setAttribute( "aria-expanded", "false" );
	refreshControlsVisibility();
	return closed;
}

document.addEventListener( "mousedown", ( e ) => {
	if ( e.target.closest?.( ".panel, #app-menu, #control-bar, .modal" ) ) return;
	closePanels();
} );

// The ☰ menu also closes on a click anywhere else: the control bar (except ☰
// itself, which toggles it) or outside the window altogether.
function closeAppMenu() {
	if ( appMenu?.classList.contains( "hidden" ) ) return;
	appMenu.classList.add( "hidden" );
	field( "cb-menu" ).setAttribute( "aria-expanded", "false" );
	refreshControlsVisibility();
}
document.addEventListener( "mousedown", ( e ) => {
	if ( e.target.closest?.( "#control-bar" ) && !e.target.closest( "#cb-menu" ) ) {
		closeAppMenu();
	}
} );
window.addEventListener( "blur", closeAppMenu );

window.electron.onMenuLayout( view => toggleLayoutView( view ?? "layout" ) );
window.electron.onMenuVoice( () => togglePanel( "voice-panel" ) );
window.electron.onMenuSoundCheck( () => toggleSoundCheck() );

const toggleSetting = key => () =>
	window.electron.saveSettings( { [key]: !settings[key] } );

// Menu entries: [icon, label, shortcut, action, { checked, disabled }]
function menuGroups() {
	return [
		{
			heading: "Script",
			items: [
				[ "+", "New script", "Ctrl+N", newScript ],
				[
					"📂",
					"Open script…",
					"Ctrl+O",
					() => window.electron.openFileDialog()
				],
				[
					"🔗",
					"Open a Google Doc…",
					"",
					() => showGoogleDocDialog()
				],
				{ recent: true },
				{ samples: true },
				[
					"✎",
					isEditMode ? "Back to the teleprompter" : "Edit script",
					"Ctrl+E",
					toggleEditMode
				],
				[ "💾", "Save", "Ctrl+S", saveFromBar, { disabled: !isDirty } ],
				[
					"⤓",
					"Save as…",
					"Ctrl+Shift+S",
					saveEditorContentAs,
					{ disabled: !editorView }
				],
				[
					"⌫",
					"Clear this slot",
					"",
					() => window.electron.clearSlot(),
					{
						disabled: !slotState.slots[slotState.active]
					}
				]
			]
		},
		{
			heading: "Recording files",
			items: [
				[ "🗒", "Recordings…", "Ctrl+Shift+R", openRecordings ],
				[ "✂", "Export the edit pack…", "", () => window.electron.exportEditPack() ]
			]
		},
		{
			heading: "Settings files",
			items: [
				[
					"⇪",
					"Load settings from file (JSON or XML)…",
					"",
					() => window.electron.importSettings()
				],
				[
					"⇩",
					"Save settings to file (JSON or XML)…",
					"",
					() => window.electron.exportSettings()
				]
			]
		}
	];
}

function renderTools() {
	const panel = field( "tools-panel" );
	panel.replaceChildren();
	const guideShown = headGuideState?.shown ?? !!settings.showHeadGuide;
	const guideLabel = guideShown ? "Hide head guide" : "Show head guide";
	const groups = [
		[ "Recording tools", [
			[ "🎚", "Sound check", "Ctrl+Shift+D", toggleSoundCheck, { checked: soundCheckOn() } ],
			[ "◎", guideLabel, "Ctrl+Shift+H", () => window.electron.headGuide( guideShown ? "hide" : "show" ), { checked: guideShown } ],
			[ "◉", "Guide adjustments…", "", () => window.electron.headGuide( "adjust" ), { checked: !!headGuideState?.controlsShown, disabled: !guideShown } ],
			[ "⛶", "Guide fullscreen / restore", "Ctrl+Alt+H", () => window.electron.headGuide( "fullscreen" ) ],
			[ "★", "Keeper", "K", () => rateTake( "keeper" ) ],
			[ "✗", "Scrap take", "Shift+K", () => rateTake( "scrap" ) ]
		] ],
		[ "Review", [
			[ "▤", "Script & rehearsal review…", "", () => openScriptReview(), { disabled: isScrolling() } ]
		] ],
		[ "Prepare a session", [
			[ "✓", "Session check…", "", () => workflow.open( "session" ), { disabled: isScrolling() } ]
		] ],
		[ "Quick adjustments", [
			[ "▤", "Spacing and mirror…", "Ctrl+Shift+K", () => toggleLayoutView( "layout" ) ],
			[ "◐", "Text and colour…", "", () => toggleLayoutView( "reading" ) ],
			[ "●", "Take display…", "", () => toggleLayoutView( "recording" ) ],
			[ "🎙", "Voice and microphone…", "Ctrl+Shift+V", () => togglePanel( "voice-panel" ) ]
		] ],
		[ "Operator windows", [
			[ "▣", "Control window", "Ctrl+Shift+O", toggleSetting( "showControl" ), { checked: !!settings.showControl } ],
			[ "▦", "Control pad", "Ctrl+Shift+P", toggleSetting( "showPad" ), { checked: !!settings.showPad } ]
		] ]
	];
	for ( const [ title, items ] of groups ) {
		const heading = document.createElement( "h4" );
		heading.textContent = title;
		panel.append( heading );
		for ( const args of items ) panel.append( menuButton( ...args ) );
	}
}

let recentExpanded = false;
let samplesExpanded = false;

function menuButton( icon, label, key, action, opts = {} ) {
	const btn = document.createElement( "button" );
	btn.type = "button";
	btn.className = "am-item";
	btn.disabled = !!opts.disabled;
	btn.dataset.menuLabel = label;
	if ( opts.checked !== undefined ) btn.setAttribute( "aria-pressed", String( opts.checked ) );
	if ( opts.expanded !== undefined ) btn.setAttribute( "aria-expanded", String( opts.expanded ) );
	if ( opts.checked ) btn.classList.add( "checked" );
	const iconEl = document.createElement( "span" );
	iconEl.className = "am-icon";
	iconEl.setAttribute( "aria-hidden", "true" );
	iconEl.textContent = opts.checked ? "✓" : icon;
	const labelEl = document.createElement( "span" );
	labelEl.textContent = label;
	const keyEl = document.createElement( "span" );
	keyEl.className = "am-key";
	keyEl.textContent = key;
	btn.append( iconEl, labelEl, keyEl );
	btn.addEventListener( "click", () => {
		if ( !opts.keepOpen ) closePanels();
		action();
		if ( opts.keepOpen ) appMenu.querySelector( `[data-menu-label="${ CSS.escape( label ) }"]` )?.focus();
	} );
	return btn;
}

// Menu groups open or closed: the everyday ones start open. Remembered per
// computer; the menu still works if storage isn't available.
const MENU_OPEN_BY_DEFAULT = [ "Script", "Recording files" ];
const MENU_GROUPS_KEY = "menuGroupsOpen";

function menuGroupsOpen() {
	try {
		const saved = JSON.parse( localStorage.getItem( MENU_GROUPS_KEY ) );
		if ( saved && typeof saved === "object" ) return saved;
	} catch {
		// fall through to the defaults
	}
	return {};
}

function isMenuGroupOpen( heading ) {
	return menuGroupsOpen()[heading] ?? MENU_OPEN_BY_DEFAULT.includes( heading );
}

function toggleMenuGroup( heading ) {
	// Opening one group closes the others, so the menu stays short.
	const opening = !isMenuGroupOpen( heading );
	const open = opening
		? Object.fromEntries(
			menuGroups().map( g => [ g.heading, g.heading === heading ] )
		)
		: { ...menuGroupsOpen(), [heading]: false };
	try {
		localStorage.setItem( MENU_GROUPS_KEY, JSON.stringify( open ) );
	} catch {
		// not remembered this time
	}
	renderAppMenu();
	appMenu
		.querySelector( `.am-heading[data-group="${ CSS.escape( heading ) }"]` )
		?.focus();
}

// Closing the prompter quits Sightline (asking first about unsaved script
// edits, and Settings changes).
function quitApp() {
	requestCloseSettings( () => window.electron.windowControl( "close" ) );
}

function renderAppMenu() {
	appMenu.innerHTML = "";
	for ( const group of menuGroups() ) {
		const groupEl = document.createElement( "div" );
		groupEl.className = "am-group";
		const open = isMenuGroupOpen( group.heading );
		const heading = document.createElement( "button" );
		heading.type = "button";
		heading.className = "am-heading";
		heading.dataset.group = group.heading;
		heading.setAttribute( "aria-expanded", String( open ) );
		const title = document.createElement( "span" );
		title.textContent = group.heading;
		const chevron = document.createElement( "span" );
		chevron.className = "am-chevron";
		chevron.textContent = open ? "▾" : "▸";
		heading.append( title, chevron );
		heading.addEventListener( "click", () => toggleMenuGroup( group.heading ) );
		groupEl.appendChild( heading );
		appMenu.appendChild( groupEl );
		if ( !open ) continue;
		for ( const item of group.items ) {
			if ( item.recent ) {
				const recent = slotState.recent ?? [];
				groupEl.appendChild(
					menuButton(
						"🕘",
						"Open recent",
						recentExpanded ? "▾" : "▸",
						() => {
							recentExpanded = !recentExpanded;
							renderAppMenu();
						},
						{ disabled: recent.length === 0, keepOpen: true, expanded: recentExpanded }
					)
				);
				if ( recentExpanded && recent.length ) {
					const sub = document.createElement( "div" );
					sub.className = "am-sub";
					for ( const file of recent ) {
						const btn = menuButton( "", file.name, "", () =>
							window.electron.openRecent( file.path )
						);
						btn.title = file.path;
						sub.appendChild( btn );
					}
					groupEl.appendChild( sub );
				}
				continue;
			}
			if ( item.samples ) {
				groupEl.appendChild(
					menuButton(
						"🎓",
						"Sample scripts",
						samplesExpanded ? "▾" : "▸",
						() => {
							samplesExpanded = !samplesExpanded;
							renderAppMenu();
						},
						{ keepOpen: true, expanded: samplesExpanded }
					)
				);
				if ( samplesExpanded ) {
					const sub = document.createElement( "div" );
					sub.className = "am-sub";
					for ( const sample of slotState.samples ?? [] ) {
						sub.appendChild(
							menuButton( "", sample.label, "", () =>
								window.electron.openSample( sample.file )
							)
						);
					}
					groupEl.appendChild( sub );
				}
				continue;
			}
			const [ icon, label, key, action, opts ] = item;
			groupEl.appendChild( menuButton( icon, label, key, action, opts ) );
		}
	}
	// Always in view, whichever groups are folded.
	appMenu.appendChild( menuButton( "⚙", "Settings…", "Ctrl+,", openSettings ) );
	const quit = menuButton( "⏻", "Quit Sightline", "Ctrl+W", quitApp );
	quit.classList.add( "am-quit" );
	appMenu.appendChild( quit );
}

function toggleAppMenu() {
	const opening = appMenu.classList.contains( "hidden" );
	closePanels();
	if ( opening ) {
		recentExpanded = false;
		renderAppMenu();
		appMenu.classList.remove( "hidden" );
		field( "cb-menu" ).setAttribute( "aria-expanded", "true" );
		appMenu.querySelector( ".am-item:not(:disabled)" )?.focus();
	}
	showControls();
}

appMenu?.addEventListener( "keydown", ( e ) => {
	e.stopPropagation();
	const items = [
		...appMenu.querySelectorAll( ".am-heading, .am-item:not(:disabled)" )
	];
	const i = items.indexOf( document.activeElement );
	if ( [ "ArrowDown", "ArrowUp", "Home", "End" ].includes( e.key ) ) {
		e.preventDefault();
		e.stopPropagation();
		const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? i + 1 : i - 1;
		items[( next + items.length ) % items.length]?.focus();
	} else if ( e.key === "Escape" ) {
		e.stopPropagation();
		closePanels();
		field( "cb-menu" ).focus();
	}
} );

field( "tools-panel" )?.addEventListener( "keydown", ( e ) => {
	e.stopPropagation();
	const items = [ ...field( "tools-panel" ).querySelectorAll( "button:not(:disabled)" ) ];
	const index = items.indexOf( document.activeElement );
	if ( [ "ArrowDown", "ArrowUp", "Home", "End" ].includes( e.key ) ) {
		e.preventDefault();
		const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : ( index + ( e.key === "ArrowDown" ? 1 : -1 ) + items.length ) % items.length;
		items[next]?.focus();
	} else if ( e.key === "Escape" ) {
		e.preventDefault();
		closePanels();
		field( "cb-tools" ).focus();
	}
} );

// --- Movable panels: drag Settings, the Layout panel or the Voice panel by
// its title to anywhere in the window. Each remembers where it was left;
// double-click the title to put it back. ---

function makeMovable( box, handle, key, { centreOnOpen = false } = {} ) {
	if ( !box || !handle ) return;
	const storeKey = `moved:${ key }`;
	let at = { x: 0, y: 0 };
	try {
		if ( centreOnOpen ) localStorage.removeItem( storeKey );
		else at = { ...at, ...JSON.parse( localStorage.getItem( storeKey ) ) };
	} catch {
		// first time: where it normally sits
	}
	const place = () => {
		box.style.translate = at.x || at.y ? `${ at.x }px ${ at.y }px` : "";
	};
	// Keep at least the title in the window.
	const keepInView = () => {
		const r = handle.getBoundingClientRect();
		const dx = r.right < 60 ? 60 - r.right : r.left > window.innerWidth - 60 ? window.innerWidth - 60 - r.left : 0;
		const dy = r.top < 0 ? -r.top : r.top > window.innerHeight - 30 ? window.innerHeight - 30 - r.top : 0;
		if ( dx || dy ) {
			const sx = mirrored === "horizontal" || mirrored === "both" ? -1 : 1;
			const sy = mirroredVertically() ? -1 : 1;
			at = { x: at.x + dx * sx, y: at.y + dy * sy };
			place();
		}
	};
	const save = () => {
		if ( centreOnOpen ) return;
		try {
			localStorage.setItem( storeKey, JSON.stringify( at ) );
		} catch {
			// not remembered this time
		}
	};
	handle.classList.add( "move-handle" );
	handle.title = "Drag to move · double-click to put it back";
	let start = null;
	handle.addEventListener( "pointerdown", ( e ) => {
		if ( e.button !== 0 || e.target.closest( "button, input, select, a" ) ) return;
		e.preventDefault();
		start = { x: e.clientX, y: e.clientY, ax: at.x, ay: at.y };
		handle.setPointerCapture( e.pointerId );
	} );
	handle.addEventListener( "pointermove", ( e ) => {
		if ( !start ) return;
		// Mirroring flips the layer the panels sit on, so it flips the drag too.
		const sx = mirrored === "horizontal" || mirrored === "both" ? -1 : 1;
		const sy = mirroredVertically() ? -1 : 1;
		at = { x: start.ax + ( e.clientX - start.x ) * sx, y: start.ay + ( e.clientY - start.y ) * sy };
		place();
	} );
	const end = () => {
		if ( !start ) return;
		start = null;
		keepInView();
		save();
	};
	handle.addEventListener( "pointerup", end );
	handle.addEventListener( "pointercancel", end );
	handle.addEventListener( "dblclick", ( e ) => {
		if ( e.target.closest( "button, input, select, a" ) ) return;
		at = { x: 0, y: 0 };
		place();
		save();
	} );
	place();
	if ( !centreOnOpen ) window.addEventListener( "resize", keepInView );

	// The whole box inside the window when it opens and when the window
	// changes size: a place it was dragged to on a bigger screen may not fit
	// a smaller one. Where it was dragged to is kept for next time.
	const margin = 8;
	const fit = () => {
		const r = box.getBoundingClientRect();
		if ( !r.width ) return;
		let dx = 0;
		let dy = 0;
		if ( r.right > window.innerWidth - margin ) dx = window.innerWidth - margin - r.right;
		if ( r.left + dx < margin ) dx = margin - r.left;
		if ( r.bottom > window.innerHeight - margin ) dy = window.innerHeight - margin - r.bottom;
		if ( r.top + dy < margin ) dy = margin - r.top;
		if ( !dx && !dy ) return;
		const sx = mirrored === "horizontal" || mirrored === "both" ? -1 : 1;
		const sy = mirroredVertically() ? -1 : 1;
		at = { x: at.x + dx * sx, y: at.y + dy * sy };
		place();
	};
	const shown = box.closest( ".modal" ) ?? box;
	const centreAndFit = () => {
		if ( centreOnOpen ) {
			at = { x: 0, y: 0 };
			place();
		}
		fit();
	};
	new MutationObserver( () => requestAnimationFrame( centreAndFit ) ).observe( shown, { attributes: true, attributeFilter: [ "class" ] } );
	window.addEventListener( "resize", () => requestAnimationFrame( centreAndFit ) );
	new ResizeObserver( () => requestAnimationFrame( fit ) ).observe( box );
}

makeMovable( settingsModal?.querySelector( ".settings-content" ), settingsModal?.querySelector( ".settings-head h3" ), "settings", { centreOnOpen: true } );
makeMovable( uiElement( "layout-panel" ), document.querySelector( "#layout-panel > h4" ), "layout" );
makeMovable( uiElement( "voice-panel" ), document.querySelector( "#voice-panel > h4" ), "voice" );

// --- Layout panel ---

const LAYOUT_FIELDS = [
	// [input id, setting key, format]
	[ "lp-margin-x", "marginX", v => `${ v }%` ],
	[ "lp-margin-top", "marginTop", v => `${ v }%` ],
	[ "lp-margin-bottom", "marginBottom", v => `${ v }%` ],
	[ "lp-line-height", "lineHeight", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-heading-line-height", "headingLineHeight", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-direction-line-height", "directionLineHeight", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-production-line-height", "productionNoteLineHeight", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-heading-scale", "headingScale", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-direction-scale", "directionScale", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-production-scale", "productionNoteScale", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-text-opacity", "textOpacity", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-backing-on-air", "backingOnAir", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-text-brightness", "textBrightness", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-focus-strength", "focusStrength", v => `${ Math.round( v * 100 ) }%` ]
];

function readingLineKey() {
	return settings.eyeLine ? "eyeLineReadingLine" : "readingLine";
}

function syncLayoutPanel() {
	if ( !uiElement( "layout-panel" ) ) return;
	for ( const [ id, key, format ] of LAYOUT_FIELDS ) {
		const input = field( id );
		const value = settings[key] ?? LAYOUT_DEFAULTS[key];
		if ( input.ownerDocument.activeElement !== input ) input.value = value;
		field( `${ id }-value` ).textContent = format( value );
	}
	const reading = settings[readingLineKey()];
	if ( field( "lp-reading-line" ).ownerDocument.activeElement !== field( "lp-reading-line" ) )
		field( "lp-reading-line" ).value = reading;
	field( "lp-reading-line-value" ).textContent = `${ reading }%`;
	field( "lp-align" ).value = settings.textAlign ?? "left";
	field( "lp-align" ).disabled = !!settings.eyeLine;
	field( "lp-marker" ).checked = !!settings.showReadingMarker;
	field( "lp-sentence" ).checked = settings.highlightSentence !== false;
	field( "lp-progress" ).checked = settings.showProgress !== false;
	field( "lp-pinned" ).checked = !!settings.controlsPinned;
	field( "lp-directives" ).checked = !!settings.showDirectives;
	field( "lp-follow-pace" ).checked = settings.followScriptPace !== false;
	field( "lp-focus-band" ).checked = !!settings.focusBand;
	field( "lp-text-effect" ).value = settings.textEffect ?? "none";
	field( "lp-theme" ).value = settings.theme ?? "default";
	field( "lp-font" ).value = settings.scriptFont ?? "default";
	field( "lp-heading-font" ).value = settings.headingFont ?? "same";
	field( "lp-direction-colour" ).value = settings.directionColour || "#c8c8c8";
	field( "lp-direction-theme" ).setAttribute( "aria-pressed", String( !settings.directionColour ) );
	field( "lp-production-colour" ).value = settings.productionNoteColour || "#c8c8c8";
	field( "lp-production-theme" ).setAttribute( "aria-pressed", String( !settings.productionNoteColour ) );
	field( "lp-on-air" ).checked = settings.onAirLight !== false;
	field( "lp-pacing" ).checked = settings.showPacing !== false;
	field( "lp-points" ).checked = !!settings.pointsMode;
	field( "lp-summary" ).checked = settings.takeSummary !== false;
	field( "lp-start-beep" ).checked = !!settings.startBeep;
	field( "lp-hide-capture" ).checked = !!settings.hideFromCapture;
	field( "lp-click-through" ).checked = !!settings.clickThrough;
	document.body.classList.toggle( "show-directives", !!settings.showDirectives );
}

if ( uiElement( "layout-panel" ) ) {
	for ( const [ name, key ] of [ [ "direction", "directionColour" ], [ "production", "productionNoteColour" ] ] ) {
		field( `lp-${ name }-colour` ).addEventListener( "input", () => {
			settings[key] = field( `lp-${ name }-colour` ).value;
			applyLayout();
			syncLayoutPanel();
		} );
		field( `lp-${ name }-colour` ).addEventListener( "change", () => window.electron.saveSettings( { [key]: field( `lp-${ name }-colour` ).value } ) );
		onClick( `lp-${ name }-theme`, () => window.electron.saveSettings( { [key]: "" } ) );
	}
	field( "set-directions" ).addEventListener( "change", () => window.electron.saveSettings( { directions: field( "set-directions" ).value } ) );
	for ( const [ id, key ] of LAYOUT_FIELDS ) {
		field( id ).addEventListener( "input", () => {
			settings[key] = Number( field( id ).value );
			applyLayout();
			syncLayoutPanel();
		} );
		field( id ).addEventListener( "change", () => {
			window.electron.saveSettings( { [key]: Number( field( id ).value ) } );
		} );
	}
	field( "lp-reading-line" ).addEventListener( "input", () => {
		settings[readingLineKey()] = Number( field( "lp-reading-line" ).value );
		setReadingAnchor( settings[readingLineKey()] / 100 );
		updateReadingMarker();
		syncLayoutPanel();
	} );
	field( "lp-reading-line" ).addEventListener( "change", () => {
		window.electron.saveSettings( {
			[readingLineKey()]: Number( field( "lp-reading-line" ).value )
		} );
	} );
	field( "lp-align" ).addEventListener( "change", () => {
		window.electron.saveSettings( { textAlign: field( "lp-align" ).value } );
	} );
	field( "lp-marker" ).addEventListener( "change", () =>
		window.electron.saveSettings( {
			showReadingMarker: field( "lp-marker" ).checked
		} )
	);
	field( "lp-sentence" ).addEventListener( "change", () =>
		window.electron.saveSettings( {
			highlightSentence: field( "lp-sentence" ).checked
		} )
	);
	field( "lp-progress" ).addEventListener( "change", () =>
		window.electron.saveSettings( {
			showProgress: field( "lp-progress" ).checked
		} )
	);
	field( "lp-pinned" ).addEventListener( "change", () =>
		window.electron.saveSettings( {
			controlsPinned: field( "lp-pinned" ).checked
		} )
	);
	onClick( "lp-reset", () =>
		window.electron.saveSettings( { ...LAYOUT_DEFAULTS, readingLine: 33 } )
	);
	onClick( "lp-done", closePanels );
	// Each of these saves straight away; main sends the settings back, which
	// re-applies classes, the mask and the window flags.
	for ( const [ id, key ] of [
		[ "lp-focus-band", "focusBand" ],
		[ "lp-on-air", "onAirLight" ],
		[ "lp-pacing", "showPacing" ],
		[ "lp-points", "pointsMode" ],
		[ "lp-summary", "takeSummary" ],
		[ "lp-start-beep", "startBeep" ],
		[ "lp-hide-capture", "hideFromCapture" ],
		[ "lp-click-through", "clickThrough" ]
	] ) {
		field( id ).addEventListener( "change", () => {
			window.electron.saveSettings( { [key]: field( id ).checked } );
			if ( key === "clickThrough" && field( id ).checked ) {
				showToast( "Click-through on · Ctrl+Shift+X turns it off from anywhere" );
			}
		} );
	}
	for ( const [ id, key ] of [
		[ "lp-text-effect", "textEffect" ],
		[ "lp-theme", "theme" ],
		[ "lp-font", "scriptFont" ],
		[ "lp-heading-font", "headingFont" ]
	] ) {
		field( id ).addEventListener( "change", () =>
			window.electron.saveSettings( { [key]: field( id ).value } )
		);
	}
	field( "lp-follow-pace" ).addEventListener( "change", () => {
		settings.followScriptPace = field( "lp-follow-pace" ).checked;
		window.electron.saveSettings( {
			followScriptPace: settings.followScriptPace
		} );
	} );
	field( "lp-directives" ).addEventListener( "change", () => {
		settings.showDirectives = field( "lp-directives" ).checked;
		document.body.classList.toggle( "show-directives", settings.showDirectives );
		window.electron.saveSettings( { showDirectives: settings.showDirectives } );
	} );
	// Beam-splitter glass reflects every bit of light from the screen into the
	// lens, so: solid black behind the text, dimmer text, and mirrored.
}

// --- Voice panel: scroll mode, speech recognition, microphone with a live meter ---

let meterStream = null;
let meterContext = null;
let meterRaf = null;

function syncVoicePanel() {
	if ( !uiElement( "voice-panel" ) ) return;
	field( "vp-mode" ).value = settings.scrollMode === "voice" ? "voice" : "steady";
	field( "vp-engine" ).value = usesLocalVoice() ? "local" : "deepgram";
	const panel = field( "voice-panel" );
	for ( const el of panel.querySelectorAll( ".voice-local-only" ) )
		el.classList.toggle( "hidden", !usesLocalVoice() );
	for ( const el of panel.querySelectorAll( ".voice-deepgram-only" ) )
		el.classList.toggle( "hidden", usesLocalVoice() );
	showSpeechModel();
	field( "vp-key-status" ).textContent = settings.hasDeepgramKey
		? "✓ A key is saved. Paste a new one to replace it."
		: "No key saved yet. Only needed for Deepgram (console.deepgram.com).";
	if ( document.activeElement !== field( "vp-speed" ) )
		field( "vp-speed" ).value = autoScrollSpeed;
	field( "vp-speed-value" ).textContent = formatSpeed( autoScrollSpeed );
}

function stopMicMeter() {
	cancelAnimationFrame( meterRaf );
	meterRaf = null;
	meterStream?.getTracks().forEach( t => t.stop() );
	meterStream = null;
	meterContext?.close();
	meterContext = null;
	const fill = uiElement( "vp-meter-fill" );
	if ( fill ) fill.style.width = "0";
}

async function startMicMeter() {
	stopMicMeter();
	const status = field( "vp-mic-status" );
	try {
		meterStream = await navigator.mediaDevices.getUserMedia( {
			audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
		} );
	} catch ( err ) {
		status.textContent = `Can't open this microphone: ${ err.message }`;
		return;
	}
	if ( field( "voice-panel" ).classList.contains( "hidden" ) ) {
		stopMicMeter();
		return;
	}
	const track = meterStream.getAudioTracks()[0];
	status.textContent = track ? `Listening on: ${ track.label }` : "";
	meterContext = new AudioContext();
	const analyser = meterContext.createAnalyser();
	analyser.fftSize = 1024;
	meterContext.createMediaStreamSource( meterStream ).connect( analyser );
	const data = new Float32Array( analyser.fftSize );
	const fill = field( "vp-meter-fill" );
	const draw = () => {
		analyser.getFloatTimeDomainData( data );
		let sum = 0;
		for ( const v of data ) sum += v * v;
		const db = 20 * Math.log10( Math.sqrt( sum / data.length ) || 1e-6 );
		// -60 dBFS (empty) to 0 dBFS (full)
		fill.style.width = `${ Math.min( 100, Math.max( 0, ( ( db + 60 ) / 60 ) * 100 ) ) }%`;
		meterRaf = requestAnimationFrame( draw );
	};
	draw();
}

async function fillVoiceMicList() {
	await populateMicSelect();
	field( "vp-mic" ).innerHTML = micSelect.innerHTML;
	field( "vp-mic" ).value = audioDeviceId ?? "";
}

async function openVoicePanel() {
	field( "vp-key" ).value = "";
	syncVoicePanel();
	await fillVoiceMicList();
	await startMicMeter();
	// Device names only appear once the mic is allowed, so list them again.
	await fillVoiceMicList();
}

if ( uiElement( "voice-panel" ) ) {
	field( "vp-mode" ).addEventListener( "change", () => {
		window.electron.saveSettings( { scrollMode: field( "vp-mode" ).value } );
	} );
	field( "vp-engine" ).addEventListener( "change", () => {
		window.electron.saveSettings( { voiceEngine: field( "vp-engine" ).value } );
	} );
	onClick( "vp-model-get", () => window.electron.speechModelDownload() );
	const saveKey = () => {
		const key = field( "vp-key" ).value.trim();
		if ( !key ) return;
		window.electron.setDeepgramKey( key );
		field( "vp-key" ).value = "";
		showTransientHint( "Deepgram key saved", 2000 );
	};
	onClick( "vp-key-save", saveKey );
	field( "vp-key" ).addEventListener( "keydown", ( e ) => {
		if ( e.key === "Enter" ) saveKey();
	} );
	onClick( "vp-sound-check", toggleSoundCheck );
	onClick( "vp-key-clear", () => {
		window.electron.setDeepgramKey( "" );
		showTransientHint( "Deepgram key removed", 2000 );
	} );
	field( "vp-mic" ).addEventListener( "change", () => {
		audioDeviceId = field( "vp-mic" ).value || null;
		window.electron.setAudioDeviceId( audioDeviceId ?? "" );
		startMicMeter();
	} );
	field( "vp-speed" ).addEventListener( "input", () => {
		applyAutoScrollSpeed( Number( field( "vp-speed" ).value ), false );
		syncControls();
	} );
	field( "vp-speed" ).addEventListener( "change", () =>
		applyAutoScrollSpeed( Number( field( "vp-speed" ).value ) )
	);
	onClick( "vp-done", closePanels );
}

// --- Help ---

const helpModal = uiElement( "help-modal" );

function renderHelp() {
	const list = uiElement( "help-list" );
	if ( list ) renderHelpTabs( list, helpTabs( settings, document.body.classList.contains( "points-mode" ) ), "help" );
}

uiElement( "help-guide" )?.addEventListener( "click", () => {
	closeHelp();
	window.electron.openGuide();
} );

async function openHelp() {
	closePanels();
	renderHelp();
	helpModal?.classList.remove( "hidden" );
	await showPanelWindow( "help", helpModal );
	uiElement( "help-close" )?.focus( { preventScroll: true } );
	showControls();
}

function closeHelp() {
	helpModal?.classList.add( "hidden" );
	hidePanelWindow( "help" );
	refreshControlsVisibility();
}

onClick( "help-close", closeHelp );
helpModal?.addEventListener( "keydown", ( e ) => {
	if ( e.key === "Escape" || e.key === "F1" ) closeHelp();
} );
helpModal?.addEventListener( "mousedown", ( e ) => {
	if ( e.target === helpModal ) closeHelp();
} );
window.electron.onMenuHelp( () => {
	if ( helpModal?.classList.contains( "hidden" ) ) openHelp();
	else closeHelp();
} );

// --- About ---

const aboutModal = uiElement( "about-modal" );

// Floating chevrons instead of a scroll bar: ▲ and ▼ appear at the top and
// bottom edge only when there is more to see that way. Wheel and keys still scroll.
// `after` and `before`: parts pinned at the top and bottom of the box (the
// Settings title and tabs, and its Save and Cancel), so the chevrons sit inside them.
// They keep themselves up to date as the content changes (a menu group folding
// open, a Settings tab, a panel opening).
function scrollChevrons( box, { after = null, before = null } = {} ) {
	if ( !box ) return () => {};
	const make = ( dir, label, text ) => {
		const wrap = document.createElement( "div" );
		wrap.className = `scroll-chevron ${ dir } off`;
		const btn = document.createElement( "button" );
		btn.type = "button";
		btn.textContent = text;
		btn.setAttribute( "aria-label", label );
		btn.title = label;
		btn.addEventListener( "click", () => {
			const step = box.clientHeight * 0.8 * ( dir === "up" ? -1 : 1 );
			box.scrollBy( { top: step, behavior: "smooth" } );
		} );
		wrap.append( btn );
		return wrap;
	};
	const up = make( "up", "Scroll up", "▲" );
	const down = make( "down", "Scroll down", "▼" );
	if ( after ) after.after( up );
	else box.prepend( up );
	if ( before ) before.before( down );
	else box.append( down );
	let queued = false;
	const update = () => {
		queued = false;
		if ( after ) up.style.top = `${ after.offsetHeight }px`;
		if ( before ) down.style.bottom = `${ before.offsetHeight }px`;
		up.classList.toggle( "off", box.scrollTop <= 4 );
		const end = box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
		down.classList.toggle( "off", end );
	};
	const schedule = () => {
		if ( queued ) return;
		queued = true;
		requestAnimationFrame( update );
	};
	box.addEventListener( "scroll", update, { passive: true } );
	window.addEventListener( "resize", schedule );
	new ResizeObserver( schedule ).observe( box );
	new MutationObserver( schedule ).observe( box, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [ "class", "hidden", "open" ]
	} );
	return update;
}

const updateAboutChevrons = scrollChevrons(
	aboutModal?.querySelector( ".about-content" )
);
const settingsBox = document.querySelector( ".settings-content" );
for ( const box of [
	uiElement( "layout-panel" ),
	uiElement( "voice-panel" ),
	uiElement( "app-menu" ),
	document.querySelector( ".help-content" )
] ) {
	scrollChevrons( box );
}

function openAbout() {
	closePanels();
	window.electron.getAppInfo();
	aboutModal?.classList.remove( "hidden" );
	aboutModal?.querySelector( ".about-content" )?.scrollTo( 0, 0 );
	requestAnimationFrame( updateAboutChevrons );
	uiElement( "about-close" )?.focus( { preventScroll: true } );
	showControls();
}

function closeAbout() {
	aboutModal?.classList.add( "hidden" );
	refreshControlsVisibility();
}

onClick( "about-close", closeAbout );
aboutModal?.addEventListener( "keydown", ( e ) => {
	if ( e.key === "Escape" ) closeAbout();
} );
aboutModal?.addEventListener( "mousedown", ( e ) => {
	if ( e.target === aboutModal ) closeAbout();
} );
window.electron.onMenuAbout( openAbout );
// Version details for Settings and the full About page.
function formatReleaseDate( iso ) {
	const d = iso ? new Date( `${ iso }T12:00:00` ) : null;
	return d && !Number.isNaN( d.getTime() )
		? d.toLocaleDateString( "en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric"
		} )
		: null;
}
window.electron.getAppInfo();

window.electron.onAppInfo( ( info ) => {
	const brief = uiElement( "settings-about-version" );
	if ( brief ) {
		const updated = formatReleaseDate( info.releaseDate );
		brief.textContent = [ `Version ${ info.version }`, updated && `updated ${ updated }` ]
			.filter( Boolean )
			.join( " · " );
	}
	const el = uiElement( "about-version" );
	const date = formatReleaseDate( info.releaseDate );
	if ( el )
		el.textContent = [
			`Version ${ info.version }`,
			date && `updated ${ date }`,
			"based on Electron Teleprompter 4.1.20",
			`Electron ${ info.electron }`,
			info.platform
		]
			.filter( Boolean )
			.join( " · " );
} );

uiElement( "set-remote-help" )?.addEventListener( "click", () => {
	window.electron.openGuide( "10-setting-up-your-ai.md" );
} );
uiElement( "set-remote-streamdeck" )?.addEventListener( "click", () => {
	window.electron.openGuide( "06-remotes-and-screens.md#stream-deck" );
} );

// --- Updates: a check against the latest release on GitHub ---

const updateLine = uiElement( "settings-about-update" );
uiElement( "settings-about-updates" )?.addEventListener( "click", () => {
	if ( updateLine ) updateLine.textContent = "Checking…";
	window.electron.checkForUpdates( false );
} );

function updateLink( info, text ) {
	const link = document.createElement( "a" );
	link.href = info.url;
	link.target = "_blank";
	link.textContent = text;
	return link;
}

window.electron.onUpdateInfo( ( info ) => {
	if ( info.quiet ) {
		// At start-up, only a newer version is worth a word.
		if ( info.newer ) showUpdateNote( info );
		return;
	}
	if ( !updateLine ) return;
	updateLine.textContent = "";
	if ( info.error ) updateLine.textContent = "Couldn't check just now. Are you online?";
	else if ( info.newer ) {
		updateLine.append( `Version ${ info.latest } is out (you have ${ info.current }). `, updateLink( info, "What's new and download" ) );
	} else updateLine.textContent = `You have the latest version (${ info.current }).`;
} );

// A small note at the bottom right, there until it's closed.
function showUpdateNote( info ) {
	if ( uiElement( "update-note" ) ) return;
	const note = document.createElement( "div" );
	note.id = "update-note";
	note.setAttribute( "role", "status" );
	const close = document.createElement( "button" );
	close.type = "button";
	close.textContent = "×";
	close.title = "Close";
	close.setAttribute( "aria-label", "Close" );
	close.addEventListener( "click", () => note.remove() );
	note.append( `Sightline ${ info.latest } is out. `, updateLink( info, "What's new and download" ), close );
	hud.appendChild( note );
}

// Sightline is free. Once it's been opened ten times, a small note asks
// once, never again, and never while you're reading or on air.
const SUPPORT_LAUNCHES = "sightline.launches";
const SUPPORT_ASKED = "sightline.supportAsked";

function maybeAskForSupport() {
	try {
		if ( localStorage.getItem( SUPPORT_ASKED ) ) return;
		const launches = Number( localStorage.getItem( SUPPORT_LAUNCHES ) ?? 0 ) + 1;
		localStorage.setItem( SUPPORT_LAUNCHES, String( launches ) );
		if ( launches < 10 ) return;
	} catch {
		return;
	}
	setTimeout( () => {
		const busy = steadySessionActive() || autoScrollActive || onAir() || !settingsModal?.classList.contains( "hidden" );
		if ( busy || uiElement( "support-note" ) ) return;
		try {
			localStorage.setItem( SUPPORT_ASKED, new Date().toISOString() );
		} catch {
			// it may ask again next time; that's all
		}
		const note = document.createElement( "div" );
		note.id = "support-note";
		note.setAttribute( "role", "status" );
		const link = document.createElement( "a" );
		link.href = SUPPORT_URL;
		link.target = "_blank";
		link.textContent = "☕ Buy Joanne a coffee";
		link.addEventListener( "click", () => note.remove() );
		const close = document.createElement( "button" );
		close.type = "button";
		close.textContent = "×";
		close.title = "No thanks";
		close.setAttribute( "aria-label", "No thanks" );
		close.addEventListener( "click", () => note.remove() );
		note.append( "Glad Sightline helps? It's free. If you'd like to say thanks: ", link, close );
		hud.appendChild( note );
	}, 30000 );
}
maybeAskForSupport();

// --- Settings files ---

window.electron.onMenuExportSettings( () => window.electron.exportSettings() );
window.electron.onMenuImportSettings( () => window.electron.importSettings() );

// --- Drag and drop a script ---

const dropOverlay = uiElement( "drop-overlay" );
let dragDepth = 0;

// A file, or a Google Docs link dragged from the browser's address bar.
const droppable = types =>
	types?.includes( "Files" ) || types?.includes( "text/uri-list" );
window.addEventListener( "dragenter", ( e ) => {
	if ( !droppable( e.dataTransfer?.types ) || isEditMode ) return;
	dragDepth++;
	dropOverlay?.classList.remove( "hidden" );
} );
window.addEventListener( "dragleave", () => {
	dragDepth = Math.max( 0, dragDepth - 1 );
	if ( !dragDepth ) dropOverlay?.classList.add( "hidden" );
} );
window.addEventListener( "dragover", ( e ) => {
	e.preventDefault();
} );
window.addEventListener( "drop", ( e ) => {
	e.preventDefault();
	dragDepth = 0;
	dropOverlay?.classList.add( "hidden" );
	if ( isEditMode ) return;
	const file = e.dataTransfer?.files?.[0];
	if ( file ) {
		window.electron.openDroppedFile( file );
		return;
	}
	const link = e.dataTransfer?.getData( "text/uri-list" )?.split( /\r?\n/ )
		.find( line => line && !line.startsWith( "#" ) );
	if ( link && GOOGLE_DOC_LINK.test( link ) ) {
		showGoogleDocDialog( link );
		openGoogleDoc( link );
	} else if ( link ) {
		showToast( "Drop a script file or a Google Docs link" );
	}
} );

window.addEventListener( "resize", () => {
	updateEdgeMask();
	scheduleMeasure();
} );

applyLayout();
syncControls();
refreshControlsVisibility();

// After a reload (View > Reload), show the open script again.
window.electron.reloadContent();

// --- Remote control (AI assistants and scripts on this computer) ---

let lastStatusSent = 0;

function sendStatus() {
	window.electron.sendRendererStatus( {
		obs: obsUi.state(),
		scrolling: isScrolling(),
		preparing: autoScrollStarting || slating,
		onAir: onAir(),
		backing: Math.round( liveBacking() * 100 ),
		panel: layoutPanel?.classList.contains( "hidden" ) === false ? layoutView : null,
		section: scriptIndex,
		scrollY: Math.round( window.scrollY ),
		progress: progressText?.textContent ?? "",
		editing: isEditMode,
		points: pointsMode(),
		sectionTitle: currentSectionTitle(),
		speed: settings.scrollMode === "voice" ? "Voice" : `${ getWpm() } wpm`,
		soundCheck: soundCheckOn(),
		// The microphone is on: following your voice, or listening for the wake word.
		listening: autoScrollActive ? "voice" : commandListeningOn() ? "wake" : null,
		wakeWord: wakeLabel( settings.wakeWord ),
		listenerHealth,
		listeningControl: {
			suspended: listeningSuspended,
			mode: settings.voiceCommands ?? "voice",
			available: !isEditMode && !offScript && !modelMaintenance && !speechModel.downloading && ( usesLocalVoice() ? !!speechModel.installed : !!settings.hasDeepgramKey ),
			canRestart: !listeningSuspended && ( autoScrollActive || wantCommandListening() || commandFailure ) && !isEditMode && !offScript && !modelMaintenance && !speechModel.downloading
		}
	} );
}

// Whether it's listening for the wake word (set up further up the page).
function commandListeningOn() {
	try {
		return commandListening;
	} catch {
		return false;
	}
}

// Whether the sound check is on (it's set up further down the page).
function soundCheckOn() {
	try {
		return soundCheck;
	} catch {
		return false;
	}
}

// Keep the pad and phone remote in step with keys, pedals and the countdown.
setInterval( sendStatus, 1000 );

window.addEventListener(
	"scroll",
	() => {
		if ( Date.now() - lastStatusSent > 500 ) {
			lastStatusSent = Date.now();
			sendStatus();
		}
	},
	{ passive: true }
);

// --- Control window: a live copy of the script on the operator screen ---
// The copy has the same top-level blocks, so a position is sent as a block
// number and how far through it the reading line is.

function sendPreviewContent() {
	if ( controlOpen && md ) window.electron.sendPreviewContent( md.innerHTML );
}

// Measured from the middle of the line being read (where the reading arrow
// points), not its top edge, so rounding can't tip it into the block above.
function previewPosition() {
	const y = readingLineY() + halfTextHeightEm() * parseFloat( getComputedStyle( document.body ).fontSize );
	let index = 0;
	let fraction = 0;
	const blocks = md?.children ?? [];
	for ( let i = 0; i < blocks.length; i++ ) {
		const el = blocks[i];
		if ( !el.offsetHeight ) continue; // hidden (talking points, directives)
		const top = layoutTop( el );
		if ( top > y ) break;
		index = i;
		fraction = Math.min( 1, ( y - top ) / el.offsetHeight );
	}
	return { index, fraction };
}

function pacingSnapshot() {
	if ( !pacingEl || pacingEl.classList.contains( "hidden" ) ) return null;
	if ( settings.showPacing === false ) return null;
	const level = [ "good", "warn", "bad", "wait" ].find( c =>
		pacingEl.classList.contains( c )
	);
	const parts = [ ...pacingEl.children ].map( c => [ c.className, c.textContent ] );
	return { level, parts };
}

let lastPreviewSent = 0;
function sendPreviewPosition() {
	if ( !controlOpen || !md ) return;
	lastPreviewSent = Date.now();
	window.electron.sendPreviewPosition( {
		...previewPosition(),
		anchor: getReadingAnchor(),
		points: pointsMode(),
		pointsIndex,
		pacing: pacingSnapshot()
	} );
}

window.electron.onControlOpen( ( open ) => {
	controlOpen = !!open;
	sendPreviewContent();
	sendPreviewPosition();
	sendStatus();
} );
setInterval( sendPreviewPosition, 250 );
window.addEventListener(
	"scroll",
	() => {
		if ( Date.now() - lastPreviewSent > 40 ) sendPreviewPosition();
	},
	{ passive: true }
);

// A click on a line in the control window: bring that line to the reading line.
window.electron.onPreviewJump( ( index, fraction ) => {
	if ( isEditMode || !md ) return;
	const block = md.children[index];
	if ( !block ) return;
	if ( pointsMode() ) {
		const section = Number( block.dataset.section );
		if ( section >= 0 ) goToPoint( section );
	} else {
		const y = layoutTop( block ) + fraction * block.offsetHeight;
		// The clicked point goes on the reading arrow, half a line below the reading point.
		const half = halfTextHeightEm() * parseFloat( getComputedStyle( document.body ).fontSize );
		const top = y - window.innerHeight * getReadingAnchor() - half;
		window.scrollTo( 0, Math.max( 0, top ) );
		previewManuallyScrolled = true;
		scriptIndex = sectionOnScreen();
	}
	sendPreviewPosition();
	sendStatus();
} );

// Top of an element in the page, ignoring the mirror transform.
function layoutTop( el ) {
	let y = 0;
	for ( let node = el; node; node = node.offsetParent ) y += node.offsetTop;
	return y;
}

// The section on screen now: the last one whose heading has reached the
// reading line. Scrolling doesn't update scriptIndex, so work it out from
// the position.
function sectionOnScreen() {
	const y = readingLineY();
	let index = 0;
	for ( let i = 1; ; i++ ) {
		const anchor = document.getElementsByName( i )[0];
		if ( !anchor || layoutTop( anchor ) > y + 2 ) break;
		index = i;
	}
	return index;
}

// The heading of the section on screen (or the current talking point).
function currentSectionTitle() {
	if ( pointsMode() ) return pointUnit( pointsIndex )?.title ?? "";
	const headings = md?.querySelectorAll( "h2" ) ?? [];
	return cleanHeading( headings[sectionOnScreen() - 1] );
}

function jumpSection( step ) {
	scriptIndex = sectionOnScreen();
	// Previous from part-way through a section goes back to its start first.
	const anchor = document.getElementsByName( scriptIndex )[0];
	const start = sectionStartScroll( scriptIndex );
	if ( step < 0 && anchor && start !== null && window.scrollY > start + 40 ) step = 0;
	const next = scriptIndex + step;
	if ( next < 0 || document.getElementsByName( next ).length === 0 ) return;
	recording.jump( pendingJumpReason ?? ( step > 0 ? "next" : "back" ) );
	pendingJumpReason = null;
	scriptIndex = next;
	previewManuallyScrolled = true;
	jumpToSection( scriptIndex );
}

function runRemoteAction( action, value ) {
	if ( [ "obs-on", "obs-off", "obs-pause", "obs-resume" ].includes( action ) ) {
		if ( !settings.obsEnabled || !settings.obsControls ) return;
		return obsUi.action( { "obs-on": "start", "obs-off": "stop", "obs-pause": "pause", "obs-resume": "resume" }[action], { prompt: action === "obs-off" || action === "obs-pause" } );
	}
	if ( action === "listening-toggle" ) return toggleSessionListening();
	if ( action === "listening-restart" ) return restartListening();
	if ( action === "session-check" ) return workflow?.open( "session" );
	if ( action === "obs-record" ) {
		obsUi.action( "start" );
		return;
	}
	if ( action === "obs-finish" ) {
		obsUi.action( "stop" );
		return;
	}
	if ( action === "head-guide" || action === "head-guide-fullscreen" ) {
		window.electron.headGuide( action === "head-guide" ? "toggle" : "fullscreen" );
		return;
	}
	if ( isEditMode && action !== "help" ) return;
	if ( action === "play" && ( !isScrolling() || offScript ) ) toggleAutoScrollSession();
	else if ( action === "pause" && isScrolling() ) toggleAutoScrollSession();
	else if ( action === "toggle" ) toggleAutoScrollSession();
	else if ( action === "restart" ) {
		if ( pointsMode() ) goToPoint( 0 );
		else goToStart();
	} else if ( action === "next-section" ) {
		if ( pointsMode() ) goToPoint( pointsIndex + 1 );
		else jumpSection( 1 );
	} else if ( action === "previous-section" ) {
		if ( pointsMode() ) goToPoint( pointsIndex - 1 );
		else jumpSection( -1 );
	} else if ( action === "faster" ) adjustAutoScrollSpeed( "up" );
	else if ( action === "slower" ) adjustAutoScrollSpeed( "down" );
	else if ( action === "reset-speed" ) adjustAutoScrollSpeed( "reset" );
	else if ( action === "back-to-marker" ) jumpToPreviousMarker();
	else if ( action === "set-wpm" && Number.isFinite( Number( value ) ) ) {
		settings.steadyWpm = setWpm( Number( value ) );
		window.electron.saveSettings( { steadyWpm: settings.steadyWpm } );
		syncControls();
	} else if ( action === "go-to-section" && Number.isInteger( Number( value ) ) ) {
		jumpSection( Number( value ) - scriptIndex );
	} else if ( action === "marker" ) dropMarker();
	else if ( action === "keeper" || action === "scrap" ) rateTake( action );
	else if ( action === "help" ) openHelp();
	else if ( action === "on-air" ) toggleOnAir();
	else if ( action === "mirror" ) cycleMirror();
	else if ( action === "mirror-h" || action === "mirror-v" ) toggleMirrorAxis( action.slice( -1 ) );
	else if ( action === "bigger" ) setFontSize( fontSize + FONT_SIZE_STEP );
	else if ( action === "smaller" ) setFontSize( fontSize - FONT_SIZE_STEP );
	else if ( [ "layout", "reading", "recording" ].includes( action ) ) toggleLayoutView( action );
	else if ( action === "eye-line" ) window.electron.saveSettings( { eyeLine: !settings.eyeLine } );
	else if ( action === "click-through" ) window.electron.saveSettings( { clickThrough: !settings.clickThrough } );
	// Dials: value is the number of steps, + or -.
	else if ( action === "scroll" && Number.isFinite( Number( value ) ) ) {
		window.scrollBy( { top: Number( value ) * parseFloat( getComputedStyle( md ).lineHeight || "40" ), behavior: "smooth" } );
	} else if ( action === "backing" && Number.isFinite( Number( value ) ) ) setLiveBacking( liveBacking() + Number( value ) * OPACITY_STEP );
	else if ( action === "sound-check" ) toggleSoundCheck();
	else if ( action === "scroll-mode" ) window.electron.saveSettings( { scrollMode: settings.scrollMode === "voice" ? "steady" : "voice" } );
	else if ( action === "pad" ) window.electron.saveSettings( { showPad: !settings.showPad } );
	else if ( action === "control" ) window.electron.saveSettings( { showControl: !settings.showControl } );
	sendStatus();
}
window.electron.onRemoteCommand( runRemoteAction );

window.electron.onRemoteInfo( ( info ) => {
	componentAvailability?.remote( info );
	const peerStatus = uiElement( "set-stream-deck-status" );
	if ( peerStatus ) {
		const peer = info.streamDeckPeer;
		const versions = `Sightline ${ info.appVersion ?? "version unknown" }`;
		let text;
		if ( !info.streamDeck ) text = `${ versions }. Stream Deck control is off; Apply after enabling it.`;
		else if ( info.error ) text = `${ versions }. Connection unavailable: ${ info.error }`;
		else if ( !peer?.connected ) text = `${ versions }. Plugin version not confirmed. Open Stream Deck with plugin ${ peer?.recommendedPluginVersion ?? "0.1.9" } or later, then check again.`;
		else text = `${ versions } · plugin ${ peer.pluginVersion }. ${ peer.message }. Required plugin ${ peer.minimumPluginVersion } or later.${ peer.updateRecommended ? ` Recommended: ${ peer.recommendedPluginVersion }.` : "" }`;
		if ( peerStatus.textContent !== text ) peerStatus.textContent = text;
	}
	const status = uiElement( "set-remote-status" );
	if ( !status ) return;
	field( "set-remote-token" ).value = info.token ?? "";
	if ( info.error ) status.textContent = `Not running: ${ info.error }`;
	else if ( info.running && info.enabled )
		status.textContent = `On at ${ info.url }. Assistant connection details are saved in your Sightline settings folder.`;
	else status.textContent = "Off.";
} );
onClick( "set-stream-deck-check", () => window.electron.getRemoteInfo() );
onClick( "set-remote-copy", async () => {
	if ( field( "set-remote-copy" ).disabled ) return;
	try {
		await navigator.clipboard.writeText( field( "set-remote-token" ).value );
		showTransientHint( "Token copied", 1500 );
	} catch {
		showToast( "Could not copy the token. Try again from Settings." );
	}
} );
onClick( "set-remote-new", () => window.electron.newRemoteToken() );

window.electron.onPhoneInfo( ( info ) => {
	phoneStatus = info;
	const status = uiElement( "set-phone-status" );
	const connect = uiElement( "set-phone-connect" );
	if ( !status || !connect ) return;
	connect.classList.toggle( "hidden", !info.qr );
	if ( info.qr ) uiElement( "set-phone-qr" ).src = info.qr;
	uiElement( "set-phone-url" ).textContent = info.url ?? "";
	if ( info.error ) status.textContent = `Not running: ${ info.error }`;
	else if ( info.running )
		status.textContent = "On. Scan the code with your phone.";
	else status.textContent = "Off. Tick the box, then Apply or Save & close.";
} );
onClick( "set-phone-new", () => window.electron.newPhoneKey() );

const SETTINGS_TAB_KEY = "settingsTab";
syncPadSettings = createPadSettings( settingsModal, partial => window.electron.saveSettings( partial ) );
syncPadSettings( settings.padLayout );
mappingSettings = createMappingSettings( settingsModal, partial => window.electron.saveSettings( partial ) );
mappingSettings.sync( settings.inputMappings );
componentAvailability = createComponentAvailability( settingsModal, { navigate: name => showSettingsTab( name ) } );
componentSettings = createComponentSettings( settingsModal, { onStatus: ( status ) => {
	componentStatus = status;
	componentAvailability.components( status );
	obsUi.installation( status.obs ?? null );
}, toast: text => showToast( text, 4500 ), changeModel: async ( action ) => {
	if ( isScrolling() || autoScrollStarting || slating || [ "recording", "paused" ].includes( obsUi.state().recording ) ) throw new Error( "Stop prompting and recording before changing the speech model" );
	modelMaintenance = true;
	try {
		await syncCommandListening();
		return await window.electron.speechModelChange( action );
	} finally {
		modelMaintenance = false;
		syncCommandListening();
	}
} } );
componentSettings.paintSpeech( speechModel );
// The modal is adopted by the separate Settings window; listen on the node.
settingsModal.addEventListener( "keydown", ( event ) => {
	if ( !mappingSettings.learning ) return;
	event.preventDefault();
	event.stopImmediatePropagation();
	if ( event.key === "Escape" ) mappingSettings.cancel();
	else if ( !event.repeat ) {
		const input = keyInput( event );
		if ( input ) mappingSettings.learn( input );
	}
}, true );
const settingsNavigation = createSettingsNavigation( settingsModal, { onShow: ( name ) => {
	if ( name !== "buttons" ) mappingSettings.cancel();
	if ( name.startsWith( "component-" ) || [ "remotes", "streamdeck", "obs", "obs-recording", "obs-setup" ].includes( name ) ) componentSettings.refresh();
	settingsTrail( `tab ${ name }` );
	if ( LAYOUT_TABS.includes( name ) ) borrowLayoutPanel();
	settingsBox?.scrollTo( 0, 0 );
} } );
addSettingsHelp( settingsModal );
const settingsPages = createSettingsPages( settingsModal );

// The About tab is a brief; the full page is a click away.
uiElement( "settings-about-full" )?.addEventListener( "click", () => requestCloseSettings( openAbout ) );
uiElement( "settings-about-guide" )?.addEventListener( "click", () => {
	window.electron.openGuide();
} );
uiElement( "settings-about-support" )?.addEventListener( "click", () => window.open( SUPPORT_URL ) );
onClick( "settings-restore-defaults", async () => {
	const button = field( "settings-restore-defaults" );
	const status = field( "settings-restore-defaults-status" );
	if ( isScrolling() || autoScrollStarting || slating || isEditMode || isDirty ) {
		status.textContent = "Pause prompting and save or close the script editor before resetting.";
		return;
	}
	button.disabled = true;
	status.textContent = "Waiting for your confirmation…";
	let restarting = false;
	try {
		const result = await window.electron.restoreDefaults();
		restarting = result.restarting === true;
		status.textContent = result.cancelled ? "Cancelled. Your setup is unchanged." : result.ok ? "Restarting into initial setup…" : result.error;
	} catch ( error ) {
		status.textContent = `Restore could not finish: ${ error.message }`;
	} finally {
		if ( !restarting ) changingRecordingScript = false;
		button.disabled = false;
	}
} );
for ( const link of document.querySelectorAll( "a.support-link" ) ) link.href = SUPPORT_URL;

function showSettingsTab( name ) {
	settingsNavigation.show( name );
}

// The Layout tab shows the Layout panel's own controls (they apply straight
// away), moved into Settings while it is open and put back when it closes.
const layoutPanel = uiElement( "layout-panel" );
const layoutHost = uiElement( "set-layout-host" );
// Each live appearance control has one settings home. Directions and long
// preparation notes have separate fieldsets under the Directions topic.
const layoutHosts = {
	layout: layoutHost,
	theme: uiElement( "set-theme-host" ),
	reading: uiElement( "set-reading-host" ),
	directions: uiElement( "set-directions-host" ),
	"production-notes": uiElement( "set-production-notes-host" ),
	background: uiElement( "set-background-host" ),
	aids: uiElement( "set-aids-host" ),
	display: uiElement( "set-display-host" ),
	recording: uiElement( "set-recording-host" ),
	script: uiElement( "set-script-host" )
};
const LAYOUT_GROUP_TABS = {
	Opacity: "reading",
	Spacing: "layout",
	"Reading aids": "reading",
	Recording: "recording",
	Script: "recording"
};
const LAYOUT_TABS = Object.keys( layoutHosts );
const LAYOUT_TITLES = { layout: "Layout", reading: "Reading", recording: "Recording" };

// The same groups make the floating panel's three views, one per control-bar
// button. Done and Reset show in every view.
{
	let tab = "layout";
	for ( const el of layoutPanel?.children ?? [] ) {
		if ( el.tagName === "H4" ) continue;
		if ( el.tagName === "H5" ) tab = LAYOUT_GROUP_TABS[el.textContent.trim()] ?? "layout";
		if ( el.classList.contains( "lp-actions" ) ) continue;
		el.dataset.view = el.classList.contains( "lp-hint" ) || el.classList.contains( "lp-mirror-row" ) ? "layout" : tab;
	}
}
let layoutView = "layout";

function showLayoutView( view ) {
	layoutView = view;
	for ( const el of layoutPanel?.querySelectorAll( "[data-view]" ) ?? [] ) {
		el.classList.toggle( "lp-off", el.dataset.view !== view );
	}
	const title = layoutPanel?.querySelector( "h4" );
	if ( title ) title.textContent = LAYOUT_TITLES[view];
}

function toggleLayoutView( view ) {
	if ( !settingsModal.classList.contains( "hidden" ) ) {
		showSettingsTab( view );
		showPanelWindow( "settings", settingsModal, () => settingsPages.layout() );
		return;
	}
	const open = !layoutPanel?.classList.contains( "hidden" );
	if ( open && layoutView === view ) {
		closePanels();
		return;
	}
	showLayoutView( view );
	if ( !open ) togglePanel( "layout-panel" );
}
showLayoutView( "layout" );
let layoutBorrowed = [];

function borrowLayoutPanel() {
	if ( layoutBorrowed.length || !layoutPanel || !layoutHost ) return;
	layoutBorrowed = [ ...layoutPanel.children ].filter(
		el => el.tagName !== "H4"
	);
	let tab = "layout";
	for ( const el of layoutBorrowed ) {
		if ( el.tagName === "H5" ) {
			const heading = el.textContent.trim();
			tab = { Opacity: "background", "Reading aids": "aids", Script: "script" }[heading] ?? LAYOUT_GROUP_TABS[heading] ?? "layout";
		}
		// The margins note and Reset layout belong with the spacing.
		const spacing = el.classList.contains( "lp-hint" ) || el.classList.contains( "lp-actions" );
		el.classList.remove( "lp-off" );
		if ( el.classList.contains( "lp-mirror-row" ) ) {
			uiElement( "set-mirror-host" ).append( el );
			continue;
		}
		const id = el.dataset.settingsControl ?? el.querySelector( "input[id], select[id]" )?.id;
		const destination = id?.startsWith( "lp-production-" ) ? "production-notes" : id?.startsWith( "lp-direction-" ) ? "directions" : [ "lp-font", "lp-heading-font", "lp-heading-scale" ].includes( id ) ? "reading" : id === "lp-theme" ? "theme" : [ "lp-marker", "lp-sentence", "lp-progress" ].includes( id ) ? "aids" : id === "lp-pinned" ? "display" : id === "lp-summary" ? "recording" : spacing ? "layout" : tab;
		( layoutHosts[destination] ?? layoutHost ).append( el );
	}
	for ( const id of [ "lp-font", "lp-heading-font", "lp-heading-scale" ] ) {
		layoutHosts.reading.append( field( id ).closest( "[data-settings-control]" ) );
	}
	for ( const [ host, prefix ] of [ [ layoutHosts.directions, "direction" ], [ layoutHosts["production-notes"], "production" ] ] ) {
		for ( const suffix of [ "scale", "colour", "line-height" ] ) host.append( field( `lp-${ prefix }-${ suffix }` ).closest( "[data-settings-control]" ) );
	}
	field( "lp-done" )?.classList.add( "hidden" );
	syncControls();
}

function returnLayoutPanel() {
	if ( !layoutBorrowed.length ) return;
	layoutPanel.append( ...layoutBorrowed );
	layoutBorrowed = [];
	showLayoutView( layoutView );
	field( "lp-done" )?.classList.remove( "hidden" );
}

// Shared live controls remain applied when the Settings draft is cancelled.
function refreshSharedDisplayFields() {
	if ( settingsSnapshot ) settingsSnapshot.opacity = opacity;
}
for ( const type of [ "input", "change", "click" ] ) {
	for ( const host of Object.values( layoutHosts ) ) {
		host?.addEventListener( type, () =>
			setTimeout( refreshSharedDisplayFields, 200 )
		);
	}
}

function lastSettingsTab() {
	try {
		return localStorage.getItem( SETTINGS_TAB_KEY ) ?? "scrolling";
	} catch {
		return "scrolling";
	}
}
// --- Script directives: pauses, markers and pace targets ---
// readDirectives() (directives.js) finds what the script asks for; this part
// acts on it while steady scrolling. Positions are measured with the word
// index (scheduleMeasure) because they move with the text size and width.

function pageY( el ) {
	return el.getBoundingClientRect().top + window.scrollY;
}

function readingLineY() {
	return window.scrollY + window.innerHeight * getReadingAnchor();
}

function measureDirectives( ranges ) {
	const wordTops = ranges.map(
		r => r.getBoundingClientRect().top + window.scrollY
	);
	const sections = scriptDirectives.sections.map( s => ( {
		...s,
		y: pageY( s.heading )
	} ) );
	sections.forEach( ( s, i ) => {
		const end = sections[i + 1]?.y ?? Infinity;
		s.words = wordTops.filter( y => y >= s.y && y < end ).length;
	} );
	directivePoints = {
		wordTops,
		sections,
		pauses: scriptDirectives.pauses.map( p => ( { ...p, y: pageY( p.el ) } ) ),
		// Script markers know which word follows them, so voice mode can log the
		// moment that word is said.
		scriptMarkers: scriptDirectives.markers.map( ( m, key ) => ( {
			key,
			label: m.label,
			y: pageY( m.el ),
			word: wordAfter( m.el, ranges )
		} ) ),
		markers: [ ...scriptDirectives.markers.map( ( m, key ) => ( { ...m, key } ) ), ...liveMarkers ]
			.map( m => ( { ...m, y: pageY( m.el ) } ) )
			.sort( ( a, b ) => a.y - b.y ),
		paceChanges: scriptDirectives.paceChanges.map( c => ( {
			...c,
			y: pageY( c.el )
		} ) ),
		listenOns: ( scriptDirectives.listenOns ?? [] ).map( o => ( { ...o, y: pageY( o.el ) } ) ),
		prompterCommands: ( scriptDirectives.prompterCommands ?? [] ).map( c => ( { ...c, y: pageY( c.el ) } ) )
	};
}

// Pixels per word around the reading line (steady-scroll.js uses it so the
// set words per minute holds in dense text as well as on average).
setLocalPxPerWord( () => {
	const tops = directivePoints.wordTops;
	if ( tops.length < 30 ) return null;
	const y = readingLineY();
	let lo = 0;
	let hi = tops.length;
	while ( lo < hi ) {
		const mid = Math.floor( ( lo + hi ) / 2 );
		if ( tops[mid] < y ) lo = mid + 1;
		else hi = mid;
	}
	const a = Math.max( 0, lo - 12 );
	const b = Math.min( tops.length - 1, lo + 12 );
	return b > a ? ( tops[b] - tops[a] ) / ( b - a ) : null;
} );

function sectionAt( y ) {
	let found = null;
	for ( const s of directivePoints.sections ) {
		if ( s.y <= y + 1 ) found = s;
	}
	return found;
}

// The pace the script asks for at this point: an inline {wpm} in this section,
// then the section's own wpm or target time, then the script's wpm.
function scriptPaceAt( y ) {
	const section = sectionAt( y );
	if ( section ) {
		const change = directivePoints.paceChanges
			.filter( c => c.y >= section.y && c.y <= y + 1 )
			.pop();
		if ( change ) return change.wpm;
		if ( section.wpm ) return section.wpm;
		if ( section.targetSeconds && section.words > 0 ) {
			return Math.round( section.words / ( section.targetSeconds / 60 ) );
		}
	}
	// A single take with a whole-script {target}: pace to land on it.
	const { script } = scriptDirectives;
	const words = directivePoints.wordTops.length;
	if ( script.pacing === "session" && script.targetSeconds && words ) {
		return Math.round( words / ( script.targetSeconds / 60 ) );
	}
	return script.wpm ?? null;
}

function followScriptPace( y ) {
	if ( settings.followScriptPace === false ) return;
	const pace = scriptPaceAt( y );
	if ( !pace || pace === appliedPace ) return;
	appliedPace = pace;
	settings.steadyWpm = setWpm( pace );
	setIndicator( steadyIndicatorText() );
	syncControls();
}

function startCueTracking() {
	handledCues.clear();
	handledCommands.clear();
	lastCue = null;
	lastReadingY = readingLineY();
	appliedPace = null;
	followScriptPace( lastReadingY );
	const opening = openingSoundCheck();
	if ( opening ) pauseAtCue( opening );
}

let cueWasStop = false;
let lastCue = null; // the pause just handled
const handledCues = new Set(); // pauses already handled on this pass
const handledCommands = new Set(); // {prompter: …} already run on this pass

async function pauseAtCue( pause ) {
	stopSteadyScroll();
	cuePaused = true;
	cueWasStop = !pause.seconds;
	lastCue = pause;
	handledCues.add( pause );
	if ( !pause.soundcheck ) {
		if ( !directivePoints.wordTops.some( y => y > pause.y + 2 ) ) await linkedRecording.finish();
		else await linkedRecording.pause();
	}
	showPausePill( pause.seconds, resumeFromCue );
	if ( pause.soundcheck ) startScriptSoundCheck( pause.soundcheck, pause );
	if ( pause.listen === "off" ) {
		recording.listen( false );
		setIndicator( OFF_SCRIPT_TEXT, "stopped" );
	}
	updatePlayButton();
	syncCommandListening();
}

async function resumeFromCue() {
	// Room then voice: straight on to the next check.
	const nextCheck = lastCue?.soundcheck ? nextSoundCheck( lastCue ) : null;
	if ( nextCheck ) {
		pauseAtCue( nextCheck );
		return;
	}
	if ( !await prepareReading() ) return;
	clearPausePill();
	cuePaused = false;
	syncCommandListening();
	const offScriptCue = lastCue?.listen === "off";
	if ( offScriptCue ) {
		goToListenOn( lastCue );
		recording.listen( true );
	}
	const carryOn = () => {
		startSteadyScroll( {
			el: md,
			wordsPerMinute: settings.steadyWpm,
			onFinished: () => {
				setIndicator( null );
				linkedRecording.finish();
			}
		} );
		// Just before the pause that was handled, so another pause on the same
		// line (a countdown and then a stop) still counts. After {listen: off},
		// from the {listen: on} it jumped to.
		lastReadingY = lastCue && !offScriptCue ? Math.min( readingLineY(), lastCue.y - 0.5 ) : readingLineY();
		setIndicator( steadyIndicatorText() );
	};
	if ( cueWasStop ) afterSlate( carryOn );
	else carryOn();
}

function clearCuePause() {
	clearPausePill();
	if ( !cuePaused ) return;
	cuePaused = false;
	syncCommandListening();
}

window.addEventListener(
	"scroll",
	() => {
		const y = readingLineY();
		if ( isSteadyRunning() && lastReadingY !== null ) {
			// Back above the last pause (a retake): it counts again.
			for ( const p of handledCues ) if ( y < p.y - 1 ) handledCues.delete( p );
			const pause = directivePoints.pauses.find(
				p => !handledCues.has( p ) && p.y > lastReadingY && p.y <= y
			);
			if ( pause ) {
				lastReadingY = y;
				pauseAtCue( pause );
				return;
			}
			for ( const c of handledCommands ) if ( y < c.y - 1 ) handledCommands.delete( c );
			for ( const c of directivePoints.prompterCommands ) {
				if ( handledCommands.has( c ) || c.y <= lastReadingY || c.y > y ) continue;
				handledCommands.add( c );
				runScriptCommand( c.command );
			}
			followScriptPace( y );
		}
		lastReadingY = y;
	},
	{ passive: true }
);

// Markers: {marker} in the script, or dropped with B during a take.
function dropMarker() {
	const y = readingLineY();
	const { ranges } = buildWordIndex( md );
	const word = ranges.find(
		r => r.getBoundingClientRect().top + window.scrollY >= y - 4
	);
	if ( !word ) return;
	const el = document.createElement( "span" );
	el.className = "live-marker";
	el.setAttribute( "aria-label", "Marker" );
	const start = word.cloneRange();
	start.collapse( true );
	start.insertNode( el );
	const key = `b${ liveMarkers.length + 1 }`;
	liveMarkers.push( { el, key } );
	recording.marker( { from: "key", key } );
	scheduleMeasure();
	showToast( "Marker added · Ctrl+B jumps between markers" );
	sendPreviewContent();
}

// Back to the last marker before the reading line, to read on from there
// (Shift+B, or "Prompter, back to the marker"). Within a take it's logged as
// a restart, so the edit can cut to the second reading.
function jumpToPreviousMarker() {
	const markers = directivePoints.markers;
	const y = readingLineY();
	const prev = markers.filter( m => m.y < y - 8 ).at( -1 );
	if ( !prev ) {
		showToast( "No marker before this point · press B to add one" );
		return;
	}
	window.scrollTo( 0, Math.max( 0, prev.y - window.innerHeight * getReadingAnchor() ) );
	previewManuallyScrolled = true;
	recording.restart( { label: prev.label ?? null, key: prev.key ?? null } );
	resyncAfterJump();
	showToast( prev.label ? `Back to “${ prev.label }”` : "Back to the last marker" );
}

function jumpToNextMarker() {
	const markers = directivePoints.markers;
	if ( !markers.length ) {
		showToast( "No markers yet · press B to add one" );
		return;
	}
	const y = readingLineY();
	const next = markers.find( m => m.y > y + 8 ) ?? markers[0];
	window.scrollTo(
		0,
		Math.max( 0, next.y - window.innerHeight * getReadingAnchor() )
	);
	previewManuallyScrolled = true;
	showToast( `Marker ${ markers.indexOf( next ) + 1 } of ${ markers.length }` );
}

// --- Talking points: one section at a time, no scrolling, for speaking off script ---
// On with `{mode: points}` in the script, or Layout > Talking points.
// Space starts and stops the timer; Page Down / → moves on (and starts the timer
// if it isn't running); Page Up / ← goes back.

function pointsMode() {
	const mode = scriptDirectives.script.mode;
	return mode === "points" || mode === "notes" || !!settings.pointsMode;
}

function tagSections() {
	let index = -1;
	for ( const el of md.children ) {
		if ( el.tagName === "H2" ) index++;
		el.dataset.section = String( index );
	}
	tagPages();
}

// --- Notes mode: pages ---
// A page starts at an H1 (its title) or a {page} directive; each H2 on it is
// a bullet. A script with no H1 or {page} after its title keeps one H2 per
// page, as talking points always did, so notePages stays null.
let notePages = null; // [{ heading, title, targetSeconds }]

const cleanHeading = el => el?.textContent.replace( /\{[^}]*\}/g, "" ).trim() ?? "";

function directivesIn( el ) {
	return [ ...( el.querySelectorAll?.( ".app-directive" ) ?? [] ) ].map( d => parseDirective( d.textContent ) );
}

function tagPages() {
	notePages = null;
	const kids = [ ...md.children ];
	for ( const el of kids ) delete el.dataset.page;
	const firstH2 = kids.findIndex( el => el.tagName === "H2" );
	const isBreak = el => el.tagName !== "H1" && directivesIn( el ).some( d => "page" in d );
	const paged = kids.some( ( el, i ) => ( el.tagName === "H1" && firstH2 >= 0 && i > firstH2 ) || isBreak( el ) );
	if ( !paged ) return;
	const pages = [];
	const targetOf = ( el ) => {
		const d = directivesIn( el ).find( x => "target" in x );
		return d ? parseDuration( d.target ) : null;
	};
	// Anything with no words before the first heading (an anchor) joins the
	// page that follows, so it doesn't make an empty one.
	let filled = false;
	const start = ( page ) => {
		if ( pages.length && !filled && !pages.at( -1 ).heading ) pages[pages.length - 1] = page;
		else pages.push( page );
		filled = false;
	};
	for ( const el of kids ) {
		if ( el.tagName === "H1" ) start( { heading: el, title: cleanHeading( el ), targetSeconds: targetOf( el ) } );
		else if ( isBreak( el ) || !pages.length ) start( { heading: null, title: "", targetSeconds: isBreak( el ) ? targetOf( el ) : null } );
		// Words count; a line of {settings} doesn't.
		if ( el.tagName !== "H1" && !isBreak( el ) && cleanHeading( el ) ) filled = true;
		el.dataset.page = String( pages.length - 1 );
	}
	// A page without a heading is named after its first bullet.
	pages.forEach( ( page, i ) => {
		if ( page.title ) return;
		const first = kids.find( el => el.dataset.page === String( i ) && el.tagName === "H2" );
		page.title = cleanHeading( first ) || "Page " + ( i + 1 );
	} );
	notePages = pages;
}

// The pages (or, without pages, the sections) notes mode steps through.
function pointCount() {
	return notePages ? notePages.length : scriptDirectives.sections.length;
}

function pointUnit( i ) {
	if ( notePages ) return notePages[i] ?? null;
	const s = directivePoints.sections[i] ?? scriptDirectives.sections[i];
	return s ? { ...s, title: cleanHeading( s.heading ) } : null;
}

function applyPointsView() {
	const on = pointsMode() && pointCount() > 0;
	document.body.classList.toggle( "points-mode", on );
	document.body.classList.toggle( "notes-pages", on && !!notePages );
	if ( !on ) {
		for ( const el of md.querySelectorAll( ".current-section" ) )
			el.classList.remove( "current-section" );
		return;
	}
	pointsIndex = Math.max( 0, Math.min( pointsIndex, pointCount() - 1 ) );
	for ( const el of md.children ) {
		el.classList.toggle(
			"current-section",
			( notePages ? el.dataset.page : el.dataset.section ) === String( pointsIndex )
		);
	}
	window.scrollTo( 0, 0 );
}

function goToPoint( index ) {
	const last = pointCount() - 1;
	if ( index > last ) {
		// Past the last section: the talk is over.
		if ( pointsRunning ) togglePoints();
		linkedRecording.finish();
		return;
	}
	pointsIndex = Math.max( 0, index );
	applyPointsView();
	updateOnAir();
}

async function togglePoints() {
	if ( !pointsRunning && !await prepareReading() ) return;
	pointsRunning = !pointsRunning;
	if ( !pointsRunning ) linkedRecording.pause();
	setIndicator( pointsRunning ? "Notes · timing" : null );
	updateOnAir();
	updatePlayButton();
}

function handlePointsKey( event ) {
	if ( !pointsMode() || event.ctrlKey || event.metaKey || event.altKey )
		return false;
	const next = [ "PageDown", "ArrowRight", "ArrowDown" ].includes( event.key );
	const prev = [ "PageUp", "ArrowLeft", "ArrowUp" ].includes( event.key );
	if ( !next && !prev ) return false;
	event.preventDefault();
	if ( next && !pointsRunning && event.key === "PageDown" ) {
		togglePoints();
		return true;
	}
	goToPoint( pointsIndex + ( next ? 1 : -1 ) );
	return true;
}

// --- Pacing indicator ---
// Section mode (batch and modular recording, the default): each pass through a
// section is timed afresh, and the timer stops while held at a {pause}.
// Session mode (one continuous take, `{pacing: session}`): the whole take is
// timed. Both compare your actual pace with the target and show a light, with
// words as well as colour. A summary of each section appears when you stop.

function pacingMode() {
	return scriptDirectives.script.pacing === "session" ? "session" : "section";
}

function wordsBefore( y, from = -Infinity ) {
	return directivePoints.wordTops.filter( t => t >= from && t < y ).length;
}

function targetWpmFor( section ) {
	if ( section?.wpm ) return section.wpm;
	if ( section?.targetSeconds && section.words ) {
		return Math.round( section.words / ( section.targetSeconds / 60 ) );
	}
	return scriptDirectives.script.wpm ?? settings.steadyWpm ?? 145;
}

function sectionTargetSeconds( section ) {
	if ( section.targetSeconds ) return section.targetSeconds;
	return Math.round( ( section.words / targetWpmFor( section ) ) * 60 );
}

// How far ahead (+) or behind (-) the target you are, in seconds, and a verdict.
function judge( words, seconds, targetWpm, targetSeconds ) {
	if ( seconds < 3 || words < 5 ) return { level: "wait", text: "Timing…" };
	const diff = Math.round( ( words / targetWpm ) * 60 - seconds );
	const tolerance = Math.max( 3, ( targetSeconds ?? 60 ) * 0.1 );
	if ( Math.abs( diff ) <= tolerance )
		return { level: "good", text: "On track", diff };
	const level = Math.abs( diff ) <= tolerance * 2 ? "warn" : "bad";
	return {
		level,
		text: diff > 0 ? `Ahead ${ diff } s` : `Behind ${ -diff } s`,
		diff
	};
}

function sectionIndexAt( y ) {
	let index = -1;
	directivePoints.sections.forEach( ( s, i ) => {
		if ( s.y <= y + 1 ) index = i;
	} );
	return index;
}

function startPacing() {
	if ( pacing ) return;
	pacing = {
		mode: pacingMode(),
		total: 0,
		sectionIndex: null,
		sectionTime: 0,
		sectionStartWords: 0,
		sessionStartWords: wordsBefore( readingLineY() ),
		lastTick: performance.now()
	};
	takeLog = new Map();
}

function logSection( index, seconds, startWords = 0 ) {
	if ( pointsMode() ) {
		const unit = pointUnit( index );
		if ( !unit || seconds < 2 ) return;
		takeLog.set( index, {
			title: unit.title,
			seconds,
			targetSeconds: unit.targetSeconds ?? null,
			wpm: null,
			targetWpm: null,
			verdict: judgeFinished( seconds, unit.targetSeconds ?? null ),
			partial: false
		} );
		return;
	}
	const section = directivePoints.sections[index];
	if ( !section || seconds < 2 ) return;
	const targetWpm = targetWpmFor( section );
	const words = Math.max( 0, section.words - startWords );
	const targetSeconds = pointsMode()
		? section.targetSeconds
		: sectionTargetSeconds( section );
	if ( pointsMode() ) {
		takeLog.set( index, {
			title: section.heading.textContent.replace( /\{[^}]*\}/g, "" ).trim(),
			seconds,
			targetSeconds,
			wpm: null,
			targetWpm: null,
			verdict: judgeFinished( seconds, targetSeconds ),
			partial: false
		} );
		return;
	}
	takeLog.set( index, {
		partial: startWords > 0,
		title: section.heading.textContent.replace( /\{[^}]*\}/g, "" ).trim(),
		seconds,
		targetSeconds,
		wpm: Math.round( words / ( seconds / 60 ) ),
		targetWpm,
		verdict: judgeFinished( seconds, ( words / targetWpm ) * 60 )
	} );
}

// A finished section against the time it should have taken: within 5% is
// on track; 5 to 10% under or over is amber; more than 10% is red.
function judgeFinished( seconds, expected ) {
	if ( !expected ) return { level: "wait", text: "No target" };
	const gap = seconds - expected;
	const share = Math.abs( gap ) / expected;
	if ( share <= 0.05 ) return { level: "good", text: "On track" };
	const amount
		= Math.abs( gap ) < 60
			? `${ Math.round( Math.abs( gap ) ) } s`
			: formatClock( Math.abs( gap ) );
	return {
		level: share <= 0.1 ? "warn" : "bad",
		text: gap < 0 ? `Under by ${ amount }` : `Over by ${ amount }`
	};
}

function stopPacing() {
	if ( !pacing ) return;
	if ( pointsMode() && pacing.sectionIndex !== null ) {
		logSection( pacing.sectionIndex, pacing.sectionTime );
	} else if ( pacing.mode === "section" && pacing.sectionIndex !== null ) {
		const y = readingLineY();
		const section = directivePoints.sections[pacing.sectionIndex];
		const end
			= directivePoints.sections[pacing.sectionIndex + 1]?.y ?? Infinity;
		// Only a section read to its end counts as a full pass.
		if ( section && y >= end - 2 ) {
			logSection(
				pacing.sectionIndex,
				pacing.sectionTime,
				pacing.sectionStartWords
			);
		}
	}
	pacing = null;
	pacingEl?.classList.add( "hidden" );
	if ( settings.takeSummary !== false && takeLog.size ) showTakeSummary();
}

function formatClock( seconds ) {
	const s = Math.max( 0, Math.round( seconds ) );
	return `${ Math.floor( s / 60 ) }:${ String( s % 60 ).padStart( 2, "0" ) }`;
}

// What the take log needs each tick: where the reading line is, and whether
// the text has moved on.
// Scratch audio for syncing (Settings > Scrolling): recorded while the
// prompter runs, saved beside the take log when it stops. Changes are queued,
// so a quick stop and start can't open the microphone twice.
const scratch = createScratchRecorder();
let scratchWanted = false;
let scratchChange = Promise.resolve();
let changingRecordingScript = false;
const pendingRecordedSlates = new Set();

window.electron.onPrepareScriptChange( async ( id ) => {
	try {
		stopSteadySession();
		await stopAutoScrollSession();
		if ( pointsRunning ) togglePoints();
		await Promise.all( [ ...pendingRecordedSlates ] );
		feedTakeLog( false );
		await scratchChange;
		feedTakeLog( false );
		changingRecordingScript = true;
		window.electron.scriptChangeReady( id );
	} catch {
		window.electron.scriptChangeReady( id, "The recording could not finish saving; keep this script open and try again" );
	}
} );

function syncScratchAudio( active ) {
	const want = ( active || slating ) && settings.scratchAudio === true && !isEditMode;
	if ( want === scratchWanted ) return;
	scratchWanted = want;
	scratchChange = scratchChange.then( async () => {
		if ( want ) {
			try {
				await scratch.start( audioDeviceId );
				showToast( "Recording scratch audio for syncing", 2000 );
			} catch ( err ) {
				console.warn( "[scratch audio]", err );
				showToast( "Couldn't record scratch audio: is a microphone connected?", 3000 );
			}
			return;
		}
		// Only kept when the run logged something.
		const result = await scratch.stop( !!recording.data().startedAt );
		if ( result ) recording.audio( result );
	} );
}

// --- The sound-check meter and loudness per take (roadmap 41 and 42) ---
// One measurement of the mic (level-meter.js) serves both: the meter at the
// edge of the prompter, and each take's loudness in the take log. It runs
// while the meter shows or a take is being measured, and not otherwise.
let soundCheck = false;
let peakHold = { db: -Infinity, at: 0 };
let clipAt = 0;
const levelMeter = createLevelMeter( { onLevel: showLevel } );
const meterEl = document.createElement( "div" );
meterEl.id = "level-meter";
meterEl.className = "hidden";
meterEl.setAttribute( "aria-label", "Sound check" );
meterEl.innerHTML = "<div class=\"lm-bar\"><div class=\"lm-fill\"></div><div class=\"lm-hold\"></div></div><span class=\"lm-clip\" title=\"The mic hit full scale\">CLIP</span><span class=\"lm-text\">Listening…</span>";
hud.appendChild( meterEl );

// -60 dBFS (empty) to 0 dBFS (full)
const meterPercent = db => Math.min( 100, Math.max( 0, ( ( db + 60 ) / 60 ) * 100 ) );

function showLevel( { level, peak, shortTerm, room } ) {
	// The control window shows the meter too, even while a take runs.
	if ( controlOpen ) window.electron.sendPreviewLevel( { level, peak, shortTerm, room } );
	if ( meterEl.classList.contains( "hidden" ) ) return;
	const now = Date.now();
	meterEl.querySelector( ".lm-fill" ).style.width = `${ meterPercent( level ?? -Infinity ) }%`;
	// The peak line holds for a second and a half.
	if ( peak !== null && ( peak >= peakHold.db || now - peakHold.at > 1500 ) ) peakHold = { db: peak, at: now };
	meterEl.querySelector( ".lm-hold" ).style.left = `${ meterPercent( peakHold.db ) }%`;
	if ( peak !== null && peak >= -1 ) clipAt = now;
	meterEl.classList.toggle( "clipped", now - clipAt < 2000 );
	const parts = [ shortTerm === null ? "… LUFS" : `${ Math.round( shortTerm ) } LUFS` ];
	if ( room !== null ) parts.push( room < -90 ? "room below -90 dB" : `room ${ Math.round( room ) } dB` );
	meterEl.querySelector( ".lm-text" ).textContent = parts.join( " · " );
}

function syncLevelMeter( active ) {
	const how = settings.takeLoudness ?? "voice";
	const micOnAnyway = autoScrollActive || settings.scratchAudio === true;
	const measuring = active && !isEditMode && ( how === "always" || ( how === "voice" && micOnAnyway ) );
	const show = soundCheck && !isEditMode && ( !active || settings.soundCheckDuringTakes === true );
	meterEl.classList.toggle( "hidden", !show );
	// With the control window open, it keeps measuring for that, out of sight.
	const forControl = soundCheck && controlOpen && !isEditMode;
	// A {soundcheck} in the script, while it measures.
	const forScript = !!scriptCheck && !scriptCheck.done;
	if ( ( show || measuring || forControl || forScript ) && !levelMeter.running ) {
		levelMeter.start( audioDeviceId ).catch( ( err ) => {
			console.warn( "[sound check]", err );
			soundCheck = false;
			meterEl.classList.add( "hidden" );
			showToast( "Couldn't open the microphone for the sound check: is one connected?", 3000 );
		} );
	} else if ( !show && !measuring && !forControl && !forScript && levelMeter.running ) levelMeter.stop();
}

function toggleSoundCheck() {
	soundCheck = !soundCheck;
	const active = isScrolling() || cuePaused || pointsRunning;
	syncLevelMeter( active );
	if ( !soundCheck ) showToast( "Sound check off", 1500 );
	else if ( active && settings.soundCheckDuringTakes !== true )
		showToast( "Sound check: it shows when you stop (Settings > Recording > Audio can keep it on during takes)", 3500 );
	else showToast( "Sound check on · speak normally, then stay quiet for the room · Ctrl+Shift+D hides it", 3500 );
}

// A take that clipped, was very quiet or had a noisy room says so as it ends.
function takeLogged( take ) {
	const l = take.loudness;
	if ( !l?.warning ) return;
	const what = {
		clipping: `the mic clipped (peak ${ l.peak } dBFS)`,
		quiet: `very quiet (${ l.lufs } LUFS)`,
		noisy: `a noisy room (background ${ l.noise } dBFS)`
	}[l.warning];
	showToast( `Section ${ take.section }, take ${ take.take }: ${ what }`, 5000 );
}

function feedTakeLog( active ) {
	if ( changingRecordingScript ) return;
	const delivering = !scriptCheck && !cuePaused && !autoScrollStarting && ( isSteadyRunning() || pointsRunning || ( autoScrollActive && !autoScrollHandle?.isHeld() ) );
	if ( setProductionNotesActive( md, delivering, { readingAnchor: getReadingAnchor() } ) ) {
		const { ranges } = buildWordIndex( md );
		measureDirectives( ranges );
		recalculateSteady();
	}
	syncScratchAudio( active );
	syncLevelMeter( active );
	// Waiting for the slate: the take opens after it, so it gets the slate.
	if ( slateDue || slating ) return;
	const y = readingLineY();
	const index = pointsMode() ? pointsIndex : sectionIndexAt( y );
	const section = directivePoints.sections[index];
	const next = directivePoints.sections[index + 1];
	// Words still to read in this section. The line at the reading line counts
	// as read: a stop leaves it a few pixels below.
	const left = directivePoints.wordTops.filter(
		t => t > y + 24 && t < ( next?.y ?? Infinity )
	).length;
	recording.tick( {
		active,
		index,
		// In notes mode the page is the unit.
		title: pointsMode() ? pointUnit( index )?.title ?? "" : cleanHeading( section?.heading ),
		// The script's own {target} for the section, for the pace in the edit pack.
		target: ( pointsMode() ? pointUnit( index ) : section )?.targetSeconds ?? null,
		// Moving on through words, not through the blank space after the script.
		advanced: pointsMode()
			? pointsRunning
			: recordingY !== null && y > recordingY + 0.5 && left > 0,
		atEnd: pointsMode() || left <= 3
	} );
	// Steady scrolling: a {marker} is passed when the reading line reaches it.
	// (Voice mode logs it when the word after it is said.)
	if ( active && !autoScrollActive && recordingY !== null ) {
		for ( const m of directivePoints.scriptMarkers ?? [] ) {
			if ( m.y > recordingY && m.y <= y ) recording.marker( { label: m.label, from: "script", key: m.key } );
		}
	}
	recording.obs( obsUi.state() );
	obsUi.refresh();
	recordingY = y;
	if ( recording.version() !== recordingSaved ) {
		recordingSaved = recording.version();
		window.electron.saveTakeLog( recording.data() );
	}
}

function rateTake( rating ) {
	const rated = recording.rate( rating );
	if ( !rated ) {
		showToast( "No take to rate yet: start reading a section first" );
		return;
	}
	showToast(
		`Section ${ rated.section }, take ${ rated.take }: ${ rating === "keeper" ? "keeper ★" : "scrapped" }`
	);
}

function pacingTick() {
	const active = isScrolling() || cuePaused || pointsRunning;
	feedTakeLog( active );
	if ( !active ) {
		if ( pacing ) stopPacing();
		return;
	}
	startPacing();
	const now = performance.now();
	const dt = Math.min( 2, ( now - pacing.lastTick ) / 1000 );
	pacing.lastTick = now;
	const y = readingLineY();
	const index = pointsMode() ? pointsIndex : sectionIndexAt( y );
	if ( index !== pacing.sectionIndex ) {
		if (
			pacing.sectionIndex !== null
			&& ( index > pacing.sectionIndex || pointsMode() )
		) {
			logSection(
				pacing.sectionIndex,
				pacing.sectionTime,
				pacing.sectionStartWords
			);
		}
		pacing.sectionIndex = index;
		pacing.sectionTime = 0;
		const entered = directivePoints.sections[index];
		pacing.sectionStartWords = entered ? wordsBefore( y, entered.y ) : 0;
	}
	// Not during the countdown: timing starts when the text starts moving.
	const moving = isSteadyRunning() || autoScrollActive || pointsRunning;
	if ( pacing.mode === "session" || moving ) pacing.total += dt;
	if ( moving ) pacing.sectionTime += dt;
	renderPacing( y, index );
}

function renderPacing( y, index ) {
	if ( !pacingEl || settings.showPacing === false ) return;
	if ( pointsMode() ) {
		renderPointsPacing();
		return;
	}
	let label;
	let seconds;
	let targetSeconds;
	let words;
	let targetWpm;
	if ( pacing.mode === "session" || index < 0 ) {
		const totalWords = directivePoints.wordTops.length;
		targetWpm = scriptDirectives.script.wpm ?? settings.steadyWpm ?? 145;
		const estimate = Math.round( ( totalWords / targetWpm ) * 60 );
		targetSeconds = scriptDirectives.script.targetSeconds ?? estimate;
		seconds = pacing.total;
		words = wordsBefore( y ) - pacing.sessionStartWords;
		label = "Take";
	} else {
		const section = directivePoints.sections[index];
		targetWpm = targetWpmFor( section );
		targetSeconds = sectionTargetSeconds( section );
		seconds = pacing.sectionTime;
		words = wordsBefore( y, section.y ) - pacing.sectionStartWords;
		label = `Section ${ index + 1 }`;
	}
	const verdict = judge( words, seconds, targetWpm, targetSeconds );
	const actual = seconds >= 3 ? Math.round( words / ( seconds / 60 ) ) : null;
	pacingEl.classList.remove( "hidden", "good", "warn", "bad", "wait" );
	pacingEl.classList.add( verdict.level );
	pacingEl.innerHTML = "";
	const parts = [
		[ "pc-label", label ],
		[ "pc-time", `${ formatClock( seconds ) } / ${ formatClock( targetSeconds ) }` ],
		[ "pc-wpm", `${ actual ?? "–" } wpm · aim ${ targetWpm }` ],
		[ "pc-verdict", verdict.text ]
	];
	for ( const [ cls, text ] of parts ) {
		const span = document.createElement( "span" );
		span.className = cls;
		span.textContent = text;
		pacingEl.appendChild( span );
	}
}

// Talking points are timed against each section's {target}, not words per minute.
function judgeTime( seconds, targetSeconds ) {
	if ( !targetSeconds ) return { level: "wait", text: "No target" };
	const left = Math.round( targetSeconds - seconds );
	if ( left >= 0 )
		return {
			level: left <= 10 ? "warn" : "good",
			text: left <= 10 ? `${ left } s left` : "On track"
		};
	const over = -left;
	return {
		level: over <= targetSeconds * 0.1 ? "warn" : "bad",
		text: `Over by ${ over } s`
	};
}

function renderPointsPacing() {
	if ( !pacingEl || settings.showPacing === false ) return;
	const section = pointUnit( pointsIndex );
	const total = pointCount();
	const target = section?.targetSeconds ?? null;
	const verdict = judgeTime( pacing.sectionTime, target );
	let sumOfTargets = 0;
	for ( let i = 0; i < total; i++ ) sumOfTargets += pointUnit( i )?.targetSeconds ?? 0;
	const totalTarget = scriptDirectives.script.targetSeconds ?? sumOfTargets;
	pacingEl.classList.remove( "hidden", "good", "warn", "bad", "wait" );
	pacingEl.classList.add( verdict.level );
	pacingEl.innerHTML = "";
	const parts = [
		[ "pc-label", `Page ${ pointsIndex + 1 } of ${ total }` ],
		[
			"pc-time",
			`${ formatClock( pacing.sectionTime ) }${ target ? ` / ${ formatClock( target ) }` : "" }`
		],
		[
			"pc-wpm",
			`Talk ${ formatClock( pacing.total ) }${ totalTarget ? ` / ${ formatClock( totalTarget ) }` : "" }`
		],
		[ "pc-verdict", verdict.text ]
	];
	for ( const [ cls, text ] of parts ) {
		const span = document.createElement( "span" );
		span.className = cls;
		span.textContent = text;
		pacingEl.appendChild( span );
	}
}

function showTakeSummary() {
	if ( !summaryModal ) return;
	const body = summaryModal.querySelector( "tbody" );
	body.innerHTML = "";
	for ( const [ index, r ] of [ ...takeLog.entries() ].sort( ( a, b ) => a[0] - b[0] ) ) {
		const tr = document.createElement( "tr" );
		tr.className = r.verdict.level;
		for ( const text of [
			`${ index + 1 }. ${ r.title }`,
			formatClock( r.seconds ),
			r.targetSeconds ? formatClock( r.targetSeconds ) : "–",
			r.wpm ? `${ r.wpm } (aim ${ r.targetWpm })` : "–",
			r.verdict.text
		] ) {
			const td = document.createElement( "td" );
			td.textContent = text;
			tr.appendChild( td );
		}
		body.appendChild( tr );
	}
	const logged = recording.data();
	const keepers = logged.takes.filter( t => t.rating === "keeper" ).length;
	const logLine = uiElement( "take-summary-log" );
	if ( logLine ) {
		logLine.textContent = logged.takes.length
			? `Take log so far: ${ logged.takes.length } take${ logged.takes.length === 1 ? "" : "s" } of ${ logged.sections.length } section${ logged.sections.length === 1 ? "" : "s" }${ keepers ? `, ${ keepers } keeper${ keepers === 1 ? "" : "s" }` : "" }. Say “Prompter, keeper” or press K to mark a good take.`
			: "";
	}
	const levelsLine = uiElement( "take-summary-levels" );
	if ( levelsLine ) {
		const measured = logged.takes.filter( t => t.loudness ).slice( -6 );
		levelsLine.textContent = measured.length
			? `Mic levels: ${ measured.map( t => `S${ t.section } take ${ t.take } ${ t.loudness.lufs ?? "–" } LUFS${ t.loudness.warning ? ` (${ t.loudness.warning })` : "" }` ).join( " · " ) }`
			: "";
	}
	const full = [ ...takeLog.values() ].some( r => !r.partial );
	uiElement( "take-summary-targets" ).hidden = !full;
	uiElement( "take-summary-targets-hint" ).hidden = !full;
	summaryModal.classList.remove( "hidden" );
	uiElement( "take-summary-close" )?.focus( { preventScroll: true } );
}

function closeTakeSummary() {
	summaryModal?.classList.add( "hidden" );
}

onClick( "take-summary-close", closeTakeSummary );
onClick( "take-summary-export", () => window.electron.exportTakeLog() );
onClick( "take-summary-coach", () => {
	closeTakeSummary();
	openScriptReview( "coach" );
} );
// The saved log for this script and day, so take numbers carry on.
window.electron.onTakeLog( ( saved ) => {
	recording.load( saved );
	changingRecordingScript = false;
	recordingSaved = recording.version();
	recordingY = null;
} );
onClick( "take-summary-targets", () => {
	const targets = {};
	for ( const [ index, r ] of takeLog ) if ( !r.partial ) targets[index] = r.seconds;
	window.electron.applySectionTargets( targets );
	closeTakeSummary();
} );
summaryModal?.addEventListener( "keydown", ( e ) => {
	if ( e.key === "Escape" || e.key === "Enter" ) closeTakeSummary();
} );
summaryModal?.addEventListener( "mousedown", ( e ) => {
	if ( e.target === summaryModal ) closeTakeSummary();
} );
setInterval( pacingTick, 250 );

// --- Recordings (File > Recordings): every take log, see recordings.js ---

const recordingsModal = uiElement( "recordings" );
let openRecordingId = null;

function recordingWhen( r ) {
	const at = r.startedAt ? new Date( r.startedAt ) : null;
	const time = at ? at.toLocaleTimeString( [], { hour: "2-digit", minute: "2-digit" } ) : "";
	return `${ r.date ?? "" } ${ time }`.trim();
}

async function showRecordingsList() {
	openRecordingId = null;
	uiElement( "recordings-list-view" ).hidden = false;
	uiElement( "recordings-detail-view" ).hidden = true;
	uiElement( "recordings-title" ).textContent = "Recordings";
	const { list, current } = await window.electron.recordings( "list" );
	const rows = uiElement( "recordings-rows" );
	rows.innerHTML = "";
	uiElement( "recordings-empty" ).hidden = list.length > 0;
	for ( const r of list ) {
		const tr = document.createElement( "tr" );
		tr.tabIndex = 0;
		const name = document.createElement( "td" );
		const title = document.createElement( "span" );
		title.className = "rec-name";
		title.textContent = r.title ?? r.script?.replace( /\.[^.]+$/, "" ) ?? r.id;
		name.append( title );
		if ( r.id === current ) name.append( Object.assign( document.createElement( "span" ), { className: "rec-tag live", textContent: "today" } ) );
		if ( r.processed ) name.append( Object.assign( document.createElement( "span" ), { className: "rec-tag", textContent: "edited" } ) );
		if ( r.title || r.note ) {
			name.append( Object.assign( document.createElement( "span" ), { className: "rec-sub", textContent: r.note ?? r.script ?? "" } ) );
		}
		tr.append( name );
		for ( const text of [ recordingWhen( r ), r.takes, r.keepers || "–", formatClock( r.recordedSeconds ) ] ) {
			tr.append( Object.assign( document.createElement( "td" ), { textContent: text } ) );
		}
		tr.addEventListener( "click", () => showRecording( r.id ) );
		tr.addEventListener( "keydown", ( e ) => {
			if ( e.key === "Enter" ) showRecording( r.id );
		} );
		rows.append( tr );
	}
}

async function showRecording( id ) {
	const r = await window.electron.recordings( "read", { id } );
	openRecordingId = id;
	uiElement( "recordings-list-view" ).hidden = true;
	uiElement( "recordings-detail-view" ).hidden = false;
	uiElement( "recordings-title" ).textContent = r.title ?? r.id;
	field( "recording-title" ).value = r.title ?? "";
	field( "recording-title" ).placeholder = r.id;
	field( "recording-note" ).value = r.note ?? "";
	field( "recording-processed" ).checked = !!r.processed;
	const plural = ( n, word ) => `${ n } ${ word }${ n === 1 ? "" : "s" }`;
	uiElement( "recording-facts" ).textContent = [
		`${ r.script ?? "No script" }, ${ recordingWhen( r ) }`,
		`${ plural( r.takes, "take" ) } of ${ plural( r.sections, "section" ) }`,
		`${ formatClock( r.recordedSeconds ) } recorded, ${ formatClock( r.editSeconds ) } in the edit`,
		r.voice ? "word timings from voice mode" : "no word timings (steady scrolling)"
	].join( " · " );
	const rows = uiElement( "recording-takes" );
	rows.innerHTML = "";
	for ( const t of r.takeList ) {
		const tr = document.createElement( "tr" );
		const rating = { keeper: "★ Keeper", scrap: "✗ Scrapped" }[t.rating] ?? ( t.status === "complete" ? "" : "Partial" );
		for ( const text of [ t.title, t.take, formatClock( t.duration ?? 0 ), rating, t.used ? "✓" : "" ] ) {
			tr.append( Object.assign( document.createElement( "td" ), { textContent: text } ) );
		}
		rows.append( tr );
	}
	field( "recording-title" ).focus( { preventScroll: true } );
}

async function openRecordings() {
	recordingsModal.classList.remove( "hidden" );
	await showRecordingsList();
	uiElement( "recordings-done" ).focus( { preventScroll: true } );
}

function closeRecordings() {
	recordingsModal.classList.add( "hidden" );
	openRecordingId = null;
}

async function updateOpenRecording( changes ) {
	if ( !openRecordingId ) return;
	const r = await window.electron.recordings( "update", { id: openRecordingId, changes } );
	uiElement( "recordings-title" ).textContent = r?.title ?? openRecordingId;
}

field( "recording-title" ).addEventListener( "change", e => updateOpenRecording( { title: e.target.value } ) );
field( "recording-note" ).addEventListener( "change", e => updateOpenRecording( { note: e.target.value } ) );
field( "recording-processed" ).addEventListener( "change", e => updateOpenRecording( { processed: e.target.checked } ) );
onClick( "recording-back", showRecordingsList );
onClick( "recording-coach", async () => {
	const saved = await window.electron.recordings( "read", { id: openRecordingId } );
	if ( saved?.coach ) openScriptReview( "coach", { ...saved.coach, sourceLabel: `Saved recording: ${ saved.title ?? saved.id }` } );
} );
onClick( "recording-export", async () => {
	const { saved } = await window.electron.recordings( "export", { id: openRecordingId } );
	if ( saved ) showToast( `Edit pack saved: ${ saved }`, 2500 );
} );
onClick( "recording-zip", async () => {
	const { saved } = await window.electron.recordings( "export", { id: openRecordingId, zip: true } );
	if ( saved ) showToast( `Edit pack saved: ${ saved }`, 2500 );
} );
onClick( "recording-delete", async () => {
	const { ok } = await window.electron.recordings( "delete", { id: openRecordingId } );
	if ( ok ) {
		showToast( "Moved to the Recycle Bin", 2000 );
		await showRecordingsList();
	}
} );
onClick( "recordings-folder", () => window.electron.recordings( "folder" ) );
onClick( "recordings-new", async () => {
	await window.electron.recordings( "newLog" );
	await showRecordingsList();
} );
onClick( "recordings-done", closeRecordings );
onClick( "recordings-close", closeRecordings );
recordingsModal.addEventListener( "keydown", ( e ) => {
	e.stopPropagation(); // typing a name mustn't drive the prompter
	if ( e.key !== "Escape" ) return;
	if ( openRecordingId ) {
		// Save what's typed before going back.
		document.activeElement?.blur();
		showRecordingsList();
	} else {
		closeRecordings();
	}
} );
recordingsModal.addEventListener( "mousedown", ( e ) => {
	if ( e.target === recordingsModal ) closeRecordings();
} );
window.electron.onShowRecordings( openRecordings );
window.electron.onRecordingsChanged( () => {
	if ( !recordingsModal.classList.contains( "hidden" ) ) showRecordingsList();
} );

// --- Reading aids and recording helpers ---

function applyDisplayClasses() {
	const body = document.body;
	for ( const t of THEMES )
		body.classList.toggle( `theme-${ t }`, ( settings.theme ?? "default" ) === t );
	for ( const f of FONTS )
		body.classList.toggle(
			`font-${ f }`,
			( settings.scriptFont ?? "default" ) === f
		);
	// Headings and delivery comments share a font ("same" follows the text).
	for ( const f of FONTS )
		body.classList.toggle( `heading-font-${ f }`, ( settings.headingFont ?? "same" ) === f );
	for ( const e of EFFECTS )
		body.classList.toggle( `edge-${ e }`, ( settings.textEffect ?? "none" ) === e );
	updateOnAir();
}

// ON AIR: lit while a scrolling session is running or held at a {pause}.
function updateOnAir() {
	applyBacking();
	// The bar's Backing slider follows the level in use.
	const label = uiElement( "cb-backing-label" );
	if ( label ) label.textContent = onAir() ? "On-air BG" : "Background";
	if ( opacityInput && document.activeElement !== opacityInput ) opacityInput.value = liveBacking();
	const button = uiElement( "cb-on-air" );
	button?.classList.toggle( "live", onAir() );
	button?.setAttribute( "aria-pressed", String( manualOnAir ) );
	if ( !onAirEl ) return;
	const live = settings.onAirLight !== false && onAir();
	onAirEl.classList.toggle( "hidden", !live );
}

let audioCtx = null;
function startBeep() {
	if ( settings.startBeep ) playTone( 880, 0.2, 0.25 );
}

function playTone( frequency, seconds, volume ) {
	try {
		audioCtx ??= new AudioContext();
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.frequency.value = frequency;
		gain.gain.setValueAtTime( volume, audioCtx.currentTime );
		gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + seconds * 0.9 );
		osc.connect( gain ).connect( audioCtx.destination );
		osc.start();
		osc.stop( audioCtx.currentTime + seconds );
	} catch ( err ) {
		console.warn( "[beep]", err );
	}
}

// Click-through: mouse events pass to the window behind, except over the
// controls. Main forwards mouse moves while ignoring, so this still runs.
let ignoringMouse = null;
document.addEventListener( "mousemove", ( e ) => {
	if ( !settings.clickThrough ) {
		ignoringMouse = null;
		return;
	}
	const overControls = !!e.target.closest?.(
		"#control-bar, .panel, #app-menu, .modal, #auto-scroll-indicator, #toast, #capture-override-note"
	);
	const ignore = !overControls;
	if ( ignore !== ignoringMouse ) {
		ignoringMouse = ignore;
		window.electron.setIgnoreMouse( ignore );
	}
} );

window.electron.onToast( text => showToast( text ) );

function openScriptReview( tab = isEditMode ? "health" : "coach", saved = null ) {
	if ( isScrolling() || autoScrollStarting || slating ) {
		showToast( "Pause prompting before opening the review" );
		return;
	}
	reviewedRecording = saved;
	scriptReview.open( tab );
}
scriptReview = createScriptReview( field( "script-review" ), {
	health: async ( wpm ) => {
		const html = isEditMode && editorView ? await window.electron.scriptReviewHtml( window.EditorModule.getEditorContent( editorView ) ) : lastScriptHtml ?? md.innerHTML;
		const parsed = healthSections( html );
		return { ...scriptHealth( parsed.sections, wpm ), notes: parsed.notes || pointsMode(), sourceLabel: isEditMode ? "Current editor text, including unsaved changes" : "Current script" };
	},
	coach: async () => reviewedRecording ?? rehearsalCoach( recording.data() ),
	canJump: () => isEditMode && !!editorView,
	jump: section => window.EditorModule.selectSection( editorView, section )
} );
const navigateWorkflowSettings = async ( topic ) => {
	await openSettings();
	showSettingsTab( topic );
};
workflow = createWorkflow( field( "workflow-modal" ), {
	getState: async () => {
		await componentSettings.refresh();
		return { settings, components: componentStatus, obs: obsUi.state(), microphone: micSelect?.selectedOptions[0]?.textContent, guideShown: !!headGuideState?.shown, scriptTitle: slotState.slots[slotState.active]?.name, phone: phoneStatus };
	},
	navigate: async topic => topic === "obs-setup" ? obsSetupUi.open() : navigateWorkflowSettings( topic ),
	act: ( action ) => {
		if ( action === "sound" ) toggleSoundCheck();
		else if ( action === "guide" ) window.electron.headGuide( "show" );
		else openScriptReview( "health" );
	},
	isBusy: () => isScrolling() || autoScrollStarting || slating,
	toast: showToast
} );
obsSetupUi = createObsSetupUi( field( "obs-setup-modal" ), { navigate: navigateWorkflowSettings, isBusy: () => isScrolling() || autoScrollStarting || slating, toast: showToast } );
onClick( "set-obs-setup-open", () => obsSetupUi.open() );
onClick( "set-obs-setup-guide", () => window.electron.openGuide( "15-obs-setup.md" ) );
onClick( "help-getting-started", () => {
	closeHelp();
	workflow.open( "start" );
} );
window.electron.onMenuWorkflow( mode => workflow.open( mode ) );
window.electron.onGettingStartedOffer( () => workflow.open( "start" ) );
onClick( "btn-script-health", () => openScriptReview( "health" ) );
window.electron.onMenuReview( () => openScriptReview() );
makeMovable( field( "script-review" ).querySelector( ".review-content" ), field( "review-title" ), "script-review" );

// Controller actions use the same guards as the pad; no synthetic key events.
const buttonEdges = createButtonEdges();
function mappingBlocked() {
	return isEditMode || !settingsModal.classList.contains( "hidden" ) || !!document.querySelector( ".modal:not(.hidden), #voice-help:not(.hidden)" ) || !!document.activeElement?.closest( "input, select, textarea, [contenteditable=true]" );
}
function runMappedAction( action ) {
	if ( action === "none" || mappingBlocked() ) return;
	if ( action === "next-marker" ) {
		jumpToNextMarker();
		return;
	}
	const view = controlView( action, { ...settings, ...obsUiStatus(), editing: isEditMode } );
	if ( !view || view.disabled || view.hidden ) return;
	const request = controlAction( action );
	if ( request.slot ) switchToSlot( request.slot - 1 );
	else runRemoteAction( request.action );
}
function obsUiStatus() {
	return { obs: obsUi.state(), scrolling: isScrolling(), slots: slotState.slots.map( slot => ( { file: slot ? slot.name : null } ) ) };
}
function pollGamepads() {
	for ( const input of buttonEdges( navigator.getGamepads?.() ?? [] ) ) {
		if ( mappingSettings?.learning ) {
			if ( settingsModal.ownerDocument.hasFocus() && settingsModal.querySelector( "#settings-page-buttons" )?.hidden === false ) mappingSettings.learn( input );
			continue;
		}
		if ( !document.hasFocus() || mappingBlocked() ) continue;
		const action = mappedAction( normaliseMappings( settings.inputMappings ), input );
		if ( action ) runMappedAction( action );
	}
}
setInterval( pollGamepads, 40 );
window.addEventListener( "gamepadconnected", () => {
	showToast( "Controller connected · change buttons in Settings > Controls > Buttons & keys" );
} );

// --- Number boxes beside sliders ---
// Every slider gets a number field (type a value, or use the arrow keys / the
// up and down buttons) showing the value as a percentage or in wpm. The slider
// stays the single source of truth: the box writes to it and fires its events.

const voicePercent = { scale: 100, unit: "%", word: "percent" };
const NUMBER_BOXES = {
	"cb-speed": () =>
		settings.scrollMode === "voice"
			? { ...voicePercent, name: "Voice responsiveness" }
			: {
				scale: 1,
				unit: "wpm",
				word: "words per minute",
				name: "Scroll speed"
			},
	"cb-font": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Text size"
	} ),
	"cb-opacity": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Background opacity"
	} ),
	"vp-speed": () => ( { ...voicePercent, name: "Voice responsiveness" } ),
	"lp-margin-x": () => ( {
		scale: 1,
		unit: "%",
		word: "percent",
		name: "Left and right margin"
	} ),
	"lp-margin-top": () => ( {
		scale: 1,
		unit: "%",
		word: "percent",
		name: "Top margin"
	} ),
	"lp-margin-bottom": () => ( {
		scale: 1,
		unit: "%",
		word: "percent",
		name: "Bottom margin"
	} ),
	"lp-focus-strength": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Focus strength"
	} ),
	"lp-text-brightness": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Text brightness"
	} ),
	"lp-bg-opacity": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Background opacity"
	} ),
	"lp-text-opacity": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Text opacity"
	} ),
	"lp-backing-on-air": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Background on air"
	} ),
	"lp-heading-scale": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Heading size"
	} ),
	"lp-direction-scale": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Inline direction size"
	} ),
	"lp-production-scale": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Production note size"
	} ),
	"lp-line-height": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Script line spacing"
	} ),
	"lp-heading-line-height": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Heading line spacing"
	} ),
	"lp-direction-line-height": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Inline direction line spacing"
	} ),
	"lp-production-line-height": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Production note line spacing"
	} ),
	"lp-reading-line": () => ( {
		scale: 1,
		unit: "%",
		word: "percent from the top",
		name: "Reading line"
	} ),
	"set-voice-speed": () => ( { ...voicePercent, name: "Voice responsiveness" } ),
	"set-font-size": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Text size"
	} ),
	"set-steady-wpm": () => ( {
		scale: 1,
		unit: "wpm",
		word: "words per minute",
		name: "Steady speed"
	} ),
	"set-countdown": () => ( {
		scale: 1,
		unit: "s",
		word: "seconds",
		name: "Countdown"
	} ),
	"set-reading-line": () => ( {
		scale: 1,
		unit: "%",
		word: "percent from the top",
		name: "Reading line"
	} ),
	"set-eye-line-width": () => ( {
		scale: 1,
		unit: "%",
		word: "percent of the screen",
		name: "Strip width"
	} ),
	"set-eye-line-height": () => ( {
		scale: 1,
		unit: "%",
		word: "percent of the screen",
		name: "Strip height"
	} ),
	"set-eye-line-reading": () => ( {
		scale: 1,
		unit: "%",
		word: "percent from the top",
		name: "Reading line in the strip"
	} ),
	"set-opacity": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Background darkness"
	} )
};

const valueProp = Object.getOwnPropertyDescriptor(
	HTMLInputElement.prototype,
	"value"
);
const tidy = n => Math.round( n * 1000 ) / 1000;

function attachNumberBox( range, getSpec ) {
	const box = document.createElement( "span" );
	box.className = "num-box";
	const num = document.createElement( "input" );
	num.type = "number";
	num.className = "num-input";
	num.inputMode = "decimal";
	const unit = document.createElement( "span" );
	unit.className = "num-unit";
	unit.setAttribute( "aria-hidden", "true" );
	const steppers = document.createElement( "span" );
	steppers.className = "num-steppers";
	const up = document.createElement( "button" );
	const down = document.createElement( "button" );
	// The arrows are drawn in CSS, so they keep their size at any display scaling.
	for ( const [ btn, sign, label ] of [
		[ up, 1, "Increase" ],
		[ down, -1, "Decrease" ]
	] ) {
		btn.type = "button";
		btn.tabIndex = -1;
		btn.setAttribute( "aria-label", label );
		btn.dataset.sign = sign;
		steppers.append( btn );
	}
	box.append( num, unit, steppers );
	const row = document.createElement( "span" );
	row.className = "slider-with-box";
	range.replaceWith( row );
	row.append( range, box );
	uiElement( `${ range.id }-value` )?.classList.add( "num-replaced" );

	const read = () => Number( valueProp.get.call( range ) );
	const refresh = () => {
		const spec = getSpec();
		const scale = spec.scale;
		num.min = tidy( Number( range.min ) * scale );
		num.max = tidy( Number( range.max ) * scale );
		num.step = tidy( Number( range.step ) * scale );
		const shown = tidy( read() * scale );
		if ( num.ownerDocument.activeElement !== num ) num.value = shown;
		unit.textContent = spec.unit;
		const label = spec.name;
		num.setAttribute( "aria-label", `${ label } in ${ spec.word }` );
		up.setAttribute( "aria-label", `Increase ${ label.toLowerCase() }` );
		down.setAttribute( "aria-label", `Decrease ${ label.toLowerCase() }` );
		up.title = "Increase (↑)";
		down.title = "Decrease (↓)";
		range.setAttribute( "aria-valuetext", `${ shown } ${ spec.word }` );
	};
	// Code elsewhere sets range.value directly; keep the box in step with it.
	Object.defineProperty( range, "value", {
		configurable: true,
		get() {
			return valueProp.get.call( this );
		},
		set( v ) {
			valueProp.set.call( this, v );
			refresh();
		}
	} );

	const apply = ( shown, commit ) => {
		const spec = getSpec();
		const min = Number( range.min );
		const max = Number( range.max );
		const step = Number( range.step ) || 1;
		if ( !Number.isFinite( shown ) ) return refresh();
		let v = Math.min( max, Math.max( min, shown / spec.scale ) );
		if ( v < max )
			v = Math.min( max, tidy( min + Math.round( ( v - min ) / step ) * step ) );
		range.value = v;
		range.dispatchEvent( new Event( "input", { bubbles: true } ) );
		if ( commit ) range.dispatchEvent( new Event( "change", { bubbles: true } ) );
		refresh();
		num.value = tidy( read() * spec.scale );
	};
	const nudge = ( steps, commit ) => {
		const spec = getSpec();
		apply( ( read() + steps * ( Number( range.step ) || 1 ) ) * spec.scale, commit );
	};

	num.addEventListener( "keydown", ( e ) => {
		const steps = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[
			e.key
		];
		if ( steps ) {
			e.preventDefault();
			nudge( steps, true );
		} else if ( e.key === "Enter" ) {
			e.preventDefault();
			apply( Number( num.value ), true );
			num.select();
		} else if ( e.key === "Escape" ) {
			num.value = tidy( read() * getSpec().scale );
		}
	} );
	num.addEventListener( "change", () => apply( Number( num.value ), true ) );
	num.addEventListener( "blur", refresh );
	num.addEventListener( "wheel", e => e.preventDefault(), { passive: false } );
	num.addEventListener( "focus", () => num.select() );

	// Steppers: click for one step, hold to keep going.
	let repeatTimer = null;
	const stop = ( btn ) => {
		if ( repeatTimer === null ) return;
		clearTimeout( repeatTimer );
		clearInterval( repeatTimer );
		repeatTimer = null;
		range.dispatchEvent( new Event( "change", { bubbles: true } ) );
		btn.releasePointerCapture?.( btn._pointer );
	};
	for ( const btn of [ up, down ] ) {
		btn.addEventListener( "pointerdown", ( e ) => {
			e.preventDefault();
			btn._pointer = e.pointerId;
			btn.setPointerCapture?.( e.pointerId );
			const sign = Number( btn.dataset.sign );
			nudge( sign, false );
			repeatTimer = setTimeout( () => {
				repeatTimer = setInterval( () => nudge( sign, false ), 70 );
			}, 400 );
		} );
		btn.addEventListener( "pointerup", () => stop( btn ) );
		btn.addEventListener( "pointercancel", () => stop( btn ) );
		btn.addEventListener( "lostpointercapture", () => stop( btn ) );
		btn.addEventListener( "click", e => e.preventDefault() );
	}
	range.addEventListener( "input", refresh );
	refresh();
}

for ( const [ id, getSpec ] of Object.entries( NUMBER_BOXES ) ) {
	const range = uiElement( id );
	if ( range ) attachNumberBox( range, getSpec );
}
