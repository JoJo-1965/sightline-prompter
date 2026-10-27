import { getDocumentProxy } from "unpdf";

// PDFs hold positioned runs of text, not paragraphs. Rebuild a readable
// script from them: runs on the same baseline make a line, a bigger gap
// between lines starts a new paragraph, and lines in a larger font than
// the body text become headings (so the arrow keys can jump between them).
// Page numbers and running headers or footers are dropped.

const escapeHtml = text =>
	text.replace( /&/g, "&amp;" ).replace( /</g, "&lt;" ).replace( />/g, "&gt;" );

const median = ( values ) => {
	if ( !values.length ) return 0;
	const sorted = [ ...values ].sort( ( a, b ) => a - b );
	return sorted[Math.floor( sorted.length / 2 )];
};

const PAGE_NUMBER = /^(page\s+)?\d+(\s*(of|\/)\s*\d+)?$/i;

// Lines of one page, top to bottom: { text, size, y }.
export function pageLines( items ) {
	const lines = [];
	let line = null;
	for ( const item of items ) {
		if ( typeof item.str !== "string" ) continue;
		const [ , , c, d, x, y ] = item.transform;
		const size = Math.hypot( c, d ) || item.height || 0;
		if ( line && Math.abs( y - line.y ) > Math.max( size, line.size ) * 0.5 ) {
			lines.push( line );
			line = null;
		}
		if ( !line ) line = { text: "", size: 0, y, x, chars: 0 };
		if ( item.str ) {
			const gap = line.text && !/\s$/.test( line.text ) && !/^\s/.test( item.str );
			line.text += ( gap && x > line.end + size * 0.15 ? " " : "" ) + item.str;
			line.size = Math.max( line.size, item.str.trim() ? size : 0 );
			line.chars += item.str.length;
		}
		line.end = x + ( item.width ?? 0 );
		if ( item.hasEOL ) {
			lines.push( line );
			line = null;
		}
	}
	if ( line ) lines.push( line );
	return lines
		.map( l => ( { ...l, text: l.text.replace( /\s+/g, " " ).trim() } ) )
		.filter( l => l.text );
}

export function linesToHtml( pages ) {
	// Running headers and footers: the same line at the top or bottom of
	// most pages.
	const edges = lines => [ ...lines.slice( 0, 2 ), ...lines.slice( -2 ) ];
	const seen = new Map();
	for ( const lines of pages ) {
		for ( const line of new Set( edges( lines ) ) ) {
			seen.set( line.text, ( seen.get( line.text ) ?? 0 ) + 1 );
		}
	}
	const repeated = ( line, lines ) =>
		pages.length >= 3
		&& seen.get( line.text ) > pages.length / 2
		&& edges( lines ).includes( line );

	const all = pages.flat();
	const longLines = all.filter( l => l.text.length > 30 );
	const body = median( ( longLines.length ? longLines : all ).map( l => l.size ) );

	const blocks = [];
	let para = null;
	const endPara = () => {
		if ( para ) blocks.push( `<p>${ escapeHtml( para ) }</p>` );
		para = null;
	};

	for ( const lines of pages ) {
		const kept = lines.filter(
			l => !PAGE_NUMBER.test( l.text ) && !repeated( l, lines )
		);
		// Line spacing inside a paragraph: the tightest gap that body lines
		// commonly sit at (many paragraphs are one line, so not the median).
		const gaps = [];
		for ( let i = 1; i < kept.length; i++ ) {
			const gap = kept[i - 1].y - kept[i].y;
			if ( gap > 0 && kept[i].size === kept[i - 1].size ) gaps.push( gap );
		}
		gaps.sort( ( a, b ) => a - b );
		const spacing = gaps[Math.floor( gaps.length / 5 )] || body * 1.2;
		kept.forEach( ( line, i ) => {
			const heading
				= body && line.size >= body * 1.18 && line.text.length < 120;
			if ( heading ) {
				endPara();
				const tag = line.size >= body * 1.6 ? "h1" : "h2";
				const last = blocks.at( -1 );
				// A heading that wraps onto two lines stays one heading.
				if (
					last?.startsWith( `<${ tag }>` )
					&& i > 0
					&& kept[i - 1].size === line.size
				) {
					blocks[blocks.length - 1] = last.replace(
						`</${ tag }>`,
						` ${ escapeHtml( line.text ) }</${ tag }>`
					);
				} else {
					blocks.push( `<${ tag }>${ escapeHtml( line.text ) }</${ tag }>` );
				}
				return;
			}
			const gap = i > 0 ? kept[i - 1].y - line.y : 0;
			if ( i > 0 && ( gap > spacing * 1.4 || gap < 0 ) ) endPara();
			if ( !para ) para = line.text;
			else if ( /\w-$/.test( para ) && /^[a-z]/.test( line.text ) ) {
				para = para.slice( 0, -1 ) + line.text; // re-join a hyphenated word
			} else para += " " + line.text;
		} );
		// A paragraph carries on to the next page unless it ended a sentence.
		if ( para && /[.!?:…"”')\]}]$/.test( para ) ) endPara();
	}
	endPara();
	return blocks.join( "\n" );
}

export async function pdfToHtml( buffer ) {
	const pdf = await getDocumentProxy( new Uint8Array( buffer ) );
	const pages = [];
	for ( let n = 1; n <= pdf.numPages; n++ ) {
		const page = await pdf.getPage( n );
		const content = await page.getTextContent();
		pages.push( pageLines( content.items ) );
	}
	await pdf.cleanup?.();
	const html = linesToHtml( pages );
	if ( !html ) {
		return (
			"<p>(This PDF has no text to read. It may be a scan or a picture; "
			+ "open the original document instead, or save it as a PDF with text.)</p>"
		);
	}
	return html;
}
