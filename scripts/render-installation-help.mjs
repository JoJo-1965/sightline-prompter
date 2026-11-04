import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

app.setPath( "userData", await fs.mkdtemp( path.join( os.tmpdir(), "sightline-install-illustrations-" ) ) );
app.disableHardwareAcceleration();
app.whenReady().then( async () => {
const window = new BrowserWindow( { show: false, frame: false, width: 1100, height: 660, webPreferences: { offscreen: true } } );
const timeout = setTimeout( () => { console.error( "Installation illustration render timed out" ); app.exit( 1 ); }, 15000 );
try {
	await window.loadFile( path.resolve( "docs/guide/install-simulations.html" ) );
	await window.webContents.executeJavaScript( "document.fonts.ready.then(()=>true)" );
	window.webContents.debugger.attach( "1.3" );
	for ( const name of [ "edge", "windows", "macos" ] ) {
		await window.webContents.executeJavaScript( `document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===${ JSON.stringify( name ) }));` );
		const fits = await window.webContents.executeJavaScript( "[...document.querySelectorAll('.screen.active p,.screen.active h1,.screen.active .step')].every(e=>e.getBoundingClientRect().bottom<innerHeight)&&document.documentElement.scrollWidth<=innerWidth" );
		assert.equal( fits, true, `Installation illustration must fit: ${ name }` );
		const image = await window.webContents.debugger.sendCommand( "Page.captureScreenshot", { format: "png" } );
		await fs.writeFile( `docs/guide/images/install-${ name }.png`, Buffer.from( image.data, "base64" ) );
	}
	console.log( "Rendered three labelled 1100×660 installation illustrations" );
} finally { clearTimeout( timeout ); window.destroy(); app.quit(); }
} );
