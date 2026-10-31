// A framing aid above the camera preview, never an OBS scene source.
import { BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "node:path";
import { fitInside } from "./utils/fit.js";
import { guidePose } from "./client/guide-pose.js";
import { captureOverride, protectWindow } from "./capture-policy.js";
import { guideAdjustment, GUIDE_CONTROLS } from "./guide-control.js";

const HOTKEY = "CommandOrControl+Shift+H";
const FULLSCREEN_HOTKEY = "CommandOrControl+Alt+H";
export function createHeadGuide( { dir, prompter, getSettings, saveSettings, saveBounds, onChange, restoreStack, restackUtilities } ) {
	let overlay = null;
	let controls = null;
	let locked = false;
	let resizing = null;
	let saveTimer;
	let fullscreen = false;
	let normalBounds = null;
	const state = () => {
		const s = getSettings();
		return { locked, fullscreen, chromeless: s.headGuideChromeless === true, eyesLocked: s.headGuideEyesLocked === true, ...guidePose( { x: s.headGuideX, y: s.headGuideY, scale: s.headGuideScale, width: s.headGuideWidth, height: s.headGuideHeight, top: s.headGuideTop, bottom: s.headGuideBottom, left: s.headGuideLeft, right: s.headGuideRight } ), ideal: guidePose( s.headGuideIdeal ), showIdeal: s.headGuideShowIdeal !== false, opacity: Math.max( 0.2, Math.min( 1, Number( s.headGuideOpacity ) || 0.75 ) ), background: Math.max( 0, Math.min( 0.8, Number( s.headGuideBackground ?? 0.12 ) ) ), colour: s.headGuideColour === "gold" ? "gold" : "mint" };
	};
	const snapshot = () => ( { ...state(), shown: !!overlay, bounds: overlay?.getBounds() ?? getSettings().headGuideBounds ?? null, windowedBounds: normalBounds ?? getSettings().headGuideBounds ?? null, placement: getSettings().headGuidePlacement ?? "centre", placements: getSettings().headGuidePlacements ?? {}, displayId: overlay ? screen.getDisplayMatching( overlay.getBounds() ).id : null, captureOverride: captureOverride(), captureStatus: captureOverride() ? "Debug capture override on; guide may be recorded" : "Protected separate overlay; OBS capture route not verified" } );
	const send = () => {
		const value = snapshot();
		value.controlsShown = controls?.isVisible() ?? false;
		overlay?.webContents.send( "headGuideState", value );
		controls?.webContents.send( "headGuideState", { ...value, controlsOnly: true } );
		if ( !prompter.isDestroyed() ) prompter.webContents.send( "headGuideState", value );
	};
	function remember() {
		clearTimeout( saveTimer );
		saveTimer = setTimeout( () => {
			if ( overlay && !fullscreen ) saveBounds( overlay.getBounds() );
			send();
		}, 200 );
	}
	function unlock() {
		if ( !overlay ) return;
		locked = false;
		saveSettings( { headGuideChromeless: false } );
		overlay.setIgnoreMouseEvents( false );
		overlay.showInactive();
		restack();
		send();
		onChange();
	}
	function close() {
		clearTimeout( saveTimer );
		controls?.destroy();
		controls = null;
		if ( overlay ) {
			saveBounds( fullscreen ? normalBounds : overlay.getBounds() );
			overlay.destroy();
		}
		overlay = null;
		locked = false;
		resizing = null;
		fullscreen = false;
		normalBounds = null;
		if ( !prompter.isDestroyed() ) restoreStack();
		send();
	}
	function restack() {
		if ( !overlay || prompter.isDestroyed() ) return;
		overlay.setAlwaysOnTop( true, "floating" );
		overlay.moveTop();
		prompter.setAlwaysOnTop( true, "screen-saver" );
		prompter.moveTop();
		if ( controls?.isVisible() ) {
			controls.setAlwaysOnTop( true, "screen-saver" );
			controls.moveTop();
		}
		restackUtilities?.();
	}
	function toggleControls() {
		if ( !overlay ) return;
		if ( controls?.isVisible() ) {
			controls.hide();
			send();
			return;
		}
		if ( !controls ) {
			const area = screen.getDisplayMatching( prompter.getBounds() ).workArea;
			const saved = getSettings().headGuideControlsBounds;
			const bounds = fitInside( saved ?? { x: area.x + area.width - 400, y: area.y + 30, width: 390, height: 740 }, area );
			controls = new BrowserWindow( { ...bounds, minWidth: Math.min( 350, area.width ), minHeight: Math.min( 460, area.height ), show: false, minimizable: false, maximizable: false, fullscreenable: false, autoHideMenuBar: true, title: "Guide adjustments", backgroundColor: "#15222b", webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, preload: path.join( dir, "client", "head-guide-preload.mjs" ) } } );
			protectWindow( controls, !!getSettings().hideFromCapture );
			controls.setAlwaysOnTop( true, "screen-saver" );
			controls.loadFile( path.join( dir, "client", "head-guide.html" ), { query: { controls: "1" } } );
			controls.once( "ready-to-show", () => {
				controls?.show();
				restack();
				send();
			} );
			controls.on( "close", ( event ) => {
				event.preventDefault();
				controls.hide();
				send();
			} );
			const rememberControls = () => {
				if ( controls ) saveSettings( { headGuideControlsBounds: controls.getBounds() } );
			};
			controls.on( "move", rememberControls );
			controls.on( "resize", rememberControls );
			controls.webContents.on( "will-navigate", event => event.preventDefault() );
			controls.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		} else {
			controls.show();
			restack();
			send();
		}
	}
	function fitMode() {
		if ( !overlay ) return;
		const wanted = getSettings().headGuideFullscreen === true;
		if ( wanted && !fullscreen ) normalBounds = overlay.getBounds();
		if ( wanted ) {
			fullscreen = true;
			overlay.setBounds( screen.getDisplayMatching( overlay.getBounds() ).bounds );
		} else if ( fullscreen ) {
			fullscreen = false;
			overlay.setBounds( fitInside( normalBounds, screen.getDisplayMatching( normalBounds ).workArea ) );
		}
	}
	function toggleFullscreen() {
		const next = !overlay || !getSettings().headGuideFullscreen;
		saveSettings( { showHeadGuide: true, headGuideFullscreen: next, headGuideChromeless: next } );
	}
	function apply() {
		if ( !getSettings().showHeadGuide ) {
			close();
			return;
		}
		if ( !overlay ) {
			const saved = getSettings().headGuideBounds;
			const area = screen.getDisplayMatching( saved && Number.isFinite( saved.x ) && Number.isFinite( saved.y ) ? { x: saved.x, y: saved.y, width: 480, height: 318 } : prompter.getBounds() ).workArea;
			const width = Math.round( Math.max( 320, Math.min( Number( saved?.width ) || 960, area.width, ( area.height - 48 ) * 16 / 9 ) ) );
			const height = Math.round( width * 9 / 16 + 48 );
			const x = Math.round( Math.max( area.x, Math.min( Number.isFinite( saved?.x ) ? saved.x : area.x + 40, area.x + area.width - width ) ) );
			const y = Math.round( Math.max( area.y, Math.min( Number.isFinite( saved?.y ) ? saved.y : area.y + 60, area.y + area.height - height ) ) );
			overlay = new BrowserWindow( { x, y, width, height, frame: false, transparent: true, backgroundColor: "#00000000", resizable: false, maximizable: false, minimizable: false, fullscreenable: false, show: false, title: "Sightline head-position guide", webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, preload: path.join( dir, "client", "head-guide-preload.mjs" ) } } );
			overlay.setAlwaysOnTop( true, "floating" );
			// Independent of the prompter's Hide from capture preference.
			protectWindow( overlay, true );
			overlay.loadFile( path.join( dir, "client", "head-guide.html" ) );
			overlay.once( "ready-to-show", () => {
				overlay?.showInactive();
				restack();
			} );
			overlay.on( "focus", restack );
			overlay.on( "move", remember );
			overlay.on( "close", ( event ) => {
				event.preventDefault();
				saveSettings( { showHeadGuide: false } );
			} );
			overlay.webContents.on( "will-navigate", event => event.preventDefault() );
			overlay.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		}
		fitMode();
		protectWindow( controls, !!getSettings().hideFromCapture );
		restack();
		send();
	}
	function toggle() {
		if ( overlay && ( locked || getSettings().headGuideChromeless ) ) unlock();
		else saveSettings( { showHeadGuide: !getSettings().showHeadGuide } );
	}
	function remoteControl( name ) {
		if ( !GUIDE_CONTROLS.includes( name ) ) throw new Error( "Unknown head guide control" );
		if ( !overlay ) throw new Error( "Show the head guide first" );
		if ( name === "adjust" ) toggleControls();
		else if ( name === "eyes-lock" ) saveSettings( { headGuideEyesLocked: !state().eyesLocked } );
		else if ( name === "ideal-visible" ) saveSettings( { headGuideShowIdeal: !state().showIdeal } );
		else {
			const ideal = state().ideal;
			const patch = { headGuideEyesLocked: false };
			for ( const [ key, value ] of Object.entries( ideal ) ) patch[`headGuide${ key[0].toUpperCase() }${ key.slice( 1 ) }`] = value;
			saveSettings( patch );
		}
	}
	function action( event, name, value ) {
		const fromOverlay = overlay && event.sender === overlay.webContents;
		const fromControls = controls && event.sender === controls.webContents;
		if ( !fromOverlay && !fromControls && event.sender !== prompter.webContents ) return;
		if ( name === "adjust" ) {
			toggleControls();
			return;
		}
		if ( name === "adjust-hide" && controls ) {
			controls.hide();
			send();
			return;
		}
		if ( name === "toggle" ) {
			toggle();
			return;
		}
		if ( name === "fullscreen" ) {
			toggleFullscreen();
			return;
		}
		if ( name === "show" ) {
			saveSettings( { showHeadGuide: true } );
			return;
		}
		if ( name === "hide" ) {
			saveSettings( { showHeadGuide: false } );
			return;
		}
		if ( !fromOverlay && !fromControls ) return;
		if ( name === "ready" ) {
			send();
			if ( !hotkeyRegistered || !fullscreenHotkeyRegistered ) prompter.webContents.send( "toast", "A head guide hotkey is in use. Use Tools or Stream Deck for the guide controls." );
		}
		if ( name === "chrome" ) saveSettings( { headGuideChromeless: !getSettings().headGuideChromeless } );
		if ( name === "place" && [ "centre", "beside" ].includes( value ) ) {
			// Leave fullscreen before applying a saved window placement.
			if ( !fullscreen ) saveBounds( overlay.getBounds() );
			saveSettings( { headGuideFullscreen: false, headGuideChromeless: false } );
			const area = screen.getDisplayMatching( prompter.getBounds() ).workArea;
			const bounds = overlay.getBounds();
			const panel = prompter.getBounds();
			const saved = getSettings().headGuidePlacements?.[value];
			const target = saved ?? { ...bounds, x: value === "centre" ? Math.round( area.x + ( area.width - bounds.width ) / 2 ) : panel.x + panel.width + 12, y: value === "centre" ? Math.round( area.y + ( area.height - bounds.height ) / 2 ) : panel.y };
			saveSettings( { headGuidePlacement: value } );
			overlay.setBounds( fitInside( target, area ) );
			saveBounds( overlay.getBounds() );
			send();
		}
		if ( name === "lock" ) {
			locked = true;
			send();
			overlay.setIgnoreMouseEvents( true, { forward: true } );
			onChange();
		}
		if ( name === "preferences" ) {
			const patch = {};
			if ( typeof value?.eyesLocked === "boolean" ) patch.headGuideEyesLocked = value.eyesLocked;
			if ( Number.isFinite( value?.width ) ) patch.headGuideWidth = guidePose( value ).width;
			if ( Number.isFinite( value?.height ) ) patch.headGuideHeight = guidePose( value ).height;
			for ( const edge of [ "top", "bottom", "left", "right" ] ) {
				if ( Number.isFinite( value?.[edge] ) ) patch[`headGuide${ edge[0].toUpperCase() }${ edge.slice( 1 ) }`] = guidePose( value )[edge];
			}
			if ( Number.isFinite( value?.scale ) ) patch.headGuideScale = Math.max( 0.4, Math.min( 2, value.scale ) );
			if ( !state().eyesLocked && Number.isFinite( value?.x ) ) patch.headGuideX = Math.max( -45, Math.min( 45, value.x ) );
			if ( !state().eyesLocked && Number.isFinite( value?.y ) ) patch.headGuideY = Math.max( -45, Math.min( 45, value.y ) );
			if ( Number.isFinite( value?.opacity ) ) patch.headGuideOpacity = Math.max( 0.2, Math.min( 1, value.opacity ) );
			if ( Number.isFinite( value?.background ) ) patch.headGuideBackground = Math.max( 0, Math.min( 0.8, value.background ) );
			if ( Object.keys( patch ).length ) saveSettings( patch );
		}
		if ( name === "save-ideal" ) {
			const pose = state();
			saveSettings( { headGuideIdeal: guidePose( pose ), headGuideShowIdeal: true } );
		}
		if ( name === "ideal-visible" ) saveSettings( { headGuideShowIdeal: !state().showIdeal } );
		if ( name === "reset-pose" ) {
			const ideal = state().ideal;
			saveSettings( { headGuideX: ideal.x, headGuideY: ideal.y, headGuideScale: ideal.scale, headGuideWidth: ideal.width, headGuideHeight: ideal.height, headGuideTop: ideal.top, headGuideBottom: ideal.bottom, headGuideLeft: ideal.left, headGuideRight: ideal.right, headGuideEyesLocked: false } );
		}
		if ( name === "colour" ) saveSettings( { headGuideColour: state().colour === "mint" ? "gold" : "mint" } );
		if ( name === "resize-start" && !fullscreen ) resizing = { cursor: screen.getCursorScreenPoint(), bounds: overlay.getBounds() };
		if ( name === "resize-end" ) {
			resizing = null;
			remember();
		}
		if ( name === "resize" && resizing ) {
			const area = screen.getDisplayMatching( overlay.getBounds() ).workArea;
			const width = Math.round( Math.max( 320, Math.min( resizing.bounds.width + screen.getCursorScreenPoint().x - resizing.cursor.x, area.width, ( area.height - 48 ) * 16 / 9 ) ) );
			overlay.setBounds( { ...resizing.bounds, width, height: Math.round( width * 9 / 16 + 48 ) } );
		}
	}
	ipcMain.on( "headGuideAction", action );
	const hotkeyRegistered = globalShortcut.register( HOTKEY, toggle );
	const fullscreenHotkeyRegistered = globalShortcut.register( FULLSCREEN_HOTKEY, toggleFullscreen );
	const displaysChanged = () => {
		if ( !overlay ) return;
		if ( fullscreen ) fitMode();
		else overlay.setBounds( fitInside( overlay.getBounds(), screen.getDisplayMatching( overlay.getBounds() ).workArea ) );
		if ( controls ) controls.setBounds( fitInside( controls.getBounds(), screen.getDisplayMatching( controls.getBounds() ).workArea ) );
		send();
		restack();
	};
	screen.on( "display-removed", displaysChanged );
	screen.on( "display-metrics-changed", displaysChanged );
	prompter.on( "focus", restack );
	return {
		apply, toggle, toggleFullscreen, restack, isLocked: () => locked,
		status: () => ( { ...state(), shown: !!overlay } ),
		adjust: value => saveSettings( guideAdjustment( getSettings(), value ) ),
		control: remoteControl,
		dispose() {
			close();
			ipcMain.removeListener( "headGuideAction", action );
			if ( hotkeyRegistered ) globalShortcut.unregister( HOTKEY );
			if ( fullscreenHotkeyRegistered ) globalShortcut.unregister( FULLSCREEN_HOTKEY );
			screen.removeListener( "display-removed", displaysChanged );
			screen.removeListener( "display-metrics-changed", displaysChanged );
			prompter.removeListener( "focus", restack );
		}
	};
}
