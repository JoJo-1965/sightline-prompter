import assert from "node:assert/strict";
import { hudHeadGeometry, hudTarget, hudCuePosition } from "../src/client/hud-cues.js";
const view = { width: 1000, height: 562.5, screenX: 0, screenY: 0 };
for ( const mirrored of [ "off", "horizontal", "vertical", "both" ] ) {
	const geometry = hudHeadGeometry( view, { pose: { x: 8, y: 3, left: 1.2, right: .8 }, bounds: { x: 0, y: 0, width: 1000, height: 562.5 } }, mirrored );
	const l = hudTarget( "left", { ...view, mirrored }, geometry, 64 );
	const r = hudTarget( "right", { ...view, mirrored }, geometry, 64 );
	const targets = [ l, r ].sort( ( a, b ) => a.x - b.x );
	assert.equal( targets[0].x, geometry.left / 2 );
	assert.equal( targets[1].x, ( geometry.right + view.width ) / 2 );
	assert.equal( l.y, r.y ); assert.ok( l.y > geometry.eyes );
}
const saved = { pose: { x: 30 }, reference: { pose: { x: -4 }, bounds: { x: 0, y: 0, width: 1000, height: 562.5 } } };
assert.equal( hudHeadGeometry( view, saved ).reference, "saved" );
assert.equal( hudHeadGeometry( view, saved ).left, hudHeadGeometry( view, { pose: { x: -4 } } ).left );
const otherScreen = hudHeadGeometry( view, { bounds: { x: 2000, y: 0, width: 1000, height: 562.5 } } );
assert.equal( otherScreen.available, false ); assert.equal( hudTarget( "left", view, otherScreen, 64 ), null );
console.log( "HUD geometry: head-edge gap midpoints, shared below-eye height, saved reference, mirrors and separate-screen guard pass" );

for ( const [ width, height, h ] of [ [ 1920, 1080, 72 ], [ 1024, 600, 72 ], [ 768, 450, 38 ], [ 560, 500, 38 ] ] ) {
 const line = height * .33, size = { width: Math.min( 240, width - 24 ), height: h };
 const obstacles = [ { left: 0, right: width, top: 0, bottom: width < 900 ? 76 : 40 }, { left: width - 170, right: width - 12, top: 82, bottom: 114 } ];
 const pos = hudCuePosition( { width, height }, size, line, obstacles );
 assert.ok( pos.y + h <= line - 4, "The cue stays above the active reading line" );
 assert.ok( pos.x >= 12 && pos.x + size.width <= width - 12, "The cue stays inside the window" );
 assert.ok( obstacles.every( r => pos.x + size.width <= r.left || pos.x >= r.right || pos.y + h <= r.top || pos.y >= r.bottom ), "Cue avoids toolbar/session controls when space is available" );
}
console.log( "HUD cue position: above the reading line, compact sizing and control clearance pass" );
