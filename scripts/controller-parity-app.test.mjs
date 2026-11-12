import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9365;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-overlay-authoring-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
await fs.appendFile( path.join( profile, "script.md" ), "\n\n## Next section\n\nThe next section starts at the reading line.\n\n" + "More words for navigation and bookmark checks. ".repeat( 40 ) );
await fs.writeFile(path.join(profile,"script.md"),"## Opening\r\n\r\n<!-- Keep this production note. -->\r\n\r\nHello **Joanne**, take your time. [smile] {marker: first}\r\n\r\nKeep this paragraph exactly.\r\n\r\nKeep this paragraph exactly.\r\n\r\n## Second section\r\n\r\nA second section has its own words.\r\n");
const fixture=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8"));fixture.slots=Array.from({length:9},()=>({path:path.join(profile,"script.md"),scrollY:0,section:0}));fixture.activeSlot=0;Object.assign(fixture.settings,{remoteControl:true,remotePort:47731,mcpEnabled:true,mcpControls:true,streamDeck:true});await fs.writeFile(path.join(profile,"app-state.json"),JSON.stringify(fixture));
await fs.writeFile(path.join(profile,"script.md"),"First plain sentence. Second sentence. Third sentence. Fourth sentence.\n\nThe second paragraph is easy to read.\n\nThe final paragraph remains intact.");
await fs.writeFile(path.join(profile,"notes.md"),"{mode: notes}\n\n## Alpha\n\nAlpha words.\n\n## Beta\n\nBeta words.\n\n## Gamma\n\nGamma words.");
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
 const main=await connect('teleprompter.html'),native=await connect('main-process');
 const until=async(check,label)=>{for(let i=0;i<100;i++){if(await check())return;await pause(80)}throw Error('Timed out '+label)};
 await until(()=>main.evaluate('document.getElementById("md")?.textContent.includes("First plain")'),'script');
 await native.evaluate('globalThis.testElectron=process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json")("electron");globalThis.testWindow=()=>testElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html"));globalThis.recordCalls=[];testElectron.ipcMain.removeHandler("obs");testElectron.ipcMain.handle("obs",async(event,action)=>{if(action!=="status")recordCalls.push(action);return {ok:true,state:{enabled:false,controls:false,connection:"disabled",recording:"stopped"}}})');
 await main.evaluate('globalThis.audioRequests=0;navigator.mediaDevices.getUserMedia=async()=>{audioRequests++;throw Error("Unexpected media request")};');
 const descriptor=JSON.parse(await fs.readFile(path.join(profile,'remote-control.json'),'utf8'));
 const mcp=JSON.parse(await fs.readFile(path.join(profile,'mcp-control.json'),'utf8'));
 const request=async(route,body=null,restricted=false)=>{const r=await fetch(descriptor.url+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+(restricted?mcp.token:descriptor.token),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {ok:r.ok,status:r.status,body:await r.json()}};
 const status=async()=> (await request('/status')).body;
 const command=(action,value,restricted=false)=>request('/command',{action,...(value!==undefined?{value}:{})},restricted);
 for(const action of ['always-on-top','clean-view','mode-notes','mode-scroll'])assert.ok((await status()).commands.includes(action));
 assert.equal((await command('always-on-top','on',true)).ok,true);await until(async()=>(await status()).alwaysOnTop,'pin state');assert.equal(await native.evaluate('testWindow().isAlwaysOnTop()'),true);
 await command('always-on-top','on',true);assert.equal((await status()).alwaysOnTop,true,'Repeated On is idempotent');await command('always-on-top','off',true);await until(async()=>!(await status()).alwaysOnTop,'unpin');
 assert.equal((await command('clean-view',undefined,true)).status,403,'MCP cannot use ambiguous toggles');
 await command('clean-view','on',true);await until(async()=>(await status()).cleanOverlay,'clean');assert.equal(await main.evaluate('getComputedStyle(document.getElementById("control-bar")).visibility'),'hidden');await command('clean-view','off',true);await until(async()=>!(await status()).cleanOverlay,'restore');
 assert.equal((await command('always-on-top','invalid')).ok,false);
 await command('mode-notes',undefined,true);await until(async()=>(await status()).readingMode==='notes','MCP page');await command('mode-scroll',undefined,true);await until(async()=>(await status()).readingMode==='scroll','MCP scroll');
 assert.equal((await command('mode-voice',undefined,true)).ok,false,'Disabled voice cannot be bypassed');
 await command('control');const operator=await connect('control.html');await pause(200);
 assert.equal(await operator.evaluate('document.querySelectorAll(".mode-choices button").length'),3);
 assert.equal(await operator.evaluate('document.querySelector("[data-action=mode-voice]").disabled'),true);
 await operator.evaluate('document.querySelector("[data-action=mode-notes]").click()');await until(async()=>(await status()).readingMode==='notes','operator page');
 await until(()=>operator.evaluate('!document.querySelector("[data-action=mode-scroll]").disabled'),'operator mode ready');
 await operator.evaluate('document.querySelector("[data-action=mode-scroll]").click()');await until(async()=>(await status()).readingMode==='scroll','operator scroll');
 await operator.evaluate('document.querySelector("[data-action=clean-view]").click()');await until(async()=>(await status()).cleanOverlay,'operator clean');await until(()=>operator.evaluate('document.querySelector("[data-action=clean-view]").textContent==="Show controls"'),'operator recovery label');
 await operator.evaluate('document.querySelector("[data-action=clean-view]").click()');await until(async()=>!(await status()).cleanOverlay,'operator restore');
 await operator.evaluate('document.querySelector("[data-action=always-on-top]").click()');await until(async()=>(await status()).alwaysOnTop,'operator pin');
 await fs.writeFile(path.join(artifacts,'operator-controls.png'),Buffer.from((await operator.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await native.evaluate('testElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith("/control.html")).setSize(520,440)');await pause(150);
 assert.equal(await operator.evaluate('[...document.querySelectorAll("#broadcast button")].filter(e=>!e.hidden).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})'),true,'Compact operator controls fit');
 await fs.writeFile(path.join(artifacts,'operator-compact.png'),Buffer.from((await operator.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await main.evaluate('window.electron.saveSettings({padEnabled:true,showPad:true,padLayout:{columns:4,buttons:["toggle","mode-cycle","previous-section","next-section","clean-view","click-through","always-on-top","control"]}})');
 const pad=await connect('pad.html');await pause(300);assert.equal(await pad.evaluate('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("On top"))'),true);
 await command('click-through','on',true);await until(async()=>(await status()).clickThrough,'click-through on');await command('click-through','off',true);await until(async()=>!(await status()).clickThrough,'click-through off');
 await fs.writeFile(path.join(artifacts,'call-pad.png'),Buffer.from((await pad.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.equal(await native.evaluate('recordCalls.length'),0);assert.equal(await main.evaluate('audioRequests'),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,artifacts,checks:'Real API/MCP grant boundaries, explicit/idempotent display commands, native pin, clean recovery, mode gates, three-mode operator IPC, compact layout, shared call pad and no media/recorder side effects'}));
}catch(error){console.error(error,stderr.slice(-1000),errors);process.exitCode=1}finally{for(const socket of sockets)socket.close();child.kill()}
