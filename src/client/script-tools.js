// Authoring templates only. Runtime syntax remains in script-directives.json.
export const SCRIPT_TOOL_GROUPS = [
	{ id: "directions", label: "Directions" },
	{ id: "pointing", label: "Pointing" },
	{ id: "notes", label: "Notes & sections" },
	{ id: "pace", label: "Pace & pauses" },
	{ id: "recording", label: "Recording & audio" },
	{ id: "actions", label: "App actions" }
];

const tool = ( id, group, label, text, hint, value = null, block = false ) => ( { id, group, label, text, hint, value, block } );
export const SCRIPT_TOOLS = [
	...[
		[ "smile", "Smile", "A silent delivery reminder." ],
		[ "breathe", "Breathe", "Take a natural breath." ],
		[ "pause", "Pause / beat", "Speaker cue only; does not stop the app." ],
		[ "look into the lens", "Look into the lens", "Eye-contact reminder." ],
		[ "direction", "Custom direction", "Replace the selected words with your cue." ]
	].map( ( [ cue, label, hint ] ) => tool( `cue-${ cue.replaceAll( " ", "-" ) }`, "directions", label, `[${ cue }]`, hint, cue === "direction" ? cue : null ) ),
	...[ "left", "right", "up", "down", "up-left", "up-right", "down-left", "down-right", "centre" ].map( direction => tool( `point-${ direction }`, "pointing", `Point ${ direction.replaceAll( "-", " " ) }`, `[point ${ direction }: graphic-label]`, "Your left/right as the presenter. Edit the graphic label.", "graphic-label" ) ),
	tool( "production-note", "notes", "Production note", "<!-- Production note -->", "Shown while paused; hidden during delivery. Always silent.", "Production note", true ),
	tool( "section", "notes", "Section heading", "## Section heading", "Starts a new section.", "Section heading", true ),
	tool( "page-heading", "notes", "Notes page heading", "# Page heading", "Starts a page in Notes mode.", "Page heading", true ),
	tool( "page", "notes", "Page break", "{page}", "New page in Notes mode.", null, true ),
	tool( "mode-notes", "notes", "Notes mode", "{mode: notes}", "Place at the script start or just after a section heading.", null, true ),
	tool( "mode-script", "notes", "Script mode", "{mode: script}", "Place at the script start or just after a section heading.", null, true ),
	tool( "stop", "pace", "Section boundary / stop", "{stop}", "Voice continues to the next passage; Scroll holds.", null, true ),
	tool( "pause", "pace", "Hold scrolling", "{pause}", "Scroll holds until continued. Voice ignores this code." ),
	tool( "timed-pause", "pace", "Timed pause", "{pause: 3s}", "Scroll only, 1–30 seconds.", "3s" ),
	tool( "wpm", "pace", "Pace target", "{wpm: 140}", "Target words per minute; edit the selected number.", "140" ),
	tool( "target", "pace", "Duration target", "{target: 1:00}", "Script or section start. Use target or WPM, rather than both.", "1:00", true ),
	tool( "pacing-section", "pace", "Time each section", "{pacing: section}", "Script start: separate section timing.", null, true ),
	tool( "pacing-session", "pace", "Time the whole script", "{pacing: session}", "Script start: one session timer.", null, true ),
	...[ [ "on", "Start recording" ], [ "off", "Finish recording" ], [ "pause", "Pause recording" ], [ "resume", "Resume recording" ] ].map( ( [ value, label ] ) => tool( `record-${ value }`, "recording", label, `{record: ${ value }}`, "Runs when reached during delivery with OBS controls enabled." ) ),
	tool( "soundcheck-room", "recording", "Room noise check", "{soundcheck: room}", "Stay quiet for the room baseline.", null, true ),
	tool( "soundcheck-voice", "recording", "Voice check", "{soundcheck: voice}", "Sampling starts when you speak; up to ten seconds.", null, true ),
	tool( "listen-off", "recording", "Go off script", "{listen: off}", "Mutes listening and holds prompting. Resume with a non-voice control.", null, true ),
	tool( "listen-on", "recording", "Return to the script", "{listen: on}", "Place where scripted reading should pick up again.", null, true ),
	tool( "marker", "actions", "Named edit marker", "{marker: Setup}", "Bookmark in the take log and edit pack.", "Setup" ),
	...[ "slower", "faster", "bigger", "smaller", "marker" ].map( action => tool( `prompter-${ action }`, "actions", `${ action[0].toUpperCase() }${ action.slice( 1 ) }`, `{prompter: ${ action }}`, "Runs when reading reaches this point." ) )
];

export function scriptToolEdit( source, from, to, id ) {
	const item = SCRIPT_TOOLS.find( entry => entry.id === id );
	if ( !item || !Number.isInteger( from ) || !Number.isInteger( to ) || from < 0 || to < from || to > source.length ) throw new Error( "Choose a script tool and a valid editor position." );
	const before = source.slice( 0, from ), after = source.slice( to );
	const prefix = item.block && before ? "\n".repeat( Math.max( 0, 2 - ( before.match( /\n*$/ )[0].length ) ) ) : "";
	const suffix = item.block ? "\n".repeat( Math.max( 0, 2 - ( after.match( /^\n*/ )[0].length ) ) ) : "";
	const insert = prefix + item.text + suffix;
	const start = from + prefix.length + ( item.value ? item.text.indexOf( item.value ) : item.text.length );
	return { from, to, insert, anchor: start, head: start + ( item.value?.length ?? 0 ) };
}
