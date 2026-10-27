// Rehearsal timer: write section times from a practice run into the script
// as {target: m:ss}. Sections are the H2 headings ("## Title", or
// "=== TITLE" in plain-text scripts), counted in order as the prompter does.

const H2 = /^ {0,3}##(?!#)/;
const TEXT_SECTION = /^={3,}[ \t]*\S/;
const FENCE = /^ {0,3}(```|~~~)/;
const TARGET_IN_DIRECTIVE = /(\{[^{}]*?\btarget\s*:\s*)([^,}]*?)(\s*[,}])/;
const DIRECTIVE_ONLY_LINE = /^\s*(\{[^{}]*\}\s*)+$/;
const BOM = String.fromCharCode( 0xfeff );

export function formatTarget( seconds ) {
	const s = Math.max( 5, Math.round( seconds / 5 ) * 5 );
	return `${ Math.floor( s / 60 ) }:${ String( s % 60 ).padStart( 2, "0" ) }`;
}

function setTargetOnLine( line, value ) {
	if ( TARGET_IN_DIRECTIVE.test( line ) ) {
		return line.replace(
			TARGET_IN_DIRECTIVE,
			( _m, a, _old, c ) => `${ a }${ value }${ c }`
		);
	}
	return null;
}

function appendTarget( line, value, textSection ) {
	const tag = `{target: ${ value }}`;
	if ( textSection ) {
		// "=== TITLE ===": keep the closing ='s at the end of the line.
		const m = line.match( /^(.*?\S)([ \t]*=*[ \t]*)$/ );
		const closing = m[2].trim();
		return `${ m[1] } ${ tag }${ closing ? ` ${ closing }` : "" }`;
	}
	return `${ line.replace( /[ \t]+$/, "" ) } ${ tag }`;
}

// targets: { [sectionIndex]: seconds }. Returns { text, changed }.
export function setSectionTargets( text, targets ) {
	const eol = text.includes( "\r\n" ) ? "\r\n" : "\n";
	const lines = text.split( /\r?\n/ );
	let start = 0;
	// Skip YAML front matter.
	if ( /^---\s*$/.test( lines[0].replace( BOM, "" ) ) ) {
		const end = lines.findIndex( ( l, i ) => i > 0 && /^---\s*$/.test( l ) );
		if ( end > 0 ) start = end + 1;
	}
	let inFence = false;
	let section = -1;
	let changed = 0;
	for ( let i = start; i < lines.length; i++ ) {
		const line = lines[i];
		if ( FENCE.test( line ) ) {
			inFence = !inFence;
			continue;
		}
		if ( inFence ) continue;
		const textSection = TEXT_SECTION.test( line );
		if ( !H2.test( line ) && !textSection ) continue;
		section++;
		if ( !( section in targets ) ) continue;
		const value = formatTarget( targets[section] );
		const onHeading = setTargetOnLine( line, value );
		if ( onHeading !== null ) {
			lines[i] = onHeading;
			changed++;
			continue;
		}
		// A directive alone on the next non-blank line belongs to the heading.
		let next = i + 1;
		while ( next < lines.length && !lines[next].trim() ) next++;
		const nextLine = lines[next];
		if ( nextLine !== undefined && DIRECTIVE_ONLY_LINE.test( nextLine ) ) {
			const onNext = setTargetOnLine( nextLine, value );
			if ( onNext !== null ) {
				lines[next] = onNext;
				changed++;
				continue;
			}
		}
		lines[i] = appendTarget( line, value, textSection );
		changed++;
	}
	return { text: lines.join( eol ), changed };
}
