// A single source-range replacement, preserving the rest of the file verbatim.
export function applyQuickEdit( source, patch ) {
	if ( !patch || !Number.isInteger( patch.from ) || !Number.isInteger( patch.to ) || patch.from < 0 || patch.to <= patch.from || patch.to > source.length ) throw new Error( "That paragraph is no longer available. Cancel and reopen it." );
	if ( typeof patch.before !== "string" || source.slice( patch.from, patch.to ) !== patch.before ) throw new Error( "The paragraph changed. Cancel and reopen it before saving." );
	if ( typeof patch.after !== "string" || patch.after.length > 100000 ) throw new Error( "Use the full editor for changes larger than one paragraph." );
	const eol = source.includes( "\r\n" ) ? "\r\n" : "\n";
	const replacement = patch.after.replace( /\r\n|\r|\n/g, eol );
	return source.slice( 0, patch.from ) + replacement + source.slice( patch.to );
}
