import { CONTROL_ACTIONS } from "./control-actions.js";

export const MAPPING_ACTIONS = CONTROL_ACTIONS.filter( item => item.id !== "status" );
const actions = new Set( [ "none", ...MAPPING_ACTIONS.map( item => item.id ) ] );
export const DEFAULT_MAPPINGS = [ [ 0, "toggle" ], [ 1, "marker" ], [ 2, "next-marker" ], [ 12, "faster" ], [ 13, "slower" ], [ 14, "previous-section" ], [ 15, "next-section" ] ]
	.map( ( [ button, action ] ) => ( { kind: "gamepad", device: "*", button, action } ) );

// Modified shortcuts belong to the native menus, OS and accessibility tools.
// Only plain keys and Shift combinations can be remapped in the prompter.
export function keyInput( event ) {
	if ( event.ctrlKey || event.metaKey || event.altKey || event.isComposing || [ "Escape", "Tab", "F1", "F11", "Shift", "Control", "Alt", "Meta" ].includes( event.key ) ) return null;
	const code = event.code;
	if ( !/^(Key[A-Z]|Digit[0-9]|F(?:[2-9]|1[0-2])|Arrow(?:Up|Down|Left|Right)|Space|Enter|PageUp|PageDown|Home|End|Insert|Delete|Backspace|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote|Numpad[0-9])$/.test( code ) ) return null;
	return { kind: "key", code, shift: !!event.shiftKey };
}
export function inputId( input ) {
	return input.kind === "key" ? `key:${ input.shift ? "Shift+" : "" }${ input.code }` : `gamepad:${ input.device }:${ input.button }`;
}
export function inputLabel( input ) {
	return input.kind === "key" ? `${ input.shift ? "Shift + " : "" }${ input.code.replace( /^Key|^Digit/, "" ) }` : `${ input.device === "*" ? "Any controller" : input.device } · button ${ input.button + 1 }`;
}
export function normaliseMappings( value ) {
	if ( value === null || value === undefined ) return DEFAULT_MAPPINGS.map( item => ( { ...item } ) );
	if ( !Array.isArray( value ) || value.length > 80 ) throw new Error( "Button mappings must be a list of up to 80 entries" );
	const seen = new Set();
	return value.map( ( row ) => {
		if ( !row || ( !actions.has( row.action ) && row.action !== "next-marker" ) ) throw new Error( "Choose a supported button action" );
		let input;
		if ( row.kind === "key" ) input = keyInput( { code: row.code, key: row.code, shiftKey: row.shift === true } );
		else if ( row.kind === "gamepad" && typeof row.device === "string" && row.device.length > 0 && row.device.length <= 240 && Number.isInteger( row.button ) && row.button >= 0 && row.button < 128 ) input = { kind: "gamepad", device: row.device, button: row.button };
		if ( !input || seen.has( inputId( input ) ) ) throw new Error( "Each button or key needs one unique mapping" );
		seen.add( inputId( input ) );
		return { ...input, action: row.action };
	} );
}
export function mappedAction( rows, input ) {
	const exact = rows.find( row => inputId( row ) === inputId( input ) );
	if ( exact ) return exact.action;
	if ( input.kind === "gamepad" ) return rows.find( row => row.kind === "gamepad" && row.device === "*" && row.button === input.button )?.action;
	return undefined;
}

// First observation (including reconnect) seeds state; a held button never fires.
export function createButtonEdges() {
	let previous = new Map();
	return ( pads ) => {
		const next = new Map();
		const pressed = [];
		for ( const pad of pads ) {
			if ( !pad ) continue;
			const device = pad.id.slice( 0, 240 );
			for ( let button = 0; button < Math.min( pad.buttons.length, 128 ); button++ ) {
				const id = `${ pad.index }:${ device }:${ button }`;
				const down = !!pad.buttons[button]?.pressed;
				if ( down && previous.get( id ) === false ) pressed.push( { kind: "gamepad", device, button } );
				next.set( id, down );
			}
		}
		previous = next;
		return pressed;
	};
}
