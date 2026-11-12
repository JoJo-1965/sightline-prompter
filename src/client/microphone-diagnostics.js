// Device names and processing flags help local support;
// Omit persistent IDs.
export function microphoneDiagnostics( stream, requested = "default" ) {
	const track = stream?.getAudioTracks?.()[0];
	const applied = track?.getSettings?.() ?? {};
	return {
		requested: requested && requested !== "default" ? "selected input" : "system default",
		input: track?.label || "Unnamed microphone",
		applied: Object.fromEntries( [ "autoGainControl", "noiseSuppression", "echoCancellation", "sampleRate", "channelCount" ].map( key => [ key, applied[key] ?? "not reported" ] ) )
	};
}
