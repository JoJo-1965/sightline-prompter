import { takePace } from "./take-log.js";

export function rehearsalCoach( data ) {
	return {
		version: 1,
		basis: "Alignment estimates, not a transcript audit. Review the recording before changing an edit.",
		takes: ( data.takes ?? [] ).map( ( take ) => {
			const words = take.words ?? [];
			const matched = new Set( words.map( word => word.i ) );
			const first = words.length ? words.reduce( ( n, word ) => Math.min( n, word.i ), Infinity ) : null;
			const last = words.length ? words.reduce( ( n, word ) => Math.max( n, word.i ), -Infinity ) : null;
			const sentences = take.sentences ?? [];
			const lines = sentences.map( ( sentence ) => {
				let said = 0;
				for ( let index = sentence.from; index <= sentence.to; index++ ) if ( matched.has( index ) ) said++;
				const total = sentence.to - sentence.from + 1;
				const rereads = ( take.rereads ?? [] ).filter( item => item.from <= sentence.to && item.after >= sentence.from ).length;
				const status = !words.length ? "unavailable" : said === total ? "matched" : sentence.to < first || sentence.from > last ? "outside-read-range" : said ? "partly-matched" : "not-matched";
				return { ...sentence, matched: said, total, status, rereads };
			} );
			return {
				section: take.section, title: take.title, take: take.take, status: take.status,
				rating: take.rating ?? null, duration: take.duration, pace: takePace( take ),
				coverageAvailable: !!words.length && !!sentences.length,
				matched: lines.reduce( ( sum, line ) => sum + line.matched, 0 ),
				total: lines.reduce( ( sum, line ) => sum + line.total, 0 ),
				fillers: take.speechReview ? { ...take.speechReview } : null,
				lines
			};
		} )
	};
}
