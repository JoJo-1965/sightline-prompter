// Sliding-window fuzzy aligner.
//
// Given a known script (array of normalized words) and a stream of recognized
// words from STT, find the most likely current position by searching a forward
// window for the best multiset overlap with a ring buffer of recent recognized
// words. The result tolerates ASR errors, ad-libs, and re-reads.
//
// Matches are weighted by inverse document frequency so filler words ("the",
// "and", "a") can't carry a match on their own — a window must share
// distinctive words with what was spoken. If nothing in the local window is
// convincing, the whole script is searched with a stricter bar so a lost
// aligner can find the reader again instead of settling on a nearby false match.
//
// synonyms (Settings > Voice > Your words): Map( script word -> Set of words the
// speech engine hears instead ). A heard synonym matches that script word as
// well as itself.
//
// soundAlike: a heard word the script doesn't have that sounds like a script
// word (sound-alike.js) matches it too, as a last resort. Short words are
// left out: too many sound alike.

import { soundKey } from "./sound-alike.js";

const RECENT_WINDOW = 15;
const FORWARD_WINDOW = 200;
const MAX_BACKWARD_JUMP = 30;
const MIN_RECENT_TO_STEP = 5;
// Fraction of the best possible weighted score a window must reach.
const MIN_SCORE_RATIO_ADVANCE = 0.5;
const MIN_SCORE_RATIO_REWIND = 0.6;
const MIN_SCORE_RATIO_GLOBAL = 0.65;
// A "content" word appears at most this many times in the script.
const CONTENT_WORD_MAX_DF = 3;
const MIN_CONTENT_MATCHES_LOCAL = 2;
const MIN_CONTENT_MATCHES_GLOBAL = 3;
const ORDERED_LOOKAHEAD = 24;
const CONTRACTIONS = {
	ive: "ihave", youve: "youhave", weve: "wehave", theyve: "theyhave",
	im: "iam", youre: "youare", were: "weare", theyre: "theyare",
	ill: "iwill", youll: "youwill", well: "wewill", theyll: "theywill",
	dont: "donot", doesnt: "doesnot", didnt: "didnot", isnt: "isnot",
	arent: "arenot", wasnt: "wasnot", werent: "werenot", cant: "cannot",
	couldnt: "couldnot", wouldnt: "wouldnot", shouldnt: "shouldnot",
	havent: "havenot", hasnt: "hasnot", hadnt: "hadnot", wont: "willnot"
};

// Apostrophes go too, so "isn't" (heard) matches "isn’t" (typed with a curly one).
const NORMALIZE_REGEX = /[^\w]/g;
const SOUND_ALIKE_MIN_LENGTH = 4;

function normalize( word ) {
	return word.toLowerCase().replace( NORMALIZE_REGEX, "" );
}

function buildCounts( words ) {
	const counts = new Map();
	for ( const w of words ) {
		counts.set( w, ( counts.get( w ) || 0 ) + 1 );
	}
	return counts;
}

