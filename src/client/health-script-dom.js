import { decorateScript } from "./decorate.js";
import { readDirectives } from "./directives.js";

// Template content is inert: the review never mounts script HTML or loads its
// embedded media. Decoration is shared with the prompter, including [Say: …].
export function healthSections( html ) {
	const template = document.createElement( "template" );
	template.innerHTML = html;
	const root = template.content;
	for ( const el of root.querySelectorAll( "script, style, iframe, img, video, audio, object, embed, link" ) ) el.remove();
	decorateScript( root, { highlight: false } );
	const directives = readDirectives( root );
	const clean = ( el ) => {
		const copy = el.cloneNode( true );
		for ( const node of copy.querySelectorAll( ".dir-text, .app-directive, code, pre" ) ) node.remove();
		return copy.textContent.trim().replace( /\s+/g, " " );
	};
	const sections = [ { section: 0, title: "Opening", blocks: [], pauses: 0, wpm: directives.script.wpm, target: directives.script.targetSeconds } ];
	let current = sections[0];
	let previousBlock = null;
	const walker = document.createTreeWalker( root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT );
	let node;
	while ( ( node = walker.nextNode() ) ) {
		if ( node.nodeType === Node.ELEMENT_NODE && node.tagName === "H2" ) {
			const config = directives.sections.find( item => item.heading === node );
			current = { section: sections.length, title: clean( node ), blocks: [], pauses: 0, wpm: config?.wpm ?? directives.script.wpm, target: config?.targetSeconds };
			sections.push( current );
			previousBlock = null;
		}
		if ( node.nodeType !== Node.TEXT_NODE || node.parentElement?.closest( "h1,h2,h3,h4,h5,h6,.dir-text,.app-directive,code,pre" ) ) continue;
		if ( !node.nodeValue.trim() ) continue;
		const block = node.parentElement?.closest( "p,li,blockquote,td,th,div" ) ?? node.parentElement;
		if ( previousBlock !== block ) current.blocks.push( "" );
		current.blocks[current.blocks.length - 1] += node.nodeValue;
		previousBlock = block;
	}
	for ( const pause of directives.pauses.filter( item => item.seconds > 0 ) ) {
		const headings = directives.sections.filter( item => item.heading.compareDocumentPosition( pause.el ) & Node.DOCUMENT_POSITION_FOLLOWING );
		sections[headings.length].pauses += pause.seconds;
	}
	return { sections: sections.filter( section => section.section || section.blocks.length ), notes: [ "notes", "points" ].includes( directives.script.mode ) };
}
