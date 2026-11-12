import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9358;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-quick-edit-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
await fs.appendFile( path.join( profile, "script.md" ), "\n\n## Next section\n\nThe next section starts at the reading line.\n\n" + "More words for navigation and bookmark checks. ".repeat( 40 ) );
await fs.writeFile(path.join(profile,"script.md"),"## Opening\r\n\r\n<!-- Keep this production note. -->\r\n\r\nHello **Joanne**, take your time. [smile] {marker: first}\r\n\r\nKeep this paragraph exactly.\r\n\r\nKeep this paragraph exactly.\r\n\r\n## Second section\r\n\r\nA second section has its own words.\r\n");
const fixture=JSON.parse(await fs.readFile(path.join(profile,"app-state.json"),"utf8"));fixture.slots=Array.from({length:9},()=>({path:path.join(profile,"script.md"),scrollY:0,section:0}));fixture.activeSlot=0;await fs.writeFile(path.join(profile,"app-state.json"),JSON.stringify(fixture));
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
 for(let i=0;i<100&&await main.evaluate('document.querySelectorAll("#md h2").length')!==2;i++)await pause(100);await pause(500);
 const select='[...document.querySelectorAll("#md p")].find(p=>p.textContent.startsWith("Hello"))';
 const original=await fs.readFile(path.join(profile,'script.md'),'utf8');
 let beforeTop;
 const click=async()=>{beforeTop=await main.evaluate('(()=>{const p='+select+';p.scrollIntoView({block:"center"});const r=p.getBoundingClientRect();p.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,clientX:r.left+80,clientY:r.top+30}));return r.top})()');for(let i=0;i<100&&!await main.evaluate('!!document.querySelector(".quick-edit-box textarea")');i++)await pause(50);assert.equal(await main.evaluate('!!document.querySelector(".quick-edit-box textarea")'),true,'Double-click opens paragraph editor')};
 await click();assert.equal(await main.evaluate('document.querySelector(".quick-edit-box textarea").value'),'Hello **Joanne**, take your time. [smile] {marker: first}');
 const initialShot=await main.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,'quick-edit.png'),Buffer.from(initialShot.data,'base64'));
 await main.evaluate('const q=document.querySelector(".quick-edit-box textarea");q.value=q.value.replace("Joanne","Jo").replace(",",";");q.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector(".quick-edit-box [data-save]").click()');
 for(let i=0;i<100&&await main.evaluate('!!document.querySelector(".quick-edit-box")');i++)await pause(50);
 const afterTop=await main.evaluate('(' + select + ').getBoundingClientRect().top');assert.ok(Math.abs(afterTop-beforeTop)<2,'Save retains paragraph placement '+JSON.stringify({beforeTop,afterTop}));
 const saved=await fs.readFile(path.join(profile,'script.md'),'utf8');assert.ok(saved.includes('Hello **Jo**;'));assert.equal(saved.replace('Hello **Jo**;','Hello **Joanne**,'),original);assert.equal(await main.evaluate('document.querySelector("#md strong").textContent'),'Jo');
 await click();await main.evaluate('document.querySelector(".quick-edit-box textarea").value="Discard this draft";document.querySelector(".quick-edit-box textarea").dispatchEvent(new Event("input"));document.querySelector(".quick-edit-box [data-cancel]").click()');await pause(350);assert.equal(await fs.readFile(path.join(profile,'script.md'),'utf8'),saved);

 // Enter creates a visible Markdown hard break; playback and slot changes remain blocked.
 await click();
 await main.evaluate('document.getElementById("toast")?.classList.remove("visible")');
 
 await main.evaluate('const q2=document.querySelector(".quick-edit-box textarea");q2.focus();q2.setSelectionRange(q2.value.length,q2.value.length)');
 await main.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await main.evaluate('const q3=document.querySelector(".quick-edit-box textarea");q3.setRangeText("A clear new line.",q3.selectionStart,q3.selectionEnd,"end");q3.dispatchEvent(new Event("input",{bubbles:true}))');
 // UI slot switching is guarded before the request is sent.
 await main.evaluate('var picker=document.getElementById("cb-slot-picker");picker.value="1";picker.dispatchEvent(new Event("change",{bubbles:true}))');
 assert.equal(await main.evaluate('document.getElementById("cb-slot-picker").value'),'0');
 await native.evaluate('globalThis.quickElectron=process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json")("electron");quickElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html")).webContents.send("remoteCommand","play")');await pause(100);
 assert.equal(await main.evaluate('document.getElementById("cb-play").getAttribute("aria-pressed")'),'false','A remote Play cannot start prompting during an edit');
 await main.evaluate('document.querySelector(".quick-edit-box [data-save]").click()');for(let i=0;i<100&&await main.evaluate('!!document.querySelector(".quick-edit-box")');i++)await pause(50);
 const withBreak=await fs.readFile(path.join(profile,'script.md'),'utf8');assert.ok(withBreak.includes('  \r\nA clear new line.'));assert.equal(await main.evaluate('document.querySelectorAll("#md br").length'),1);
 // The second identical paragraph has a distinct source range.
 await main.evaluate('(()=>{const p=[...document.querySelectorAll("#md p")].filter(p=>p.textContent==="Keep this paragraph exactly.")[1];p.scrollIntoView({block:"center"});const r=p.getBoundingClientRect();p.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,clientX:r.left+50,clientY:r.top+10}))})()');await pause(400);
 await main.evaluate('var duplicate=document.querySelector(".quick-edit-box textarea");duplicate.value="Keep this sentence exactly.";duplicate.dispatchEvent(new Event("input"));document.querySelector(".quick-edit-box [data-save]").click()');await pause(400);
 const duplicateSaved=await fs.readFile(path.join(profile,'script.md'),'utf8');assert.equal(duplicateSaved.match(/Keep this paragraph exactly\./g).length,1);assert.ok(duplicateSaved.includes('Keep this sentence exactly.'));
 // An outside writer must never be silently overwritten.
 await click();const external=duplicateSaved+'\r\n<!-- Added outside Sightline. -->\r\n';await fs.writeFile(path.join(profile,'script.md'),external);
 await main.evaluate('document.querySelector(".quick-edit-box textarea").value="Keep my draft available";document.querySelector(".quick-edit-box textarea").dispatchEvent(new Event("input"));document.querySelector(".quick-edit-box [data-save]").click()');await pause(300);
 assert.match(await main.evaluate('document.querySelector(".quick-edit-message").textContent'),/changed outside/);assert.equal(await fs.readFile(path.join(profile,'script.md'),'utf8'),external);assert.equal(await main.evaluate('document.querySelector(".quick-edit-box textarea").value'),'Keep my draft available');
 await main.evaluate('document.querySelector(".quick-edit-box [data-cancel]").click()');await pause(400);assert.equal(await main.evaluate('document.body.classList.contains("quick-editing")'),false);
 // Window buttons stay at the top right, and narrow toolbars use one slot picker.
 for(const [width,height] of [[1920,900],[1024,600],[768,450],[560,500]]){
  await native.evaluate('quickElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html")).setSize('+width+','+height+')');await pause(200);await main.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:15});await main.evaluate('document.body.classList.remove("controls-hidden");document.getElementById("toast")?.classList.remove("visible")');await pause(350);
  const layout=await main.evaluate('(()=>{const ids=["cb-help","cb-settings","cb-min","cb-max","cb-full","cb-close"],r=id=>document.getElementById(id).getBoundingClientRect(),b=r("control-bar");return {size:[innerWidth,innerHeight],right:innerWidth-r("cb-close").right,first:ids.every(id=>Math.abs((r(id).top+r(id).height/2)-(r("cb-utilities").top+r("cb-utilities").height/2))<2 && r(id).top < b.top+20),picker:!!document.getElementById("cb-slot-picker").getClientRects().length,numbers:[...document.querySelectorAll("#cb-slots .cb-slot")].filter(e=>e.getClientRects().length).length,clipped:[...document.querySelectorAll("#control-bar button,#control-bar select,#control-bar input")].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+.5||r.left<0||r.bottom>b.bottom+.5}).map(e=>e.id)};})()');
  assert.equal(layout.first,true,'Window controls stay on the first line');assert.ok(layout.right>=6&&layout.right<=10,'Window controls stay at the right edge');assert.deepEqual(layout.clipped,[]);assert.equal(layout.picker,layout.size[0]<=1100);assert.equal(layout.numbers,layout.size[0]<=1100?0:9);
  const shot=await main.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,`toolbar-${width}.png`),Buffer.from(shot.data,'base64'));
 }
 // Full editor clean/dirty/Undo/save lifecycle, using real CodeMirror input.
 await main.evaluate('document.getElementById("cb-edit").click()');await pause(350);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Close');
 await fs.writeFile(path.join(artifacts,'editor-clean.png'),Buffer.from((await main.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await main.evaluate('document.querySelector(".cm-content").focus()');
 await main.call('Input.insertText',{text:'A small correction. '});await pause(150);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Cancel');
 await fs.writeFile(path.join(artifacts,'editor-dirty.png'),Buffer.from((await main.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await main.call('Input.dispatchKeyEvent',{type:'keyDown',key:'z',code:'KeyZ',modifiers:2,windowsVirtualKeyCode:90});
 await main.call('Input.dispatchKeyEvent',{type:'keyUp',key:'z',code:'KeyZ',modifiers:2,windowsVirtualKeyCode:90});await pause(150);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Close','Undo returns to the saved baseline');
 await main.call('Input.insertText',{text:'An intentional edit. '});await pause(150);
 await native.evaluate('quickElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html")).webContents.send("saveResult",false)');await pause(100);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Cancel','Failed save retains the draft');
 await main.evaluate('document.getElementById("btn-save").click()');await pause(350);
 assert.equal(await main.evaluate('document.getElementById("btn-cancel").textContent'),'Close','Successful save updates the baseline');
 await main.evaluate('document.getElementById("btn-cancel").click()');await pause(300);
 // Native backend also rejects edits while scrolling.
 await main.evaluate('document.getElementById("cb-play").click()');await pause(350);const denied=await main.evaluate('window.electron.beginQuickEdit()');assert.equal(denied.ok,false);await main.evaluate('document.getElementById("cb-play").click()');await pause(250);
 await main.evaluate('window.electron.openSample("welcome.md")');for(let i=0;i<100&&!await main.evaluate('document.getElementById("md").textContent.includes("Welcome to Sightline")');i++)await pause(50);const sample=await main.evaluate('window.electron.beginQuickEdit()');assert.equal(sample.ok,false);assert.match(sample.error,/read-only/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,artifacts,checks:'Native paragraph Save/Cancel, retained formatting and CRLF, visible Enter breaks, duplicates, conflict protection, playback/slot gates, read-only samples and top-right first-row window controls with compact slot picker'}));

}catch(e){console.error(e,stderr.slice(-1000));console.error('Profile',profile);process.exitCode=1}finally{for(const socket of sockets)socket.close();child.kill()}
