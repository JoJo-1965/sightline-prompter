import { SCRIPT_TOOL_GROUPS, SCRIPT_TOOLS } from "./script-tools.js";

export function createScriptToolMenu( { button, host, canInsert, insert, focusEditor } ) {
	let group = "directions";
	const make = ( tag, text, className = "" ) => Object.assign( document.createElement( tag ), { textContent: text, className } );
	const close = ( returnFocus = true ) => {
		host.hidden = true;
		button.setAttribute( "aria-expanded", "false" );
		if ( returnFocus ) focusEditor();
	};
	function paint() {
		host.replaceChildren();
		const header = make( "div", "", "script-tools-header" );
		const title = make( "h3", "Insert codes and directions" );
		title.id = "script-tools-title";
		const dismiss = make( "button", "×" );
		dismiss.type = "button";
		dismiss.setAttribute( "aria-label", "Close insert menu" );
		dismiss.addEventListener( "click", () => close() );
		header.append( title, dismiss );
		host.append( header, make( "p", "Insert at the cursor, replacing any selected text. Editable values stay selected. Codes run only during delivery.", "script-tools-hint" ) );
		const groups = make( "nav", "", "script-tools-groups" );
		groups.setAttribute( "aria-label", "Script tool groups" );
		for ( const entry of SCRIPT_TOOL_GROUPS ) {
			const tab = make( "button", entry.label );
			tab.type = "button";
			tab.dataset.toolGroup = entry.id;
			tab.setAttribute( "aria-pressed", String( group === entry.id ) );
			tab.addEventListener( "click", () => {
				group = entry.id;
				paint();
				host.querySelector( `[data-tool-group="${ group }"]` ).focus();
			} );
			groups.append( tab );
		}
		const list = make( "div", "", "script-tools-list" );
		for ( const item of SCRIPT_TOOLS.filter( entry => entry.group === group ) ) {
			const choice = make( "button", "", "script-tool-choice" );
			choice.type = "button";
			choice.dataset.scriptTool = item.id;
			choice.append( make( "strong", item.label ), make( "code", item.text ), make( "span", item.hint ) );
			choice.addEventListener( "click", () => {
				if ( !canInsert() ) return close( false );
				insert( item.id );
				close();
			} );
			list.append( choice );
		}
		host.append( groups, list );
	}
	button.addEventListener( "click", () => {
		if ( !canInsert() ) return;
		if ( !host.hidden ) return close();
		paint();
		host.hidden = false;
		host.style.top = `${ button.closest( "#editor-toolbar" ).offsetHeight + 8 }px`;
		button.setAttribute( "aria-expanded", "true" );
		host.querySelector( `[data-tool-group="${ group }"]` ).focus();
	} );
	document.addEventListener( "pointerdown", ( event ) => {
		if ( !host.hidden && !host.contains( event.target ) && !button.contains( event.target ) ) close( false );
	} );
	host.addEventListener( "keydown", ( event ) => {
		if ( event.key === "Escape" ) {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	} );
	return { close, sync: () => {
		button.disabled = !canInsert();
		if ( button.disabled ) close( false );
	} };
}
