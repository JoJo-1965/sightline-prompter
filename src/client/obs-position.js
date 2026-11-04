// OBS timestamps are observations, not frame-accurate camera synchronisation.
export function obsPosition( state, now = Date.now() ) {
	if ( !state?.recordingId ) return null;
	const sampleAt = Date.parse( state.durationObservedAt );
	const ageMs = Number.isFinite( sampleAt ) ? now - sampleAt : null;
	const usable = state.connection === "connected" && [ "recording", "paused" ].includes( state.recording ) && state.fileClockUnknown !== true && Number.isFinite( state.outputDuration ) && ageMs !== null && ageMs >= 0 && ageMs <= 5000;
	return {
		recordingId: state.recordingId, outputPath: state.outputPath ?? null,
		recording: state.recording, observedAt: new Date( now ).toISOString(),
		seconds: usable ? Math.max( 0, Math.round( state.outputDuration + ( state.recording === "recording" ? ageMs : 0 ) ) / 1000 ) : null,
		sampleAt: state.durationObservedAt ?? null, ageMs, estimated: true,
		quality: usable ? "recent OBS clock sample; validate against recorded sync" : state.fileClockUnknown ? "split-file clock offset unverified" : ageMs < 0 ? "clock sample is later than this event" : state.recording === "stopped" ? "not recording at this observation" : "clock unavailable or stale"
	};
}
