// Silent delivery cues. Camera access is deliberately outside this renderer.
import { buildWordIndex } from "./word-index.js";
import { parsePointingCue } from "./pointing-cues.js";
import { guideOutline, guidePose } from "./guide-pose.js";

const clamp = ( value, low, high ) => Math.max( low, Math.min( high, value ) );
export function hudHeadGeometry( { width, height, screenX = 0, screenY = 0 }, guide = {}, mirrored = "off" ) {
	const reference = guide.reference?.pose ? guide.reference : null;
	const pose = guidePose( reference?.pose ?? guide.pose ?? guide );
	const bounds = reference?.bounds ?? guide.bounds ?? { x: screenX, y: screenY, width, height };
	const fit = Math.min( bounds.width / 1000, bounds.height / 562.5 );
	const ox = bounds.x - screenX + ( bounds.width - fit * 1000 ) / 2;
	const oy = bounds.y - screenY + ( bounds.height - fit * 562.5 ) / 2;
	const outline = guideOutline( pose );
	let left = ox + ( 500 + pose.x * 10 + ( outline.cx - outline.rx - 500 ) * pose.width * pose.scale ) * fit;
	let right = ox + ( 500 + pose.x * 10 + ( outline.cx + outline.rx - 500 ) * pose.width * pose.scale ) * fit;
	let eyes = oy + ( 155 + pose.y * 5.625 ) * fit;
	let top = oy + ( 155 + pose.y * 5.625 + ( outline.cy - outline.ry - 155 ) * pose.height * pose.scale ) * fit;
	let bottom = oy + ( 155 + pose.y * 5.625 + ( outline.cy + outline.ry - 155 ) * pose.height * pose.scale ) * fit;
	if ( [ "horizontal", "both" ].includes( mirrored ) ) [ left, right ] = [ width - right, width - left ];
	if ( [ "vertical", "both" ].includes( mirrored ) ) { [ top, bottom ] = [ height - bottom, height - top ]; eyes = height - eyes; }
	const available = right > 0 && left < width && bottom > 0 && top < height;
	left = clamp( left, 0, width ); right = clamp( right, left, width );
	return { left, right, top, bottom, eyes, available, reference: reference ? "saved" : "current" };
}

export function hudTarget( direction, view, head, size ) {
	if ( !head.available ) return null;
	const { width, height } = view, r = size / 2, gap = 12;
	const horizontalMirror = [ "horizontal", "both" ].includes( view.mirrored );
	const side = direction.includes( "left" ) ? ( horizontalMirror ? "left" : "right" ) : direction.includes( "right" ) ? ( horizontalMirror ? "right" : "left" ) : null;
	const x = side === "left" ? head.left / 2 : side === "right" ? ( head.right + width ) / 2 : ( head.left + head.right ) / 2;
	let y = head.eyes + clamp( ( head.bottom - head.top ) * .07, 10, 32 );
	let targetX = x;
	if ( direction.includes( "up" ) ) {
		y = head.top - r - gap;
		if ( y < r + gap && !side ) targetX = head.right + size + gap < width ? head.right + r + gap : head.left - r - gap;
		y = Math.max( r + gap, y );
	} else if ( direction.includes( "down" ) ) y = Math.max( head.bottom + r + gap, height * .84 );
	else if ( direction === "centre" ) y = ( head.top + head.bottom ) / 2;
	if ( side && ( x < r + gap || x > width - r - gap ) ) return null;
	return { x: side ? x : clamp( targetX, r + gap, width - r - gap ), y: clamp( y, r + gap, height - r - gap ) };
}

const icon = ( kind ) => kind === "smile"
	? '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M9 19c3 6 11 6 14 0M10 11h.1M22 11h.1"/></svg>'
	: kind === "point"
		? '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 17V5a2.5 2.5 0 0 1 5 0v9l4-1 6 3-2 10c-.3 2-2 3-4 3h-8l-8-9a2.5 2.5 0 0 1 4-3l3 3"/></svg>'
		: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h16v23H8zM12 11h8M12 17h8M12 23h5"/></svg>';

