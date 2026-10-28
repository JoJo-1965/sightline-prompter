// Script directives ({curly braces}): read what the script asks of the app.
// Script settings, section targets, pauses, markers and pace changes.
// decorate.js has already wrapped each directive in a .app-directive span.
// See docs/SCRIPT-DIRECTIVES.md for the syntax.

const WPM_MIN = 60;
const WPM_MAX = 300;

// "{target: 1:20, wpm: 140}" -> { target: "1:20", wpm: "140" }; "{pause}" -> { pause: true }
export function parseDirective( text ) {
	const out = {};
	for ( const part of text.replace( /^\{|\}$/g, "" ).split( "," ) ) {
		const [ rawName, ...rest ] = part.split( ":" );
		const name = rawName.trim().toLowerCase();
		if ( !name ) continue;
		out[name] = rest.join( ":" ).trim() || true;
	}
	return out;
}

// "1:20" -> 80 (seconds)
export function parseDuration( value ) {
	const match = /^(\d{1,3}):([0-5]\d)$/.exec( String( value ).trim() );
	return match ? Number( match[1] ) * 60 + Number( match[2] ) : null;
}

function parseWpm( value ) {
	const n = Math.round( Number( value ) );
	return n >= WPM_MIN && n <= WPM_MAX ? n : null;
}

// "3s" or "3" -> 3, limited to 1 to 30 seconds; true (a bare {pause}) -> 0
function parsePauseSeconds( value ) {
	if ( value === true ) return 0;
	const n = Number( String( value ).replace( /s$/i, "" ) );
	return Number.isFinite( n ) ? Math.max( 1, Math.min( 30, Math.round( n ) ) ) : 0;
}

function sectionSettings( into, d ) {
	if ( "target" in d ) {
		const seconds = parseDuration( d.target );
		if ( seconds ) into.targetSeconds = seconds;
	}
	if ( "wpm" in d ) {
		const wpm = parseWpm( d.wpm );
		if ( wpm ) into.wpm = wpm;
	}
	// notes and points are the same mode (notes is its newer name).
	if ( d.mode === "points" || d.mode === "notes" || d.mode === "script" ) into.mode = d.mode;
}

// A directive counts as part of a section heading when it's on the heading
// line, or alone on the line straight after it.
function belongsToHeading( el, heading ) {
	if ( !heading ) return false;
	if ( heading.contains( el ) ) return true;
	const line = el.closest( ".directive-line" );
	if ( !line ) return false;
	let prev = line.previousElementSibling;
	while ( prev && prev.tagName === "A" ) prev = prev.previousElementSibling;
	return prev === heading;
}

// What {prompter: …} may do at a point in the script.
export const PROMPTER_COMMANDS = [ "slower", "faster", "bigger", "smaller", "marker" ];

export function readDirectives( root ) {
	const script = {};
	const sections = []; // { heading, targetSeconds?, wpm?, mode? }
	const pauses = []; // { el, seconds } (0 = wait for the speaker)
	const markers = []; // { el, label } (label: {marker: Setup}, else null)
	const paceChanges = []; // { el, wpm }
	const listenOns = []; // { el }: {listen: on}, where voice following picks up again
	const prompterCommands = []; // { el, command }: {prompter: slower} and so on
	let current = null;
	for ( const el of root.querySelectorAll( "h2, .app-directive" ) ) {
		if ( el.tagName === "H2" ) {
			current = { heading: el };
			sections.push( current );
			continue;
		}
		if ( el.classList.contains( "unknown" ) ) continue;
		const d = parseDirective( el.textContent );
		if ( !current ) {
			if ( d.pacing === "section" || d.pacing === "session" )
				script.pacing = d.pacing;
			sectionSettings( script, d );
		} else if ( belongsToHeading( el, current.heading ) ) {
			sectionSettings( current, d );
			continue;
		}
		if ( "pause" in d ) {
			const seconds = parsePauseSeconds( d.pause );
			pauses.push( { el, seconds } );
			// A timed pause: a beat mark in voice mode (see .beat in the CSS).
			if ( seconds ) el.dataset.beat = `${ seconds }s`;
		} else if ( "stop" in d ) pauses.push( { el, seconds: 0 } );
		// {listen: off} is a stop with the microphone off; {listen: on} is where it carries on.
		if ( "listen" in d ) {
			const value = String( d.listen ).trim().toLowerCase();
			if ( value === "off" ) pauses.push( { el, seconds: 0, listen: "off" } );
			else if ( value === "on" ) listenOns.push( { el } );
		}
		if ( "prompter" in d ) {
			const command = String( d.prompter ).trim().toLowerCase();
			if ( PROMPTER_COMMANDS.includes( command ) ) prompterCommands.push( { el, command } );
		}
		if ( "marker" in d ) markers.push( { el, label: typeof d.marker === "string" ? d.marker : null } );
		if ( current && "wpm" in d && parseWpm( d.wpm ) ) {
			paceChanges.push( { el, wpm: parseWpm( d.wpm ) } );
		}
	}
	return { script, sections, pauses, markers, paceChanges, listenOns, prompterCommands };
}
