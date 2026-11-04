// Optional, serialised recorder coupling. Continuous recording is the default.
export function createRecordingLink( { getSettings, getState, command } ) {
	let tail = Promise.resolve( true );
	let engaged = false;
	const enabled = () => {
		const s = getSettings();
		return !!( s.obsEnabled && s.obsControls && s.obsFollowPrompter );
	};
	const enqueue = ( task ) => {
		const result = tail.then( task, task );
		tail = result.catch( () => false );
		return result;
	};
	return {
		enabled,
		start: () => enqueue( async () => {
			if ( !enabled() ) return true;
			const state = getState();
			if ( !state.enabled || !state.controls || state.connection !== "connected" ) return false;
			const action = state.recording === "paused" ? "resume" : "start";
			const ok = state.recording === "recording" || await command( action );
			if ( ok ) engaged = true;
			return !!ok;
		} ),
		pause: () => enqueue( async () => {
			if ( !enabled() || !engaged ) return true;
			const state = getState();
			if ( state.controlBusy || state.recording === "paused" || state.recording === "stopped" ) return true;
			return !!await command( "pause" );
		} ),
		finish: () => enqueue( async () => {
			if ( !enabled() || !engaged ) return true;
			const ok = getState().recording === "stopped" || await command( "stop" );
			if ( ok ) engaged = false;
			return !!ok;
		} )
	};
}
