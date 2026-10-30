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
		if ( d.requestType === "StartRecord" ) active = true;
		if ( d.requestType === "StopRecord" ) {
			active = false;
			responseData = { outputPath: "/recordings/sightline-smoke.mp4" };
		}
		if ( d.requestType === "GetRecordStatus" ) responseData = { outputActive: active, outputPaused: false, outputDuration: 3000 };
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
const child = spawn( require( "electron" ), [ ".", `--user-data-dir=${ profile }`, "--remote-debugging-port=9335", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
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
	await until( "document.getElementById('obs-status') && document.getElementById('md').textContent.trim().length > 100" );
	await evaluate( "document.querySelector('#voice-offer button:last-child')?.click()" );
	const directions = await evaluate( "(async()=>{const {decorateScript}=await import('./decorate.js');const {buildWordIndex}=await import('./word-index.js');const {indexSentences,scriptSentences}=await import('./sentence-highlight.js');const root=document.createElement('div');root.innerHTML='<p>[smile] Hello [shrug] there. [think] More [point] words.</p>';decorateScript(root);const words=buildWordIndex(root).words;indexSentences(root);const sentences=scriptSentences();indexSentences(document.getElementById('md'));return {words,text:root.textContent,directions:root.querySelectorAll('.dir-text').length,sentences:sentences.map(s=>s.text)};})()" );
	assert.deepEqual( directions.words, [ "hello", "there", "more", "words" ] );
	assert.equal( directions.directions, 4 );
	assert.ok( directions.text.includes( "smile" ) && directions.text.includes( "point" ) );
	assert.equal( directions.sentences.join( " " ), "Hello there. More words." );
	console.log( "PASS: delivery notes remain visible but stay out of speech alignment, counts and exported sentences." );
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
	assert.ok( await evaluate( "document.getElementById('tools-panel').textContent.includes('Head guide / unlock')" ) );
	await evaluate( "document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))" );
	assert.ok( await evaluate( "document.activeElement.textContent.includes('Head guide')" ) );
	await evaluate( "document.getElementById('tools-panel').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.id" ), "cb-tools" );
	await evaluate( "document.getElementById('cb-settings').focus();document.getElementById('cb-settings').click()" );
	assert.deepEqual( await evaluate( "[...document.querySelectorAll('.settings-tabs button')].map(b=>b.textContent)" ), [ "Prompting", "Appearance", "Recording", "Controls", "About" ] );
	assert.equal( await evaluate( "document.querySelectorAll('#settings-modal fieldset:not([data-tab])').length" ), 0 );
	assert.equal( await evaluate( "[...document.querySelectorAll('#settings-modal fieldset')].every(f=>f.closest('[data-settings-page]'))" ), true );
	assert.equal( await evaluate( "['set-opacity','set-reading-line','set-reading-marker','set-sentence','set-mirrored','set-file-open','set-file-save'].some(id=>document.getElementById(id))" ), false );
	await evaluate( "document.getElementById('set-countdown').value='2';document.querySelector('[data-settings-group=appearance]').click();document.querySelector('[data-settings-group=prompting]').click()" );
	assert.equal( await evaluate( "document.getElementById('set-countdown').value" ), "2" );
	await evaluate( "document.getElementById('settings-group-prompting').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.textContent" ), "Appearance" );
	await evaluate( "document.getElementById('settings-topic-reading').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.textContent" ), "Screens" );
	await evaluate( "document.getElementById('settings-close').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.id" ), "settings-save" );
	await evaluate( "document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}))" );
	assert.equal( await evaluate( "document.activeElement.id" ), "settings-close" );
	const visited = await evaluate( "(()=>{const results=[];for(const group of document.querySelectorAll('.settings-tabs button')){group.click();for(const topic of [...document.querySelectorAll('.settings-subtabs button')].filter(b=>!b.hidden)){topic.click();const page=document.getElementById(topic.getAttribute('aria-controls'));results.push({name:topic.dataset.tab,visible:page.getClientRects().length>0,fields:page.querySelectorAll('fieldset').length,one:[...document.querySelectorAll('[data-settings-page]')].filter(p=>p.getClientRects().length).length===1});}}return results;})()" );
	assert.equal( visited.length, 18 );
	assert.ok( visited.every( page => page.visible && page.fields && page.one ), JSON.stringify( visited ) );
	const semantics = await evaluate( "(()=>{const root=document.querySelector('.settings-content');return {unlabelled:[...root.querySelectorAll('input,select,textarea')].filter(e=>!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&![...(e.labels??[])].some(l=>l.textContent.trim())).map(e=>e.id||e.className),nested:root.querySelectorAll('label button,label input~input').length,oldCaption:root.textContent.includes('How this works'),colourScheme:getComputedStyle(root).colorScheme,interactiveTooltips:document.querySelectorAll('.settings-explanation a,.settings-explanation button').length};})()" );
	assert.deepEqual( semantics.unlabelled, [], "Every settings control needs an accessible name" );
	assert.equal( semantics.nested, 0, "Help and number buttons must not be nested inside control labels" );
	assert.equal( semantics.oldCaption, false );
	assert.equal( semantics.colourScheme, "dark" );
	assert.equal( semantics.interactiveTooltips, 0, "Links and actions stay outside non-interactive tooltips" );
	async function checkSettingsFit( width, height ) {
		await send( "Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false } );
		await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		const frame = await evaluate( "(()=>{const r=document.querySelector('.settings-content').getBoundingClientRect();return {width:r.width,height:r.height};})()" );
		for ( const entry of visited ) {
			await evaluate( `document.getElementById('settings-topic-${ entry.name }').click()` );
			for ( let n = 0; n < 30; n++ ) {
				await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
				const fit = await evaluate( "(()=>{const b=document.querySelector('.settings-content'),r=b.getBoundingClientRect(),f=b.querySelector('.settings-actions').getBoundingClientRect(),p=b.querySelector('[data-settings-page]:not([hidden])');return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,overflow:b.scrollHeight-b.clientHeight,footer:Math.abs(f.bottom-r.bottom)<=1,topic:p.dataset.settingsPage,page:b.querySelector('.settings-pagination [role=status]').textContent,next:b.querySelector('.settings-pagination').getClientRects().length&&!b.querySelector('.settings-pagination button:last-child').disabled};})()" );
				assert.ok( fit.height <= 560 && fit.top >= 0 && fit.bottom <= height && fit.overflow <= 1 && fit.footer, JSON.stringify( { width, height, ...fit } ) );
				assert.ok( Math.abs( fit.width - frame.width ) <= 1 && Math.abs( fit.height - frame.height ) <= 1, `Settings must keep the same size across every topic and page: ${ JSON.stringify( { frame, fit } ) }` );
				const outside = await evaluate( "(()=>{const b=document.querySelector('.settings-content').getBoundingClientRect();return [...document.querySelector('[data-settings-page]:not([hidden])').querySelectorAll('input,select,button,textarea')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1;}).map(e=>e.id||e.className);})()" );
				assert.deepEqual( outside, [], `Settings controls must stay inside the panel: ${ entry.name }` );
				if ( !fit.next ) break;
				assert.ok( n < 29, "Settings pages must end" );
				await evaluate( "document.querySelector('.settings-pagination button:last-child').click()" );
			}
		}
	}
	await checkSettingsFit( 1100, 900 );
	await checkSettingsFit( 560, 500 );
	await send( "Emulation.clearDeviceMetricsOverride" );
	await evaluate( "document.getElementById('settings-topic-words').click();for(let n=0;n<18;n++){document.getElementById('words-add').click();document.querySelector('#words-list .word-row:last-child .wf-word').value='Example '+n;}document.getElementById('settings-topic-scrolling').click();document.getElementById('settings-topic-words').click()" );
	const seenWords = new Set();
	for ( let n = 0; n < 30; n++ ) {
		await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		for ( const word of await evaluate( "[...document.querySelectorAll('#words-list .wf-word')].filter(e=>e.getClientRects().length).map(e=>e.value)" ) ) seenWords.add( word );
		assert.equal( await evaluate( "document.querySelector('.settings-content').scrollHeight<=document.querySelector('.settings-content').clientHeight+1" ), true );
		if ( !await evaluate( "document.querySelector('.settings-pagination').getClientRects().length&&!document.querySelector('.settings-pagination button:last-child').disabled" ) ) break;
		await evaluate( "document.querySelector('.settings-pagination button:last-child').click()" );
	}
	assert.equal( seenWords.size, 18, "Every saved word must remain reachable without a scrolling list" );
	await evaluate( "document.getElementById('words-list').replaceChildren()" );
	await evaluate( "document.getElementById('settings-topic-commands').click()" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	assert.equal( await evaluate( "document.querySelector('.settings-content').getBoundingClientRect().height" ), 560, "Short topics keep the same panel height as longer topics" );
	await evaluate( "document.querySelector('#settings-page-commands .settings-help-button').focus()" );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 1 );
	await send( "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
	await send( "Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 0 );
	const helpSize = await evaluate( "(()=>{const b=document.querySelector('#settings-page-commands .settings-help-button'),r=b.getBoundingClientRect(),p=b.firstElementChild.getBoundingClientRect();return {hit:[r.width,r.height],pill:[p.width,p.height],insideLabel:!!b.closest('label')};})()" );
	assert.deepEqual( helpSize.hit, [ 24, 24 ] );
	assert.deepEqual( helpSize.pill, [ 17, 12 ] );
	assert.equal( helpSize.insideLabel, false );
	await evaluate( "document.getElementById('settings-topic-audio').click()" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	const scratchBefore = await evaluate( "document.getElementById('set-scratch-audio').checked" );
	await evaluate( "document.querySelector('[data-settings-control=set-scratch-audio] .settings-help-button span').click()" );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 1 );
	assert.equal( await evaluate( "document.getElementById('set-scratch-audio').checked" ), scratchBefore );
	await evaluate( "document.querySelector('[data-settings-control=set-scratch-audio] .settings-help-button span').click();document.getElementById('settings-topic-scrolling').click();document.getElementById('set-countdown').focus()" );
	await send( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 } );
	await send( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 } );
	assert.equal( await evaluate( "document.getElementById('settings-applied').textContent" ), "Unsaved changes" );
	await evaluate( "document.getElementById('set-countdown').value='0'" );
	console.log( "PASS: labelled controls, dark native controls, 24px help targets, miniature pills, isolated checkbox help and trusted-input draft feedback." );
	assert.equal( await evaluate( "document.getElementById('settings-modal').classList.contains('hidden')" ), false );
	const portBefore = await evaluate( "document.getElementById('set-remote-port').value" );
	await evaluate( "document.getElementById('set-remote-port').value='70000';document.getElementById('settings-topic-about').click();document.getElementById('settings-apply').click()" );
	await until( "document.activeElement.id==='set-remote-port'" );
	assert.equal( await evaluate( "document.getElementById('set-remote-port').validity.rangeOverflow" ), true );
	assert.equal( await evaluate( "document.querySelector('[data-settings-page]:not([hidden])').dataset.settingsPage" ), "remotes" );
	await evaluate( `document.getElementById('set-remote-port').value=${ JSON.stringify( portBefore ) };document.getElementById('settings-topic-commands').click()` );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	const trigger = await evaluate( "(()=>{const r=document.querySelector('#settings-page-commands .settings-help-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()" );
	await send( "Input.dispatchMouseEvent", { type: "mouseMoved", ...trigger } );
	await until( "document.querySelectorAll('.settings-explanation:popover-open').length===1" );
	const tooltipPoint = await evaluate( "(()=>{const r=document.querySelector('.settings-explanation:popover-open').getBoundingClientRect();return {x:r.x+12,y:r.y+12};})()" );
	await send( "Input.dispatchMouseEvent", { type: "mouseMoved", ...tooltipPoint } );
	await pause( 220 );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 1, "The explanation must stay open while the pointer is over it" );
	await evaluate( "document.querySelector('#settings-page-commands .settings-help-button').click()" );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 1 );
	const helpClip = await evaluate( "(()=>{const b=document.querySelector('.settings-content').getBoundingClientRect(),p=document.querySelector('.settings-explanation:popover-open').getBoundingClientRect();return {x:Math.min(b.x,p.x),y:Math.min(b.y,p.y),width:Math.max(b.right,p.right)-Math.min(b.x,p.x),height:Math.max(b.bottom,p.bottom)-Math.min(b.y,p.y),scale:1};})()" );
	const helpShot = await send( "Page.captureScreenshot", { format: "png", clip: helpClip } );
	await fs.writeFile( path.join( artifacts, "settings-commands-help.png" ), Buffer.from( helpShot.result.data, "base64" ) );
	await evaluate( "document.querySelector('#settings-page-commands .settings-help-button').click()" );
	assert.equal( await evaluate( "document.querySelectorAll('.settings-explanation:popover-open').length" ), 0 );
	console.log( "PASS: Settings keeps the same size and footer position across every topic and page without scrolling at desktop and 560×500; contextual help supports keyboard focus and Escape." );
	await evaluate( "document.getElementById('settings-topic-layout').click()" );
	for ( let n = 0; n < 10; n++ ) {
		await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		if ( await evaluate( "document.getElementById('lp-reading-line').getClientRects().length>0" ) ) break;
		await evaluate( "document.querySelector('.settings-pagination button:last-child').click()" );
	}
	await evaluate( "document.getElementById('lp-reading-line').focus()" );
	const lineBefore = await evaluate( "Number(document.getElementById('lp-reading-line').value)" );
	await send( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 } );
	await send( "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 } );
	assert.equal( await evaluate( "Number(document.getElementById('lp-reading-line').value)" ), lineBefore + 1 );
	await evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.getElementById('set-countdown').value='0';document.getElementById('settings-apply').click()" );
	await until( "document.getElementById('settings-applied').textContent==='Saved'" );
	await pause( 300 );
	const navigationSaved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( navigationSaved.settings.readingLine, lineBefore + 1, "Apply must not overwrite the shared live reading line with an old duplicate" );
	await evaluate( "document.querySelector('[data-settings-group=prompting]').click();document.getElementById('settings-topic-scrolling').click();document.getElementById('set-countdown').value='0'" );
	for ( const topic of [ "scrolling", "voice", "commands", "words", "script", "reading", "background", "aids", "layout", "display", "recording", "audio", "phone", "streamdeck", "remotes", "obs-recording" ] ) {
		await evaluate( `document.getElementById('settings-topic-${ topic }').click()` );
		await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
		await pictureOf( ".settings-content", `settings-${ topic }.png` );
		for ( let n = 1; n < 30; n++ ) {
			if ( !await evaluate( "document.querySelector('.settings-pagination').getClientRects().length&&!document.querySelector('.settings-pagination button:last-child').disabled" ) ) break;
			await evaluate( "document.querySelector('.settings-pagination button:last-child').click();document.querySelector('.settings-pagination button:last-child').blur()" );
			await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
			await pictureOf( ".settings-content", `settings-${ topic }-page-${ n + 1 }.png` );
		}
	}
	await evaluate( "document.getElementById('settings-topic-about').click()" );
	await evaluate( "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))" );
	await pictureOf( ".settings-content", "settings-about.png" );
	await evaluate( "document.getElementById('settings-close').click()" );
	assert.equal( await evaluate( "document.activeElement.id" ), "cb-settings" );
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
	await send( "Emulation.setDeviceMetricsOverride", { width: 700, height: 760, deviceScaleFactor: 1, mobile: false } );
	assert.equal( await evaluate( "['cb-menu','cb-tools','cb-settings','cb-help','cb-mirror-h','cb-mirror-v'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})" ), true );
	await send( "Emulation.setDeviceMetricsOverride", { width: 560, height: 760, deviceScaleFactor: 1, mobile: false } );
	assert.equal( await evaluate( "['cb-menu','cb-tools','cb-settings','cb-help','cb-mirror-h','cb-mirror-v'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})" ), true );
	await send( "Emulation.clearDeviceMetricsOverride" );
	for ( const [ label, file ] of [ [ "Spacing and mirror…", "layout-panel.png" ], [ "Text and colour…", "reading-panel.png" ], [ "Take display…", "recording-panel.png" ] ] ) {
		await evaluate( `document.getElementById('cb-tools').click();[...document.querySelectorAll('#tools-panel button')].find(b=>b.textContent.includes(${ JSON.stringify( label ) })).click()` );
		await pictureOf( "#layout-panel", file );
		await evaluate( "document.getElementById('lp-done').click()" );
	}
	await evaluate( "document.getElementById('cb-tools').click()" );
	await pictureOf( "#tools-panel", "tools-menu.png" );
	await evaluate( "document.getElementById('tools-panel').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.getElementById('cb-menu').click()" );
	await pictureOf( "#app-menu", "files-menu.png" );
	await evaluate( "document.getElementById('app-menu').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))" );
	console.log( "PASS: grouped Settings, all topics reachable, draft retained, file-only hamburger, Tools, keyboard focus and 700px access." );
	await evaluate( "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true}))" );
	assert.equal( await evaluate( "document.querySelectorAll('#help-list [role=tab]').length" ), 5 );
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
		guideTarget = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) );
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
	await pause( 200 );
	await ge( "document.querySelector('[data-y=\"-1\"]').click()" );
	await pause( 200 );
	await ge( "document.querySelector('#save-ideal').click()" );
	await pause( 200 );
	const savedIdealTransform = await ge( "document.querySelector('#ideal-head').getAttribute('transform')" );
	await ge( "document.querySelector('[data-x=\"-1\"]').click();document.querySelector('#smaller').click()" );
	await pause( 250 );
	assert.equal( await ge( "document.querySelector('#ideal-head').getAttribute('transform')" ), savedIdealTransform, "moving actual must leave ideal fixed" );
	assert.notEqual( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform );
	await ge( "document.querySelector('#reset-pose').click()" );
	await pause( 200 );
	assert.equal( await ge( "document.querySelector('#head').getAttribute('transform')" ), savedIdealTransform, "reset must restore ideal pose" );
	assert.equal( await ge( "document.querySelector('#ideal-head .pose-label').textContent" ), "Ideal position" );
	assert.equal( await ge( "document.querySelector('#head .pose-label').textContent" ), "Actual position" );
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
	await ge( "window.headGuide.action('preferences',{x:9,y:2,scale:0.95});document.querySelector('#adjust').click()" );
	await pause( 250 );
	const shotGuide = await gc( "Page.captureScreenshot", { format: "png" } );
	await fs.writeFile( path.join( path.dirname( screenshot ), "head-guide-integrated.png" ), Buffer.from( shotGuide.result.data, "base64" ) );
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
	await press();
	assert.equal( await ge( "document.body.classList.contains('locked')" ), false );
	assert.equal( await ge( "document.body.classList.contains('fullscreen') && !document.body.classList.contains('chromeless')" ), true );
	assert.equal( await ge( "getComputedStyle(document.querySelector('header')).visibility" ), "visible" );
	await fullscreenPress();
	assert.equal( ( await getStatus() ).headGuideFullscreen, false );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().width" ), 960 );
	assert.equal( await ge( "document.querySelector('#stage').getBoundingClientRect().height" ), 540 );
	console.log( "PASS: fullscreen button-token command, chromeless screen-fill, reveal controls without exit, and original window size restored." );
	await press();
	assert.equal( ( await getStatus() ).showHeadGuide, false );
	gws.close();
	await press();
	const reopened = ( await ( await fetch( "http://127.0.0.1:9335/json" ) ).json() ).find( t => t.url.includes( "head-guide.html" ) );
	assert.ok( reopened );
	const saved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( saved.settings.headGuideScale, 1.05 );
	assert.equal( saved.settings.headGuideColour, "gold" );
	assert.equal( saved.settings.headGuideBounds.width, 960 );
	assert.deepEqual( saved.settings.headGuideIdeal, { x: 1, y: -1, scale: 1.05 } );
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
	await evaluate( `(()=>{document.getElementById('set-obs-enabled').checked=true;document.getElementById('set-obs-host').value='127.0.0.1';document.getElementById('set-obs-port').value=${ port };document.getElementById('set-obs-password').value='sightline-test-only';document.getElementById('set-obs-markers').checked=true;document.getElementById('settings-apply').click()})()` );
	await until( "window.electron.obs('status').then(r=>r.state.connection==='connected' && r.state.recording==='stopped')" );
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
	await evaluate( "document.getElementById('cb-menu').click();document.querySelector('#app-menu [data-menu-label=\"Edit script\"]').click()" );
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
	await evaluate( "document.getElementById('cb-menu').click();document.querySelector('#app-menu [data-menu-label=\"Edit script\"]').click()" );
	await until( "document.querySelector('#editor .cm-content')?.getAttribute('aria-readonly')==='false'" );
	await send( "Input.insertText", { text: "An editable original script" } );
	assert.equal( await evaluate( "document.querySelector('#editor .cm-content').textContent.includes('An editable original script')" ), true );
	await evaluate( "document.getElementById('btn-save').click()" );
	await until( "document.getElementById('toolbar-dirty').classList.contains('hidden')" );
	await evaluate( "document.getElementById('btn-cancel').click()" );
	await until( "!document.body.classList.contains('editing')" );
	console.log( "PASS: samples open read-only, typing and direct saves cannot alter them, and personal scripts remain editable." );
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
