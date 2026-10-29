// The edit pack: the take log turned into what an editor, or an editing
// agent, cuts with. Every said word with a start and an end, every sentence
// of every take (with any words that weren't said), edit marks (sentence
// starts, long pauses, re-reads, skipped words, markers) and captions in the
// script's own wording. All times are seconds on the take log's clock, where
// 0 is the first slate's beep (or the first take's start when there was no
// slate). Plain functions of the take log JSON, so main and the tests share
// them. See docs/EDIT-PACK.md.

import { pickTakes, takeLogCsv, timedWords, PAUSE } from "./take-log.js";

export { timedWords };

const CAPTION_LINE = 42; // characters per caption line, two lines a caption
const MIN_CUE = 0.7; // seconds a caption stays up, where there's room

const round2 = n => Math.round( n * 100 ) / 100;

// Each sentence of the take's section, in script order:
// { s, text, start, end, said, of, missing: [words not said], complete }.
// start and end are null for a sentence with nothing said.
export function takeSentences( take ) {
	const words = timedWords( take );
	return ( take.sentences ?? [] ).map( ( { s, from, to, text } ) => {
		const said = words.filter( w => w.i >= from && w.i <= to );
		const heard = new Set( said.map( w => w.i ) );
		const written = text.split( " " );
		const missing = [];
		for ( let i = from; i <= to; i++ ) if ( !heard.has( i ) ) missing.push( written[i - from] ?? "" );
		return {
			s,
			text,
			start: said.length ? said[0].start : null,
			end: said.length ? said.at( -1 ).end : null,
			said: said.length,
			of: to - from + 1,
			missing,
			complete: missing.length === 0
		};
	} );
}

// Edit marks for one take, in time order: { t, type, detail, duration? }.
// Types: take-start, slate, sentence (a clean place to cut in), pause,
// reread (a fluff: the reader went back), skipped (words not said),
// marker (B or {marker}), off-script ({listen: off} to {listen: on}: an
// ad-lib, demo or questions with the microphone off), take-end.
export function takeMarks( take ) {
	const marks = [ { t: take.start, type: "take-start", detail: `Section ${ take.section } take ${ take.take }` } ];
	if ( take.slate !== null && take.slate !== undefined ) marks.push( { t: take.slate, type: "slate", detail: "sync point" } );
	for ( const sentence of takeSentences( take ) ) {
		if ( sentence.start === null ) continue;
		marks.push( { t: sentence.start, type: "sentence", detail: sentence.text } );
		if ( sentence.missing.length && sentence.said ) {
			marks.push( { t: sentence.start, type: "skipped", detail: sentence.missing.join( " " ) } );
		}
	}
	const words = timedWords( take );
	for ( let k = 1; k < words.length; k++ ) {
		const gap = words[k].start - words[k - 1].end;
		if ( gap >= PAUSE ) {
			marks.push( { t: words[k - 1].end, type: "pause", detail: `${ round2( gap ) } s`, duration: round2( gap ) } );
		}
	}
	for ( const r of take.rereads ?? [] ) {
		const word = ( take.words ?? [] ).find( w => w.i === r.from )?.w ?? "";
		marks.push( { t: r.t, type: "reread", detail: `went back to "${ word }"` } );
	}
	// Back to a marker and read on: cut to here (the second reading).
	for ( const r of take.restarts ?? [] ) {
		const name = r.label ? `"${ r.label }"` : "a marker";
		const first = r.markerAt === null ? "" : ` (first read at ${ r.markerAt } s)`;
		marks.push( { t: r.t, type: "restart", detail: `back to ${ name }${ first }: the reading from here replaces it`, markerAt: r.markerAt } );
	}
	// Markers with their labels where the log has them ({marker: Setup}).
	if ( take.markerList ) {
		for ( const m of take.markerList ) marks.push( { t: m.t, type: "marker", detail: m.label ?? "" } );
	} else {
		for ( const t of take.markers ?? [] ) marks.push( { t, type: "marker", detail: "" } );
	}
	// Off script: no words or sentences here, so the edit keeps it whole or cuts it whole.
	for ( const o of take.offScript ?? [] ) {
		const duration = round2( o.end - o.start );
		marks.push( { t: o.start, type: "off-script", detail: `${ duration } s off script (microphone off)`, duration } );
	}
	marks.push( { t: take.end, type: "take-end", detail: take.status } );
	const order = [ "take-start", "slate", "sentence", "skipped", "restart", "reread", "pause", "off-script", "marker", "take-end" ];
	return marks.sort( ( a, b ) => a.t - b.t || order.indexOf( a.type ) - order.indexOf( b.type ) );
}

