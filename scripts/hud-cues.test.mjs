import assert from "node:assert/strict";
import { hudHeadGeometry, hudTarget } from "../src/client/hud-cues.js";
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
