// Explicit recorder evidence only: never infer a file from its name or order.
export function recordingAssociations( log ) {
	const recordings = new Map( ( log.obsRecordings ?? [] ).map( entry => [ entry.recordingId, entry ] ) );
	const origin = Date.parse( log.startedAt );
	return ( log.takes ?? [] ).map( ( take ) => {
		const ids = new Set( [ take.obsStart?.recordingId, take.obsEnd?.recordingId ].filter( Boolean ) );
		for ( const event of log.obs ?? [] ) if ( event.t >= take.start && event.t <= take.end && [ "recording", "paused" ].includes( event.recording ) && event.recordingId ) ids.add( event.recordingId );
		for ( const entry of recordings.values() ) if ( entry.events?.some( ( event ) => {
			const time = ( Date.parse( event.observedAt ) - origin ) / 1000;
			return time >= take.start && time <= take.end && [ "recording", "paused" ].includes( event.recording );
		} ) ) ids.add( entry.recordingId );
		const files = [ ...ids ].map( ( id ) => {
			const entry = recordings.get( id );
			const start = take.obsStart?.recordingId === id ? take.obsStart : null;
			const end = take.obsEnd?.recordingId === id ? take.obsEnd : null;
			return { recordingId: id, outputPath: entry?.outputPath ?? start?.outputPath ?? end?.outputPath ?? null,
				start: start?.seconds ?? null, end: end?.seconds ?? null, estimated: true,
				identityUncertain: entry?.identityUncertain === true, pathConflict: entry?.pathConflict ?? null,
				reason: entry?.identityReason ?? null };
		} );
		const status = !files.length ? "no-recorder-evidence" : files.some( file => file.identityUncertain || file.pathConflict ) ? "identity-needs-review" : files.some( file => !file.outputPath ) ? "file-unresolved" : files.length > 1 ? "multiple-files" : "file-linked";
		return { section: take.section, take: take.take, status, files, reviewRequired: status !== "file-linked" || files.some( file => file.start === null || file.end === null ), pictureSync: "unverified" };
	} );
}
