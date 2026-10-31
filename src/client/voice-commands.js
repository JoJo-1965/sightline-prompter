// "Prompter, pause": spoken commands. A command is the wake word followed by
// one of the phrases below, at the END of what you say (you stop talking
// straight after it), so a script line such as "the prompter pauses" never
// counts. Words after the wake word are held back until the phrase ends;
// if they turn out not to be a command they go on to the script follower.
//
// The on-device recogniser mishears some short words ("pause" as "paws",
// "resync" as "rezinc"), so each command lists what it tends to hear, and
// Settings > Voice > Your words adds your own
// (commandWords: [{ id: "wake" or a command id, heard: [ … ] }]), and with
// soundAlike a word that sounds like the wake word or a command counts.

import { soundKey } from "./sound-alike.js";
import { heardForms } from "./word-fixes.js";

// The wake word, chosen in Settings > Voice, with what the recogniser tends
// to hear for it.
export const WAKE_WORDS = {
	prompter: { label: "Prompter", heard: [ "prompter", "promptor", "prompters", "promoter" ] },
	computer: { label: "Computer", heard: [ "computer", "computers", "compuder" ] },
	teleprompter: { label: "Teleprompter", heard: [ "teleprompter", "teleprompters", "teleprompt", "tele prompter" ] },
	director: { label: "Director", heard: [ "director", "directors", "directa" ] }
};

export const wakeLabel = key => ( WAKE_WORDS[key] ?? WAKE_WORDS.prompter ).label;

export const COMMANDS = [
	{ id: "guide-on", phrases: [ "guide on", "show guide", "show the guide", "head guide on" ] },
	{ id: "guide-off", phrases: [ "guide off", "hide guide", "hide the guide", "head guide off" ] },
	{ id: "obs-record", phrases: [ "record take", "start recording" ] },
	{ id: "obs-finish", phrases: [ "finish recording", "stop recording" ] },
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
	{ id: "close", phrases: [ "close", "cancel", "close that", "close it", "hide", "dismiss", "never mind" ] },
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
	[ "guide on · guide off", "Show or hide the head-position guide", "Guide" ],
	[ "record take · finish recording", "OBS only, when enabled with recording controls" ],
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
	[ "what can I say", "This list" ],
	[ "close", "Hide this list (cancel)" ]
];

const normalize = word => word.toLowerCase().replace( /[^\w]/g, "" );

// Sound alike: the same sound key, the same first letter and about as long,
// and never very short words ("go", "top"), where too much sounds alike.
function soundsLike( a, b ) {
	const close = a[0] === b[0] && Math.abs( a.length - b.length ) <= 3;
	return a.length >= 4 && b.length >= 4 && close && soundKey( a ) === soundKey( b );
}

// Settings > Voice > Your words > Command words, as { wake: [ … ], pause: [ … ] }.
export function commandExtras( commandWords ) {
	const extra = {};
	for ( const entry of commandWords ?? [] ) {
		if ( !entry?.id ) continue;
		( extra[entry.id] ??= [] ).push( ...heardForms( entry.heard ) );
	}
	return extra;
}

