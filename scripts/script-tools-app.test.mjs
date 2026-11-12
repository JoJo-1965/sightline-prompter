import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9362;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-insert-tools-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
await fs.appendFile( path.join( profile, "script.md" ), "\n\n## Next section\n\nThe next section starts at the reading line.\n\n" + "More words for navigation and bookmark checks. ".repeat( 40 ) );
await fs.writeFile(path.join(profile,"script.md"),"## Opening\r\n\r\n<!-- Keep this production note. -->\r\n\r\nHello **Joanne**, take your time. [smile] {marker: first}\r\n\r\nKeep this paragraph exactly.\r\n\r\nKeep this paragraph exactly.\r\n\r\n## Second section\r\n\r\nA second section has its own words.\r\n");
const fixture=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8"));fixture.slots=Array.from({length:9},()=>({path:path.join(profile,"script.md"),scrollY:0,section:0}));fixture.activeSlot=0;await fs.writeFile(path.join(profile,"app-state.json"),JSON.stringify(fixture));
await fs.writeFile(path.join(profile,"script.md"),"Before HERE after.\n\n## Second section\n\nKeep the ending.\n");
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
 for(let i=0;i<100&&!await main.evaluate('document.getElementById("md")?.textContent.includes("Before HERE")');i++)await pause(80);await pause(400);
 await native.evaluate('globalThis.insertElectron=process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json")("electron");globalThis.insertWindow=()=>insertElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html"));globalThis.recordCalls=[];insertElectron.ipcMain.removeHandler("obs");insertElectron.ipcMain.handle("obs",async(event,action)=>{if(action!=="status")recordCalls.push(action);return {ok:true,state:{enabled:false,controls:false,connection:"disabled",recording:"stopped"}}})');
 const key=async(key,code,keyCode,modifiers=0)=>{await main.call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:keyCode,modifiers});await main.call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:keyCode,modifiers})};
 const selectHere=async()=>{await main.evaluate('document.querySelector(".cm-content").focus()');await key('Home','Home',36,2);for(let i=0;i<7;i++)await key('ArrowRight','ArrowRight',39);for(let i=0;i<4;i++)await key('ArrowRight','ArrowRight',39,8)};
 const choose=async(group,id)=>{await main.evaluate('document.getElementById("btn-insert-tool").click()');await main.evaluate('document.querySelector("[data-tool-group='+group+']").click()');await main.evaluate('document.querySelector("[data-script-tool='+id+']").click()');await pause(80)};
 await main.evaluate('document.getElementById("cb-edit").click()');await pause(250);
 await selectHere();await choose('directions','cue-direction');
 assert.equal(await main.evaluate('document.getElementById("script-tool-menu").hidden'),true);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Cancel');
 assert.match(await main.evaluate('document.querySelector(".cm-content").textContent'),/^Before \[direction\] after\./);
 await key('z','KeyZ',90,2);await pause(80);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Close','One Undo restores selected text and the clean baseline');
 await selectHere();await choose('directions','cue-direction');await main.call('Input.insertText',{text:'relaxed'});
 await main.evaluate('document.getElementById("btn-save").click()');await pause(250);
 assert.match(await fs.readFile(path.join(profile,'script.md'),'utf8'),/^Before \[relaxed\] after\./,'Typing replaces only the selected template value');
 await key('End','End',35,2);await choose('pointing','point-left');await main.call('Input.insertText',{text:'growth-chart'});
 await main.evaluate('document.getElementById("btn-save").click()');await pause(250);
 assert.match(await fs.readFile(path.join(profile,'script.md'),'utf8'),/\[point left: growth-chart\]$/);
 await key('End','End',35,2);await choose('recording','record-on');await main.evaluate('document.getElementById("btn-save").click()');await pause(250);
 assert.equal(await native.evaluate('recordCalls.length'),0,'Inserting/saving recorder codes never starts OBS');
 assert.match(await fs.readFile(path.join(profile,'script.md'),'utf8'),/Keep the ending\./,'Other content is retained');
 for(const [width,height] of [[1100,760],[560,500],[420,420]]){
  await native.evaluate('insertWindow().setSize('+width+','+height+')');await pause(150);
  await main.evaluate('document.getElementById("btn-insert-tool").click();document.querySelector("[data-tool-group=pointing]").click()');await pause(100);
  const layout=await main.evaluate('(()=>{const menu=document.getElementById("script-tool-menu"),r=menu.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,horizontal:menu.scrollWidth>menu.clientWidth+1,insertVisible:document.getElementById("btn-insert-tool").getBoundingClientRect().right<=innerWidth}})()');assert.deepEqual(layout,{inside:true,horizontal:false,insertVisible:true});
  await fs.writeFile(path.join(artifacts,'insert-menu-'+width+'.png'),Buffer.from((await main.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await key('Escape','Escape',27);assert.equal(await main.evaluate('document.getElementById("script-tool-menu").hidden'),true);assert.equal(await main.evaluate('document.getElementById("editor-container").classList.contains("hidden")'),false,'Escape closes the menu, not the editor');
 }
 await main.evaluate('document.getElementById("btn-cancel").click()');await pause(150);
 await main.evaluate('window.electron.openSample("welcome.md")');for(let i=0;i<100&&!await main.evaluate('document.getElementById("md").textContent.includes("Welcome to Sightline")');i++)await pause(60);
 await main.evaluate('document.getElementById("cb-edit").click()');await pause(200);
 assert.equal(await main.evaluate('document.getElementById("btn-insert-tool").disabled'),true,'Read-only samples disable insertion');
 await main.evaluate('document.getElementById("btn-insert-tool").disabled=false;document.getElementById("btn-insert-tool").click()');assert.equal(await main.evaluate('document.getElementById("script-tool-menu").hidden'),true,'Read-only protection remains in the handler');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,artifacts,checks:'Actual CodeMirror cursor/selection insertion, editable placeholders, single Undo, Save, preserved text, no recorder execution, wide/compact layout, Escape and read-only gates'}));
}catch(error){console.error(error,stderr.slice(-1000));process.exitCode=1}finally{for(const socket of sockets)socket.close();child.kill()}
