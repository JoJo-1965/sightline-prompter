export const actionWords = text => String( text ).toLowerCase().replace( /[.…·]/g, " " ).replace( /[^a-z0-9 ]/g, " " ).replace( /\s+/g, " " ).trim();
export function visibleActions( root ) {
	return [ ...root.querySelectorAll( "button" ) ].filter( button => !button.disabled && button.getAttribute( "aria-disabled" ) !== "true" && !button.closest( "[hidden],.hidden,[inert]" ) && button.getClientRects().length && button.ownerDocument.defaultView.getComputedStyle( button ).visibility !== "hidden" );
}
// Exact unique label only: disabled, hidden and ambiguous actions never run.
export function matchingAction( buttons, phrase ) {
	const words = actionWords( phrase );
	const matches = buttons.filter( button => actionWords( button.textContent ?? button.label ) === words );
	return matches.length === 1 ? matches[0] : null;
}
