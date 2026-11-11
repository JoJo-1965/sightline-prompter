// Native-window regression with synthetic audio and a simulated OBS IPC boundary.
// Never uses a physical microphone or connects to the production OBS server.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9351;
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-voice-feedback-" ) );
const artifacts = process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" );
await fs.mkdir( artifacts, { recursive: true } );
const settings = { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: true, microphoneEnabled: true, voiceCommands: "voice", voiceEngine: "local", scrollMode: "voice", countdown: 0, slate: "off", scratchAudio: false, takeLoudness: "off", padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, obsEnabled: false, remoteControl: true, remotePort: 47735, streamDeck: false, phoneRemote: false, checkUpdates: false, hideFromCapture: false };
await fs.writeFile( path.join( profile, "script.md" ), "# Voice and recording\n\n<!-- PREPARATION: keep this note out of delivery. -->\n\n## Ready to start\n\n{prompter: record:on}\n\n[smile]\n" + "Speak at a comfortable pace while looking towards the lens. ".repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-features=CalculateNativeWinOcclusion" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
let stderr = ""; child.stderr.on( "data", chunk => stderr += chunk ); child.stdout.resume();
const pause = ms => new Promise( resolve => setTimeout( resolve, ms ) );
const sockets = [], errors = [];
async function connect( fragment ) {
	let target;
	for ( let n = 0; n < 120; n++ ) {
		target = fragment === "main-process" ? { webSocketDebuggerUrl: stderr.match( /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/ )?.[1] } : ( await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).catch( () => [] ) ).find( t => t.url.includes( fragment ) );
		if ( target?.webSocketDebuggerUrl ) break;
		await pause( 100 );
	}
	assert.ok( target?.webSocketDebuggerUrl, `Missing ${ fragment }: ${ stderr.slice( -1000 ) }` );
	const socket = new WebSocket( target.webSocketDebuggerUrl ); sockets.push( socket ); await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0; const pending = new Map();
	socket.addEventListener( "message", event => { const message = JSON.parse( event.data ); if ( message.id ) pending.get( message.id )?.( message ); if ( message.method === "Runtime.exceptionThrown" ) errors.push( message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text ); } );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => { const id = ++sequence, timer = setTimeout( () => reject( new Error( `Timeout ${ method }` ) ), 15000 ); pending.set( id, message => { clearTimeout( timer ); pending.delete( id ); message.error ? reject( new Error( message.error.message ) ) : resolve( message.result ); } ); socket.send( JSON.stringify( { id, method, params } ) ); } );
	const evaluate = async expression => { const result = await call( "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true } ); if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ); return result.result.value; };
	await call( "Runtime.enable" ); return { call, evaluate };
}
try {
	const main = await connect( "teleprompter.html" ), native = await connect( "main-process" ); await pause( 900 );
	await native.evaluate( `globalThis.testElectron=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');globalThis.testMain=()=>testElectron.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html'));for(const channel of ['speechStart','speechAudio','speechStop'])testElectron.ipcMain.removeAllListeners(channel);testElectron.ipcMain.on('speechStart',(event,options)=>{globalThis.testSession=options.session;event.sender.send('speechState',{type:'ready',session:options.session})});testElectron.ipcMain.on('speechAudio',()=>{});testElectron.ipcMain.on('speechStop',()=>{});testElectron.ipcMain.removeAllListeners('speechModelStatus');testElectron.ipcMain.on('speechModelStatus',event=>event.sender.send('speechModel',{installed:true}));testMain().webContents.send('speechModel',{installed:true});globalThis.testObsCalls=[];globalThis.testObsFail=false;globalThis.testObs={enabled:true,controls:true,connection:'connected',recording:'stopped',chapters:false};testElectron.ipcMain.removeHandler('obs');testElectron.ipcMain.handle('obs',async(event,action)=>{if(action==='status')return {ok:true,state:testObs};testObsCalls.push(action);if(testObsFail)return {ok:false,error:'Simulated OBS recording failure',state:testObs};testObs.recording={start:'recording',resume:'recording',pause:'paused',stop:'stopped'}[action]??testObs.recording;testMain().webContents.send('obsState',testObs);return {ok:true,state:testObs}});testElectron.ipcMain.removeHandler('obsSetup');testElectron.ipcMain.handle('obsSetup',async(event,action)=>({ok:true,...(action==='inspect'?{result:{cameras:[{inputName:'Test camera'}],microphones:[{inputName:'Test microphone'}],presentations:[]}}:action==='folder'?{directoryLabel:'Test recordings'}:action==='plan'?{result:{id:'test-plan',name:'Test setup',directory:'Test recordings',camera:'Test camera',microphone:'Test microphone',presentation:'None',width:1920,height:1080,fps:30,scenes:[],notes:[]}}:{result:{ok:true,name:'Test setup'}})}));` );
	await main.evaluate( "navigator.mediaDevices.getUserMedia=async()=>{const audio=new AudioContext(),oscillator=audio.createOscillator(),output=audio.createMediaStreamDestination();oscillator.connect(output);oscillator.start();return output.stream};document.querySelector('#voice-offer button:last-child')?.click()" );
	const config = JSON.parse( await fs.readFile( path.join( profile, "remote-control.json" ), "utf8" ) );
	const command = async action => { const response = await fetch( config.url + "/command", { method: "POST", headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" }, body: JSON.stringify( { action } ) } ); assert.equal( response.status, 200 ); await pause( 400 ); };
	const heard = async text => { await native.evaluate( `testMain().webContents.send('speechWords',{session:testSession,words:${ JSON.stringify( text.split( " " ) ) },final:true})` ); await pause( 650 ); };
	const configure = async enabled => { await native.evaluate( `testMain().webContents.send('settings',${ JSON.stringify( { ...settings, voiceCommands: "always", obsEnabled: enabled, obsControls: enabled, obsFollowPrompter: true } ) });testMain().webContents.send('obsState',testObs)` ); await pause( 300 ); };
	const snapshot = async ( panel, name ) => { const shot = await panel.call( "Page.captureScreenshot", { format: "png" } ); await fs.writeFile( path.join( artifacts, name ), Buffer.from( shot.data, "base64" ) ); };
	await configure( false );
	await native.evaluate( "testMain().webContents.send('speechModel',{installed:true})" );
	await command( "listening-restart" );
	await pause( 800 );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); const panel = await connect( "utility-window.html?panel=settings" ); await pause( 500 );
	await configure( false ); await native.evaluate( "testMain().webContents.send('speechModel',{installed:true})" ); await command( "listening-restart" );
	await heard( "PROMPTER" );
	for ( const host of [ main, panel ] ) assert.equal( await host.evaluate( '!!document.getElementById("voice-feedback")&&!document.getElementById("voice-feedback").hidden' ), true, "Wake acknowledgement is visible in the script and foreground Settings" );
	await snapshot( panel, "settings-wake-acknowledgement.png" );
	await heard( "RECORD" );
	assert.equal( await native.evaluate( "testObsCalls.length" ), 0, "Disabled integration does not receive a recording request" );
	assert.match( await panel.evaluate( 'document.getElementById("voice-feedback").textContent' ), /unavailable/ );
	await configure( true );
	await heard( "PROMPTER PRACTICE" );
	assert.equal( await main.evaluate( 'document.getElementById("cb-play").getAttribute("aria-pressed")' ), "true" );
	assert.equal( await native.evaluate( "testObsCalls.length" ), 0, "Practice bypasses linked recording and a startup record directive" );
	await heard( "PROMPTER RECORD" );
	assert.ok( await native.evaluate( "testObsCalls.includes('start')&&testObs.recording==='recording'" ), "Record transitions from active practice into confirmed recording" );
	assert.equal( await main.evaluate( 'getComputedStyle(document.querySelector(".production-note")).display' ), "none", "Recording enters delivery mode" );
	await heard( "PROMPTER FINISH RECORDING" );
	await native.evaluate( "globalThis.testObsCalls=[];globalThis.testObsFail=true" );
	await heard( "PROMPTER START RECORDING" );
	assert.equal( await main.evaluate( 'document.getElementById("cb-play").getAttribute("aria-pressed")' ), "false", "Failed OBS confirmation never starts prompting" );
	assert.match( await panel.evaluate( 'document.getElementById("voice-feedback").textContent' ), /Simulated OBS recording failure/ );
	await native.evaluate( "globalThis.testObsFail=false;testMain().webContents.send('obsState',testObs)" );
	await panel.evaluate( 'document.getElementById("set-obs-enabled").checked=true;document.getElementById("set-obs-enabled").dispatchEvent(new Event("change",{bubbles:true}))' ); await pause( 250 );
	await panel.evaluate( 'document.getElementById("set-obs-setup-open").click()' ); const setup = await connect( "utility-window.html?panel=obssetup" ); await pause( 400 );
	assert.match( await setup.evaluate( 'document.getElementById("setup-stage-hint").textContent' ), /camera.*microphone.*recording folder/ );
	await snapshot( setup, "obs-setup-choices.png" );
	await setup.evaluate( 'document.getElementById("setup-camera").value="Test camera";document.getElementById("setup-microphone").value="Test microphone";document.getElementById("setup-microphone").dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("setup-folder").click()' ); await pause( 250 );
	assert.equal( await setup.evaluate( 'document.getElementById("setup-review-tab").disabled' ), false, "Top Review plan unlocks when required choices are complete" );
	await setup.evaluate( 'document.getElementById("setup-review-tab").click()' ); await pause( 250 );
	assert.equal( await setup.evaluate( 'document.getElementById("setup-review-panel").hidden' ), false );
	assert.equal( await setup.evaluate( 'document.getElementById("setup-result-tab").disabled' ), true, "Result needs a created setup" );
	await snapshot( setup, "obs-setup-review-plan.png" );
	await setup.evaluate( 'document.getElementById("setup-apply").click()' ); await pause( 250 );
	assert.equal( await setup.evaluate( 'document.getElementById("setup-result-tab").disabled' ), false );
	assert.deepEqual( errors, [] );
	console.log( JSON.stringify( { pass: true, artifacts, checks: "Actual voice callbacks, foreground Settings acknowledgement, blocked recording, practice with linked setting and script directive, practice-to-record transition, failed confirmation and complete OBS setup stages; synthetic media and OBS only" } ) );
} catch ( error ) {
	console.error( error, stderr.slice( -1000 ) ); process.exitCode = 1;
} finally {
	for ( const socket of sockets ) socket.close();
	child.kill();
}
