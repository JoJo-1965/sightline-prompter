// Camera-frame coordinates, independent of mirrored display or desktop geometry.
import { guidePose } from "./guide-pose.js";

export const FRAME_EYE_Y = 169 / 562.5;
export function framingPose( value ) {
	if ( !value || ![ value.x, value.y, value.size ].every( Number.isFinite ) ) throw new Error( "A complete framing position is required" );
	if ( Math.abs( value.x ) > 45 || Math.abs( value.y ) > 45 || value.size < 40 || value.size > 200 ) throw new Error( "Framing position is outside the supported range" );
	return { x: value.x, y: value.y, size: value.size };
}
// Detected face size is a measurement, not the guide's bounded Size slider.
export function framingObservation( value ) {
	if ( !value || ![ value.x, value.y, value.size ].every( Number.isFinite ) || Math.abs( value.x ) > 50 || value.y < -FRAME_EYE_Y * 100 || value.y > ( 1 - FRAME_EYE_Y ) * 100 || value.size <= 0 || value.size > 100 / 0.18 ) throw new Error( "A valid detected face is required" );
	return { x: value.x, y: value.y, size: value.size };
}
function widthFactor( shape ) {
	const p = guidePose( shape );
	return p.width * ( p.left + p.right ) / 2;
}
export function visibleFramingTarget( target, shape ) {
	return { ...target, size: target.size * widthFactor( shape ) };
}
export function detectedFramingTarget( current, shape ) {
	const target = { ...framingObservation( current ), size: current.size / widthFactor( shape ) };
	try { return framingPose( target ); } catch {
		throw new Error( "This position is outside the guide's adjustment range. Adjust its Width or eye position, then try Lock current again." );
	}
}
export function detectedPose( result ) {
	if ( result?.detections?.length !== 1 ) return null;
	const face = result.detections[0], points = face.keypoints;
	if ( !points?.[0] || !points[1] || ( face.categories?.[0]?.score ?? 0 ) < 0.65 ) return null;
	const eyeX = ( points[0].x + points[1].x ) / 2, eyeY = ( points[0].y + points[1].y ) / 2;
	const width = face.boundingBox?.width / result.width;
	const pose = { x: ( eyeX - 0.5 ) * 100, y: ( eyeY - FRAME_EYE_Y ) * 100, size: width / 0.18 * 100 };
	try { return framingObservation( pose ); } catch { return null; }
}
export function framingMatch( current, target, { enabled = true, manual = false, mirror = false } = {} ) {
	if ( !enabled ) return { kind: "manual", aligned: manual, arrow: "○", text: manual ? "Manual framing confirmed" : "Check the manual guide", detail: "Position feedback is off. Confirm the framing yourself." };
	if ( !current ) return { kind: "lost", aligned: false, arrow: "—", text: "Tracking unavailable", detail: "No reliable single face detected. Your reference stays fixed." };
	const dx = current.x - target.x, dy = current.y - target.y, ds = ( current.size / target.size - 1 ) * 100;
	const score = Math.max( Math.abs( dx ) / 2, Math.abs( dy ) / 2, Math.abs( ds ) / 5 );
	const result = { dx, dy, ds, score, aligned: score <= 1, kind: score <= 1 ? "green" : score <= 2 ? "amber" : "red" };
	if ( result.aligned ) return { ...result, arrow: "✓", text: "Within your framing reference", detail: "Eye position and apparent head size are within tolerance." };
	const corrections = [
		{ error: Math.abs( dx ) / 2, arrow: ( mirror ? -dx : dx ) > 0 ? "←" : "→", text: "Move towards the arrow", detail: "Bring your eye centre back to the reference." },
		{ error: Math.abs( dy ) / 2, arrow: dy > 0 ? "↑" : "↓", text: dy > 0 ? "Move a little higher" : "Move a little lower", detail: "Match the saved eye height." },
		{ error: Math.abs( ds ) / 5, arrow: ds > 0 ? "↔" : "↦↤", text: ds > 0 ? "Move a little further away" : "Move a little closer", detail: `Head size is ${ Math.round( current.size / target.size * 100 ) }% of target. Aim for 95–105%. Keep looking towards the camera as you move.` }
	].sort( ( a, b ) => b.error - a.error );
	return { ...result, ...corrections[0] };
}
export function checkedFramingReference( value ) {
	const target = framingPose( value?.target );
	const audio = value?.audio;
	if ( !audio || ![ audio.voice, audio.peak, audio.noise ].every( n => Number.isFinite( n ) && n >= -120 && n <= 0 ) ) throw new Error( "A completed audio check is required" );
	if ( value?.testReviewed !== true || value?.framingChecked !== true ) throw new Error( "Check framing and review the test before saving" );
	const camera = value?.camera;
	if ( !camera || typeof camera.deviceId !== "string" || !camera.deviceId || ![ camera.width, camera.height ].every( n => Number.isFinite( n ) && n > 0 && n <= 16384 ) ) throw new Error( "A connected camera is required" );
	return {
		schema: 1, savedAt: new Date().toISOString(), target,
		camera: { deviceId: camera.deviceId.slice( 0, 512 ), label: String( camera.label ?? "Camera" ).slice( 0, 120 ), width: camera.width, height: camera.height, crop: "centre-16:9" },
		microphoneId: String( value.microphoneId ?? "default" ).slice( 0, 512 ),
		audio: { voice: audio.voice, peak: audio.peak, noise: audio.noise, override: audio.override === true },
		testReviewed: true, framingChecked: true
	};
}
export function audioCheckAdvice( value ) {
	if ( !value || value.peak <= -75 || value.voice <= -75 ) return { usable: false, advisory: false, text: "No usable microphone signal. Check the selected device and speak during the check." };
	const margin = value.voice - value.noise;
	if ( value.peak >= -1 ) return { usable: true, advisory: true, text: "Voice peaks may clip. Review the test clip; reduce input gain if it sounds distorted." };
	if ( margin < 12 ) return { usable: true, advisory: true, text: "Background noise is close to the voice level. Try reducing room noise or moving the microphone closer." };
	if ( value.voice < -30 ) return { usable: true, advisory: true, text: "Voice is quiet. Consider the noise margin and listen to the test before increasing gain." };
	return { usable: true, advisory: false, text: "Voice is clear above the measured room noise. Listen to the test clip before saving." };
}
