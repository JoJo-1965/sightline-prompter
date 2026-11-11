// Shared by file conversion and the bundled paragraph source mapper.
export function preprocessScriptText( text ) {
	return text
		.replace( /^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "" )
		.replace( /\\\{/g, "\uE000" )
		.replace( /\\\}/g, "\uE001" )
		.replace( /^={3,}[ \t]*(\S.*?)[ \t]*=*[ \t]*$/gm, "## $1" );
}
