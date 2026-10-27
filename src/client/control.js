// Control window page: a live, upright copy of the script that follows the
// prompter's reading line, the pacing light, and the prompter's buttons.

const md = document.getElementById( "md" );
const preview = document.getElementById( "preview" );
const readingLine = document.getElementById( "reading-line" );
const empty = document.getElementById( "empty" );
const pacingEl = document.getElementById( "pacing" );
const stateText = document.getElementById( "state-text" );
const sectionEl = document.getElementById( "section" );
const progressEl = document.getElementById( "progress" );
const speedEl = document.getElementById( "speed" );
const toggleLabel = document.getElementById( "toggle-label" );
const buttons = document.querySelectorAll( "#buttons button[data-action]" );

let anchor = 0.33; // the prompter's reading line, as a share of the height
let target = null; // where the copy should scroll to
let browseUntil = 0; // the operator scrolled the copy by hand: wait a moment

// --- Preview text size (remembered on this computer) ---
const SIZE_KEY = "controlPreviewSize";
let previewSize = 22;
try {
	previewSize = Number( localStorage.getItem( SIZE_KEY ) ) || 22;
} catch {
	// default size
}
function setPreviewSize( size ) {
	previewSize = Math.min( 48, Math.max( 12, size ) );
	document.documentElement.style.setProperty(
		"--preview-size",
		`${ previewSize }px`
	);
	try {
		localStorage.setItem( SIZE_KEY, String( previewSize ) );
	} catch {
		// not remembered this time
	}
}
setPreviewSize( previewSize );
document
	.getElementById( "size-down" )
	.addEventListener( "click", () => setPreviewSize( previewSize - 2 ) );
document
	.getElementById( "size-up" )
	.addEventListener( "click", () => setPreviewSize( previewSize + 2 ) );

function placeReadingLine() {
	const box = preview.getBoundingClientRect();
	readingLine.style.top = `${ Math.round( box.top + box.height * anchor ) }px`;
}
window.addEventListener( "resize", placeReadingLine );

// --- Content and position from the prompter ---

window.control.onContent( ( html ) => {
	md.innerHTML = html;
	// Links in a script do nothing here.
	for ( const a of md.querySelectorAll( "a[href]" ) ) a.removeAttribute( "href" );
	empty.classList.toggle( "hidden", md.children.length > 0 );
	target = null;
} );

window.control.onPosition( ( p ) => {
	if ( Number.isFinite( p.anchor ) ) anchor = p.anchor;
	placeReadingLine();
	document.body.classList.toggle( "points", !!p.points );
	for ( const el of md.children ) {
		el.classList.toggle(
			"current-section",
			!!p.points && el.dataset.section === String( p.pointsIndex )
		);
	}
	const block = md.children[p.index];
	if ( block ) {
		const at = block.offsetTop + p.fraction * block.offsetHeight;
		target = at - preview.clientHeight * anchor;
	}
	showPacing( p.pacing );
} );

function showPacing( pacing ) {
	if ( !pacing ) {
		pacingEl.classList.add( "hidden" );
		return;
	}
	pacingEl.className = pacing.level ?? "";
	pacingEl.replaceChildren(
		...( pacing.parts ?? [] ).map( ( [ cls, text ] ) => {
			const span = document.createElement( "span" );
			span.className = cls;
			span.textContent = text;
			return span;
		} )
	);
}

// Ease towards the prompter's position, so the copy moves smoothly.
function follow() {
	if ( target !== null && Date.now() > browseUntil ) {
		const goal = Math.max( 0, target );
		const gap = goal - preview.scrollTop;
		if ( Math.abs( gap ) > preview.clientHeight * 2 ) preview.scrollTop = goal;
		else if ( Math.abs( gap ) > 0.5 ) preview.scrollTop += gap * 0.25;
	}
	requestAnimationFrame( follow );
}
requestAnimationFrame( follow );

preview.addEventListener(
	"wheel",
	() => {
		browseUntil = Date.now() + 4000;
	},
	{ passive: true }
);

// Click a line to move the prompter there.
preview.addEventListener( "click", ( e ) => {
	const block = e.target.closest?.( "#md > *" );
	if ( !block ) return;
	const rect = block.getBoundingClientRect();
	const fraction = rect.height ? ( e.clientY - rect.top ) / rect.height : 0;
	browseUntil = 0;
	window.control.jump(
		[ ...md.children ].indexOf( block ),
		Math.min( 1, Math.max( 0, fraction ) )
	);
} );

// --- Status line and buttons ---

window.control.onStatus( ( s ) => {
	const running = !!s.scrolling;
	document.body.classList.toggle( "running", running );
	toggleLabel.textContent = running ? "Pause" : "Start";
	stateText.textContent = s.editing
		? "Editing the script"
		: running
			? "Running"
			: "Paused";
	sectionEl.textContent = s.sectionTitle ?? "";
	progressEl.textContent = s.progress ?? "";
	speedEl.textContent = s.speed ?? "";
	const unit = s.points ? "point" : "section";
	document.querySelector( "#prev span" ).textContent = s.points
		? "Previous point"
		: "Previous";
	document.querySelector( "#next span" ).textContent = s.points
		? "Next point"
		: "Next";
	document.getElementById( "prev" ).title = `Previous ${ unit } (Page Up)`;
	document.getElementById( "next" ).title = `Next ${ unit } (Page Down)`;
	for ( const b of buttons ) b.disabled = !!s.editing;
} );

for ( const b of buttons ) {
	b.addEventListener( "click", () => {
		window.control.command( b.dataset.action );
		b.blur();
	} );
}

const KEYS = {
	" ": "toggle",
	PageDown: "next-section",
	ArrowRight: "next-section",
	PageUp: "previous-section",
	ArrowLeft: "previous-section",
	Home: "restart",
	ArrowUp: "faster",
	ArrowDown: "slower",
	b: "marker",
	B: "marker"
};
document.addEventListener( "keydown", ( e ) => {
	if ( e.ctrlKey || e.altKey || e.metaKey ) return;
	const action = KEYS[e.key];
	if ( !action ) return;
	e.preventDefault();
	window.control.command( action );
} );

placeReadingLine();
