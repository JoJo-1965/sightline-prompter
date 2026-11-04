import assert from "node:assert/strict";
import { roundControlNumber, steppedControlNumber } from "../src/client/numeric-controls.js";

for ( const value of [ 1.23456789, -3.8020833333, 99.999999999, 0.30000000000000004, -0.000001 ] ) {
	const shown = String( roundControlNumber( value ) );
	assert.ok( !shown.includes( "." ) || shown.split( "." )[1].length <= 2 );
}
assert.equal( roundControlNumber( -3.8020833333 ), -3.8 );
assert.equal( roundControlNumber( 2 ), 2 );
const percent = { min: 10, max: 400, step: 5 };
assert.equal( steppedControlNumber( 173.333333333, percent ), 175 );
assert.equal( steppedControlNumber( 76.789, percent ), 75 );
assert.equal( steppedControlNumber( -5, percent ), 10 );
assert.equal( steppedControlNumber( 999, percent ), 400 );
assert.equal( steppedControlNumber( 129.999999999, { min: 100, max: 250, step: 5 } ), 130 );
assert.equal( steppedControlNumber( 22.83, { min: 0, max: 100, step: 1 } ), 23 );
assert.equal( steppedControlNumber( 0.27666, { min: 0, max: 1, step: 0.01 } ), 0.28 );
assert.ok( Number.isNaN( steppedControlNumber( NaN ) ) );
console.log( "PASS: bounded numeric display, whole/five-point steps, endpoints and floating-point drift" );
