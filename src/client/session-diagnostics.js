// Session-only information. Recognised command text is never persisted here.
export function createSessionDiagnostics( { clock = Date.now } = {} ) {
	let microphone = null, listener = null, command = null, expiry;
	const text = value => String( value ?? "" ).replace( /[\r\n\t]+/g, " " ).slice( 0, 200 );
	return {
		input( value ) {
			microphone = { input: text( value.input ), requested: value.requested, applied: Object.fromEntries( [ "autoGainControl", "noiseSuppression", "echoCancellation", "sampleRate", "channelCount" ].map( key => [ key, value.applied?.[key] ?? "not reported" ] ) ), at: clock() };
		},
		listening( value ) {
			listener = { state: text( value.state ), reason: text( value.reason ), at: clock() };
		},
		command( value ) {
			command = { ...command, ...Object.fromEntries( [ "heard", "action", "outcome", "reason" ].filter( key => key in value ).map( key => [ key, text( value[key] ) ] ) ), at: clock() };
			clearTimeout( expiry );
			expiry = setTimeout( () => {
				command = null;
			}, 10 * 60000 );
			expiry.unref?.();
		},
		clear() {
			clearTimeout( expiry );
			command = null;
		},
		snapshot( { includeWords = true } = {} ) {
			if ( command && clock() - command.at > 10 * 60000 ) {
				clearTimeout( expiry );
				command = null;
			}
			const current = command ? { ...command } : null;
			if ( current && !includeWords ) delete current.heard;
			return { microphone, listener, command: current };
		}
	};
}

export function diagnosticRows( value, obs = {} ) {
	const input = value.microphone;
	const flags = input ? [ "autoGainControl", "noiseSuppression", "echoCancellation" ].map( key => `${ { autoGainControl: "AGC", noiseSuppression: "noise suppression", echoCancellation: "echo cancellation" }[key] }: ${ input.applied[key] === true ? "on" : input.applied[key] === false ? "off" : "not reported" }` ).join( " · " ) : "Start listening or a sound check to inspect the applied input.";
	const command = value.command;
	return [
		[ "Opened microphone", input ? `${ input.input || "Unnamed input" } (${ input.requested ?? "input" })` : "Not opened in this session" ],
		[ "Input processing", flags ],
		[ "Listening", value.listener ? `${ value.listener.state }${ value.listener.reason ? ` · ${ value.listener.reason }` : "" }` : "No listener update yet" ],
		[ "Last command heard", command?.heard || "No recent command words" ],
		[ "Command result", command ? [ command.action, command.outcome, command.reason ].filter( Boolean ).join( " · " ) : "No recent command attempt" ],
		[ "OBS connection", obs.enabled ? obs.connection ?? "unknown" : "disabled" ],
		[ "OBS recording", obs.enabled ? `${ obs.recording ?? "unknown" }${ obs.controls ? " · recording controls allowed" : " · status only" }` : "integration disabled" ],
		[ "OBS detail", !obs.enabled ? "OBS is disabled" : obs.error || ( obs.identityUncertain ? "Recording continuity needs review after the connection gap" : obs.outputPath ? "Output filename received; see the session's recording links" : "An output filename may arrive when OBS stops recording" ) ]
	];
}
