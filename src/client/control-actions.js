// One button vocabulary for the floating pad and phone. IDs match Stream Deck
// commands; slot buttons carry a fixed, validated slot number.
const groups = {
	Prompting: [ [ "toggle", "Play / pause", "▶" ], [ "restart", "Top", "↤" ], [ "previous-section", "Previous", "◀" ], [ "next-section", "Next", "▶" ], [ "faster", "Faster", "+" ], [ "slower", "Slower", "−" ], [ "scroll-mode", "Voice / steady", "🎙" ] ],
	Recording: [ [ "on-air", "On air", "●" ], [ "marker", "Marker", "⚑" ], [ "back-to-marker", "To marker", "↶" ], [ "keeper", "Keeper", "✓" ], [ "scrap", "Scrap", "×" ], [ "obs-record", "Record take", "●" ], [ "obs-finish", "Finish recording", "■" ], [ "sound-check", "Sound check", "▥" ] ],
	View: [ [ "bigger", "Bigger text", "A+" ], [ "smaller", "Smaller text", "A−" ], [ "mirror-h", "Mirror L/R", "↔" ], [ "mirror-v", "Mirror U/D", "↕" ], [ "layout", "Spacing", "↔" ], [ "reading", "Text / colour", "Aa" ], [ "recording", "Take display", "●" ], [ "eye-line", "Eye line", "◉" ], [ "click-through", "Click through", "↗" ], [ "control", "Control window", "▣" ], [ "pad", "Show / hide pad", "▦" ], [ "help", "Help", "?" ] ],
	Guide: [ [ "head-guide", "Head guide", "◎" ], [ "head-guide-fullscreen", "Guide fullscreen", "⛶" ] ],
	Scripts: Array.from( { length: 9 }, ( _, i ) => [ `slot-${ i + 1 }`, `Slot ${ i + 1 }`, String( i + 1 ) ] )
};
export const CONTROL_ACTIONS = Object.entries( groups ).flatMap( ( [ group, actions ] ) => actions.map( ( [ id, label, icon ] ) => ( { id, label, icon, group } ) ) );
CONTROL_ACTIONS.push( { id: "mirror", label: "Cycle mirror", icon: "↔", group: "View" }, { id: "status", label: "Section / time", icon: "▤", group: "Prompting" } );
export const DEFAULT_PAD_LAYOUT = { columns: 4, buttons: [ "restart", "previous-section", "toggle", "next-section" ] };
export const PAD_PRESETS = {
	compact: DEFAULT_PAD_LAYOUT,
	reading: { columns: 4, buttons: [ "restart", "previous-section", "toggle", "next-section", "slower", "faster", "marker", "back-to-marker" ] },
	studio: { columns: 4, buttons: [ "obs-record", "toggle", "marker", "obs-finish", "previous-section", "next-section", "keeper", "scrap", "head-guide", "head-guide-fullscreen", "sound-check", "on-air" ] }
};
const known = new Set( CONTROL_ACTIONS.map( a => a.id ) );
export function normalisePadLayout( value ) {
	const ids = Array.isArray( value?.buttons ) ? [ ...new Set( value.buttons.filter( id => known.has( id ) ) ) ].slice( 0, 36 ) : [];
	return { columns: [ 2, 3, 4, 6 ].includes( value?.columns ) ? value.columns : 4, buttons: ids.length ? ids : [ ...DEFAULT_PAD_LAYOUT.buttons ] };
}
export function controlAction( id ) {
	if ( !known.has( id ) ) return null;
	if ( id === "status" ) return { action: "toggle" };
	return id.startsWith( "slot-" ) ? { slot: Number( id.slice( 5 ) ) } : { action: id };
}
export function controlView( id, status = {} ) {
	const item = CONTROL_ACTIONS.find( a => a.id === id );
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
		view.disabled = obs?.connection !== "connected" || ( id === "obs-record" ? !!status.editing || !!status.scrolling : ![ "recording", "paused" ].includes( obs?.recording ) );
		view.reason = obs?.connection !== "connected" ? "Connect OBS first" : "";
	}
	return view;
}
