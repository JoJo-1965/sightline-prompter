import { obsPosition } from "./client/obs-position.js";

// Shared across module logs, so stopping OBS can fill in the file name even
// after the reader has moved to another script.
export function createObsLedger() {
	const recordings = new Map();
	let previousId = null;
	return {
		observe( state ) {
			const id = state.recordingId ?? previousId;
			if ( !id ) return false;
			previousId = id;
			const entry = recordings.get( id ) ?? { recordingId: id, outputPath: null, events: [] };
			const position = obsPosition( { ...state, recordingId: id } );
			const event = { recording: state.recording, connection: state.connection, outputPath: state.outputPath ?? entry.outputPath };
			const last = entry.events.at( -1 );
			const changed = !last || Object.keys( event ).some( key => event[key] !== last[key] );
			if ( changed ) entry.events.push( { ...event, observedAt: state.observedAt ?? new Date().toISOString(), position } );
			entry.outputPath = event.outputPath;
			entry.lastClockObservation = position;
			recordings.set( id, entry );
			return changed;
		},
		attach( log ) {
			const ids = new Set( [ ...( log.obs ?? [] ).map( e => e.recordingId ), ...( log.takes ?? [] ).flatMap( t => [ t.obsStart?.recordingId, t.obsEnd?.recordingId ] ), ...( log.events ?? [] ).map( e => e.obs?.recordingId ) ].filter( Boolean ) );
			const merged = new Map( ( log.obsRecordings ?? [] ).map( r => [ r.recordingId, r ] ) );
			for ( const id of ids ) if ( recordings.has( id ) ) merged.set( id, recordings.get( id ) );
			return { ...log, obsRecordings: [ ...merged.values() ] };
		}
	};
}
