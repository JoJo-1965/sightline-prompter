// Real editor/review UI in an isolated app. No microphone, camera or OBS.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire( import.meta.url );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-script-review-" ) );
const artifacts = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-review-images-" ) );
const file = path.join( profile, "review.md" );
const long = "When we stand in front of a camera and try to explain a complicated idea to people who have never heard it before we can give ourselves a little more room by breaking the thought into smaller pieces.";
const raw = `---\ntitle: Not spoken metadata\n---\n# Review example\n\n## A warm welcome {target: 0:30, wpm: 120}\n\n[smile] [Say: "Hello there"] Welcome to this rehearsal.\n\n[Take a breath]\n\n## A thought to untangle\n\n${ long }\n\nSeven sleek swans swim swiftly.\n\n\`\`\`text\nThese code words must never count as speech.\n\`\`\`\n`;
await fs.writeFile( file, raw );
const day = new Date().toLocaleDateString( "en-CA" );
const id = `review ${ day }`;
const take = { section: 1, title: "A warm welcome", take: 1, status: "complete", rating: "keeper", duration: 10, start: 0, end: 10, target: 30, markers: [], rereads: [ { from: 3, after: 4, t: 3 } ], sentences: [ { s: 0, section: 0, from: 3, to: 8, text: "Hello there Welcome to this rehearsal." } ], words: [ { i: 3, w: "Hello", t: 0 }, { i: 4, w: "there", t: 0.5 }, { i: 7, w: "this", t: 1.5 }, { i: 8, w: "rehearsal", t: 2 } ], speechReview: { engine: "local", chunks: 2, recognisedWords: 8, fillers: { um: 2 }, repeatedPairs: 1 } };
await fs.mkdir( path.join( profile, "take-logs" ) );
await fs.writeFile( path.join( profile, "take-logs", id + ".json" ), JSON.stringify( { script: "review", startedAt: new Date().toISOString(), takes: [ take ], events: [] } ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 850, opacity: 1, recentFiles: [ file ], settings: { voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", checkUpdates: false, hideFromCapture: false, obsEnabled: false } } ) );
const port = 9337;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true, () => false ), false );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( require( "electron" ), [ ".", "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }` ], { env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", ( data ) => {
	stderr += data;
} );
const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let socket;
let native;
try {
	let target;
	for ( let attempt = 0; attempt < 90 && !target; attempt++ ) {
		target = await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).then( pages => pages.find( page => page.url.includes( "teleprompter.html" ) ) ).catch( () => null );
		if ( !target ) await wait( 100 );
	}
	assert.ok( target, stderr );
	socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0;
	const pending = new Map();
	const errors = [];
	socket.addEventListener( "message", ( event ) => {
		const message = JSON.parse( event.data );
		if ( message.id ) pending.get( message.id )?.( message );
		if ( message.method === "Runtime.exceptionThrown" ) errors.push( message.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const number = ++sequence;
		const timeout = setTimeout( () => reject( new Error( "Timed out: " + method ) ), 8000 );
		pending.set( number, ( message ) => {
			clearTimeout( timeout );
			pending.delete( number );
			if ( message.error ) reject( new Error( message.error.message ) );
			else resolve( message.result );
		} );
		socket.send( JSON.stringify( { id: number, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } );
		if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text );
		return result.result.value;
	};
	const until = async ( expression ) => {
		for ( let attempt = 0; attempt < 80; attempt++ ) {
			if ( await evaluate( expression ) ) return;
			await wait( 100 );
		}
		throw new Error( "Not ready: " + expression );
	};
	await call( "Runtime.enable" );
	await until( "document.getElementById('md')?.textContent.includes('A warm welcome') && typeof window.EditorModule?.selectSection==='function'" );
	await evaluate( "document.querySelector('#voice-offer button:last-child')?.click();document.getElementById('cb-edit').click()" );
	await until( "!document.getElementById('editor-container').classList.contains('hidden') && !!document.querySelector('.cm-content')" );
	await evaluate( "document.getElementById('btn-script-health').click()" );
	await until( "document.getElementById('review-overview').textContent.includes('spoken-body words')" );
	const section = await evaluate( `(async()=>{const {healthSections}=await import('./health-script-dom.js');const html=await window.electron.scriptReviewHtml(${ JSON.stringify( raw ) });return healthSections(html);})()` );
	assert.equal( section.sections[0].blocks.join( " " ).trim(), "Hello there Welcome to this rehearsal." );
	assert.equal( section.sections[0].wpm, 120 );
	assert.equal( section.sections[0].target, 30 );
	assert.equal( section.sections.some( row => row.blocks.join( " " ).includes( "code words" ) ), false );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /6 words.*0:03/ );
	await evaluate( "document.getElementById('review-item').value='1';document.getElementById('review-item').dispatchEvent(new Event('change'))" );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /shorter sentence/ );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /similar word starts/ );
	const clip = await evaluate( "(()=>{const r=document.querySelector('.review-content').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()" );
	assert.ok( await evaluate( "parseFloat(getComputedStyle(document.getElementById('review-pace')).fontSize)<=16" ), "Review controls do not inherit the prompter's large font" );
	const snap = await call( "Page.captureScreenshot", { format: "png", clip } );
	await fs.writeFile( path.join( artifacts, "script-health.png" ), Buffer.from( snap.data, "base64" ) );
	await evaluate( "document.querySelector('.review-finding button').click()" );
	assert.match( await evaluate( "document.querySelector('.cm-activeLine').textContent" ), /## A thought to untangle/ );
	await call( "Input.dispatchKeyEvent", { type: "keyDown", key: "End", code: "End", modifiers: 2 } );
	await call( "Input.dispatchKeyEvent", { type: "keyUp", key: "End", code: "End", modifiers: 2 } );
	await call( "Input.insertText", { text: "\n\nThese five words are unsaved." } );
	await evaluate( "document.getElementById('btn-script-health').click()" );
	await until( "document.getElementById('review-overview').textContent.includes('spoken-body words')" );
	assert.match( await evaluate( "document.getElementById('review-source').textContent" ), /unsaved/ );
	assert.match( await evaluate( "document.getElementById('review-overview').textContent" ), /^54 spoken-body words/ );
	assert.equal( await fs.readFile( file, "utf8" ), raw, "Review never saves the editor draft" );
	await evaluate( "document.getElementById('review-coach-tab').click()" );
	await until( "document.getElementById('review-overview').textContent.includes('Finished takes')" );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /4 of 6 script words matched/ );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /2 filler candidates/ );
	assert.match( await evaluate( "document.getElementById('review-body').textContent" ), /1 logged reread/ );
	assert.equal( await evaluate( "document.getElementById('review-panel').getAttribute('aria-labelledby')" ), "review-coach-tab" );
	await evaluate( "document.getElementById('review-coach-tab').focus()" );
	const shot = await call( "Page.captureScreenshot", { format: "png", clip } );
	await fs.writeFile( path.join( artifacts, "rehearsal-coach.png" ), Buffer.from( shot.data, "base64" ) );
	const saved = await evaluate( `window.electron.recordings('read',{id:${ JSON.stringify( id ) }})` );
	assert.equal( saved.coach.takes[0].matched, 4 );
	// Exercise command filtering and hold/mute gates with a generated silent
	// stream and a stub recogniser in this isolated app, never a real mic.
	native = new WebSocket( stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )[1] );
	await new Promise( resolve => native.addEventListener( "open", resolve ) );
	let nativeSequence = 0;
	const nativeEvaluate = expression => new Promise( ( resolve, reject ) => {
		const number = ++nativeSequence;
		const timeout = setTimeout( () => reject( new Error( "Native review fixture timed out" ) ), 8000 );
		const receive = ( event ) => {
			const result = JSON.parse( event.data );
			if ( result.id !== number ) return;
			clearTimeout( timeout );
			native.removeEventListener( "message", receive );
			if ( result.error || result.result.exceptionDetails ) reject( new Error( JSON.stringify( result ) ) );
			else resolve( result.result.result.value );
		};
		native.addEventListener( "message", receive );
		native.send( JSON.stringify( { id: number, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } } ) );
	} );
	await nativeEvaluate( String.raw`(()=>{const {ipcMain}=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');globalThis.coachSpeech={};for(const channel of ['speechStart','speechAudio','speechStop'])ipcMain.removeAllListeners(channel);ipcMain.on('speechStart',(event,options)=>{coachSpeech.sender=event.sender;coachSpeech.session=options.session;event.sender.send('speechState',{type:'ready',session:options.session});});ipcMain.on('speechAudio',()=>{coachSpeech.sender.send('speechState',{type:'health',session:coachSpeech.session});});return true;})()` );
	await evaluate( String.raw`(async()=>{globalThis.virtualCoachAudio=[];globalThis.coachChunks=[];globalThis.coachCommands=[];Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const context=new AudioContext({sampleRate:16000}),destination=context.createMediaStreamDestination(),osc=context.createOscillator();osc.connect(destination);osc.start();await context.resume();virtualCoachAudio.push(context);return destination.stream;}});globalThis.coachModule=await import('./auto-scroll.js');globalThis.coachListener=await coachModule.startAutoScroll({engine:'local',scriptEl:document.getElementById('md'),onCommand:id=>coachCommands.push(id),onReview:chunk=>coachChunks.push(chunk)});})()` );
	const words = async ( list ) => {
		await nativeEvaluate( `coachSpeech.sender.send('speechWords',{words:${ JSON.stringify( list ) },final:true,session:coachSpeech.session});true` );
		await wait( 100 );
	};
	await words( [ "um", "hello" ] );
	assert.deepEqual( await evaluate( "coachChunks.map(chunk=>chunk.words)" ), [ [ "um", "hello" ] ] );
	await words( [ "prompter", "pause" ] );
	assert.deepEqual( await evaluate( "coachCommands" ), [ "pause" ] );
	assert.equal( await evaluate( "coachChunks.length" ), 1, "Commands are not counted as rehearsal words" );
	await evaluate( "coachListener.setHold(true)" );
	await words( [ "uh" ] );
	await evaluate( "coachListener.setHold(false);coachListener.setMuted(true)" );
	await words( [ "um" ] );
	assert.equal( await evaluate( "coachChunks.length" ), 1, "Held and off-script/muted periods are excluded" );
	await evaluate( "(async()=>{await coachModule.stopAutoScroll();globalThis.coachListener=await coachModule.startAutoScroll({engine:'local',scriptEl:document.getElementById('md'),followScript:false,onReview:chunk=>coachChunks.push(chunk)});})()" );
	await words( [ "um", "hello" ] );
	assert.equal( await evaluate( "coachChunks.length" ), 1, "Commands-only listening never collects coaching counts" );
	await evaluate( "(async()=>{await coachModule.stopAutoScroll();for(const context of virtualCoachAudio)await context.close();})()" );
	assert.deepEqual( errors, [] );
	console.log( JSON.stringify( { pass: true, artifacts, checks: "Real editor, exact speech exclusions, estimates, findings, section jump, unsaved text, saved take coaching and accessible tabs; no media captured" } ) );
} catch ( error ) {
	console.error( error, stderr.slice( -1500 ) );
	process.exitCode = 1;
} finally {
	socket?.close();
	native?.close();
	child.kill();
}
