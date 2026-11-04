// HTML comments are production notes, never spoken words or app commands.
export function decorateProductionNotes( root ) {
	const walker = document.createTreeWalker( root, NodeFilter.SHOW_COMMENT );
	const comments = [];
	while ( walker.nextNode() ) comments.push( walker.currentNode );
	for ( const comment of comments ) {
		if ( !comment.textContent.trim() || comment.parentElement?.closest( "code, pre" ) ) continue;
		const note = document.createElement( "span" );
		note.className = "production-note dir-text";
		note.textContent = comment.textContent.trim();
		note.setAttribute( "aria-label", "Production note" );
		comment.replaceWith( note );
		const paragraph = note.closest( "p" );
		if ( paragraph && [ ...paragraph.childNodes ].every( node => node.nodeType === Node.TEXT_NODE ? !node.textContent.trim() : node.classList?.contains( "production-note" ) ) ) paragraph.classList.add( "production-only" );
	}
}

export function setProductionNotesActive( root, active, { alignFirst = false, readingAnchor = 0.33 } = {} ) {
	const changed = root.classList.contains( "take-reading" ) !== active;
	if ( !changed && !alignFirst ) return false;
	const walker = document.createTreeWalker( root, NodeFilter.SHOW_TEXT, {
		acceptNode: node => node.nodeValue.trim() && !node.parentElement?.closest( ".dir-text, .app-directive, h1, h2, h3, h4, h5, h6, code, pre" ) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
	} );
	const candidates = [];
	while ( walker.nextNode() ) {
		const range = document.createRange();
		range.selectNodeContents( walker.currentNode );
		if ( range.getClientRects().length ) candidates.push( range );
	}
	const line = window.innerHeight * readingAnchor;
	alignFirst ||= active && candidates[0]?.getBoundingClientRect().top >= window.innerHeight;
	const target = alignFirst ? candidates[0] : candidates.find( range => range.getBoundingClientRect().bottom >= line ) ?? candidates.at( -1 );
	const before = target?.getBoundingClientRect().top;
	root.classList.toggle( "take-reading", active );
	if ( target ) {
		const after = target.getBoundingClientRect().top;
		window.scrollBy( 0, after - ( alignFirst ? line : before ) );
	}
	return changed;
}
