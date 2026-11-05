// Navigation-only onboarding. Never applies settings or starts a device.
export function tourSteps( settings = {} ) {
	const steps = [
		[ "getting-started", "Start with your script", "Open a script or a sample from Files. This page summarises your setup and links to the controls you need." ],
		[ "mode", "Choose how you read", "Scroll moves at a steady pace. Voice follows your words. Notes / page mode advances through talking points. The page shows the controls that apply." ],
		[ "typography", "Make each kind of text clear", "Speech, headings, inline cues and production notes have separate font, colour, style and spacing controls. Use the reading example beside them." ],
		[ "background", "Save a comfortable reading view", "Adjust the theme and background, then save your reading appearance as a custom theme. Apply saves changes; Cancel restores the applied appearance." ],
		[ "checklist", "Prepare before the take", "Align your head, check audio, review a short test and save a recording reference. Return after a break to match your framing. Devices start only when you choose them." ],
		[ "pad", "Connect only what you use", "Connections groups the pad, phone, controllers and optional recording tools. Each interface has its own enable switch. Its configuration appears when enabled." ]
	];
	if ( settings.obsEnabled ) steps.push( [ "obs", "Check the recorder separately", "Connection success and recording state are separate. Recording control needs permission. Confirm Recording before making a slate or visible clap." ] );
	if ( settings.streamDeck ) steps.push( [ "streamdeck", "Check your Stream Deck connection", "Use the connection and version checks, then choose a starter profile. Prompting keys and optional recording actions have distinct purposes." ] );
	if ( settings.remoteControl ) steps.push( [ "api", "Give your assistant explicit access", "Local MCP, scripting and recording have separate permissions. Configure only the access your assistant needs; disabling the connection revokes it." ] );
	steps.push( [ "takes", "Review the recorded performance", "Review recorded audio opens post-record transcription, script comparisons and file alignment. Export the reviewed pack for your editor; your original live log is retained." ],
		[ "getting-started", "Return whenever you need", "Rerun this tour here or from Help. Skip tour or Escape ends it at any point. Settings search and the built-in user guide are always available." ] );
	return steps.map( ( [ page, title, text ] ) => ( { page, title, text } ) );
}

const CSS = `.sightline-coach-card,.sightline-tour-offer{position:fixed;z-index:2147483601;background:#202a35;color:#f5f6f9;border:1px solid #efc965;border-radius:8px;padding:18px;box-shadow:0 6px 24px #0009;font:14px/1.6 'Segoe UI',system-ui,sans-serif;text-align:left;box-sizing:border-box}.sightline-coach-card h2,.sightline-tour-offer strong{font-size:18px;line-height:1.35;margin:8px 0 12px;text-wrap:balance;display:block}.sightline-coach-card p,.sightline-tour-offer p{margin:8px 0 16px;text-wrap:pretty}.sightline-coach-card button,.sightline-tour-offer button{font:inherit;min-height:34px;padding:5px 12px;background:#344454;color:#fff;border:1px solid #718398;border-radius:5px;cursor:pointer}.sightline-coach-card button:disabled{opacity:.45;cursor:default}.sightline-coach-card button:focus-visible,.sightline-tour-offer button:focus-visible{outline:2px solid #efc965;outline-offset:3px}.sightline-coach-card .coach-actions,.sightline-tour-offer .coach-actions{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.coach-progress{font-size:12px;color:#efc965}.sightline-coach-highlight{outline:2px solid #efc965!important;outline-offset:4px!important}.sightline-tour-offer{right:20px;top:68px;width:min(350px,calc(100vw - 40px))}.sightline-coach-card [data-next]{background:#28577e}`;
function style( doc ) { if ( !doc.getElementById( "sightline-coach-style" ) ) { const node = doc.createElement( "style" ); node.id = "sightline-coach-style"; node.textContent = CSS; doc.head.append( node ); } }

