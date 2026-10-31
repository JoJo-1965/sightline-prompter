import { paceSummary } from "./take-log.js";

const clock = ( seconds ) => {
	const rounded = Math.round( seconds );
	return `${ Math.floor( rounded / 60 ) }:${ String( rounded % 60 ).padStart( 2, "0" ) }`;
};
const shortened = text => text.length > 240 ? text.slice( 0, 237 ) + "…" : text;

export function createScriptReview( root, { health, coach, jump, canJump } ) {
	const field = id => root.querySelector( `#${ id }` );
	let tab = "health";
	let page = 0;
	let selected = 0;
	let report = null;
	let generation = 0;
	let returnFocus;
	let timer;
	const create = ( tag, text, className = "" ) => Object.assign( document.createElement( tag ), { textContent: text, className } );
	function close() {
		generation++;
		clearTimeout( timer );
		root.classList.add( "hidden" );
		returnFocus?.focus( { preventScroll: true } );
	}
	function paint() {
		const body = field( "review-body" );
		body.replaceChildren();
		const options = tab === "health" ? report.sections : report.takes;
		if ( !options.length ) {
			field( "review-overview" ).textContent = tab === "health" ? "No spoken script body" : "No finished takes";
			body.append( create( "p", tab === "health" ? "No spoken script body to check." : "No finished takes yet. Read a section, pause prompting, then refresh." ) );
			field( "review-pages" ).hidden = true;
			return;
		}
		selected = Math.min( selected, options.length - 1 );
		const item = options[selected];
		let findings;
		if ( tab === "health" ) {
			field( "review-overview" ).textContent = `${ report.words } spoken-body words · about ${ clock( report.readingSeconds ) } · ${ report.findings } review prompts`;
			body.append( create( "p", `${ item.words } words · about ${ clock( item.readingSeconds ) } at ${ item.wpm } wpm${ item.target ? ` · target ${ clock( item.target ) }` : "" }${ item.pauses ? ` · timed pauses add ${ item.pauses }s in steady mode` : "" }.` ) );
			body.append( create( "p", report.notes ? "Notes mode: these estimates cover written body text only. Ad-lib delivery and page timing need a rehearsal." : "Headings, directions, code and app commands are excluded; quoted [Say: …] wording is included. Stops, ad-libs and your own beats cannot be timed in advance.", "field-hint" ) );
			findings = item.findings;
			if ( !findings.length ) body.append( create( "p", "No long-sentence or similar-word-start prompts in this section. Read it aloud to check the delivery." ) );
		} else {
			field( "review-overview" ).textContent = "Finished takes · alignment estimates; check the recording before editing";
			body.append( create( "p", paceSummary( item.section, item.pace ) ?? "No voice word timing for this take. Steady scrolling cannot measure speaking pace." ) );
			body.append( create( "p", item.coverageAvailable ? `${ item.matched } of ${ item.total } script words matched. Unmatched words can be recognition errors, intentional changes or a partial reading.` : "Sentence coverage is unavailable for this take; no missed lines are inferred.", "field-hint" ) );
			if ( item.fillers ) {
				const count = Object.values( item.fillers.fillers ).reduce( ( sum, n ) => sum + n, 0 );
				body.append( create( "p", `${ count } filler candidates recognised · ${ item.fillers.repeatedPairs } adjacent repeated-word candidates. ${ count ? Object.entries( item.fillers.fillers ).map( ( [ word, n ] ) => `${ word }: ${ n }` ).join( ", " ) + "." : "Recognition may omit fillers, so zero is not proof that none were spoken." }` ) );
				body.append( create( "p", `Counts cover ${ item.fillers.recognisedWords } recognised words while enabled and actively following. Engines may omit fillers.`, "field-hint" ) );
			} else body.append( create( "p", "Filler/repetition counting was off or unavailable. Enable it for future voice takes in Recording > Takes.", "field-hint" ) );
			body.append( create( "p", "Rereads and repeated wording may be deliberate. Scripted fillers may be counted too. This report gives review prompts, not a performance score.", "field-hint" ) );
			findings = item.coverageAvailable ? item.lines.filter( line => line.status !== "matched" || line.rereads ) : [];
			if ( item.coverageAvailable && !findings.length ) body.append( create( "p", "All saved sentence words were matched, with no logged rereads. Alignment can still miss substitutions; listen back if accuracy matters." ) );
		}
		const pages = Math.max( 1, Math.ceil( findings.length / 3 ) );
		page = Math.max( 0, Math.min( page, pages - 1 ) );
		for ( const finding of findings.slice( page * 3, page * 3 + 3 ) ) {
			const card = create( "section", "", "review-finding" );
			const message = tab === "health" ? finding.message : `${ { matched: "Matched", "partly-matched": "Partly matched", "not-matched": "Not matched", "outside-read-range": "Outside the matched reading range" }[finding.status] } · ${ finding.matched }/${ finding.total } words${ finding.rereads ? ` · ${ finding.rereads } logged reread(s)` : "" }`;
			card.append( create( "strong", message ), create( "p", shortened( finding.text ) ) );
			if ( tab === "health" && canJump() ) {
				const button = create( "button", "Open section in editor" );
				button.type = "button";
				button.addEventListener( "click", () => {
					close();
					jump( item.section );
				} );
				card.append( button );
			}
			body.append( card );
		}
		field( "review-pages" ).hidden = pages === 1;
		field( "review-page" ).textContent = `${ page + 1 } of ${ pages }`;
		field( "review-prev" ).disabled = page === 0;
		field( "review-next" ).disabled = page === pages - 1;
		body.scrollTop = 0;
	}
	async function refresh( reset = false ) {
		const id = ++generation;
		if ( reset ) {
			page = 0;
			selected = 0;
		}
		field( "review-overview" ).textContent = "Checking…";
		try {
			if ( tab === "health" && !field( "review-wpm" ).checkValidity() ) throw new Error( "Choose a default pace between 60 and 300 wpm" );
			const value = tab === "health" ? await health( Number( field( "review-wpm" ).value ) ) : await coach();
			if ( id !== generation ) return;
			report = value;
			field( "review-source" ).textContent = report.sourceLabel ?? ( tab === "health" ? "Current script" : "Current session" );
			const choices = field( "review-item" );
			choices.replaceChildren();
			for ( const item of tab === "health" ? report.sections : report.takes ) choices.append( new Option( tab === "health" ? ( item.section ? `${ item.section }. ${ item.title }` : item.title ) : `S${ item.section } · ${ item.title } · take ${ item.take } · ${ item.status }${ item.rating ? ` · ${ item.rating }` : "" }`, String( choices.options.length ) ) );
			if ( reset && tab === "coach" ) selected = Math.max( 0, choices.options.length - 1 );
			selected = Math.min( selected, Math.max( 0, choices.options.length - 1 ) );
			choices.value = selected;
			paint();
		} catch ( err ) {
			if ( id !== generation ) return;
			field( "review-overview" ).textContent = err.message;
			field( "review-body" ).replaceChildren();
			field( "review-pages" ).hidden = true;
		}
	}
	function choose( name ) {
		tab = name;
		for ( const button of root.querySelectorAll( "[data-review-tab]" ) ) {
			button.setAttribute( "aria-selected", String( button.dataset.reviewTab === tab ) );
			button.tabIndex = button.dataset.reviewTab === tab ? 0 : -1;
		}
		field( "review-pace" ).hidden = tab !== "health";
		field( "review-panel" ).setAttribute( "aria-labelledby", tab === "health" ? "review-health-tab" : "review-coach-tab" );
		field( "review-item-label" ).textContent = tab === "health" ? "Section" : "Take";
		refresh( true );
	}
	for ( const button of root.querySelectorAll( "[data-review-tab]" ) ) button.addEventListener( "click", () => choose( button.dataset.reviewTab ) );
	root.querySelector( "[role=tablist]" ).addEventListener( "keydown", ( event ) => {
		if ( ![ "ArrowLeft", "ArrowRight", "Home", "End" ].includes( event.key ) ) return;
		event.preventDefault();
		choose( event.key === "Home" ? "health" : event.key === "End" ? "coach" : tab === "health" ? "coach" : "health" );
		root.querySelector( `[data-review-tab=${ tab }]` ).focus();
	} );
	field( "review-item" ).addEventListener( "change", ( event ) => {
		selected = Number( event.target.value );
		page = 0;
		paint();
	} );
	field( "review-refresh" ).addEventListener( "click", () => refresh() );
	field( "review-wpm" ).addEventListener( "change", () => refresh() );
	field( "review-close" ).addEventListener( "click", close );
	for ( const [ id, step ] of [ [ "review-prev", -1 ], [ "review-next", 1 ] ] ) field( id ).addEventListener( "click", () => {
		page += step;
		paint();
	} );
	root.addEventListener( "mousedown", ( event ) => {
		if ( event.target === root ) close();
	} );
	root.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Escape" ) {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
		if ( event.key !== "Tab" ) return;
		const controls = [ ...root.querySelectorAll( "button:not(:disabled),input,select" ) ].filter( el => el.getClientRects().length && el.tabIndex >= 0 );
		const index = controls.indexOf( document.activeElement );
		if ( ( event.shiftKey && index <= 0 ) || ( !event.shiftKey && index === controls.length - 1 ) ) {
			event.preventDefault();
			controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
		}
	} );
	return {
		open( name = "health" ) {
			returnFocus = document.activeElement;
			root.classList.remove( "hidden" );
			choose( name );
			root.querySelector( `[data-review-tab=${ tab }]` ).focus();
		},
		changed() {
			clearTimeout( timer );
			if ( !root.classList.contains( "hidden" ) && tab === "health" ) timer = setTimeout( () => refresh(), 350 );
		}
	};
}
