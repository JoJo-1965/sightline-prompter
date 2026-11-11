import { decorateScript } from "./decorate.js";

const blocksIn = root => [ ...root.querySelectorAll( "p,li" ) ].filter( el => !el.querySelector( "p,li" ) );
function spokenText( element ) {
	const copy = element.cloneNode( true );
	copy.querySelectorAll( ".dir-text,.app-directive,.live-marker" ).forEach( el => el.remove() );
	return copy.textContent.replace( /\s+/gu, " " ).trim();
}

export function createQuickEdit( root, { canStart, begin, finish, dirty, apply, notice } ) {
	let session = null, opening = false;
	const frame = () => new Promise( resolve => requestAnimationFrame( resolve ) );
	function restore( state ) {
		const element = state.target.isConnected ? state.target : blocksIn( root )[state.index];
		if ( element ) window.scrollBy( 0, element.getBoundingClientRect().top - state.top );
	}
	async function close( packet = null ) {
		if ( !session || session.busy ) return false;
		const state = session;
		state.busy = true;
		const fresh = await window.electron.endQuickEdit( state.id );
		if ( packet?.html || fresh?.html ) apply( fresh?.html ? fresh : packet );
		await frame();
		await finish( () => restore( state ) );
		state.target.classList.remove( "quick-edit-target" );
		state.box.remove();
		session = null;
		dirty( false );
		document.body.classList.remove( "quick-editing" );
		return true;
	}
	async function save() {
		if ( !session || session.busy ) return false;
		const state = session;
		state.busy = true;
		state.save.disabled = state.cancel.disabled = true;
		try {
			const packet = await window.electron.saveQuickEdit( { id: state.id, from: state.block.from, to: state.block.to, before: state.block.text, after: state.input.value } );
			state.busy = false;
			if ( !packet.ok ) throw new Error( packet.error );
			await close( packet );
			notice( "Paragraph saved · prompting stays paused" );
			return true;
		} catch ( error ) {
			state.busy = false;
			state.save.disabled = state.cancel.disabled = false;
			state.message.textContent = error.message;
			state.input.focus();
			return false;
		}
	}
	async function open( target, event ) {
		if ( opening || session || !canStart() ) return;
		opening = true;
		const top = target.getBoundingClientRect().top;
		const selected = window.getSelection()?.toString() ?? "";
		let snapshot;
		try {
			snapshot = await begin();
			if ( !snapshot?.ok ) throw new Error( snapshot?.error ?? "Finish the current edit first." );
			const text = spokenText( target ), rendered = blocksIn( root ), matching = rendered.filter( el => spokenText( el ) === text );
			const candidates = window.EditorModule.quickEditParagraphs( snapshot.text ).filter( ( block ) => {
				const template = document.createElement( "template" );
				template.innerHTML = block.html;
				decorateScript( template.content, { highlight: false } );
				return spokenText( template.content ) === text;
			} );
			if ( !text || candidates.length !== matching.length ) throw new Error( "Use Edit for this paragraph so its formatting stays intact." );
			const block = candidates[matching.indexOf( target )];
			if ( !block ) throw new Error( "Reopen the paragraph after the script finishes loading." );
			const box = document.createElement( "section" );
			box.className = "quick-edit-box";
			box.setAttribute( "role", "group" );
			box.setAttribute( "aria-label", "Quick paragraph edit" );
			box.innerHTML = "<h3>Edit paragraph</h3><textarea aria-label=\"Paragraph text\" spellcheck=\"true\"></textarea><p class=\"quick-edit-hint\">Enter: line break · Ctrl+Enter: save · Esc: cancel</p><p class=\"quick-edit-message\" role=\"status\"></p><div class=\"quick-edit-actions\"><button type=\"button\" data-cancel>Cancel</button><button type=\"button\" class=\"primary\" data-save>Save</button></div>";
			const input = box.querySelector( "textarea" );
			input.value = block.text;
			const saveButton = box.querySelector( "[data-save]" ), cancel = box.querySelector( "[data-cancel]" );
			session = { id: snapshot.id, block, target, top, index: rendered.indexOf( target ), box, input, save: saveButton, cancel, message: box.querySelector( ".quick-edit-message" ), busy: false };
			target.classList.add( "quick-edit-target" );
			document.body.classList.add( "quick-editing" );
			document.body.append( box );
			const bar = document.getElementById( "control-bar" ).getBoundingClientRect();
			box.style.maxHeight = `${ Math.max( 150, innerHeight - bar.height - 24 ) }px`;
			const rect = box.getBoundingClientRect();
			box.style.left = `${ Math.max( 12, Math.min( event.clientX - rect.width / 2, innerWidth - rect.width - 12 ) ) }px`;
			box.style.top = `${ Math.max( bar.height + 8, Math.min( event.clientY + 8, innerHeight - rect.height - 12 ) ) }px`;
			input.addEventListener( "input", () => dirty( input.value !== block.text ) );
			box.addEventListener( "keydown", ( key ) => {
				key.stopPropagation();
				if ( key.key === "Escape" ) {
					key.preventDefault();
					close();
				} else if ( key.key === "Enter" && ( key.ctrlKey || key.metaKey ) ) {
					key.preventDefault();
					save();
				} else if ( key.key === "Enter" && key.target === input ) {
					key.preventDefault();
					input.setRangeText( "  \n", input.selectionStart, input.selectionEnd, "end" );
					dirty( true );
				}
			} );
			saveButton.addEventListener( "click", save );
			cancel.addEventListener( "click", () => close() );
			input.focus( { preventScroll: true } );
			const at = selected ? input.value.indexOf( selected ) : -1;
			input.setSelectionRange( Math.max( 0, at ), Math.max( 0, at ) + ( at < 0 ? 0 : selected.length ) );
		} catch ( error ) {
			if ( snapshot?.id ) await window.electron.endQuickEdit( snapshot.id );
			finish();
			notice( error.message );
		} finally {
			opening = false;
		}
	}
	root.addEventListener( "dblclick", ( event ) => {
		if ( event.target.closest( ".dir-text,.app-directive,a,code,pre,button,input,textarea" ) ) return;
		const target = event.target.closest( "p,li" );
		if ( !target || !root.contains( target ) || target.querySelector( "p,li" ) ) return;
		if ( !canStart() ) return;
		event.preventDefault();
		open( target, event );
	} );
	return { get active() {
		return opening || !!session;
	}, save, cancel: () => close(),
	abort() {
		if ( !session ) return;
		const state = session;
		session = null;
		state.box.remove();
		state.target.classList.remove( "quick-edit-target" );
		window.electron.endQuickEdit( state.id );
		document.body.classList.remove( "quick-editing" );
		dirty( false );
		finish();
	}
	};
}
