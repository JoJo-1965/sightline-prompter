// "Prompter, pause": spoken commands. A command is the wake word followed by
// one of the phrases below, at the END of what you say (you stop talking
// straight after it), so a script line such as "the prompter pauses" never
// counts. Words after the wake word are held back until the phrase ends;
// if they turn out not to be a command they go on to the script follower.
//
// The on-device recogniser mishears some short words ("pause" as "paws",
// "resync" as "rezinc"), so each command lists what it tends to hear, and
// close matches count too.

const WAKE = new Set( [ "prompter", "promptor", "prompters", "promoter" ] );

export const COMMANDS = [
	{
		id: "pause",
		phrases: [
			"pause",
			"paws",
			"paus",
			"pours",
			"pores",
			"hawse",
			"stop",
			"hold",
			"hold on",
			"wait"
		]
	},
	{
		id: "go",
		phrases: [
			"go",
			"go on",
			"start",
			"play",
			"resume",
			"continue",
			"carry on",
			"carrion",
			"goat",
			"get going",
			"keep going"
		]
	},
	{ id: "slower", phrases: [ "slower", "slow down", "slowdon", "slow" ] },
	{ id: "faster", phrases: [ "faster", "speed up", "quicker" ] },
	{
		id: "back",
		phrases: [
			"back",
			"go back",
			"previous",
			"previous section",
			"back a section",
			"previous page",
			"page back",
			"back a page"
		]
	},
	{ id: "next", phrases: [ "next", "next section", "skip", "skip ahead", "next page", "page forward" ] },
	{
		id: "top",
		phrases: [
			"top",
			"the top",
			"from the top",
			"back to the top",
			"start again",
			"start over"
		]
	},
	{
		// Back to the top with the speed and the pacing clock reset too.
		id: "reset",
		phrases: [ "reset", "restart", "reset everything", "reset all", "full reset" ]
	},
	{
		id: "retake",
		phrases: [
			"again",
			"retake",
			"take it again",
			"try again",
			"one more time",
			"once more"
		]
	},
	{
		id: "back-to-marker",
		phrases: [ "back to the marker", "from the marker", "back to marker", "last marker", "to the marker", "from the last marker" ]
	},
	{
		id: "marker",
		phrases: [
			"marker",
			"marka",
			"mark",
			"mark it",
			"mark that",
			"drop a marker"
		]
	},
	{
		id: "keeper",
		phrases: [
			"keeper",
			"kipper",
			"keepa",
			"keep",
			"keep it",
			"keep that",
			"thats a keeper",
			"good take"
		]
	},
	{
		id: "scrap",
		phrases: [
			"scrap",
			"scrap that",
			"scrap it",
			"scrub that",
			"bin that",
			"bin it",
			"ditch that",
			"bad take",
			"no good"
		]
	},
	{
		id: "resync",
		phrases: [
			"resync",
			"re sync",
			"rezinc",
			"recinc",
			"resink",
			"re sink",
			"sync",
			"find me",
			"where am i",
			"catch up"
		]
	},
	{ id: "bigger", phrases: [ "bigger", "larger" ] },
	{ id: "smaller", phrases: [ "smaller" ] },
	{
		id: "help",
		phrases: [
			"what can i say",
			"what can i say now",
			"what do i say",
			"help",
			"commands",
			"show commands",
			"list commands",
			"what are the commands"
		]
	}
];

// What each command does, for the "Prompter, what can I say?" card and the
// help: [ what to say, what it does ].
export const COMMAND_HELP = [
	[ "pause", "Pause (stop, hold, wait)" ],
	[ "go", "Start, or carry on (carry on, continue)" ],
	[ "slower · faster", "Change the speed" ],
	[ "back", "Back to the start of this section" ],
	[ "next section", "On to the next section" ],
	[ "from the top", "Back to the start" ],
	[ "reset", "Back to the start, with the speed and clock reset" ],
	[ "section 3", "Go to that section (also without “Prompter”)" ],
	[ "again", "A retake: back to the start of this section" ],
	[ "marker", "Drop a marker for the edit" ],
	[ "back to the marker", "Read again from the last marker" ],
	[ "keeper · scrap that", "Rate this take" ],
	[ "resync", "Voice mode: find your place again" ],
	[ "bigger · smaller", "Text size" ],
	[ "what can I say", "This list" ]
];

const normalize = word => word.toLowerCase().replace( /[^\w]/g, "" );

