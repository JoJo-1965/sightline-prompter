import { MAPPING_ACTIONS, normaliseMappings, inputId, inputLabel } from "./input-mappings.js";

export function createMappingSettings( root, save ) {
	const field = id => root.querySelector( `#${ id }` );
	const choices = field( "set-map-action" );
	for ( const group of new Set( MAPPING_ACTIONS.map( item => item.group ) ) ) {
		const options = document.createElement( "optgroup" );
		options.label = group;
		for ( const item of MAPPING_ACTIONS.filter( action => action.group === group ) ) options.append( new Option( item.label, item.id ) );
		choices.append( options );
	}
	choices.append( new Option( "Next marker", "next-marker" ), new Option( "Do nothing", "none" ) );
	let rows = normaliseMappings();
	let page = 0;
	let learning = false;
	let timer;
	function cancel() {
		learning = false;
		clearTimeout( timer );
		field( "set-map-learn" ).textContent = "Press a key or button…";
		field( "set-map-cancel" ).hidden = true;
	}
	function paint() {
		page = Math.max( 0, Math.min( page, Math.ceil( rows.length / 3 ) - 1 ) );
		field( "set-map-page" ).textContent = rows.length ? `${ page + 1 } of ${ Math.ceil( rows.length / 3 ) }` : "No custom mappings";
		field( "set-map-prev" ).disabled = page === 0;
		field( "set-map-next" ).disabled = ( page + 1 ) * 3 >= rows.length;
		const list = field( "set-map-list" );
		list.replaceChildren();
		for ( const row of rows.slice( page * 3, page * 3 + 3 ) ) {
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
		if ( !learning ) return false;
		const existing = rows.find( row => inputId( row ) === inputId( input ) );
		if ( !existing && rows.length >= 80 ) {
			cancel();
			field( "set-map-notice" ).textContent = "Remove a mapping before adding another.";
			return true;
		}
		const row = { ...input, action: choices.value };
		if ( existing ) rows[rows.indexOf( existing )] = row;
		else rows.push( row );
		page = Math.floor( rows.indexOf( row ) / 3 );
		cancel();
		paint();
		field( "set-map-notice" ).textContent = `${ inputLabel( input ) } assigned to ${ choices.selectedOptions[0].textContent }. Saved.`;
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
		rows = normaliseMappings();
		page = 0;
		paint();
		save( { inputMappings: null } );
		field( "set-map-notice" ).textContent = "Default controller mappings restored. Custom key mappings cleared.";
	} );
	for ( const [ id, step ] of [ [ "set-map-prev", -1 ], [ "set-map-next", 1 ] ] ) field( id ).addEventListener( "click", () => {
		page += step;
		paint();
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
				paint();
			}
		}
	};
}
