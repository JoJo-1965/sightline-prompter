import { normalisePadLayout, controlView } from "./control-actions.js";
import { controlIcon } from "./control-icons.js";

export function createControlButtons( root, onCommand ) {
	let signature = "";
	root.addEventListener( "click", ( event ) => {
		const button = event.target.closest( "button[data-action]" );
		if ( button && !button.disabled && !button.hidden ) onCommand( button.dataset.action );
	} );
	return ( layout, status, offline = false ) => {
		const next = normalisePadLayout( layout );
		const key = next.buttons.join( "," );
		if ( signature !== key ) {
			root.replaceChildren( ...next.buttons.map( ( id ) => {
				const button = document.createElement( "button" );
				button.type = "button";
				button.dataset.action = id;
				const icon = document.createElement( "span" );
				icon.className = "control-icon";
				icon.setAttribute( "aria-hidden", "true" );
				button.append( icon, document.createElement( "span" ) );
				return button;
			} ) );
			signature = key;
		}
		root.style.setProperty( "--pad-columns", next.columns );
		for ( const button of root.children ) {
			const view = controlView( button.dataset.action, status );
			const icon = controlIcon( view.id, status );
			if ( button.firstElementChild.dataset.icon !== icon ) {
				button.firstElementChild.innerHTML = icon;
				button.firstElementChild.dataset.icon = icon;
			}
			button.lastElementChild.textContent = view.label;
			button.hidden = view.hidden;
			button.disabled = offline || view.disabled;
			button.classList.toggle( "active", view.active );
			button.classList.toggle( "primary", view.id === "toggle" );
			button.title = view.reason || view.label;
			button.setAttribute( "aria-pressed", String( view.active ) );
		}
	};
}
