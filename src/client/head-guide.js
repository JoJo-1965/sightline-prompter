const guide = window.headGuide;
const svg = document.querySelector( "svg" );
let scale = 1;
let resize = false;
document.querySelector( "#close" ).onclick = () => guide.action( "hide" );
document.querySelector( "#lock" ).onclick = () => guide.action( "lock" );
guide.onState( ( value ) => {
	document.body.classList.toggle( "locked", value.locked );
	scale = value.scale;
	document.querySelector( "#head" ).setAttribute( "transform", `translate(500 155) scale(${ scale }) translate(-500 -155)` );
	document.querySelector( "#opacity" ).value = value.opacity * 100;
	svg.style.opacity = value.opacity;
	svg.style.color = value.colour === "gold" ? "#fbd86c" : "#72efce";
} );
guide.ready();
function size( delta ) {
	scale = Math.max( 0.7, Math.min( 1.4, scale + delta ) );
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
