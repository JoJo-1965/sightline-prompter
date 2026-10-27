// Checks for src/utils/fit.js: windows stay on screen with the control bar reachable.
import assert from "node:assert/strict";
import { fitInside, keepTopReachable, sameRect } from "../src/utils/fit.js";

const area = { x: 0, y: 0, width: 1920, height: 1040 };

// Bigger than the screen: shrunk to fit and moved inside.
assert.deepEqual( fitInside( { x: -50, y: -30, width: 2400, height: 1300 }, area ), { x: 0, y: 0, width: 1920, height: 1040 } );
// Hanging off the bottom right: moved back in, size kept.
assert.deepEqual( fitInside( { x: 1500, y: 900, width: 800, height: 600 }, area ), { x: 1120, y: 440, width: 800, height: 600 } );
// Already inside: unchanged.
const inside = { x: 100, y: 100, width: 800, height: 600 };
assert.ok( sameRect( fitInside( inside, area ), inside ) );
// A second monitor to the left (negative x).
const left = { x: -1920, y: 0, width: 1920, height: 1040 };
assert.deepEqual( fitInside( { x: -2100, y: 50, width: 800, height: 600 }, left ), { x: -1920, y: 50, width: 800, height: 600 } );

// After a drag: the top edge comes back on screen...
assert.equal( keepTopReachable( { x: 100, y: -200, width: 800, height: 600 }, area ).y, 0 );
// ...a window hanging off the side may stay there, with part of the bar showing...
assert.equal( keepTopReachable( { x: -500, y: 100, width: 800, height: 600 }, area ).x, -500 );
// ...but not so far that the bar can't be grabbed.
assert.equal( keepTopReachable( { x: -790, y: 100, width: 800, height: 600 }, area ).x, -640 );
assert.equal( keepTopReachable( { x: 1900, y: 100, width: 800, height: 600 }, area ).x, 1760 );
// Dragged too low: the bar stays above the taskbar.
assert.equal( keepTopReachable( { x: 100, y: 1030, width: 800, height: 600 }, area ).y, 980 );

console.log( "fit tests passed" );
