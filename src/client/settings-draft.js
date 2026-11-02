// Keep editing separate from committed preferences. A later service/status
// update can refresh the base without discarding the user's pending edits.
export function createSettingsDraft( initial ) {
	let base = structuredClone( initial ), edits = {};
	const equal = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
	const clean = () => {
		for ( const key of Object.keys( edits ) ) if ( equal( edits[key], base[key] ) ) delete edits[key];
	};
	return {
		stage( partial ) {
			Object.assign( edits, structuredClone( partial ) );
			clean();
		},
		rebase( partial ) {
			Object.assign( base, structuredClone( partial ) );
			clean();
		},
		get value() {
			return structuredClone( { ...base, ...edits } );
		},
		get patch() {
			return structuredClone( edits );
		},
		get dirty() {
			return Object.keys( edits ).length > 0;
		},
		commit( result = { ...base, ...edits } ) {
			base = structuredClone( result );
			edits = {};
			return structuredClone( base );
		},
		cancel() {
			edits = {};
			return structuredClone( base );
		}
	};
}