// Caption cues for one take: sentences as said, split to fit two lines.
export function takeCues( take ) {
	const words = timedWords( take );
	const cues = [];
	// An older log without its sentences: the words as they were heard.
	if ( !take.sentences?.length && words.length ) {
		return takeCues( {
			...take,
			sentences: [ { s: 0, from: words[0].i, to: words.at( -1 ).i, text: wordsAsText( take ) } ]
		} );
	}
	for ( const sentence of takeSentences( take ) ) {
		if ( sentence.start === null ) continue;
		const { from } = take.sentences.find( x => x.s === sentence.s );
		const written = sentence.text.split( " " );
		const said = words.filter( w => w.i >= from && w.i < from + written.length );
		// As few cues as fit two lines, of about equal length, so no cue is a
		// lone word.
		const label = w => written[w.i - from];
		const length = list => list.map( label ).join( " " ).length;
		const parts = Math.ceil( length( said ) / ( CAPTION_LINE * 2 - 4 ) );
		const target = length( said ) / parts;
		let chunk = [];
		let made = 0;
		const flush = () => {
			if ( !chunk.length ) return;
			made++;
			cues.push( { start: chunk[0].start, end: chunk.at( -1 ).end, text: wrap( chunk.map( label ).join( " " ) ) } );
			chunk = [];
		};
		for ( const w of said ) {
			const longer = length( [ ...chunk, w ] );
			if ( chunk.length && ( longer > CAPTION_LINE * 2 || ( longer > target && made < parts - 1 ) ) ) flush();
			chunk.push( w );
		}
		flush();
	}
	// A cue never runs into the next one, and stays up long enough to read,
	// borrowing from the next cue's start when that one can spare it.
	for ( let k = 0; k < cues.length - 1; k++ ) {
		const cue = cues[k];
		const next = cues[k + 1];
		cue.end = Math.min( cue.end, next.start );
		const shift = Math.min( MIN_CUE - ( cue.end - cue.start ), next.end - next.start - 1 );
		if ( shift > 0 ) {
			cue.end = round2( cue.end + shift );
			next.start = round2( next.start + shift );
		}
	}
	return cues;
}

// Words heard, one per index from the first to the last (gaps left blank).
function wordsAsText( take ) {
	const words = take.words ?? [];
	const out = [];
	for ( let i = words[0].i; i <= words.at( -1 ).i; i++ ) out.push( words.find( w => w.i === i )?.w ?? "" );
	return out.join( " " );
}

// Two balanced lines when it won't fit on one.
function wrap( text ) {
	if ( text.length <= CAPTION_LINE ) return text;
	const words = text.split( " " );
	let best = text;
	let bestDiff = Infinity;
	for ( let k = 1; k < words.length; k++ ) {
		const a = words.slice( 0, k ).join( " " );
		const b = words.slice( k ).join( " " );
		const diff = Math.abs( a.length - b.length );
		if ( diff < bestDiff ) {
			bestDiff = diff;
			best = `${ a }\n${ b }`;
		}
	}
	return best;
}

const stamp = ( seconds, sep ) => {
	const ms = Math.max( 0, Math.round( seconds * 1000 ) );
	const pad = ( n, l = 2 ) => String( n ).padStart( l, "0" );
	const h = Math.floor( ms / 3600000 );
	const m = Math.floor( ms / 60000 ) % 60;
	const s = Math.floor( ms / 1000 ) % 60;
	return `${ pad( h ) }:${ pad( m ) }:${ pad( s ) }${ sep }${ pad( ms % 1000, 3 ) }`;
};

// Captions for every take with words, on the log's clock, so they sit on the
// recording once its slate lines up with 0.
export function captions( data, format = "srt" ) {
	const cues = ( data.takes ?? [] ).flatMap( takeCues ).sort( ( a, b ) => a.start - b.start );
	if ( format === "vtt" ) {
		return "WEBVTT\n\n" + cues.map( c => `${ stamp( c.start, "." ) } --> ${ stamp( c.end, "." ) }\n${ c.text }\n` ).join( "\n" );
	}
	return cues.map( ( c, k ) => `${ k + 1 }\n${ stamp( c.start, "," ) } --> ${ stamp( c.end, "," ) }\n${ c.text }\n` ).join( "\n" );
}

