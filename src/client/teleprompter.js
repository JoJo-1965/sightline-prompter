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
import { SHORTCUTS } from "./shortcuts.js";
import {
	startSteadyScroll,
	stopSteadyScroll,
	isRunning as isSteadyRunning,
	setWpm,
	getWpm,
	recalculate as recalculateSteady,
	WPM_STEP
} from "./steady-scroll.js";
import { decorateScript } from "./decorate.js";
import { readDirectives } from "./directives.js";

let scriptIndex = 0;
const md = document.getElementById( "md" );

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
let cuePhrases = [];
let lastScriptHtml = null;

function renderScript( html ) {
	md.innerHTML = html;
	decorateScript( md, { cuePhrases, highlight: settings.highlightCues } );
	scriptDirectives = readDirectives( md );
	liveMarkers = [];
}

const DEFAULT_FONT_SIZE = 3;
const FONT_SIZE_STEP = 0.25;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 8;
let fontSize = DEFAULT_FONT_SIZE;

function setFontSize( size, save = true ) {
	fontSize = Math.min( MAX_FONT_SIZE, Math.max( MIN_FONT_SIZE, size ) );
	document.body.style.fontSize = `${ fontSize }em`;
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

const DEFAULT_OPACITY = 0.07;
const OPACITY_STEP = 0.05;
let opacity = DEFAULT_OPACITY;

function setOpacity( value, save = true ) {
	opacity = Math.min( 1, Math.max( 0, Math.round( value * 100 ) / 100 ) );
	if ( !isEditMode ) {
		document.body.style.backgroundColor = `rgba(0, 0, 0, ${ opacity })`;
	}
	if ( save ) {
		window.electron.saveOpacity( opacity );
	}
	syncControls();
}

window.electron.onOpacity( ( value ) => {
	setOpacity( value, false );
} );

const MIRROR_MODES = [ "off", "horizontal", "vertical", "both" ];
const MIRROR_LABELS = { off: "Off", horizontal: "Horizontal", vertical: "Vertical", both: "Both" };
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
	const md = document.getElementById( "md" );
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

window.addEventListener( "scroll", () => {
	if ( mirroredVertically() ) applyMirror();
}, { passive: true } );
window.addEventListener( "resize", applyMirror );

function setMirrored( value, save = true ) {
	mirrored = normalizeMirror( value );
	applyMirror();
	updateReadingMarker();
	if ( save ) {
		window.electron.saveMirrored( mirrored );
	}
	syncControls();
}

// Ctrl+M steps through off, horizontal, vertical and both.
function cycleMirror() {
	const next = MIRROR_MODES[( MIRROR_MODES.indexOf( mirrored ) + 1 ) % MIRROR_MODES.length];
	setMirrored( next );
	showToast( `Mirror: ${ MIRROR_LABELS[next] }` );
}

function showToast( text ) {
	let toast = document.getElementById( "toast" );
	if ( !toast ) {
		toast = document.createElement( "div" );
		toast.id = "toast";
		toast.setAttribute( "role", "status" );
		hud.appendChild( toast );
	}
	toast.textContent = text;
	toast.classList.add( "visible" );
	clearTimeout( showToast.timer );
	showToast.timer = setTimeout( () => toast.classList.remove( "visible" ), 1400 );
}

window.electron.onMirrored( ( value ) => {
	setMirrored( value, false );
} );

function jumpToSection( index ) {
	const url = location.href;
	location.href = "#" + index;
	history.replaceState( null, null, url );
}

// --- Editor mode state ---
let isEditMode = false;
let isDirty = false;
let isLoadingContent = false;
let isNewFile = false;
let isSaving = false;
let editorView = null;
let previewManuallyScrolled = false;
let pendingScrollToCursor = false;
let savedScrollY = 0;

const previewContainer = document.getElementById( "preview-container" );
const editorContainer = document.getElementById( "editor-container" );
const editorDiv = document.getElementById( "editor" );
const toolbarFilename = document.getElementById( "toolbar-filename" );
const toolbarDirty = document.getElementById( "toolbar-dirty" );
const btnSave = document.getElementById( "btn-save" );
const btnSaveAs = document.getElementById( "btn-save-as" );
const btnCancel = document.getElementById( "btn-cancel" );
const resizeHandle = document.getElementById( "resize-handle" );
const autoScrollIndicator = document.getElementById( "auto-scroll-indicator" );
const apiKeyModal = document.getElementById( "api-key-modal" );
const apiKeyInput = document.getElementById( "api-key-input" );
const apiKeySaveBtn = document.getElementById( "api-key-save" );
const apiKeyCancelBtn = document.getElementById( "api-key-cancel" );
const apiKeyClearBtn = document.getElementById( "api-key-clear" );
const micModal = document.getElementById( "mic-modal" );
const micSelect = document.getElementById( "mic-modal-select" );
const micHint = document.getElementById( "mic-modal-hint" );
const micSaveBtn = document.getElementById( "mic-modal-save" );
const micCancelBtn = document.getElementById( "mic-modal-cancel" );

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
	document.body.style.backgroundColor = `rgba(0, 0, 0, ${ opacity })`;
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

function loadEditorContent( content, filePath ) {
	const rawContent = content ?? "";

	showEditor();

	if ( toolbarFilename ) {
		toolbarFilename.textContent = filePath
			? filePath.split( "/" ).pop()
			: "New file";
	}
	setDirty( false );

	isLoadingContent = true;
	if ( editorView ) {
		window.EditorModule.setEditorContent( editorView, rawContent );
	} else {
		editorView = window.EditorModule.createEditor( editorDiv, rawContent, () => {
			if ( !isDirty && !isLoadingContent ) {
				setDirty( true );
			}
		} );
	}
	isLoadingContent = false;
	editorView.focus();
}

window.electron.onRawMarkdown( ( content, filePath ) => {
	if ( !isEditMode ) return;
	loadEditorContent( content, filePath );
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
	if ( !editorView ) return;
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
window.electron.onNewFile( () => {
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
} );

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

	const plainKey = !event.metaKey && !event.ctrlKey && !event.altKey;
	if ( event.key === "Escape" && closePanels() ) {
		event.preventDefault();
		return;
	}
	// Typing or nudging a slider in the control bar or a panel.
	if ( event.target.closest?.( "input, select, textarea" ) ) return;
	if ( event.key === "F1" || ( event.key === "?" && !event.ctrlKey && !event.metaKey ) ) {
		event.preventDefault();
		openHelp();
		return;
	}
	if ( ( event.key === "b" || event.key === "B" ) && plainKey && !event.shiftKey ) {
		event.preventDefault();
		dropMarker();
		return;
	}
	if ( ( event.key === "b" || event.key === "B" ) && ( event.ctrlKey || event.metaKey ) && !event.shiftKey ) {
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
		// Advance to next section
		const sections = document.getElementsByName( scriptIndex + 1 );
		if ( sections.length > 0 ) {
			scriptIndex++;
			previewManuallyScrolled = true;
			jumpToSection( scriptIndex );
		}
	} else if ( event.key === "ArrowLeft" ) {
		event.preventDefault();
		// Go back to previous section
		if ( scriptIndex > 0 ) {
			scriptIndex--;
			previewManuallyScrolled = true;
			jumpToSection( scriptIndex );
		}
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
		setOpacity( opacity + OPACITY_STEP );
	} else if (
		( event.metaKey || event.ctrlKey )
		&& event.shiftKey
		&& event.key === "ArrowDown"
	) {
		event.preventDefault();
		setOpacity( opacity - OPACITY_STEP );
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
window.electron.onContent( ( content ) => {
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
	autoScrollIndicator.classList.remove( "hidden", "connecting", "error" );
	if ( variant ) autoScrollIndicator.classList.add( variant );
}

function handleAutoScrollPosition( wordIdx, ranges ) {
	if ( Date.now() - lastManualScrollTs < MANUAL_SCROLL_GRACE_MS ) return;
	scrollToWord( wordIdx, ranges );
}

async function startAutoScrollSession() {
	if ( autoScrollActive || autoScrollStarting ) return;
	if ( isEditMode ) {
		alert( "Exit the editor before starting auto-scroll." );
		return;
	}
	autoScrollStarting = true;
	pendingDeepgramKey = null;
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

	try {
		autoScrollHandle = await startAutoScroll( {
			deepgramKey: dgKey.key,
			scriptEl: md,
			audioDeviceId,
			onStatus: ( status ) => {
				if ( status.type === "closed" || status.type === "error" ) {
					if ( autoScrollActive ) stopAutoScrollSession();
				} else if ( status.type === "device-fallback" ) {
					showTransientHint( "Saved mic unavailable — using default", 2500 );
				}
			},
			onScroll: handleAutoScrollPosition
		} );
		autoScrollActive = true;
		autoScrollStarting = false;
		lastManualScrollTs = 0;
		setIndicator( "Listening" );
	} catch ( err ) {
		autoScrollStarting = false;
		console.error( "[auto-scroll] start failed", err );
		setIndicator( "Error", "error" );
		setTimeout( () => {
			if ( !autoScrollActive ) setIndicator( null );
		}, 3000 );
		alert( `Failed to start auto-scroll: ${ err.message }` );
	}
}

async function stopAutoScrollSession() {
	if ( !autoScrollActive && !autoScrollStarting ) return;
	autoScrollActive = false;
	autoScrollStarting = false;
	autoScrollHandle = null;
	clearTimeout( manualScrollSyncTimer );
	setIndicator( null );
	try {
		await stopAutoScroll();
	} catch ( err ) {
		console.warn( "[auto-scroll] stop error", err );
	}
}

// --- Steady scroll (fixed words per minute) ---

const countdownEl = document.getElementById( "countdown" );
let countdownTimer = null;

function steadyIndicatorText() {
	return `Scrolling · ${ getWpm() } wpm`;
}

function steadySessionActive() {
	return isSteadyRunning() || countdownTimer !== null;
}

function hideCountdown() {
	clearInterval( countdownTimer );
	countdownTimer = null;
	countdownEl?.classList.add( "hidden" );
}

function startSteadySession() {
	if ( isEditMode ) {
		alert( "Exit the editor before starting to scroll." );
		return;
	}
	const begin = () => {
		hideCountdown();
		startSteadyScroll( {
			el: md,
			wordsPerMinute: settings.steadyWpm,
			onFinished: () => setIndicator( null )
		} );
		startCueTracking();
		startBeep();
		setIndicator( steadyIndicatorText() );
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
	clearCuePause();
	hideCountdown();
	stopSteadyScroll();
	setIndicator( null );
}

function toggleAutoScrollSession() {
	if ( cuePaused ) {
		resumeFromCue();
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

const readingMarker = document.getElementById( "reading-marker" );

function updateReadingMarker() {
	if ( !readingMarker ) return;
	readingMarker.style.top = `${ getReadingAnchor() * 100 }vh`;
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
	setWpm( settings.steadyWpm );
	if ( isSteadyRunning() ) setIndicator( steadyIndicatorText() );
	if ( prev.scrollMode !== settings.scrollMode ) {
		stopSteadySession();
		stopAutoScrollSession();
	}
	if ( prev.highlightCues !== settings.highlightCues ) rerenderScript();
	applyDisplayClasses();
	applyLayout();
	syncControls();
	refreshControlsVisibility();
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

// Rich files (.rtf, .docx) are edited in Word; the watcher reloads them on save.
window.electron.onEditorUnavailable( ( fileName ) => {
	isEditMode = false;
	window.electron.resumeWatcher();
	alert(
		`${ fileName } is a rich-text or Word file, so edit it in Word or WordPad. The teleprompter reloads it each time you save.`
	);
} );

// --- Settings page ---

const settingsModal = document.getElementById( "settings-modal" );
const field = id => document.getElementById( id );
let settingsSnapshot = null;

function numberValue( id, min, max, fallback ) {
	const value = Number( field( id ).value );
	return Number.isFinite( value )
		? Math.min( max, Math.max( min, value ) )
		: fallback;
}

async function openSettings() {
	if ( !settingsModal ) return;
	settingsSnapshot = { fontSize, opacity };
	field( "set-scroll-mode" ).value = settings.scrollMode ?? "steady";
	field( "set-steady-wpm" ).value = settings.steadyWpm;
	field( "set-countdown" ).value = settings.countdown;
	field( "set-voice-speed" ).value = autoScrollSpeed;
	field( "set-deepgram-key" ).value = "";
	field( "set-deepgram-status" ).textContent = settings.hasDeepgramKey
		? "A key is saved. Type a new one to replace it (Script > Set Deepgram API Key… to clear it)."
		: "No key saved. Only needed for voice mode.";
	field( "set-font-size" ).value = fontSize;
	field( "set-opacity" ).value = opacity;
	field( "set-reading-line" ).value = settings.readingLine;
	field( "set-directions" ).value = settings.directions ?? "dim";
	field( "set-reading-marker" ).checked = !!settings.showReadingMarker;
	field( "set-mirrored" ).value = mirrored;
	field( "set-always-on-top" ).checked = !!settings.alwaysOnTop;
	field( "set-highlight-cues" ).checked = !!settings.highlightCues;
	field( "set-cues-file" ).value = settings.cuesFile ?? "";
	field( "set-eye-line" ).checked = !!settings.eyeLine;
	field( "set-eye-line-width" ).value = settings.eyeLineWidth;
	field( "set-eye-line-height" ).value = settings.eyeLineHeight;
	field( "set-eye-line-reading" ).value = settings.eyeLineReadingLine;
	field( "set-remote" ).checked = !!settings.remoteControl;
	field( "set-remote-port" ).value = settings.remotePort ?? 47615;
	window.electron.getRemoteInfo();
	settingsModal.classList.remove( "hidden" );
	await populateMicSelect();
	field( "set-microphone" ).innerHTML = micSelect.innerHTML;
	field( "set-microphone" ).value = audioDeviceId ?? "";
}

function closeSettings( restore ) {
	if ( restore && settingsSnapshot ) {
		setFontSize( settingsSnapshot.fontSize, false );
		setOpacity( settingsSnapshot.opacity, false );
	}
	settingsSnapshot = null;
	settingsModal?.classList.add( "hidden" );
}

function saveSettingsPage() {
	window.electron.saveSettings( {
		scrollMode: field( "set-scroll-mode" ).value === "voice" ? "voice" : "steady",
		steadyWpm: numberValue( "set-steady-wpm", 60, 300, settings.steadyWpm ),
		countdown: numberValue( "set-countdown", 0, 10, settings.countdown ),
		directions: field( "set-directions" ).value,
		showReadingMarker: field( "set-reading-marker" ).checked,
		readingLine: numberValue( "set-reading-line", 5, 80, settings.readingLine ),
		alwaysOnTop: field( "set-always-on-top" ).checked,
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
		remotePort: numberValue( "set-remote-port", 1024, 65535, settings.remotePort ?? 47615 )
	} );
	setFontSize( Number( field( "set-font-size" ).value ) );
	setOpacity( Number( field( "set-opacity" ).value ) );
	if ( field( "set-mirrored" ).value !== mirrored ) {
		setMirrored( field( "set-mirrored" ).value );
	}
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
	closeSettings( false );
}

if ( settingsModal ) {
	// Preview text size and background live while the sliders move.
	field( "set-font-size" ).addEventListener( "input", e =>
		setFontSize( Number( e.target.value ), false )
	);
	field( "set-opacity" ).addEventListener( "input", e =>
		setOpacity( Number( e.target.value ), false )
	);
	field( "set-cues-browse" ).addEventListener( "click", () =>
		window.electron.browseCuesFile()
	);
	field( "set-cues-clear" ).addEventListener( "click", () => {
		field( "set-cues-file" ).value = "";
	} );
	field( "settings-save" ).addEventListener( "click", saveSettingsPage );
	field( "settings-cancel" ).addEventListener( "click", () => closeSettings( true ) );
	settingsModal.addEventListener( "keydown", ( e ) => {
		if ( e.key === "Escape" ) closeSettings( true );
	} );
}

window.electron.onCuesFileChosen( ( filePath ) => {
	if ( filePath ) field( "set-cues-file" ).value = filePath;
} );
window.electron.onMenuSettings( openSettings );
window.electron.getSettings();
// --- Layout: margins, line spacing, alignment, edge fade ---

const LAYOUT_DEFAULTS = {
	marginX: 3,
	marginTop: 0,
	marginBottom: 0,
	lineHeight: 1.3,
	textOpacity: 1,
	textBrightness: 1,
	textAlign: "left"
};
const EDGE_FADE = 4; // % of the window height over which text fades at a margin

function applyLayout() {
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
	style.setProperty( "--text-opacity", settings.textOpacity ?? LAYOUT_DEFAULTS.textOpacity );
	// Only filter when dimmed: a filter on the whole script costs a little on every frame.
	const brightness = settings.textBrightness ?? LAYOUT_DEFAULTS.textBrightness;
	style.setProperty( "--text-filter", brightness < 1 ? `brightness(${ brightness })` : "none" );
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
		for ( const p of [ centre - half - fade, centre - half, centre + half, centre + half + fade ] ) {
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

const progressBar = document.getElementById( "progress-bar" );
const progressFill = document.getElementById( "progress-fill" );
const progressText = document.getElementById( "cb-progress-text" );
let textSpan = null; // { top, bottom, words } of the script text, in page pixels
let measureQueued = false;

function scheduleMeasure() {
	if ( measureQueued ) return;
	measureQueued = true;
	// A hidden window (minimised, screen locked) gets no animation frames.
	const later = document.hidden ? cb => setTimeout( cb, 0 ) : requestAnimationFrame;
	later( () => {
		measureQueued = false;
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
		updateProgress();
	} );
}

function formatMinutes( minutes ) {
	const total = Math.max( 0, Math.round( minutes * 60 ) );
	return `${ Math.floor( total / 60 ) }:${ String( total % 60 ).padStart( 2, "0" ) }`;
}

function updateProgress() {
	const hasScript = !!slotState.slots[slotState.active];
	const show = settings.showProgress !== false && !!textSpan && !isEditMode && hasScript;
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
	const wordsLeft = textSpan.words * ( 1 - fraction );
	const wpm = settings.steadyWpm || 140;
	if ( progressText ) {
		progressText.textContent = `${ Math.round( fraction * 100 ) }% · ${ formatMinutes( wordsLeft / wpm ) } left of ${ formatMinutes( textSpan.words / wpm ) }`;
	}
}

// --- Slots: up to nine scripts, each remembering its place ---

const slotsEl = document.getElementById( "cb-slots" );
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

const controlBar = document.getElementById( "control-bar" );
const playBtn = document.getElementById( "cb-play" );
const speedInput = document.getElementById( "cb-speed" );
const speedLabel = document.getElementById( "cb-speed-label" );
const speedValue = document.getElementById( "cb-speed-value" );
const fontInput = document.getElementById( "cb-font" );
const opacityInput = document.getElementById( "cb-opacity" );
const maxBtn = document.getElementById( "cb-max" );
const fullBtn = document.getElementById( "cb-full" );
let idleTimer = null;
const IDLE_MS_SCROLLING = 1500;
const IDLE_MS_STOPPED = 5000;

function isScrolling() {
	return steadySessionActive() || autoScrollActive || autoScrollStarting;
}

function updatePlayButton() {
	updateOnAir();
	if ( !playBtn ) return;
	const playing = isScrolling();
	playBtn.textContent = playing ? "❚❚" : "▶";
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
	speedLabel.textContent = voice ? "Voice" : "Speed";
	speedValue.textContent = voice
		? formatSpeed( autoScrollSpeed )
		: `${ settings.steadyWpm } wpm`;
	if ( document.activeElement !== fontInput ) fontInput.value = fontSize;
	if ( document.activeElement !== opacityInput ) opacityInput.value = opacity;
	const bgInput = document.getElementById( "lp-bg-opacity" );
	if ( bgInput && document.activeElement !== bgInput ) bgInput.value = opacity;
	document.getElementById( "cb-voice" )?.classList.toggle( "active", voice );
	syncLayoutPanel();
	syncVoicePanel();
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
	if ( pinned || panelOpen() || controlBar?.matches( ":hover" ) ) {
		document.body.classList.remove( "controls-hidden" );
		return;
	}
	idleTimer = setTimeout(
		() => {
			if (
				!settings.controlsPinned
				&& !panelOpen()
				&& !controlBar?.matches( ":hover" )
			) {
				document.body.classList.add( "controls-hidden" );
			}
		},
		isScrolling() ? IDLE_MS_SCROLLING : IDLE_MS_STOPPED
	);
}

function showControls() {
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
	document.getElementById( id )?.addEventListener( "click", handler );

onClick( "cb-menu", ( e ) => {
	e.stopPropagation();
	toggleAppMenu();
} );
onClick( "cb-open", () => window.electron.openFileDialog() );
onClick( "cb-save", saveFromBar );
onClick( "cb-edit", toggleEditMode );
onClick( "cb-restart", goToStart );
onClick( "cb-play", toggleAutoScrollSession );
onClick( "cb-layout", () => togglePanel( "layout-panel" ) );
onClick( "cb-voice", () => togglePanel( "voice-panel" ) );
onClick( "cb-help", openHelp );
onClick( "cb-settings", openSettings );
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
	setOpacity( Number( opacityInput.value ), false )
);
opacityInput?.addEventListener( "change", () =>
	setOpacity( Number( opacityInput.value ) )
);
// The Layout panel's background slider is the same setting as the bar's Backing.
document.getElementById( "lp-bg-opacity" )?.addEventListener( "input", e =>
	setOpacity( Number( e.target.value ), false )
);
document.getElementById( "lp-bg-opacity" )?.addEventListener( "change", e =>
	setOpacity( Number( e.target.value ) )
);

window.electron.onWindowState( ( state ) => {
	window.lastWindowState = state;
	if ( maxBtn ) {
		maxBtn.textContent = state.maximized ? "❐" : "▢";
		maxBtn.title = state.maximized
			? "Restore size (Shift+F11)"
			: "Maximise (Shift+F11)";
	}
	fullBtn?.classList.toggle( "active", !!state.fullScreen );
} );
window.electron.onMenuWindowControl( action =>
	window.electron.windowControl( action )
);
window.electron.onMenuGoToStart( goToStart );
window.electron.onNotice( text => showTransientHint( text, 2500 ) );

// --- Panels (layout, voice) and the in-app menu ---

const appMenu = document.getElementById( "app-menu" );

function togglePanel( id ) {
	const panel = document.getElementById( id );
	if ( !panel ) return;
	const opening = panel.classList.contains( "hidden" );
	closePanels();
	if ( opening ) {
		panel.classList.remove( "hidden" );
		if ( id === "voice-panel" ) openVoicePanel();
		syncControls();
	}
	showControls();
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
	refreshControlsVisibility();
	return closed;
}

document.addEventListener( "mousedown", ( e ) => {
	if ( e.target.closest?.( ".panel, #app-menu, #control-bar, .modal" ) ) return;
	closePanels();
} );

window.electron.onMenuLayout( () => togglePanel( "layout-panel" ) );
window.electron.onMenuVoice( () => togglePanel( "voice-panel" ) );

const toggleSetting = key => () =>
	window.electron.saveSettings( { [key]: !settings[key] } );

// Menu entries: [icon, label, shortcut, action, { checked, disabled }]
function menuGroups() {
	const voice = settings.scrollMode === "voice";
	const playing = isScrolling();
	return [
		{
			heading: "Script",
			items: [
				[
					"📂",
					"Open script…",
					"Ctrl+O",
					() => window.electron.openFileDialog()
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
			heading: "Playback",
			items: [
				[
					playing ? "❚❚" : "▶",
					playing ? "Pause scrolling" : "Start scrolling",
					"Space",
					toggleAutoScrollSession
				],
				[ "⏮", "Back to the start", "Ctrl+Home", goToStart ],
				[ "⏩", "Faster", "Ctrl+]", () => adjustAutoScrollSpeed( "up" ) ],
				[ "⏪", "Slower", "Ctrl+[", () => adjustAutoScrollSpeed( "down" ) ],
				[ "↺", "Reset speed", "Ctrl+\\", () => adjustAutoScrollSpeed( "reset" ) ],
				[
					"≋",
					"Steady scroll (words per minute)",
					"",
					() => window.electron.saveSettings( { scrollMode: "steady" } ),
					{ checked: !voice }
				],
				[
					"🎙",
					"Voice scroll sync…",
					"Ctrl+Shift+V",
					() => togglePanel( "voice-panel" ),
					{ checked: voice }
				]
			]
		},
		{
			heading: "Display",
			items: [
				[
					"▤",
					"Layout and margins…",
					"Ctrl+Shift+K",
					() => togglePanel( "layout-panel" )
				],
				[
					"⇋",
					`Mirror: ${ MIRROR_LABELS[mirrored] }`,
					"Ctrl+M",
					cycleMirror,
					{ checked: mirrored !== "off" }
				],
				[
					"✦",
					"Highlight slide cues",
					"",
					toggleSetting( "highlightCues" ),
					{ checked: !!settings.highlightCues }
				],
				[
					"▸",
					"Reading-line marker",
					"",
					toggleSetting( "showReadingMarker" ),
					{ checked: !!settings.showReadingMarker }
				],
				[
					"▬",
					"Progress and time left",
					"",
					() =>
						window.electron.saveSettings( {
							showProgress: settings.showProgress === false
						} ),
					{ checked: settings.showProgress !== false }
				],
				[
					"📌",
					"Keep controls visible",
					"Ctrl+Shift+B",
					toggleSetting( "controlsPinned" ),
					{ checked: !!settings.controlsPinned }
				]
			]
		},
		{
			heading: "Window",
			items: [
				[
					"◫",
					"Eye-line mode (under the webcam)",
					"Ctrl+L",
					toggleSetting( "eyeLine" ),
					{ checked: !!settings.eyeLine }
				],
				[
					"⤒",
					"Keep on top",
					"",
					toggleSetting( "alwaysOnTop" ),
					{ checked: !!settings.alwaysOnTop }
				],
				[
					"▢",
					"Maximise / restore",
					"Shift+F11",
					() => window.electron.windowControl( "maximize" )
				],
				[
					"⛶",
					"Full screen",
					"F11",
					() => window.electron.windowControl( "fullscreen" )
				],
				[
					"—",
					"Minimise",
					"Ctrl+Shift+M",
					() => window.electron.windowControl( "minimize" )
				]
			]
		},
		{
			heading: "Settings",
			items: [
				[ "⚙", "All settings…", "Ctrl+,", openSettings ],
				[ "🤖", "AI and remote control…", "", openRemoteSettings ],
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
		},
		{
			heading: "Help",
			items: [
				[ "?", "Keyboard shortcuts", "F1", openHelp ],
				[ "ⓘ", "About this teleprompter", "", openAbout ],
				[
					"✕",
					"Close the teleprompter",
					"Ctrl+W",
					() => window.electron.windowControl( "close" )
				]
			]
		}
	];
}

let recentExpanded = false;
let samplesExpanded = false;

function menuButton( icon, label, key, action, opts = {} ) {
	const btn = document.createElement( "button" );
	btn.type = "button";
	btn.className = "am-item";
	btn.disabled = !!opts.disabled;
	if ( opts.checked ) btn.classList.add( "checked" );
	const iconEl = document.createElement( "span" );
	iconEl.className = "am-icon";
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
	} );
	return btn;
}

function renderAppMenu() {
	appMenu.innerHTML = "";
	for ( const group of menuGroups() ) {
		const groupEl = document.createElement( "div" );
		groupEl.className = "am-group";
		const heading = document.createElement( "div" );
		heading.className = "am-heading";
		heading.textContent = group.heading;
		groupEl.appendChild( heading );
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
						{ disabled: recent.length === 0, keepOpen: true }
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
						{ keepOpen: true }
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
		appMenu.appendChild( groupEl );
	}
}

function toggleAppMenu() {
	const opening = appMenu.classList.contains( "hidden" );
	closePanels();
	if ( opening ) {
		recentExpanded = false;
		renderAppMenu();
		appMenu.classList.remove( "hidden" );
		appMenu.querySelector( ".am-item:not(:disabled)" )?.focus();
	}
	showControls();
}

appMenu?.addEventListener( "keydown", ( e ) => {
	const items = [ ...appMenu.querySelectorAll( ".am-item:not(:disabled)" ) ];
	const i = items.indexOf( document.activeElement );
	if ( e.key === "ArrowDown" || e.key === "ArrowUp" ) {
		e.preventDefault();
		e.stopPropagation();
		const next = e.key === "ArrowDown" ? i + 1 : i - 1;
		items[( next + items.length ) % items.length]?.focus();
	} else if ( e.key === "Escape" ) {
		e.stopPropagation();
		closePanels();
	}
} );

// --- Layout panel ---

const LAYOUT_FIELDS = [
	// [input id, setting key, format]
	[ "lp-margin-x", "marginX", v => `${ v }%` ],
	[ "lp-margin-top", "marginTop", v => `${ v }%` ],
	[ "lp-margin-bottom", "marginBottom", v => `${ v }%` ],
	[ "lp-line-height", "lineHeight", v => `${ Number( v ).toFixed( 2 ) }×` ],
	[ "lp-text-opacity", "textOpacity", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-text-brightness", "textBrightness", v => `${ Math.round( v * 100 ) }%` ],
	[ "lp-focus-strength", "focusStrength", v => `${ Math.round( v * 100 ) }%` ]
];

function readingLineKey() {
	return settings.eyeLine ? "eyeLineReadingLine" : "readingLine";
}

function syncLayoutPanel() {
	if ( !document.getElementById( "layout-panel" ) ) return;
	for ( const [ id, key, format ] of LAYOUT_FIELDS ) {
		const input = field( id );
		const value = settings[key] ?? LAYOUT_DEFAULTS[key];
		if ( document.activeElement !== input ) input.value = value;
		field( `${ id }-value` ).textContent = format( value );
	}
	const reading = settings[readingLineKey()];
	if ( document.activeElement !== field( "lp-reading-line" ) )
		field( "lp-reading-line" ).value = reading;
	field( "lp-reading-line-value" ).textContent = `${ reading }%`;
	field( "lp-align" ).value = settings.textAlign ?? "left";
	field( "lp-align" ).disabled = !!settings.eyeLine;
	field( "lp-mirrored" ).value = mirrored;
	field( "lp-marker" ).checked = !!settings.showReadingMarker;
	field( "lp-progress" ).checked = settings.showProgress !== false;
	field( "lp-pinned" ).checked = !!settings.controlsPinned;
	field( "lp-directives" ).checked = !!settings.showDirectives;
	field( "lp-follow-pace" ).checked = settings.followScriptPace !== false;
	field( "lp-focus-band" ).checked = !!settings.focusBand;
	field( "lp-text-effect" ).value = settings.textEffect ?? "none";
	field( "lp-theme" ).value = settings.theme ?? "default";
	field( "lp-font" ).value = settings.scriptFont ?? "default";
	field( "lp-on-air" ).checked = settings.onAirLight !== false;
	field( "lp-start-beep" ).checked = !!settings.startBeep;
	field( "lp-hide-capture" ).checked = !!settings.hideFromCapture;
	field( "lp-click-through" ).checked = !!settings.clickThrough;
	document.body.classList.toggle( "show-directives", !!settings.showDirectives );
}

if ( document.getElementById( "layout-panel" ) ) {
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
	field( "lp-mirrored" ).addEventListener( "change", () =>
		setMirrored( field( "lp-mirrored" ).value )
	);
	field( "lp-marker" ).addEventListener( "change", () =>
		window.electron.saveSettings( {
			showReadingMarker: field( "lp-marker" ).checked
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
		[ "lp-font", "scriptFont" ]
	] ) {
		field( id ).addEventListener( "change", () =>
			window.electron.saveSettings( { [key]: field( id ).value } )
		);
	}
	field( "lp-follow-pace" ).addEventListener( "change", () => {
		settings.followScriptPace = field( "lp-follow-pace" ).checked;
		window.electron.saveSettings( { followScriptPace: settings.followScriptPace } );
	} );
	field( "lp-directives" ).addEventListener( "change", () => {
		settings.showDirectives = field( "lp-directives" ).checked;
		document.body.classList.toggle( "show-directives", settings.showDirectives );
		window.electron.saveSettings( { showDirectives: settings.showDirectives } );
	} );
	// Beam-splitter glass reflects every bit of light from the screen into the
	// lens, so: solid black behind the text, dimmer text, and mirrored.
	onClick( "lp-beam-preset", () => {
		setOpacity( 1 );
		settings.textOpacity = 1;
		settings.textBrightness = 0.7;
		applyLayout();
		window.electron.saveSettings( { textOpacity: 1, textBrightness: 0.7 } );
		if ( mirrored === "off" ) setMirrored( "horizontal" );
		syncLayoutPanel();
		showToast( "Beam-splitter setup: black background, text 70%, mirrored" );
	} );
}

// --- Voice panel: scroll mode, Deepgram key, microphone with a live meter ---

let meterStream = null;
let meterContext = null;
let meterRaf = null;

function syncVoicePanel() {
	if ( !document.getElementById( "voice-panel" ) ) return;
	field( "vp-mode" ).value = settings.scrollMode === "voice" ? "voice" : "steady";
	field( "vp-key-status" ).textContent = settings.hasDeepgramKey
		? "✓ A key is saved. Paste a new one to replace it."
		: "No key saved yet. Voice mode needs one (console.deepgram.com).";
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
	const fill = document.getElementById( "vp-meter-fill" );
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

if ( document.getElementById( "voice-panel" ) ) {
	field( "vp-mode" ).addEventListener( "change", () => {
		window.electron.saveSettings( { scrollMode: field( "vp-mode" ).value } );
	} );
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

const helpModal = document.getElementById( "help-modal" );

function renderHelp() {
	const list = document.getElementById( "help-list" );
	if ( !list || list.childElementCount ) return;
	for ( const { section, keys } of SHORTCUTS ) {
		const sectionEl = document.createElement( "div" );
		sectionEl.className = "help-section";
		const heading = document.createElement( "h5" );
		heading.textContent = section;
		const dl = document.createElement( "dl" );
		for ( const [ combos, description ] of keys ) {
			const dt = document.createElement( "dt" );
			combos.forEach( ( combo, i ) => {
				if ( i ) dt.append( " " );
				const kbd = document.createElement( "kbd" );
				kbd.textContent = combo;
				dt.appendChild( kbd );
			} );
			const dd = document.createElement( "dd" );
			dd.textContent = description;
			dl.append( dt, dd );
		}
		sectionEl.append( heading, dl );
		list.appendChild( sectionEl );
	}
}

function openHelp() {
	closePanels();
	renderHelp();
	helpModal?.classList.remove( "hidden" );
	document.getElementById( "help-close" )?.focus( { preventScroll: true } );
	showControls();
}

function closeHelp() {
	helpModal?.classList.add( "hidden" );
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

const aboutModal = document.getElementById( "about-modal" );

function openAbout() {
	closePanels();
	window.electron.getAppInfo();
	aboutModal?.classList.remove( "hidden" );
	document.getElementById( "about-close" )?.focus( { preventScroll: true } );
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
window.electron.onAppInfo( ( info ) => {
	const el = document.getElementById( "about-version" );
	if ( el )
		el.textContent = `Version ${ info.version } · based on Electron Teleprompter 4.1.20 · Electron ${ info.electron } · ${ info.platform }`;
} );

// --- Settings files ---

window.electron.onMenuExportSettings( () => window.electron.exportSettings() );
window.electron.onMenuImportSettings( () => window.electron.importSettings() );

// --- Drag and drop a script ---

const dropOverlay = document.getElementById( "drop-overlay" );
let dragDepth = 0;

window.addEventListener( "dragenter", ( e ) => {
	if ( !e.dataTransfer?.types.includes( "Files" ) || isEditMode ) return;
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
	const file = e.dataTransfer?.files?.[0];
	if ( file && !isEditMode ) window.electron.openDroppedFile( file );
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
		scrolling: isScrolling(),
		section: scriptIndex,
		scrollY: Math.round( window.scrollY ),
		progress: progressText?.textContent ?? "",
		editing: isEditMode
	} );
}

window.addEventListener( "scroll", () => {
	if ( Date.now() - lastStatusSent > 500 ) {
		lastStatusSent = Date.now();
		sendStatus();
	}
}, { passive: true } );

function jumpSection( step ) {
	const next = scriptIndex + step;
	if ( next < 0 || document.getElementsByName( next ).length === 0 ) return;
	scriptIndex = next;
	previewManuallyScrolled = true;
	jumpToSection( scriptIndex );
}

window.electron.onRemoteCommand( ( action, value ) => {
	if ( isEditMode && action !== "help" ) return;
	if ( action === "play" && !isScrolling() ) toggleAutoScrollSession();
	else if ( action === "pause" && isScrolling() ) toggleAutoScrollSession();
	else if ( action === "toggle" ) toggleAutoScrollSession();
	else if ( action === "restart" ) goToStart();
	else if ( action === "next-section" ) jumpSection( 1 );
	else if ( action === "previous-section" ) jumpSection( -1 );
	else if ( action === "faster" ) adjustAutoScrollSpeed( "up" );
	else if ( action === "slower" ) adjustAutoScrollSpeed( "down" );
	else if ( action === "reset-speed" ) adjustAutoScrollSpeed( "reset" );
	else if ( action === "set-wpm" && Number.isFinite( Number( value ) ) ) {
		settings.steadyWpm = setWpm( Number( value ) );
		window.electron.saveSettings( { steadyWpm: settings.steadyWpm } );
		syncControls();
	} else if ( action === "go-to-section" && Number.isInteger( Number( value ) ) ) {
		jumpSection( Number( value ) - scriptIndex );
	} else if ( action === "help" ) openHelp();
	sendStatus();
} );

window.electron.onRemoteInfo( ( info ) => {
	const status = document.getElementById( "set-remote-status" );
	if ( !status ) return;
	field( "set-remote-token" ).value = info.token ?? "";
	if ( info.error ) status.textContent = `Not running: ${ info.error }`;
	else if ( info.running ) status.textContent = `On at ${ info.url } (details for assistants in ${ info.file })`;
	else status.textContent = "Off.";
} );
onClick( "set-remote-copy", async () => {
	await navigator.clipboard.writeText( field( "set-remote-token" ).value );
	showTransientHint( "Token copied", 1500 );
} );
onClick( "set-remote-new", () => window.electron.newRemoteToken() );

function openRemoteSettings() {
	openSettings();
	setTimeout( () => field( "set-remote-fieldset" )?.scrollIntoView( { block: "start" } ), 50 );
}
// --- Script directives: pauses, markers and pace targets ---
// readDirectives() (directives.js) finds what the script asks for; this part
// acts on it while steady scrolling. Positions are measured with the word
// index (scheduleMeasure) because they move with the text size and width.

let scriptDirectives = { script: {}, sections: [], pauses: [], markers: [], paceChanges: [] };
let directivePoints = { pauses: [], markers: [], paceChanges: [], sections: [] };
let liveMarkers = []; // markers dropped with B during this session
let cuePaused = false;
let cueTimer = null;
let lastReadingY = null;
let appliedPace = null;

function pageY( el ) {
	return el.getBoundingClientRect().top + window.scrollY;
}

function readingLineY() {
	return window.scrollY + window.innerHeight * getReadingAnchor();
}

function measureDirectives( ranges ) {
	const wordTops = ranges.map( r => r.getBoundingClientRect().top + window.scrollY );
	const sections = scriptDirectives.sections.map( s => ( { ...s, y: pageY( s.heading ) } ) );
	sections.forEach( ( s, i ) => {
		const end = sections[i + 1]?.y ?? Infinity;
		s.words = wordTops.filter( y => y >= s.y && y < end ).length;
	} );
	directivePoints = {
		sections,
		pauses: scriptDirectives.pauses.map( p => ( { ...p, y: pageY( p.el ) } ) ),
		markers: [ ...scriptDirectives.markers, ...liveMarkers ]
			.map( m => ( { ...m, y: pageY( m.el ) } ) )
			.sort( ( a, b ) => a.y - b.y ),
		paceChanges: scriptDirectives.paceChanges.map( c => ( { ...c, y: pageY( c.el ) } ) )
	};
}

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
	return scriptDirectives.script.wpm ?? null;
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
	lastReadingY = readingLineY();
	appliedPace = null;
	followScriptPace( lastReadingY );
}

function pauseAtCue( pause ) {
	stopSteadyScroll();
	cuePaused = true;
	clearTimeout( cueTimer );
	if ( pause.seconds ) {
		setIndicator( `Paused · ${ pause.seconds } s` );
		cueTimer = setTimeout( resumeFromCue, pause.seconds * 1000 );
	} else {
		setIndicator( "Paused · Space to carry on" );
	}
	updatePlayButton();
}

function resumeFromCue() {
	clearTimeout( cueTimer );
	cueTimer = null;
	cuePaused = false;
	startSteadyScroll( {
		el: md,
		wordsPerMinute: settings.steadyWpm,
		onFinished: () => setIndicator( null )
	} );
	lastReadingY = readingLineY();
	setIndicator( steadyIndicatorText() );
}

function clearCuePause() {
	clearTimeout( cueTimer );
	cueTimer = null;
	cuePaused = false;
}

window.addEventListener( "scroll", () => {
	const y = readingLineY();
	if ( isSteadyRunning() && lastReadingY !== null ) {
		const pause = directivePoints.pauses.find( p => p.y > lastReadingY && p.y <= y );
		if ( pause ) {
			lastReadingY = y;
			pauseAtCue( pause );
			return;
		}
		followScriptPace( y );
	}
	lastReadingY = y;
}, { passive: true } );

// Markers: {marker} in the script, or dropped with B during a take.
function dropMarker() {
	const y = readingLineY();
	const { ranges } = buildWordIndex( md );
	const word = ranges.find( r => r.getBoundingClientRect().top + window.scrollY >= y - 4 );
	if ( !word ) return;
	const el = document.createElement( "span" );
	el.className = "live-marker";
	el.setAttribute( "aria-label", "Marker" );
	const start = word.cloneRange();
	start.collapse( true );
	start.insertNode( el );
	liveMarkers.push( { el } );
	scheduleMeasure();
	showToast( "Marker added · Ctrl+B jumps between markers" );
}

function jumpToNextMarker() {
	const markers = directivePoints.markers;
	if ( !markers.length ) {
		showToast( "No markers yet · press B to add one" );
		return;
	}
	const y = readingLineY();
	const next = markers.find( m => m.y > y + 8 ) ?? markers[0];
	window.scrollTo( 0, Math.max( 0, next.y - window.innerHeight * getReadingAnchor() ) );
	previewManuallyScrolled = true;
	showToast( `Marker ${ markers.indexOf( next ) + 1 } of ${ markers.length }` );
}

// --- Reading aids and recording helpers ---

const THEMES = [ "default", "yellow", "contrast", "cream" ];
const FONTS = [ "default", "atkinson", "opendyslexic", "verdana" ];
const EFFECTS = [ "none", "outline", "shadow" ];

function applyDisplayClasses() {
	const body = document.body;
	for ( const t of THEMES ) body.classList.toggle( `theme-${ t }`, ( settings.theme ?? "default" ) === t );
	for ( const f of FONTS ) body.classList.toggle( `font-${ f }`, ( settings.scriptFont ?? "default" ) === f );
	for ( const e of EFFECTS ) body.classList.toggle( `edge-${ e }`, ( settings.textEffect ?? "none" ) === e );
	updateOnAir();
}

// ON AIR: lit while a scrolling session is running or held at a {pause}.
const onAirEl = document.getElementById( "on-air" );
function updateOnAir() {
	if ( !onAirEl ) return;
	const live = settings.onAirLight !== false && ( isScrolling() || cuePaused );
	onAirEl.classList.toggle( "hidden", !live );
}

let audioCtx = null;
function startBeep() {
	if ( !settings.startBeep ) return;
	try {
		audioCtx ??= new AudioContext();
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();
		osc.frequency.value = 880;
		gain.gain.setValueAtTime( 0.25, audioCtx.currentTime );
		gain.gain.exponentialRampToValueAtTime( 0.001, audioCtx.currentTime + 0.18 );
		osc.connect( gain ).connect( audioCtx.destination );
		osc.start();
		osc.stop( audioCtx.currentTime + 0.2 );
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
		"#control-bar, .panel, #app-menu, .modal, #auto-scroll-indicator, #toast"
	);
	const ignore = !overControls;
	if ( ignore !== ignoringMouse ) {
		ignoringMouse = ignore;
		window.electron.setIgnoreMouse( ignore );
	}
} );

window.electron.onToast( text => showToast( text ) );

// Game controllers: buttons act like the matching keys.
const PAD_KEYS = {
	0: { key: "PageDown" }, // A: start / pause / carry on
	1: { key: "b" }, // B: drop a marker
	2: { key: "b", ctrlKey: true }, // X: next marker
	12: { key: "ArrowUp" }, // d-pad up: faster while scrolling
	13: { key: "ArrowDown" }, // d-pad down: slower
	14: { key: "ArrowLeft" }, // d-pad left: previous section
	15: { key: "ArrowRight" } // d-pad right: next section
};
let padTimer = null;
const padPressed = new Map();
function pollGamepads() {
	const pads = navigator.getGamepads?.() ?? [];
	let any = false;
	for ( const pad of pads ) {
		if ( !pad ) continue;
		any = true;
		for ( const [ index, keyInit ] of Object.entries( PAD_KEYS ) ) {
			const down = !!pad.buttons[index]?.pressed;
			const id = `${ pad.index }:${ index }`;
			if ( down && !padPressed.get( id ) ) {
				document.dispatchEvent( new KeyboardEvent( "keydown", { ...keyInit, bubbles: true } ) );
			}
			padPressed.set( id, down );
		}
	}
	if ( !any ) {
		clearInterval( padTimer );
		padTimer = null;
	}
}
window.addEventListener( "gamepadconnected", () => {
	padTimer ??= setInterval( pollGamepads, 40 );
	showToast( "Controller connected · A starts and pauses, B adds a marker" );
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
	"lp-focus-strength": () => ( { scale: 100, unit: "%", word: "percent", name: "Focus strength" } ),
	"lp-text-brightness": () => ( { scale: 100, unit: "%", word: "percent", name: "Text brightness" } ),
	"lp-bg-opacity": () => ( { scale: 100, unit: "%", word: "percent", name: "Background opacity" } ),
	"lp-text-opacity": () => ( { scale: 100, unit: "%", word: "percent", name: "Text opacity" } ),
	"lp-line-height": () => ( {
		scale: 100,
		unit: "%",
		word: "percent",
		name: "Line spacing"
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
	"set-steady-wpm": () => ( { scale: 1, unit: "wpm", word: "words per minute", name: "Steady speed" } ),
	"set-countdown": () => ( { scale: 1, unit: "s", word: "seconds", name: "Countdown" } ),
	"set-reading-line": () => ( { scale: 1, unit: "%", word: "percent from the top", name: "Reading line" } ),
	"set-eye-line-width": () => ( { scale: 1, unit: "%", word: "percent of the screen", name: "Strip width" } ),
	"set-eye-line-height": () => ( { scale: 1, unit: "%", word: "percent of the screen", name: "Strip height" } ),
	"set-eye-line-reading": () => ( { scale: 1, unit: "%", word: "percent from the top", name: "Reading line in the strip" } ),
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
	for ( const [ btn, sign, glyph ] of [
		[ up, 1, "▲" ],
		[ down, -1, "▼" ]
	] ) {
		btn.type = "button";
		btn.tabIndex = -1;
		btn.textContent = glyph;
		btn.dataset.sign = sign;
		steppers.append( btn );
	}
	box.append( num, unit, steppers );
	const row = document.createElement( "span" );
	row.className = "slider-with-box";
	range.replaceWith( row );
	row.append( range, box );
	document.getElementById( `${ range.id }-value` )?.classList.add( "num-replaced" );

	const read = () => Number( valueProp.get.call( range ) );
	const refresh = () => {
		const spec = getSpec();
		const scale = spec.scale;
		num.min = tidy( Number( range.min ) * scale );
		num.max = tidy( Number( range.max ) * scale );
		num.step = tidy( Number( range.step ) * scale );
		const shown = tidy( read() * scale );
		if ( document.activeElement !== num ) num.value = shown;
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
		if ( v < max ) v = Math.min( max, tidy( min + Math.round( ( v - min ) / step ) * step ) );
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
	const range = document.getElementById( id );
	if ( range ) attachNumberBox( range, getSpec );
}
