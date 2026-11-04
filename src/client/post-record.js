// Post-record evidence is additive. Live logs and original media stay intact.
import { matchCommand, sectionNumber, WAKE_WORDS } from "./voice-commands.js";

const norm = text => String( text ).toLowerCase().normalize( "NFKC" ).replace( /[‘’]/g, "'" ).replace( /[^\p{L}\p{N}']/gu, "" ).replace( /^'+|'+$/g, "" );
const finite = value => typeof value === "number" && Number.isFinite( value );
const round = n => Math.round( n * 10000 ) / 10000;
const csv = rows => rows.map( row => row.map( v => `"${ String( v ?? "" ).replaceAll( '"', '""' ) }"` ).join( "," ) ).join( "\n" ) + "\n";

export function parseCsv( text ) {
	const rows = [], row = []; let value = "", quoted = false;
	for ( let i = 0; i < text.length; i++ ) {
		const char = text[i];
		if ( char === '"' ) { if ( quoted && text[i + 1] === '"' ) { value += '"'; i++; } else quoted = !quoted; }
		else if ( char === "," && !quoted ) { row.push( value ); value = ""; }
		else if ( char === "\n" && !quoted ) { row.push( value.replace( /\r$/, "" ) ); rows.push( [ ...row ] ); row.length = 0; value = ""; }
		else value += char;
	}
	if ( value || row.length ) { row.push( value ); rows.push( row ); }
	return rows;
}

export function normaliseTranscript( raw, { offsetS, clock = "file", name = "Transcript" } = {} ) {
	if ( ![ "file", "session" ].includes( clock ) || ( clock === "file" && !finite( offsetS ) ) ) throw Error( "A file-clock transcript needs its session offset in seconds" );
	if ( !raw || typeof raw !== "object" ) throw Error( "Choose a JSON transcript containing timed words" );
	const source = Array.isArray( raw ) ? ( raw[0]?.words ? raw.flatMap( t => t.words ?? [] ) : raw ) : raw.words ?? raw.segments?.flatMap( s => s.words ?? [] );
	if ( !Array.isArray( source ) || !source.length || source.length > 200000 ) throw Error( "Choose a transcript with 1–200,000 timed words" );
	let previous = -Infinity;
	const words = source.map( ( item, index ) => {
		const start = item.start ?? item.s, end = item.end ?? item.e, word = String( item.word ?? item.w ?? "" ).trim();
		if ( !word || word.length > 300 || !finite( start ) || !finite( end ) || start < previous || end < start || ( clock === "file" && start < 0 ) ) throw Error( `Invalid word/timing at entry ${ index + 1 }` );
		previous = start;
		const probability = item.probability;
		if ( probability !== undefined && probability !== null && ( !finite( probability ) || probability < 0 || probability > 1 ) ) throw Error( `Invalid probability at entry ${ index + 1 }` );
		return { word, start: round( start + ( clock === "file" ? offsetS : 0 ) ), end: round( end + ( clock === "file" ? offsetS : 0 ) ), probability: probability ?? null };
	} );
	return { name, engine: raw.engine ?? "imported-transcript", model: raw.model ?? null, sourceClock: clock, sessionOffsetS: clock === "file" ? offsetS : 0, timingSource: "post-record-transcription", reviewed: false, words };
}

export function commandRanges( words, events = [] ) {
	const wakes = new Set( Object.values( WAKE_WORDS ).flatMap( w => w.heard ).filter( w => !w.includes( " " ) ).map( norm ) );
	const ranges = [];
	for ( let i = 0; i < words.length; i++ ) {
		const wake = wakes.has( norm( words[i].word ) );
		const bareSection = norm( words[i].word ) === "section";
		if ( !wake && !bareSection ) continue;
		// The product name in ordinary speech is not a command attempt.
		if ( wake && norm( words[i - 1]?.word ?? "" ) === "sightline" ) continue;
		const start = i + ( wake ? 1 : 0 );
		let matched = null, finish = start;
		for ( let j = start; j < Math.min( words.length, start + 6 ); j++ ) {
			if ( j > start && words[j].start - words[j - 1].end > 1.3 ) break;
			if ( words[j].start - words[i].end > 5 ) break;
			finish = j;
			const said = words.slice( start, j + 1 ).flatMap( w => w.word.split( /\s+/ ) ).map( norm );
			const number = sectionNumber( said ) ?? ( wake ? sectionNumber( [ "section", ...said ] ) : null );
			const action = matchCommand( said );
			if ( number || action ) matched = { action: number ? "section" : action, value: number ?? null, finish: j };
		}
		if ( !matched && ( !wake || ( i > 0 && words[i].start - words[i - 1].end < .6 && !events.some( e => e.type === "voice-command" && Math.abs( e.t - words[i].start ) < 5 ) ) ) ) continue;
		const last = matched?.finish ?? Math.min( finish, start + 3 );
		if ( !words[last] ) continue;
		const heard = words.slice( i, last + 1 ).map( w => w.word ).join( " " );
		const evidence = events.filter( e => e.type === "voice-command" && Math.abs( e.t - words[last].end ) < 2 && ( matched ? e.action === matched.action && ( matched.value === null || e.value === undefined || e.value === matched.value ) : !e.action ) ).sort( ( a, b ) => Math.abs( a.t - words[last].end ) - Math.abs( b.t - words[last].end ) )[0];
		ranges.push( { t: words[i].start, start: Math.max( 0, round( words[i].start - 0.15 ) ), end: round( words[last].end + 0.2 ),
			type: "voice-command", action: matched?.action ?? null, value: matched?.value ?? null, heard,
			outcome: evidence?.outcome ?? "candidate — execution unknown", timingSource: "post-record-transcription", reviewRequired: true } );
		i = last;
	}
	return ranges;
}

// Semi-global sequence alignment: free audio before/after the script, with
// substitutions, insertions and omissions inside the chosen reading range.
export function alignWords( expected, heard ) {
	const m = expected.length, n = heard.length;
	if ( m > 1500 || n > 6000 || m * n > 2500000 ) throw Error( "This take is too long for local comparison; split it into sections" );
	const width = n + 1, matrix = new Uint16Array( ( m + 1 ) * width );
	for ( let i = 1; i <= m; i++ ) matrix[i * width] = i;
	for ( let i = 1; i <= m; i++ ) for ( let j = 1; j <= n; j++ ) {
		matrix[i * width + j] = Math.min( matrix[( i - 1 ) * width + j - 1] + ( norm( expected[i - 1].word ) === norm( heard[j - 1].word ) ? 0 : 1 ), matrix[( i - 1 ) * width + j] + 1, matrix[i * width + j - 1] + 1 );
	}
	let j = 0;
	for ( let k = 1; k <= n; k++ ) if ( matrix[m * width + k] < matrix[m * width + j] ) j = k;
	const end = j;
	let i = m;
	const operations = [];
	while ( i > 0 ) {
		const here = matrix[i * width + j], same = j > 0 && norm( expected[i - 1].word ) === norm( heard[j - 1].word );
		if ( j > 0 && here === matrix[( i - 1 ) * width + j - 1] + ( same ? 0 : 1 ) ) {
			operations.push( { type: same ? "match" : "substitution", expected: expected[i - 1], heard: heard[j - 1] } ); i--; j--;
		} else if ( here === matrix[( i - 1 ) * width + j] + 1 ) { operations.push( { type: "omission", expected: expected[i - 1] } ); i--; }
		else { operations.push( { type: "insertion", heard: heard[j - 1] } ); j--; }
	}
	return { operations: operations.reverse(), from: j, to: end, matches: operations.filter( o => o.type === "match" ).length };
}

function reportTake( take, allWords, commands, takeCount ) {
	const expected = ( take.sentences ?? [] ).flatMap( sentence => sentence.text.trim().split( /\s+/ ).map( ( word, i ) => ( { word, i: sentence.from + i, sentence: sentence.s } ) ) );
	const heard = allWords.filter( w => w.end >= take.start - 3 && w.start <= take.end + 2 );
	if ( !expected.length ) return { section: take.section, take: take.take, status: "unavailable", reason: "No script sentence snapshot", words: [], issues: [] };
	if ( expected.length > 1500 || heard.length > 6000 || expected.length * heard.length > 2500000 ) return { section: take.section, take: take.take, status: "unavailable", reason: "Split this long take into sections for script comparison. The full transcript is retained.", words: [], issues: [] };
	const alignment = alignWords( expected, heard ), coverage = alignment.matches / expected.length;
	const selected = heard.slice( alignment.from, alignment.to ).map( w => {
		const op = alignment.operations.find( o => o.heard === w );
		return { ...w, scriptIndex: op?.expected?.i ?? null, sentence: op?.expected?.sentence ?? null };
	} );
	const status = selected.length && coverage >= 0.4 ? "review" : "uncertain";
	const start = selected[0]?.start ?? take.start, end = selected.at( -1 )?.end ?? take.end;
	let issues = alignment.operations.filter( o => o.type !== "match" ).map( o => ( {
		kind: o.type, expected: o.expected?.word ?? "", heard: o.heard?.word ?? "",
		start: o.heard?.start ?? alignment.operations.find( p => p.expected?.i > o.expected?.i && p.heard )?.heard?.start ?? end,
		end: o.heard?.end ?? alignment.operations.find( p => p.expected?.i > o.expected?.i && p.heard )?.heard?.start ?? end,
		priority: takeCount === 1 ? "single-take — listen first" : "review", verifiedMisread: false
	} ) );
	if ( status === "uncertain" ) issues = [ { kind: "alignment-uncertain", expected: expected.map( w => w.word ).join( " " ), heard: selected.map( w => w.word ).join( " " ), start, end, priority: takeCount === 1 ? "single-take — listen first" : "review", verifiedMisread: false } ];
	const sentences = ( take.sentences ?? [] ).map( s => {
		const ops = alignment.operations.filter( o => o.expected?.sentence === s.s );
		const said = ops.filter( o => o.heard );
		return { s: s.s, text: s.text, heard: said.map( o => o.heard.word ).join( " " ), start: said[0]?.heard.start ?? null, end: said.at( -1 )?.heard.end ?? null,
			said: said.length, of: ops.length, missingCandidates: status === "uncertain" ? [] : ops.filter( o => o.type === "omission" ).map( o => o.expected.word ),
			complete: status !== "uncertain" && ops.every( o => o.type === "match" ) };
	} );
	const probabilities = selected.map( w => w.probability ).filter( finite );
	const quality = status === "review" && end - start >= 2 && selected.length >= 3 && selected.every( w => w.end > w.start ) && ( !probabilities.length || probabilities.reduce( ( a, b ) => a + b, 0 ) / probabilities.length >= .5 );
	return { section: take.section, take: take.take, title: take.title, status, expectedText: expected.map( w => w.word ).join( " " ), heardText: selected.map( w => w.word ).join( " " ),
		start, end, coverage: round( coverage ), wordCount: selected.length, estimatedWpm: quality ? Math.round( selected.length / ( end - start ) * 60 ) : null,
		words: selected, sentences, issues, timingSource: "post-record-transcription", reviewRequired: true };
}

export function buildPostRecord( data, transcripts, recordings = [] ) {
	const words = transcripts.flatMap( t => t.words ).sort( ( a, b ) => a.start - b.start );
	const commands = commandRanges( words, data.events );
	const reports = ( data.takes ?? [] ).map( take => reportTake( take, words, commands, data.takes.filter( t => t.section === take.section && t.status !== "skipped" ).length ) );
	return { schemaVersion: 1, timingSource: "post-record-transcription", transcripts, recordings, commandRanges: commands, takes: reports,
		sync: { pictureSync: "unverified", audioMeasured: recordings.some( r => r.status === "measured" ), recordedReference: ( data.recordedSync ?? [] ).some( r => r.verified === true ),
			warning: "Audio alignment does not verify picture-to-sound sync. Check an in-recording slate or visible clap." } };
}

function captionTime( seconds, format ) {
	const ms = Math.max( 0, Math.round( seconds * 1000 ) ), h = Math.floor( ms / 3600000 ), m = Math.floor( ms / 60000 ) % 60, s = Math.floor( ms / 1000 ) % 60;
	return `${ String( h ).padStart( 2, "0" ) }:${ String( m ).padStart( 2, "0" ) }:${ String( s ).padStart( 2, "0" ) }${ format === "srt" ? "," : "." }${ String( ms % 1000 ).padStart( 3, "0" ) }`;
}

export function postRecordFiles( data, liveFiles ) {
	const review = data.postRecord;
	if ( !review?.takes || !review?.transcripts ) return {};
	const out = {};
	for ( const name of [ "words.csv", "sentences.csv", "captions.srt", "captions.vtt", "takes.csv", "edit-marks.csv", "edit-marks.json" ] ) if ( liveFiles[name] ) out[`live-${ name }`] = liveFiles[name];
	out["post-record-review.json"] = JSON.stringify( review, null, 2 );
	out["transcript.json"] = JSON.stringify( review.transcripts, null, 2 );
	out["recording-offsets.json"] = JSON.stringify( review.recordings, null, 2 );
	out["delivery-review.csv"] = csv( [ [ "section", "take", "kind", "expected", "heard", "start", "end", "priority", "verified_misread" ], ...review.takes.flatMap( t => t.issues.map( i => [ t.section, t.take, i.kind, i.expected, i.heard, i.start, i.end, i.priority, false ] ) ) ] );
	out["words.csv"] = csv( [ [ "section", "take", "sentence", "word_index", "word", "start", "end", "probability", "timing_source" ], ...review.takes.flatMap( t => t.words.map( w => [ t.section, t.take, w.sentence, w.scriptIndex, w.word, w.start, w.end, w.probability, "post-record-transcription" ] ) ) ] );
	out["sentences.csv"] = csv( [ [ "section", "take", "use", "sentence", "start", "end", "said", "of", "complete", "missing", "text", "heard_text", "timing_source", "review_required" ], ...review.takes.flatMap( t => ( t.sentences ?? [] ).map( s => [ t.section, t.take, data.sections?.some( pick => pick.section === t.section && pick.use === t.take ) ? "yes" : "", s.s, s.start, s.end, s.said, s.of, s.complete ? "yes" : "no", s.missingCandidates.join( " " ), s.text, s.heard, "post-record-transcription", true ] ) ) ] );
	const takeRows = parseCsv( liveFiles["takes.csv"] ?? "" );
	if ( takeRows.length ) {
		const headers = takeRows[0];
		for ( const row of takeRows.slice( 1 ) ) {
			const r = review.takes.find( t => t.section === Number( row[headers.indexOf( "section" )] ) && t.take === Number( row[headers.indexOf( "take" )] ) );
			for ( const [ field, value ] of Object.entries( { words: r?.wordCount, spoken_seconds: r?.words?.length ? round( r.end - r.start ) : null, speaking_seconds: null, speaking_wpm: null, overall_wpm: r?.estimatedWpm } ) ) if ( headers.includes( field ) ) row[headers.indexOf( field )] = value;
			row.push( "post-record-transcription", true );
		}
		headers.push( "timing_source", "review_required" ); out["takes.csv"] = csv( takeRows );
	}
	for ( const format of [ "srt", "vtt" ] ) {
		const cues = [];
		for ( const take of review.takes ) {
			let chunk = [];
			const flush = () => {
				if ( !chunk.length ) return;
				const text = chunk.map( w => w.word ).join( " " );
				let lines = text;
				if ( text.length > 42 ) { const spaces = [ ...text.matchAll( / /g ) ].map( m => m.index ); const split = spaces.sort( ( a, b ) => Math.abs( a - text.length / 2 ) - Math.abs( b - text.length / 2 ) )[0]; if ( split ) lines = text.slice( 0, split ) + "\n" + text.slice( split + 1 ); }
				cues.push( { start: chunk[0].start, end: chunk.at( -1 ).end, text: lines } ); chunk = [];
			};
			for ( const word of take.words ) { if ( chunk.length && ( [ ...chunk, word ].map( w => w.word ).join( " " ).length > 80 || word.end - chunk[0].start > 6 || word.start - chunk.at( -1 ).end > 1 ) ) flush(); chunk.push( word ); }
			flush();
		}
		const sorted = cues.sort( ( a, b ) => a.start - b.start );
		const valid = sorted.map( ( c, i ) => ( { ...c, end: Math.min( c.end, sorted[i + 1]?.start ?? Infinity ) } ) ).filter( c => c.end > Math.max( 0, c.start ) );
		out[`captions.${ format }`] = ( format === "vtt" ? "WEBVTT\n\n" : "" ) + valid.map( ( c, i ) => `${ format === "srt" ? i + 1 + "\n" : "" }${ captionTime( c.start, format ) } --> ${ captionTime( c.end, format ) }\n${ c.text }\n` ).join( "\n" );
	}
	const marks = [ ...JSON.parse( liveFiles["edit-marks.json"] ?? "[]" ).filter( m => ![ "skipped", "sentence", "pause" ].includes( m.type ) ), ...review.commandRanges ];
	out["edit-marks.json"] = JSON.stringify( marks.sort( ( a, b ) => a.t - b.t ), null, 2 );
	out["edit-marks.csv"] = csv( [ [ "t", "section", "take", "type", "detail", "duration", "start", "end", "action", "outcome", "review_required" ], ...marks.map( m => [ m.t, m.section, m.take, m.type, m.heard ?? m.detail, m.duration ?? ( m.end ? round( m.end - m.start ) : null ), m.start ?? m.t, m.end ?? ( m.t + ( m.duration ?? 0 ) ), m.action, m.outcome, m.reviewRequired ?? false ] ) ] );
	out["timing-quality.json"] = JSON.stringify( { source: "post-record-transcription", reviewed: false, automaticCutSafe: false, pictureSync: "unverified", originalLiveFiles: "live-*", limitations: [ "Transcript words and times still need listening and editorial review.", "Delivery differences are candidates, not confirmed errors.", "Command cut ranges may include quoted commands; review before removal.", "Audio-derived offsets do not establish picture-to-sound sync." ] }, null, 2 );
	out["TIMING-NOTES.md"] = "# Post-record timing review\n\nStandard word and caption files now use the selected post-record transcript. The original live estimates are retained as live-* files. Delivery differences and command cut ranges are suggestions requiring listening; none is an instruction to cut automatically. Check clock mappings and recording-offsets.json. Audio alignment cannot establish picture sync.\n";
	return out;
}