const csvCell = ( value ) => {
	const s = value === null || value === undefined ? "" : String( value );
	return /[",\n]/.test( s ) ? `"${ s.replace( /"/g, "\"\"" ) }"` : s;
};
const csv = rows => rows.map( r => r.map( csvCell ).join( "," ) ).join( "\r\n" ) + "\r\n";

export function wordsCsv( data ) {
	const rows = [ [ "section", "take", "sentence", "word_index", "word", "start", "end" ] ];
	for ( const take of data.takes ?? [] ) {
		const sentenceOf = i => take.sentences?.find( s => i >= s.from && i <= s.to )?.s ?? "";
		for ( const w of timedWords( take ) ) rows.push( [ take.section, take.take, sentenceOf( w.i ), w.i, w.w, w.start, w.end ] );
	}
	return csv( rows );
}

export function sentencesCsv( data ) {
	const picks = usedTakes( data );
	const rows = [ [ "section", "take", "use", "sentence", "start", "end", "said", "of", "complete", "missing", "text" ] ];
	for ( const take of data.takes ?? [] ) {
		for ( const s of takeSentences( take ) ) {
			rows.push( [
				take.section,
				take.take,
				picks.has( `${ take.section }/${ take.take }` ) ? "yes" : "",
				s.s,
				s.start ?? "",
				s.end ?? "",
				s.said,
				s.of,
				s.complete ? "yes" : "no",
				s.missing.join( " " ),
				s.text
			] );
		}
	}
	return csv( rows );
}

export function marksCsv( data ) {
	const rows = [ [ "t", "section", "take", "type", "detail", "duration" ] ];
	for ( const take of data.takes ?? [] ) {
		for ( const m of takeMarks( take ) ) rows.push( [ m.t, take.section, take.take, m.type, m.detail, m.duration ?? "" ] );
	}
	rows.splice( 1, rows.length, ...rows.slice( 1 ).sort( ( a, b ) => a[0] - b[0] ) );
	return csv( rows );
}

function usedTakes( data ) {
	return new Set(
		( data.sections ?? pickTakes( data.takes ?? [] ) )
			.filter( p => p.use !== null )
			.map( p => `${ p.section }/${ p.use }` )
	);
}

// Every file in the pack: { name: contents }.
export function editPack( data, readme = "" ) {
	const marks = ( data.takes ?? [] ).flatMap( take =>
		takeMarks( take ).map( m => ( { section: take.section, take: take.take, ...m } ) ) );
	const files = {
		// Sections worked out again, so a log saved before the pace was added has it too.
		"take-log.json": JSON.stringify( { ...data, sections: pickTakes( data.takes ?? [] ) }, null, 2 ),
		"takes.csv": takeLogCsv( data ),
		"edit-marks.json": JSON.stringify( marks.sort( ( a, b ) => a.t - b.t ), null, 2 ),
		"edit-marks.csv": marksCsv( data ),
		"sentences.csv": sentencesCsv( data ),
		"words.csv": wordsCsv( data ),
		"captions.srt": captions( data, "srt" ),
		"captions.vtt": captions( data, "vtt" )
	};
	if ( readme ) files["README.md"] = readme;
	if ( data.scriptSnapshots?.length ) {
		files["script-snapshots.json"] = JSON.stringify( data.scriptSnapshots, null, 2 );
		for ( const [ i, snapshot ] of data.scriptSnapshots.entries() ) {
			const prefix = `script-${ String( i + 1 ).padStart( 3, "0" ) }`;
			files[`${ prefix }.html`] = snapshot.renderedHtml ?? snapshot.html ?? "";
			if ( snapshot.source?.encoding === "base64" && /^[\w.-]+$/.test( snapshot.source.name ) ) {
				// Keep the text-file API contract; binary originals remain exactly
				// recoverable from their base64 bytes and SHA-256 in the manifest.
				files[`${ prefix }-${ snapshot.source.name }.base64`] = snapshot.source.content;
				if ( /\.(md|markdown|txt|html|htm)$/i.test( snapshot.source.name ) ) {
					try {
						files[`${ prefix }-${ snapshot.source.name }`] = new TextDecoder( "utf-8", { fatal: true, ignoreBOM: true } ).decode( Uint8Array.from( atob( snapshot.source.content ), c => c.charCodeAt( 0 ) ) );
					} catch { /* The exact bytes are retained in the base64 file. */ }
				}
			}
		}
	}
	if ( data.guideSnapshots?.length ) files["head-guide.json"] = JSON.stringify( data.guideSnapshots, null, 2 );
	if ( data.recordedSync?.length ) files["recorded-sync.json"] = JSON.stringify( data.recordedSync.map( reference => ( { ...reference, outputPath: data.obsRecordings?.find( r => r.recordingId === reference.recordingId )?.outputPath ?? reference.outputPath ?? null } ) ), null, 2 );
	return files;
}
