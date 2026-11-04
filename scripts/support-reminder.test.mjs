import assert from "node:assert/strict";
import { recordSupportLaunch, recordSupportShown } from "../src/client/support-reminder.js";

function profile( values = {} ) {
	const data = new Map( Object.entries( values ) );
	return { getItem: key => data.get( key ) ?? null, setItem: ( key, value ) => data.set( key, value ) };
}

// Each chosen interval survives new launches; it is not rerolled until shown.
for ( const [ random, expected ] of [ [ 0, 10 ], [ .5, 13 ], [ .999, 15 ] ] ) {
	const storage = profile();
	for ( let cycle = 0; cycle < 3; cycle++ ) {
		for ( let launch = 1; launch <= expected; launch++ ) assert.equal( recordSupportLaunch( storage, () => random ), launch === expected );
		recordSupportShown( storage, () => random );
	}
}
const migrated = profile( { "sightline.launches": "42", "sightline.supportAsked": "2026-10-31T10:00:00.000Z" } );
for ( let launch = 1; launch <= 15; launch++ ) assert.equal( recordSupportLaunch( migrated, () => .999 ), launch === 15, "The old one-time flag no longer suppresses reminders" );
assert.equal( recordSupportLaunch( migrated ), true, "A busy due launch leaves the reminder due" );
recordSupportShown( migrated, () => 0 );
assert.equal( recordSupportLaunch( migrated ), false, "Displaying it begins a new wait" );
assert.ok( Date.parse( migrated.getItem( "sightline.supportAsked" ) ) );
const broken = profile( { "sightline.launches": "NaN", "sightline.supportNextLaunch": "bad" } );
assert.equal( recordSupportLaunch( broken, () => 0 ), false );
assert.equal( broken.getItem( "sightline.launches" ), "1" );
assert.equal( broken.getItem( "sightline.supportNextLaunch" ), "10" );
assert.equal( recordSupportLaunch( { getItem() { throw new Error( "Unavailable storage" ); } } ), false, "Unavailable storage never blocks startup" );
console.log( "PASS: persistent 10–15 launch intervals, repeat reminders, legacy profiles and busy deferral" );
