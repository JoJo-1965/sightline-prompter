import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9346;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-settings-redesign-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), "# A natural recording start\n\n<!-- PREPARATION. The title remains a heading for the editor. -->\n\n## Keeping my eye line naturally relaxed\n\n[smile]\nThe first actual script line starts after my spoken heading and a natural beat. {pause}\n\nSpeak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. {pause: 3s} Speak clearly and keep the camera connection relaxed while reading this longer passage. \n\n{stop}\n\n## Picking up the story after a break\n\n<!-- This preparation comment is never spoken. -->\n\nThe next actual script line remains separate from its section title.\n\nContinue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. Continue speaking naturally while the words follow the reader across the screen. " );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: true, microphoneEnabled: true, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "voice", scrollMode: "voice", startFromSectionHeading: true, scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: true, remotePort: 47731, streamDeck: false, hideFromCapture: false } } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = ""; child.stderr.on( "data", data => stderr += data ); child.stdout.resume();
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
const sockets = [], errors = [];
async function connect( fragment ) {
	let target;
	for ( let n = 0; n < 100; n++ ) {
		target = fragment === "main-process" ? { webSocketDebuggerUrl: stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1] } : ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( fragment ) );
		if ( target?.webSocketDebuggerUrl ) break;
		await pause( 100 );
	}
	assert.ok( target?.webSocketDebuggerUrl, `Missing ${ fragment }: ${ stderr.slice( -1000 ) }` );
	const socket = new WebSocket( target.webSocketDebuggerUrl ); sockets.push( socket ); await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let counter = 0; const pending = new Map();
	socket.addEventListener( "message", event => { const result = JSON.parse( event.data ); if ( result.id ) { pending.get( result.id )?.( result ); pending.delete( result.id ); } if ( result.method === "Runtime.exceptionThrown" ) errors.push( result.params.exceptionDetails.exception?.description ?? result.params.exceptionDetails.text ); } );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => { const id = ++counter; const timer = setTimeout( () => reject( new Error( `Timed out: ${ method } ${ params.expression ?? "" }` ) ), 15000 ); pending.set( id, result => { clearTimeout( timer ); result.error ? reject( new Error( result.error.message ) ) : resolve( result.result ); } ); socket.send( JSON.stringify( { id, method, params } ) ); } );
	const evaluate = async expression => { const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } ); if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ); return result.result.value; };
	await call( "Runtime.enable" ); return { call, evaluate };
}

