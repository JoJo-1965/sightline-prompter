// Recording-script decoration, applied to the rendered script in the DOM so it
// works the same for markdown, plain text, rich text and Word files:
//   - "=== SECTION 1" paragraphs (rich files) become H2 sections
//   - jump anchors: 0 at the top, then one per H2, for the arrow keys / clicker
//   - [stage directions] are wrapped so they can be dimmed or hidden; any
//     "quoted words" inside them stay bright, because those are spoken
//   - slide-cue phrases from cues.yaml are highlighted in script order

const QUOTE_REGEX = /("[^"]+"|“[^”]+”)/;

function textNodes( root, skipSelector ) {
	const nodes = [];
	const walker = document.createTreeWalker( root, NodeFilter.SHOW_TEXT, {
		acceptNode: n =>
			skipSelector && n.parentElement?.closest( skipSelector )
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT
	} );
	let node;
	while ( ( node = walker.nextNode() ) ) nodes.push( node );
	return nodes;
}

function promoteSectionParagraphs( root ) {
	for ( const p of root.querySelectorAll( "p" ) ) {
		const match = /^\s*={3,}\s*(\S.*?)\s*=*\s*$/.exec( p.textContent );
		if ( match ) {
			const h2 = document.createElement( "h2" );
			h2.textContent = match[1];
			p.replaceWith( h2 );
		}
	}
}

function numberSections( root ) {
	for ( const a of root.querySelectorAll( "a[name]" ) ) a.remove();
	const top = document.createElement( "a" );
	top.name = "0";
	root.prepend( top );
	root.querySelectorAll( "h2" ).forEach( ( h2, i ) => {
		const a = document.createElement( "a" );
		a.name = String( i + 1 );
		h2.before( a );
	} );
}

function buildDirection( text ) {
	const span = document.createElement( "span" );
	span.className = "direction";
	for ( const part of text.split( QUOTE_REGEX ) ) {
		if ( !part ) continue;
		const el = document.createElement(
			QUOTE_REGEX.test( part ) ? "strong" : "span"
		);
		if ( el.tagName === "STRONG" ) {
			el.className = "say";
			el.textContent = part.slice( 1, -1 );
		} else {
			el.className = "dir-text";
			el.textContent = part;
		}
		span.append( el );
	}
	return span;
}

// --- App directives ---
// {curly braces} are instructions to the app (see docs/SCRIPT-DIRECTIVES.md).
// They're wrapped so they can be hidden while reading, or shown as small tags
// for checking a script. Unknown names are marked so typos stand out.

const KNOWN_DIRECTIVES = new Set( [
	"pacing",
	"wpm",
	"target",
	"pause",
	"marker",
	"mode"
] );
const DIRECTIVE_REGEX = /(?<!\\)\{[^{}\n]*\}/g;

function directiveIsKnown( text ) {
	return text
		.slice( 1, -1 )
		.split( "," )
		.every( ( part ) => {
			const name = part.split( ":" )[0].trim().toLowerCase();
			return KNOWN_DIRECTIVES.has( name );
		} );
}

function wrapAppDirectives( root ) {
	for ( const node of textNodes( root, "code, pre, .app-directive" ) ) {
		const text = node.nodeValue;
		DIRECTIVE_REGEX.lastIndex = 0;
		if ( !DIRECTIVE_REGEX.test( text ) ) continue;
		DIRECTIVE_REGEX.lastIndex = 0;
		const frag = document.createDocumentFragment();
		let last = 0;
		let match;
		while ( ( match = DIRECTIVE_REGEX.exec( text ) ) !== null ) {
			if ( match.index > last ) frag.append( text.slice( last, match.index ) );
			const span = document.createElement( "span" );
			span.className = "app-directive";
			if ( !directiveIsKnown( match[0] ) ) span.classList.add( "unknown" );
			span.textContent = match[0];
			frag.append( span );
			last = match.index + match[0].length;
			// A directive at the start of a line shouldn't leave a space before
			// the first spoken word.
			const before = text.slice( 0, match.index );
			if ( !before.trim() && !node.previousSibling && text[last] === " " ) last++;
		}
		if ( last < text.length ) frag.append( text.slice( last ) );
		node.replaceWith( frag );
	}
	// Escaped braces show as plain braces.
	for ( const node of textNodes( root, ".app-directive" ) ) {
		const text = node.nodeValue;
		if ( /\\[{}]|[\uE000\uE001]/.test( text ) ) {
			node.nodeValue = text
				.replace( /\\([{}])/g, "$1" )
				.replace( /\uE000/g, "{" )
				.replace( /\uE001/g, "}" );
		}
	}
	// A paragraph holding only directives takes no space while reading.
	for ( const el of root.querySelectorAll( "p, li" ) ) {
		const directives = el.querySelectorAll( ".app-directive" );
		if ( !directives.length ) continue;
		let rest = el.textContent;
		for ( const d of directives ) rest = rest.replace( d.textContent, "" );
		if ( !rest.trim() ) el.classList.add( "directive-line" );
	}
}

