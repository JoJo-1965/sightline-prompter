// The take log: every pass through every section while recording, for the edit.
// A take starts when the reading line enters a section while the prompter is
// running, and ends when it moves on (complete), jumps back for a retake, or
// stops. "Prompter, keeper" and "Prompter, scrap that" rate the take you're on,
// or the one you've just finished. Times are seconds from the log's start, plus
// wall-clock ISO times so a recording can be lined up with them.
// One log per script per day; main saves it as you go and exports it as JSON
// and CSV (File > Export Take Log).

const MIN_TAKE_SECONDS = 1.5;

const round = n => Math.round( n * 10 ) / 10;

// sentences: the script's sentences, [{ s, section, from, to, text }] with
// section 0-based, so each take carries its own section's text for the edit.
export function createTakeLog( { clock = () => Date.now(), sentences = () => [] } = {} ) {
	let log = empty();
	let current = null; // the take in progress
	let version = 0; // goes up with every change worth saving
	let slated = null; // { section, at }: the last slate, for the take that follows it

	function empty() {
		return { startedAt: null, takes: [], events: [] };
	}

	const since = ms => round( ( ms - Date.parse( log.startedAt ) ) / 1000 );

	function event( type, data = {} ) {
		if ( !log.startedAt ) return;
		log.events.push( { t: since( clock() ), type, ...data } );
		version++;
	}

	function open( index, title, target = null ) {
		const now = clock();
		if ( !log.startedAt ) log.startedAt = new Date( now ).toISOString();
		const take = 1 + log.takes.filter( t => t.section === index + 1 ).length;
		current = {
			section: index + 1,
			title,
			take,
			openedAt: now,
			lastAdvance: null,
			markers: [],
			markerList: [],
			markerKeys: new Set(),
			restarts: [],
			words: [],
			rereads: [],
			rating: null,
			slate: null,
			target
		};
		// The slate shown just before this take: its beep is the sync point.
		if ( slated && slated.section === index + 1 && now - slated.at < 15000 ) {
			current.slate = since( slated.at );
		}
		slated = null;
	}

	// status: complete | retake | stopped | skipped. A take ends when the text
	// last moved (so a wait at a stop isn't counted), or now when the reading
	// line has just moved straight on into the next section.
	function close( status, endNow = false ) {
		if ( !current ) return null;
		const moving = current.lastAdvance && clock() - current.lastAdvance < 1500;
		let end = endNow && moving ? clock() : current.lastAdvance ?? clock();
		// Never before the last word said in it.
		const lastWord = current.words.at( -1 );
		if ( lastWord ) end = Math.min( clock(), Math.max( end, Date.parse( log.startedAt ) + lastWord.t * 1000 + 300 ) );
		const seconds = ( end - current.openedAt ) / 1000;
		const done = current;
		current = null;
		if ( seconds < MIN_TAKE_SECONDS && !done.rating && !done.markers.length )
			return null;
		const take = {
			section: done.section,
			title: done.title,
			take: done.take,
			start: since( done.openedAt ),
			end: since( end ),
			duration: round( seconds ),
			startedAt: new Date( done.openedAt ).toISOString(),
			endedAt: new Date( end ).toISOString(),
			status,
			rating: done.rating,
			slate: done.slate,
			target: done.target ?? null, // the section's {target} in seconds, if the script sets one
			markers: done.markers,
			// Every marker with its label ({marker: Setup}) and where it came from:
			// "script" ({marker} passed while reading) or "key" (B or a command).
			markerList: done.markerList.map( ( { t, label, from } ) => ( { t, label, from } ) ),
			// Went back to a marker and read on: { t, label, markerAt }. The
			// reading from markerAt up to t is superseded by the one from t.
			restarts: done.restarts,
			words: done.words,
			rereads: done.rereads,
			sentences: sectionSentences( done.section - 1 )
		};
		log.takes.push( take );
		version++;
		return take;
	}

	function sectionSentences( index ) {
		try {
			return sentences()
				.filter( x => x.section === index )
				.map( ( { s, from, to, text } ) => ( { s, from, to, text } ) );
		} catch {
			return [];
		}
	}

	return {
		// Called a few times a second. active: the prompter is running (scrolling,
		// following your voice, or waiting at a stop or countdown). index: the
		// section at the reading line (-1 before the first). advanced: the text
		// moved on since last time. atEnd: the reading line is at the section's end.
		tick( { active, index, title = "", target = null, advanced = false, atEnd = false } ) {
			if ( !active ) {
				if ( current ) close( atEnd ? "complete" : "stopped" );
				return;
			}
			if ( current && index !== current.section - 1 ) {
				const forward = index > current.section - 1;
				close( forward ? "complete" : "stopped", forward );
			}
			if ( !current && index >= 0 ) open( index, title, target );
			if ( current && advanced ) current.lastAdvance = clock();
			if ( current ) current.atEnd = atEnd;
		},

		// Before a jump: "again" (a retake), "back", "next" or "top".
		jump( reason ) {
			event( "jump", { reason } );
			if ( !current ) return;
			// "Prompter, again" is a retake; otherwise a take read to its end is complete.
			if ( reason === "again" ) close( "retake" );
			else if ( current.atEnd ) close( "complete" );
			else close( reason === "next" ? "skipped" : "stopped" );
		},

		// Voice following: script words as they're said, [{ i, w, at }] with at
		// a wall-clock time in ms. Kept on the take as { i, w, t }, t in seconds
		// on the log's clock (the same as the slate). Saved every few words.
		words( list ) {
			if ( !current || !log.startedAt ) return;
			for ( const { i, w, at } of list ) {
				const t = Math.round( ( at - Date.parse( log.startedAt ) ) / 10 ) / 100;
				// Read again from earlier: the new reading replaces the old one from
				// here, and the re-read is kept as a fluff for the edit.
				const last = current.words.at( -1 );
				if ( last && last.i >= i ) current.rereads.push( { t, from: i, after: last.i } );
				while ( current.words.at( -1 )?.i >= i ) current.words.pop();
				current.words.push( { i, w, t } );
			}
			if ( current.words.length % 10 < list.length ) version++;
		},

		// label: the {marker: Label} name, or null. at: when, in ms (default
		// now). key: the same script marker is only logged once a take.
		marker( { label = null, at = null, from = "key", key = null } = {} ) {
			if ( !log.startedAt ) return;
			if ( key !== null && current?.markerKeys.has( key ) ) return;
			const t = since( at ?? clock() );
			if ( current ) {
				current.markers.push( t );
				current.markerList.push( { t, label, from, key } );
				if ( key !== null ) current.markerKeys.add( key );
			}
			event( "marker", label ? { label } : {} );
		},

		// Back to a marker in the take and reading on from it (Shift+B, or
		// "Prompter, back to the marker"). The take carries on.
		restart( { label = null, key = null, at = null } = {} ) {
			if ( !current || !log.startedAt ) return null;
			const t = since( at ?? clock() );
			const first = key === null ? null : current.markerList.find( m => m.key === key );
			const entry = { t, label, markerAt: first?.t ?? null };
			current.restarts.push( entry );
			event( "restart", label ? { label } : {} );
			return entry;
		},

		// "keeper" or "scrap": the take in progress, else the last one finished.
		// Returns { section, take, rating } for the confirmation, or null.
		rate( rating ) {
			const target = current ?? log.takes.at( -1 );
			if ( !target ) return null;
			target.rating = rating;
			version++;
			event( "rating", { rating, section: target.section, take: target.take } );
			return {
				section: target.section,
				take: target.take,
				title: target.title,
				rating
			};
		},

		// The take number the next take of a section will get.
		nextTake( index ) {
			const done = log.takes.filter( t => t.section === index + 1 ).length;
			return done + 1 + ( current?.section === index + 1 ? 1 : 0 );
		},

		// A slate (flash and beep) for the take about to start in this section.
		// The first slate starts the log, so its beep is time 0.
		slate( index ) {
			const now = clock();
			if ( !log.startedAt ) log.startedAt = new Date( now ).toISOString();
			slated = { section: index + 1, at: now };
			event( "slate", { section: index + 1, take: this.nextTake( index ) } );
		},

		isRunning: () => !!current,
		version: () => version,
		hasTakes: () => log.takes.length > 0 || !!current,

		// The log as saved: finished takes only, plus each section's pick.
		data() {
			return { ...log, sections: pickTakes( log.takes ) };
		},

		load( saved ) {
			current = null;
			log = saved?.startedAt
				? {
					startedAt: saved.startedAt,
					takes: saved.takes ?? [],
					events: saved.events ?? []
				}
				: empty();
		},

		reset() {
			current = null;
			log = empty();
		}
	};
}

