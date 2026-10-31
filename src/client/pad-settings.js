import { CONTROL_ACTIONS, normalisePadLayout, PAD_PRESETS } from "./control-actions.js";

// Short explicit pages keep the Settings frame stable; arrows also make
// reordering accessible without dragging, including across pages.
export function createPadSettings( root, save ) {
	const field = id => root.querySelector( `#${ id }` );
	let layout = normalisePadLayout();
	let page = 0;
	let dragging = null;
	let painted = false;
	const list = field( "set-pad-buttons" );
	const select = field( "set-pad-add" );
	for ( const group of new Set( CONTROL_ACTIONS.map( a => a.group ) ) ) {
		const optgroup = document.createElement( "optgroup" );
		optgroup.label = group;
		for ( const item of CONTROL_ACTIONS.filter( a => a.group === group ) ) optgroup.append( new Option( item.label, item.id ) );
		select.append( optgroup );
	}
	function paint( focus = null ) {
		painted = true;
		page = Math.max( 0, Math.min( page, Math.ceil( layout.buttons.length / 3 ) - 1 ) );
		field( "set-pad-columns" ).value = layout.columns;
		field( "set-pad-hold-finish" ).checked = layout.holdToFinish !== false;
		field( "set-pad-page" ).textContent = `${ page + 1 } of ${ Math.ceil( layout.buttons.length / 3 ) }`;
		field( "set-pad-prev" ).disabled = page === 0;
		field( "set-pad-next" ).disabled = ( page + 1 ) * 3 >= layout.buttons.length;
		for ( const option of select.options ) option.disabled = layout.buttons.includes( option.value );
		if ( select.selectedOptions[0]?.disabled ) select.value = [ ...select.options ].find( o => !o.disabled )?.value ?? "";
		field( "set-pad-insert" ).disabled = layout.buttons.length >= 36 || !select.value;
		list.replaceChildren();
		for ( let index = page * 3; index < Math.min( page * 3 + 3, layout.buttons.length ); index++ ) {
			const id = layout.buttons[index];
			const item = CONTROL_ACTIONS.find( a => a.id === id );
			const row = document.createElement( "div" );
			row.className = "pad-choice";
			row.dataset.id = id;
			row.draggable = true;
			const name = document.createElement( "span" );
			name.textContent = `${ index + 1 }. ${ item.label }`;
			row.append( name );
			for ( const [ label, delta ] of [ [ "Earlier", -1 ], [ "Later", 1 ], [ "Remove", 0 ] ] ) {
				const button = document.createElement( "button" );
				button.type = "button";
				button.textContent = label;
				button.setAttribute( "aria-label", `${ label }: ${ item.label }` );
				button.disabled = delta ? index + delta < 0 || index + delta >= layout.buttons.length : layout.buttons.length === 1;
				button.addEventListener( "click", () => {
					if ( delta ) {
						[ layout.buttons[index], layout.buttons[index + delta] ] = [ layout.buttons[index + delta], id ];
						page = Math.floor( ( index + delta ) / 3 );
					} else layout.buttons.splice( index, 1 );
					commit( delta ? id : null );
				} );
				row.append( button );
			}
			row.addEventListener( "dragstart", ( event ) => {
				dragging = id;
				event.dataTransfer.setData( "text/plain", id );
				event.dataTransfer.effectAllowed = "move";
			} );
			row.addEventListener( "dragend", () => {
				dragging = null;
			} );
			row.addEventListener( "dragover", event => event.preventDefault() );
			row.addEventListener( "drop", ( event ) => {
				event.preventDefault();
				const from = layout.buttons.indexOf( dragging );
				if ( from < 0 ) return;
				layout.buttons.splice( from, 1 );
				layout.buttons.splice( index, 0, dragging );
				commit( dragging );
				dragging = null;
			} );
			list.append( row );
		}
		if ( focus ) [ ...list.querySelectorAll( ".pad-choice" ) ].find( row => row.dataset.id === focus )?.querySelector( "button:not(:disabled)" )?.focus();
	}
	function commit( focus ) {
		paint( focus );
		save( { padLayout: layout } );
	}
	field( "set-pad-columns" ).addEventListener( "change", () => {
		layout.columns = Number( field( "set-pad-columns" ).value );
		commit();
	} );
	field( "set-pad-hold-finish" ).addEventListener( "change", () => {
		if ( field( "set-pad-hold-finish" ).checked ) delete layout.holdToFinish;
		else layout.holdToFinish = false;
		commit();
	} );
	field( "set-pad-insert" ).addEventListener( "click", () => {
		if ( !select.value || layout.buttons.includes( select.value ) || layout.buttons.length >= 36 ) return;
		const added = select.value;
		layout.buttons.push( added );
		page = Math.floor( ( layout.buttons.length - 1 ) / 3 );
		commit( added );
	} );
	for ( const [ id, step ] of [ [ "set-pad-prev", -1 ], [ "set-pad-next", 1 ] ] ) field( id ).addEventListener( "click", () => {
		page += step;
		paint();
	} );
	field( "set-pad-preset-use" ).addEventListener( "click", () => {
		layout = normalisePadLayout( PAD_PRESETS[field( "set-pad-preset" ).value] );
		page = 0;
		commit();
	} );
	return ( value ) => {
		const next = normalisePadLayout( value );
		if ( painted && JSON.stringify( next ) === JSON.stringify( layout ) ) return;
		layout = next;
		paint();
	};
}
