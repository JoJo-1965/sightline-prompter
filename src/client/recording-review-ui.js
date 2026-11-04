const byId = id => document.getElementById( id );
let state = null;
const element = ( tag, text, className ) => { const node = document.createElement( tag ); node.textContent = text; if ( className ) node.className = className; return node; };
const number = value => Number.isFinite( value ) ? value.toFixed( 3 ).replace( /0+$/, "" ).replace( /\.$/, "" ) : "unknown";

async function action( name, args = {} ) {
	try { render( await window.recordingReview.action( name, args ) ); } catch ( error ) { byId( "status" ).textContent = error.message; }
}
function listen( start ) {
	if ( !state?.reference ) return;
	if ( byId( "reference-offset" ).value.trim() === "" ) { byId( "status" ).textContent = "Confirm the reference file's session start before listening by session time."; return; }
	const offset = Number( byId( "reference-offset" ).value );
	if ( !Number.isFinite( offset ) ) return;
	const player = byId( "player" ); player.currentTime = Math.max( 0, start - offset - 1 ); player.play().catch( () => {} );
}
function render( next ) {
	state = next;
	byId( "status" ).textContent = next.error ?? next.message;
	for ( const button of document.querySelectorAll( "button" ) ) if ( button.id !== "help" && button.id !== "cancel" ) button.disabled = next.busy;
	for ( const input of document.querySelectorAll( "input,select" ) ) input.disabled = next.busy;
	byId( "cancel" ).disabled = !next.busy;
	byId( "session-summary" ).textContent = next.source ? `${ next.source.name } · ${ next.source.takes } take${ next.source.takes === 1 ? "" : "s" }` : "No session selected";
	byId( "reference-summary" ).textContent = next.reference?.name ?? "No reference soundtrack selected";
	if ( next.reference ) {
		if ( byId( "player" ).src !== next.reference.url ) { byId( "player" ).src = next.reference.url; byId( "reference-offset" ).value = next.reference.startS ?? ""; }
		if ( document.activeElement !== byId( "reference-offset" ) && next.reference.startS !== null ) byId( "reference-offset" ).value = next.reference.startS;
	}
	byId( "runtime-summary" ).textContent = next.runtime ? `${ next.runtime.engine } ${ next.runtime.version ?? "" } · model ${ next.runtime.modelReady ? "ready" : "not downloaded" }` : "Choose and check the optional Python environment";
	byId( "transcribe" ).disabled = next.busy || !next.source || !next.reference || !next.runtime?.modelReady;
	byId( "download" ).disabled = next.busy || !next.runtime;
	byId( "import" ).disabled = next.busy || !next.source;
	byId( "export" ).disabled = next.busy || !next.report;
	byId( "transcript-summary" ).textContent = next.transcripts.length ? next.transcripts.map( t => `${ t.name }: ${ t.words } words · ${ t.sourceClock === "session" ? "session clock" : `file zero at session ${ number( t.offsetS ) } s` }` ).join( "; " ) : "No post-record transcript yet.";
	const recordings = byId( "recordings" ); recordings.replaceChildren();
	for ( const file of next.media ) {
		const row = element( "div", "", "recording-item" ); row.append( element( "strong", file.name ) );
		const status = file.offset;
		row.append( element( "p", status ? status.status === "measured" ? `Audio offset ${ number( status.sessionOffsetS ) } s · uncertainty ±${ number( status.uncertaintyS ) } s · three waveform checks` : "Uncertain match. No offset is applied; inspect the evidence." : "Not measured yet" ) );
		const button = element( "button", "Measure audio offset" ); button.disabled = next.busy || !next.reference; button.addEventListener( "click", () => action( "sync", { id: file.id, offsetS: byId( "reference-offset" ).value } ) ); row.append( button ); recordings.append( row );
	}
	const review = byId( "review-takes" ); review.replaceChildren();
	byId( "review-summary" ).textContent = next.report ? `${ next.report.takes.length } take comparisons. Review suggestions by listening; the source log and keeper choices are unchanged.` : "Transcribe or import to compare with the script.";
	for ( const take of next.report?.takes ?? [] ) {
		const row = element( "article", "", "take" ), title = element( "div", "", "take-summary" );
		title.append( element( "h3", `Section ${ take.section } · Take ${ take.take }` ), element( "span", take.status === "unavailable" ? "No transcript range" : `${ Math.round( ( take.coverage ?? 0 ) * 100 ) }% script match`, "badge" ) ); row.append( title );
		if ( take.reason ) row.append( element( "p", take.reason, "hint" ) );
		if ( take.heardText ) row.append( element( "p", `Heard: ${ take.heardText }` ) );
		if ( take.expectedText ) row.append( element( "p", `Script: ${ take.expectedText }`, "hint" ) );
		for ( const issue of take.issues ) {
			const item = element( "div", "", "candidate" );
			item.append( element( "span", issue.kind ), element( "span", `${ issue.expected || "—" } → ${ issue.heard || "—" } · ${ issue.priority }` ) );
			const button = element( "button", "Listen" ); button.disabled = !next.reference || next.busy; button.addEventListener( "click", () => listen( issue.start ) ); item.append( button ); row.append( item );
		}
		if ( !take.issues.length ) row.append( element( "p", "No delivery difference identified. Listening is still required.", "hint" ) );
		review.append( row );
	}
	const commands = byId( "commands" ); commands.replaceChildren();
	byId( "commands-summary" ).textContent = `Command cut ranges (${ next.report?.commandRanges.length ?? 0 })`;
	for ( const command of next.report?.commandRanges ?? [] ) {
		const row = element( "div", "", "candidate" ); row.append( element( "span", `${ number( command.start ) }–${ number( command.end ) } s` ), element( "span", `${ command.heard } · ${ command.outcome }` ) );
		const button = element( "button", "Listen" ); button.disabled = !next.reference || next.busy; button.addEventListener( "click", () => listen( command.start ) ); row.append( button ); commands.append( row );
	}
}
for ( const name of [ "choose-log", "choose-reference", "choose-python", "check", "download", "add-media", "cancel", "export", "help" ] ) byId( name ).addEventListener( "click", () => action( name ) );
byId( "transcribe" ).addEventListener( "click", () => action( "transcribe", { offsetS: byId( "reference-offset" ).value } ) );
byId( "import-clock" ).addEventListener( "change", () => byId( "import-offset-label" ).hidden = byId( "import-clock" ).value !== "file" );
byId( "import" ).addEventListener( "click", () => action( "import", { clock: byId( "import-clock" ).value, offsetS: byId( "import-offset" ).value } ) );
window.recordingReview.onState( render );
await action( "state" );
