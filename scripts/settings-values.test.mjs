import assert from "node:assert/strict";
import { settingsValues } from "../src/settings-values.js";
import { serialize, parse } from "../src/utils/settings-file.js";
import { PAD_PRESETS } from "../src/client/control-actions.js";
const defaults = { padLayout: null, remoteControl: false, traceCommands: false, steadyWpm: 145, lineHeight: 1.3, headingLineHeight: 1.3, directionLineHeight: 1.3, directionScale: 1, directionColour: "", productionNoteLineHeight: 1.4, productionNoteScale: 1, productionNoteColour: "" };
const protectedKeys = [ "remoteControl", "traceCommands", "captureOverride" ];
for ( const ext of [ "json", "xml" ] ) {
	const values = { padLayout: PAD_PRESETS.studio, remoteControl: true, traceCommands: true, captureOverride: true, unknown: "ignored", steadyWpm: 160 };
	const loaded = settingsValues( parse( serialize( values, `settings.${ ext }` ), `settings.${ ext }` ), defaults, protectedKeys );
	assert.deepEqual( loaded, { padLayout: PAD_PRESETS.studio, steadyWpm: 160 } );
	const words = { wordFixes: [ { word: "Joanne & co", heard: [ "joe <ann>", "\"Jo\"" ] } ] };
	assert.deepEqual( parse( serialize( words, `settings.${ ext }` ), `settings.${ ext }` ), words );
	const spacing = { lineHeight: 2.1, headingLineHeight: 1.1, directionLineHeight: 1 };
	assert.deepEqual( settingsValues( parse( serialize( spacing, `settings.${ ext }` ), `settings.${ ext }` ), defaults ), spacing );
	const notes = { directionScale: 0.8, directionColour: "#ffd54a", directionLineHeight: 1.1, productionNoteScale: 1.5, productionNoteColour: "#aaddff", productionNoteLineHeight: 2.2 };
	assert.deepEqual( settingsValues( parse( serialize( notes, `settings.${ ext }` ), `settings.${ ext }` ), defaults ), notes );
	assert.deepEqual( settingsValues( { productionNoteColour: "" }, defaults ), { productionNoteColour: "" } );
}
for ( const value of [ 0, 2.1, -1 ] ) assert.throws( () => settingsValues( { productionNoteScale: value }, defaults ), /productionNoteScale/ );
for ( const value of [ 0, 2.6 ] ) assert.throws( () => settingsValues( { productionNoteLineHeight: value }, defaults ), /productionNoteLineHeight/ );
assert.throws( () => settingsValues( { productionNoteColour: "red" }, defaults ), /hex colour/ );
assert.deepEqual( settingsValues( { padLayout: null }, defaults ), { padLayout: null } );
assert.deepEqual( settingsValues( { padLayout: { columns: 2, buttons: [ "toggle", "invalid", "toggle", "slot-3" ] } }, defaults ).padLayout, { columns: 2, buttons: [ "toggle", "slot-3" ] } );
for ( const value of [ "layout", [], { buttons: "toggle" }, { columns: 7, buttons: [ "toggle" ] } ] ) assert.throws( () => settingsValues( { padLayout: value }, defaults ), /padLayout/ );
assert.throws( () => settingsValues( null, defaults ), /object/ );
assert.throws( () => parse( "<teleprompterSettings><setting name=\"padLayout\" type=\"json\">{broken}</setting></teleprompterSettings>", "settings.xml" ) );
console.log( "Settings API/import validation, protected keys, JSON/XML structured round trips, escaping and malformed input passed." );
