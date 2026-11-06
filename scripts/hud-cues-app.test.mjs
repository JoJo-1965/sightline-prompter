// Actual renderer and saved take snapshot, with no media or external services.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire( import.meta.url );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-pointing-" ) );
const artifacts = process.env.SIGHTLINE_ARTIFACTS ?? await fs.mkdtemp(path.join(os.tmpdir(),"sightline-hud-captures-")); await fs.mkdir(artifacts,{recursive:true});
const file = path.join( profile, "pointing.md" );
await fs.writeFile( file, "# Ready to record\n\n## Keep it natural {target: 0:30}\n\n[point left: key-message]\nLook towards the lens and speak naturally. The marker shows where to gesture.\n\n[smile]\nFinish the gesture, then return naturally to the lens.\n\n[Say: \"Thank you.\"]\n" );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { x: 30, y: 30, width: 1280, height: 720, fontSize: 3, opacity: 1, recentFiles: [ file ], settings: { voiceCommands: "off", scrollMode: "steady", countdown: 0, slate: "off", scratchAudio: false, takeLoudness: "off", checkUpdates: false, streamDeck: false, remoteControl: false, hideFromCapture: false, obsEnabled: false } } ) );
const port = 9346;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true, () => false ), false, "Private test port must be free" );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion" ], { env, windowsHide: true, stdio: [ "ignore", "ignore", "pipe" ] } );
let stderr = "";
child.stderr.on( "data", ( data ) => {
	stderr += data;
} );
const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );
let socket;
try {
	let target;
	for ( let i = 0; i < 100 && !target; i++ ) {
		target = await fetch( `http://127.0.0.1:${ port }/json/list` ).then( r => r.json() ).then( pages => pages.find( page => page.url.includes( "teleprompter.html" ) ) ).catch( () => null );
		if ( !target ) await wait( 100 );
	}
	assert.ok( target, stderr.slice( -1000 ) );
	socket = new WebSocket( target.webSocketDebuggerUrl );
	await new Promise( resolve => socket.addEventListener( "open", resolve ) );
	let sequence = 0;
	const pending = new Map();
	const errors = [];
	socket.addEventListener( "message", ( event ) => {
		const message = JSON.parse( event.data );
		if ( message.id ) pending.get( message.id )?.( message );
		if ( message.method === "Runtime.exceptionThrown" ) errors.push( message.params.exceptionDetails.text );
	} );
	const call = ( method, params = {} ) => new Promise( ( resolve, reject ) => {
		const id = ++sequence;
		const timeout = setTimeout( () => {
			pending.delete( id );
			reject( new Error( `Timed out: ${ method }` ) );
		}, 10000 );
		pending.set( id, ( message ) => {
			clearTimeout( timeout );
			pending.delete( id );
			if ( message.error ) reject( new Error( message.error.message ) );
			else resolve( message.result );
		} );
		socket.send( JSON.stringify( { id, method, params } ) );
	} );
	const evaluate = async ( expression ) => {
		const result = await call( "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true } );
		if ( result.exceptionDetails ) throw new Error( result.exceptionDetails.exception?.description ?? result.exceptionDetails.text );
		return result.result.value;
	};
	const until = async ( expression ) => {
		for ( let i = 0; i < 80; i++ ) {
			if ( await evaluate( expression ) ) return;
			await wait( 100 );
		}
		throw new Error( `Not ready: ${ expression }` );
	};
	await call( "Runtime.enable" );

 await until("!!document.querySelector('#hud-delivery-cue') && !!window.EditorModule");
 await evaluate("document.querySelector('#voice-offer button:last-child')?.click()");
 await evaluate("window.electron.saveSettings({headGuideReference:{savedAt:new Date().toISOString(),pose:{x:-1.5,y:1.5,scale:1,width:1.35,height:1,top:1,bottom:1,left:1,right:1},bounds:{x:window.screenX+Math.max(0,outerWidth-innerWidth)/2,y:window.screenY+Math.max(0,outerHeight-innerHeight)-Math.max(0,outerWidth-innerWidth)/2,width:innerWidth,height:innerHeight}}})");
 await wait(400);
 await evaluate("document.getElementById('cb-play').click()");
 await until("!document.querySelector('#hud-delivery-cue').hidden && !document.querySelector('.hud-point-target').hidden");
 async function shot(name){const dimensions=await evaluate('({width:innerWidth,height:innerHeight,x:scrollX,y:scrollY})');const data=await call('Page.captureScreenshot',{format:'png',clip:{...dimensions,scale:2}});await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(data.data,'base64'));}
 await shot('hud-delivery');
 const geometry=await evaluate("(()=>{const p=document.querySelector('.hud-point-target').getBoundingClientRect(),pill=document.querySelector('#hud-delivery-cue'),r=pill.getBoundingClientRect();return {width:innerWidth,height:innerHeight,point:{x:p.x+p.width/2,y:p.y+p.height/2},label:pill.textContent,pill:{x:r.x,y:r.y,width:r.width,height:r.height}};})()");
 assert.ok(geometry.pill.x>=0&&geometry.pill.y>=0&&geometry.pill.x+geometry.pill.width<=geometry.width&&geometry.pill.y+geometry.pill.height<=geometry.height,'The complete gold cue remains inside the visible window');
 if(process.env.SIGHTLINE_TEST_CAMERA){
 const photo=await fs.readFile(process.env.SIGHTLINE_TEST_CAMERA);
 await evaluate("document.body.style.backgroundImage="+JSON.stringify('url(data:image/jpeg;base64,'+photo.toString('base64')+')')+";document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center';");
 await shot('private-camera-comparison');}
 await evaluate("document.body.style.backgroundImage='none';document.getElementById('cb-play').click()");
 await until("document.querySelector('#hud-delivery-cue').hidden && !document.querySelector('#md').classList.contains('hud-reading')");
 await evaluate("document.querySelector('#voice-offer')?.remove()");
 await shot('hud-review');
 await evaluate("document.getElementById('cb-settings').click()");
 await until("!document.getElementById('settings-modal').classList.contains('hidden')");
 async function settingsShot(name,action){
  await wait(450);
  const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  const panel=pages.find(p=>p.url.includes('utility-window.html?panel=settings'));assert.ok(panel,'Settings utility target exists');
  const connection=new WebSocket(panel.webSocketDebuggerUrl);await new Promise(resolve=>connection.addEventListener('open',resolve));
  let commandId=0;const requests=new Map();connection.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){requests.get(message.id)?.(message);requests.delete(message.id);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++commandId,timeout=setTimeout(()=>reject(Error('Settings capture timed out')),10000);requests.set(id,message=>{clearTimeout(timeout);message.error?reject(Error(message.error.message)):resolve(message.result);});connection.send(JSON.stringify({id,method,params}));});
  try{if(action){const applied=await send('Runtime.evaluate',{expression:action,returnByValue:true});if(applied.exceptionDetails)throw Error(applied.exceptionDetails.text);await wait(200);}const size=await send('Runtime.evaluate',{expression:'({width:innerWidth,height:innerHeight})',returnByValue:true});const result=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,...size.result.value,scale:2}});await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'));}finally{connection.close();}
 }
 await settingsShot('hud-settings',"document.querySelector('.settings-subtabs [data-tab=typography]').click();document.getElementById('settings-text-inline').click()");
 await settingsShot('about-consolidated',"document.querySelector('.settings-subtabs [data-tab=version]').click()");
 await fs.writeFile(path.join(artifacts,'native-capture.json'),JSON.stringify({geometry,errors,scope:'Actual RC4 renderer. Disposable script/profile; media capture disabled. Private comparison uses a static camera backdrop, not live camera evidence.'},null,2));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,artifacts,geometry}));
} catch(error){console.error(error,stderr.slice(-1000));process.exitCode=1;}finally{socket?.close();child.kill();}
