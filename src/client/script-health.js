// Editorial prompts, not a readability score or a pronunciation judgement.
const tokens = text => String( text ).split( /\s+/ ).map( word => word.toLowerCase().replace( /[^\p{L}\p{N}'’]/gu, "" ) ).filter( word => /[\p{L}\p{N}]/u.test( word ) );
const small = new Set( [ "a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "with" ] );
const segmenter = new Intl.Segmenter( "en", { granularity: "sentence" } );

// Sections contain spoken body blocks only; the renderer supplies the same
// decorated script used for prompting, leaving out directions and headings.
export function scriptHealth( sections, defaultWpm = 145 ) {
	const base = Number.isFinite( defaultWpm ) ? Math.min( 300, Math.max( 60, defaultWpm ) ) : 145;
	const reviewed = sections.map( ( section ) => {
		const wpm = section.wpm ?? base;
		let count = 0;
		const findings = [];
		for ( const block of section.blocks ?? [] ) {
			for ( const { segment } of segmenter.segment( block ) ) {
				const text = segment.trim();
				const words = tokens( text );
				count += words.length;
				if ( words.length >= 30 ) findings.push( { kind: "long", text, words: words.length, message: `${ words.length } words: consider a shorter sentence or a breath break.` } );
				const content = words.filter( word => word.length >= 3 && !small.has( word ) );
				const repeated = content.some( ( word, index ) => {
					const window = content.slice( index, index + 5 );
					const alike = window.filter( item => item[0] === word[0] );
					return alike.length >= 4 && new Set( alike ).size >= 3;
				} );
				if ( repeated ) findings.push( { kind: "word-starts", text, words: words.length, message: "Several similar word starts: try this sentence aloud." } );
			}
		}
		return { ...section, words: count, wpm, readingSeconds: Math.round( count * 60 / wpm ), findings };
	} );
	return { sections: reviewed, words: reviewed.reduce( ( sum, section ) => sum + section.words, 0 ), readingSeconds: reviewed.reduce( ( sum, section ) => sum + section.readingSeconds, 0 ), findings: reviewed.reduce( ( sum, section ) => sum + section.findings.length, 0 ) };
}

export function fillCounts( words ) {
	const counts = {};
	for ( const word of tokens( words.join( " " ) ) ) {
		if ( /^(um+|uh+|erm+|er+)$/.test( word ) ) counts[word] = ( counts[word] ?? 0 ) + 1;
	}
	return counts;
}

export function sectionLine( source, section ) {
	if ( section <= 0 ) return 1;
	const lines = source.split( /\r?\n/ );
	let front = lines[0]?.replace( /^\uFEFF/, "" ).trim() === "---";
	let fence = null;
	let count = 0;
	for ( let index = 0; index < lines.length; index++ ) {
		const text = lines[index];
		if ( front ) {
			if ( index > 0 && /^---\s*$/.test( text ) ) front = false;
			continue;
		}
		const marker = /^ {0,3}(`{3,}|~{3,})/.exec( text );
		if ( marker ) {
			if ( !fence ) fence = marker[1];
			else if ( marker[1][0] === fence[0] && marker[1].length >= fence.length ) fence = null;
			continue;
		}
		if ( fence ) continue;
		if ( /^(?: {0,3}##\s|={3,}\s*\S|\s*<h2(?:\s|>))/i.test( text ) && ++count === section ) return index + 1;
	}
	return 1;
}
