// Floating control pad (see src/pad.js). Buttons send prompter commands; the
// grip drags the window. The main process says when to mirror.

const padEl = document.getElementById( "pad" );
const grip = document.getElementById( "pad-grip" );
import { createControlButtons } from "./control-buttons.js";
const render = createControlButtons( document.getElementById( "pad-buttons" ), id => window.pad.command( id ) );
document.getElementById( "pad-customise" ).addEventListener( "click", () => window.pad.customise() );
document
	.getElementById( "pad-close" )
	.addEventListener( "click", () => window.pad.close() );

window.pad.onMirror( ( mode ) => {
	padEl.classList.remove( "mirror-horizontal", "mirror-vertical", "mirror-both" );
	if ( mode && mode !== "off" ) padEl.classList.add( `mirror-${ mode }` );
} );

window.pad.onStatus( ( status ) => {
	render( status.padLayout, status );
} );

// Drag by the grip. Screen coordinates are unaffected by the mirror flip.
let drag = null;
grip.addEventListener( "pointerdown", ( event ) => {
	if ( event.target.closest( "button" ) ) return;
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
