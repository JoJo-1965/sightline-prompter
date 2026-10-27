// node scripts/pdf.test.mjs
import assert from "node:assert/strict";
import { linesToHtml } from "../src/utils/pdf.js";

// Lines as pageLines() gives them: top to bottom, y falling down the page.
let y;
const page = ( ...lines ) => {
	y = 800;
	return lines.map( ( [ text, size = 12, gap = 14 ] ) => ( { text, size, y: ( y -= gap ) } ) );
};

const pages = [
	page(
		[ "Draft script", 9 ],
		[ "Welcome to the course", 24, 40 ],
		[ "This first paragraph runs over two lines of text so that it is", 12, 40 ],
		[ "long enough to be the body text." ],
		[ "A second paragraph after a blank line, with a hyphen-", 12, 28 ],
		[ "ated word and a sentence that is" ],
		[ "1", 9, 300 ]
	),
	page(
		[ "Draft script", 9 ],
		[ "carried over from the page before.", 12, 40 ],
		[ "Part two", 16, 30 ],
		[ "Text under the second heading, long enough to count as body text.", 12, 24 ],
		[ "2", 9, 300 ]
	),
	page(
		[ "Draft script", 9 ],
		[ "The last page has one more paragraph of ordinary body text here.", 12, 40 ],
		[ "3", 9, 300 ]
	)
];

const html = linesToHtml( pages );
const blocks = html.split( "\n" );

assert.deepEqual( blocks, [
	"<h1>Welcome to the course</h1>",
	"<p>This first paragraph runs over two lines of text so that it is long enough to be the body text.</p>",
	"<p>A second paragraph after a blank line, with a hyphenated word and a sentence that is carried over from the page before.</p>",
	"<h2>Part two</h2>",
	"<p>Text under the second heading, long enough to count as body text.</p>",
	"<p>The last page has one more paragraph of ordinary body text here.</p>"
] );

// Text that looks like markup stays text.
assert.equal(
	linesToHtml( [ page( [ "Use <b> & {wpm: 140} as written, in a sentence of body text." ] ) ] ),
	"<p>Use &lt;b&gt; &amp; {wpm: 140} as written, in a sentence of body text.</p>"
);

console.log( "pdf: all tests passed" );
