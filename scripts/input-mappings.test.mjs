import assert from "node:assert/strict";
import { DEFAULT_MAPPINGS, normaliseMappings, mappedAction, keyInput, createButtonEdges } from "../src/client/input-mappings.js";
import { settingsValues } from "../src/settings-values.js";
import { serialize, parse } from "../src/utils/settings-file.js";

assert.deepEqual( normaliseMappings(), DEFAULT_MAPPINGS );
assert.deepEqual( normaliseMappings( [] ), [] );
assert.equal( keyInput( { code: "F11", key: "F11" } ), null, "Native fullscreen keeps its shortcut" );
const key = keyInput( { code: "KeyJ", key: "j", shiftKey: true } );
const rows = [ ...normaliseMappings(), { ...key, action: "head-guide" }, { kind: "gamepad", device: "Pedal", button: 0, action: "next-section" } ];
assert.equal( mappedAction( rows, key ), "head-guide" );
assert.equal( mappedAction( rows, { ...key, shift: false } ), undefined );
assert.equal( mappedAction( rows, { kind: "gamepad", device: "Pedal", button: 0 } ), "next-section" );
assert.equal( mappedAction( rows, { kind: "gamepad", device: "Other", button: 0 } ), "toggle" );
assert.equal( mappedAction( [ ...rows, { kind: "gamepad", device: "Other", button: 0, action: "none" } ], { kind: "gamepad", device: "Other", button: 0 } ), "none" );
for ( const event of [ { code: "KeyJ", ctrlKey: true }, { code: "KeyJ", altKey: true }, { code: "KeyJ", metaKey: true }, { code: "Tab", key: "Tab" }, { code: "F1", key: "F1" }, { code: "KeyJ", isComposing: true } ] ) assert.equal( keyInput( event ), null );
for ( const invalid of [ {}, [ { ...key, action: "delete-everything" } ], [ rows[0], rows[0] ], [ { kind: "gamepad", device: "x", button: -1, action: "toggle" } ] ] ) assert.throws( () => normaliseMappings( invalid ) );
const edges = createButtonEdges();
const pad = down => [ { index: 0, id: "Pedal", buttons: [ { pressed: down } ] } ];
assert.deepEqual( edges( pad( true ) ), [], "Held on initial connection is ignored" );
edges( pad( false ) );
assert.equal( edges( pad( true ) ).length, 1 );
assert.equal( edges( pad( true ) ).length, 0, "Held button does not repeat" );
edges( [] );
assert.equal( edges( pad( true ) ).length, 0, "Reconnect while held does not fire" );
const defaults = { inputMappings: null };
for ( const format of [ "json", "xml" ] ) {
	const file = `settings.${ format }`;
	const parsed = parse( serialize( { inputMappings: rows }, file ), file );
	assert.deepEqual( settingsValues( parsed, defaults ).inputMappings, rows );
}
assert.throws( () => settingsValues( { inputMappings: "bad" }, defaults ), err => err.status === 400 );
console.log( "PASS: mappings, reserved keys, device overrides, held/reconnected buttons and JSON/XML round trips" );
