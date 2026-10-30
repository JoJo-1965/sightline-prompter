import assert from "node:assert/strict";
import { settingsValues } from "../src/settings-values.js";
import { serialize, parse } from "../src/utils/settings-file.js";
import { PAD_PRESETS } from "../src/client/control-actions.js";
const defaults = { padLayout: null, remoteControl: false, traceCommands: false, steadyWpm: 145 };
const protectedKeys = [ "remoteControl", "traceCommands", "captureOverride" ];
for ( const ext of [ "json", "xml" ] ) {
	const values = { padLayout: PAD_PRESETS.studio, remoteControl: true, traceCommands: true, captureOverride: true, unknown: "ignored", steadyWpm: 160 };
	const loaded = settingsValues( parse( serialize( values, `settings.${ ext }` ), `settings.${ ext }` ), defaults, protectedKeys );
	assert.deepEqual( loaded, { padLayout: PAD_PRESETS.studio, steadyWpm: 160 } );
	const words = { wordFixes: [ { word: "Joanne & co", heard: [ "joe <ann>", "\"Jo\"" ] } ] };
	assert.deepEqual( parse( serialize( words, `settings.${ ext }` ), `settings.${ ext }` ), words );
}
assert.deepEqual( settingsValues( { padLayout: null }, defaults ), { padLayout: null } );
assert.deepEqual( settingsValues( { padLayout: { columns: 2, buttons: [ "toggle", "invalid", "toggle", "slot-3" ] } }, defaults ).padLayout, { columns: 2, buttons: [ "toggle", "slot-3" ] } );
for ( const value of [ "layout", [], { buttons: "toggle" }, { columns: 7, buttons: [ "toggle" ] } ] ) assert.throws( () => settingsValues( { padLayout: value }, defaults ), /padLayout/ );
assert.throws( () => settingsValues( null, defaults ), /object/ );
assert.throws( () => parse( "<teleprompterSettings><setting name=\"padLayout\" type=\"json\">{broken}</setting></teleprompterSettings>", "settings.xml" ) );
console.log( "Settings API/import validation, protected keys, JSON/XML structured round trips, escaping and malformed input passed." );
