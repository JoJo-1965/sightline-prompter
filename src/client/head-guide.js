import { guidePose, guideOutline } from "./guide-pose.js";

const guide = window.headGuide;
const svg = document.querySelector( "svg" );
const controlsOnly = new URLSearchParams( window.location.search ).get( "controls" ) === "1";
if ( controlsOnly ) document.title = "Guide adjustments";
document.body.classList.toggle( "controls-only", controlsOnly );
document.querySelector( "#adjust-panel" ).hidden = !controlsOnly;
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
for ( const axis of [ "x", "y" ] ) document.querySelector( `#eye-${ axis }` ).onchange = event => guide.action( "preferences", { [axis]: event.target.valueAsNumber } );
document.querySelector( "#background" ).oninput = event => guide.action( "preferences", { background: Number( event.target.value ) / 100 } );
document.querySelector( "#outline-opacity" ).oninput = event => guide.action( "preferences", { opacity: Number( event.target.value ) / 100 } );
for ( const button of document.querySelectorAll( ".pose-arrows button" ) ) button.onclick = () => guide.action( "preferences", { x: pose.x + Number( button.dataset.x ?? 0 ), y: pose.y + Number( button.dataset.y ?? 0 ) } );
for ( const name of [ "save-ideal", "reset-pose", "ideal-visible" ] ) document.getElementById( name ).onclick = () => guide.action( name );
for ( const button of document.querySelectorAll( "[data-place]" ) ) button.onclick = () => guide.action( "place", button.dataset.place );
document.querySelector( "#close" ).onclick = () => guide.action( "hide" );
document.querySelector( "#lock" ).onclick = () => guide.action( "lock" );
document.querySelector( "#fullscreen" ).onclick = () => guide.action( "fullscreen" );
document.querySelector( "#chrome" ).onclick = () => guide.action( "chrome" );
guide.onState( ( value ) => {
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
		if ( document.activeElement !== input ) input.value = value[axis];
	}
	for ( const axis of [ "scale", "width", "height", "top", "bottom", "left", "right" ] ) {
		const percent = Math.round( value[axis] * 100 );
		document.querySelector( `#shape-${ axis }` ).value = percent;
		document.querySelector( `#shape-${ axis }-value` ).value = `${ percent }%`;
	}
	pose = { x: value.x, y: value.y };
	showPose( actualShape, value );
	showPose( idealShape, value.ideal );
	idealShape.style.display = value.showIdeal ? "" : "none";
	document.querySelector( "#ideal-visible" ).textContent = value.showIdeal ? "Hide ideal" : "Show ideal";
	document.querySelector( "#pose-value" ).textContent = `X ${ value.x }% · Y ${ value.y }% · Size ${ Math.round( scale * 100 ) }%`;
	document.querySelector( "#opacity" ).value = value.opacity * 100;
	document.querySelector( "#outline-opacity" ).value = value.opacity * 100;
	document.querySelector( "#outline-opacity-value" ).value = `${ Math.round( value.opacity * 100 ) }%`;
	document.querySelector( "#background" ).value = value.background * 100;
	document.querySelector( "#background-value" ).value = `${ Math.round( value.background * 100 ) }%`;
	document.querySelector( "#stage" ).style.backgroundColor = `rgba(0, 0, 0, ${ value.background })`;
	svg.style.opacity = value.opacity;
	svg.style.color = value.colour === "gold" ? "#fbd86c" : "#72efce";
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
