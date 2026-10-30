// Actual native windows, using an isolated profile and no user's camera/OBS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import QRCode from "qrcode";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire( path.join( root, "package.json" ) );
const port = 9336;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Test port must be free" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-floating-panels-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-floating-shots-" ) );
const file = path.join( profile, "framing.md" );
const phoneListener = net.createServer();
await new Promise( resolve => phoneListener.listen( 0, "127.0.0.1", resolve ) );
const phonePort = phoneListener.address().port;
await new Promise( resolve => phoneListener.close( resolve ) );
await fs.writeFile( file, `# Framing check\n\n## Welcome [point]\n\n[smile] These are spoken words. [Say: "Welcome back"]\n\n${ "These words help check a floating panel while prompting continues. ".repeat( 150 ) }` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 900, fontSize: 2, opacity: 1, recentFiles: [ file ], settings: { voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: false, checkUpdates: false, obsEnabled: false, phoneRemote: true, phonePort, hideFromCapture: false } } ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( require( "electron" ), [ ".", "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", ( b ) => {
	stderr += b;
} );
child.stdout.resume();
const pause = ms => new Promise( r => setTimeout( r, ms ) );
const clients = [];
const errors = [];
async function target( fragment ) {
	for ( let n = 0; n < 70; n++ ) {
		try {
			const found = ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ) ).find( t => t.url.includes( fragment ) );
			if ( found ) return found;
		} catch { /* Wait for the test app. */ }
		await pause( 100 );
	}
	const pages = await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] );
	throw new Error( `Missing ${ fragment }: ${ JSON.stringify( pages.map( p => ( { url: p.url, title: p.title } ) ) ) } ${ stderr.slice( -1800 ) }` );
}
async function connect( fragment ) {
	const page = fragment === "main-process" ? { id: "main-process", webSocketDebuggerUrl: stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1] } : await target( fragment );
	assert.ok( page.webSocketDebuggerUrl, "The isolated app's debugger is available" );
	const socket = new WebSocket( page.webSocketDebuggerUrl );
	await new Promise( r => socket.addEventListener( "open", r ) );
	clients.push( socket );
	let next = 0;
	const pending = new Map();
	socket.addEventListener( "message", ( event ) => {
		const m = JSON.parse( event.data );
		if ( m.id ) {
			pending.get( m.id )?.( m );
			pending.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) errors.push( m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++next;
		const timer = setTimeout( () => reject( new Error( `Timed out: ${ method }` ) ), 8000 );
		pending.set( id, ( m ) => {
			clearTimeout( timer );
			if ( m.error ) reject( new Error( m.error.message ) );
			else resolve( m.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const r = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( r.exceptionDetails ) throw new Error( r.exceptionDetails.exception?.description ?? r.exceptionDetails.text );
		return r.result.value;
	};
	const until = async ( expression ) => {
		for ( let n = 0; n < 70; n++ ) {
			if ( await evaluate( expression ) ) return;
			await pause( 100 );
		}
		throw new Error( `Not ready: ${ expression }` );
	};
	await call( "Runtime.enable" );
	return { call, evaluate, until, id: page.id, socket };
}
try {
	const main = await connect( "teleprompter.html" );
	await main.until( "document.getElementById('md')?.textContent.includes('Framing check') && !!document.getElementById('obs-status')" );
	await main.evaluate( "document.querySelector('#voice-offer button:last-child')?.click();document.getElementById('cb-settings').click()" );
	const settings = await connect( "panel=settings" );
	await settings.until( "!!document.getElementById('set-countdown')" );
	assert.equal( await main.evaluate( "document.getElementById('settings-modal')===null" ), true, "Settings is in a different native window" );
	assert.equal( await settings.evaluate( "typeof window.electron" ), "undefined", "Utility host has no privileged bridge" );
	await settings.evaluate( "document.getElementById('settings-topic-reading').click()" );
	const commentStyle = () => main.evaluate( "(()=>{const style=s=>{const c=getComputedStyle(document.querySelector(s));return {size:parseFloat(c.fontSize),colour:c.color,font:c.fontFamily,display:c.display};};return {comment:style('#md p .dir-text'),headingComment:style('#md h2 .dir-text'),heading:style('#md h2'),spoken:style('#md .say')};})()" );
	const originalStyle = await commentStyle();
	await settings.evaluate( "(()=>{const c=document.getElementById('lp-direction-scale');c.focus();c.value=1.25;c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));})()" );
	await main.until( "document.body.style.getPropertyValue('--direction-scale')==='1.25'" );
	let styled = await commentStyle();
	assert.equal( styled.comment.size, originalStyle.comment.size * 1.25 );
	assert.equal( styled.headingComment.size, styled.comment.size, "Comment size is independent of its heading container" );
	assert.deepEqual( styled.heading, originalStyle.heading );
	assert.deepEqual( styled.spoken, originalStyle.spoken, "Quoted spoken words retain their script style" );
	await settings.evaluate( "(()=>{const c=document.getElementById('lp-direction-colour');c.focus();c.value='#ffd54a';c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));})()" );
	await main.until( "document.body.style.getPropertyValue('--direction-colour')==='#ffd54a'" );
	assert.equal( ( await commentStyle() ).comment.colour, "rgb(255, 213, 74)" );
	assert.equal( await settings.evaluate( "document.getElementById('lp-direction-theme').getAttribute('aria-pressed')" ), "false" );
	await main.evaluate( "window.electron.saveSettings({headingScale:0.6,headingFont:'verdana',scriptFont:'atkinson',theme:'contrast'})" );
	await main.until( "document.body.classList.contains('heading-font-verdana') && document.body.style.getPropertyValue('--heading-scale')==='0.6'" );
	styled = await commentStyle();
	assert.equal( styled.comment.size, originalStyle.comment.size * 1.25 );
	assert.equal( styled.comment.font, styled.heading.font, "Comments follow Heading font" );
	assert.notEqual( styled.comment.font, styled.spoken.font );
	assert.equal( styled.comment.colour, "rgb(255, 213, 74)", "Chosen colour also applies in high contrast" );
	await settings.evaluate( "document.getElementById('lp-direction-theme').click()" );
	await main.until( "!document.body.style.getPropertyValue('--direction-colour')" );
	assert.equal( ( await commentStyle() ).comment.colour, "rgb(200, 200, 200)", "Theme restores the accessible high-contrast colour" );
	await main.evaluate( "window.electron.saveSettings({directions:'hide'})" );
	await main.until( "document.body.classList.contains('directions-hide')" );
	assert.equal( ( await commentStyle() ).comment.display, "none" );
	assert.notEqual( ( await commentStyle() ).spoken.display, "none" );
	const words = await main.evaluate( "(async()=>{const {buildWordIndex}=await import('./word-index.js');return buildWordIndex(document.getElementById('md')).words;})()" );
	assert.equal( words.includes( "smile" ) || words.includes( "point" ) || words.includes( "say" ), false );
	assert.ok( words.includes( "welcome" ) && words.includes( "back" ) );
	await main.until( "document.body.style.getPropertyValue('--direction-scale')==='1.25'" );
	const savedAppearance = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings;
	assert.equal( savedAppearance.directionScale, 1.25 );
	assert.equal( savedAppearance.directionColour, "" );
	await main.evaluate( "window.electron.saveSettings({directions:'dim',directionScale:1,headingScale:1,headingFont:'same',scriptFont:'default',theme:'default'})" );
	await main.until( "document.body.style.getPropertyValue('--direction-scale')==='1' && document.body.classList.contains('directions-dim')" );
	console.log( "PASS: independent comment size/colour, heading font, theme reset, saved preferences and speech exclusions in native Settings." );
	await settings.evaluate( "document.querySelector('[data-settings-group=controls]').click();document.querySelector('[data-tab=phone]').click();document.getElementById('set-phone-qr').removeAttribute('src')" );
	await main.evaluate( "window.electron.getPhoneInfo()" );
	await settings.until( "document.getElementById('set-phone-qr').complete && document.getElementById('set-phone-qr').naturalWidth===240" );
	const phoneUrl = await settings.evaluate( "document.getElementById('set-phone-url').textContent" );
	assert.equal( ( await fetch( phoneUrl ) ).status, 200, "The QR's actual phone remote is reachable" );
	assert.equal( await settings.evaluate( "document.getElementById('set-phone-qr').getBoundingClientRect().width" ), 200 );
	// The gallery uses a reserved example address, never the workstation's URL/key.
	const demoQr = await QRCode.toDataURL( "http://192.0.2.10:47716/?k=example", { margin: 1, width: 240 } );
	await settings.evaluate( `document.getElementById('set-phone-qr').src=${ JSON.stringify( demoQr ) };document.getElementById('set-phone-url').textContent='Example connection · same Wi-Fi';document.querySelector('[data-tab=phone]').focus();document.getElementById('set-phone-qr').decode()` );
	const phonePicture = await settings.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "phone-settings.png" ), Buffer.from( phonePicture.data, "base64" ) );
	await main.evaluate( "window.electron.getPhoneInfo()" );
	const native = await connect( "main-process" );
	const panelOwners = () => native.evaluate( "(()=>{const {BrowserWindow}=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');const main=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html'));return BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('utility-window.html')).map(w=>({url:w.webContents.getURL(),owner:w.getParentWindow()?.id===main.id,top:w.isAlwaysOnTop(),focused:w.isFocused()}));})()" );
	await main.evaluate( "window.electron.windowControl('fullscreen')" );
	await settings.evaluate( "document.getElementById('settings-close').click()" );
	await main.evaluate( "document.getElementById('cb-settings').click()" );
	await pause( 150 );
	const ownedSettings = ( await panelOwners() ).find( w => w.url.includes( "panel=settings" ) );
	assert.equal( ownedSettings.owner, true, "Native ownership keeps Settings above the fullscreen prompter" );
	assert.equal( ownedSettings.top, true );
	assert.equal( ownedSettings.focused, true, "Reopening Settings brings it forward and focuses it" );
	await main.evaluate( "window.electron.windowControl('fullscreen')" );
	console.log( "PASS: Settings reopens above the fullscreen prompter with native ownership and focus." );
	const protection = () => native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().map(w=>({url:w.webContents.getURL(),protected:w.isContentProtected()}))" );
	assert.equal( ( await protection() ).find( w => w.url.includes( "panel=settings" ) ).protected, false, "Settings is capturable when Hide from capture is off" );
	console.log( "PASS: phone QR decodes in the native Settings window and opens its real remote." );
	await settings.evaluate( "document.getElementById('settings-topic-obs-recording').click()" );
	assert.equal( await settings.evaluate( "document.querySelector('[data-settings-group=controls]').getAttribute('aria-selected')" ), "true" );
	assert.equal( await settings.evaluate( "document.getElementById('set-obs-prepare-slate').disabled" ), true );
	assert.match( await settings.evaluate( "document.getElementById('set-obs-slate-status').textContent" ), /Enable OBS integration/ );
	await settings.evaluate( "document.getElementById('set-obs-enabled').checked=true;document.getElementById('set-obs-enabled').dispatchEvent(new Event('change',{bubbles:true}))" );
	assert.match( await settings.evaluate( "document.getElementById('set-obs-slate-status').textContent" ), /Apply your OBS changes/ );
	await settings.evaluate( "document.getElementById('set-obs-enabled').checked=false;document.getElementById('set-obs-enabled').dispatchEvent(new Event('change',{bubbles:true}))" );
	console.log( "PASS: OBS topics live under Controls; disabled slate setup and unsaved OBS changes have visible guidance." );
	await settings.evaluate( "document.querySelector('[data-settings-group=appearance]').click();document.querySelector('[data-tab=display]').click()" );
	assert.equal( await settings.evaluate( "document.querySelectorAll('.mirror-pills').length" ), 1, "Mirroring has one Settings home" );
	assert.equal( await settings.evaluate( "document.querySelector('.mirror-pills').closest('fieldset').dataset.tab" ), "display" );
	assert.equal( await settings.evaluate( "document.querySelectorAll('[data-settings-page=background] .mirror-pills,[data-settings-page=layout] .mirror-pills').length" ), 0 );
	for ( const [ axis, h, v ] of [ [ "h", true, false ], [ "v", true, true ], [ "h", false, true ], [ "v", false, false ] ] ) {
		await settings.evaluate( `document.querySelector('.mirror-pills [data-axis=${ axis }]').click()` );
		await main.until( `document.getElementById('cb-mirror-h').getAttribute('aria-pressed')==='${ h }' && document.getElementById('cb-mirror-v').getAttribute('aria-pressed')==='${ v }'` );
		assert.equal( await settings.evaluate( "getComputedStyle(document.body).transform" ), "none" );
	}
	console.log( "PASS: single mirroring group in Screens, working native-window buttons and synced toolbar axes." );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click()" );
	await settings.evaluate( "document.getElementById('set-countdown').focus();document.getElementById('set-countdown').select()" );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" } );
	await settings.until( "document.getElementById('settings-applied').textContent==='Unsaved changes'" );
	await main.evaluate( "document.getElementById('cb-settings').click()" );
	assert.equal( await settings.evaluate( "document.getElementById('set-countdown').value" ), "1", "Opening again retains the existing draft" );
	await settings.evaluate( "window.close()" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-keep').click();document.getElementById('settings-apply').click()" );
	await settings.until( "document.getElementById('settings-applied').textContent==='Saved'" );
	console.log( "PASS: native Settings window, trusted typing, draft retention, native Close guard and Apply." );
	const size = await settings.evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return {width:r.width,height:r.height};})()" );
	for ( const group of await settings.evaluate( "[...document.querySelectorAll('[data-settings-group]')].map(b=>b.dataset.settingsGroup)" ) ) {
		await settings.evaluate( `document.querySelector('[data-settings-group=${ group }]').click()` );
		for ( const tab of await settings.evaluate( "[...document.querySelectorAll('.settings-subtabs [data-tab]')].filter(b=>!b.hidden).map(b=>b.dataset.tab)" ) ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab=${ tab }]').click()` );
			await settings.evaluate( "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))" );
			await settings.until( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" );
			assert.deepEqual( await settings.evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return {width:r.width,height:r.height};})()" ), size );
			assert.equal( await settings.evaluate( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" ), true, `No scrolling in ${ tab }` );
		}
	}
	const bounds = await settings.evaluate( "({left:window.screenX,top:window.screenY})" );
	await settings.evaluate( "window.moveTo(window.screenX+100,window.screenY+50)" );
	await pause( 300 );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.utilityWindowBounds.settings.x, bounds.left + 100, "Window position is persisted for the next launch" );
	await settings.evaluate( "document.getElementById('settings-close').click()" );
	await main.evaluate( "document.getElementById('cb-settings').click()" );
	await pause( 200 );
	assert.equal( await settings.evaluate( "window.screenX" ), bounds.left + 100, "Reopening preserves the native window position" );
	await main.evaluate( "document.getElementById('cb-mirror-h').click();document.getElementById('cb-mirror-v').click()" );
	assert.equal( await settings.evaluate( "getComputedStyle(document.body).transform" ), "none", "Settings stays upright" );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click();document.querySelector('[data-tab=scrolling]').focus()" );
	const picture = await settings.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "floating-settings.png" ), Buffer.from( picture.data, "base64" ) );
	for ( const topic of [ "reading", "background", "layout", "display", "recording", "audio", "streamdeck", "remotes", "obs", "obs-recording" ] ) {
		await settings.evaluate( `document.getElementById('settings-topic-${ topic }').click();document.getElementById('settings-topic-${ topic }').focus()` );
		await settings.evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		for ( let page = 1; page < 8; page++ ) {
			const shot = await settings.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( artifacts, `settings-${ topic }${ page === 1 ? "" : `-page-${ page }` }.png` ), Buffer.from( shot.data, "base64" ) );
			if ( !await settings.evaluate( "document.querySelector('.settings-pagination').getClientRects().length && !document.querySelector('.settings-pagination button:last-child').disabled" ) ) break;
			await settings.evaluate( "document.querySelector('.settings-pagination button:last-child').click()" );
			await settings.evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		}
	}
	await settings.evaluate( "window.resizeTo(576,539)" );
	await pause( 200 );
	for ( const group of await settings.evaluate( "[...document.querySelectorAll('[data-settings-group]')].map(b=>b.dataset.settingsGroup)" ) ) {
		await settings.evaluate( `document.querySelector('[data-settings-group=${ group }]').click()` );
		for ( const tab of await settings.evaluate( "[...document.querySelectorAll('.settings-subtabs [data-tab]')].filter(b=>!b.hidden).map(b=>b.dataset.tab)" ) ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab=${ tab }]').click()` );
			await settings.evaluate( "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))" );
			await settings.until( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" );
			assert.equal( await settings.evaluate( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" ), true, `No scrolling in smaller ${ tab }` );
		}
	}
	await settings.evaluate( "window.resizeTo(676,599);document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click()" );
	await main.evaluate( "document.getElementById('cb-tools').click();[...document.querySelectorAll('#tools-panel button')].find(b=>b.textContent.includes('Spacing and mirror')).click()" );
	await settings.until( "!document.querySelector('[data-settings-page=layout]').hidden" );
	assert.ok( await settings.evaluate( "!!document.getElementById('lp-margin-x')" ), "Quick layout tools focus the shared Settings controls rather than an empty panel" );
	console.log( "PASS: fixed Settings frame across all topics without scrolling; native movement, remembered position and upright mirrored prompting." );
	await main.evaluate( "document.getElementById('cb-help').click()" );
	const help = await connect( "panel=help" );
	await help.until( "!!document.querySelector('#help-list [role=tab]')" );
	await main.evaluate( "(async()=>{const {showVoiceHelp}=await import('./teleprompter.js');await showVoiceHelp();})()" );
	const voiceHelp = await connect( "panel=voicehelp" );
	await voiceHelp.until( "!!document.querySelector('#voice-help-list [role=tab]')" );
	assert.ok( ( await panelOwners() ).every( w => w.owner && w.top ), "Settings and both help windows stay above their prompter owner" );
	assert.equal( await voiceHelp.evaluate( "typeof window.electron" ), "undefined" );
	const voiceBounds = await voiceHelp.evaluate( "({x:window.screenX,y:window.screenY})" );
	await voiceHelp.evaluate( "window.moveTo(window.screenX+60,window.screenY+30)" );
	await pause( 300 );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.utilityWindowBounds.voicehelp.x, voiceBounds.x + 60 );
	const voiceSizes = await voiceHelp.evaluate( "[...document.querySelectorAll('#voice-help-list [role=tab]')].map(b=>{b.click();const r=document.getElementById('voice-help').getBoundingClientRect();return [r.width,r.height];})" );
	assert.ok( voiceSizes.every( size => size[0] === voiceSizes[0][0] && size[1] === voiceSizes[0][1] ) );
	await voiceHelp.evaluate( "window.close()" );
	await voiceHelp.until( "document.getElementById('voice-help').classList.contains('hidden')" );
	await main.evaluate( "(async()=>{const {showVoiceHelp}=await import('./teleprompter.js');await showVoiceHelp();})()" );
	assert.equal( await voiceHelp.evaluate( "window.screenX" ), voiceBounds.x + 60, "Voice help reopens at the moved position" );
	await voiceHelp.evaluate( "[...document.querySelectorAll('#voice-help-list [role=tab]')].find(b=>b.textContent==='Reading').click()" );
	const voicePicture = await voiceHelp.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "floating-voice-help.png" ), Buffer.from( voicePicture.data, "base64" ) );
	await main.evaluate( "window.electron.saveSettings({showHeadGuide:true});window.electron.headGuide('adjust')" );
	await connect( "controls=1" );
	for ( const enabled of [ false, true, false ] ) {
		await settings.evaluate( `(()=>{document.querySelector('[data-settings-group=recording]').click();document.querySelector('[data-tab=recording]').click();const capture=document.getElementById('lp-hide-capture');capture.checked=${ enabled };capture.dispatchEvent(new Event('change',{bubbles:true}));})()` );
		await pause( 150 );
		const states = await protection();
		for ( const fragment of [ "panel=settings", "panel=help", "panel=voicehelp", "controls=1" ] ) assert.equal( states.find( w => w.url.includes( fragment ) )?.protected, enabled, `${ fragment } follows Hide from capture=${ enabled } live` );
		assert.equal( states.find( w => w.url.includes( "head-guide.html" ) && !w.url.includes( "controls=1" ) )?.protected, true, "The head guide overlay always remains protected" );
	}
	await main.evaluate( "window.electron.saveSettings({showHeadGuide:false})" );
	await voiceHelp.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" } );
	await voiceHelp.until( "document.getElementById('voice-help').classList.contains('hidden')" );
	assert.equal( await settings.evaluate( "document.getElementById('settings-modal').classList.contains('hidden')" ), false );
	console.log( "PASS: movable voice help, saved position, stable tabs, independent native Close, reopen and Escape." );
	console.log( "PASS: Settings, Help and guide adjustments follow capture protection live; head overlay stays excluded." );
	assert.equal( await main.evaluate( "document.getElementById('help-modal')===null" ), true );
	const helpSizes = await help.evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].map(b=>{b.click();const r=document.querySelector('.help-content').getBoundingClientRect();return [r.width,r.height];})" );
	assert.ok( helpSizes.every( v => v[0] === helpSizes[0][0] && v[1] === helpSizes[0][1] ) );
	assert.equal( await help.evaluate( "getComputedStyle(document.body).transform" ), "none" );
	assert.equal( await help.evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].some(t=>t.textContent==='Voice')" ), false );
	await main.evaluate( "window.electron.saveSettings({voiceCommands:'voice'})" );
	await pause( 150 );
	await main.evaluate( "document.getElementById('cb-help').click()" );
	await help.until( "[...document.querySelectorAll('#help-list [role=tab]')].some(t=>t.textContent==='Voice')" );
	const helpPicture = await help.call( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( artifacts, "floating-help.png" ), Buffer.from( helpPicture.data, "base64" ) );
	await help.evaluate( "window.close()" );
	await pause( 200 );
	assert.equal( await help.evaluate( "document.getElementById('help-modal').classList.contains('hidden')" ), true );
	assert.equal( await settings.evaluate( "document.getElementById('settings-modal').classList.contains('hidden')" ), false, "Closing Help leaves Settings open" );
	await settings.evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.querySelector('[data-tab=scrolling]').click();document.getElementById('set-countdown').focus();document.getElementById('set-countdown').select()" );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" } );
	await settings.until( "document.getElementById('settings-applied').textContent==='Unsaved changes'" );
	await main.evaluate( "window.electron.windowControl('close')" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-keep').click()" );
	assert.equal( await main.evaluate( "!!document.getElementById('cb-settings')" ), true, "Keeping the Settings draft cancels app exit" );
	console.log( "PASS: separate stable Help window, mode-aware live help, independent Close and Settings guard on app exit." );
	// Emulate only this isolated app's OBS IPC. Never connect to the workstation's
	// OBS or record real media while checking preparation progress and failures.
	await main.evaluate( "window.electron.saveSettings({obsRecordedSlate:true,slate:'both'})" );
	await pause( 150 );
	await native.evaluate( `(()=>{
		const electron=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');
		globalThis.slateUiTest={fail:true,state:{enabled:true,controls:true,connection:'connected',recording:'stopped',recordedSlate:{ready:false}}};
		electron.ipcMain.removeHandler('obs');
		electron.ipcMain.handle('obs',async()=>{
			await new Promise(resolve=>setTimeout(resolve,350));
			const test=globalThis.slateUiTest;
			if(test.fail)return {ok:false,error:'The test scene has no browser source',state:test.state};
			return {ok:true,state:{...test.state,recordedSlate:{ready:true}}};
		});
		electron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('obsState',globalThis.slateUiTest.state);
		return true;
	})()` );
	await settings.evaluate( "document.getElementById('settings-topic-obs-recording').click();for(const id of ['enabled','controls','recorded-slate']){const el=document.getElementById('set-obs-'+id);el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));}" );
	await settings.until( "!document.getElementById('set-obs-prepare-slate').disabled" );
	await settings.evaluate( "document.getElementById('set-obs-prepare-slate').click()" );
	await settings.until( "document.getElementById('set-obs-slate-status').textContent.includes('Preparing the recorded slate')" );
	await settings.until( "document.getElementById('set-obs-slate-status').textContent.includes('Could not prepare the recorded slate: The test scene has no browser source')" );
	await native.evaluate( "globalThis.slateUiTest.fail=false" );
	await settings.evaluate( "document.getElementById('set-obs-prepare-slate').click()" );
	await settings.until( "document.getElementById('set-obs-slate-status').textContent.includes('Recorded slate source ready')" );
	console.log( "PASS: recorded-slate progress, inline failure, retry and readiness through isolated simulated OBS responses." );
	assert.deepEqual( errors, [] );
	native.socket.close();
	await pause( 100 );
	await main.evaluate( "window.electron.windowControl('close')" );
	await settings.until( "!document.getElementById('settings-unsaved').classList.contains('hidden')" );
	await settings.evaluate( "document.getElementById('settings-unsaved-discard').click()" );
	for ( let n = 0; n < 50 && child.exitCode === null; n++ ) await pause( 100 );
	assert.equal( child.exitCode, 0, "Discarding the Settings draft allows normal app exit and closes the utility windows" );
	console.log( JSON.stringify( { pass: true, errors, artifacts } ) );
} catch ( error ) {
	console.error( error, JSON.stringify( errors ), stderr.slice( -2400 ) );
	process.exitCode = 1;
} finally {
	for ( const socket of clients ) socket.close();
	child.kill();
}