try {
 const main=await connect('teleprompter.html'), native=await connect('main-process');await pause(500);
 await native.evaluate("globalThis.headingElectron=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');for(const channel of ['speechStart','speechAudio','speechStop'])headingElectron.ipcMain.removeAllListeners(channel);headingElectron.ipcMain.on('speechStart',(event,options)=>{globalThis.headingSpeechSession=options.session;event.sender.send('speechState',{type:'ready',session:options.session})});headingElectron.ipcMain.on('speechAudio',()=>{});headingElectron.ipcMain.on('speechStop',()=>{});headingElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('speechModel',{installed:true})");
 await main.evaluate("window.alert=text=>{globalThis.headingStartError=text};navigator.mediaDevices.getUserMedia=async()=>{globalThis.headingAudio=new AudioContext();const oscillator=headingAudio.createOscillator(),output=headingAudio.createMediaStreamDestination();oscillator.connect(output);oscillator.start();return output.stream};document.querySelector('#voice-offer button:last-child')?.click()");
 const config=JSON.parse(await fs.readFile(path.join(profile,'remote-control.json'),'utf8'));
 const command=async(action)=>{const result=await fetch(config.url+'/command',{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},body:JSON.stringify({action})});assert.equal(result.status,200);await pause(900);};
 const save=async partial=>{await main.evaluate('window.electron.saveSettings('+JSON.stringify(partial)+')');await pause(350);};
 const position=async(selector)=>main.evaluate('(async()=>{const {buildWordIndex}=await import("./word-index.js"),r=buildWordIndex(document.getElementById("md")).ranges.find(range=>range.startContainer.parentElement.closest('+JSON.stringify(selector)+'));return {top:r.getBoundingClientRect().top,line:innerHeight*.33,scroll:scrollY};})()');
 const aligned=async(selector,label)=>{const measured=await position(selector);assert.ok(Math.abs(measured.top-measured.line)<3,label+': '+JSON.stringify(measured));};
 const heard=async words=>{await native.evaluate("headingElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('speechWords',{session:headingSpeechSession,words:"+JSON.stringify(words.split(/\s+/))+",final:true})");await pause(900);};
 await main.evaluate('scrollTo(0,0);document.getElementById("cb-play").click()');await pause(700);
 assert.equal(await main.evaluate('globalThis.headingStartError??null'),null,'Voice pipeline starts: no modal error');
 await aligned('h2','Cold Voice start begins at the section heading');
 const before=await position('h2');
 await heard('Right let us get comfortable and begin');
 await heard('Keeping my eye line naturally relaxed');
 await heard('The first actual script line starts after my spoken heading and a natural beat');
 assert.equal(await main.evaluate("document.getElementById('auto-scroll-indicator').classList.contains('stopped')"),false,'A bare pause directive must not hold Voice or require another go');
 await heard('Speak clearly and keep the camera connection relaxed while reading this longer passage');
 assert.equal(await main.evaluate("document.getElementById('auto-scroll-indicator').classList.contains('counting')"),false,'A timed pause remains a beat mark in Voice');
 assert.ok((await main.evaluate('scrollY'))>before.scroll+20,'Actual voice-following advances from spoken heading into body after a warm-up');
 await heard('prompter pause');await command('next-section');
 await aligned('h2:nth-of-type(2)','Next releases the voice hold and starts at the next heading');
 await heard('Picking up the story after a break');
 await heard('The next actual script line remains separate from its section title');
 await command('again');await aligned('h2:nth-of-type(2)','Retake returns to the heading');
 await heard('prompter section one');await aligned('h2','Numbered section command returns to heading');
 await command('pause');await save({startFromSectionHeading:false});await command('next-section');
 await aligned('h2:nth-of-type(2) ~ p:not(.production-only):not(:has(.direction))','Default navigation still starts at the script body');
 await save({startFromSectionHeading:true,scrollMode:'steady'});await command('again');
 await aligned('h2:nth-of-type(2) ~ p:not(.production-only):not(:has(.direction))','Scroll mode ignores the saved Voice-only heading option');
 await save({scrollMode:'voice'});
 await main.evaluate('document.getElementById("cb-settings").click()');await pause(400);
 const settings=await connect('utility-window.html?panel=settings');
 await settings.evaluate('document.querySelector("[data-tab=mode]").click();document.activeElement?.blur()');
 assert.equal(await settings.evaluate('document.getElementById("set-start-from-heading").checked&&!document.getElementById("set-start-from-heading").closest("[hidden]")'),true,'Saved option is visible in Voice mode');
 const size=await settings.evaluate('({width:innerWidth,height:innerHeight})');
 const shot=await settings.call('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,...size,scale:2}});await fs.writeFile(path.join(artifacts,'voice-heading-start.png'),Buffer.from(shot.data,'base64'));
 await settings.evaluate('document.getElementById("set-scroll-mode").value="notes";document.getElementById("set-scroll-mode").dispatchEvent(new Event("change",{bubbles:true}))');
 assert.equal(await settings.evaluate('!!document.getElementById("set-start-from-heading").closest("[hidden]")&&document.getElementById("set-start-from-heading").disabled'),true,'Notes mode hides and disables Voice-only preference');
 await settings.evaluate('document.getElementById("settings-cancel").click()');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,artifacts,scope:'Actual Voice pipeline with synthetic media and speech-engine boundary; heading/body transition, warm-up, cold start, held Next, numbered jump, retake, default/Scroll/Notes compatibility. No physical microphone or recorder.'}));
}catch(error){console.error(error,stderr.slice(-1200));process.exitCode=1;}finally{for(const socket of sockets)socket.close();child.kill();}