// "Section 3", "section three", or how the recogniser tends to hear it
// ("section to", "section for"): the section number, else null.
const NUMBER_WORDS = {
	one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, fore: 4,
	five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11,
	twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
	seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export function sectionNumber( words ) {
	const said = words.flatMap( w => w.split( "-" ) ).map( normalize ).filter( Boolean );
	if ( said[0] !== "section" || said.length < 2 || said.length > 3 ) return null;
	let n = /^\d+$/.test( said[1] ) ? Number( said[1] ) : NUMBER_WORDS[said[1]] ?? TENS[said[1]];
	if ( said.length === 3 ) {
		const unit = NUMBER_WORDS[said[2]];
		n = TENS[said[1]] && unit >= 1 && unit <= 9 ? TENS[said[1]] + unit : null;
	}
	return n >= 1 && n <= 99 ? n : null;
}

// Exact built-in phrases win. Taught forms must identify just one command.
// Optional phonetics compare each word, preserving short words such as on/off.
// Recording and guide states require explicit phrases, never guessed matches.
export function matchCommand( words, { extra = {}, soundAlike = false } = {} ) {
	const tokens = words.map( normalize ).filter( Boolean );
	const said = tokens.join( " " );
	if ( !said ) return null;
	const builtIn = COMMANDS.find( c => c.phrases.includes( said ) );
	if ( builtIn ) return builtIn.id;
	const exact = COMMANDS.filter( c => extra[c.id]?.includes( said ) );
	if ( exact.length ) return exact.length === 1 ? exact[0].id : null;
	if ( !soundAlike ) return null;
	const matches = new Set();
	for ( const command of COMMANDS ) {
		if ( command.id.startsWith( "guide-" ) || command.id.startsWith( "obs-" ) ) continue;
		for ( const phrase of [ ...command.phrases, ...( extra[command.id] ?? [] ) ] ) {
			const expected = phrase.split( " " );
			if ( expected.length === tokens.length && expected.every( ( w, i ) => w === tokens[i] || soundsLike( w, tokens[i] ) ) ) matches.add( command.id );
		}
	}
	return matches.size === 1 ? [ ...matches ][0] : null;
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
export function createCommandListener( {
	onCommand,
	onWake = () => {},
	onMiss = () => {},
	isPaused = () => false,
	wakeWord = "prompter",
	commandWords = [], // Settings > Voice > Your words > Command words
	soundAlike = false,
	clock = Date.now
} ) {
	const extra = commandExtras( commandWords );
	const wakeKey = WAKE_WORDS[wakeWord] ? wakeWord : "prompter";
	const wakePhrases = [ ...WAKE_WORDS[wakeKey].heard, ...( extra.wake ?? [] ) ];
	const isWake = text => wakePhrases.includes( text ) || ( !text.includes( " " ) && soundAlike && soundsLike( text, wakeKey ) );
	const options = { extra, soundAlike };
	const goPhrases = [ ...COMMANDS.find( c => c.id === "go" ).phrases, ...( extra.go ?? [] ) ];
	const maxWords = Math.max( ...COMMANDS.flatMap( c => [ ...c.phrases, ...( extra[c.id] ?? [] ) ].map( p => p.split( " " ).length ) ) );
	let pending = []; // possible wake phrase, bare section or paused resume
	let held = null; // { wake, words, at }: an acknowledged wake word
	let atStart = true;
	const textOf = words => words.map( normalize ).filter( Boolean ).join( " " );
	const bareCommand = ( words ) => {
		const n = sectionNumber( words );
		if ( n ) return [ "section", n ];
		return isPaused() && matchCommand( words, { extra } ) === "go" ? [ "go" ] : null;
	};
	const barePrefix = ( words ) => {
		const text = textOf( words );
		const tens = words.length === 2 && normalize( words[0] ) === "section" && TENS[normalize( words[1] )];
		return text === "section" || !!tens || !!bareCommand( words ) || ( isPaused() && goPhrases.some( p => p.startsWith( `${ text } ` ) ) );
	};

	return function take( words, final ) {
		const pass = [];
		// Expire before accepting more words: a later "reset" must not use an
		// old wake word. No growing whole-phrase buffer during ordinary reading.
		if ( held && clock() - held.at > 4000 ) {
			pass.push( ...held.wake, ...held.words );
			held = null;
		}
		for ( const word of words ) {
			if ( held ) {
				held.words.push( word );
				// A repeated wake word starts a fresh request.
				const repeated = [ 3, 2, 1 ].find( n => held.words.length >= n && isWake( textOf( held.words.slice( -n ) ) ) );
				if ( repeated ) {
					if ( held.words.length > repeated ) pass.push( ...held.wake, ...held.words.slice( 0, -repeated ) );
					held = { wake: held.words.slice( -repeated ), words: [], at: clock() };
					onWake();
				} else if ( held.words.length > maxWords ) {
					pass.push( ...held.wake, ...held.words );
					held = null;
					atStart = false;
				}
				continue;
			}
			pending.push( word );
			while ( pending.length ) {
				const text = textOf( pending );
				if ( isWake( text ) ) {
					held = { wake: pending, words: [], at: clock() };
					pending = [];
					onWake();
					break;
				}
				if ( wakePhrases.some( p => p.startsWith( `${ text } ` ) ) || ( atStart && barePrefix( pending ) ) ) break;
				pass.push( pending.shift() );
				atStart = false;
			}
		}
		if ( final ) {
			if ( held?.words.length ) {
				const n = sectionNumber( held.words );
				const id = n ? null : matchCommand( held.words, options );
				if ( n ) onCommand( "section", n );
				else if ( id ) onCommand( id );
				else {
					if ( held.words.length <= 3 ) onMiss( held.words );
					pass.push( ...held.wake, ...held.words );
				}
				held = null;
			}
			const bare = atStart && bareCommand( pending );
			if ( bare ) onCommand( ...bare );
			else pass.push( ...pending );
			pending = [];
			atStart = true;
		}
		return pass;
	};
}