// The speech engine gives when each word started. A word ends when the next
// one starts, unless there's a gap; then it ends after about as long as a
// word that size takes to say.
const LONGEST_WORD = 0.8;
export const PAUSE = 1; // a gap of a second or more is a pause
const round2 = n => Math.round( n * 100 ) / 100;
const sayTime = w => Math.min( LONGEST_WORD, 0.15 + 0.06 * w.length );

// [{ i, w, start, end }] for one take (voice mode; empty otherwise).
export function timedWords( take ) {
	const words = take.words ?? [];
	return words.map( ( word, k ) => {
		const next = words[k + 1];
		const own = word.t + sayTime( word.w );
		const end = next && next.t - word.t <= LONGEST_WORD ? next.t : own;
		return { i: word.i, w: word.w, start: word.t, end: round2( Math.max( word.t + 0.05, end ) ) };
	} );
}

// A take's pace, from its word timings (voice mode), or null without them.
// spoken: first word's start to last word's end, pauses included.
// speaking: the same less every gap of a second or more between words.
// The words are the rows of words.csv for the take, so the figures can be
// worked out from that file too.
export function takePace( take ) {
	const words = timedWords( take );
	if ( !words.length ) return null;
	const spoken = words.at( -1 ).end - words[0].start;
	let pauses = 0;
	for ( let k = 1; k < words.length; k++ ) {
		const gap = words[k].start - words[k - 1].end;
		if ( gap >= PAUSE ) pauses += gap;
	}
	const speaking = spoken - pauses;
	const wpm = seconds => ( seconds > 0 ? Math.round( ( words.length / seconds ) * 60 ) : null );
	const target = take.target ?? null;
	return {
		words: words.length,
		spokenSeconds: round2( spoken ),
		speakingSeconds: round2( speaking ),
		speakingWpm: wpm( speaking ),
		overallWpm: wpm( spoken ),
		targetSeconds: target,
		vsTargetSeconds: target === null ? null : round2( spoken - target )
	};
}

