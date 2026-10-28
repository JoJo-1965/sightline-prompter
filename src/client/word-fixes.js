// "Teach it your words" (Settings > Voice > Your words): words the speech
// engine keeps mishearing, such as a name, and what it hears instead. Each
// heard form becomes a synonym of your word for voice scrolling: "marsha"
// counts as "Moshe" wherever the script says Moshe, and is still itself
// wherever the script really says Marsha. A form of two or three words
// ("site line" for "Sightline") is heard as one, unless the script itself
// says those words in a row.

const MAX_PHRASE = 3;

export const normalizeWord = w => String( w ).toLowerCase().replace( /[^\w]/g, "" );

// The heard forms of a fix, normalized: "marsha, mosher" or [ "site line" ].
export function heardForms( heard ) {
	const list = Array.isArray( heard ) ? heard : String( heard ?? "" ).split( "," );
	return [ ...new Set( list
		.map( h => String( h ).trim().split( /\s+/ ).map( normalizeWord ).filter( Boolean ).join( " " ) )
		.filter( h => h && h.split( " " ).length <= MAX_PHRASE ) ) ];
}

// fixes: [{ word: "Moshe", heard: [ "marsha", "mosher" ] }]; scriptWords: the
// script's words, normalized. Returns
//   synonyms: Map( script word -> Set of heard forms ), for the aligner;
//   join( words ): heard words with each known phrase made one word.
export function createWordFixer( fixes, scriptWords ) {
	const inScript = new Set( scriptWords );
	const scriptText = ` ${ scriptWords.join( " " ) } `;
	const synonyms = new Map();
	const phrases = new Map(); // "site line" -> "site_line"
	for ( const fix of fixes ?? [] ) {
		const word = normalizeWord( fix?.word ?? "" );
		if ( !word || !inScript.has( word ) ) continue;
		for ( const form of heardForms( fix.heard ) ) {
			if ( form === word ) continue;
			let token = form;
			if ( form.includes( " " ) ) {
				if ( scriptText.includes( ` ${ form } ` ) ) continue; // the script says it
				token = form.replace( / /g, "_" );
				phrases.set( form, token );
			}
			if ( !synonyms.has( word ) ) synonyms.set( word, new Set() );
			synonyms.get( word ).add( token );
		}
	}
	const join = !phrases.size
		? words => words
		: ( words ) => {
			const out = [];
			for ( let i = 0; i < words.length; ) {
				let joined = false;
				for ( let n = Math.min( MAX_PHRASE, words.length - i ); n >= 2; n-- ) {
					const token = phrases.get( words.slice( i, i + n ).map( normalizeWord ).join( " " ) );
					if ( token ) {
						out.push( token );
						i += n;
						joined = true;
						break;
					}
				}
				if ( !joined ) out.push( words[i++] );
			}
			return out;
		};
	return { synonyms, join };
}
