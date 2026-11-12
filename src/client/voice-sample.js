// A local level gate, not speech recognition. Quiet input never passes a check.
// All times are milliseconds from the caller's monotonic/sample clock.
export function createVoiceSample( { noise = -65, armAt = 0, silence = 1200, maximum = 10000 } = {} ) {
	const threshold = Math.max( -60, noise + 9 );
	let onset = null, lastVoice = null, candidate = null, voiced = 0, previous = armAt;
	return {
		sample( at, level ) {
			const delta = Math.max( 0, Math.min( 150, at - previous ) );
			previous = at;
			if ( at < armAt ) return { phase: "waiting", remaining: 10 };
			if ( Number.isFinite( level ) && level > threshold ) {
				candidate ??= at;
				if ( at - candidate >= 150 ) onset ??= candidate;
				if ( onset !== null ) {
					lastVoice = at;
					voiced += delta;
				}
			} else candidate = null;
			if ( onset === null ) return { phase: at - armAt >= 30000 ? "no-speech" : "waiting", remaining: 10 };
			const elapsed = at - onset;
			const done = elapsed >= maximum || ( voiced >= 600 && at - lastVoice >= silence );
			return { phase: done ? ( voiced >= 600 ? "done" : "no-speech" ) : "speaking", from: onset, to: lastVoice, remaining: Math.max( 0, Math.ceil( ( maximum - elapsed ) / 1000 ) ), voiced };
		}
	};
}
