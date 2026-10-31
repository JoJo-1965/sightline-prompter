// OBS timestamps are observations, not frame-accurate camera synchronisation.
export function obsPosition( state, now = Date.now() ) {
	if ( !state?.recordingId ) return null;
	const sampleAt = Date.parse( state.durationObservedAt );
	const ageMs = Number.isFinite( sampleAt ) ? now - sampleAt : null;
	const usable = state.connection === "connected" && [ "recording", "paused", "stopped" ].includes( state.recording ) && state.fileClockUnknown !== true && Number.isFinite( state.outputDuration ) && ageMs !== null && Math.abs( ageMs ) <= 5000;
	return {
		recordingId: state.recordingId, outputPath: state.outputPath ?? null,
		recording: state.recording, observedAt: new Date( now ).toISOString(),
		seconds: usable ? Math.max( 0, Math.round( state.outputDuration + ( state.recording === "recording" ? ageMs : 0 ) ) / 1000 ) : null,
		sampleAt: state.durationObservedAt ?? null, ageMs, estimated: true,
		quality: usable ? "recent OBS clock sample; validate against recorded sync" : state.fileClockUnknown ? "split-file clock offset unverified" : "clock unavailable or stale"
	};
}
