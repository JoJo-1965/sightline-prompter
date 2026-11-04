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
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--use-fake-ui-for-media-stream", "--use-file-for-fake-audio-capture=D:/Sightline/Dev/Testing/Pre-Record-UAT/microphone.wav", "--use-fake-device-for-media-stream", "--use-file-for-fake-video-capture=D:/Sightline/Dev/Testing/Pre-Record-UAT/camera.y4m" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = ""; child.stderr.on( "data", data => stderr += data ); child.stdout.resume();
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
const sockets = [], errors = [];
async function connect( fragment ) {
	let target;
	for ( let n = 0; n < 100; n++ ) {
		target = fragment === "main-process" ? { webSocketDebuggerUrl: stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1] } : ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( fragment ) && ( fragment !== "head-guide.html" || !t.url.includes( "?" ) ) );
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
async function waitIn(client,expression,label,limit=10000){
 const started=Date.now();while(Date.now()-started<limit){if(await client.evaluate(expression))return;await pause(100);}throw new Error(label);
}
try {
 const main = await connect("teleprompter.html");
 const native=await connect("main-process");
 await pause(500);
 await main.evaluate('window.electron.headGuide("show")');await connect("head-guide.html");
 const toolbar=await connect("head-guide.html?toolbar=1");
 await waitIn(toolbar,'!!document.getElementById("toolbar-reveal")&&document.readyState==="complete"',"Bottom guide toolbar loads");
 const electronNative="process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron')";
 const toolbarNative=electronNative+".BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('toolbar=1'))";
 await native.evaluate("globalThis.originalGuideCursor="+electronNative+".screen.getCursorScreenPoint;globalThis.testGuideCursor={x:-10000,y:-10000};"+electronNative+".screen.getCursorScreenPoint=()=>globalThis.testGuideCursor");
 await waitIn(toolbar,'document.body.classList.contains("toolbar-collapsed")',"Moving far away quickly collapses the toolbar");
 assert.equal(await toolbar.evaluate('!!document.getElementById("toolbar-reveal").getClientRects().length'),true,"A recoverable Head guide tab remains visible");
 const revealToolbar=async()=>{
  const bounds=await native.evaluate(toolbarNative+".getBounds()");
  await native.evaluate("globalThis.testGuideCursor="+JSON.stringify({x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}));
  await waitIn(toolbar,'!document.body.classList.contains("toolbar-collapsed")',"Hovering the tab restores the controls");
 };
 await revealToolbar();
 assert.equal(await native.evaluate(toolbarNative+".isAlwaysOnTop()"),true,"Only the small toolbar surface is kept above the prompter");
 await toolbar.evaluate('document.getElementById("chrome").click()');
 await waitIn(toolbar,'document.getElementById("chrome").textContent==="Auto-hide"',"Pin controls retains the bar");
 await native.evaluate('globalThis.testGuideCursor={x:-10000,y:-10000}');await pause(220);
 assert.equal(await toolbar.evaluate('document.body.classList.contains("toolbar-collapsed")'),false,"Pinned controls remain available away from the pointer");
 for(const [width,height] of [[920,46],[560,82],[320,118]]){
  await toolbar.call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
  const overflow=await toolbar.evaluate('(()=>({horizontal:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll("header button:not([hidden]),header input")].filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1}).map(el=>el.id)}))()');
  assert.deepEqual(overflow,{horizontal:false,buttons:[]},"Guide toolbar fits without clipped controls at "+width);
 }
 await toolbar.call("Emulation.clearDeviceMetricsOverride");
 await fs.writeFile(path.join(artifacts,"guide-toolbar-expanded.png"),Buffer.from((await toolbar.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await toolbar.evaluate('document.getElementById("lock").click()');
 await waitIn(toolbar,'document.getElementById("lock").textContent==="Unlock clicks"',"Click-through lock leaves toolbar controls reachable");
 assert.equal(await toolbar.evaluate('getComputedStyle(document.querySelector("header")).visibility'),"visible");
 await toolbar.evaluate('document.getElementById("lock").click()');
 await waitIn(toolbar,'document.getElementById("lock").textContent==="Lock clicks"',"Toolbar restores mouse control without a hidden-window hotkey");
 await toolbar.evaluate('document.getElementById("fullscreen").click()');
 await waitIn(toolbar,'document.getElementById("fullscreen").textContent==="Restore"',"Fullscreen keeps the bottom toolbar available");
 await toolbar.evaluate('document.getElementById("fullscreen").click()');
 await waitIn(toolbar,'document.getElementById("fullscreen").textContent==="Fullscreen"',"Restore keeps the same controls");
 await toolbar.evaluate('document.getElementById("chrome").click()');
 await waitIn(toolbar,'document.body.classList.contains("toolbar-collapsed")',"Unpinned toolbar returns to its reveal tab");
 await fs.writeFile(path.join(artifacts,"guide-toolbar-collapsed.png"),Buffer.from((await toolbar.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await revealToolbar();await toolbar.evaluate('document.getElementById("adjust").click()');
 await native.evaluate(electronNative+".screen.getCursorScreenPoint=globalThis.originalGuideCursor");
 const guideControls=await connect("head-guide.html?controls=1");
 for(let n=0;n<60&&!await guideControls.evaluate('!!document.getElementById("framing-source")');n++)await pause(100);
 const preparationVisible=()=>native.evaluate("process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('sightline:'))?.isVisible()??false");
 if(obsMock)await waitIn(guideControls,'!document.getElementById("framing-inputs").hidden',"Connected OBS choices are available in Guide adjustments");
 const initialSource=obsMock?"temporary":"camera";
 await guideControls.evaluate('document.getElementById("framing-source").value='+JSON.stringify(initialSource)+';document.getElementById("framing-source").dispatchEvent(new Event("change"));document.getElementById("framing-camera").value="default";document.getElementById("framing-camera").dispatchEvent(new Event("change"))');
 const page = await connect("sightline://prepare/pre-record.html");await pause(500);
 const waitFor = async (expression,label,limit=15000) => {const start=Date.now();while(Date.now()-start<limit){if(await page.evaluate(expression))return;await pause(150);}throw new Error(label+": "+await page.evaluate('document.getElementById("direction-detail").textContent+" / "+document.getElementById("message").textContent'));};
 const click = async id => {assert.equal(await page.evaluate('!!document.getElementById('+JSON.stringify(id)+')&&!document.getElementById('+JSON.stringify(id)+').disabled'),true,"Enabled: "+id);await page.evaluate('document.getElementById('+JSON.stringify(id)+').click()');};
 await waitFor('document.getElementById("camera-device").options.length>1',"Guide-only calibration lists cameras in its hidden host");
 await waitFor('document.getElementById("calibration-source").value==='+JSON.stringify(initialSource),"Cold-start selections are retained in order without opening another input");
 assert.equal(await preparationVisible(),false,"Cold calibration in Guide adjustments does not open the workflow");
 assert.equal(await page.evaluate('document.getElementById("camera-video").srcObject'),null,"Selecting calibration alone does not capture");
 await guideControls.evaluate('document.getElementById("framing-source").value="camera";document.getElementById("framing-source").dispatchEvent(new Event("change"))');
 await waitFor('document.getElementById("calibration-source").value==="camera"',"Returning to a generic camera stays in the same hidden service");
 await guideControls.evaluate('document.getElementById("framing-picture").click()');
 await waitFor('!!document.getElementById("camera-video").srcObject',"Guide-only Enable picture opens the selected feed");
 assert.equal(await preparationVisible(),false,"Explicit guide capture stays in Guide adjustments");
 await guideControls.evaluate('document.getElementById("framing-picture").click()');
 await waitFor('document.getElementById("camera-video").srcObject===null',"Guide-only picture can be stopped");
 await guideControls.evaluate('document.getElementById("framing-open").click()');
 for(let n=0;n<40&&!await preparationVisible();n++)await pause(100);
 assert.equal(await preparationVisible(),true,"Only the explicit Prepare to record action opens the workflow");
 await guideControls.evaluate('window.headGuide.action("adjust-hide")');
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
 await waitFor('document.getElementById("camera-status").hidden',"Selecting another input finishes clearing the previous error");
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
 const lockedTarget=(await page.evaluate('window.preRecord.load()')).shared.target;
 const widthFactor=1.25*(.91+.92)/2;
 await overlay.evaluate('window.headGuide.action("preferences",'+JSON.stringify({scale:lockedTarget.size/100/widthFactor,width:1.25,left:.91,right:.92})+')');
 await waitFor('Math.abs(Number(document.getElementById("guide-size").value)-'+Math.round(lockedTarget.size/widthFactor)+')<=1',"Manual proportions reach preparation");
 await waitFor('!document.getElementById("accept-frame").disabled',"A visible target of unchanged width stays aligned after proportion changes");
 await overlay.evaluate('document.getElementById("framing-lock").click()');
 await waitFor('!document.getElementById("accept-frame").disabled',"Lock current retains custom proportions without applying width twice");
 await overlay.evaluate('window.headGuide.action("preferences",{x:12})');
 await waitFor('Number(document.getElementById("guide-x").value)===12',"Head guide manual adjustment reaches preparation");
 assert.equal(await overlay.evaluate('document.getElementById("framing-pill").textContent.trim()[0]'),await page.evaluate('document.getElementById("direction-arrow").textContent'),"Mirrored horizontal directions agree in both views");
 await overlay.evaluate('document.getElementById("framing-lock").click()');
 await waitFor('!document.getElementById("accept-frame").disabled',"Lock current on the head guide updates the same preparation target");
 assert.match(await overlay.evaluate('document.getElementById("framing-pill").textContent'),/Within|✓/);
 const distanceTarget=(await page.evaluate('window.preRecord.load()')).shared.target;
 await page.evaluate(`(async()=>{
  const video=document.getElementById("camera-video"),image=await createImageBitmap(video);
  window.distanceOriginalStream=video.srcObject;
  window.distanceScale=.72;
  const canvas=document.createElement("canvas");canvas.width=640;canvas.height=360;
  const context=canvas.getContext("2d"),x=${(distanceTarget.x/100+.5)*640},y=${(distanceTarget.y/100+169/562.5)*360};
  const paint=()=>{const s=window.distanceScale;context.fillStyle="#666";context.fillRect(0,0,640,360);context.drawImage(image,x*(1-s),y*(1-s),640*s,360*s);};
  paint();window.distanceTimer=setInterval(paint,100);window.distanceImage=image;
  window.distanceStream=canvas.captureStream(10);video.srcObject=window.distanceStream;await video.play();
 })()`);
 await waitFor('document.getElementById("direction-text").textContent.includes("closer")',"Smaller detected face requests moving closer");
 let smallerRatio,previousRatio,stableRatios=0;
 for(let n=0;n<35;n++){
  const ratio=await page.evaluate('Number(document.getElementById("direction-detail").textContent.match(/Head size is (\\d+)%/)?.[1])');
  stableRatios=Number.isFinite(ratio)&&ratio===previousRatio?stableRatios+1:0;previousRatio=ratio;
  if(stableRatios>=3&&ratio<95){smallerRatio=ratio;break;}await pause(160);
 }
 assert.ok(Number.isFinite(smallerRatio),"Distance readout settles below the fixed target");
 assert.match(await overlay.evaluate('document.getElementById("framing-pill").textContent'),/closer/,"Overlay uses the same live distance measurement");
 await page.evaluate('window.distanceScale=.9');
 await waitFor('Number(document.getElementById("direction-detail").textContent.match(/Head size is (\\d+)%/)?.[1])>'+(smallerRatio+5),"Moving closer increases detected size towards the fixed target");
 await fs.writeFile(path.join(artifacts,"distance-progress.png"),Buffer.from((await page.call("Page.captureScreenshot",{format:"png"})).data,"base64"));
 await page.evaluate('window.distanceScale=1');
 await waitFor('!document.getElementById("accept-frame").disabled',"Moving back to the reference reaches green");
 await page.evaluate('window.distanceScale=1.2');
 await waitFor('document.getElementById("direction-text").textContent.includes("further")',"A larger face requests moving further away");
 assert.match(await overlay.evaluate('document.getElementById("framing-pill").textContent'),/further/);
 assert.deepEqual((await page.evaluate('window.preRecord.load()')).shared.target,distanceTarget,"Moving the subject never moves the target");
 await page.evaluate('(async()=>{clearInterval(window.distanceTimer);window.distanceStream.getTracks().forEach(t=>t.stop());document.getElementById("camera-video").srcObject=window.distanceOriginalStream;await document.getElementById("camera-video").play();window.distanceImage.close()})()');
 await waitFor('!document.getElementById("accept-frame").disabled',"Original camera stream returns to green");
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
 for(const [w,h] of [[1440,940],[1024,720],[600,600]]){
  await native.evaluate("process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('sightline:')).setContentSize("+w+","+h+")");
  await pause(250);
  assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true,"No horizontal overflow "+w);
 }
 assert.deepEqual(errors,[]);
 if(obsMock){await main.evaluate('window.electron.saveSettings({obsEnabled:false})');await waitFor('document.getElementById("calibration-source-field").hidden',"Disabled OBS hides its calibration choices");assert.equal(await overlay.evaluate('document.getElementById("framing-inputs").hidden'),true,"The head guide uses the same OBS gate");}
 await native.evaluate(electronNative+".BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('sightline:')).hide()");
 await toolbar.evaluate('setTimeout(()=>document.getElementById("close").click(),25);true');
 for(let n=0;n<40;n++){if(await native.evaluate(electronNative+".BrowserWindow.getAllWindows().every(w=>!w.webContents.getURL().includes('head-guide.html'))"))break;await pause(100);}
 assert.equal(await native.evaluate(electronNative+".BrowserWindow.getAllWindows().every(w=>!w.webContents.getURL().includes('head-guide.html'))"),true,"Guide off removes the overlay, controls and bottom reveal surface");
 for(let n=0;n<60;n++){if(await native.evaluate(electronNative+".BrowserWindow.getAllWindows().every(w=>!w.webContents.getURL().startsWith('sightline:'))"))break;await pause(100);}
 assert.equal(await native.evaluate(electronNative+".BrowserWindow.getAllWindows().every(w=>!w.webContents.getURL().startsWith('sightline:'))"),true,"Guide off releases a hidden picture feed even when tracking was off");
 console.log("PASS: real local model inference, microphone measurement, recorded WebM playback, fixed reference and manual fallback. Synthetic devices only. Artifacts: "+artifacts);
} finally {
 for(const socket of sockets)socket.close();
 if(obsMock){for(const client of obsMock.clients)client.terminate();await new Promise(r=>obsMock.close(r));}
 await new Promise(resolve=>{const stop=spawn("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});stop.on("exit",resolve);stop.on("error",resolve);});
}
