import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { captureOverride, protectWindow, setCaptureOverride, trackCaptureWindow } from "../src/capture-policy.js";
function window( normal ) {
	const win = new EventEmitter();
	win.protected = normal;
	win.isDestroyed = () => false;
	win.isContentProtected = () => win.protected;
	win.setContentProtection = ( value ) => {
		win.protected = value;
	};
	win.webContents = new EventEmitter();
	win.webContents.isDestroyed = () => false;
	win.messages = [];
	win.webContents.send = ( channel, value ) => win.messages.push( { channel, value } );
	return win;
}
assert.equal( captureOverride(), false );
const guide = window( true ), normal = window( false );
protectWindow( guide, true );
protectWindow( normal, false );
setCaptureOverride( true );
assert.equal( guide.protected, false );
assert.equal( normal.protected, false );
protectWindow( normal, true );
assert.equal( normal.protected, false, "Saved policy changes cannot defeat the active override" );
const added = window( true );
trackCaptureWindow( added );
assert.equal( added.protected, false, "New windows follow the active override" );
added.webContents.emit( "did-finish-load" );
assert.deepEqual( added.messages.at( -1 ), { channel: "captureOverride", value: true } );
setCaptureOverride( false );
assert.equal( guide.protected, true );
assert.equal( normal.protected, true, "Restore the current normal preference" );
assert.equal( added.protected, true );
normal.emit( "closed" );
normal.setContentProtection = () => {
	throw new Error( "Closed windows must be forgotten" );
};
setCaptureOverride( true );
setCaptureOverride( false );
assert.equal( captureOverride(), false );
console.log( "Capture override: default off, existing/new windows, live policy changes, restore, notifications and close cleanup passed." );
