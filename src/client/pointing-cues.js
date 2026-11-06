// Silent performance cues and production intent, never executable directives.
import { pickTakes, timedWords } from "./take-log.js";

export const POINT_DIRECTIONS = [ "left", "right", "up", "down", "up-left", "up-right", "down-left", "down-right", "centre" ];
const aliases = { "upper-left": "up-left", "upper-right": "up-right", "lower-left": "down-left", "lower-right": "down-right", "top-left": "up-left", "top-right": "up-right", "bottom-left": "down-left", "bottom-right": "down-right", upwards: "up", downwards: "down", center: "centre" };
export function parsePointingCue( text ) {
	let value = String( text ?? "" ).trim();
	if ( value.startsWith( "[" ) && value.endsWith( "]" ) ) value = value.slice( 1, -1 ).trim();
	const match = /^point\s+([^:[\]{}]+?)(?:\s*:\s*([^\u005b\]{}]*))?$/i.exec( value );
	if ( !match ) return null;
	const raw = match[1].trim().toLowerCase().replace( /[\s_-]+/g, "-" );
	const direction = aliases[raw] ?? raw;
	if ( !POINT_DIRECTIONS.includes( direction ) ) return null;
	let graphic = match[2]?.trim().replace( /\s+/g, " " ) || null;
	if ( graphic && /^(?:".*"|“.*”)$/s.test( graphic ) ) graphic = graphic.slice( 1, -1 ).trim() || null;
	return { action: "point", direction, directionBasis: "presenter", graphic, instruction: String( text ).trim() };
}

// Global word indexes match the sentence/voice index, with headings filtered
// only when choosing the spoken anchor. Hidden cues still retain their place.
export function collectPointingCues( root, ranges ) {
	const sectionOf = node => Number( ( node.nodeType === 1 ? node : node.parentElement )?.closest( "[data-section]" )?.dataset.section ?? -1 ) + 1;
	const spoken = ranges.flatMap( ( range, i ) => range.startContainer.parentElement?.closest( "h1,h2,h3,h4,h5,h6,code,pre" ) ? [] : [ { range, i, section: sectionOf( range.startContainer ), word: range.toString() } ] );
	return [ ...root.querySelectorAll( ".pointing-cue" ) ].flatMap( ( element, index ) => {
		if ( element.closest( "h1,h2,h3,h4,h5,h6,code,pre,.production-note" ) ) return [];
		const cue = parsePointingCue( element.textContent );
		if ( !cue ) return [];
		const boundary = document.createRange();
		boundary.selectNode( element );
		const section = sectionOf( element );
		const local = spoken.filter( word => word.section === section );
		const after = local.filter( word => word.range.compareBoundaryPoints( Range.START_TO_START, boundary ) >= 0 );
		const before = local.filter( word => word.range.compareBoundaryPoints( Range.START_TO_START, boundary ) < 0 );
		return [ { ...cue, id: `point-${ String( index + 1 ).padStart( 3, "0" ) }`, section,
			anchor: { afterWordIndex: before.at( -1 )?.i ?? null, beforeWordIndex: after[0]?.i ?? null },
			contextBefore: before.slice( -8 ).map( word => word.word ).join( " " ), contextAfter: after.slice( 0, 8 ).map( word => word.word ).join( " " ) } ];
	} );
}

function cueTime( data, take, cue ) {
	const reviewed = data.postRecord?.takes?.find( item => item.section === take.section && item.take === take.take );
	const source = reviewed ? "post-record-transcription" : "live-voice-following";
	const words = reviewed ? reviewed.status === "uncertain" || reviewed.status === "unavailable" ? [] : reviewed.words.map( word => ( { i: word.scriptIndex, start: word.start, end: word.end } ) ) : timedWords( take );
	const next = Number.isInteger( cue.anchor?.beforeWordIndex ) ? words.find( word => word.i === cue.anchor.beforeWordIndex ) : null;
	const previous = Number.isInteger( cue.anchor?.afterWordIndex ) ? words.findLast( word => word.i === cue.anchor.afterWordIndex ) : null;
	const seconds = next?.start ?? previous?.end ?? null;
	return { sessionSeconds: Number.isFinite( seconds ) ? Math.round( seconds * 1000 ) / 1000 : null,
		timingSource: Number.isFinite( seconds ) ? source : "unavailable", anchorUsed: next ? "next-spoken-word" : previous ? "previous-spoken-word-end" : null,
		reviewRequired: true, gestureVerified: false };
}

