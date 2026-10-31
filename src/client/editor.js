import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment, EditorState } from "@codemirror/state";
import { sectionLine } from "./script-health.js";

const access = new Compartment();
const editorAccess = readOnly => [ EditorState.readOnly.of( readOnly ), EditorView.editable.of( !readOnly ), EditorView.contentAttributes.of( { "aria-readonly": String( readOnly ), tabindex: "0" } ) ];

const editorTheme = EditorView.theme( {
	"&": {
		height: "100%",
		fontSize: "14px"
	},
	".cm-scroller": {
		overflow: "auto",
		fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace"
	},
	".cm-content": {
		padding: "8px 0"
	},
	".cm-gutters": {
		border: "none"
	}
} );

export function createEditor( parent, content, onChange, readOnly = false ) {
	const view = new EditorView( {
		state: EditorState.create( {
			doc: content,
			extensions: [
				basicSetup,
				access.of( editorAccess( readOnly ) ),
				markdown( { codeLanguages: languages } ),
				oneDark,
				editorTheme,
				EditorView.lineWrapping,
				EditorView.updateListener.of( ( update ) => {
					if ( update.docChanged && onChange ) {
						onChange();
					}
				} )
			]
		} ),
		parent
	} );
	return view;
}

export function setEditorReadOnly( view, readOnly ) {
	view.dispatch( { effects: access.reconfigure( editorAccess( readOnly ) ) } );
}

export function setEditorContent( view, content ) {
	view.dispatch( {
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: content
		}
	} );
}

export function getEditorContent( view ) {
	return view.state.doc.toString();
}

export function getCursorLine( view ) {
	const pos = view.state.selection.main.head;
	return view.state.doc.lineAt( pos ).number;
}

export function selectSection( view, section ) {
	const anchor = view.state.doc.line( sectionLine( view.state.doc.toString(), section ) ).from;
	view.dispatch( { selection: { anchor }, effects: EditorView.scrollIntoView( anchor, { y: "start" } ) } );
	view.focus();
}