export function createAligner( scriptWords, { synonyms = new Map(), soundAlike = false, sectionStarts = [] } = {} ) {
	const recent = [];
	let position = 0;
	let relocating = false;
	const sections = [ ...new Set( [ 0, ...sectionStarts.filter( i => Number.isInteger( i ) && i >= 0 && i < scriptWords.length ), scriptWords.length ] ) ].sort( ( a, b ) => a - b );

	const docFreq = buildCounts( scriptWords );
	const logN = Math.log( 1 + scriptWords.length );
	function weight( w ) {
		const df = docFreq.get( w );
		return df ? Math.log( 1 + scriptWords.length / df ) / logN : 0;
	}
	// What a heard synonym stands for, to weigh it like the script word.
	const standsFor = new Map();
	for ( const [ word, heard ] of synonyms ) {
		for ( const h of heard ) if ( !docFreq.has( h ) ) standsFor.set( h, word );
	}
	// Sound-alike keys for the script's longer words, and for words heard.
	const keyOf = w => ( w.length >= SOUND_ALIKE_MIN_LENGTH && !w.includes( "_" ) ? soundKey( w ) : "" );
	const scriptKeys = soundAlike ? scriptWords.map( w => ( keyOf( w ).length >= 2 ? keyOf( w ) : "" ) ) : [];
	const keyWord = new Map(); // key -> a script word with it, to weigh a heard word
	scriptKeys.forEach( ( k, i ) => k && !keyWord.has( k ) && keyWord.set( k, scriptWords[i] ) );
	const heardKeys = new Map();
	const heardKey = ( w ) => {
		if ( !heardKeys.has( w ) ) heardKeys.set( w, docFreq.has( w ) ? "" : keyOf( w ) );
		return heardKeys.get( w );
	};
	// Same sound, same first letter and about as long: "marsha" for "moshe",
	// not "carry" for "grew".
	const soundsLike = ( heard, word, key ) =>
		heard[0] === word[0] && Math.abs( heard.length - word.length ) <= 2 && heardKey( heard ) === key;
	const heardWeight = ( w ) => {
		if ( docFreq.has( w ) ) return weight( w );
		if ( standsFor.has( w ) ) return weight( standsFor.get( w ) );
		const like = soundAlike && keyWord.get( heardKey( w ) );
		return like && soundsLike( w, like, heardKey( w ) ) ? weight( like ) : 0;
	};
	function isContentWord( w ) {
		const df = docFreq.get( w );
		return df > 0 && df <= CONTENT_WORD_MAX_DF;
	}

	function addRecognized( word ) {
		const cleaned = normalize( word );
		if ( !cleaned ) return;
		recent.push( cleaned );
		if ( recent.length > RECENT_WINDOW ) recent.shift();
	}

	// Ordered nearby speech can be convincing even when every word is common
	// throughout a long script. Keep this bounded; distant relocation still
	// needs the existing weighted/content-word checks.
	function orderedPosition() {
		if ( recent.length < 3 ) return null;
		const lower = Math.max( 0, position - RECENT_WINDOW * 2 );
		const memo = new Map(), forms = new Map();
		const groupForms = ( list ) => {
			const key = list.join( " " );
			if ( !forms.has( key ) ) forms.set( key, new Set( [ list.join( "" ), list.map( w => CONTRACTIONS[w] ?? w ).join( "" ) ] ) );
			return forms.get( key );
		};
		const suffix = ( heardAt, scriptAt ) => {
			const key = `${ heardAt }:${ scriptAt }`;
			if ( memo.has( key ) ) return memo.get( key );
			let best = { words: 0, heard: 0, start: scriptAt + 1 };
			if ( heardAt >= 0 && scriptAt >= lower ) {
				for ( let h = 1; h <= Math.min( 3, heardAt + 1 ); h++ ) {
					const heardForms = groupForms( recent.slice( heardAt - h + 1, heardAt + 1 ) );
					for ( let s = 1; s <= Math.min( 2, scriptAt - lower + 1 ); s++ ) {
						const expected = groupForms( scriptWords.slice( scriptAt - s + 1, scriptAt + 1 ) );
						if ( ![ ...heardForms ].some( form => expected.has( form ) ) ) continue;
						const before = suffix( heardAt - h, scriptAt - s );
						const candidate = { words: before.words + s, heard: before.heard + h, start: before.words ? before.start : scriptAt - s + 1 };
						if ( candidate.words > best.words || ( candidate.words === best.words && candidate.heard > best.heard ) ) best = candidate;
					}
				}
			}
			memo.set( key, best );
			return best;
		};
		let best = null;
		for ( let end = position; end < Math.min( scriptWords.length, position + ORDERED_LOOKAHEAD + 1 ); end++ ) {
			const found = suffix( recent.length - 1, end );
			if ( found.words < 3 || found.heard < 3 ) continue;
			const strong = found.words >= 5;
			if ( found.start > position + ( strong ? 12 : 3 ) || end > position + ( strong ? ORDERED_LOOKAHEAD : 12 ) ) continue;
			if ( !best || found.words > best.words || ( found.words === best.words && found.heard > best.heard ) ) best = { ...found, end };
		}
		return best?.end ?? null;
	}

	// Best-scoring window ending in [start, end). Ties keep the earliest match.
	function search( start, end, recentCounts ) {
		const windowSize = recent.length;
		const limit = end - windowSize;
		let best = { pos: position, score: 0, content: 0 };
		for ( let i = start; i <= limit; i++ ) {
			let score = 0;
			let content = 0;
			const remaining = new Map( recentCounts );
			for ( let j = 0; j < windowSize; j++ ) {
				const w = scriptWords[i + j];
				let key = w;
				let r = remaining.get( w ) || 0;
				if ( !r && synonyms.has( w ) ) {
					for ( const alt of synonyms.get( w ) ) {
						if ( ( remaining.get( alt ) || 0 ) > 0 ) {
							key = alt;
							r = remaining.get( alt );
							break;
						}
					}
				}
				if ( !r && scriptKeys[i + j] ) {
					for ( const [ heard, left ] of remaining ) {
						if ( left > 0 && soundsLike( heard, w, scriptKeys[i + j] ) ) {
							key = heard;
							r = left;
							break;
						}
					}
				}
				if ( r > 0 ) {
					score += weight( w );
					if ( isContentWord( w ) ) content++;
					remaining.set( key, r - 1 );
				}
			}
			if ( score > best.score ) {
				best = { pos: i + windowSize - 1, score, content };
			}
		}
		return best;
	}

	function step() {
		if ( !scriptWords.length ) return position;
		const ordered = orderedPosition();
		if ( ordered !== null ) {
			position = ordered;
			relocating = false;
			return position;
		}
		if ( recent.length < MIN_RECENT_TO_STEP ) return position;

		const recentCounts = buildCounts( recent );
		const maxScore = recent.reduce( ( sum, w ) => sum + heardWeight( w ), 0 );
		if ( maxScore <= 0 ) return position;

		// Asked to find the reader again: search the whole script, a little
		// more readily than when lost on its own, and stop once found.
		if ( relocating ) {
			const found = search( 0, scriptWords.length, recentCounts );
			if (
				found.score >= maxScore * MIN_SCORE_RATIO_ADVANCE
				&& found.content >= MIN_CONTENT_MATCHES_LOCAL
			) {
				position = found.pos;
				relocating = false;
			}
			return position;
		}

		// An unordered bag of words in a repeated heading must not relocate to
		// another section. Ordered nearby speech can still cross a boundary;
		// explicit Resync above deliberately searches the complete script.
		const sectionEnd = sections.findIndex( end => end > position );
		const lower = sections[Math.max( 0, sectionEnd - 1 )];
		const upper = sections[sectionEnd] ?? scriptWords.length;
		const local = search(
			Math.max( lower, position - MAX_BACKWARD_JUMP ),
			Math.min( upper, position + FORWARD_WINDOW ),
			recentCounts
		);
		const localRatio
			= local.pos < position ? MIN_SCORE_RATIO_REWIND : MIN_SCORE_RATIO_ADVANCE;
		if (
			local.score >= maxScore * localRatio
			&& local.content >= MIN_CONTENT_MATCHES_LOCAL
		) {
			position = local.pos;
			return position;
		}

		const global = search( lower, upper, recentCounts );
		if (
			global.score >= maxScore * MIN_SCORE_RATIO_GLOBAL
			&& global.content >= MIN_CONTENT_MATCHES_GLOBAL
		) {
			position = global.pos;
		}
		return position;
	}

	function currentPosition() {
		return position;
	}

	function setPosition( idx ) {
		position = Math.max( 0, Math.min( scriptWords.length - 1, idx ) );
	}

	function clearRecent() {
		recent.length = 0;
	}

	function reset() {
		position = 0;
		recent.length = 0;
	}

	// "Prompter, resync": forget the recent words and look for the reader
	// anywhere in the script from what they say next.
	function relocate() {
		recent.length = 0;
		relocating = true;
	}

	return {
		addRecognized,
		step,
		currentPosition,
		setPosition,
		clearRecent,
		reset,
		relocate
	};
}

export const ALIGNER_CONSTANTS = {
	RECENT_WINDOW,
	FORWARD_WINDOW,
	MAX_BACKWARD_JUMP,
	MIN_RECENT_TO_STEP,
	MIN_SCORE_RATIO_ADVANCE,
	MIN_SCORE_RATIO_REWIND,
	MIN_SCORE_RATIO_GLOBAL,
	CONTENT_WORD_MAX_DF,
	MIN_CONTENT_MATCHES_LOCAL,
	MIN_CONTENT_MATCHES_GLOBAL
};