const clock = s => `${ Math.floor( s / 60 ) }:${ String( Math.round( s % 60 ) ).padStart( 2, "0" ) }`;

// "S3: 2:31 spoken, 151 wpm speaking, 138 wpm overall, target 2:40 (9 s under)"
export function paceSummary( section, pace ) {
	if ( !pace ) return null;
	const parts = [
		`S${ section }: ${ clock( pace.spokenSeconds ) } spoken`,
		`${ pace.speakingWpm } wpm speaking`,
		`${ pace.overallWpm } wpm overall`
	];
	if ( pace.targetSeconds !== null ) {
		const off = Math.round( pace.vsTargetSeconds );
		const how = off === 0 ? "on target" : `${ Math.abs( off ) } s ${ off > 0 ? "over" : "under" }`;
		parts.push( `target ${ clock( pace.targetSeconds ) } (${ how })` );
	}
	return parts.join( ", " );
}

// The take the edit should use for each section: the last keeper; otherwise
// the last complete take that wasn't scrapped; otherwise none. Each section
// also carries the pace of that take (voice mode).
export function pickTakes( takes ) {
	const bySection = new Map();
	for ( const t of takes ) {
		if ( !bySection.has( t.section ) ) bySection.set( t.section, [] );
		bySection.get( t.section ).push( t );
	}
	return [ ...bySection.entries() ]
		.sort( ( a, b ) => a[0] - b[0] )
		.map( ( [ section, list ] ) => {
			const keeper = list.filter( t => t.rating === "keeper" ).at( -1 );
			const usable = list
				.filter( t => t.status === "complete" && t.rating !== "scrap" )
				.at( -1 );
			const pick = keeper ?? usable ?? null;
			// Pace from the take to use, else the last take with words.
			const paced = pick ?? list.filter( t => t.words?.length ).at( -1 ) ?? null;
			const pace = paced ? takePace( paced ) : null;
			return {
				section,
				title: list[0].title,
				takes: list.length,
				use: pick ? pick.take : null,
				reason: keeper
					? "keeper"
					: usable
						? "last complete take"
						: "no usable take",
				pace,
				paceFrom: pace ? paced.take : null,
				summary: paceSummary( section, pace )
			};
		} );
}

const csvCell = ( value ) => {
	const s = value === null || value === undefined ? "" : String( value );
	return /[",\n]/.test( s ) ? `"${ s.replace( /"/g, "\"\"" ) }"` : s;
};

export function takeLogCsv( data ) {
	const picks = new Map(
		( data.sections ?? pickTakes( data.takes ) ).map( p => [ p.section, p.use ] )
	);
	const rows = [
		[
			"section",
			"title",
			"take",
			"start",
			"end",
			"duration",
			"status",
			"rating",
			"slate",
			"use",
			"started_at",
			"ended_at",
			"markers",
			// Pace (voice mode), added after the original columns.
			"words",
			"spoken_seconds",
			"speaking_seconds",
			"speaking_wpm",
			"overall_wpm",
			"target_seconds",
			"vs_target_seconds"
		]
	];
	for ( const t of data.takes ) {
		const pace = takePace( t ) ?? {};
		rows.push( [
			t.section,
			t.title,
			t.take,
			t.start,
			t.end,
			t.duration,
			t.status,
			t.rating ?? "",
			t.slate ?? "",
			picks.get( t.section ) === t.take ? "yes" : "",
			t.startedAt,
			t.endedAt,
			t.markers.join( " " ),
			pace.words ?? "",
			pace.spokenSeconds ?? "",
			pace.speakingSeconds ?? "",
			pace.speakingWpm ?? "",
			pace.overallWpm ?? "",
			t.target ?? "",
			pace.vsTargetSeconds ?? ""
		] );
	}
	return rows.map( r => r.map( csvCell ).join( "," ) ).join( "\r\n" ) + "\r\n";
}