const csvCell = value => `"${ ( typeof value === "string" && /^[=+@-]/.test( value ) ? `'${ value }` : String( value ?? "" ) ).replaceAll( "\"", "\"\"" ) }"`;
export function pointingCueFiles( data ) {
	const snapshots = ( data.scriptSnapshots ?? [] ).filter( snapshot => snapshot.pointingCues?.length );
	if ( !snapshots.length ) return {};
	const scriptCues = snapshots.flatMap( snapshot => snapshot.pointingCues.map( cue => ( { ...cue, scriptSnapshotId: snapshot.id } ) ) );
	const picks = data.sections ?? pickTakes( data.takes ?? [] );
	const occurrences = ( data.takes ?? [] ).flatMap( take => scriptCues.filter( cue => cue.scriptSnapshotId === take.scriptSnapshotId && cue.section === take.section ).map( cue => ( {
		...cue, take: take.take, title: take.title, selectedTake: picks.some( pick => pick.section === take.section && pick.use === take.take ),
		...cueTime( data, take, cue ), directionBasis: "presenter", placementReview: "Check the recorded frame orientation; a mirrored preview does not establish the recording orientation." } ) ) );
	const manifest = { schemaVersion: 1, directionBasis: "presenter", purpose: "Scripted presenter gesture and graphic insertion intent", gestureDetection: false,
		orientation: "Left/right mean the presenter's own left/right. In an unmirrored camera shot presenter-left appears viewer-right. Verify the actual recording before positioning graphics.",
		timing: "Spoken-word anchors are navigation candidates, not measured gesture times. Confirm the visible gesture before cutting or placing a graphic. Null means no reliable anchor was captured.", scriptCues, occurrences };
	const columns = [ "section", "take", "selected_take", "cue_id", "direction", "direction_basis", "graphic", "session_seconds", "timing_source", "anchor_used", "gesture_verified", "context_before", "context_after" ];
	const rows = occurrences.map( cue => [ cue.section, cue.take, cue.selectedTake, cue.id, cue.direction, cue.directionBasis, cue.graphic, cue.sessionSeconds, cue.timingSource, cue.anchorUsed, false, cue.contextBefore, cue.contextAfter ] );
	const brief = "# Pointing and graphic cues\n\nUse production-cues.json or production-cues.csv to find the scripted gestures.\nChoose the selected take, read the nearby script, then confirm the actual gesture in the recording.\n\nLeft/right always mean the presenter's own left/right. An unmirrored camera reverses horizontal sides for the viewer. Check the recorded orientation; preview mirroring alone is not evidence.\n\nGraphic references are labels supplied by the author, not files that Sightline has found or inserted. A blank graphic means the editor must choose/confirm the asset. Directions and asset labels are silent, never captions or voice commands.\n\nTimes use the session clock. Recorded-audio word alignment is preferred where available; live following is approximate. A null time is unavailable, not a cue at zero. Spoken timing does not verify the gesture. Read TIMING-NOTES.md and recording-offsets.json when converting to file time.\n\nOriginal captured script cues are retained separately from per-take occurrences, including cues in sections that were not recorded. No automatic insert, file download or edit is performed.\n";
	return { "production-cues.json": JSON.stringify( manifest, null, 2 ), "production-cues.csv": [ columns, ...rows ].map( row => row.map( csvCell ).join( "," ) ).join( "\r\n" ), "PRODUCTION-CUES.md": brief };
}
