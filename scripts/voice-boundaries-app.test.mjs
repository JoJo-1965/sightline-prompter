import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9357;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-settings-redesign-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile(path.join(profile,"script.md"),"# Boundary regression\n\n## A calm opening\n\nThe first paragraph introduces the recording clearly and naturally.\n\nA second paragraph keeps the rhythm gentle and gives the speaker time to breathe.\n\nThis final sentence finishes the first passage completely.\n\n{stop}\n\n## A fresh beginning\n\n<!-- A silent production note must stay above the reading line. -->\n[smile]\nThe next passage opens with a clear view of autumn gardens.\n\nWe continue reading clearly while the script follows our natural spoken pace.\n\nThe second passage ends with these final words.\n\n{stop}\n\n## A useful conclusion\n\nOur last passage begins beside the camera and continues without another command.\n\nThe final sentence completes this test with a relaxed smile.\n\n{stop}\n");
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3.4, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: true, microphoneEnabled: true, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "voice", scrollMode: "voice", startFromSectionHeading: true, paragraphSpacing: 0.25, scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: true, remotePort: 47741, streamDeck: false, hideFromCapture: false } } ) );
const fixtureState=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8"));fixtureState.slots=Array.from({length:9},()=>({path:path.join(profile,"script.md"),scrollY:0,section:0}));fixtureState.activeSlot=0;await fs.writeFile(path.join(profile,"app-state.json"),JSON.stringify(fixtureState));
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

