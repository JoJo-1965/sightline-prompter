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

export function createTakeLog( { clock = () => Date.now() } = {} ) {
	let log = empty();
	let current = null; // the take in progress
	let version = 0; // goes up with every change worth saving

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
			rating: null
		};
	}

	// status: complete | retake | stopped | skipped. A take ends when the text
	// last moved (so a wait at a stop isn't counted), or now when the reading
	// line has just moved straight on into the next section.
	function close( status, endNow = false ) {
		if ( !current ) return null;
		const end = endNow ? clock() : current.lastAdvance ?? clock();
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
			markers: done.markers
		};
		log.takes.push( take );
		version++;
		return take;
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
			picks.get( t.section ) === t.take ? "yes" : "",
			t.startedAt,
			t.endedAt,
			t.markers.join( " " )
		] );
	}
	return rows.map( r => r.map( csvCell ).join( "," ) ).join( "\r\n" ) + "\r\n";
}
