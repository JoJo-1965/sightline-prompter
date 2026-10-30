// Audio blocks and recogniser acknowledgements continue through silence.
// Missing transcripts alone are never evidence that listening has failed.
export function createSpeechRecovery( { probe, restart, notify = () => {}, wanted = () => true, now = Date.now } ) {
	let attempts = [];
	let fault = null;
	let stopped = false;
	let recovering = false;
	let limited = false;
	let next = 0;
	let lastReport = 0;
	async function tick() {
		if ( stopped || recovering || limited || !wanted() || now() < next ) return;
		const health = probe();
		const reason = fault ?? ( health.trackLive === false ? "microphone ended" : health.contextState && health.contextState !== "running" ? "audio context suspended" : now() - health.audioAt > 7000 ? "audio blocks stopped" : now() - health.engineAt > 7000 ? "speech engine stopped acknowledging audio" : null );
		if ( !reason ) {
			if ( now() - lastReport > 5000 ) {
				lastReport = now();
				notify( { type: "health", ...health } );
			}
			return;
		}
		attempts = attempts.filter( t => now() - t < 60000 );
		if ( attempts.length >= 3 ) {
			limited = true;
			notify( { type: "failed", reason } );
			return;
		}
		attempts.push( now() );
		recovering = true;
		notify( { type: "recovering", reason, attempt: attempts.length } );
		try {
			await restart( reason );
			fault = null;
			if ( !stopped ) notify( { type: "recovered", reason } );
		} catch ( err ) {
			fault = err.message || reason;
		} finally {
			recovering = false;
			next = now() + 1000 * 2 ** ( attempts.length - 1 );
		}
	}
	return {
		tick,
		fail: ( reason ) => {
			fault = reason;
		},
		stop: () => {
			stopped = true;
		},
		retry: () => {
			if ( recovering ) return;
			attempts = [];
			limited = false;
			next = 0;
			fault = "manual restart";
			return tick();
		}
	};
}
