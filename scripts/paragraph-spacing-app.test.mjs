import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9354;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-paragraph-spacing-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
await fs.appendFile( path.join( profile, "script.md" ), "\n\n## Next section\n\nThe next section starts at the reading line.\n\n" + "More words for navigation and bookmark checks. ".repeat( 40 ) );
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
 const main=await connect('teleprompter.html'), native=await connect('main-process');await pause(700);
 const metrics=()=>main.evaluate('(()=>{const p=[...document.querySelectorAll("#md p")].find(p=>p.textContent.startsWith("This is a spoken"));const s=getComputedStyle(p);return {gap:parseFloat(s.marginBottom),font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight)}})()');
 const before=await metrics();assert.ok(Math.abs(before.gap-before.font)<1,'Legacy appearance retains the established paragraph gap');
 await main.evaluate('document.getElementById("cb-settings").click()');const settings=await connect('utility-window.html?panel=settings');await pause(400);
 await settings.evaluate('document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click()');
 const gap=await settings.evaluate('({min:document.getElementById("lp-paragraph-spacing").min,max:document.getElementById("lp-paragraph-spacing").max,step:document.getElementById("lp-paragraph-spacing").step})');assert.deepEqual(gap,{min:'0',max:'300',step:'5'});
 await settings.evaluate('const input=document.getElementById("lp-paragraph-spacing");input.value=45;input.dispatchEvent(new Event("input",{bubbles:true}))');await pause(150);
 const sample=await settings.evaluate('(()=>{const s=getComputedStyle(document.querySelector(".settings-preview-pane [data-sample=script]"));return {gap:parseFloat(s.marginBottom),font:parseFloat(s.fontSize)}})()');assert.ok(Math.abs(sample.gap/sample.font-.45)<.02,'Approved sample previews paragraph spacing');
 assert.ok(Math.abs((await metrics()).gap/before.font-.45)<.02,'Draft previews live using the existing appearance workflow');assert.equal(JSON.parse(await fs.readFile(path.join(profile,'app-state.json'),'utf8')).settings.paragraphSpacing,1,'Draft is not committed before Apply');
 await settings.evaluate('document.getElementById("settings-apply").click()');await pause(400);const applied=await metrics();assert.ok(Math.abs(applied.gap/applied.font-.45)<.02);assert.equal(applied.line,before.line,'Line spacing is independent');
 const saved=JSON.parse(await fs.readFile(path.join(profile,'app-state.json'),'utf8'));assert.equal(saved.settings.paragraphSpacing,.45);
 const screenshot=await settings.call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(artifacts,'paragraph-spacing-settings.png'),Buffer.from(screenshot.data,'base64'));
 const exported=path.join(profile,'spacing-theme.json');await native.evaluate('globalThis.paragraphElectron=process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json")("electron");paragraphElectron.dialog.showSaveDialog=async()=>({canceled:false,filePath:'+JSON.stringify(exported)+'})');
 await settings.evaluate('document.querySelector("[data-tab=background]").click();[...document.querySelectorAll("button")].find(b=>b.textContent==="Save current as…").click();document.getElementById("reading-theme-name").value="Spacing test";document.querySelector(".reading-theme-dialog form").requestSubmit()');await pause(450);
 await settings.evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Export theme…").click()');await pause(450);
 const theme=JSON.parse(await fs.readFile(exported,'utf8'));assert.equal(theme.text.script.paragraphSpacing,45,'Native theme export retains the applied gap');
 await settings.evaluate('document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click();var n=document.getElementById("lp-paragraph-spacing");n.value=200;n.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("settings-cancel").click()');await pause(300);assert.deepEqual(await metrics(),applied,'Cancel retains the committed gap');
 await main.evaluate('document.getElementById("cb-settings").click()');await pause(300);await settings.evaluate('document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click();var n=document.getElementById("lp-paragraph-spacing");n.value=0;n.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("settings-apply").click()');await pause(300);assert.equal((await metrics()).gap,0,'Zero paragraph spacing stays valid');
 await settings.evaluate('document.getElementById("settings-cancel").click()');await pause(200);
 await native.evaluate('paragraphElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html")).webContents.send("remoteCommand","next-section")');await pause(350);
 const position=await main.evaluate('(async()=>{const {buildWordIndex}=await import("./word-index.js");const r=buildWordIndex(document.getElementById("md")).ranges.find(r=>r.startContainer.parentElement.closest("h2:last-of-type ~ p"));return {top:r.getBoundingClientRect().top,line:innerHeight*.33};})()');assert.ok(Math.abs(position.top-position.line)<4,'Section navigation measures the new paragraph layout');
 await native.evaluate('paragraphElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("teleprompter.html")).webContents.send("remoteCommand","marker")');await pause(200);
 const markers=await main.evaluate('[...document.querySelectorAll(".live-marker")].map(el=>getComputedStyle(el,"::before").content)');assert.equal(markers.length,1,'Bookmark anchor remains available');assert.ok(markers.every(content=>content==='none'||content==='normal'),'No visual flag is painted');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,artifacts,checks:'Actual paragraph control, default/zero gaps, preview versus Apply/Cancel, independent line spacing, native theme save/export, section alignment and invisible bookmark anchors; no real microphone or OBS'}));
}catch(error){console.error(error,stderr.slice(-1200));process.exitCode=1;}finally{for(const socket of sockets)socket.close();child.kill();}
