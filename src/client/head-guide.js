import { enableDialogVoice } from "./dialog-voice.js";
enableDialogVoice();
import { guidePose, guideOutline } from "./guide-pose.js";
import { roundControlNumber } from "./numeric-controls.js";
import { framingMatch, visibleFramingTarget } from "./framing-position.js";

const guide = window.headGuide;
const svg = document.querySelector( "svg" );
const controlsOnly = new URLSearchParams( window.location.search ).get( "controls" ) === "1";
const toolbarOnly = new URLSearchParams( window.location.search ).get( "toolbar" ) === "1";
if ( controlsOnly ) document.title = "Guide adjustments";
if ( toolbarOnly ) document.title = "Sightline head-guide toolbar";
document.body.classList.toggle( "controls-only", controlsOnly );
document.body.classList.toggle( "toolbar-only", toolbarOnly );
document.querySelector( "#adjust-panel" ).hidden = !controlsOnly;
if ( toolbarOnly ) {
	document.querySelector( "#toolbar-reveal" ).hidden = false;
	document.querySelector( "#move-guide" ).hidden = false;
	document.querySelector( "#close" ).textContent = "Guide off";
	document.querySelector( "#close" ).setAttribute( "aria-label", "Turn head guide off" );
}
document.querySelector( "#toolbar-reveal" ).onclick = () => guide.action( "toolbar-reveal" );
if ( toolbarOnly ) document.addEventListener( "keydown", () => guide.action( "toolbar-reveal" ) );
const moveGuide = document.querySelector( "#move-guide" );
moveGuide.onpointerdown = event => { if ( event.button !== 0 ) return; moveGuide.setPointerCapture( event.pointerId ); guide.action( "move-start" ); event.preventDefault(); };
moveGuide.onpointermove = event => { if ( moveGuide.hasPointerCapture( event.pointerId ) ) guide.action( "move" ); };
moveGuide.onpointerup = moveGuide.onlostpointercapture = () => guide.action( "move-end" );
let scale = 1;
let resize = false;
let pose = { x: 0, y: 0 };
let eyesLocked = false;
const idealShape = document.querySelector( "#head" ).cloneNode( true );
idealShape.id = "ideal-head";
idealShape.classList.add( "ideal" );
const idealLabel = idealShape.querySelector( ".pose-label" );
idealLabel.textContent = "Ideal position";
idealLabel.setAttribute( "x", "395" );
idealLabel.setAttribute( "text-anchor", "end" );
document.querySelector( "#head" ).before( idealShape );
const actualShape = document.querySelector( "#head" );
const framingControls = document.createElement( "section" );
framingControls.id = "framing-controls";
framingControls.innerHTML = '<h3>Position feedback</h3><label><input id="framing-tracking" type="checkbox"> Enable local position feedback</label><div id="framing-inputs" hidden><label for="framing-source">Calibration picture</label><select id="framing-source"><option value="camera">Camera / virtual camera</option><option value="obs">OBS scene preview</option><option value="temporary">Temporary OBS virtual camera</option></select><label id="framing-scene-label" for="framing-scene">OBS scene</label><select id="framing-scene"></select></div><p id="framing-detail" role="status">Position feedback is off.</p><button id="framing-lock" type="button" disabled>Lock current position</button><button id="framing-open" type="button">Prepare to record…</button>';
document.querySelector( "#adjust-panel" ).prepend( framingControls );
const refreshScenes = document.createElement( "button" ); refreshScenes.id = "framing-refresh-scenes"; refreshScenes.textContent = "Refresh scenes"; refreshScenes.type = "button"; refreshScenes.onclick = () => guide.action( "framing-scenes" ); document.querySelector( "#framing-inputs" ).append( refreshScenes );
const ns = "http://www.w3.org/2000/svg", defs = document.createElementNS( ns, "defs" ), mask = document.createElementNS( ns, "mask" ), outside = document.createElementNS( ns, "rect" ), holeGroup = document.createElementNS( ns, "g" ), hole = document.createElementNS( ns, "ellipse" ), tint = document.createElementNS( ns, "rect" );
mask.id = "feedback-cutout"; mask.setAttribute( "maskUnits", "userSpaceOnUse" );
for ( const rect of [ outside, tint ] ) { rect.setAttribute( "width", "1000" ); rect.setAttribute( "height", "562.5" ); }
outside.setAttribute( "fill", "white" ); hole.setAttribute( "fill", "black" ); holeGroup.append( hole ); mask.append( outside, holeGroup ); defs.append( mask ); tint.setAttribute( "mask", "url(#feedback-cutout)" ); tint.setAttribute( "opacity", "0" ); svg.prepend( defs, tint );
const cameraControls = document.createElement( "div" ); cameraControls.innerHTML = '<label id="framing-camera-label" for="framing-camera">Camera or virtual camera</label><select id="framing-camera"><option value="default">Default camera</option></select><button id="framing-picture" type="button">Enable picture</button>'; framingControls.append( cameraControls );
document.querySelector( "#framing-camera" ).onchange = event => guide.action( "framing-camera", event.target.value );
document.querySelector( "#framing-picture" ).onclick = () => guide.action( "framing-picture" );
const feedbackPill = document.createElement( "div" ); feedbackPill.id = "framing-pill"; feedbackPill.hidden = true; document.body.append( feedbackPill );
const feedbackArrow = document.createElementNS( "http://www.w3.org/2000/svg", "text" ); feedbackArrow.setAttribute( "x", "500" ); feedbackArrow.setAttribute( "y", "510" ); feedbackArrow.setAttribute( "text-anchor", "middle" ); feedbackArrow.id = "framing-arrow"; svg.append( feedbackArrow );
document.querySelector( "#framing-tracking" ).onchange = event => guide.action( "framing-tracking", event.target.checked );
document.querySelector( "#framing-source" ).onchange = event => guide.action( "framing-source", event.target.value );
document.querySelector( "#framing-scene" ).onchange = event => guide.action( "framing-scene", event.target.value );
document.querySelector( "#framing-lock" ).onclick = () => guide.action( "framing-lock" );
document.querySelector( "#framing-open" ).onclick = () => guide.action( "framing-open" );
let dragging = null;
function point( event ) {
	const matrix = svg.getScreenCTM();
	return matrix ? new DOMPoint( event.clientX, event.clientY ).matrixTransform( matrix.inverse() ) : null;
}
actualShape.onpointerdown = ( event ) => {
	if ( event.button !== 0 || eyesLocked ) return;
	const start = point( event );
	if ( !start ) return;
	dragging = { start, pose: { ...pose } };
	actualShape.setPointerCapture( event.pointerId );
	event.preventDefault();
};
actualShape.onpointermove = ( event ) => {
	if ( !dragging || eyesLocked ) return;
	const next = point( event );
	if ( !next ) return;
	const moved = guidePose( { x: dragging.pose.x + ( next.x - dragging.start.x ) / 10, y: dragging.pose.y + ( next.y - dragging.start.y ) / 5.625, scale } );
	guide.action( "preferences", { x: moved.x, y: moved.y } );
};
actualShape.onpointerup = actualShape.onlostpointercapture = () => {
	dragging = null;
};
const transform = value => `translate(${ value.x * 10 } ${ value.y * 5.625 }) translate(500 155) scale(${ value.scale }) translate(-500 -155)`;
const shapeTransform = value => `translate(500 155) scale(${ value.width } ${ value.height }) translate(-500 -155)`;
function showPose( element, value ) {
	element.setAttribute( "transform", transform( value ) );
	element.querySelector( ".head-outline" ).setAttribute( "transform", shapeTransform( value ) );
	const outline = guideOutline( value );
	for ( const attr of [ "cx", "cy", "rx", "ry" ] ) element.querySelector( "ellipse" ).setAttribute( attr, outline[attr] );
	element.querySelector( ".head-outline path" ).setAttribute( "d", outline.shoulders );
	// Keep both eye marks fixed, even when changing the overall size.
	element.querySelector( ".eye-reference" ).setAttribute( "transform", `translate(500 155) scale(${ 1 / value.scale }) translate(-500 -155)` );
}
document.querySelector( "#lock-eyes" ).onclick = () => guide.action( "preferences", { eyesLocked: !eyesLocked } );
for ( const axis of [ "scale", "width", "height", "top", "bottom", "left", "right" ] ) {
	document.querySelector( `#shape-${ axis }` ).oninput = event => guide.action( "preferences", { [axis]: Number( event.target.value ) / 100 } );
}
document.querySelector( "#adjust" ).onclick = () => guide.action( "adjust" );
document.querySelector( "#adjust-close" ).onclick = () => guide.action( "adjust-hide" );
document.addEventListener( "keydown", ( event ) => {
	if ( controlsOnly && event.key === "Escape" ) guide.action( "adjust-hide" );
} );
for ( const axis of [ "x", "y" ] ) document.querySelector( `#eye-${ axis }` ).onchange = ( event ) => {
	const value = roundControlNumber( event.target.valueAsNumber );
	if ( !Number.isFinite( value ) ) return;
	event.target.value = value;
	guide.action( "preferences", { [axis]: value } );
};
document.querySelector( "#background" ).oninput = event => guide.action( "preferences", { background: Number( event.target.value ) / 100 } );
document.querySelector( "#outline-opacity" ).oninput = event => guide.action( "preferences", { opacity: Number( event.target.value ) / 100 } );
for ( const button of document.querySelectorAll( ".pose-arrows button" ) ) button.onclick = () => guide.action( "preferences", { x: pose.x + Number( button.dataset.x ?? 0 ), y: pose.y + Number( button.dataset.y ?? 0 ) } );
for ( const name of [ "save-ideal", "reset-pose", "ideal-visible", "save-reference", "restore-reference" ] ) document.getElementById( name ).onclick = () => guide.action( name );
for ( const button of document.querySelectorAll( "[data-place]" ) ) button.onclick = () => guide.action( "place", button.dataset.place );
document.querySelector( "#close" ).onclick = () => guide.action( "hide" );
document.querySelector( "#lock" ).onclick = () => guide.action( "lock" );
document.querySelector( "#fullscreen" ).onclick = () => guide.action( "fullscreen" );
document.querySelector( "#chrome" ).onclick = () => guide.action( toolbarOnly ? "toolbar-pin" : "chrome" );
guide.onState( ( value ) => {
	if ( toolbarOnly ) {
		document.body.classList.toggle( "toolbar-collapsed", value.toolbarExpanded === false );
		document.querySelector( "#chrome" ).textContent = value.toolbarPinned ? "Auto-hide" : "Pin controls";
		document.querySelector( "#chrome" ).title = value.toolbarPinned ? "Let the controls hide when the pointer moves away" : "Keep head-guide controls visible";
		document.querySelector( "#chrome" ).setAttribute( "aria-pressed", String( value.toolbarPinned === true ) );
		document.querySelector( "#lock" ).textContent = value.locked ? "Unlock clicks" : "Lock clicks";
		document.querySelector( "#lock" ).title = value.locked ? "Restore mouse control of the guide" : "Pass mouse clicks through the guide; this toolbar remains available";
		document.querySelector( "#move-guide" ).disabled = value.fullscreen === true;
	}
	document.body.classList.toggle( "locked", !controlsOnly && value.locked );
	document.body.classList.toggle( "fullscreen", !controlsOnly && value.fullscreen );
	document.body.classList.toggle( "chromeless", !controlsOnly && value.chromeless );
	document.querySelector( "#adjust" ).setAttribute( "aria-expanded", String( value.controlsShown ) );
	for ( const button of document.querySelectorAll( "[data-place]" ) ) button.setAttribute( "aria-pressed", String( button.dataset.place === value.placement ) );
	document.querySelector( "#fullscreen" ).textContent = value.fullscreen ? "Restore" : "Fullscreen";
	scale = value.scale;
	eyesLocked = value.eyesLocked === true;
	document.body.classList.toggle( "eyes-locked", eyesLocked );
	document.querySelector( "#lock-eyes" ).setAttribute( "aria-pressed", String( eyesLocked ) );
	document.querySelector( "#lock-eyes" ).textContent = eyesLocked ? "Eyes fixed · unlock" : "Lock eye position";
	for ( const button of document.querySelectorAll( ".pose-arrows button" ) ) button.disabled = eyesLocked;
	for ( const axis of [ "x", "y" ] ) {
		const input = document.querySelector( `#eye-${ axis }` );
		input.disabled = eyesLocked;
		if ( document.activeElement !== input ) input.value = roundControlNumber( value[axis] );
	}
	for ( const axis of [ "scale", "width", "height", "top", "bottom", "left", "right" ] ) {
		const percent = Math.round( value[axis] * 100 );
		document.querySelector( `#shape-${ axis }` ).value = percent;
		document.querySelector( `#shape-${ axis }-value` ).value = `${ percent }%`;
	}
	pose = { x: value.x, y: value.y };
	showPose( actualShape, value );
	showPose( idealShape, value.ideal );
	document.querySelector( "#restore-reference" ).disabled = !value.reference?.pose;
	document.querySelector( "#reference-status" ).textContent = value.reference?.pose ? "Recording reference saved · Ideal unchanged" : "No recording reference saved. Ideal stays unchanged.";
	idealShape.style.display = value.showIdeal ? "" : "none";
	document.querySelector( "#ideal-visible" ).textContent = value.showIdeal ? "Hide ideal" : "Show ideal";
	document.querySelector( "#pose-value" ).textContent = `X ${ roundControlNumber( value.x ) }% · Y ${ roundControlNumber( value.y ) }% · Size ${ Math.round( scale * 100 ) }%`;
	document.querySelector( "#opacity" ).value = value.opacity * 100;
	document.querySelector( "#outline-opacity" ).value = value.opacity * 100;
	document.querySelector( "#outline-opacity-value" ).value = `${ Math.round( value.opacity * 100 ) }%`;
	document.querySelector( "#background" ).value = value.background * 100;
	document.querySelector( "#background-value" ).value = `${ Math.round( value.background * 100 ) }%`;
	document.querySelector( "#stage" ).style.backgroundColor = `rgba(0, 0, 0, ${ value.background })`;
	svg.style.opacity = value.opacity;
	svg.style.color = value.colour === "gold" ? "#fbd86c" : "#72efce";
	const feedback = value.feedback ?? {}, calibration = value.calibration ?? {};
	const result = framingMatch( feedback.active ? feedback.person : null, visibleFramingTarget( { x: value.x, y: value.y - 14 / 562.5 * 100, size: value.scale * 100 }, value ), { enabled: feedback.enabled === true, mirror: feedback.mirror === true } );
	const colour = { green: "#72dfad", amber: "#edc766", red: "#ff8585", lost: "#a7b2c0", manual: "#89c4ff" }[result.kind];
	actualShape.style.color = feedback.enabled ? colour : "";
	feedbackPill.hidden = !feedback.enabled;
	feedbackPill.style.color = colour; feedbackPill.textContent = result.arrow + " " + result.text;
	feedbackArrow.textContent = feedback.enabled ? result.arrow : ""; feedbackArrow.setAttribute( "fill", colour );
	document.querySelector( "#framing-detail" ).textContent = feedback.enabled ? result.detail : "Position feedback is off. Manual guide controls remain available.";
	if ( !feedback.active && ( feedback.enabled || feedback.error ) ) document.querySelector( "#framing-detail" ).textContent = feedback.error || "Enable the selected calibration picture.";
	for ( const key of [ "cx", "cy", "rx", "ry" ] ) hole.setAttribute( key, actualShape.querySelector( "ellipse" ).getAttribute( key ) );
	holeGroup.setAttribute( "transform", transform( value ) ); hole.setAttribute( "transform", shapeTransform( value ) ); tint.setAttribute( "fill", colour ); tint.setAttribute( "opacity", feedback.enabled ? ".10" : "0" );
	document.querySelector( "#framing-tracking" ).checked = feedback.enabled === true;
	document.querySelector( "#framing-lock" ).disabled = !feedback.person || !feedback.enabled || !feedback.active;
	document.querySelector( "#framing-inputs" ).hidden = !calibration.obs?.available;
	document.querySelector( "#framing-source" ).value = calibration.source ?? "camera";
	const scene = document.querySelector( "#framing-scene" );
	if ( JSON.stringify( [ ...scene.options ].slice( 1 ).map( option => option.value ) ) !== JSON.stringify( calibration.obs?.scenes ?? [] ) ) scene.replaceChildren( new Option( "Choose an OBS scene", "" ), ...( calibration.obs?.scenes ?? [] ).map( name => new Option( name, name ) ) ); scene.value = calibration.scene ?? "";
	scene.hidden = document.querySelector( "#framing-scene-label" ).hidden = !calibration.obs?.available || calibration.source !== "obs";
	refreshScenes.hidden = scene.hidden; refreshScenes.disabled = !calibration.obs?.connected;
	const camera = document.querySelector( "#framing-camera" );
	if ( JSON.stringify( [ ...camera.options ].slice( 1 ).map( item => item.value ) ) !== JSON.stringify( ( calibration.cameras ?? [] ).map( item => item.deviceId ) ) ) camera.replaceChildren( new Option( "Default camera", "default" ), ...( calibration.cameras ?? [] ).map( item => new Option( item.label || "Camera", item.deviceId ) ) );
	camera.value = calibration.cameraId ?? "default";
	camera.hidden = document.querySelector( "#framing-camera-label" ).hidden = calibration.obs?.available && calibration.source === "obs";
	document.querySelector( "#framing-picture" ).textContent = feedback.active ? "Turn picture off" : "Enable picture";
} );
guide.ready();
function size( delta ) {
	scale = Math.max( 0.4, Math.min( 2, scale + delta ) );
	guide.action( "preferences", { scale } );
}
document.querySelector( "#smaller" ).onclick = () => size( -0.05 );
document.querySelector( "#bigger" ).onclick = () => size( 0.05 );
document.querySelector( "#opacity" ).oninput = event => guide.action( "preferences", { opacity: Number( event.target.value ) / 100 } );
svg.style.opacity = 0.75;
document.querySelector( "#colour" ).onclick = () => guide.action( "colour" );
const handle = document.querySelector( "#resize" );
handle.onpointerdown = ( event ) => {
	resize = true;
	handle.setPointerCapture( event.pointerId );
	guide.action( "resize-start" );
};
handle.onpointermove = () => {
	if ( resize ) guide.action( "resize" );
};
handle.onpointerup = () => {
	resize = false;
	guide.action( "resize-end" );
};
handle.onlostpointercapture = () => {
	resize = false;
	guide.action( "resize-end" );
};