function wrapDirections( root ) {
	// A direction can wrap onto the next line of the script file.
	const regex = /\[[^[\]]+\]/g;
	for ( const node of textNodes( root, "code, pre, .direction, .app-directive" ) ) {
		const text = node.nodeValue;
		if ( !regex.test( text ) ) continue;
		regex.lastIndex = 0;
		const frag = document.createDocumentFragment();
		let last = 0;
		let match;
		while ( ( match = regex.exec( text ) ) !== null ) {
			if ( match.index > last ) frag.append( text.slice( last, match.index ) );
			frag.append( buildDirection( match[0] ) );
			last = match.index + match[0].length;
		}
		if ( last < text.length ) frag.append( text.slice( last ) );
		node.replaceWith( frag );
	}
	// Paragraphs that are only a direction can be hidden whole.
	for ( const p of root.querySelectorAll( "p" ) ) {
		const directions = p.querySelectorAll( ".direction" );
		if ( !directions.length ) continue;
		let rest = p.textContent;
		for ( const d of directions ) rest = rest.replace( d.textContent, "" );
		if ( !rest.trim() ) {
			p.classList.add( "direction-line" );
			if ( p.querySelector( ".say" ) ) p.classList.add( "has-say" );
		}
	}
}

// --- Cue highlighting ---

function normalizeChar( ch ) {
	if ( ch === "‘" || ch === "’" ) return "'";
	if ( ch === "“" || ch === "”" ) return "\"";
	return ch.toLowerCase();
}

// Flatten the script text (whitespace collapsed, quotes straightened) with a
// map from each flat character back to its text node and offset.
function flatten( root ) {
	let flat = "";
	const map = [];
	let lastWasSpace = true;
	let lastBlock = null;
	for ( const node of textNodes( root, ".direction, .app-directive" ) ) {
		const text = node.nodeValue;
		// Separate paragraphs and headings, so a phrase never runs across them.
		const block = node.parentElement?.closest(
			"p, li, h1, h2, h3, h4, h5, h6, div"
		);
		if ( block !== lastBlock && !lastWasSpace ) {
			flat += " ";
			map.push( { node, offset: 0 } );
			lastWasSpace = true;
		}
		lastBlock = block;
		for ( let i = 0; i < text.length; i++ ) {
			if ( /\s/.test( text[i] ) ) {
				if ( lastWasSpace ) continue;
				flat += " ";
				lastWasSpace = true;
			} else {
				flat += normalizeChar( text[i] );
				lastWasSpace = false;
			}
			map.push( { node, offset: i } );
		}
	}
	return { flat, map };
}

function normalizePhrase( phrase ) {
	return [ ...phrase.trim().replace( /\s+/g, " " ) ].map( normalizeChar ).join( "" );
}

function wrapRange( map, start, end ) {
	// Group the matched characters by text node, then wrap each slice.
	const slices = [];
	for ( let i = start; i < end; i++ ) {
		const { node, offset } = map[i];
		const slice = slices[slices.length - 1];
		if ( slice && slice.node === node ) {
			slice.end = offset + 1;
		} else {
			slices.push( { node, start: offset, end: offset + 1 } );
		}
	}
	for ( const { node, start: s, end: e } of slices.reverse() ) {
		node.splitText( e );
		const middle = node.splitText( s );
		const mark = document.createElement( "mark" );
		mark.className = "cue";
		middle.replaceWith( mark );
		mark.append( middle );
	}
}

function highlightCues( root, phrases ) {
	let from = 0;
	for ( const phrase of phrases ) {
		const needle = normalizePhrase( phrase );
		if ( !needle ) continue;
		const { flat, map } = flatten( root );
		let index = flat.indexOf( needle, from );
		// Only whole words: don't match "to" inside "towards", or "so" inside "also".
		const isWordChar = i => /\w/.test( flat[i] ?? "" );
		while (
			index !== -1
			&& ( isWordChar( index + needle.length ) || isWordChar( index - 1 ) )
		) {
			index = flat.indexOf( needle, index + 1 );
		}
		if ( index === -1 ) {
			console.warn( "[cues] not found in script:", phrase );
			continue;
		}
		wrapRange( map, index, index + needle.length );
		from = index + needle.length;
	}
}

export function decorateScript(
	root,
	{ cuePhrases = [], highlight = true } = {}
) {
	promoteSectionParagraphs( root );
	wrapAppDirectives( root );
	numberSections( root );
	wrapDirections( root );
	if ( highlight && cuePhrases.length ) {
		highlightCues( root, cuePhrases );
	}
}
