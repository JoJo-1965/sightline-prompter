// Local development harness; never connects to the user's OBS or profile.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = process.argv[2] ?? process.cwd();
if ( await fetch( "http://127.0.0.1:9335/json/version" ).then( () => true ).catch( () => false ) ) throw new Error( "Port 9335 is already in use; close the other development test before running this check" );
const require = createRequire( path.join( root, "package.json" ) );
const { WebSocketServer } = require( "ws" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-obs-smoke-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-production-check-" ) );
const screenshot = path.join( artifacts, "obs-settings.png" );
const mock = new WebSocketServer( { host: "127.0.0.1", port: 0 } );
await new Promise( r => mock.on( "listening", r ) );
const port = mock.address().port;
let active = false;
let paused = false;
let connections = 0;
let authOK = false;
const requests = [];
const hash = s => createHash( "sha256" ).update( s ).digest( "base64" );
mock.on( "connection", ( socket ) => {
	connections++;
	socket.send( JSON.stringify( { op: 0, d: { rpcVersion: 1, authentication: { salt: "salt", challenge: "challenge" } } } ) );
	socket.on( "message", ( raw ) => {
		const { op, d } = JSON.parse( raw );
		if ( op === 1 ) {
			authOK = d.authentication === hash( hash( "sightline-test-onlysalt" ) + "challenge" );
			if ( !authOK ) return socket.close( 4009 );
			return socket.send( JSON.stringify( { op: 2, d: { negotiatedRpcVersion: 1 } } ) );
		}
		requests.push( d.requestType );
		let responseData = {};
		if ( d.requestType === "GetVersion" ) responseData = { availableRequests: [ "CreateRecordChapter" ] };
		if ( d.requestType === "StartRecord" ) {
			active = true;
			paused = false;
		}
		if ( d.requestType === "PauseRecord" ) paused = true;
		if ( d.requestType === "ResumeRecord" ) paused = false;
		if ( d.requestType === "StopRecord" ) {
			active = false;
			responseData = { outputPath: "/recordings/sightline-smoke.mp4" };
		}
		if ( d.requestType === "GetRecordStatus" ) responseData = { outputActive: active, outputPaused: active && paused, outputDuration: 3000 };
		socket.send( JSON.stringify( { op: 7, d: { requestId: d.requestId, requestType: d.requestType, requestStatus: { result: true }, responseData } } ) );
	} );
} );
const testScript = path.join( profile, "recording-check.md" );
await fs.writeFile( testScript, `# Recording check\n\n## Welcome\n\n${ "A short recording test keeps the speaker and the script together. ".repeat( 60 ) }\n\n## Next section\n\n${ "This is the next part of the recording. ".repeat( 60 ) }` );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( {
	width: 1100, height: 900, fontSize: 2, opacity: 1,
	recentFiles: [ testScript ],
	settings: { scrollMode: "steady", countdown: 0, slate: "off", voiceCommands: "off", checkUpdates: false, scratchAudio: false, takeLoudness: "off", debugMode: false, streamDeck: true, remoteControl: true, remotePort: 47717 }
} ) );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
// Native window occlusion must not suspend frame-based checks behind the
// user's projector or always-on-top prompter. These flags affect this test only.
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, "--remote-debugging-port=9335", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let errors = "";
child.stderr.on( "data", ( b ) => {
	errors += b.toString();
} );
child.stdout.resume();
const pause = ms => new Promise( r => setTimeout( r, ms ) );
let ws;
let id = 0;
const pending = new Map();
const exceptions = [];
function send( method, params = {} ) {
	return new Promise( ( resolve, reject ) => {
		const n = ++id;
		const timer = setTimeout( () => reject( new Error( `CDP timed out: ${ method } ${ params.expression?.slice( 0, 180 ) ?? "" }` ) ), 8000 );
		pending.set( n, ( msg ) => {
			clearTimeout( timer );
			resolve( msg );
		} );
		ws.send( JSON.stringify( { id: n, method, params } ) );
	} );
}
async function evaluate( expression ) {
	const response = await send( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
	if ( response.result?.exceptionDetails ) throw new Error( response.result.exceptionDetails.exception?.description ?? response.result.exceptionDetails.text );
	return response.result?.result?.value;
}
async function until( expression ) {
	for ( let n = 0; n < 60; n++ ) {
		if ( await evaluate( expression ) ) return;
		await pause( 100 );
	}
	throw new Error( `Timed out waiting for ${ expression }` );
}
async function pictureOf( selector, file ) {
	await evaluate( "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))" );
	const clip = await evaluate( `(()=>{const r=document.querySelector(${ JSON.stringify( selector ) }).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()` );
	const picture = await send( "Page.captureScreenshot", { format: "png", clip } );
	await fs.writeFile( path.join( artifacts, file ), Buffer.from( picture.result.data, "base64" ) );
}
async function openSettings() {
	await evaluate( "document.getElementById('cb-settings').focus();document.getElementById('cb-settings').click()" );
	await until( "!document.getElementById('settings-modal').classList.contains('hidden')" );
	await evaluate( "document.querySelector('[data-settings-group=recording]').click();document.querySelector('.settings-subtabs [data-tab=obs]').click()" );
}
try {
	let target;
	for ( let n = 0; n < 80; n++ ) {
		try {
			target = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "teleprompter.html" ) );
		} catch { /* Wait for the isolated app to expose its test target. */ }
		if ( target ) break;
		await pause( 150 );
	}
	assert.ok( target, errors );
	ws = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( r => ws.addEventListener( "open", r ) );
	ws.addEventListener( "message", ( e ) => {
		const m = JSON.parse( e.data );
		if ( m.id ) {
			pending.get( m.id )?.( m );
			pending.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) exceptions.push( m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text );
	} );
	await send( "Runtime.enable" );
	// Keep exercising the inline fallback and all existing controllers here.
	// The native utility-window suite separately tests the normal floating UI.
	await evaluate( "window.openBeforeUtilityTest=window.open;window.open=(url,...args)=>String(url).includes('utility-window.html')?null:window.openBeforeUtilityTest(url,...args)" );
	await until( "document.getElementById('obs-status') && document.getElementById('md').textContent.trim().length > 100" );
	await evaluate( "document.querySelector('#voice-offer button:last-child')?.click()" );
	const directions = await evaluate( "(async()=>{const {decorateScript}=await import('./decorate.js');const {buildWordIndex}=await import('./word-index.js');const {indexSentences,scriptSentences}=await import('./sentence-highlight.js');const root=document.createElement('div');root.innerHTML='<p>[smile] Hello [shrug] there. [think] More [point] words.</p>';decorateScript(root);const words=buildWordIndex(root).words;indexSentences(root);const sentences=scriptSentences();indexSentences(document.getElementById('md'));return {words,text:root.textContent,directions:root.querySelectorAll('.dir-text').length,sentences:sentences.map(s=>s.text)};})()" );
	assert.deepEqual( directions.words, [ "hello", "there", "more", "words" ] );
	assert.equal( directions.directions, 4 );
	assert.ok( directions.text.includes( "smile" ) && directions.text.includes( "point" ) );
	assert.equal( directions.sentences.join( " " ), "Hello there. More words." );
	console.log( "PASS: delivery notes remain visible but stay out of speech alignment, counts and exported sentences." );
	const productionNotes = await evaluate( `(async()=>{
		const {decorateScript}=await import('./decorate.js');const {buildWordIndex}=await import('./word-index.js');const {setProductionNotesActive}=await import('./production-notes.js');
		const root=document.createElement('div');root.id='md';root.style.cssText='font-size:32px;padding-top:1100px';
		root.innerHTML='<p><!-- Prepare the recording. {record: off} [Say: "Not spoken"] --></p><p>[smile] These words are spoken.</p>';
		document.body.append(root);decorateScript(root);const words=buildWordIndex(root).words;const visible=getComputedStyle(root.querySelector('.production-note')).display!=='none';
		setProductionNotesActive(root,true,{alignFirst:true});const hidden=getComputedStyle(root.querySelector('.production-note')).display==='none';
		const spoken=buildWordIndex(root).ranges[0];const y=spoken.getBoundingClientRect().top;
		setProductionNotesActive(root,false);const shift=spoken.getBoundingClientRect().top-y;const restored=getComputedStyle(root.querySelector('.production-note')).display!=='none';root.remove();window.scrollTo(0,0);
		return {words,visible,hidden,restored,y,shift};})()` );
	assert.deepEqual( productionNotes.words, [ "these", "words", "are", "spoken" ] );
	assert.ok( productionNotes.visible && productionNotes.hidden && productionNotes.restored );
	assert.ok( Math.abs( productionNotes.y - 900 * 0.33 ) < 2, "First spoken line aligns below long preparation notes" );
	assert.ok( Math.abs( productionNotes.shift ) < 2, "Showing paused notes preserves the spoken line" );
	console.log( "PASS: production comments hide during delivery, return paused, exclude all enclosed commands/speech and preserve the reading line." );
	const compatibilityConfig = JSON.parse( await fs.readFile( path.join( profile, "stream-deck.json" ), "utf8" ) );
	assert.equal( compatibilityConfig.streamDeckApi.protocolVersion, 1 );
	const compatibilityResponse = await fetch( compatibilityConfig.url + "/stream-deck/hello", {
		method: "POST", headers: { Authorization: `Bearer ${ compatibilityConfig.token }`, "Content-Type": "application/json" },
		body: JSON.stringify( { pluginVersion: "0.1.9", protocolVersion: 1 } )
	} );
	assert.equal( compatibilityResponse.status, 200 );
	assert.equal( ( await compatibilityResponse.json() ).compatibility.compatible, true );
	await until( "document.getElementById('set-stream-deck-status').textContent.includes('plugin 0.1.9')" );
	assert.match( await evaluate( "document.getElementById('set-stream-deck-status').textContent" ), /Compatible/ );
	console.log( "PASS: authenticated plugin version handshake reaches the Settings compatibility status." );

	// Exercise the visible navigation rather than only testing its configuration.
	await evaluate( "document.getElementById('cb-menu').click()" );
	const fileMenu = await evaluate( "document.getElementById('app-menu').textContent" );
	assert.ok( fileMenu.includes( "Open script" ) && fileMenu.includes( "Export the edit pack" ) );
	assert.ok( fileMenu.includes( "Settings…" ) );
	assert.equal( /Sound check|Head.position|Control pad|Voice scroll|All settings|Faster/.test( fileMenu ), false );
	await evaluate( "document.getElementById('app-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.id" ), "cb-menu" );
	await evaluate( "document.getElementById('cb-menu').click();document.querySelector('#app-menu [data-menu-label=\"Settings…\"]').click()" );
	await until( "!document.getElementById('settings-modal').classList.contains('hidden')" );
	await evaluate( "document.getElementById('settings-close').click()" );
	await evaluate( "document.getElementById('cb-settings').click()" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	const centred = () => evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1&&Math.abs(r.y+r.height/2-innerHeight/2)<1;})()" );
	assert.equal( await centred(), true, "Settings opens centred on both axes" );
	const settingsDrag = await evaluate( "(()=>{const r=document.querySelector('.settings-head h3').getBoundingClientRect();return {x:r.x+30,y:r.y+r.height/2};})()" );
	await send( "Input.dispatchMouseEvent", { type: "mousePressed", ...settingsDrag, button: "left", clickCount: 1 } );
	await send( "Input.dispatchMouseEvent", { type: "mouseMoved", x: settingsDrag.x + 45, y: settingsDrag.y + 35, button: "left", buttons: 1 } );
	await send( "Input.dispatchMouseEvent", { type: "mouseReleased", x: settingsDrag.x + 45, y: settingsDrag.y + 35, button: "left", clickCount: 1 } );
	assert.equal( await centred(), false, "Settings can still be dragged while open" );
	await evaluate( "document.getElementById('settings-close').click();document.getElementById('cb-settings').click()" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	assert.equal( await centred(), true, "Reopening clears a previous drag offset" );
	await send( "Emulation.setDeviceMetricsOverride", { width: 560, height: 500, deviceScaleFactor: 1, mobile: false } );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	if ( !await centred() ) console.log( "Settings resize geometry:", await evaluate( "(()=>{const e=document.querySelector('.settings-content'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {viewport:[innerWidth,innerHeight],rect:[r.x,r.y,r.width,r.height],maxHeight:s.maxHeight,position:s.position,transform:s.transform,margin:s.margin,align:s.alignSelf,parent:e.parentElement.getBoundingClientRect().toJSON()};})()" ) );
	assert.equal( await centred(), true, "Settings recentres on a smaller viewport" );
	await send( "Emulation.clearDeviceMetricsOverride" );
	await evaluate( "document.getElementById('settings-close').click()" );
	console.log( "PASS: Settings opens and reopens centred horizontally/vertically, still drags, and recentres on resize." );
	for ( const [ axis, h, v ] of [ [ "h", true, false ], [ "v", true, true ], [ "h", false, true ], [ "v", false, false ] ] ) {
		await evaluate( `document.getElementById('cb-mirror-${ axis }').click()` );
		await until( `document.getElementById('cb-mirror-h').getAttribute('aria-pressed')==='${ h }' && document.getElementById('cb-mirror-v').getAttribute('aria-pressed')==='${ v }'` );
		assert.equal( await evaluate( `[...document.querySelectorAll('.mirror-pills [data-axis=h]')].every(b=>b.getAttribute('aria-pressed')==='${ h }') && [...document.querySelectorAll('.mirror-pills [data-axis=v]')].every(b=>b.getAttribute('aria-pressed')==='${ v }')` ), true );
	}
	console.log( "PASS: labelled Files > Settings and independent toolbar mirrors, including both axes and synced panel controls." );
	await evaluate( "document.getElementById('cb-tools').focus()" );
	await send( "Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 } );
	await send( "Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 } );
	await until( "!document.getElementById('tools-panel').classList.contains('hidden')" );
	assert.equal( await evaluate( "document.getElementById('cb-play').classList.contains('playing')" ), false );
	assert.ok( await evaluate( "document.getElementById('tools-panel').textContent.includes('Show head guide')" ) );
	for ( const width of [ 1100, 900, 560 ] ) {
		await send( "Emulation.setDeviceMetricsOverride", { width, height: 760, deviceScaleFactor: 1, mobile: false } );
		await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		const placement = await evaluate( "(()=>{const p=document.getElementById('tools-panel').getBoundingClientRect();const b=document.getElementById('cb-tools').getBoundingClientRect();const bar=document.getElementById('control-bar').getBoundingClientRect();return {left:p.left,right:p.right,top:p.top,bottom:p.bottom,width:p.width,barBottom:bar.bottom,expectedLeft:Math.max(8,Math.min(b.left,innerWidth-p.width-8))};})()" );
		assert.ok( Math.abs( placement.left - placement.expectedLeft ) < 1 && placement.top >= placement.barBottom && placement.left >= 8 && placement.right <= width - 8 && placement.bottom <= 752, `Tools must follow its button and fit at ${ width }px` );
	}
	await send( "Emulation.clearDeviceMetricsOverride" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	for ( const axis of [ "h", "v", "h", "v" ] ) {
		await evaluate( `document.getElementById('cb-mirror-${ axis }').click()` );
		const attached = await evaluate( "(()=>{const p=document.getElementById('tools-panel').getBoundingClientRect(),b=document.getElementById('cb-tools').getBoundingClientRect(),bar=document.getElementById('control-bar').getBoundingClientRect();const vertical=document.getElementById('cb-mirror-v').getAttribute('aria-pressed')==='true';return p.left<=b.left&&p.right>=b.right&&p.left>=8&&p.right<=innerWidth-8&&(vertical?p.bottom<=bar.top:p.top>=bar.bottom);})()" );
		assert.equal( attached, true, "Tools must stay attached to its button in every mirror mode" );
	}
	const toolsClip = await evaluate( "(()=>{const p=document.getElementById('tools-panel').getBoundingClientRect();const x=Math.max(0,p.left-8);return {x,y:0,width:Math.min(innerWidth-x,p.width+16),height:Math.min(innerHeight,p.bottom+8),scale:1};})()" );
	const toolsAnchorShot = await send( "Page.captureScreenshot", { format: "png", clip: toolsClip } );
	await fs.writeFile( path.join( artifacts, "tools-menu-anchor.png" ), Buffer.from( toolsAnchorShot.result.data, "base64" ) );
	console.log( "PASS: Tools opens below its toolbar button and stays within three viewport widths while resizing." );
	// The redesigned native forms have their own full suite. Retain an inline
	// fallback check here alongside the recorder/head-guide integration fixture.
	await evaluate( "document.getElementById('cb-tools').click();document.getElementById('cb-settings').click()" );
	assert.equal( await evaluate( "document.querySelectorAll('[data-settings-group]').length" ), 8 );
	assert.equal( await evaluate( "document.querySelectorAll('[data-settings-page]').length" ), 34 );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-pagination').length" ), 0 );
	assert.equal( await evaluate( "document.querySelectorAll('#lp-production-colour').length" ), 1 );
	await evaluate( "document.getElementById('settings-topic-layout').click();document.getElementById('lp-reading-line').focus()" );
	const lineBefore = await evaluate( "Number(document.getElementById('lp-reading-line').value)" );
	await send( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 } );
	await send( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 } );
	assert.equal( await evaluate( "Number(document.getElementById('lp-reading-line').value)" ), lineBefore + 1 );
	await evaluate( "document.getElementById('settings-topic-mode').click();const n=document.getElementById('set-countdown');n.value=0;n.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('settings-apply').click()" );
	await until( "document.getElementById('settings-applied').textContent==='Saved'" );
	const navigationSaved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( navigationSaved.settings.readingLine, lineBefore + 1 );
	await evaluate( "document.getElementById('settings-cancel').click()" );
	console.log( "PASS: redesigned Settings inline fallback, permanent controls, keyboard range adjustment and acknowledged Apply." );
	await pictureOf( "#control-bar", "control-bar.png" );
	for ( const width of [ 1100, 900, 700, 560 ] ) {
		await send( "Emulation.setDeviceMetricsOverride", { width, height: 760, deviceScaleFactor: 1, mobile: false } );
		assert.equal( await evaluate( "[...document.querySelectorAll('.cb-slider')].filter(s=>s.getBoundingClientRect().width>0).every(s=>{const label=s.querySelector(':scope > span:not(.slider-with-box)');const r=label.getBoundingClientRect();return label.textContent.trim().length>0&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&getComputedStyle(label).visibility==='visible';})" ), true, `Visible sliders need visible labels at ${ width }px` );
	}
	await send( "Emulation.clearDeviceMetricsOverride" );
	await evaluate( "document.getElementById('cb-mode').click()" );
	await until( "document.getElementById('cb-speed-label').textContent==='Response'" );
	assert.equal( await evaluate( "document.getElementById('cb-speed').closest('label').title.startsWith('Voice response:')" ), true );
	await evaluate( "document.getElementById('cb-on-air').click()" );
	await until( "document.getElementById('cb-backing-label').textContent==='On-air BG'" );
	await pictureOf( "#control-bar", "control-bar-voice-on-air.png" );
	await evaluate( "document.getElementById('cb-on-air').click();document.getElementById('cb-mode').click()" );
	await until( "document.getElementById('cb-speed-label').textContent==='Speed'&&document.getElementById('cb-backing-label').textContent==='Background'" );
	console.log( "PASS: visible slider labels at four window widths, including voice Response and on-air Background state." );
	await evaluate( "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true}))" );
	assert.equal( await evaluate( "document.querySelectorAll('#help-list [role=tab]').length" ), 6 );
	assert.equal( await evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].some(tab=>tab.textContent==='Connections')" ), true );
	assert.equal( await evaluate( "/OBS recording|Record take|Finish recording/.test(document.querySelector('#help-list').textContent)" ), false );
	assert.equal( await evaluate( "document.querySelectorAll('#help-list [role=tabpanel]:not([hidden])').length" ), 1 );
	await evaluate( "document.querySelector('#help-list [role=tab]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))" );
	assert.equal( await evaluate( "document.querySelector('#help-list [aria-selected=true]').textContent" ), "Scripts" );
	assert.equal( await evaluate( "document.activeElement.textContent" ), "Scripts" );
	for ( const [ width, height ] of [ [ 1100, 900 ], [ 560, 500 ] ] ) {
		await send( "Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false } );
		const sizes = await evaluate( "(()=>{const box=document.querySelector('.help-content');return [...document.querySelectorAll('#help-list [role=tab]')].map(b=>{b.click();const r=box.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};});})()" );
		assert.ok( sizes.every( s => s.width === sizes[0].width && s.height === sizes[0].height && s.top >= 0 && s.bottom <= height ), `Help must stay stable within ${ width }×${ height }` );
	}
	await send( "Emulation.clearDeviceMetricsOverride" );
	await evaluate( "[...document.querySelectorAll('#help-list [role=tab]')].find(t=>t.textContent==='Head guide').click()" );
	const shotHelp = await send( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "help-tabs.png" ), Buffer.from( shotHelp.result.data, "base64" ) );
	await evaluate( "document.getElementById('help-close').click()" );
	const voiceSizes = await evaluate( "(async()=>{const {renderHelpTabs,voiceHelpTabs}=await import('./help-tabs.js');const card=document.createElement('div');card.id='voice-help';card.innerHTML='<h4>What can I say?</h4><div id=voice-help-list></div><button>Close</button>';document.body.append(card);const list=card.querySelector('#voice-help-list');renderHelpTabs(list,voiceHelpTabs({voiceCommands:'always',wakeWord:'prompter',obsEnabled:true,obsControls:true,streamDeck:true}),'voice-geometry');const result=[...list.querySelectorAll('[role=tab]')].map(b=>{b.click();const r=card.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};});card.remove();return result;})()" );
	assert.ok( voiceSizes.length > 1 && voiceSizes.every( s => s.width === voiceSizes[0].width && s.height === voiceSizes[0].height && s.top >= 0 && s.bottom <= 900 ), "Voice help CSS keeps the same frame across topics" );
	console.log( "PASS: actual F1 tabs, hidden disabled modes, one visible panel and keyboard tab navigation." );

	// Exercise the actual app popup and the button-token route used by Stream Deck.
	await evaluate( "window.electron.headGuide()" );
	let guideTarget;
	for ( let n = 0; n < 60; n++ ) {
		guideTarget = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) && !t.url.includes( "?" ) );
		if ( guideTarget ) break;
		await pause( 100 );
	}
	assert.ok( guideTarget, "head guide must open" );
	const gws = new WebSocket( guideTarget.webSocketDebuggerUrl );
	await new Promise( r => gws.addEventListener( "open", r ) );
	let gid = 0;
	const gp = new Map();
	gws.addEventListener( "message", ( e ) => {
		const m = JSON.parse( e.data );
		if ( m.id ) {
			gp.get( m.id )?.( m );
			gp.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) exceptions.push( m.params.exceptionDetails.text );
	} );
	const gc = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++gid;
		const timer = setTimeout( () => reject( new Error( "guide CDP timeout" ) ), 8000 );
		gp.set( id, ( m ) => {
			clearTimeout( timer );
			resolve( m );
		} );
		gws.send( JSON.stringify( { id, method, params } ) );
	} );
	const ge = async ( expression ) => {
		const m = await gc( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( m.result?.exceptionDetails ) throw new Error( m.result.exceptionDetails.text );
		return m.result?.result?.value;
	};
	await gc( "Runtime.enable" );
	await pause( 1300 );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().width" ), 960 );
	await ge( "document.querySelector('#bigger').click();document.querySelector('#colour').click()" );
	await pause( 350 );
	assert.ok( ( await ge( "document.querySelector('#head').getAttribute('transform')" ) ).includes( "1.05" ) );
	await ge( "document.querySelector('#adjust').click();document.querySelector('[data-x=\"1\"]').click()" );
	let controlsTarget;
	for ( let n = 0; n < 60; n++ ) {
		controlsTarget = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "controls=1" ) );
		if ( controlsTarget ) break;
		await pause( 100 );
	}
	assert.ok( controlsTarget, "Adjust opens a separate floating window" );
	const cws = new WebSocket( controlsTarget.webSocketDebuggerUrl );
	await new Promise( r => cws.addEventListener( "open", r ) );
	let cid = 0;
	const cp = new Map();
	cws.addEventListener( "message", ( e ) => {
		const m = JSON.parse( e.data );
		if ( m.id ) {
			cp.get( m.id )?.( m );
			cp.delete( m.id );
		}
		if ( m.method === "Runtime.exceptionThrown" ) exceptions.push( m.params.exceptionDetails.text );
	} );
	const cc = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++cid;
		const timer = setTimeout( () => reject( new Error( "adjustments CDP timeout" ) ), 8000 );
		cp.set( id, ( m ) => {
			clearTimeout( timer );
			resolve( m );
		} );
		cws.send( JSON.stringify( { id, method, params } ) );
	} );
	const ce = async ( expression ) => {
		const m = await cc( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( m.result?.exceptionDetails ) throw new Error( m.result.exceptionDetails.text );
		return m.result?.result?.value;
	};
	await cc( "Runtime.enable" );
	for ( let attempt = 0; attempt < 50; attempt++ ) {
		if ( await ce( "document.body.classList.contains('controls-only')&&!document.querySelector('#adjust-panel').hidden" ) ) break;
		await pause( 100 );
	}
	assert.equal( await ce( "document.body.classList.contains('controls-only')&&!document.querySelector('#adjust-panel').hidden" ), true );
	assert.equal( await ce( "(()=>{const panel=document.querySelector('#adjust-panel'),input=document.querySelector('#shape-right');input.scrollIntoView({block:'nearest'});const p=panel.getBoundingClientRect(),r=input.getBoundingClientRect();return panel.scrollWidth<=panel.clientWidth&&r.top>=p.top&&r.bottom<=p.bottom;})()" ), true, "All fitting controls remain reachable in the scrollable guide panel" );
	await ce( "document.querySelector('#adjust-panel').scrollTop=0" );
	await pause( 200 );
	await ge( "document.querySelector('[data-y=\"-1\"]').click()" );
	await pause( 200 );
	await ge( "document.querySelector('#shape-width').value=125;document.querySelector('#shape-width').dispatchEvent(new Event('input'));document.querySelector('#shape-height').value=90;document.querySelector('#shape-height').dispatchEvent(new Event('input'))" );
	await pause( 250 );
	await ge( "document.querySelector('#save-ideal').click()" );
	await pause( 200 );
	const savedIdealTransform = await ge( "document.querySelector('#ideal-head').getAttribute('transform')" );
	const savedIdealShape = await ge( "document.querySelector('#ideal-head .head-outline').getAttribute('transform')" );
	const eyeBounds = () => ge( "(()=>{const r=document.querySelector('#head .eye-marks').getBoundingClientRect();const e=document.querySelector('#head ellipse').getBoundingClientRect();return {eyes:{x:r.x,y:r.y,width:r.width},outline:{width:e.width,height:e.height}};})()" );
	const beforeShape = await eyeBounds();
	await ge( "document.querySelector('#lock-eyes').click()" );
	await pause( 150 );
	assert.equal( await ge( "[...document.querySelectorAll('.pose-arrows button')].every(b=>b.disabled)" ), true );
	await ge( "document.querySelector('#shape-width').value=145;document.querySelector('#shape-width').dispatchEvent(new Event('input'))" );
	await pause( 150 );
	const afterWidth = await eyeBounds();
	assert.ok( afterWidth.outline.width > beforeShape.outline.width && Math.abs( afterWidth.outline.height - beforeShape.outline.height ) < 0.01, "Width changes only the horizontal outline dimension" );
	await ge( "document.querySelector('#shape-height').value=120;document.querySelector('#shape-height').dispatchEvent(new Event('input'));window.headGuide.action('preferences',{x:20,y:20})" );
	await pause( 250 );
	const afterShape = await eyeBounds();
	for ( const key of [ "x", "y", "width" ] ) assert.ok( Math.abs( beforeShape.eyes[key] - afterShape.eyes[key] ) < 0.01, `eye ${ key } must stay fixed while reshaping` );
	assert.ok( afterShape.outline.width > beforeShape.outline.width && afterShape.outline.height > beforeShape.outline.height );
	assert.ok( Math.abs( afterShape.outline.width - afterWidth.outline.width ) < 0.01, "Height leaves outline width unchanged" );
	const lockedPoint = await ge( "(()=>{const p=new DOMPoint(500,187).matrixTransform(document.querySelector('#head').getScreenCTM());return {x:p.x,y:p.y};})()" );
	await gc( "Input.dispatchMouseEvent", { type: "mousePressed", x: lockedPoint.x, y: lockedPoint.y, button: "left", clickCount: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseMoved", x: lockedPoint.x + 48, y: lockedPoint.y + 27, button: "left", buttons: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseReleased", x: lockedPoint.x + 48, y: lockedPoint.y + 27, button: "left", clickCount: 1 } );
	await pause( 150 );
	assert.deepEqual( ( await eyeBounds() ).eyes, afterShape.eyes, "Dragging with eyes locked cannot move the eye position" );
	await ge( "document.querySelector('#bigger').click()" );
	await pause( 150 );
	const afterSize = await eyeBounds();
	for ( const key of [ "x", "y", "width" ] ) assert.ok( Math.abs( beforeShape.eyes[key] - afterSize.eyes[key] ) < 0.01, `eye ${ key } must stay fixed while scaling` );
	assert.equal( await ge( "document.querySelector('#ideal-head .head-outline').getAttribute('transform')" ), savedIdealShape );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	assert.equal( await ge( "document.querySelector('#lock-eyes').getAttribute('aria-pressed')" ), "false" );
	assert.equal( await ge( "document.querySelector('#head .head-outline').getAttribute('transform')" ), savedIdealShape );
	console.log( "PASS: independent outline width/height and overall size preserve both eye marks; eye lock blocks position changes; ideal shape and reset persist." );
	await ce( "document.querySelector('#eye-x').value=2.5;document.querySelector('#eye-x').dispatchEvent(new Event('change'));document.querySelector('#eye-y').value=-2;document.querySelector('#eye-y').dispatchEvent(new Event('change'))" );
	await pause( 200 );
	await ce( "document.querySelector('#lock-eyes').click()" );
	await pause( 150 );
	assert.equal( await ce( "document.querySelector('#eye-x').disabled&&document.querySelector('#eye-y').disabled" ), true );
	const edgeBounds = () => ge( "(()=>{const r=document.querySelector('#head ellipse').getBoundingClientRect();const e=document.querySelector('#head .eye-marks').getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,eyes:{x:e.x,y:e.y,width:e.width}};})()" );
	for ( const edge of [ "top", "bottom", "left", "right" ] ) {
		const before = await edgeBounds();
		await ce( `document.querySelector('#shape-${ edge }').value=130;document.querySelector('#shape-${ edge }').dispatchEvent(new Event('input'))` );
		await pause( 150 );
		const after = await edgeBounds();
		assert.notEqual( after[edge], before[edge] );
		for ( const other of [ "top", "bottom", "left", "right" ].filter( e => e !== edge ) ) assert.ok( Math.abs( after[other] - before[other] ) < 0.01, `${ edge } must not move ${ other }` );
		assert.deepEqual( after.eyes, before.eyes, `${ edge } fitting keeps both eyes fixed` );
	}
	await ce( "document.querySelector('#save-ideal').click()" );
	await pause( 150 );
	await ce( "document.querySelector('#shape-top').value=70;document.querySelector('#shape-top').dispatchEvent(new Event('input'));document.querySelector('#reset-pose').click()" );
	await pause( 150 );
	assert.equal( await ce( "document.querySelector('#shape-top').value" ), "130" );
	assert.equal( await ce( "document.querySelector('#lock-eyes').getAttribute('aria-pressed')" ), "false" );
	await ce( "document.querySelector('#background').value=24;document.querySelector('#background').dispatchEvent(new Event('input'))" );
	await pause( 150 );
	assert.equal( await ge( "getComputedStyle(document.querySelector('#stage')).backgroundColor" ), "rgba(0, 0, 0, 0.24)" );
	assert.equal( await ge( "document.querySelector('svg').style.opacity" ), "0.75", "Background must not change outline opacity" );
	await ce( "document.querySelector('#background').value=0;document.querySelector('#background').dispatchEvent(new Event('input'))" );
	await pause( 150 );
	assert.equal( await ge( "getComputedStyle(document.querySelector('#stage')).backgroundColor" ), "rgba(0, 0, 0, 0)" );
	await ce( "window.headGuide.action('preferences',{x:1,y:-1,top:1,bottom:1,left:1,right:1,background:0.12});document.querySelector('#save-ideal').click()" );
	await pause( 200 );
	console.log( "PASS: floating eye centre/level controls, independent four-edge fitting, saved ideal/reset and independent zero-to-24% background opacity." );
	await ge( "document.querySelector('[data-x=\"-1\"]').click();document.querySelector('#smaller').click()" );
	await pause( 250 );
	assert.equal( await ge( "document.querySelector('#ideal-head').getAttribute('transform')" ), savedIdealTransform, "moving actual must leave ideal fixed" );
	assert.notEqual( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	assert.equal( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform, "reset must restore ideal pose" );
	assert.equal( await ge( "document.querySelector('#ideal-head .pose-label').textContent" ), "Ideal position" );
	assert.equal( await ge( "document.querySelector('#head .pose-label').textContent" ), "Recording target" );
	// Real pointer input exercises the SVG coordinate mapping and drag capture.
	const dragPoint = await ge( "(()=>{const p=new DOMPoint(500,187).matrixTransform(document.querySelector('#head').getScreenCTM());return {x:p.x,y:p.y};})()" );
	await gc( "Input.dispatchMouseEvent", { type: "mousePressed", x: dragPoint.x, y: dragPoint.y, button: "left", clickCount: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseMoved", x: dragPoint.x + 48, y: dragPoint.y + 27, button: "left", buttons: 1 } );
	await gc( "Input.dispatchMouseEvent", { type: "mouseReleased", x: dragPoint.x + 48, y: dragPoint.y + 27, button: "left", clickCount: 1 } );
	await pause( 250 );
	assert.notEqual( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform, "drag must move actual outline" );
	assert.equal( await ge( "document.querySelector('#ideal-head').getAttribute('transform')" ), savedIdealTransform );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	console.log( "PASS: labelled ideal/actual outlines, arrows, independent scale, saved ideal, reset and pointer dragging." );
	await ge( "window.headGuide.onState(v=>window.guideTestState=v);document.querySelector('[data-place=centre]').click()" );
	await pause( 350 );
	const centre = await ge( "window.guideTestState.bounds" );
	await ge( "document.querySelector('[data-place=beside]').click()" );
	await pause( 350 );
	await ge( "document.querySelector('[data-place=centre]').click()" );
	await pause( 350 );
	assert.deepEqual( await ge( "window.guideTestState.bounds" ), centre, "centre placement must restore its own saved bounds" );
	assert.equal( await ge( "window.guideTestState.placement" ), "centre" );
	assert.ok( await ge( "!!window.guideTestState.placements.centre && !!window.guideTestState.placements.beside" ) );
	assert.equal( await ge( "window.guideTestState.ideal.x" ), 1 );
	console.log( "PASS: separate saved Centre/Beside placements and live guide metadata." );
	await ge( "window.headGuide.action('resize-start');window.headGuide.action('resize');window.headGuide.action('resize-end')" );
	await ge( "window.headGuide.action('preferences',{x:9,y:2,scale:0.95})" );
	await pause( 250 );
	const shotGuide = await gc( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "head-guide-integrated.png" ), Buffer.from( shotGuide.result.data, "base64" ) );
	const shotControls = await cc( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "guide-adjustments.png" ), Buffer.from( shotControls.result.data, "base64" ) );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 250 );
	await ge( "document.querySelector('#lock').click()" );
	await pause( 300 );
	assert.equal( await ge( "document.body.classList.contains('locked')" ), true );
	const config = JSON.parse( await fs.readFile( path.join( profile, "stream-deck.json" ), "utf8" ) );
	const headers = { Authorization: "Bearer " + config.token, "Content-Type": "application/json" };
	const getStatus = async () => await ( await fetch( config.url + "/status", { headers } ) ).json();
	assert.equal( ( await getStatus() ).headGuideLocked, true );
	const press = async () => {
		const res = await fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action: "head-guide" } ) } );
		assert.equal( res.status, 200 );
		await pause( 400 );
	};
	const fullscreenPress = async () => {
		const res = await fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action: "head-guide-fullscreen" } ) } );
		assert.equal( res.status, 200 );
		await pause( 500 );
	};
	await fullscreenPress();
	assert.equal( ( await getStatus() ).headGuideFullscreen, true );
	assert.equal( await ge( "document.body.classList.contains('fullscreen') && document.body.classList.contains('chromeless')" ), true );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().top" ), 0 );
	await until( "!document.getElementById('guide-controls').classList.contains('hidden')" );
	assert.equal( await evaluate( "document.getElementById('guide-controls').textContent" ), "Guide adjustments" );
	// The same button hides and shows the palette without unlocking the fullscreen overlay.
	await ce( "window.headGuide.action('adjust-hide')" );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='false'" );
	const adjustmentButton = await evaluate( "(()=>{const b=document.getElementById('guide-controls');const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,visible:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b};})()" );
	assert.equal( adjustmentButton.visible, true, "The guide adjustment button is reachable on the prompter" );
	await send( "Input.dispatchMouseEvent", { type: "mousePressed", x: adjustmentButton.x, y: adjustmentButton.y, button: "left", clickCount: 1 } );
	await send( "Input.dispatchMouseEvent", { type: "mouseReleased", x: adjustmentButton.x, y: adjustmentButton.y, button: "left", clickCount: 1 } );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='true'" );
	await evaluate( "document.getElementById('guide-controls').click()" );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='false'" );
	await evaluate( "document.getElementById('guide-controls').click()" );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='true'" );
	assert.equal( await ce( "getComputedStyle(document.querySelector('#adjust-panel')).visibility" ), "visible" );
	assert.equal( await ge( "document.body.classList.contains('locked')&&document.body.classList.contains('chromeless')&&document.body.classList.contains('fullscreen')" ), true );
	const fullBounds = await ge( "window.guideTestState.bounds" );
	await ce( "document.querySelector('#background').value=30;document.querySelector('#background').dispatchEvent(new Event('input'))" );
	await pause( 150 );
	assert.equal( await ge( "getComputedStyle(document.querySelector('#stage')).backgroundColor" ), "rgba(0, 0, 0, 0.3)" );
	assert.deepEqual( await ge( "window.guideTestState.bounds" ), fullBounds );
	await ce( "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))" );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='false'" );
	await evaluate( "document.getElementById('cb-tools').click()" );
	assert.ok( await evaluate( "document.getElementById('tools-panel').textContent.includes('Guide adjustments')" ) );
	await evaluate( "[...document.querySelectorAll('#tools-panel button')].find(b=>b.textContent.includes('Guide adjustments')).click()" );
	await pause( 250 );
	assert.equal( await evaluate( "document.getElementById('guide-controls').getAttribute('aria-pressed')" ), "true" );
	await ce( "window.close()" );
	await until( "document.getElementById('guide-controls').getAttribute('aria-pressed')==='false'" );
	await press();
	assert.equal( await ge( "!document.body.classList.contains('locked')&&!document.body.classList.contains('chromeless')&&document.body.classList.contains('fullscreen')" ), true );
	console.log( "PASS: separate adjustment window toggles from prompter and Tools while the overlay stays fullscreen, Clean and locked; Escape/native Close hide only the palette." );
	await fullscreenPress();
	assert.equal( ( await getStatus() ).headGuideFullscreen, false );
	for ( let attempt = 0; attempt < 50; attempt++ ) {
		if ( await ge( "document.querySelector('#stage').getBoundingClientRect().width===960&&document.querySelector('#stage').getBoundingClientRect().height===540" ) ) break;
		await pause( 100 );
	}
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().width" ), 960 );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().height" ), 540 );
	console.log( "PASS: fullscreen button-token command, chromeless screen-fill, reveal controls without exit, and original window size restored." );
	await press();
	assert.equal( ( await getStatus() ).showHeadGuide, false );
	cws.close();
	gws.close();
	await press();
	const reopened = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) && !t.url.includes( "?" ) );
	assert.ok( reopened );
	const saved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( saved.settings.headGuideScale, 1.05 );
	assert.equal( saved.settings.headGuideColour, "gold" );
	assert.equal( saved.settings.headGuideBounds.width, 960 );
	assert.deepEqual( saved.settings.headGuideIdeal, { x: 1, y: -1, scale: 1.05, width: 1.25, height: 0.9, top: 1, bottom: 1, left: 1, right: 1 } );
	assert.equal( saved.settings.headGuideBackground, 0.3 );
	assert.equal( saved.settings.headGuideWidth, 1.25 );
	assert.equal( saved.settings.headGuideHeight, 0.9 );
	assert.equal( saved.settings.headGuideX, 1 );
	assert.equal( saved.settings.headGuideY, -1 );
	await press();
	console.log( "PASS: integrated popup, appearance persistence, size, lock/unlock/hide/reopen and Stream Deck button-token route." );

	assert.equal( connections, 0 );
	assert.equal( ( await evaluate( "window.electron.obs('status')" ) ).state.enabled, false );
	const command = async action => fetch( config.url + "/command", { method: "POST", headers, body: JSON.stringify( { action } ) } );
	await command( "play" );
	await pause( 500 );
	assert.equal( ( await getStatus() ).scrolling, true );
	await command( "obs-finish" );
	await pause( 300 );
	assert.equal( ( await getStatus() ).scrolling, true, "disabled OBS Finish must not stop prompting" );
	await command( "pause" );
	await pause( 200 );
	console.log( "PASS: disabled OBS Finish leaves ordinary prompting running." );
	await openSettings();
	await evaluate( "document.getElementById('settings-topic-api').click();document.getElementById('set-mcp-enabled').click();document.getElementById('settings-apply').click()" );
	const mcpFile = path.join( profile, "mcp-control.json" );
	for ( let n = 0; n < 50 && !await fs.stat( mcpFile ).catch( () => null ); n++ ) await pause( 50 );
	const mcp = JSON.parse( await fs.readFile( mcpFile, "utf8" ) );
	assert.equal( mcp.permissions.scripts, false );
	const mcpHeaders = { Authorization: `Bearer ${ mcp.token }`, "Content-Type": "application/json" };
	assert.equal( ( await fetch( mcp.url + '/status', { headers: mcpHeaders } ) ).status, 200 );
	assert.equal( ( await fetch( mcp.url + '/command', { method: 'POST', headers: mcpHeaders, body: JSON.stringify( { action: 'play' } ) } ) ).status, 403 );
	await evaluate( "document.getElementById('set-mcp-scripts').click();document.getElementById('settings-apply').click()" );
	await until( "document.getElementById('settings-applied').textContent==='Saved'" );
	for ( let n = 0; n < 50 && !JSON.parse( await fs.readFile( mcpFile, 'utf8' ) ).permissions.scripts; n++ ) await pause( 50 );
	assert.equal( JSON.parse( await fs.readFile( mcpFile, 'utf8' ) ).permissions.scripts, true );
	await evaluate( "document.getElementById('set-mcp-enabled').click();document.getElementById('settings-apply').click()" );
	for ( let n = 0; n < 50 && await fs.stat( mcpFile ).catch( () => null ); n++ ) await pause( 50 );
	assert.equal( !!await fs.stat( mcpFile ).catch( () => null ), false );
	assert.equal( ( await fetch( mcp.url + '/status', { headers: mcpHeaders } ) ).status, 401, "Disabled MCP revokes its distinct credential" );
	await evaluate( "document.getElementById('settings-close').click()" );
	console.log( "PASS: native MCP enable/Apply, read-only defaults, separate scripting grant and live credential revocation." );
	await openSettings();
	await evaluate( `(()=>{document.getElementById('set-obs-enabled').checked=true;document.getElementById('set-obs-host').value='127.0.0.1';document.getElementById('set-obs-port').value=${ port };document.getElementById('set-obs-password').value='sightline-test-only';document.getElementById('set-obs-markers').checked=true;document.getElementById('settings-apply').click()})()` );
	await until( "window.electron.obs('status').then(r=>r.state.connection==='connected' && r.state.recording==='stopped')" );
	await evaluate( "document.getElementById('settings-topic-obs').click()" );
	assert.deepEqual( await evaluate( "[...document.querySelectorAll('#settings-page-obs [data-obs-topic]')].filter(x=>!x.hidden).map(x=>x.textContent)" ), [ "Connection", "Recording control", "Profile and scenes" ], "OBS has three visible subtabs" );
	assert.equal( await evaluate( "document.getElementById('set-obs-connection-state').textContent" ), "Connection: Connected" );
	assert.equal( await evaluate( "document.getElementById('set-obs-recording-state').textContent" ), "Recording: Not recording" );
	await evaluate( "document.getElementById('set-obs-test').click()" );
	await until( "document.getElementById('set-obs-test-result').dataset.result==='passed'" );
	assert.equal( await evaluate( "document.querySelector('#obs-status .obs-test-result').dataset.result" ), "passed", "Connection test feedback is retained on the prompter too" );
	await evaluate( "document.querySelector('#settings-page-obs [data-obs-topic=obs-recording]').click()" );
	assert.equal( await evaluate( "!document.getElementById('settings-page-obs-recording').hidden&&document.getElementById('settings-topic-obs').getAttribute('aria-current')==='page'" ), true, "OBS subtabs retain a single selected sidebar home" );
	await evaluate( "document.querySelector('#settings-page-obs-recording [data-obs-topic=obs]').click();document.getElementById('set-obs-port').value='4456';document.getElementById('set-obs-port').dispatchEvent(new Event('input',{bubbles:true}))" );
	assert.equal( await evaluate( "document.getElementById('set-obs-test').disabled&&document.getElementById('set-obs-test-result').dataset.result==='stale'" ), true, "A passed test cannot validate unsaved connection changes" );
	await evaluate( `document.getElementById('set-obs-port').value='${ port }';document.getElementById('set-obs-port').dispatchEvent(new Event('input',{bubbles:true}))` );
	assert.ok( authOK );
	assert.equal( ( await evaluate( "window.electron.obs('start')" ) ).ok, false );
	assert.equal( active, false );
	await evaluate( "document.getElementById('settings-close').click()" );
	await command( "play" );
	await pause( 400 );
	await command( "obs-finish" );
	await pause( 300 );
	assert.equal( ( await getStatus() ).scrolling, true, "status-only OBS Finish must not stop prompting" );
	await command( "pause" );
	await openSettings();
	await evaluate( "document.getElementById('set-obs-controls').checked=true;document.getElementById('settings-apply').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.controls)" );
	const shot = await send( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( screenshot, Buffer.from( shot.result.data, "base64" ) );
	await evaluate( "document.getElementById('settings-close').click()" );
	await command( "restart" );
	await pause( 500 );
	await until( "window.electron.obs('status').then(r=>r.state.controls && r.state.markers && r.state.chapters)" );
	await evaluate( "document.querySelector('#obs-status button').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='recording')" );
	await pause( 3300 );
	await evaluate( "document.querySelector('#obs-status button:last-child').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='stopped' && !!r.state.outputPath)" );
	await pause( 700 );
	const files = await fs.readdir( path.join( profile, "take-logs" ) );
	const log = JSON.parse( await fs.readFile( path.join( profile, "take-logs", files.find( n => n.endsWith( ".json" ) ) ), "utf8" ) );
	assert.ok( log.takes.length > 0, "prompter must log a take" );
	assert.ok( log.obs.some( e => e.outputPath === "/recordings/sightline-smoke.mp4" ), "take log must link the confirmed recording path" );
	assert.ok( requests.includes( "CreateRecordChapter" ), "section starts must send a chapter" );
	const secondScript = path.join( profile, "next-module.md" );
	await fs.writeFile( secondScript, `# Next module\n\n## Module two\n\n${ "This module has its own script snapshot and take log. ".repeat( 60 ) }` );
	const automation = JSON.parse( await fs.readFile( path.join( profile, "remote-control.json" ), "utf8" ) );
	const openNext = await fetch( automation.url + "/open", { method: "POST", headers: { Authorization: `Bearer ${ automation.token }`, "Content-Type": "application/json" }, body: JSON.stringify( { path: secondScript } ) } );
	assert.equal( openNext.ok, true );
	await until( "document.getElementById('md').textContent.includes('Module two')" );
	await pause( 400 );
	const savedFirst = JSON.parse( await fs.readFile( path.join( profile, "take-logs", files.find( n => n.endsWith( ".json" ) ) ), "utf8" ) );
	assert.equal( savedFirst.script, "recording-check.md" );
	assert.equal( savedFirst.takes.length, log.takes.length );
	console.log( "PASS: module handover flushes the old recording before loading the new script." );
	await evaluate( "window.electron.openSample('voice-and-stops.md')" );
	await until( "document.getElementById('md').textContent.includes('Voice')" );
	assert.equal( await evaluate( "document.getElementById('cb-tools').previousElementSibling.id" ), "cb-prepare" );
	assert.equal( await evaluate( "document.getElementById('cb-prepare').previousElementSibling.id" ), "cb-edit" );
	await evaluate( "document.getElementById('cb-edit').click()" );
	await until( "document.querySelector('#editor .cm-content')?.getAttribute('aria-readonly')==='true'" );
	assert.equal( await evaluate( "document.activeElement === document.querySelector('#editor .cm-content')" ), true, "read-only source stays keyboard-focusable for selection and copying" );
	assert.equal( await evaluate( "document.getElementById('btn-save').disabled" ), true );
	assert.equal( await evaluate( "document.getElementById('btn-save-as').textContent" ), "Save a copy…" );
	const sampleFile = path.join( profile, "samples", "voice-and-stops.md" );
	const originalSample = await fs.readFile( sampleFile, "utf8" );
	await send( "Input.insertText", { text: "MUST NOT CHANGE A SAMPLE" } );
	await evaluate( "window.electron.saveFile('MUST NOT OVERWRITE SAMPLE');window.electron.applySectionTargets({1:99})" );
	await pause( 300 );
	assert.equal( await fs.readFile( sampleFile, "utf8" ), originalSample );
	assert.equal( await evaluate( "document.querySelector('#editor .cm-content').textContent.includes('MUST NOT CHANGE')" ), false );
	await pause( 2900 );
	await pictureOf( "#editor-container", "sample-read-only.png" );
	await evaluate( "document.getElementById('btn-cancel').click()" );
	await until( "!document.body.classList.contains('editing')" );
	await fetch( automation.url + "/open", { method: "POST", headers: { Authorization: `Bearer ${ automation.token }`, "Content-Type": "application/json" }, body: JSON.stringify( { path: secondScript } ) } );
	await until( "document.getElementById('md').textContent.includes('Module two')" );
	await evaluate( "document.getElementById('cb-edit').click()" );
	await until( "document.querySelector('#editor .cm-content')?.getAttribute('aria-readonly')==='false'" );
	await send( "Input.insertText", { text: "An editable original script" } );
	assert.equal( await evaluate( "document.querySelector('#editor .cm-content').textContent.includes('An editable original script')" ), true );
	await evaluate( "document.getElementById('btn-save').click()" );
	await until( "document.getElementById('toolbar-dirty').classList.contains('hidden')" );
	await evaluate( "document.getElementById('btn-cancel').click()" );
	await until( "!document.body.classList.contains('editing')" );
	console.log( "PASS: samples open read-only, typing and direct saves cannot alter them, and personal scripts remain editable." );
	// The user's recorder is never contacted: all four actions use this fixture.
	await evaluate( "window.electron.saveObsSettings({enabled:true,host:'127.0.0.1',port:" + port + ",controls:true,followPrompter:true,markers:true,recordedSlate:false})" );
	await command( "restart" );
	await pause( 150 );
	await command( "play" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='recording')" );
	await until( "document.getElementById('obs-status').textContent.includes('OBS RECORDING')" );
	const linkedId = ( await evaluate( "window.electron.obs('status')" ) ).state.recordingId;
	await command( "pause" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='paused')" );
	await until( "document.getElementById('obs-status').textContent.includes('OBS PAUSED')" );
	await command( "play" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='recording')" );
	assert.equal( ( await evaluate( "window.electron.obs('status')" ) ).state.recordingId, linkedId );
	await command( "pause" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='paused')" );
	await evaluate( "window.electron.obs('stop')" );
	await until( "document.getElementById('obs-status').textContent.includes('OBS OFF')" );
	await evaluate( "window.electron.saveObsSettings({enabled:true,host:'127.0.0.1',port:" + port + ",controls:true,followPrompter:false,markers:true,recordedSlate:false})" );
	console.log( "PASS: linked Play/pause/resume waits for recorder confirmation; pause retains file identity and all three recording pill states update." );
	const directiveScript = path.join( profile, "explicit-recording.md" );
	await fs.writeFile( directiveScript, `# Recording directive\n\n<!-- Remember to press Record. {record: off} -->\n\n{record: on}\n\n## A section\n\n${ "These are spoken words for a recording directive check. ".repeat( 60 ) }` );
	const startsBeforeLoad = requests.filter( r => r === "StartRecord" ).length;
	await fetch( automation.url + "/open", { method: "POST", headers: { Authorization: `Bearer ${ automation.token }`, "Content-Type": "application/json" }, body: JSON.stringify( { path: directiveScript } ) } );
	await until( "document.getElementById('md').textContent.includes('Recording directive')" );
	await pause( 250 );
	assert.equal( requests.filter( r => r === "StartRecord" ).length, startsBeforeLoad, "Loading a recording directive must not execute it" );
	await command( "play" );
	await until( "window.electron.obs('status').then(r=>r.state.recording==='recording')" );
	await until( "document.getElementById('md').classList.contains('take-reading')" );
	assert.equal( requests.filter( r => r === "StartRecord" ).length, startsBeforeLoad + 1 );
	await command( "pause" );
	await until( "!document.getElementById('md').classList.contains('take-reading')" );
	assert.equal( active, true, "Continuous mode leaves recording running during a prompting pause" );
	await evaluate( "window.electron.obs('stop')" );
	console.log( "PASS: real Markdown production comments render, recording directives wait for Play, and continuous-mode pauses keep recording." );
	await evaluate( "window.electron.obs('start')" );
	assert.ok( active );
	const stops = requests.filter( r => r === "StopRecord" ).length;
	await openSettings();
	await evaluate( "document.getElementById('set-obs-enabled').checked=false;document.getElementById('settings-apply').click()" );
	await until( "window.electron.obs('status').then(r=>r.state.connection==='disabled')" );
	assert.ok( active, "disable must leave OBS recording" );
	assert.equal( requests.filter( r => r === "StopRecord" ).length, stops );
	assert.equal( ( await evaluate( "window.electron.obs('test')" ) ).ok, false );
	assert.deepEqual( exceptions, [] );
	await evaluate( "window.electron.headGuide()" );
	await pause( 500 );
	console.log( JSON.stringify( { pass: true, authOK, connections, requests, takes: log.takes.length, obsObservations: log.obs.length, exceptions, screenshot, profile } ) );
} catch ( error ) {
	console.error( error.stack );
	console.error( errors.slice( -2400 ) );
	process.exitCode = 1;
} finally {
	try {
		if ( ws?.readyState === 1 ) await send( "Browser.close" );
	} catch { /* The process may already have closed after a failed check. */ }
	ws?.close();
	child.kill();
	for ( const socket of mock.clients ) socket.terminate();
	mock.close();
}
