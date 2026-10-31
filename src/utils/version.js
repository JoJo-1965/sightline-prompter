// Compare release and candidate versions, ignoring a leading v/build metadata.
// A final release is newer than its RC; rc.10 is newer than rc.2.
export function isNewer( latest, current ) {
	const parse = ( value ) => {
		const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z.-]+)?$/.exec( String( value ) );
		if ( !match ) return null;
		const core = match.slice( 1, 4 ).map( Number );
		if ( !core.every( Number.isSafeInteger ) ) return null;
		return { core, pre: match[4]?.split( "." ) ?? [] };
	};
	const a = parse( latest );
	const b = parse( current );
	if ( !a || !b ) return false;
	for ( let i = 0; i < 3; i++ ) {
		if ( a.core[i] !== b.core[i] ) return a.core[i] > b.core[i];
	}
	if ( !a.pre.length || !b.pre.length ) return !a.pre.length && !!b.pre.length;
	for ( let i = 0; i < Math.max( a.pre.length, b.pre.length ); i++ ) {
		const x = a.pre[i];
		const y = b.pre[i];
		if ( x === undefined || y === undefined ) return y === undefined;
		if ( x === y ) continue;
		const nx = /^\d+$/.test( x );
		const ny = /^\d+$/.test( y );
		if ( nx && ny ) return BigInt( x ) > BigInt( y );
		if ( nx !== ny ) return !nx;
		return x > y;
	}
	return false;
}
