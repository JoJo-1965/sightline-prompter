export function readingMode( settings, scriptMode = null, override = null ) {
	if ( [ "notes", "voice", "scroll" ].includes( override ) ) return override;
	if ( [ "notes", "points" ].includes( scriptMode ) || settings.pointsMode ) return "notes";
	return settings.scrollMode === "voice" ? "voice" : "scroll";
}

export function readingModePatch( mode, { busy = false, editing = false, voice = true } = {} ) {
	if ( busy || editing ) throw new Error( "Pause prompting before changing reading mode." );
	if ( ![ "notes", "voice", "scroll" ].includes( mode ) ) throw new Error( "Choose Voice, Page or Scroll." );
	if ( mode === "voice" && !voice ) throw new Error( "Enable speech features and microphone input in Voice settings first." );
	return { pointsMode: mode === "notes", ...( mode === "notes" ? {} : { scrollMode: mode === "voice" ? "voice" : "steady" } ) };
}
