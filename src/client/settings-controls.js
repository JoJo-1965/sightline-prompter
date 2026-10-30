// Explicit labels let help sit beside a setting without nesting an interactive
// button inside its label. IDs and the original input nodes remain unchanged.
export function prepareSettingsControls( root ) {
	if ( !root ) return;
	for ( const original of root.querySelectorAll( "label" ) ) {
		const control = original.querySelector( "input[id], select[id], textarea[id]" );
		if ( !control || original.closest( ".settings-option-name" ) ) continue;
		const row = document.createElement( "div" );
		for ( const attr of original.attributes ) row.setAttribute( attr.name, attr.value );
		row.dataset.settingsControl = control.id;
		const label = document.createElement( "label" );
		label.htmlFor = control.id;
		const name = document.createElement( "span" );
		name.className = "settings-option-name";
		control.remove();
		label.append( ...original.childNodes );
		name.append( label );
		if ( control.type === "checkbox" ) {
			row.classList.add( "settings-control-check" );
			row.append( control, name );
		} else {
			row.classList.add( original.classList.contains( "lp-row" ) ? "settings-control-range" : "settings-control-row" );
			row.append( name, control );
		}
		original.replaceWith( row );
	}
	for ( const row of root.querySelectorAll( ".lp-inline" ) ) {
		const control = row.querySelector( "select[id]" );
		if ( !control || control.labels.length ) continue;
		const name = document.createElement( "span" );
		name.className = "settings-option-name";
		const label = document.createElement( "label" );
		label.htmlFor = control.id;
		label.append( ...[ ...row.childNodes ].filter( node => node !== control ) );
		name.append( label );
		row.prepend( name );
		row.dataset.settingsControl = control.id;
	}
}
