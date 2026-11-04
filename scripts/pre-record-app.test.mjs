import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9347;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-settings-redesign-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
let obsMock = null, obsImage = "", obsRequests = [];
if ( process.env.SIGHTLINE_TEST_OBS === "1" ) {
 const { WebSocketServer } = require("ws"); obsMock = new WebSocketServer({host:"127.0.0.1",port:0}); await new Promise(r=>obsMock.on("listening",r));
 obsMock.on("connection",socket=>{socket.send(JSON.stringify({op:0,d:{rpcVersion:1}}));socket.on("message",raw=>{const {op,d}=JSON.parse(raw);if(op===1)return socket.send(JSON.stringify({op:2,d:{negotiatedRpcVersion:1}}));obsRequests.push(d);let responseData={};if(d.requestType==="GetVersion")responseData={availableRequests:["GetSourceScreenshot","GetSceneList"]};if(d.requestType==="GetRecordStatus")responseData={outputActive:false,outputPaused:false};if(d.requestType==="GetSceneList")responseData={scenes:[{sceneName:"Camera clean"},{sceneName:"Slides"}],currentProgramSceneName:"Camera clean"};if(d.requestType==="GetSourceScreenshot")responseData={imageData:obsImage};socket.send(JSON.stringify({op:7,d:{requestId:d.requestId,requestType:d.requestType,requestStatus:{result:true},responseData}}));});});
 const seed=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8")); Object.assign(seed.settings,{obsEnabled:true,obsHost:"127.0.0.1",obsPort:obsMock.address().port,obsControls:false,obsPassword:""});await fs.writeFile(path.join(profile,"app-state.json"),JSON.stringify(seed));
}
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--prepare-recording", "--use-fake-ui-for-media-stream", "--use-file-for-fake-audio-capture=D:/Sightline/Dev/Testing/Pre-Record-UAT/microphone.wav", "--use-fake-device-for-media-stream", "--use-file-for-fake-video-capture=D:/Sightline/Dev/Testing/Pre-Record-UAT/camera.y4m" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
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
 const page = await connect("sightline://prepare/pre-record.html");
 const main = await connect("teleprompter.html");
 await pause(500);
 const waitFor = async (expression,label,limit=15000) => {const start=Date.now();while(Date.now()-start<limit){if(await page.evaluate(expression))return;await pause(150);}throw new Error(label+": "+await page.evaluate('document.getElementById("direction-detail").textContent+" / "+document.getElementById("message").textContent'));};
 const click = async id => {assert.equal(await page.evaluate('!!document.getElementById('+JSON.stringify(id)+')&&!document.getElementById('+JSON.stringify(id)+').disabled'),true,"Enabled: "+id);await page.evaluate('document.getElementById('+JSON.stringify(id)+').click()');};
 assert.equal(await page.evaluate('isSecureContext&&!!navigator.mediaDevices'),true,"Secure local origin supports camera");
 assert.equal(await page.evaluate('document.getElementById("camera-video").srcObject'),null,"No automatic camera permission or capture");
 await waitFor('document.getElementById("camera-device").options.length>1',"Camera inputs listed before capture");
 assert.equal(await page.evaluate('document.getElementById("camera-device").disabled'),false,"An alternative camera can be selected before the default opens");
 await fs.writeFile(path.join(artifacts,"prepare-to-record.png"),Buffer.from((await page.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await page.evaluate(`window.actualCameraCapture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Camera is busy", "NotReadableError"); }`);
 await click("connect-camera");
 await waitFor('document.getElementById("camera-status").textContent.includes("NotReadableError")',"Busy-camera error is displayed beside the capture controls");
 assert.equal(await page.evaluate('document.getElementById("camera-status").hidden'),false);
 assert.equal(await page.evaluate('document.getElementById("camera-device").disabled'),false,"A failed camera does not trap the user on the default input");
 assert.equal(await page.evaluate('document.getElementById("connect-camera").disabled'),false,"Capture can be retried after failure");
 await fs.writeFile(path.join(artifacts,"prepare-camera-recovery.png"),Buffer.from((await page.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await page.evaluate(`navigator.mediaDevices.getUserMedia = window.actualCameraCapture; const picker = document.getElementById("camera-device"); picker.selectedIndex = 1; picker.dispatchEvent(new Event("change"));`);
 assert.equal(await page.evaluate('document.getElementById("camera-video").srcObject'),null,"Changing the input while off does not start capture");
 assert.equal(await page.evaluate('document.getElementById("camera-status").hidden'),true,"Selecting another input clears the previous error");
 await click("connect-camera");
 await waitFor('!!document.getElementById("camera-video").srcObject',"Camera starts");
 assert.equal(await page.evaluate('!!document.getElementById("camera-svg").getClientRects().length'),true,"Framing cutout is visible above the real video");
 await click("tracking");
 await waitFor('!document.getElementById("lock-current").disabled',"Real model finds one face",30000);
 await click("lock-current");
 await waitFor('!document.getElementById("accept-frame").disabled',"Locked model position becomes green");
 assert.equal(await page.evaluate('document.getElementById("framing-chip").textContent.includes("aligned")'),true);
 await page.evaluate('window.preRecord.input("guide","show")');
 const overlay=await connect("head-guide.html");
 for(let n=0;n<50;n++){if(await overlay.evaluate('!!document.getElementById("framing-lock")&&!document.getElementById("framing-lock").disabled'))break;await pause(100);}
 assert.equal(await overlay.evaluate('document.getElementById("framing-lock").disabled'),false,"The existing head guide receives real detector feedback");
 await overlay.evaluate('window.headGuide.action("preferences",{x:12})');
 await waitFor('Number(document.getElementById("guide-x").value)===12',"Head guide manual adjustment reaches preparation");
 await overlay.evaluate('document.getElementById("framing-lock").click()');
 await waitFor('!document.getElementById("accept-frame").disabled',"Lock current on the head guide updates the same preparation target");
 assert.match(await overlay.evaluate('document.getElementById("framing-pill").textContent'),/Within|✓/);
 if(obsMock){
  obsImage=await page.evaluate('(()=>{const c=document.createElement("canvas");c.width=640;c.height=360;c.getContext("2d").drawImage(document.getElementById("camera-video"),0,0,640,360);return c.toDataURL("image/jpeg",.8)})()');
  await page.evaluate('window.preRecord.input("obs-scenes")');
  await page.evaluate('window.preRecord.input("source",{source:"obs",scene:"Slides"})');
  await waitFor('!document.getElementById("obs-scene-field").hidden&&document.getElementById("obs-scene").value==="Slides"',"Actual OBS scene selection is shared");
  assert.equal(await page.evaluate('document.getElementById("camera-video").srcObject'),null,"Selecting a scene does not automatically enable capture");
  await click("connect-camera");await waitFor('!!document.getElementById("camera-video").srcObject',"OBS scene frames produce a calibration preview");
  await waitFor('!document.getElementById("lock-current").disabled',"The real detector can use OBS scene frames",30000);
  assert.ok(obsRequests.some(r=>r.requestType==="GetSourceScreenshot"&&r.requestData.sourceName==="Slides"));
  assert.equal(obsRequests.some(r=>/^(SetCurrent|StartRecord|StopRecord|StartVirtualCam)/.test(r.requestType)),false,"Scene calibration never switches programme, starts recording or starts a virtual camera");
  await page.evaluate('window.preRecord.input("source",{source:"camera",scene:"Slides"})');
  await waitFor('document.getElementById("camera-video").srcObject===null',"Changing source stops old capture");
  await click("connect-camera");await waitFor('!document.getElementById("lock-current").disabled',"Camera detection resumes after explicit enable",30000);await click("lock-current");
 }
 await fs.writeFile(path.join(artifacts,"framing-detection.png"),Buffer.from((await page.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await fs.writeFile(path.join(artifacts,"head-guide-feedback.png"),Buffer.from((await overlay.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await click("accept-frame");await click("measure-audio");
 await pause(400);
 assert.equal(await main.evaluate('!document.getElementById("level-meter").classList.contains("hidden")'),true,"Room/voice preparation automatically shows the prompter meter even when its manual meter is off");
 assert.match(await main.evaluate('document.querySelector("#level-meter .lm-text").textContent'),/Room noise check|Voice check/);
 await waitFor('!!document.getElementById("accept-audio-warning")||!document.getElementById("accept-audio").disabled',"Actual microphone check",10000);
 if(await page.evaluate('!!document.getElementById("accept-audio-warning")'))await click("accept-audio-warning");
 assert.equal(await main.evaluate('document.getElementById("level-meter").classList.contains("hidden")'),true,"The automatic meter returns to the prior hidden state after measurement");
 await click("accept-audio");await click("record-test");await pause(1600);await click("stop-test");
 await waitFor('!!document.getElementById("play-test")',"Local clip saved");
 assert.equal(await main.evaluate('document.getElementById("settings-test-recording-result").dataset.result'),"review","Saving a clip alone does not pass a test");
 assert.equal(await main.evaluate('document.getElementById("preparation-test-result").dataset.result'),"review","Prompter shows review required too");
 await click("fail-test");
 assert.equal(await main.evaluate('document.getElementById("settings-test-recording-result").dataset.result'),"failed","A rejected test remains visibly failed in Settings");
 assert.equal(await main.evaluate('document.getElementById("preparation-test-result").dataset.result'),"failed","A rejected test remains visibly failed on the prompter");
 await click("record-test");await pause(1600);await click("stop-test");
 await waitFor('!!document.getElementById("play-test")',"Replacement clip saved");
 await click("play-test");
 await waitFor('!!document.getElementById("test-picture")',"Actual clip playback completed",12000);
 await click("test-picture");await click("test-sound");await click("accept-test");await click("save-reference");
 assert.equal(await main.evaluate('document.getElementById("settings-test-recording-result").dataset.result'),"passed","Settings retains reviewed picture-and-sound pass");
 assert.equal(await main.evaluate('document.getElementById("preparation-test-result").dataset.result'),"passed","Prompter retains the same reviewed pass");
 await waitFor('document.getElementById("panel-title").textContent==="Ready to record"',"Reference saved");
 const stored=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8")).settings;
 assert.ok(stored.preRecordReference.testReviewed);
 assert.ok((await fs.stat(stored.preRecordReference.testFile)).size>5000,"Real test video on disk");
 const original=JSON.stringify(stored.preRecordReference);
 assert.ok(stored.headGuideReference?.pose,"Compatible manual reference saved");
 await click("ready-break");
 assert.equal(await page.evaluate('document.getElementById("guide-x").disabled'),true,"Saved target cannot drift");
 await click("tracking");
 assert.equal(await page.evaluate('document.getElementById("accept-frame").disabled'),true);
 await click("manual-confirm");await click("accept-frame");await click("measure-audio");
 await waitFor('!!document.getElementById("accept-audio-warning")||!document.getElementById("accept-audio").disabled',"Audio recheck");
 if(await page.evaluate('!!document.getElementById("accept-audio-warning")'))await click("accept-audio-warning");
 await click("accept-audio");await click("save-reference");
 assert.equal(JSON.stringify(JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8")).settings.preRecordReference),original,"Returning never replaces saved reference");
 await click("new-setup");
 assert.equal(JSON.stringify(JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8")).settings.preRecordReference),original,"New draft retains saved reference");
 const native=await connect("main-process");
 for(const [w,h] of [[1440,940],[1024,720],[600,600]]){
  await native.evaluate("process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('sightline:')).setContentSize("+w+","+h+")");
  await pause(250);
  assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,"No horizontal overflow "+w);
 }
 assert.deepEqual(errors,[]);
 if(obsMock){await main.evaluate('window.electron.saveSettings({obsEnabled:false})');await waitFor('document.getElementById("calibration-source-field").hidden',"Disabled OBS hides its calibration choices");assert.equal(await overlay.evaluate('document.getElementById("framing-inputs").hidden'),true,"The head guide uses the same OBS gate");}
 console.log("PASS: real local model inference, microphone measurement, recorded WebM playback, fixed reference and manual fallback. Synthetic devices only. Artifacts: "+artifacts);
} finally {
 for(const socket of sockets)socket.close();
 if(obsMock){for(const client of obsMock.clients)client.terminate();await new Promise(r=>obsMock.close(r));}
 await new Promise(resolve=>{const stop=spawn("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});stop.on("exit",resolve);stop.on("error",resolve);});
}
