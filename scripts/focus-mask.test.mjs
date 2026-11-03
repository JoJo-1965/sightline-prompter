import assert from "node:assert/strict";
import { annotationRect, annotationMask } from "../src/client/focus-mask.js";

const root = { left: 100, top: -200, right: 900, bottom: 1800, width: 800, height: 2000 };
const comment = { left: 140, top: 200, right: 240, bottom: 220, width: 100, height: 20 };
assert.deepEqual( annotationRect( comment, root, 200, 600 ), { x: 39, y: 199, width: 102, height: 22 }, "Comment geometry follows the viewport mask without changing layout" );
assert.deepEqual( annotationRect( comment, root, 200, 600, true ), { x: 659, y: 199, width: 102, height: 22 }, "Left-right mirroring restores the correct annotation region" );
assert.equal( annotationRect( comment, root, 200, 600, false, true ), null, "Regions outside the vertical mask are clipped" );
assert.equal( annotationRect( { ...comment, top: 900, bottom: 920 }, root, 200, 600 ), null );
const element = { getClientRects: () => [ comment ] };
const image = annotationMask( { getBoundingClientRect: () => root, querySelectorAll: selector => {
	assert.equal( selector, ".production-note, .direction" );
	return [ element ];
} }, { offset: 200, height: 600 } );
assert.match( decodeURIComponent( image ), /<rect x="39.00" y="199.00" width="102.00" height="22.00"/ );
assert.equal( annotationMask( { getBoundingClientRect: () => root, querySelectorAll: () => [] }, { offset: 200, height: 600 } ), null, "Scripts without visible annotations keep the ordinary focus mask" );
console.log( "PASS: annotation-only focus exemptions, viewport clipping and mirroring" );
