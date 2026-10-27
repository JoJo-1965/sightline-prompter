// Minimal RTF to HTML converter for scripts: keeps paragraphs, line breaks,
// bold, italic and underline, and drops everything else (fonts, colours,
// pictures, document info).

const SKIP_DESTINATIONS = new Set( [
	"fonttbl",
	"colortbl",
	"stylesheet",
	"info",
	"pict",
	"object",
	"header",
	"footer",
	"headerl",
	"headerr",
	"headerf",
	"footerl",
	"footerr",
	"footerf",
	"listtable",
	"listoverridetable",
	"rsidtbl",
	"generator",
	"themedata",
	"colorschememapping",
	"datastore",
	"latentstyles",
	"xmlnstbl",
	"mmathPr",
	"pgdsctbl",
	"fldinst",
	"filetbl",
	"revtbl",
	"bkmkstart",
	"bkmkend",
	"footnote",
	"annotation",
	"nonshppict"
] );

const SYMBOLS = {
	emdash: "—",
	endash: "–",
	lquote: "‘",
	rquote: "’",
	ldblquote: "“",
	rdblquote: "”",
	bullet: "•",
	tab: " "
};

const cp1252 = new TextDecoder( "windows-1252" );

function escapeHtml( text ) {
	return text
		.replace( /&/g, "&amp;" )
		.replace( /</g, "&lt;" )
		.replace( />/g, "&gt;" );
}

function runToHtml( run ) {
	let html = escapeHtml( run.text ).replace( /\n/g, "<br>" );
	if ( run.u ) html = `<u>${ html }</u>`;
	if ( run.i ) html = `<em>${ html }</em>`;
	if ( run.b ) html = `<strong>${ html }</strong>`;
	return html;
}

export function rtfToHtml( rtf ) {
	const stack = [];
	let state = { b: false, i: false, u: false, skip: false, uc: 1 };
	const paragraphs = [];
	let runs = [];
	let skipChars = 0;
	let i = 0;

	function emit( text ) {
		if ( state.skip ) return;
		const last = runs[runs.length - 1];
		if (
			last
			&& last.b === state.b
			&& last.i === state.i
			&& last.u === state.u
		) {
			last.text += text;
		} else {
			runs.push( { text, b: state.b, i: state.i, u: state.u } );
		}
	}

	// A plain or hex character; swallowed when it is the fallback after \uN.
	function emitChar( ch ) {
		if ( skipChars > 0 ) {
			skipChars--;
			return;
		}
		emit( ch );
	}

	function endParagraph() {
		if ( state.skip ) return;
		paragraphs.push( runs );
		runs = [];
	}

	function controlWord( word, param ) {
		const on = param === null || param !== 0;
		if ( SKIP_DESTINATIONS.has( word ) ) {
			state.skip = true;
		} else if ( word === "par" || word === "sect" || word === "page" ) {
			endParagraph();
		} else if ( word === "line" ) {
			emit( "\n" );
		} else if ( word === "b" ) {
			state.b = on;
		} else if ( word === "i" ) {
			state.i = on;
		} else if (
			word === "ul"
			|| word === "uld"
			|| word === "uldb"
			|| word === "ulw"
			|| word === "uldash"
		) {
			state.u = on;
		} else if ( word === "ulnone" ) {
			state.u = false;
		} else if ( word === "plain" ) {
			state.b = false;
			state.i = false;
			state.u = false;
		} else if ( word === "uc" ) {
			state.uc = param ?? 1;
		} else if ( word === "u" && param !== null ) {
			emit( String.fromCharCode( param < 0 ? param + 65536 : param ) );
			skipChars = state.uc;
		} else if ( SYMBOLS[word] ) {
			emitChar( SYMBOLS[word] );
		}
	}

	while ( i < rtf.length ) {
		const ch = rtf[i];
		if ( ch === "{" ) {
			stack.push( { ...state } );
			i++;
		} else if ( ch === "}" ) {
			state = stack.pop() ?? state;
			i++;
		} else if ( ch === "\\" ) {
			const next = rtf[i + 1];
			if ( next !== undefined && /[a-zA-Z]/.test( next ) ) {
				const match = /^([a-zA-Z]+)(-?\d+)? ?/.exec( rtf.slice( i + 1, i + 40 ) );
				controlWord( match[1], match[2] === undefined ? null : Number( match[2] ) );
				i += 1 + match[0].length;
			} else if ( next === "'" ) {
				const byte = parseInt( rtf.slice( i + 2, i + 4 ), 16 );
				emitChar( cp1252.decode( new Uint8Array( [ byte ] ) ) );
				i += 4;
			} else {
				if ( next === "\\" || next === "{" || next === "}" ) {
					emitChar( next );
				} else if ( next === "~" ) {
					emitChar( " " );
				} else if ( next === "_" ) {
					emitChar( "-" );
				} else if ( next === "*" ) {
					state.skip = true;
				} else if ( next === "\n" || next === "\r" ) {
					endParagraph();
				}
				i += 2;
			}
		} else if ( ch === "\r" || ch === "\n" ) {
			i++;
		} else {
			emitChar( ch );
			i++;
		}
	}
	if ( runs.length ) paragraphs.push( runs );

	return paragraphs
		.filter( p => p.some( run => run.text.trim() ) )
		.map( p => `<p>${ p.map( runToHtml ).join( "" ) }</p>` )
		.join( "\n" );
}
