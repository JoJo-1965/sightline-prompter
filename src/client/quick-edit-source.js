import { markdownLanguage } from "@codemirror/lang-markdown";
import showdown from "showdown";
import { preprocessScriptText } from "../script-text.js";

// Keep exact source offsets. Never round-trip a rendered paragraph to Markdown.
export function quickEditParagraphs( source ) {
	const converter = new showdown.Converter(), blocks = [];
	const front = source.match( /^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/ )?.[0].length ?? 0;
	markdownLanguage.parser.parse( source ).iterate( {
		enter( node ) {
			if ( node.name !== "Paragraph" || node.from < front ) return;
			let to = node.to;
			while ( to > node.from && /[\r\n]/.test( source[to - 1] ) ) to--;
			const text = source.slice( node.from, to );
			blocks.push( { from: node.from, to, text, html: converter.makeHtml( preprocessScriptText( text ) ) } );
		}
	} );
	return blocks;
}