// "Section 3", "section three", or how the recogniser tends to hear it
// ("section to", "section for"): the section number, else null.
const NUMBER_WORDS = {
	one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, fore: 4,
	five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11,
	twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
	seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};

export function sectionNumber( words ) {
	const said = words.map( normalize ).filter( Boolean );
	if ( said.length !== 2 || said[0] !== "section" ) return null;
	const n = /^\d+$/.test( said[1] ) ? Number( said[1] ) : NUMBER_WORDS[said[1]];
	return n >= 1 && n <= 99 ? n : null;
}

function distance( a, b ) {
	const row = Array.from( { length: b.length + 1 }, ( _, j ) => j );
	for ( let i = 1; i <= a.length; i++ ) {
		let prev = row[0];
		row[0] = i;
		for ( let j = 1; j <= b.length; j++ ) {
			const keep = row[j];
			row[j] = Math.min(
				row[j] + 1,
				row[j - 1] + 1,
				prev + ( a[i - 1] === b[j - 1] ? 0 : 1 )
			);
			prev = keep;
		}
	}
	return row[b.length];
}

// The command the words after the wake word are, or null. Exact phrases win;
// otherwise the closest phrase if it is near enough (never for very short
// words, where one letter changes the meaning).
export function matchCommand( words ) {
	const said = words.map( normalize ).filter( Boolean ).join( " " );
	if ( !said || words.length > 4 ) return null;
	let best = null;
	for ( const command of COMMANDS ) {
		for ( const phrase of command.phrases ) {
			if ( phrase === said ) return command.id;
			if ( phrase.length < 4 || said.length < 4 ) continue;
			const score
				= 1 - distance( phrase, said ) / Math.max( phrase.length, said.length );
			if ( score >= 0.72 && ( !best || score > best.score ) )
				best = { id: command.id, score };
		}
	}
	return best?.id ?? null;
}

// take( words, final ) returns the words that are not part of a command, for
// the script follower. `final` is true when the speaker has paused (the end
// of a phrase). Commands are reported through onCommand( id ).
// isPaused(): while voice scrolling is paused by "Prompter, pause", a phrase
// that is only "go" (or "carry on", "continue"…) resumes it without the wake
// word, in case the start of "Prompter" was lost after the quiet.
// onWake() fires as soon as the wake word is heard, so the speaker knows
// it's listening; onMiss( words ) when a short phrase after it isn't a
// command.
export function createCommandListener( { onCommand, onWake = () => {}, onMiss = () => {}, isPaused = () => false } ) {
	let held = null; // words from the wake word on, waiting for the phrase to end
	let heldAt = 0;
	let phrase = []; // every word of the phrase so far

	return function take( words, final ) {
		phrase.push( ...words );
		const whole = phrase;
		if ( final ) phrase = [];
		// "Section 3" said on its own (a spoken slate): go to that section,
		// with or without the wake word.
		if ( final && !held ) {
			const n = sectionNumber( whole );
			if ( n ) {
				onCommand( "section", n );
				return [];
			}
		}
		if ( final && !held && isPaused() ) {
			const said = whole.map( normalize ).filter( Boolean ).join( " " );
			const go = COMMANDS.find( c => c.id === "go" );
			if ( go.phrases.includes( said ) ) {
				onCommand( "go" );
				return [];
			}
		}
		const pass = [];
		for ( const word of words ) {
			if ( held ) held.push( word );
			else if ( WAKE.has( normalize( word ) ) ) {
				held = [ word ];
				heldAt = Date.now();
				onWake();
			} else pass.push( word );
			// A long run after the wake word isn't a command: let it go.
			if ( held && held.length > 5 ) {
				pass.push( ...held );
				held = null;
			}
		}
		// "Prompter … go": a little pause after the wake word ends the phrase
		// there, so a wake word on its own waits for the next phrase.
		if ( held && final && held.length === 1 && Date.now() - heldAt < 3000 )
			return pass;
		if ( held && ( final || Date.now() - heldAt > 4000 ) ) {
			const n = final ? sectionNumber( held.slice( 1 ) ) : null;
			const id = final && !n ? matchCommand( held.slice( 1 ) ) : null;
			if ( n ) onCommand( "section", n );
			else if ( id ) onCommand( id );
			else {
				// Something short after "Prompter" that isn't a command is worth a
				// word; a script line that mentions the prompter is longer.
				if ( final && held.length > 1 && held.length <= 4 ) onMiss( held.slice( 1 ) );
				pass.push( ...held );
			}
			held = null;
		}
		return pass;
	};
}
