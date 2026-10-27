// The user guide (docs/guide) in its own window: Help > User Guide. The pages
// are the same Markdown files that read on GitHub, turned into HTML here so
// the guide works offline and always matches the installed version.

import { BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import showdown from "showdown";

const PAGE_NAME = /^(\.\.\/)?[\w-]+\.md$/;

export function createGuide( { dir } ) {
	const guideDir = path.join( dir, "..", "docs", "guide" );
	const converter = new showdown.Converter( {
		tables: true,
		strikethrough: true,
		openLinksInNewWindow: false
	} );
	let guide = null;
	let wanted = "README.md";

	async function page( name ) {
		if ( !PAGE_NAME.test( name ) ) name = "README.md";
		const file = path.join( guideDir, name );
		const md = await fs.readFile( file, "utf8" );
		// Pictures load from the guide folder on disk.
		const base = pathToFileURL( path.dirname( file ) + path.sep ).href;
		const html = converter
			.makeHtml( md )
			.replace( /src="(images\/[\w.-]+)"/g, ( _m, src ) => `src="${ base }${ src }"` );
		return { name, html };
	}

	function open( name = "README.md" ) {
		wanted = name;
		if ( guide && !guide.isDestroyed() ) {
			guide.webContents.send( "guideShow", wanted );
			guide.show();
			guide.focus();
			return;
		}
		guide = new BrowserWindow( {
			width: 1000,
			height: 780,
			minWidth: 560,
			minHeight: 400,
			title: "Sightline Prompter user guide",
			backgroundColor: "#16171b",
			show: false,
			webPreferences: {
				nodeIntegration: false,
				sandbox: false,
				preload: path.join( dir, "client", "guide-preload.mjs" )
			}
		} );
		// No app menu here: its shortcuts act on the prompter (Ctrl+W would close it).
		guide.removeMenu();
		guide.loadFile( path.join( dir, "client", "guide.html" ) );
		guide.once( "ready-to-show", () => guide?.show() );
		guide.webContents.on( "will-navigate", e => e.preventDefault() );
		guide.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) );
		guide.on( "closed", () => {
			guide = null;
		} );
	}

	const fromGuide = event =>
		guide && !guide.isDestroyed() && event.sender === guide.webContents;
	ipcMain.handle( "guidePage", async ( event, name ) => {
		if ( !fromGuide( event ) ) return null;
		try {
			return await page( name ?? wanted );
		} catch {
			return page( "README.md" );
		}
	} );
	ipcMain.on( "guideExternal", ( event, url ) => {
		if ( fromGuide( event ) && /^https:\/\//.test( url ) ) shell.openExternal( url );
	} );

	// The guide goes when the prompter does, so the app can quit.
	const close = () => {
		if ( guide && !guide.isDestroyed() ) guide.close();
	};

	return { open, close };
}
