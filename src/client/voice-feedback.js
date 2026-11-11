// One voice listener, mirrored feedback in the script and its local panels.
// No focus changes, sounds, capture permissions or additional microphone use.
export function createVoiceFeedback( { documents, clock = Date.now, schedule = setTimeout, cancel = clearTimeout } ) {
	const nodes = new Set();
	let current = null;
	let expires = 0;
	let timer;
	function hide() {
		for ( const node of nodes ) node.hidden = true;
		nodes.clear();
		current = null;
	}
	function refresh() {
		if ( !current || clock() >= expires ) return;
		for ( const doc of documents() ) {
			if ( !doc.body ) continue;
			let node = doc.getElementById( "voice-feedback" );
			if ( !node ) {
				node = doc.createElement( "div" );
				node.id = "voice-feedback";
				node.className = "voice-feedback";
				node.setAttribute( "role", "status" );
				node.setAttribute( "aria-live", "polite" );
				node.setAttribute( "aria-atomic", "true" );
				node.append( doc.createElement( "strong" ), doc.createElement( "span" ) );
				doc.body.append( node );
			}
			node.firstElementChild.textContent = current.title;
			node.lastElementChild.textContent = current.detail;
			node.dataset.kind = current.kind ?? "heard";
			node.hidden = false;
			nodes.add( node );
		}
	}
	return {
		show( title, detail = "", kind = "heard", duration = 5000 ) {
			cancel( timer );
			current = { title, detail, kind };
			expires = clock() + duration;
			refresh();
			timer = schedule( hide, duration );
		},
		refresh,
		hide
	};
}
