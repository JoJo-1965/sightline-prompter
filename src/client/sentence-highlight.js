// Highlights the sentence the reader is on, so the eye has a place to land.
// Voice mode lights the sentence about to be said (from the speech aligner);
// otherwise it is the sentence on the reading line. Uses the CSS Custom
// Highlight API, so the script's own markup is never touched.

import { buildWordIndex, getReadingAnchor } from "./word-index.js";

const NAME = "sightline-sentence";
const SENTENCE_END = /[.!?…]["'”’)\]]*$/;
const BLOCK = "p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, div";

let index = { words: [], ranges: [] };
let sentenceOf = []; // word index -> sentence number
let starts = []; // sentence number -> first word index
let shown = -1;
let enabled = true;

const supported = typeof CSS !== "undefined" && "highlights" in CSS;

function blockOf( range ) {
	const node = range.startContainer;
	return ( node.nodeType === 1 ? node : node.parentElement )?.closest( BLOCK );
}

// Call after the script is rendered: groups the words into sentences. A
// sentence ends at . ! ? or at the end of a paragraph, heading or list item.
export function indexSentences( rootEl ) {
	index = buildWordIndex( rootEl );
	sentenceOf = [];
	starts = [];
	let sentence = -1;
	let open = false;
	let lastBlock = null;
	index.ranges.forEach( ( range, i ) => {
		const block = blockOf( range );
		if ( !open || block !== lastBlock ) {
			sentence++;
			starts.push( i );
		}
		sentenceOf.push( sentence );
		lastBlock = block;
		open = !SENTENCE_END.test( range.toString() );
	} );
	shown = -1;
	if ( supported ) CSS.highlights.delete( NAME );
}

// The script's sentences for the take log: { s, section, from, to, text },
// section 0-based (-1 before the first heading), from and to word indexes,
// and text the words as written, one per index, so the edit pack can name
// any that weren't said.
// Headings are left out: they're titles, not lines to say.
export function scriptSentences() {
	return starts.flatMap( ( from, s ) => {
		const block = blockOf( index.ranges[from] );
		if ( /^H[1-6]$/.test( block?.tagName ?? "" ) ) return [];
		const to = ( starts[s + 1] ?? index.ranges.length ) - 1;
		const words = index.ranges.slice( from, to + 1 ).map( r => r.toString().trim() );
		const section = Number( block?.closest( "[data-section]" )?.dataset.section ?? -1 );
		return [ { s, section, from, to, text: words.join( " " ) } ];
	} );
}

export function setSentenceHighlight( on ) {
	enabled = !!on;
	if ( !enabled ) clearSentence();
}

export function clearSentence() {
	shown = -1;
	if ( supported ) CSS.highlights.delete( NAME );
}

// Light the sentence that holds word `i` (an index from buildWordIndex on the
// same script).
export function showSentenceAt( i ) {
	if ( !supported || !enabled || !index.ranges.length ) return;
	const w = Math.max( 0, Math.min( index.ranges.length - 1, i ) );
	const s = sentenceOf[w];
	if ( s === shown ) return;
	shown = s;
	const first = starts[s];
	const last = ( starts[s + 1] ?? index.ranges.length ) - 1;
	const range = document.createRange();
	range.setStart(
		index.ranges[first].startContainer,
		index.ranges[first].startOffset
	);
	range.setEnd( index.ranges[last].endContainer, index.ranges[last].endOffset );
	CSS.highlights.set( NAME, new Highlight( range ) );
}

// The sentence on the reading line (steady scrolling, or scrolling by hand):
// the first word whose line reaches down to the reading line, so the line
// being read counts, not the one below it.
export function showSentenceAtReadingLine() {
	const { ranges } = index;
	if ( !ranges.length ) return;
	const y = window.innerHeight * getReadingAnchor();
	let lo = 0;
	let hi = ranges.length - 1;
	let found = ranges.length - 1;
	while ( lo <= hi ) {
		const mid = ( lo + hi ) >> 1;
		if ( ranges[mid].getBoundingClientRect().bottom >= y ) {
			found = mid;
			hi = mid - 1;
		} else {
			lo = mid + 1;
		}
	}
	showSentenceAt( found );
}
