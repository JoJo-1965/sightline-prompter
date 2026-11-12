const markup = /^\s*(?:#{1,6}\s|[-*+]\s|>\s|```|~~~)|<!--|\{[a-z][\w-]*(?::|\s*\})|\[[^\]\n]+\]/im;

export function autoFormatScript( text, { paragraphs = true, sections = false, title = "Opening", cue = false, pacing = false, wpm = 140, audio = false } = {} ) {
	if ( typeof text !== "string" || !text.trim() ) throw new Error( "Paste some plain text or select a passage first." );
	if ( text.length > 200000 ) throw new Error( "Select a shorter passage (up to 200,000 characters)." );
	if ( markup.test( text ) ) throw new Error( "This text already contains script markup. Select a plain-text passage to format." );
	if ( !Number.isInteger( Number( wpm ) ) || Number( wpm ) < 80 || Number( wpm ) > 220 ) throw new Error( "Choose a pace between 80 and 220 words per minute." );
	const heading = String( title ).replace( /[\n\r{}<>#\u005b\u005d]/g, " " ).replace( /\s+/g, " " ).trim().slice( 0, 100 ) || "Opening";
	const blocks = text.replace( /\r\n?/g, "\n" ).trim().split( /\n\s*\n/ ).map( block => block.replace( /\s+/g, " " ).trim() );
	const result = [];
	const segmenter = new Intl.Segmenter( "en", { granularity: "sentence" } );
	for ( const block of blocks ) {
		if ( !paragraphs ) {
			result.push( block );
			continue;
		}
		let current = [], words = 0;
		for ( const { segment } of segmenter.segment( block ) ) {
			const sentence = segment.trim();
			current.push( sentence );
			words += sentence.split( /\s+/ ).length;
			if ( current.length >= 3 || words >= 65 ) {
				result.push( current.join( " " ) );
				current = [];
				words = 0;
			}
		}
		if ( current.length ) result.push( current.join( " " ) );
	}
	const output = [];
	if ( audio ) output.push( "{soundcheck: room}", "{soundcheck: voice}" );
	result.forEach( ( block, index ) => {
		if ( index === 0 || sections ) output.push( `## ${ index === 0 ? heading : `Section ${ index + 1 }` }` );
		if ( pacing && ( index === 0 || sections ) ) output.push( `{wpm: ${ Number( wpm ) }}` );
		if ( cue && index === 0 ) output.push( "[breathe]" );
		output.push( block );
	} );
	return { text: output.join( "\n\n" ) + "\n", paragraphs: result.length, sections: sections ? result.length : 1, words: blocks.join( " " ).split( /\s+/ ).length };
}
