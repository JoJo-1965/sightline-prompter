import assert from "node:assert/strict";
import { createSlotClearAction } from "../src/clear-slot.js";

let target = { index: 0, slot: { path: "acceptance.md" }, name: "acceptance.md" };
let response = 0;
let options;
let cleared = 0;
let leave = true;
let duringAsk = () => {};
const clear = createSlotClearAction( {
	current: () => target,
	ask: async ( value ) => {
		options = value;
		await duringAsk();
		return { response };
	},
	leave: async () => leave,
	clear: async () => {
		cleared++;
	}
} );
await clear();
assert.equal( cleared, 0, "Cancel must keep the script" );
assert.equal( options.defaultId, options.cancelId );
assert.equal( options.buttons[options.defaultId], "Cancel" );
assert.match( options.message, /slot 1/ );
assert.match( options.detail, /acceptance.md/ );
response = 1;
leave = false;
await clear();
assert.equal( cleared, 0, "unsaved edits can still cancel clearing" );
leave = true;
await clear();
assert.equal( cleared, 1 );
duringAsk = () => {
	target = { ...target, index: 1 };
};
await clear();
assert.equal( cleared, 1, "switching slots while confirming must cancel" );
duringAsk = () => {
	target = { ...target, slot: { path: "replacement.md" } };
};
await clear();
assert.equal( cleared, 1, "replacing a script while confirming must cancel" );
let release;
duringAsk = () => new Promise( ( resolve ) => {
	release = resolve;
} );
const pending = clear();
await clear();
release();
await pending;
assert.equal( cleared, 2, "repeated clicks must share one pending confirmation" );
target = { index: 0, slot: null };
await clear();
assert.equal( cleared, 2 );
console.log( "Clear-slot confirmation: cancel, confirm, unsaved edits, changed slots and repeated clicks passed." );
