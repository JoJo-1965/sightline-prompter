import { guidePose } from "./guide-pose.js";

const guide = window.headGuide;
const svg = document.querySelector( "svg" );
let scale = 1;
let resize = false;
let pose = { x: 0, y: 0 };
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
	if ( event.button !== 0 ) return;
	const start = point( event );
	if ( !start ) return;
	dragging = { start, pose: { ...pose } };
	actualShape.setPointerCapture( event.pointerId );
	event.preventDefault();
};
actualShape.onpointermove = ( event ) => {
	if ( !dragging ) return;
	const next = point( event );
	if ( !next ) return;
	const moved = guidePose( { x: dragging.pose.x + ( next.x - dragging.start.x ) / 10, y: dragging.pose.y + ( next.y - dragging.start.y ) / 5.625, scale } );
	guide.action( "preferences", { x: moved.x, y: moved.y } );
};
actualShape.onpointerup = actualShape.onlostpointercapture = () => {
	dragging = null;
};
const transform = value => `translate(${ value.x * 10 } ${ value.y * 5.625 }) translate(500 155) scale(${ value.scale }) translate(-500 -155)`;
document.querySelector( "#adjust" ).onclick = () => {
	const panel = document.querySelector( "#adjust-panel" );
	panel.hidden = !panel.hidden;
	document.querySelector( "#adjust" ).setAttribute( "aria-expanded", String( !panel.hidden ) );
};
for ( const button of document.querySelectorAll( ".pose-arrows button" ) ) button.onclick = () => guide.action( "preferences", { x: pose.x + Number( button.dataset.x ?? 0 ), y: pose.y + Number( button.dataset.y ?? 0 ) } );
for ( const name of [ "save-ideal", "reset-pose", "ideal-visible" ] ) document.getElementById( name ).onclick = () => guide.action( name );
for ( const button of document.querySelectorAll( "[data-place]" ) ) button.onclick = () => guide.action( "place", button.dataset.place );
document.querySelector( "#close" ).onclick = () => guide.action( "hide" );
document.querySelector( "#lock" ).onclick = () => guide.action( "lock" );
document.querySelector( "#fullscreen" ).onclick = () => guide.action( "fullscreen" );
document.querySelector( "#chrome" ).onclick = () => guide.action( "chrome" );
guide.onState( ( value ) => {
	document.body.classList.toggle( "locked", value.locked );
	document.body.classList.toggle( "fullscreen", value.fullscreen );
	document.body.classList.toggle( "chromeless", value.chromeless );
	for ( const button of document.querySelectorAll( "[data-place]" ) ) button.setAttribute( "aria-pressed", String( button.dataset.place === value.placement ) );
	document.querySelector( "#fullscreen" ).textContent = value.fullscreen ? "Restore" : "Fullscreen";
	scale = value.scale;
	pose = { x: value.x, y: value.y };
	document.querySelector( "#head" ).setAttribute( "transform", transform( value ) );
	idealShape.setAttribute( "transform", transform( value.ideal ) );
	idealShape.style.display = value.showIdeal ? "" : "none";
	document.querySelector( "#ideal-visible" ).textContent = value.showIdeal ? "Hide ideal" : "Show ideal";
	document.querySelector( "#pose-value" ).textContent = `X ${ value.x }% · Y ${ value.y }% · Size ${ Math.round( scale * 100 ) }%`;
	document.querySelector( "#opacity" ).value = value.opacity * 100;
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
