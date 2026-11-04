import { MAPPING_ACTIONS, normaliseMappings, inputId, inputLabel } from "./input-mappings.js";

export function createMappingSettings( root, save, { kind = "key", prefix = "set-map" } = {} ) {
	const field = id => root.querySelector( `#${ id.replace( "set-map", prefix ) }` );
	const choices = field( "set-map-action" );
	for ( const group of new Set( MAPPING_ACTIONS.map( item => item.group ) ) ) {
		const options = document.createElement( "optgroup" );
		options.label = group;
		for ( const item of MAPPING_ACTIONS.filter( action => action.group === group ) ) options.append( new Option( item.label, item.id ) );
		choices.append( options );
	}
	choices.append( new Option( "Next marker", "next-marker" ), new Option( "Do nothing", "none" ) );
	let rows = normaliseMappings();
	let selected = "";
	const picker = document.createElement( "select" );
	picker.dataset.navigationChoice = "true";
	picker.setAttribute( "aria-label", kind === "key" ? "Keyboard mapping" : "Controller mapping" );
	field( "set-map-page" ).closest( "nav" ).hidden = true;
	field( "set-map-prev" ).remove();
	field( "set-map-next" ).remove();
	picker.addEventListener( "change", () => {
		selected = picker.value;
		paint();
	} );
	let learning = false;
	let timer;
	function cancel() {
		learning = false;
		clearTimeout( timer );
		field( "set-map-learn" ).textContent = kind === "key" ? "Assign a key…" : "Assign a controller button…";
		field( "set-map-cancel" ).hidden = true;
	}
	function paint() {
		const matching = rows.filter( item => item.kind === kind );
		if ( !matching.some( item => inputId( item ) === selected ) ) selected = matching[0] ? inputId( matching[0] ) : "";
		picker.replaceChildren( ...matching.map( item => new Option( inputLabel( item ), inputId( item ) ) ) );
		if ( !matching.length ) picker.append( new Option( "No custom mappings", "" ) );
		picker.value = selected;
		picker.disabled = !matching.length;
		const list = field( "set-map-list" );
		list.replaceChildren();
		list.setAttribute( "aria-label", `All ${ matching.length } ${ kind === "key" ? "keyboard" : "controller" } assignments` );
		for ( const row of matching ) {
			const line = document.createElement( "div" );
			line.className = "mapping-row";
			const label = document.createElement( "span" );
			label.textContent = inputLabel( row );
			label.title = label.textContent;
			const action = choices.cloneNode( true );
			action.removeAttribute( "id" );
			action.setAttribute( "aria-label", `Action for ${ inputLabel( row ) }` );
			action.value = row.action;
			action.addEventListener( "change", () => {
				row.action = action.value;
				save( { inputMappings: rows } );
			} );
			const remove = document.createElement( "button" );
			remove.type = "button";
			remove.textContent = "Remove";
			remove.setAttribute( "aria-label", `Remove ${ inputLabel( row ) }` );
			remove.addEventListener( "click", () => {
				rows = rows.filter( item => item !== row );
				paint();
				save( { inputMappings: rows } );
				field( "set-map-learn" ).focus();
			} );
			line.append( label, action, remove );
			list.append( line );
		}
	}
	function learn( input ) {
		if ( !learning || input.kind !== kind ) return false;
		const existing = rows.find( row => inputId( row ) === inputId( input ) );
		if ( !existing && rows.length >= 80 ) {
			cancel();
			field( "set-map-notice" ).textContent = "Remove a mapping before adding another.";
			return true;
		}
		const row = { ...input, action: choices.value };
		if ( existing ) rows[rows.indexOf( existing )] = row;
		else rows.push( row );
		selected = inputId( row );
		cancel();
		paint();
		field( "set-map-notice" ).textContent = `${ inputLabel( input ) } assigned to ${ choices.selectedOptions[0].textContent }. Apply to save.`;
		save( { inputMappings: rows } );
		field( "set-map-learn" ).focus();
		return true;
	}
	field( "set-map-learn" ).addEventListener( "click", () => {
		learning = true;
		field( "set-map-learn" ).textContent = "Listening for a key or button…";
		field( "set-map-cancel" ).hidden = false;
		field( "set-map-notice" ).textContent = "Press once. Escape cancels. Modified system shortcuts stay reserved.";
		clearTimeout( timer );
		timer = setTimeout( () => {
			cancel();
			field( "set-map-notice" ).textContent = "No button received. Try again.";
		}, 15000 );
	} );
	field( "set-map-cancel" ).addEventListener( "click", cancel );
	field( "set-map-reset" ).addEventListener( "click", () => {
		cancel();
		rows = [ ...rows.filter( item => item.kind !== kind ), ...normaliseMappings().filter( item => item.kind === kind ) ];
		selected = "";
		paint();
		save( { inputMappings: rows } );
		field( "set-map-notice" ).textContent = kind === "key" ? "Custom keyboard mappings cleared in this draft. Core shortcuts stay available." : "Default game-controller mappings restored in this draft.";
	} );
	return {
		learn, cancel,
		get learning() {
			return learning;
		},
		sync( value ) {
			const next = normaliseMappings( value );
			if ( JSON.stringify( rows ) !== JSON.stringify( next ) || !field( "set-map-list" ).children.length ) {
				rows = next;
				field( "set-map-notice" ).textContent = "";
				paint();
			}
		}
	};
}
