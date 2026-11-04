import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9366;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-recording-review-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );

const fixtureLog = {startedAt:"2026-11-03T14:44:34.279Z",script:"Review fixture",events:[],audio:[{file:"reference.wav",start:0,end:4}],takes:[{section:1,title:"Opening",take:1,start:0,end:4,duration:4,status:"complete",rating:"keeper",markers:[],words:[{i:0,w:"Hello",t:2}],sentences:[{s:0,from:0,to:3,text:"Hello from the camera"}]}]};
const fixturePath=path.join(profile,"take-logs","Review fixture.json"); await fs.mkdir(path.dirname(fixturePath),{recursive:true}); const originalLog=JSON.stringify(fixtureLog);await fs.writeFile(fixturePath,originalLog);
const audioPath=path.join(profile,"scratch-audio","reference.wav");await fs.mkdir(path.dirname(audioPath),{recursive:true});const pcm=Buffer.alloc(44+16000*4*2);pcm.write("RIFF");pcm.writeUInt32LE(pcm.length-8,4);pcm.write("WAVEfmt ",8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(16000,24);pcm.writeUInt32LE(32000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write("data",36);pcm.writeUInt32LE(pcm.length-44,40);for(let i=0;i<16000*4;i++)pcm.writeInt16LE(Math.round(Math.sin(i*440/16000*2*Math.PI)*8000),44+i*2);await fs.writeFile(audioPath,pcm);
const transcriptPath=path.join(profile,"transcript.json");await fs.writeFile(transcriptPath,JSON.stringify(["Hello","from","a","camera"].map((word,i)=>({word,start:i*.5,end:i*.5+.4,probability:.9}))));
if(process.env.SIGHTLINE_REVIEW_PYTHON)await fs.writeFile(path.join(profile,"recording-review-runtime.json"),JSON.stringify({python:process.env.SIGHTLINE_REVIEW_PYTHON,cache:process.env.SIGHTLINE_REVIEW_CACHE}));

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

const wait = async (test, label, timeout = 10000) => {const end=Date.now()+timeout;while(Date.now()<end){if(await test())return;await pause(50);}throw Error("Timed out: "+label);};
try {
 const main=await connect("teleprompter.html");await pause(400);const native=await connect("main-process");
 await native.evaluate("globalThis.reviewTestElectron=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');globalThis.reviewSelections=[];reviewTestElectron.dialog.showOpenDialog=async()=>({canceled:false,filePaths:[reviewSelections.shift()]});reviewTestElectron.shell.openPath=async()=>'';");
 await native.evaluate("reviewTestElectron.Menu.getApplicationMenu().items.find(x=>x.label==='File').submenu.items.find(x=>x.label==='Review recorded audio…').click()");
 const review=await connect("recording-review.html");await pause(100);
 assert.equal(await main.evaluate("typeof window.recordingReview"),"undefined","Review IPC is exposed only to the review window");
 const select=async file=>native.evaluate(`reviewSelections.push(${JSON.stringify(file)})`);
 await select(fixturePath);await review.evaluate("document.getElementById('choose-log').click()");
 await wait(()=>review.evaluate("document.getElementById('session-summary').textContent.includes('Review fixture')"),"session selection");
 assert.equal(await review.evaluate("document.getElementById('reference-offset').value"),"0");
 await wait(()=>review.evaluate("document.getElementById('player').duration===4"),"local reference playback metadata");
 assert.equal(await review.evaluate("document.getElementById('transcribe').disabled"),true,"No implicit dependency/model download");
 await select(transcriptPath);await review.evaluate("document.getElementById('import').click()");
 await wait(()=>review.evaluate("document.querySelectorAll('#review-takes .take').length===1"),"transcript comparison");
 assert.match(await review.evaluate("document.getElementById('review-takes').textContent"),/the → a/);
 assert.equal(await fs.readFile(fixturePath,"utf8"),originalLog,"Original log stays byte-for-byte intact");
 const sidecarNames=await fs.readdir(path.join(profile,"recording-reviews"));assert.equal(sidecarNames.length,1);
 const sidecarPath=path.join(profile,"recording-reviews",sidecarNames[0]),savedReview=await fs.readFile(sidecarPath,"utf8");
 if(process.env.SIGHTLINE_REVIEW_PYTHON){
  await review.evaluate("document.getElementById('check').click()");await wait(()=>review.evaluate("document.getElementById('runtime-summary').textContent.includes('model ready')"),"runtime check");
  await review.evaluate("document.getElementById('transcribe').click()");await wait(()=>review.evaluate("!document.getElementById('cancel').disabled"),"analysis starts");await review.evaluate("document.getElementById('cancel').click()");await wait(()=>review.evaluate("document.getElementById('status').textContent.includes('Cancelled')&&document.getElementById('cancel').disabled"),"analysis cancelled");
  assert.equal(await fs.readFile(sidecarPath,"utf8"),savedReview,"Cancellation retains the saved review");
 }
 await fs.writeFile(fixturePath,JSON.stringify({...fixtureLog,date:"changed"}));await review.evaluate("document.getElementById('export').click()");await wait(()=>review.evaluate("document.getElementById('status').textContent.includes('source log changed')"),"stale export refused");await fs.writeFile(fixturePath,originalLog);
 const destination=path.join(profile,"exports");await fs.mkdir(destination);await select(destination);await review.evaluate("document.getElementById('export').click()");await wait(()=>review.evaluate("document.getElementById('status').textContent.includes('exported')"),"reviewed export");
 const pack=path.join(destination,"Sightline reviewed edit pack");assert.ok((await fs.readFile(path.join(pack,"words.csv"),"utf8")).includes('"a"'));assert.ok(await fs.stat(path.join(pack,"live-words.csv")));assert.equal(await fs.readFile(fixturePath,"utf8"),originalLog);
 for(const [width,height]of [[1180,850],[700,620]]){await review.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});assert.equal(await review.evaluate("document.documentElement.scrollWidth<=innerWidth"),true,"No horizontal overflow");}
 await review.call("Emulation.clearDeviceMetricsOverride");await fs.writeFile(path.join(artifacts,"recording-review.png"),Buffer.from((await review.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 if(process.env.SIGHTLINE_REVIEW_EVIDENCE){
  const evidence=process.env.SIGHTLINE_REVIEW_EVIDENCE, log=path.join(evidence,"edit-pack","take-log.json"), original=await fs.readFile(log);
  await select(log);await review.evaluate("document.getElementById('choose-log').click()");await wait(()=>review.evaluate("document.getElementById('session-summary').textContent.includes('15 takes')"),"production source selected");
  assert.equal(Number(await review.evaluate("document.getElementById('reference-offset').value")),525.6);
  console.log("Checking packaged worker against the original slot-04 scratch audio (read-only)");
  await review.evaluate("document.getElementById('transcribe').click()");await wait(()=>review.evaluate("document.getElementById('transcript-summary').textContent.includes('words')&&document.getElementById('cancel').disabled"),"production transcription",360000);
  const state=await review.evaluate("window.recordingReview.action('state')");assert.ok(state.transcripts[0].words>400);assert.equal(state.report.takes.length,15);
  console.log("Packaged transcription passed: "+state.transcripts[0].words+" words, 15 take comparisons");
  await select(path.join(evidence,"media","Academy_2026-11-03_14-55-33.mov"));await review.evaluate("document.getElementById('add-media').click()");await wait(()=>review.evaluate("!!document.querySelector('#recordings button')"),"production recording selected");
  await review.evaluate("document.querySelector('#recordings button').click()");await wait(()=>review.evaluate("document.getElementById('recordings').textContent.includes('Audio offset')&&document.getElementById('cancel').disabled"),"production correlation",180000);
  const measured=(await review.evaluate("window.recordingReview.action('state')")).report.recordings[0];assert.equal(measured.status,"measured");assert.ok(Math.abs(measured.sessionOffsetS-658.951)<.01);assert.equal(measured.pictureSync,"unverified");
  console.log("Packaged waveform alignment passed: "+measured.sessionOffsetS+" seconds; picture sync unverified");
  await select(artifacts);await review.evaluate("document.getElementById('export').click()");await wait(()=>review.evaluate("document.getElementById('status').textContent.includes('exported')"),"production reviewed export");assert.deepEqual(await fs.readFile(log),original);
  await fs.writeFile(path.join(artifacts,"recording-review-production.png"),Buffer.from((await review.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 }
 await main.evaluate("document.getElementById('cb-settings').click()");const settings=await connect("panel=settings");await pause(100);
 const preferences=async()=>{const value=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8")).settings;delete value.utilityWindowBounds;return JSON.stringify(value);};
 const beforeSettings=await preferences();
 await settings.evaluate("document.querySelector('[data-tab=\"getting-started\"]').click();document.getElementById('settings-start-tour').click()");await wait(()=>settings.evaluate("document.querySelector('.sightline-coach-card')?.dataset.step==='0'"),"tour starts");
 assert.equal(await settings.evaluate("[...document.querySelectorAll('.sightline-coach-card button')].find(b=>b.textContent==='Back').disabled"),true);
 await settings.evaluate("document.querySelector('.sightline-coach-card [data-next]').click()");await wait(()=>settings.evaluate("document.querySelector('.sightline-coach-card')?.dataset.step==='1'"),"next tour step");
 await settings.call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});await settings.call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
 assert.equal(await settings.evaluate("document.querySelectorAll('.sightline-coach-card,.sightline-coach-highlight').length"),0,"Escape removes tour and highlights");
 await native.evaluate("reviewTestElectron.Menu.getApplicationMenu().items.find(x=>x.label==='Help').submenu.items.find(x=>x.label==='Take a guided tour…').click()");await wait(()=>settings.evaluate("document.querySelector('.sightline-coach-card')?.dataset.step==='0'"),"rerun from Help");
 await settings.call("Emulation.setDeviceMetricsOverride",{width:700,height:620,deviceScaleFactor:1,mobile:false});
 for(let step=0;step<8;step++){
  await wait(()=>settings.evaluate(`document.querySelector('.sightline-coach-card')?.dataset.step==='${step}'`),"tour step "+step);
  await settings.evaluate("new Promise(resolve=>requestAnimationFrame(resolve))");
  assert.equal(await settings.evaluate("(()=>{const r=document.querySelector('.sightline-coach-card').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"),true,"Tour stays inside the compact window");
  if(step===3)await fs.writeFile(path.join(artifacts,"tour-small.png"),Buffer.from((await settings.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
  await settings.evaluate("document.querySelector('.sightline-coach-card [data-next]').click()");
 }
 await wait(()=>settings.evaluate("!document.querySelector('.sightline-coach-card')"),"tour completes");assert.equal(await preferences(),beforeSettings,"Tour changes no functional preference; the resize test can save window bounds");
 await settings.evaluate("document.getElementById('settings-start-tour').click()");await wait(()=>settings.evaluate("!!document.querySelector('.sightline-coach-card')"),"tour restarts");await settings.evaluate("document.querySelector('.sightline-coach-card [data-skip]').click()");assert.equal(await settings.evaluate("!!document.querySelector('.sightline-coach-card')"),false);
 await main.evaluate("localStorage.removeItem('sightline-tour-offered-v1')");await native.evaluate("reviewTestElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('offerGuidedTour')");await wait(()=>main.evaluate("!!document.querySelector('.sightline-tour-offer')"),"first-use offer");await main.evaluate("[...document.querySelectorAll('.sightline-tour-offer button')].find(b=>b.textContent==='Not now').click()");await native.evaluate("reviewTestElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).webContents.send('offerGuidedTour')");await pause(100);assert.equal(await main.evaluate("!!document.querySelector('.sightline-tour-offer')"),false,"Declining the first-use offer persists");
 assert.deepEqual(errors,[]);console.log("PASS: native review selection/import/export, original preservation, cancellation, stale refusal, compact layout, conditional tour traversal, Esc/Skip/rerun and first-use dismissal. "+artifacts);
}finally{for(const socket of sockets)socket.close();await new Promise(resolve=>{const stop=spawn("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});stop.on("exit",resolve);stop.on("error",resolve);});}
