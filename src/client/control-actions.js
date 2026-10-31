// One button vocabulary for the floating pad and phone. IDs match Stream Deck
// commands; slot buttons carry a fixed, validated slot number.
import { guideValue } from "./guide-values.js";
const groups = {
	Prompting: [ [ "toggle", "Play / pause", "▶" ], [ "restart", "Top", "↤" ], [ "previous-section", "Previous", "◀" ], [ "next-section", "Next", "▶" ], [ "faster", "Faster", "+" ], [ "slower", "Slower", "−" ], [ "scroll-mode", "Voice / steady", "🎙" ] ],
	Recording: [ [ "on-air", "On air", "●" ], [ "marker", "Marker", "⚑" ], [ "back-to-marker", "To marker", "↶" ], [ "keeper", "Keeper", "✓" ], [ "scrap", "Scrap", "×" ], [ "obs-record", "Record take", "●" ], [ "obs-finish", "Finish recording", "■" ], [ "sound-check", "Sound check", "▥" ] ],
	View: [ [ "bigger", "Bigger text", "A+" ], [ "smaller", "Smaller text", "A−" ], [ "mirror-h", "Mirror L/R", "↔" ], [ "mirror-v", "Mirror U/D", "↕" ], [ "layout", "Spacing", "↔" ], [ "reading", "Text / colour", "Aa" ], [ "recording", "Take display", "●" ], [ "eye-line", "Eye line", "◉" ], [ "click-through", "Click through", "↗" ], [ "control", "Control window", "▣" ], [ "pad", "Show / hide pad", "▦" ], [ "help", "Help", "?" ] ],
	Listening: [ [ "listening-toggle", "Listening on / off", "🎙" ], [ "listening-restart", "Restart listening", "↻" ], [ "session-check", "Session check", "✓" ] ],
	Guide: [ [ "head-guide", "Head guide", "◎" ], [ "head-guide-fullscreen", "Guide fullscreen", "⛶" ], [ "guide-adjustments", "Adjust guide", "◎" ], [ "guide-eyes-lock", "Lock eye position", "◉" ], [ "guide-ideal-visible", "Show ideal reference", "◎" ], [ "guide-match-ideal", "Match saved ideal", "↶" ] ],
	Scripts: Array.from( { length: 9 }, ( _, i ) => [ `slot-${ i + 1 }`, `Slot ${ i + 1 }`, String( i + 1 ) ] )
};
export const CONTROL_ACTIONS = Object.entries( groups ).flatMap( ( [ group, actions ] ) => actions.map( ( [ id, label, icon ] ) => ( { id, label, icon, group } ) ) );
CONTROL_ACTIONS.push( { id: "mirror", label: "Cycle mirror", icon: "↔", group: "View" }, { id: "status", label: "Section / time", icon: "▤", group: "Prompting" } );
export const DEFAULT_PAD_LAYOUT = { columns: 4, buttons: [ "restart", "previous-section", "toggle", "next-section" ] };
export const PAD_PRESETS = {
	compact: DEFAULT_PAD_LAYOUT,
	reading: { columns: 4, buttons: [ "restart", "previous-section", "toggle", "next-section", "slower", "faster", "marker", "back-to-marker" ] },
	studio: { columns: 4, buttons: [ "obs-record", "toggle", "marker", "obs-finish", "previous-section", "next-section", "keeper", "scrap", "head-guide", "head-guide-fullscreen", "sound-check", "on-air" ] },
	framing: { columns: 4, buttons: [ "head-guide", "guide-adjustments", "guide-eyes-lock", "guide-ideal-visible", "guide-match-ideal", "head-guide-fullscreen", "listening-toggle", "listening-restart", "session-check", "sound-check", "obs-record", "obs-finish" ] }
};
const known = new Set( CONTROL_ACTIONS.map( a => a.id ) );
export function normalisePadLayout( value ) {
	const ids = Array.isArray( value?.buttons ) ? [ ...new Set( value.buttons.filter( id => known.has( id ) ) ) ].slice( 0, 36 ) : [];
	return { columns: [ 2, 3, 4, 6 ].includes( value?.columns ) ? value.columns : 4, buttons: ids.length ? ids : [ ...DEFAULT_PAD_LAYOUT.buttons ], ...( value?.holdToFinish === false ? { holdToFinish: false } : {} ) };
}
export function controlAction( id, value ) {
	if ( id === "guide-adjust" ) return { action: "head-guide-adjust", value: guideValue( value ) };
	if ( !known.has( id ) ) return null;
	if ( id === "status" ) return { action: "toggle" };
	const guide = { "guide-adjustments": "adjust", "guide-eyes-lock": "eyes-lock", "guide-ideal-visible": "ideal-visible", "guide-match-ideal": "reset-pose" }[id];
	if ( guide ) return { action: "head-guide-control", value: guide };
	return id.startsWith( "slot-" ) ? { slot: Number( id.slice( 5 ) ) } : { action: id };
}
export function controlView( id, status = {} ) {
	const item = CONTROL_ACTIONS.find( a => a.id === ( id === "guide-adjust" ? "guide-adjustments" : id ) );
	if ( !item ) return null;
	const view = { ...item, active: false, hidden: false, disabled: !!status.editing, reason: "" };
	if ( id === "toggle" ) {
		view.label = status.scrolling ? "Pause" : "Start";
		view.icon = status.scrolling ? "Ⅱ" : "▶";
		view.active = !!status.scrolling;
	}
	const toggles = { "on-air": "onAir", "sound-check": "soundCheck", "eye-line": "eyeLine", "click-through": "clickThrough", control: "showControl", pad: "showPad", "head-guide": "showHeadGuide", "head-guide-fullscreen": "headGuideFullscreen" };
	if ( toggles[id] ) view.active = !!status[toggles[id]];
	if ( id === "status" ) view.label = status.progress || status.sectionTitle || "Section / time";
	if ( id === "listening-toggle" ) {
		view.active = !!status.listening;
		view.label = status.listeningControl?.suspended ? "Listening off" : status.listenerHealth?.state === "recovering" ? "Recovering…" : status.listenerHealth?.state === "failed" ? "Listening stopped" : status.listening ? "Listening on" : "Listening idle";
	}
	if ( id.startsWith( "listening-" ) ) {
		view.disabled ||= !status.listeningControl || ( id === "listening-restart" ? !status.listeningControl.canRestart : !status.listeningControl.suspended && !status.listeningControl.available );
		if ( view.disabled ) view.reason = "Check voice setup and your saved listening preference";
	}
	if ( id.startsWith( "guide-" ) ) {
		view.disabled ||= !status.showHeadGuide;
		if ( !status.showHeadGuide ) view.reason = "Show the head guide first";
		if ( id === "guide-eyes-lock" ) {
			view.active = !!status.headGuide?.eyesLocked;
			view.label = view.active ? "Eyes locked" : "Eyes unlocked";
		}
		if ( id === "guide-ideal-visible" ) {
			view.active = status.headGuide?.showIdeal !== false;
			view.label = view.active ? "Ideal visible" : "Ideal hidden";
		}
	}
	if ( id === "mirror" ) view.active = !!status.mirrored && status.mirrored !== "off";
	if ( id === "head-guide-fullscreen" ) view.active &&= !!status.showHeadGuide;
	if ( id === "scroll-mode" ) {
		view.active = status.scrollMode === "voice";
		view.label = view.active ? "Voice" : "Steady";
	}
	if ( id === "mirror-h" ) view.active = [ "horizontal", "both" ].includes( status.mirrored );
	if ( id === "mirror-v" ) view.active = [ "vertical", "both" ].includes( status.mirrored );
	if ( id.startsWith( "slot-" ) ) {
		const n = Number( id.slice( 5 ) );
		view.active = status.slot === n;
		view.disabled ||= !status.slots?.[n - 1]?.file;
		view.reason = !status.slots?.[n - 1]?.file ? "No script in this slot" : "";
	}
	if ( id.startsWith( "obs-" ) ) {
		const obs = status.obs;
		view.hidden = !obs?.enabled || !obs.controls;
		view.disabled = obs?.connection !== "connected" || !!obs.controlBusy || ![ "stopped", "recording", "paused" ].includes( obs?.recording ) || ( id === "obs-record" ? !!status.editing || !!status.scrolling || obs.recording === "paused" || obs.canRecord === false : obs.recording === "stopped" || obs.canFinish === false );
		view.reason = obs?.connection !== "connected" ? "Connect OBS first" : obs.controlBusy ? "Wait for OBS confirmation" : obs.recording === "paused" && id === "obs-record" ? "Resume the recording in OBS first" : view.disabled ? "Check OBS state; pause prompting and close the editor before Record take" : "";
	}
	const request = id === "guide-adjust" ? { action: "head-guide-adjust" } : controlAction( id );
	if ( Array.isArray( status.commands ) && request?.action && !status.commands.includes( request.action ) ) {
		view.disabled = true;
		view.reason = "Update Sightline to use this control";
	}
	return view;
}
