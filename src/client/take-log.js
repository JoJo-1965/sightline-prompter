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

	function open( index, title ) {
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
			words: [],
			rereads: [],
			rating: null,
			slate: null
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
			markers: done.markers,
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
		tick( { active, index, title = "", advanced = false, atEnd = false } ) {
			if ( !active ) {
				if ( current ) close( atEnd ? "complete" : "stopped" );
				return;
			}
			if ( current && index !== current.section - 1 ) {
				const forward = index > current.section - 1;
				close( forward ? "complete" : "stopped", forward );
			}
			if ( !current && index >= 0 ) open( index, title );
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

		marker() {
			const t = log.startedAt ? since( clock() ) : null;
			if ( t === null ) return;
			if ( current ) current.markers.push( t );
			event( "marker" );
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

// The take the edit should use for each section: the last keeper; otherwise
// the last complete take that wasn't scrapped; otherwise none.
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
			return {
				section,
				title: list[0].title,
				takes: list.length,
				use: pick ? pick.take : null,
				reason: keeper
					? "keeper"
					: usable
						? "last complete take"
						: "no usable take"
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
			"markers"
		]
	];
	for ( const t of data.takes ) {
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
			t.markers.join( " " )
		] );
	}
	return rows.map( r => r.map( csvCell ).join( "," ) ).join( "\r\n" ) + "\r\n";
}