export function createCoachMarks( { getSettings, navigate, target, canStart = () => true, unavailable = () => {} } ) {
	let steps = [], index = 0, active = false, card = null, highlighted = null, timer = null, escapeDocs = [], resizeView = null, resizeHandler = null, returnFocus = null, generation = 0;
	const cleanup = () => {
		card?.remove(); card = null; highlighted?.classList.remove( "sightline-coach-highlight" ); highlighted = null;
		clearInterval( timer ); for ( const doc of escapeDocs ) doc.removeEventListener( "keydown", escape, true ); escapeDocs = [];
		resizeView?.removeEventListener( "resize", resizeHandler ); resizeView = null; resizeHandler = null;
	};
	function close() { active = false; generation++; cleanup(); if ( returnFocus?.isConnected && returnFocus.getBoundingClientRect().width ) returnFocus.focus(); }
	function escape( event ) { if ( event.key === "Escape" ) { event.preventDefault(); event.stopImmediatePropagation(); close(); } }
	async function show( next ) {
		if ( !active ) return;
		const token = ++generation; cleanup(); index = next;
		const step = steps[index];
		await navigate( step.page );
		if ( !active || token !== generation ) return;
		highlighted = target( step.page );
		const doc = highlighted?.ownerDocument ?? document, view = doc.defaultView;
		style( doc ); highlighted?.classList.add( "sightline-coach-highlight" );
		card = doc.createElement( "section" ); card.className = "sightline-coach-card"; card.dataset.step = String( index ); card.setAttribute( "role", "dialog" ); card.setAttribute( "aria-modal", "false" ); card.setAttribute( "aria-label", "Sightline guided tour" );
		const progress = doc.createElement( "div" ); progress.className = "coach-progress"; progress.textContent = `Step ${ index + 1 } of ${ steps.length }`;
		const title = doc.createElement( "h2" ); title.textContent = step.title;
		const text = doc.createElement( "p" ); text.textContent = step.text;
		const actions = doc.createElement( "div" ); actions.className = "coach-actions";
		const button = ( label, fn ) => { const node = doc.createElement( "button" ); node.type = "button"; node.textContent = label; node.addEventListener( "click", fn ); actions.append( node ); return node; };
		button( "Skip tour", close ).dataset.skip = "true";
		button( "Back", () => show( index - 1 ) ).disabled = index === 0;
		const nextButton = button( index === steps.length - 1 ? "Finish" : "Next", () => index === steps.length - 1 ? close() : show( index + 1 ) ); nextButton.dataset.next = "true";
		card.append( progress, title, text, actions ); doc.body.append( card );
		const position = () => {
			if ( !card || view.closed || !canStart() ) { close(); return; }
			const width = Math.min( 360, view.innerWidth - 32 ); card.style.width = width + "px";
			const rect = highlighted?.getBoundingClientRect();
			const x = rect && rect.right + width + 28 < view.innerWidth ? rect.right + 16 : view.innerWidth - width - 20;
			const y = rect && rect.top > 30 ? rect.top + 26 : 60;
			card.style.left = Math.max( 16, x ) + "px";
			card.style.top = Math.max( 16, Math.min( y, view.innerHeight - card.offsetHeight - 16 ) ) + "px";
		};
		position(); timer = setInterval( position, 250 ); resizeView = view; resizeHandler = position; view.addEventListener( "resize", position ); escapeDocs = [ ...new Set( [ document, doc ] ) ]; for ( const item of escapeDocs ) item.addEventListener( "keydown", escape, true ); nextButton.focus();
	}
	return {
		get active() { return active; },
		async start() {
			if ( !canStart() ) { unavailable(); return; }
			close(); document.querySelector( ".sightline-tour-offer" )?.remove(); returnFocus = document.activeElement;
			steps = tourSteps( getSettings() ); index = 0; active = true;
			try { await show( 0 ); } catch { close(); unavailable(); }
		},
		close,
		offer() {
			if ( !canStart() ) return;
			try { if ( localStorage.getItem( "sightline-tour-offered-v1" ) ) return; localStorage.setItem( "sightline-tour-offered-v1", "1" ); } catch { return; }
			style( document );
			const node = document.createElement( "aside" ); node.className = "sightline-tour-offer"; node.setAttribute( "aria-label", "Quick tour" );
			const title = document.createElement( "strong" ); title.textContent = "Find your way around Sightline";
			const text = document.createElement( "p" ); text.textContent = "A short optional tour points out reading, preparation and recording controls. You can leave at any time.";
			const actions = document.createElement( "div" ); actions.className = "coach-actions";
			const start = document.createElement( "button" ); start.textContent = "Take a tour"; start.addEventListener( "click", () => { node.remove(); this.start(); } );
			const cancel = document.createElement( "button" ); cancel.textContent = "Not now"; cancel.addEventListener( "click", () => node.remove() );
			actions.append( start, cancel ); node.append( title, text, actions ); document.body.append( node );
		}
	};
}
