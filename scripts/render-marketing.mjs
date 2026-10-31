// Render the reviewed one-pager without opening the prompter or user profile.
import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getDocumentProxy } from "unpdf";

app.setPath( "userData", await fs.mkdtemp( path.join( os.tmpdir(), "sightline-one-pager-" ) ) );
app.disableHardwareAcceleration();
app.whenReady().then( async () => {
	const window = new BrowserWindow( { show: false, frame: false, width: 900, height: 1123, webPreferences: { offscreen: true } } );
	try {
		await window.loadFile( path.resolve( "docs/marketing/one-pager-print.html" ) );
		await window.webContents.executeJavaScript( "document.fonts.ready" );
		const pdf = await window.webContents.printToPDF( { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false } );
		const document = await getDocumentProxy( new Uint8Array( pdf ) );
		if ( document.numPages !== 1 ) throw new Error( `One-pager overflowed to ${ document.numPages } pages` );
		await fs.writeFile( "docs/marketing/sightline-one-pager.pdf", pdf );
		const geometry = await window.webContents.executeJavaScript( "({x:document.querySelector('main').offsetLeft,height:document.querySelector('main').scrollHeight,width:document.querySelector('main').scrollWidth,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)})" );
		window.webContents.debugger.attach( "1.3" );
		const shot = await window.webContents.debugger.sendCommand( "Page.captureScreenshot", { captureBeyondViewport: true, clip: { x: geometry.x, y: 0, width: geometry.width, height: geometry.height, scale: 1 } } );
		await fs.writeFile( "docs/marketing/one-pager-preview.png", Buffer.from( shot.data, "base64" ) );
		window.webContents.debugger.detach();
		console.log( JSON.stringify( { pages: 1, geometry, output: "docs/marketing/sightline-one-pager.pdf" } ) );
	} finally {
		window.destroy();
		app.quit();
	}
} ).catch( ( error ) => {
	console.error( error.stack );
	app.exit( 1 );
} );