let mainDiagnostic;
try {
 const main=await connect('teleprompter.html'), native=await connect('main-process');
 for(let n=0;n<100&&await main.evaluate('document.querySelectorAll("#md h2").length')!==3;n++)await pause(100);
 await pause(800);
 await native.evaluate("globalThis.boundaryElectron=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');for(const channel of ['speechStart','speechAudio','speechStop'])boundaryElectron.ipcMain.removeAllListeners(channel);boundaryElectron.ipcMain.on('speechStart',(event,options)=>{globalThis.boundarySpeechSession=options.session;event.sender.send('speechState',{type:'ready',session:options.session})});boundaryElectron.ipcMain.on('speechAudio',()=>{});boundaryElectron.ipcMain.on('speechStop',()=>{});boundaryElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('speechModel',{installed:true})");
 await main.evaluate("window.alert=text=>{globalThis.boundaryError=text};navigator.mediaDevices.getUserMedia=async()=>{globalThis.boundaryAudio=new AudioContext();const oscillator=boundaryAudio.createOscillator(),output=boundaryAudio.createMediaStreamDestination();oscillator.connect(output);oscillator.start();return output.stream};document.querySelector('#voice-offer button:last-child')?.click()");
 mainDiagnostic=()=>main.evaluate('(async()=>{const {readDirectives}=await import("./directives.js"),{buildWordIndex}=await import("./word-index.js");const root=document.getElementById("md"),idx=buildWordIndex(root);return {words:idx.words.length,stops:readDirectives(root).pauses.map(p=>({text:p.el.textContent,passageEnd:p.passageEnd,last:idx.ranges.filter(r=>r.comparePoint(p.el,0)>0).length-1})),indicator:document.getElementById("auto-scroll-indicator").textContent};})()');
 const heard=async text=>{await native.evaluate("boundaryElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('speechWords',{session:boundarySpeechSession,words:"+JSON.stringify(text.split(/\s+/))+",final:true})");await pause(650)};
 const aligned=async(selector,label)=>{const r=await main.evaluate('(async()=>{const {buildWordIndex}=await import("./word-index.js");const r=buildWordIndex(document.getElementById("md")).ranges.find(r=>r.startContainer.parentElement.closest('+JSON.stringify(selector)+'));return {top:r.getBoundingClientRect().top,line:innerHeight*.33,status:document.getElementById("auto-scroll-indicator").textContent,cues:[...document.querySelectorAll("#md .direction")].map(e=>e.textContent),hud:document.getElementById("hud-delivery-cue").outerHTML};})()');assert.ok(Math.abs(r.top-r.line)<8,label+JSON.stringify(r))};
 const active=()=>main.evaluate("!document.getElementById('auto-scroll-indicator').classList.contains('stopped')&&document.getElementById('cb-play').getAttribute('aria-pressed')==='true'");
 const log=async()=>{await pause(300);const folder=path.join(profile,'take-logs'),files=await fs.readdir(folder);return JSON.parse(await fs.readFile(path.join(folder,files.find(f=>f.endsWith('.json'))),'utf8'))};
 const readFirst=async()=>{for(const line of ['A calm opening','The first paragraph introduces the recording clearly and naturally','A second paragraph keeps the rhythm gentle and gives the speaker time to breathe','This final sentence finishes the first passage completely'])await heard(line)};
 await main.evaluate('scrollTo(0,0);document.getElementById("cb-play").click()');await pause(650);assert.equal(await main.evaluate('globalThis.boundaryError??null'),null);
 await readFirst();await aligned('h2:nth-of-type(2) ~ p:not(.production-only):not(:has(.app-directive))','Soft boundary shows the next spoken opening: ');assert.equal(await active(),true,'Voice keeps following at a stop');assert.equal((await log()).events.filter(e=>e.type==='take-start').at(-1).section,1,'Preparing the next passage must not open its take');const boundaryShot=await main.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,'voice-boundary-ready.png'),Buffer.from(boundaryShot.data,'base64'));
 await heard('prompter go');await aligned('h2:nth-of-type(2) ~ p:not(.production-only):not(:has(.app-directive))','Go keeps the already prepared opening: ');
 await heard('prompter v take');await aligned('h2','Retake before next delivery returns to the completed section: ');
 await readFirst();await heard('The next passage opens with a clear view of autumn gardens');await heard('prompter again');await aligned('h2:nth-of-type(2)','Once next delivery starts, Retake belongs to the new section: ');assert.ok((await log()).events.some(e=>e.type==='take-end'&&e.section===2&&e.status==='retake'),'The take log records the correct new-section retake');
 for(const line of ['A fresh beginning','The next passage opens with a clear view of autumn gardens','We continue reading clearly while the script follows our natural spoken pace','The second passage ends with these final words'])await heard(line);
 await aligned('h2:nth-of-type(3) ~ p:not(:has(.app-directive))','The following section also advances automatically: ');assert.equal(await active(),true);
 await heard('prompter pause');assert.equal(await main.evaluate("document.getElementById('auto-scroll-indicator').textContent.startsWith('Paused')"),true,'Explicit spoken Pause still holds');
 await main.evaluate('(()=>{const p=[...document.querySelectorAll("#md p")].find(p=>p.textContent.startsWith("Our last passage"));const r=p.getBoundingClientRect();p.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,clientX:r.left+40,clientY:r.top+20}))})()');
 for(let i=0;i<100&&!await main.evaluate('!!document.querySelector(".quick-edit-box textarea")');i++)await pause(50);
 assert.equal(await main.evaluate('!!document.querySelector(".quick-edit-box textarea")'),true,'A held Voice session permits quick editing');
 await main.evaluate('var quick=document.querySelector(".quick-edit-box textarea");quick.value=quick.value.replace("camera","camera,");quick.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector(".quick-edit-box [data-save]").click()');
 for(let i=0;i<100&&await main.evaluate('!!document.querySelector(".quick-edit-box")');i++)await pause(50);await pause(400);
 assert.equal(await main.evaluate('document.getElementById("cb-play").getAttribute("aria-pressed")'),'false','Quick save leaves Voice paused');
 assert.equal(await main.evaluate('document.getElementById("take-summary").classList.contains("hidden")'),true,'Quick edit must not open a take-summary dialog');
 await heard('prompter go');assert.equal(await active(),true,'Explicit pause can resume');
 for(const line of ['Our last passage begins beside the camera and continues without another command','The final sentence completes this test with a relaxed smile'])await heard(line);
 assert.equal(await active(),true,'Final stop leaves commands listening rather than forcing a go');
 await heard('prompter again');await aligned('h2:nth-of-type(3)','Final retake returns to the final section: ');
 const shot=await main.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,'voice-soft-boundary.png'),Buffer.from(shot.data,'base64'));
 for(const [width,height] of [[1024,600],[768,450],[560,500]]){
  await native.evaluate("boundaryElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).setSize("+width+","+height+")");await pause(200);
  await heard("prompter section two");await heard("A fresh beginning");
  await main.evaluate('document.body.classList.remove("controls-hidden")');
  const clipped=await main.evaluate('(()=>{const bar=document.getElementById("control-bar"),b=bar.getBoundingClientRect();return [...bar.querySelectorAll("button,input")].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+.5||r.bottom>b.bottom+.5}).map(e=>e.id);})()');assert.deepEqual(clipped,[],"Toolbar controls fit "+width);
  assert.equal(await main.evaluate('["cb-min","cb-max","cb-full","cb-close"].every(id=>document.getElementById(id).getClientRects().length>0)'),true,'Window sizing actions remain reachable');assert.equal(await main.evaluate('document.getElementById("session-controls").getBoundingClientRect().top>=document.getElementById("control-bar").getBoundingClientRect().bottom'),true,'Session controls clear every toolbar row');assert.equal(await main.evaluate('document.getElementById("on-air").getBoundingClientRect().top>=document.getElementById("control-bar").getBoundingClientRect().bottom'),true,'On-air status does not obscure window controls');
  const cue=await main.evaluate('(()=>{const e=document.getElementById("hud-delivery-cue"),r=e.getBoundingClientRect();return {visible:!e.hidden,top:r.top,bottom:r.bottom,line:innerHeight*.33,status:document.getElementById("auto-scroll-indicator").textContent,cues:[...document.querySelectorAll("#md .direction")].map(e=>e.textContent),hud:document.getElementById("hud-delivery-cue").outerHTML}})()');assert.equal(cue.visible,true,'HUD direction is visible in delivery '+width+' '+JSON.stringify(cue));assert.ok(cue.bottom<cue.line,'HUD sits above the active reading line');
  const screen=await main.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,`toolbar-${width}.png`),Buffer.from(screen.data,'base64'));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:'Native Voice soft stops, next spoken-line positioning, go without another skip, retake ownership before/after speech, explicit Pause, final boundary; synthetic media only',artifacts}));
}catch(error){console.error(error,stderr.slice(-1200));console.error('Profile',profile);for(const f of await fs.readdir(path.join(profile,'heard-logs')).catch(()=>[]))console.error((await fs.readFile(path.join(profile,'heard-logs',f),'utf8')).split('\n').slice(-10).join('\n'));console.error(await mainDiagnostic?.());process.exitCode=1}finally{for(const socket of sockets)socket.close();child.kill()}
