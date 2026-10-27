import fs from "node:fs/promises";
import path from "node:path";
import showdown from "showdown";
import mammoth from "mammoth";
import { load as loadYaml } from "js-yaml";
import { rtfToHtml } from "./rtf.js";
import { pdfToHtml } from "./pdf.js";

// Rich files are shown but not edited in the built-in markdown editor;
// edit them in Word/WordPad (or make a new PDF) and the watcher reloads them.
const RICH_EXTENSIONS = new Set( [ ".rtf", ".docx", ".pdf" ] );
const HTML_EXTENSIONS = new Set( [ ".html", ".htm" ] );

export const SCRIPT_EXTENSIONS = [
	"md",
	"markdown",
	"txt",
	"rtf",
	"docx",
	"pdf",
	"html",
	"htm"
];

export function isRichFile( filePath ) {
	return RICH_EXTENSIONS.has( path.extname( filePath ?? "" ).toLowerCase() );
}

async function convertMDtoHTML( md ) {
	const converter = new showdown.Converter();
	return converter.makeHtml( md );
}

// Plain-text scripts mark sections as "=== SECTION 1 · COLD OPEN";
// make those H2s so the arrow keys can jump between them.
// Script settings can sit in YAML front matter at the top; they're read
// separately, so drop them from the text. Escaped braces (\{ \}) become
// private-use placeholders so markdown can't unescape them into directives;
// decorate.js turns them back into braces.
function preprocessScriptText( text ) {
	return text
		.replace( /^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "" )
		.replace( /\\\{/g, "\uE000" )
		.replace( /\\\}/g, "\uE001" )
		.replace( /^={3,}[ \t]*(\S.*?)[ \t]*=*[ \t]*$/gm, "## $1" );
}

function addPadding( html ) {
	return html + "<p>&nbsp;</p>".repeat( 10 );
}

export async function convertMarkdown( md ) {
	const html = await convertMDtoHTML( preprocessScriptText( md ) );
	return addPadding( html );
}

export async function readRawMarkdown( filePath ) {
	try {
		return await fs.readFile( filePath, { encoding: "utf-8" } );
	} catch ( err ) {
		console.log( err );
		return null;
	}
}

export async function readAndConvertScript( filePath ) {
	try {
		const ext = path.extname( filePath ).toLowerCase();
		if ( ext === ".docx" ) {
			const result = await mammoth.convertToHtml(
				{ path: filePath },
				{ styleMap: [ "u => u" ] }
			);
			return addPadding( result.value );
		}
		if ( ext === ".pdf" ) {
			return addPadding( await pdfToHtml( await fs.readFile( filePath ) ) );
		}
		if ( ext === ".rtf" ) {
			const rtf = await fs.readFile( filePath, { encoding: "latin1" } );
			return addPadding( rtfToHtml( rtf ) );
		}
		const text = await fs.readFile( filePath, { encoding: "utf-8" } );
		if ( HTML_EXTENSIONS.has( ext ) ) {
			return addPadding( text );
		}
		return convertMarkdown( text );
	} catch ( err ) {
		console.log( err );
		return null;
	}
}

// Slide-cue phrases from a build cues.yaml ("at:" on each cue), in script order.
export async function readCuePhrases( cuesFile ) {
	if ( !cuesFile ) return [];
	try {
		const doc = loadYaml( await fs.readFile( cuesFile, { encoding: "utf-8" } ) );
		return ( doc?.cues ?? [] )
			.map( cue => cue?.at )
			.filter( at => typeof at === "string" && at.trim() );
	} catch ( err ) {
		console.log( "Error reading cues file:", err.message );
		return [];
	}
}