export function createHudCues( root, { getState, getGuide, getCursor = () => null, readingAnchor = () => .33 } ) {
	const doc = root.ownerDocument;
	const marks = doc.createElement( "div" ); marks.id = "hud-cue-markers";
	const target = doc.createElement( "div" ); target.className = "hud-point-target"; target.hidden = true;
	const pill = doc.createElement( "div" ); pill.id = "hud-delivery-cue"; pill.hidden = true;
	pill.setAttribute( "role", "status" ); pill.setAttribute( "aria-live", "polite" );
	const symbol = doc.createElement( "span" ), label = doc.createElement( "span" ); pill.append( symbol, label );
	marks.append( target ); doc.body.append( marks, pill );
	let words = [], ranges = [], cues = [], dirty = true, active = null, frozen = null, lastMode = false, enabled = true;
	const observer = new MutationObserver( () => { dirty = true; } ); observer.observe( root, { childList: true, characterData: true, subtree: true } );
	function rebuild() {
		( { words, ranges } = buildWordIndex( root ) );
		for ( const el of root.querySelectorAll( ".hud-direction-only" ) ) el.classList.remove( "hud-direction-only" );
		cues = [ ...root.querySelectorAll( ".direction" ) ].flatMap( ( element, id ) => {
			if ( element.closest( "code,pre,h1,h2,h3,h4,h5,h6" ) ) return [];
			const text = [ ...element.querySelectorAll( ".dir-text" ) ].map( el => el.textContent ).join( " " ).trim().replace( /^\[|\]$/g, "" ).replace( /\bSay\s*:\s*$/i, "" ).trim();
			if ( !text ) return [];
			const section = element.closest( "#md" ) ? [ ...root.querySelectorAll( "h2" ) ].filter( h => h.compareDocumentPosition( element ) & Node.DOCUMENT_POSITION_FOLLOWING ).length : 0;
			const anchor = ranges.findIndex( range => !range.startContainer.parentElement.closest( "h1,h2,h3,h4,h5,h6" ) && ( element.compareDocumentPosition( range.startContainer ) & Node.DOCUMENT_POSITION_FOLLOWING ) );
			if ( anchor < 0 ) return [];
			const point = parsePointingCue( element.textContent );
			const boundary = ranges.findIndex( range => range.startContainer.parentElement.closest( "h2" ) && ( element.compareDocumentPosition( range.startContainer ) & Node.DOCUMENT_POSITION_FOLLOWING ) );
			return [ { id, text, point, section, anchor, boundary: boundary < 0 ? words.length : boundary, element } ];
		} );
		for ( const el of root.querySelectorAll( "p,li" ) ) {
			if ( !el.querySelector( ".direction" ) || el.querySelector( ".say" ) ) continue;
			const copy = el.cloneNode( true ); copy.querySelectorAll( ".direction,.app-directive,.production-note" ).forEach( item => item.remove() );
			if ( !copy.textContent.trim() ) el.classList.add( "hud-direction-only" );
		}
		dirty = false;
	}
	function view() { return { width: innerWidth, height: innerHeight, screenX: window.screenX + Math.max( 0, outerWidth - innerWidth ) / 2, screenY: window.screenY + Math.max( 0, outerHeight - innerHeight ) - Math.max( 0, outerWidth - innerWidth ) / 2, mirrored: getState().mirrored ?? "off" }; }
	function cursor() {
		const followed = getCursor();
		if ( Number.isInteger( followed ) ) return followed;
		const y = innerHeight * readingAnchor();
		let best = -1, distance = Infinity;
		for ( let i = 0; i < ranges.length; i++ ) {
			if ( ranges[i].startContainer.parentElement.closest( "h1,h2,h3,h4,h5,h6" ) ) continue;
			const box = ranges[i].getBoundingClientRect(); if ( !box.height ) continue;
			const d = Math.abs( box.top - y ); if ( d < distance ) { best = i; distance = d; }
		}
		return best;
	}
	function hide() { pill.hidden = true; target.hidden = true; active = null; frozen = null; }
	function update( delivering ) {
		const settings = getState(); enabled = settings.hudCues !== false;
		const mode = delivering && enabled;
		if ( dirty ) rebuild();
		lastMode = delivering;
		if ( !mode || settings.directions === "hide" ) { hide(); return; }
		const position = cursor();
		let selected = null;
		for ( let i = 0; i < cues.length; i++ ) {
			const cue = cues[i], next = cues[i + 1];
			const end = Math.min( next?.section === cue.section ? next.anchor : Infinity, cue.boundary, cue.anchor + ( cue.point ? 18 : 10 ) );
			if ( position >= Math.max( 0, cue.anchor - 2 ) && position < end ) selected = cue;
		}
		if ( !selected ) { hide(); return; }
		if ( active?.id !== selected.id || !frozen ) {
			active = selected;
			const bounds = view(), head = hudHeadGeometry( bounds, getGuide(), bounds.mirrored );
			const size = clamp( bounds.width * .06, 48, 104 );
			frozen = { view: bounds, head, size, target: selected.point ? hudTarget( selected.point.direction, bounds, head, size ) : null };
			symbol.innerHTML = icon( selected.point ? "point" : /smile/i.test( selected.text ) ? "smile" : "note" );
			label.textContent = selected.point ? ( frozen.target ? "Point at marker" : "Check head guide" ) : selected.text.replace( /^./, c => c.toUpperCase() ).slice( 0, 70 );
			pill.title = selected.text;
			if ( frozen.target ) {
				target.replaceChildren(); const mark = doc.createElement( "span" ); mark.innerHTML = icon( "note" );
				const name = doc.createElement( "span" ); name.textContent = selected.point.graphic || selected.point.direction;
				target.append( mark, name ); target.title = selected.text;
				target.style.width = target.style.height = `${ size }px`;
				target.style.left = `${ frozen.target.x }px`; target.style.top = `${ frozen.target.y }px`;
			}
		}
		pill.hidden = false; target.hidden = !frozen.target;
		const w = pill.getBoundingClientRect().width, h = pill.getBoundingClientRect().height;
		const line = innerHeight * readingAnchor(), bottom = innerHeight * .81;
		pill.style.left = `${ clamp( innerWidth * .2 - w / 2, 16, innerWidth - w - 16 ) }px`;
		pill.style.top = `${ Math.abs( bottom - line ) > h * 1.5 ? Math.min( bottom, innerHeight - h - 28 ) : 72 }px`;
	}
	window.addEventListener( "resize", () => { frozen = null; } );
	return { update, prepare: () => { if ( dirty ) rebuild(); }, status: () => ( { supported: true, enabled, mode: lastMode ? "recording" : "review", visible: !pill.hidden, cue: active ? { text: active.text, direction: active.point?.direction ?? null, graphic: active.point?.graphic ?? null } : null } ) };
}
