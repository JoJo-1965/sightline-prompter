// Is version `latest` newer than `current`? "1.0.10" > "1.0.9"; a leading
// "v" and anything after a "-" are ignored.
export function isNewer( latest, current ) {
	const parts = v => String( v ).replace( /^v/, "" ).split( "-" )[0].split( "." ).map( n => Number( n ) || 0 );
	const a = parts( latest );
	const b = parts( current );
	for ( let i = 0; i < 3; i++ ) {
		if ( ( a[i] ?? 0 ) !== ( b[i] ?? 0 ) ) return ( a[i] ?? 0 ) > ( b[i] ?? 0 );
	}
	return false;
}
