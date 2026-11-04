// A reminder after confirmed recorder start, never a fabricated sync pass.
export function createSyncReminder( { getSettings, canShow = () => true, notify } ) {
	const seen = new Set();
	return {
		observe( state ) {
			if ( state?.connection !== "connected" || state.recording !== "recording" || !state.recordingId ) return false;
			if ( seen.has( state.recordingId ) || !canShow() ) return false;
			const settings = getSettings();
			seen.add( state.recordingId ); if ( seen.size > 100 ) seen.delete( seen.values().next().value );
			if ( !settings.obsEnabled || ( settings.slate !== "off" && settings.obsRecordedSlate ) ) return false;
			notify( "Recording confirmed. Capture a visible clap or verify the slate in this recording before your first line." );
			return true;
		}
	};
}
