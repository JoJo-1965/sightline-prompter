// Highlights the sentence the reader is on, so the eye has a place to land.
// Voice mode lights the sentence about to be said (from the speech aligner);
// otherwise it is the sentence on the reading line. Uses the CSS Custom
// Highlight API, so the script's own markup is never touched.

import { buildWordIndex, findWordAtViewport } from "./word-index.js";

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

// The sentence on the reading line (steady scrolling, or scrolling by hand).
export function showSentenceAtReadingLine() {
	if ( !index.ranges.length ) return;
	showSentenceAt( findWordAtViewport( index.ranges ) );
}
