// Floating control pad (see src/pad.js). Buttons send prompter commands; the
// grip drags the window. The main process says when to mirror.

const padEl = document.getElementById( "pad" );
const grip = document.getElementById( "pad-grip" );
const toggle = document.getElementById( "pad-toggle" );
const toggleLabel = document.getElementById( "pad-toggle-label" );

for ( const button of document.querySelectorAll( "button[data-action]" ) ) {
	button.addEventListener( "click", () =>
		window.pad.command( button.dataset.action )
	);
}
document
	.getElementById( "pad-close" )
	.addEventListener( "click", () => window.pad.close() );

window.pad.onMirror( ( mode ) => {
	padEl.classList.remove( "mirror-horizontal", "mirror-vertical", "mirror-both" );
	if ( mode && mode !== "off" ) padEl.classList.add( `mirror-${ mode }` );
} );

window.pad.onStatus( ( status ) => {
	const running = !!status?.scrolling;
	toggle.classList.toggle( "running", running );
	toggleLabel.textContent = running ? "Pause" : "Start";
	toggle.title = running ? "Pause" : "Start";
	const unit = status?.points ? "point" : "section";
	document.getElementById( "pad-prev" ).title = `Previous ${ unit }`;
	document.getElementById( "pad-next" ).title = `Next ${ unit }`;
	for ( const button of document.querySelectorAll( "button[data-action]" ) ) {
		button.disabled = !!status?.editing;
	}
} );

// Drag by the grip. Screen coordinates are unaffected by the mirror flip.
let drag = null;
grip.addEventListener( "pointerdown", ( event ) => {
	drag = {
		dx: event.screenX - window.screenX,
		dy: event.screenY - window.screenY
	};
	grip.setPointerCapture( event.pointerId );
	grip.classList.add( "dragging" );
} );
grip.addEventListener( "pointermove", ( event ) => {
	if ( drag ) window.pad.moveTo( event.screenX - drag.dx, event.screenY - drag.dy );
} );
const endDrag = () => {
	if ( !drag ) return;
	drag = null;
	grip.classList.remove( "dragging" );
	window.pad.dragEnd();
};
grip.addEventListener( "pointerup", endDrag );
grip.addEventListener( "pointercancel", endDrag );
