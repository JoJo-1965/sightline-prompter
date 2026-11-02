import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd(), require = createRequire( path.join( root, "package.json" ) ), port = 9346;
assert.equal( await fetch( `http://127.0.0.1:${ port }/json/version` ).then( () => true ).catch( () => false ), false, "Use a free isolated test port" );
const profile = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-settings-redesign-" ) );
const artifacts = path.resolve( process.env.SIGHTLINE_TEST_ARTIFACTS ?? path.join( profile, "screenshots" ) ); await fs.mkdir( artifacts, { recursive: true } );
await fs.writeFile( path.join( profile, "script.md" ), '# Settings preview\n\n## Welcome\n\n[smile] Read naturally, at your own pace.\n\n<!-- Preparation notes do not count as speech. -->\n\n' + 'This is a spoken script for checking the reading appearance.\n\n'.repeat( 30 ) );
await fs.writeFile( path.join( profile, "app-state.json" ), JSON.stringify( { width: 1100, height: 760, fontSize: 3, opacity: 1, recentFiles: [ path.join( profile, "script.md" ) ], settings: { interfaceSettingsVersion: 1, readingAppearanceVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false, voiceCommands: "off", scrollMode: "steady", scratchAudio: false, takeLoudness: "off", countdown: 0, slate: "off", debugMode: true, checkUpdates: false, obsEnabled: false, phoneRemote: false, remoteControl: false, streamDeck: false, hideFromCapture: false } } ) );
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn( process.env.SIGHTLINE_TEST_EXE ?? require( "electron" ), [ ...( process.env.SIGHTLINE_TEST_EXE ? [] : [ "." ] ), "--inspect=0", `--user-data-dir=${ profile }`, `--remote-debugging-port=${ port }`, "--disable-renderer-backgrounding" ], { cwd: root, env, windowsHide: true, stdio: [ "ignore", "pipe", "pipe" ] } );
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
	const main = await connect( "teleprompter.html" ); await pause( 1000 );
	assert.equal( await main.evaluate( '!!document.querySelector(".settings-workspace")' ), true );
	assert.deepEqual( errors, [], "No renderer errors during startup" );
	await main.evaluate( 'document.getElementById("cb-tools").click();document.querySelectorAll(".tools-tabs button")[1].click()' );
	assert.equal( await main.evaluate( 'document.querySelectorAll("#tools-panel input[type=range]").length' ), 3 );
	assert.equal( await main.evaluate( 'document.querySelector("#tools-panel").scrollHeight<=document.querySelector("#tools-panel").clientHeight+1' ), true );
	await main.evaluate( 'document.getElementById("cb-tools").click();document.body.classList.add("controls-hidden")' );
	assert.notEqual( await main.evaluate( 'getComputedStyle(document.body).cursor' ), "none" );
	await main.evaluate( 'document.activeElement?.blur();document.body.tabIndex=-1;document.body.focus()' );
	const space = async () => { await main.call( "Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 } ); await main.call( "Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 } ); await pause( 150 ); };
	await space();
	assert.equal( await main.evaluate( 'document.getElementById("cb-play").getAttribute("aria-pressed")' ), "true", "Core Space still works with custom keyboard mappings off" );
	await space();
	assert.equal( await main.evaluate( 'document.getElementById("cb-play").getAttribute("aria-pressed")' ), "false" );
	await main.evaluate( 'document.getElementById("cb-settings").click()' );
	const settings = await connect( "utility-window.html?panel=settings" ); await pause( 600 );
	const native = await connect( "main-process" );
	assert.equal( await settings.evaluate( '!!document.querySelector(".settings-workspace")' ), true );
	const approvedSource = await fs.readFile( path.join( root, "docs/design/settings-and-tools-prototype.html" ), "utf8" );
	const approvedAreas = [ ...approvedSource.slice( approvedSource.indexOf( "const areas=" ), approvedSource.indexOf( "const targets=" ) ).matchAll( /\{id:'[^']+',name:'([^']+)'/g ) ].map( match => match[1] );
	assert.deepEqual( await settings.evaluate( '[...document.querySelectorAll("[data-settings-group]")].map(x=>x.textContent)' ), approvedAreas, "Area labels/order come from the signed-off interactive preview" );
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
	const layout = await settings.evaluate( `(()=>{const nav=document.querySelector('.settings-navigation'),content=document.querySelector('.settings-section-content'),preview=document.querySelector('.settings-workspace > .settings-preview-pane'),groups=[...document.querySelectorAll('[data-settings-group]')],expanded=[...document.querySelectorAll('.settings-area-sections')].filter(x=>!x.hidden),r=x=>x.getBoundingClientRect();return {threeColumns:r(nav).right<=r(content).left&&r(content).right<=r(preview).left,previewVisible:!!preview.getClientRects().length,inlineSample:!!content.querySelector('.settings-preview-pane,.settings-reading-sample'),expanded:expanded.length,childWithinArea:expanded[0].previousElementSibling.dataset.settingsGroup,verticalList:groups.every((x,i)=>!i||r(x).left===r(groups[0]).left&&r(x).top>r(groups[i-1]).top),headerSearch:!!document.querySelector('.settings-head .settings-search input'),selectedColour:getComputedStyle(document.querySelector('[data-settings-group=reading]')).backgroundColor};})()` );
	assert.deepEqual( layout, { threeColumns: true, previewVisible: true, inlineSample: false, expanded: 1, childWithinArea: "reading", verticalList: true, headerSearch: true, selectedColour: "rgb(41, 77, 112)" }, "Rendered composition must match the approved layout, independently of functional checks" );
	await settings.evaluate( 'document.querySelector("[data-tab=screens]").click();document.getElementById("settings-screen-topic").focus()' );
	assert.equal( await settings.evaluate( '(()=>{const input=document.activeElement,style=getComputedStyle(input);return input.matches(":focus-visible")&&style.outlineStyle!=="none"&&parseFloat(style.outlineWidth)>0&&parseFloat(style.outlineOffset)+parseFloat(style.outlineWidth)<=0})()' ), true, "Focused controls keep a visible cue without an outer halo" );
	if ( process.env.SIGHTLINE_TEST_ARTIFACTS ) {
		const shot = await settings.call( "Page.captureScreenshot", { format: "png" } );
		await fs.writeFile( path.join( artifacts, "focus-treatment.png" ), Buffer.from( shot.data, "base64" ) );
	}
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
	const fivePoint = [ "set-font-size", "lp-heading-scale", "lp-direction-scale", "lp-production-scale", "lp-line-height", "lp-heading-line-height", "lp-direction-line-height", "lp-production-line-height", "set-voice-speed", "set-steady-wpm" ];
	assert.deepEqual( await settings.evaluate( `${ JSON.stringify( fivePoint ) }.filter(id=>document.getElementById(id).step!=='5'||document.getElementById(id+'-number').step!=='5')` ), [], "Coarse sliders and number boxes both use five-point steps" );
	await settings.evaluate( 'document.querySelector("[data-text-target=production]").click();const n=document.getElementById("lp-production-scale-number");n.value="76.789";n.dispatchEvent(new Event("change",{bubbles:true}))' );
	assert.deepEqual( await settings.evaluate( '[document.getElementById("lp-production-scale").value,document.getElementById("lp-production-scale-number").value]' ), [ "75", "75" ], "Typed fractions settle to the same visible slider step" );
	await settings.evaluate( 'document.getElementById("lp-production-scale-number").focus()' );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 } );
	assert.deepEqual( await settings.evaluate( '[document.getElementById("lp-production-scale").value,document.getElementById("lp-production-scale-number").value]' ), [ "80", "80" ], "Keyboard adjustment matches pointer/typed increments" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await main.evaluate( 'window.electron.applyPreferences({settings:{headingScale:1.1533333333}})' );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 120 );
	assert.equal( await settings.evaluate( 'document.getElementById("lp-heading-scale-number").value' ), "175", "Existing fine precision has a concise display" );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.headingScale, 1.1533333333, "Displaying a rounded control does not alter saved appearance" );
	assert.equal( await settings.evaluate( '[...document.querySelectorAll("input[data-paired-number=true]")].every(x=>x.value===document.getElementById(x.id+"-number").value&&!/\\.\\d{3}/.test(x.value))' ), true, "All paired slider values stay synchronised and within two decimal places" );
	await settings.evaluate( 'document.querySelector("[data-tab=aids]").click()' );
	assert.equal( await settings.evaluate( 'document.getElementById("lp-focus-strength").disabled&&document.getElementById("lp-focus-strength-number").disabled&&!document.getElementById("lp-focus-strength").closest("[data-settings-control]").getClientRects().length' ), true, "Focus strength is unavailable while the focus band is off" );
	const aidShot = async name => {
		if ( !process.env.SIGHTLINE_TEST_ARTIFACTS ) return;
		const shot = await settings.call( "Page.captureScreenshot", { format: "png" } );
		await fs.writeFile( path.join( artifacts, name + ".png" ), Buffer.from( shot.data, "base64" ) );
	};
	await aidShot( "reading-aids-off" );
	await settings.evaluate( '(()=>{document.getElementById("lp-focus-band").click();const n=document.getElementById("lp-focus-strength-number");n.value="65";n.dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("lp-focus-band").click()})()' );
	assert.equal( await settings.evaluate( 'document.getElementById("lp-focus-strength-number").value' ), "65", "Switching the band off retains its strength" );
	await settings.evaluate( 'document.getElementById("lp-focus-band").click()' );
	assert.equal( await settings.evaluate( '!document.getElementById("lp-focus-strength").disabled&&document.getElementById("lp-focus-strength-number").value==="65"&&!!document.getElementById("lp-focus-strength").closest("[data-settings-control]").getClientRects().length' ), true, "Re-enabling the band restores the strength control and value" );
	for ( const id of [ "lp-marker", "lp-sentence", "lp-progress", "lp-focus-band", "lp-focus-strength", "lp-text-effect" ] ) assert.equal( await settings.evaluate( `!!document.getElementById('${ id }').closest('[data-settings-control]').querySelector('button[data-help-text]')` ), true, `Reading aid ${ id } has contextual help` );
	const hover = await settings.evaluate( '(()=>{const b=document.getElementById("lp-focus-band").closest("[data-settings-control]").querySelector("[data-help-text]"),r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:b.getAttribute("aria-controls")}})()' );
	await settings.call( "Input.dispatchMouseEvent", { type: "mouseMoved", x: hover.x, y: hover.y } );
	assert.equal( await settings.evaluate( `document.getElementById('${ hover.id }').matches(':popover-open')` ), true, "The help pill opens on a real pointer hover" );
	await aidShot( "reading-aids-help" );
	await settings.evaluate( 'document.querySelector(".settings-explanation:popover-open").hidePopover()' );
	await aidShot( "reading-aids-on" );
	await settings.evaluate( 'const select=document.querySelector("select[aria-label=\\"Reading aids\\"]");select.value="cues";select.dispatchEvent(new Event("change",{bubbles:true}))' );
	for ( const id of [ "set-highlight-cues", "set-cues-file", "lp-directives" ] ) assert.equal( await settings.evaluate( `!!document.getElementById('${ id }').closest('[data-settings-control]').querySelector('button[data-help-text]')` ), true, `Cue/script option ${ id } has contextual help` );
	await aidShot( "reading-aids-cues" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	await settings.evaluate( 'document.querySelector("[data-tab=mode]").click()' );
	const chooseMode = async value => settings.evaluate( `(()=>{const control=document.getElementById('set-scroll-mode');control.value='${ value }';control.dispatchEvent(new Event('change',{bubbles:true}))})()` );
	const modeControls = () => settings.evaluate( `['lp-follow-pace','set-voice-speed','set-steady-wpm','set-countdown'].filter(id=>document.getElementById(id).closest('[data-settings-control]').getClientRects().length)` );
	assert.deepEqual( await settings.evaluate( '[...document.getElementById("set-scroll-mode").options].map(x=>x.value)' ), [ "notes", "voice", "steady" ], "The three reading modes share one selector" );
	assert.equal( await settings.evaluate( '!document.getElementById("lp-points")&&document.querySelector("#set-scroll-mode option[value=voice]").disabled' ), true, "No competing Notes checkbox; Voice still requires its components" );
	const previousPace = await settings.evaluate( '[document.getElementById("set-steady-wpm").value,document.getElementById("set-countdown").value,document.getElementById("lp-follow-pace").checked]' );
	await settings.evaluate( '(()=>{for(const [id,value] of [["set-steady-wpm",155],["set-countdown",4]]){const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}))}})()' );
	assert.deepEqual( await modeControls(), [ "lp-follow-pace", "set-steady-wpm", "set-countdown" ], "Scroll shows WPM, script pacing and countdown" );
	await aidShot( "mode-scroll" );
	await chooseMode( "notes" );
	assert.deepEqual( await modeControls(), [], "Notes/page has no scrolling or voice-response controls" );
	assert.equal( await settings.evaluate( '["lp-follow-pace","set-voice-speed","set-voice-speed-number","set-steady-wpm","set-steady-wpm-number","set-countdown","set-countdown-number"].every(id=>document.getElementById(id).disabled)' ), true, "Irrelevant controls and paired numbers cannot be edited" );
	await aidShot( "mode-notes" );
	await settings.evaluate( 'document.getElementById("settings-apply").click()' ); await pause( 200 );
	const notesSaved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings;
	assert.deepEqual( [ notesSaved.pointsMode, notesSaved.scrollMode, notesSaved.steadyWpm, notesSaved.countdown ], [ true, "steady", 155, 4 ], "Applying Notes preserves its prior scroll mode and pace values" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	assert.equal( await settings.evaluate( 'document.getElementById("set-scroll-mode").value' ), "notes", "Saved Notes mode is restored when reopening Settings" );
	await settings.evaluate( 'document.getElementById("set-speech-enabled").click();document.getElementById("set-microphone-enabled").click()' );
	await chooseMode( "voice" );
	assert.deepEqual( await modeControls(), [ "set-voice-speed" ], "Voice shows response without ignored WPM/countdown controls" );
	await settings.evaluate( '(()=>{const response=document.getElementById("set-voice-speed");response.value=125;response.dispatchEvent(new Event("input",{bubbles:true}))})()' );
	await aidShot( "mode-voice" );
	await chooseMode( "notes" ); await chooseMode( "steady" );
	assert.deepEqual( await settings.evaluate( '[document.getElementById("set-steady-wpm").value,document.getElementById("set-countdown").value,document.getElementById("set-voice-speed").value]' ), [ "155", "4", "125" ], "Switching between all three modes retains their draft values" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	assert.equal( await settings.evaluate( 'document.getElementById("set-scroll-mode").value' ), "notes", "Cancel restores the applied mode, including its Notes flag" );
	await chooseMode( "steady" );
	await settings.evaluate( `(()=>{for(const [id,value] of [['set-steady-wpm','${ previousPace[0] }'],['set-countdown','${ previousPace[1] }']]){const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}})()` );
	await settings.evaluate( 'document.getElementById("settings-apply").click()' ); await pause( 200 );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.pointsMode, false, "Returning to Scroll clears Notes mode on Apply" );
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
	await settings.evaluate( 'document.querySelector(".settings-workspace [data-preview-reading=true]").click()' );
	assert.equal( await settings.evaluate( 'document.querySelector(".settings-workspace [data-sample=production]").hidden' ), true, "Reading example hides production notes" );
	assert.equal( await main.evaluate( 'document.getElementById("cb-play").getAttribute("aria-pressed")' ), "false", "Preview example never starts actual prompting" );
	await settings.evaluate( 'document.querySelector(".settings-workspace [data-preview-reading=false]").click();const search=document.querySelector(".settings-search input");search.value="comments";search.dispatchEvent(new Event("input"));document.querySelector(".settings-search-results button").click()' );
	assert.equal( await settings.evaluate( 'document.querySelector("[data-settings-page=typography]").hidden' ), false, "Header search opens the real permanent section" );
	if ( process.env.SIGHTLINE_SCREENSHOT_GALLERY === "1" ) {
		await settings.evaluate( 'document.querySelector("[data-text-target=production]").click();const head=document.getElementById("lp-heading-scale");head.value=125;head.dispatchEvent(new Event("input",{bubbles:true}))' );
		for ( const name of [ "checklist", "typography", "background", "pad" ] ) {
			await settings.evaluate( `document.querySelector('[data-tab="${ name }"]').click();document.activeElement?.blur()` );
			const shot = await settings.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( artifacts, `layout-signed-off-${ name }.png` ), Buffer.from( shot.data, "base64" ) );
		}
		await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
		await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	}
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click();document.getElementById("appearance-script-italic").click()' );
	await native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('panel=settings')).close()" ); await pause( 100 );
	assert.equal( await settings.evaluate( 'document.getElementById("settings-unsaved").classList.contains("hidden")' ), false, "Native Close preserves an unapplied draft and opens its guard" );
	await settings.evaluate( 'document.getElementById("settings-unsaved-keep").click();const help=document.querySelector("#set-reading-host [data-help-text]");help.focus();help.click()' );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
	assert.equal( await settings.evaluate( 'document.querySelectorAll(".settings-explanation:popover-open").length' ), 0 );
	assert.equal( await settings.evaluate( 'document.getElementById("settings-modal").classList.contains("hidden")' ), false, "The first Escape dismisses help without closing Settings" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	await settings.evaluate( 'document.querySelector("[data-tab=mappings]").click();const on=document.getElementById("set-keyboard-mappings");on.checked=true;on.dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("set-map-action").value="mirror-h";document.getElementById("set-map-learn").focus();document.getElementById("set-map-learn").click()' );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "j", code: "KeyJ", windowsVirtualKeyCode: 74 } );
	await settings.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "j", code: "KeyJ", windowsVirtualKeyCode: 74 } );
	assert.equal( await settings.evaluate( 'document.getElementById("set-map-notice").textContent.includes("assigned to")' ), true );
	await settings.evaluate( 'document.getElementById("settings-apply").click()' ); await pause( 300 );
	const keyed = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.ok( keyed.settings.inputMappings.some( row => row.kind === "key" && row.code === "KeyJ" && row.action === "mirror-h" ), "Learned keys persist through Apply" );
	await settings.evaluate( '[...document.querySelectorAll("[data-interface-master] input")].forEach(x=>{x.checked=true;x.dispatchEvent(new Event("change",{bubbles:true}))})' );
	await settings.evaluate( 'document.querySelector("[data-tab=pad]").click();document.getElementById("set-pad-add").value="marker";document.getElementById("set-pad-insert").click()' );
	assert.equal( await settings.evaluate( 'document.querySelector("#set-pad-buttons .selected").textContent.includes("Marker")' ), true, "New pad actions have a named selection" );
	await settings.evaluate( '[...document.querySelectorAll("#set-pad-buttons .selected button")].find(x=>x.textContent==="Earlier").click()' );
	assert.equal( await settings.evaluate( '!!document.querySelector("#set-pad-buttons .selected")' ), true );
	await main.evaluate( 'globalThis.savedSettingsGamepads=navigator.getGamepads;globalThis.settingsButtonDown=false;navigator.getGamepads=()=>[{id:"Fixture controller",index:0,connected:true,buttons:[{pressed:settingsButtonDown,value:settingsButtonDown?1:0}],axes:[]}]' );
	await settings.evaluate( 'document.querySelector("[data-tab=gamepad]").click();document.getElementById("set-gamepad-map-action").value="marker";document.getElementById("set-gamepad-map-learn").click()' );
	await settings.call( "Page.bringToFront" ); await pause( 80 );
	await main.evaluate( 'globalThis.settingsButtonDown=true' ); await pause( 150 );
	assert.equal( await settings.evaluate( 'document.getElementById("set-gamepad-map-notice").textContent.includes("assigned to")' ), true, "Game controller has a working independent learning route" );
	await main.evaluate( 'navigator.getGamepads=globalThis.savedSettingsGamepads' );
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click();const size=document.getElementById("set-font-size");size.value=325;size.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-tab=pad]").click()' );
	assert.equal( await settings.evaluate( 'document.querySelector("#set-pad-buttons .selected").textContent.includes("Marker")' ), true, "Appearance previews retain unapplied pad edits" );
	await main.evaluate( 'globalThis.originalSettingsMedia=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{globalThis.settingsToneContext=new AudioContext();const tone=settingsToneContext.createOscillator(),output=settingsToneContext.createMediaStreamDestination();tone.connect(output);tone.start();globalThis.settingsMeterStream=output.stream;return output.stream}' );
	await settings.evaluate( 'document.querySelector("[data-tab=microphone]").click();document.getElementById("set-microphone-test").click()' ); await pause( 120 );
	assert.equal( await main.evaluate( 'globalThis.settingsMeterStream.getAudioTracks()[0].readyState' ), "live", "Selected-input meter opens only on explicit Test" );
	await settings.evaluate( 'document.querySelector("[data-tab=mode]").click()' );
	assert.equal( await main.evaluate( 'globalThis.settingsMeterStream.getAudioTracks()[0].readyState' ), "ended", "Leaving Microphone stops the temporary input" );
	await main.evaluate( 'navigator.mediaDevices.getUserMedia=globalThis.originalSettingsMedia;settingsToneContext.close()' );
	const sections = await settings.evaluate( '[...document.querySelectorAll(".settings-subtabs [data-tab]")].map(x=>x.dataset.tab)' );
	const overflow = [];
	for ( const name of sections ) {
		await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab="${ name }"]').click()` ); await pause( 30 );
		const clipped = await settings.evaluate( `(()=>{const panel=document.querySelector('[data-settings-page="${ name }"]'), floor=document.querySelector('.settings-actions').getBoundingClientRect().top;return [...panel.querySelectorAll('button,input,select,p,fieldset')].filter(x=>x.getClientRects().length&&!x.closest('[hidden],.hidden')).filter(x=>x.getBoundingClientRect().bottom>floor||x.getBoundingClientRect().right>innerWidth).map(x=>({id:x.id||x.className,text:x.innerText?.slice(0,45),bottom:Math.round(x.getBoundingClientRect().bottom)}))})()` );
		if ( clipped.length ) overflow.push( { name, clipped } );
	}
	console.log( "Overflow:", JSON.stringify( overflow ) );
	assert.deepEqual( overflow, [], "Every desktop section fits above the footer" );
	const resize = ( width, height ) => native.evaluate( `process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('panel=settings')).setContentSize(${ width },${ height })` );
	for ( const [ width, height ] of [ [ 1024, 600 ], [ 680, 600 ], [ 576, 539 ], [ 560, 500 ] ] ) {
		await resize( width, height ); await pause( 120 );
		const failures = [];
		for ( const name of sections ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab="${ name }"]').click()` );
			const spill = await settings.evaluate( `(()=>{const panel=document.querySelector('[data-settings-page="${ name }"]'),floor=document.querySelector('.settings-actions').getBoundingClientRect().top;return [...panel.querySelectorAll('input,select,button,p,fieldset')].filter(x=>x.getClientRects().length&&!x.closest('[hidden],.hidden')).filter(x=>x.getBoundingClientRect().bottom>floor||x.getBoundingClientRect().right>innerWidth).map(x=>x.id||x.className)})()` );
			if ( spill.length ) failures.push( [ name, spill ] );
		}
		console.log( `Compact ${ width }×${ height }: ${ JSON.stringify( failures ) }` );
		assert.deepEqual( failures, [], `Every section fits at ${ width }×${ height }` );
		assert.equal( await settings.evaluate( '!!document.querySelector(".settings-compact-nav").getClientRects().length&&!document.querySelector(".settings-navigation").getClientRects().length&&!document.querySelector(".settings-workspace > .settings-preview-pane").getClientRects().length' ), true, "Compact selectors and Preview action follow the approved responsive composition" );
		await settings.evaluate( 'document.querySelector(".settings-open-preview").click()' );
		const detached = await connect( "utility-window.html?panel=preview" ); await pause( 150 );
		await detached.evaluate( 'document.querySelector("[data-preview-reading=true]").click()' );
		assert.equal( await detached.evaluate( '!document.querySelector(".settings-floating-preview").hidden&&document.querySelector("[data-sample=production]").hidden' ), true, "Detached example uses the same Reading state" );
		assert.equal( await settings.evaluate( '!document.querySelector("dialog:modal")' ), true, "Preview never makes Settings modal or inert" );
		assert.equal( await native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('panel=preview')).isModal()" ), false );
		await settings.evaluate( 'document.querySelector("[data-tab=typography]").click();document.querySelector("[data-text-target=script]").click()' );
		const originalWeight = await detached.evaluate( 'document.querySelector("[data-sample=script]").style.fontWeight' );
		const boldPoint = await settings.evaluate( '(()=>{const r=document.getElementById("appearance-script-bold").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()' );
		await settings.call( "Page.bringToFront" );
		for ( const type of [ "mousePressed", "mouseReleased" ] ) await settings.call( "Input.dispatchMouseEvent", { type, button: "left", clickCount: 1, ...boldPoint } );
		assert.notEqual( await detached.evaluate( 'document.querySelector("[data-sample=script]").style.fontWeight' ), originalWeight, "Settings accepts a real pointer click and updates the still-open preview" );
		await settings.evaluate( 'document.getElementById("appearance-script-bold").click()' );
		assert.equal( await detached.evaluate( '(()=>{const b=document.querySelector(".settings-preview-close"),r=b.getBoundingClientRect();return parseFloat(getComputedStyle(b).fontSize)===13&&r.height<=34&&r.width<150&&r.bottom<=innerHeight})()' ), true, "Close uses a standard control size independent of prompter text" );
		if ( width === 1024 && process.env.SIGHTLINE_TEST_ARTIFACTS ) {
			const shot = await detached.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( artifacts, "floating-preview.png" ), Buffer.from( shot.data, "base64" ) );
		}
		await detached.call( "Page.bringToFront" );
		await detached.evaluate( 'document.body.tabIndex=-1;document.body.focus()' );
		await detached.call( "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
		await detached.call( "Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 } );
		assert.equal( await detached.evaluate( 'document.querySelector(".settings-floating-preview").hidden' ), true, "Escape hides only the detached preview" );
		assert.equal( await settings.evaluate( '!document.getElementById("settings-modal").classList.contains("hidden")' ), true, "Settings stays open with its draft intact" );
		await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
		for ( const target of [ "script", "headings", "inline", "production" ] ) {
			await settings.evaluate( `document.querySelector('[data-text-target="${ target }"]').click()` );
			assert.equal( await settings.evaluate( 'document.querySelector("#set-reading-host").getBoundingClientRect().bottom<=document.querySelector(".settings-actions").getBoundingClientRect().top' ), true, `${ target } fits at ${ width }×${ height }` );
		}
	}
	await settings.evaluate( 'document.querySelector(".settings-open-preview").click()' ); await pause( 100 );
	const previewWindow = await connect( "utility-window.html?panel=preview" );
	await native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('panel=preview')).setBounds({width:300,height:360})" ); await pause( 100 );
	assert.equal( await previewWindow.evaluate( '(()=>{const close=document.querySelector(".settings-preview-close").getBoundingClientRect();return close.bottom<=innerHeight&&close.right<=innerWidth&&document.body.scrollHeight<=innerHeight})()' ), true, "The minimum-size preview keeps its close control inside its frame" );
	await native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('panel=preview')).close()" ); await pause( 120 );
	assert.equal( await previewWindow.evaluate( 'document.querySelector(".settings-floating-preview").hidden' ), true, "Native X closes only the preview" );
	assert.equal( await settings.evaluate( '!document.getElementById("settings-modal").classList.contains("hidden")' ), true );
	await resize( 1064, 691 );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' ); await pause( 100 );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 150 );
	await settings.evaluate( 'document.querySelector("[data-tab=background]").click();const theme=document.getElementById("lp-theme");theme.value="cream";theme.dispatchEvent(new Event("change",{bubbles:true}));const opacity=document.getElementById("lp-bg-opacity");opacity.value=50;opacity.dispatchEvent(new Event("input",{bubbles:true}))' );
	assert.equal( await main.evaluate( 'getComputedStyle(document.body).backgroundColor' ), "rgba(245, 237, 220, 0.5)", "Theme background and opacity preview the actual script window" );
	assert.equal( await settings.evaluate( 'document.getElementById("lp-bg-opacity").value' ), "50", "Background slider remains in percentage units" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	assert.equal( await main.evaluate( 'getComputedStyle(document.body).backgroundColor' ), "rgb(0, 0, 0)", "Cancel restores backing colour and opacity together" );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	const exportPath = path.join( profile, "reading-theme.sightline-theme.json" );
	await native.evaluate( `(()=>{const e=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');e.dialog.showSaveDialog=async()=>({canceled:false,filePath:${ JSON.stringify( exportPath ) }});e.dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${ JSON.stringify( exportPath ) }]});})()` );
	await settings.evaluate( 'document.querySelector("[data-tab=background]").click();[...document.querySelectorAll("#set-theme-host button")].find(x=>x.textContent==="Save current as…").click();document.getElementById("reading-theme-name").value="Studio reading";document.getElementById("reading-theme-copy").checked=true;document.querySelector(".reading-theme-dialog form").requestSubmit()' ); await pause( 450 );
	const theme = JSON.parse( await fs.readFile( exportPath, "utf8" ) );
	assert.equal( theme.schema, "sightline-reading-theme" ); assert.equal( theme.name, "Studio reading" ); assert.deepEqual( Object.keys( theme ).sort(), [ "schema", "version", "id", "name", "baseTheme", "text", "background" ].sort() );
	assert.equal( await settings.evaluate( 'document.querySelector(".reading-theme-dialog").open' ), false );
	await settings.evaluate( '[...document.querySelectorAll("#set-theme-host button")].find(x=>x.textContent==="Import theme…").click()' ); await pause( 350 );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.readingThemes.length, 2, "Theme file imports into the durable library" );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	assert.equal( JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) ).settings.readingThemes.length, 2, "Cancel does not delete explicitly saved/imported themes" );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
	await settings.evaluate( 'document.querySelector("[data-text-target=production]").click();const x=document.getElementById("lp-production-scale");x.value=75;x.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("appearance-production-italic").click()' );
	assert.equal( await main.evaluate( 'getComputedStyle(document.querySelector(".production-note")).fontStyle' ), "italic" );
	await settings.evaluate( 'document.getElementById("settings-apply").click()' ); await pause( 500 );
	assert.equal( await settings.evaluate( 'document.getElementById("settings-applied").textContent' ), "Saved", "Apply is acknowledged by the main process" );
	const saved = JSON.parse( await fs.readFile( path.join( profile, "app-state.json" ), "utf8" ) );
	assert.equal( saved.settings.productionNoteItalic, true ); assert.ok( Math.abs( saved.settings.productionNoteScale - 75 / 55 ) < .001 ); assert.equal( saved.settings.microphoneEnabled, false, "Cancelled service toggles stayed off" );
	await settings.evaluate( 'document.getElementById("appearance-production-italic").click();document.getElementById("settings-cancel").click()' ); await pause( 150 );
	assert.equal( await main.evaluate( 'getComputedStyle(document.querySelector(".production-note")).fontStyle' ), "italic", "Cancel restores the applied appearance" );
	await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 150 );
	if ( process.env.SIGHTLINE_SCREENSHOT_GALLERY === "1" ) {
		await settings.evaluate( '[...document.querySelectorAll("[data-interface-master] input")].forEach(x=>{x.checked=true;x.dispatchEvent(new Event("change",{bubbles:true}))})' );
		for ( const name of sections ) {
			await settings.evaluate( `document.querySelector('.settings-subtabs [data-tab="${ name }"]').click()` ); await pause( 60 );
			const screenshot = await settings.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( artifacts, `settings-preview05-${ name }.png` ), Buffer.from( screenshot.data, "base64" ) );
		}
		await settings.evaluate( 'document.querySelector("[data-tab=typography]").click()' );
		for ( const target of [ "script", "headings", "inline", "production" ] ) {
			await settings.evaluate( `document.querySelector('[data-text-target="${ target }"]').click()` );
			const screenshot = await settings.call( "Page.captureScreenshot", { format: "png" } );
			await fs.writeFile( path.join( artifacts, `settings-preview05-text-${ target }.png` ), Buffer.from( screenshot.data, "base64" ) );
		}
		await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
		await main.evaluate( 'document.getElementById("cb-settings").click()' ); await pause( 100 );
	}
	const image = await settings.call( "Page.captureScreenshot", { format: "png" } ); await fs.writeFile( path.join( artifacts, "01-settings.png" ), Buffer.from( image.data, "base64" ) );
	await settings.evaluate( 'document.getElementById("settings-cancel").click()' );
	await native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('teleprompter.html')).setContentSize(480,300)" );
	await main.evaluate( 'document.getElementById("cb-tools").click()' );
	const tools = await connect( "utility-window.html?panel=tools" ); await pause( 100 );
	assert.equal( await tools.evaluate( '!!document.querySelector("#tools-panel.tools-redesign")&&!document.querySelector("#tools-panel").classList.contains("hidden")' ), true, "Tools uses its own window when the prompter is too short" );
	assert.equal( await tools.evaluate( 'document.querySelector("#tools-panel").getBoundingClientRect().bottom<=innerHeight' ), true, "Floating Tools stays within its frame" );
	await tools.evaluate( 'document.querySelector("[data-tool-action=typography]").click()' ); await pause( 150 );
	assert.equal( await settings.evaluate( 'document.querySelector("[data-settings-page=typography]").hidden' ), false, "Tools can reopen the permanent typography controls" );
	assert.equal( await settings.evaluate( 'document.querySelectorAll("#lp-production-colour").length' ), 1 );
	await main.evaluate( 'window.electron.saveSettings({hideFromCapture:true})' ); await pause( 150 );
	const protectedWindows = () => native.evaluate( "process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').BrowserWindow.getAllWindows().map(w=>({url:w.webContents.getURL(),protected:w.isContentProtected()}))" );
	assert.ok( ( await protectedWindows() ).every( item => item.protected ), "Reading, Settings and the new Tools window request capture exclusion together" );
	await main.evaluate( 'window.electron.setCaptureOverride(true);document.getElementById("cb-help").click()' ); await pause( 200 );
	const help = await connect( "utility-window.html?panel=help" );
	assert.equal( await help.evaluate( '!!document.getElementById("help-modal")||!!document.getElementById("help-list")' ), true );
	assert.ok( ( await protectedWindows() ).every( item => !item.protected ), "The session override includes existing and newly created utility windows" );
	await main.evaluate( 'window.electron.setCaptureOverride(false)' ); await pause( 100 );
	assert.ok( ( await protectedWindows() ).every( item => item.protected ), "Turning off the override restores the saved protection requests" );
	console.log( "Settings:", await settings.evaluate( '({size:[innerWidth,innerHeight], sections:document.querySelectorAll("[data-settings-page]").length, visible:[...document.querySelectorAll("[data-settings-page]")].filter(x=>!x.hidden).map(x=>x.dataset.settingsPage)})' ) );
	assert.deepEqual( errors, [] );
	console.log( `Native settings smoke passed. Screenshots: ${ artifacts }` );
} finally {
	for ( const socket of sockets ) socket.close();
	await new Promise( resolve => { const stop = spawn( "taskkill", [ "/PID", String( child.pid ), "/T", "/F" ], { windowsHide: true, stdio: "ignore" } ); stop.on( "exit", resolve ); stop.on( "error", resolve ); } );
}
