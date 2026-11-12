import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment, EditorState } from "@codemirror/state";
import { sectionLine } from "./script-health.js";
import { scriptToolEdit } from "./script-tools.js";
export { quickEditParagraphs } from "./quick-edit-source.js";

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

export function insertScriptTool( view, id ) {
	if ( !view || view.state.readOnly ) return false;
	const { from, to } = view.state.selection.main;
	const edit = scriptToolEdit( view.state.doc.toString(), from, to, id );
	view.dispatch( {
		changes: { from: edit.from, to: edit.to, insert: edit.insert },
		selection: { anchor: edit.anchor, head: edit.head },
		scrollIntoView: true,
		userEvent: "input.tool"
	} );
	view.focus();
	return true;
}

export function editorFormatSnapshot( view ) {
	if ( !view || view.state.readOnly ) return null;
	const source = view.state.doc.toString();
	const range = view.state.selection.main;
	const whole = range.empty;
	return { source, from: whole ? 0 : range.from, to: whole ? source.length : range.to, whole };
}

export function applyEditorFormat( view, snapshot, text ) {
	if ( !view || view.state.readOnly ) throw new Error( "Save an editable copy first." );
	if ( view.state.doc.toString() !== snapshot.source ) throw new Error( "The script changed. Cancel and reopen Auto format to review the latest text." );
	const before = snapshot.source.slice( 0, snapshot.from ), after = snapshot.source.slice( snapshot.to );
	const prefix = before && !before.endsWith( "\n\n" ) ? before.endsWith( "\n" ) ? "\n" : "\n\n" : "";
	const suffix = after && !after.startsWith( "\n" ) ? "\n" : "";
	view.dispatch( { changes: { from: snapshot.from, to: snapshot.to, insert: prefix + text + suffix }, selection: { anchor: snapshot.from + prefix.length }, scrollIntoView: true, userEvent: "input.format" } );
	view.focus();
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
