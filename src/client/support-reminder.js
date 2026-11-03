const LAUNCHES = "sightline.launches";
const NEXT = "sightline.supportNextLaunch";

const count = storage => {
	const value = Number( storage.getItem( LAUNCHES ) );
	return Number.isSafeInteger( value ) && value >= 0 && value < Number.MAX_SAFE_INTEGER - 15 ? value : 0;
};
const interval = random => 10 + Math.floor( random() * 6 );

// Keep the existing launch counter. Profiles without a schedule (including
// those already shown the old one-time note) begin a fresh 10–15 launch wait.
export function recordSupportLaunch( storage, random = Math.random ) {
	try {
		const previous = count( storage );
		let next = Number( storage.getItem( NEXT ) );
		if ( !Number.isSafeInteger( next ) || next <= 0 ) {
			next = previous + interval( random );
			storage.setItem( NEXT, String( next ) );
		}
		storage.setItem( LAUNCHES, String( previous + 1 ) );
		return previous + 1 >= next;
	} catch {
		return false;
	}
}

// Only displaying the note starts another interval. A busy launch leaves it
// due for a later launch, rather than silently consuming the reminder.
export function recordSupportShown( storage, random = Math.random ) {
	storage.setItem( NEXT, String( count( storage ) + interval( random ) ) );
	storage.setItem( "sightline.supportAsked", new Date().toISOString() );
}
