import { framingPose, framingMatch, detectedPose, detectedFramingTarget, visibleFramingTarget, audioCheckAdvice } from "./framing-position.js";
import { guideOutline } from "./guide-pose.js";
import { PREPARATION_COMMANDS, preparationBlockReason } from "./controller-workflow.js";

const $ = id => document.getElementById( id );
const copy = value => JSON.parse( JSON.stringify( value ) );
const config = await window.preRecord.load();
let saved = config.reference;
try {
	if ( saved ) framingPose( saved.target );
} catch {
	saved = null;
}
let cameraStream = null, microphoneStream = null, audioContext = null, analyser = null;
let worker = null, workerReady = false, workerBusy = false, frameTimer = null, lastDetection = 0;
let recorder = null, recordTimer = null, testURL = null, testBlob = null, measuringTimer = null;
let generation = 0, disposed = false;
let cameraConnecting = false, cameraError = "";
let shared = config.shared ?? { target: config.guide, source: "camera", scene: "", obs: { available: false, scenes: [] } };
let inputSource = shared.obs.available ? shared.source : "camera", obsTimer = null, obsGeneration = 0, captureGeneration = 0;
const draft = () => window.preRecord.input( "draft", state.target ).catch( error => say( error.message ) );
function renderInput() {
	$( "calibration-source-field" ).hidden = !shared.obs.available;
	$( "calibration-source" ).value = inputSource;
	$( "obs-scene-field" ).hidden = !shared.obs.available || inputSource !== "obs";
	if ( JSON.stringify( [ ...$( "obs-scene" ).options ].slice( 1 ).map( item => item.value ) ) !== JSON.stringify( shared.obs.scenes ?? [] ) ) $( "obs-scene" ).replaceChildren( new Option( "Choose an OBS scene", "" ), ...( shared.obs.scenes ?? [] ).map( name => new Option( name, name ) ) );
	$( "obs-scene" ).value = shared.scene;
	$( "camera-device" ).parentElement.hidden = inputSource === "obs";
	$( "refresh-obs-scenes" ).disabled = !shared.obs.connected;
	$( "obs-calibration-status" ).hidden = inputSource !== "obs" || shared.obs.connected;
	document.querySelector( ".camera-head strong" ).textContent = inputSource === "obs" ? "OBS scene preview · 16:9" : "Camera preview · 16:9";
}
async function stopInput() {
	captureGeneration++;
	obsGeneration++;
	clearInterval( obsTimer ); obsTimer = null;
	if ( cameraStream ) await connectCamera();
	await window.preRecord.input( "virtual-stop" ).catch( () => {} );
}
async function obsStream() {
	if ( !shared.scene ) throw new Error( "Choose the OBS scene to calibrate" );
	const canvas = document.createElement( "canvas" ); canvas.width = 640; canvas.height = 360;
	const context = canvas.getContext( "2d" ), epoch = ++obsGeneration;
	let reading = false;
	const paint = async () => {
		if ( reading || epoch !== obsGeneration || disposed ) return;
		reading = true;
		try {
			const uri = await window.preRecord.input( "obs-frame" );
			const picture = new Image(); picture.src = uri; await picture.decode();
			if ( epoch !== obsGeneration || disposed ) return;
			const ratio = picture.width / picture.height, w = ratio > 16 / 9 ? picture.height * 16 / 9 : picture.width, h = ratio > 16 / 9 ? picture.height : picture.width * 9 / 16;
			context.drawImage( picture, ( picture.width - w ) / 2, ( picture.height - h ) / 2, w, h, 0, 0, 640, 360 );
		} catch ( error ) {
			state.person = null; state.error = error.message;
			if ( cameraStream && epoch === obsGeneration ) { await stopInput(); cameraError = state.error = error.message; render(); }
			throw error;
		} finally { reading = false; }
	};
	await paint();
	obsTimer = setInterval( () => paint().catch( () => {} ), 350 );
	return canvas.captureStream( 3 );
}
const state = { step: 0, mode: "setup", tracking: false, mirror: true, person: null, target: copy( config.guide ?? { x: 0, y: 0, size: 100 } ), manualConfirmed: false, framingAccepted: false, audio: null, audioAccepted: false, audioOverride: false, measuring: false, testState: "idle", testSeconds: 0, testApproved: false, testReviewed: false, testPicture: false, testSound: false, referenceSaved: false, microphoneId: config.microphoneId || "default", cameraId: "default", camera: null, testFile: null, error: "" };
const names = [ "Align head", "Check audio", "Test recording", "Save reference", "Ready" ];
state.cameraId = shared.cameraId ?? "default";
const colours = { green: "#72dfad", amber: "#edc766", red: "#ff8585", lost: "#a7b2c0", manual: "#89c4ff" };
let lastControllerStatus = "";
function controllerStatus() {
	const frame = match();
	return { open: true, hasReference: !!saved || !!shared.reference, measuring: state.measuring, frame: { kind: frame.kind, text: frame.text, aligned: frame.aligned },
		testRecording: state.testState === "recording", testSaving: state.testState === "saving",
		canLock: state.tracking && !!state.person && performance.now() - lastDetection < 1400,
		canTest: !!cameraStream && !!microphoneStream && match().aligned && state.framingAccepted && state.audioAccepted,
		canPlay: !!testURL || !!saved?.testFile,
		canSave: match().aligned && state.framingAccepted && state.audioAccepted && state.testApproved };
}
function reportControllerStatus() {
	const value = controllerStatus(), signature = JSON.stringify( value );
	if ( signature !== lastControllerStatus ) { lastControllerStatus = signature; window.preRecord.report( { workflow: value } ); }
}
function say( text ) {
	$( "message" ).textContent = text;
}
function match() {
	if ( !cameraStream ) return { kind: "lost", aligned: false, arrow: "—", text: "Camera is off", detail: "Enable a camera or virtual-camera feed to check your framing." };
	if ( state.mode === "return" && saved && ( state.camera?.deviceId !== saved.camera.deviceId || state.camera?.width !== saved.camera.width || state.camera?.height !== saved.camera.height ) ) return { kind: "lost", aligned: false, arrow: "—", text: "Camera setup has changed", detail: "Use the saved camera and resolution, or choose New setup to establish a new reference." };
	return framingMatch( performance.now() - lastDetection < 1400 ? state.person : null, visibleFramingTarget( state.target, shared.pose ), { enabled: state.tracking, manual: state.manualConfirmed, mirror: state.mirror } );
}
function ready() {
	return match().aligned && state.framingAccepted && state.audioAccepted && state.testApproved && state.referenceSaved;
}
function invalidate() {
	if ( state.testApproved ) window.preRecord.report( { test: { state: "stale" } } );
	state.manualConfirmed = false;
	state.framingAccepted = false;
	state.testApproved = false;
	state.referenceSaved = false;
}
function allowed( index ) {
	if ( [ "recording", "saving" ].includes( state.testState ) || state.measuring ) return index === state.step;
	return index === 0 || ( index === 1 && state.framingAccepted ) || ( index === 2 && state.framingAccepted && state.audioAccepted ) || ( index === 3 && state.testApproved ) || ( index === 4 && ready() );
}
function go( index ) {
	state.step = index;
	render();
}
function deviceOptions( kind, selected ) {
	const devices = knownDevices.filter( d => d.kind === kind );
	return devices.map( ( d, i ) => `<option value="${ escape( d.deviceId ) }" ${ d.deviceId === selected ? "selected" : "" }>${ escape( d.label || `${ kind === "audioinput" ? "Microphone" : "Camera" } ${ i + 1 }` ) }</option>` ).join( "" ) || "<option value=\"default\">Default device</option>";
}
function escape( value ) {
	return String( value ).replaceAll( "&", "&amp;" ).replaceAll( "<", "&lt;" ).replaceAll( "\"", "&quot;" );
}
let knownDevices = [];
async function listDevices() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	if ( disposed ) return;
	knownDevices = devices;
	const cameras = knownDevices.filter( d => d.kind === "videoinput" );
	$( "camera-device" ).innerHTML = '<option value="default">Default camera</option>' + ( cameras.length ? deviceOptions( "videoinput", state.cameraId ) : "" );
	if ( state.cameraId !== "default" && !cameras.some( d => d.deviceId === state.cameraId ) ) $( "camera-device" ).insertAdjacentHTML( "beforeend", `<option value="${ escape( state.cameraId ) }">Selected camera unavailable</option>` );
	$( "camera-device" ).value = state.cameraId;
	window.preRecord.report( { inputs: cameras.map( camera => ( { deviceId: camera.deviceId, label: camera.label } ) ), cameraId: state.cameraId } );
}
function renderSteps() {
	reportControllerStatus();
	const done = [ state.framingAccepted && match().aligned, state.audioAccepted, state.testApproved, state.referenceSaved, ready() ];
	$( "steps" ).innerHTML = names.map( ( name, i ) => `<li><button type="button" class="step ${ done[i] ? "done" : "" }" data-step="${ i }" ${ i === state.step ? "aria-current=\"step\"" : "" } ${ allowed( i ) ? "" : "disabled" }><span class="number">${ done[i] ? "✓" : i + 1 }</span><span><strong>${ state.mode === "return" && i === 3 ? "Saved reference" : name }</strong><small>${ done[i] ? "Checked" : i === state.step ? "Current step" : "To check" }</small></span></button></li>` ).join( "" );
	$( "session-chip" ).className = "chip " + ( ready() ? "good" : "neutral" );
	$( "session-chip" ).innerHTML = "<i class=\"dot\"></i>" + ( ready() ? "Ready to record" : state.mode === "return" ? "Matching previous shots" : "Setup in progress" );
	$( "saved-summary" ).textContent = saved ? "Reference saved " + new Date( saved.savedAt ).toLocaleString( "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } ) + "." : "No recording reference saved yet.";
	$( "return-break" ).disabled = !saved || state.testState === "recording" || state.measuring;
	$( "new-setup" ).disabled = [ "recording", "saving" ].includes( state.testState ) || state.measuring;
	$( "mode-title" ).textContent = state.mode === "return" ? "Return to your recorded position" : "Set up your recording";
	$( "mode-copy" ).textContent = state.mode === "return" ? "Your saved target stays fixed. Realign, then recheck audio before continuing." : "Align your head, check your audio and review a short test. Save the setup once you’re happy.";
}
function renderCamera() {
	reportControllerStatus();
	const m = match(), colour = colours[m.kind];
	$( "camera" ).style.setProperty( "--signal", colour );
	const mirrored = state.mirror ? "translate(1000 0) scale(-1 1)" : "";
	const transform = `translate(${ state.target.x * 10 } ${ state.target.y * 5.625 }) translate(500 169) scale(${ state.target.size / 100 }) translate(-500 -169)`;
	$( "camera-video" ).style.transform = state.mirror ? "scaleX(-1)" : "";
	$( "target-space" ).setAttribute( "transform", mirrored );
	$( "target" ).setAttribute( "transform", transform );
	if ( shared.pose ) {
		const shape = guideOutline( shared.pose );
		for ( const group of [ $( "target" ), $( "mask-hole" ) ] ) {
			const ellipse = group.querySelector( "ellipse" ), path = group.querySelector( "path" );
			for ( const [ key, value ] of Object.entries( { cx: 500 + ( shape.cx - 500 ) * shared.pose.width, cy: 169 + ( shape.cy - 155 ) * shared.pose.height, rx: shape.rx * shared.pose.width, ry: shape.ry * shared.pose.height } ) ) ellipse.setAttribute( key, value );
			path.setAttribute( "d", shape.shoulders );
			path.setAttribute( "transform", `translate(0 14) translate(500 155) scale(${ shared.pose.width } ${ shared.pose.height }) translate(-500 -155)` );
		}
	}
	$( "mask-hole" ).setAttribute( "transform", `${ mirrored } ${ transform }` );
	$( "target-label" ).setAttribute( "transform", state.mirror ? "translate(1000 0) scale(-1 1)" : "" );
	$( "target-label" ).textContent = state.mode === "return" || state.referenceSaved ? "Saved recording reference" : "Recording target";
	$( "mask-tint" ).setAttribute( "fill", colour );
	$( "mask-tint" ).setAttribute( "opacity", m.kind === "manual" || m.kind === "lost" ? ".08" : ".15" );
	$( "direction-arrow" ).textContent = m.arrow;
	$( "direction-text" ).textContent = m.text;
	$( "direction-detail" ).textContent = state.error || m.detail;
	$( "guidance" ).style.borderLeftColor = colour;
	$( "framing-chip" ).className = "chip " + ( { green: "good", amber: "warn", red: "bad", lost: "neutral", manual: "neutral" }[m.kind] );
	$( "framing-chip" ).innerHTML = "<i class=\"dot\"></i>" + ( { green: "Framing aligned", amber: "Near tolerance limit", red: "Outside reference", lost: "Tracking unavailable", manual: "Manual guide" }[m.kind] );
	$( "reference-type" ).textContent = state.mode === "return" || state.referenceSaved ? "Target: saved recording" : "Target: manual / locked";
	for ( const [ id, difference, label ] of [ [ "metric-x", m.dx, "from centre" ], [ "metric-y", m.dy, "from eye line" ], [ "metric-size", m.ds, "size difference" ] ] ) $( id ).textContent = difference == null ? "Manual check" : Math.abs( difference ) <= ( id === "metric-size" ? 5 : 2 ) ? "Within tolerance" : `${ Math.round( Math.abs( difference ) ) }% ${ label }`;
	$( "reference-note" ).textContent = state.mode === "return" ? "The original reference stays fixed. Choose New setup to establish a different recording position." : "Detection supplements the manual guide. The outline approximates head placement; it does not trace hair.";
	$( "camera-video" ).hidden = !cameraStream;
	$( "camera-empty" ).hidden = !!cameraStream;
	$( "camera-svg" ).toggleAttribute( "hidden", !cameraStream );
	$( "connect-camera" ).textContent = cameraConnecting ? "Opening camera…" : cameraStream ? "Turn camera off" : "Enable camera";
	$( "connect-camera" ).disabled = cameraConnecting || [ "recording", "saving" ].includes( state.testState );
	$( "camera-device" ).disabled = cameraConnecting || [ "recording", "saving" ].includes( state.testState );
	$( "connect-camera" ).textContent = cameraConnecting ? "Opening picture…" : cameraStream ? "Turn picture off" : inputSource === "obs" ? "Enable OBS preview" : "Enable camera";
	$( "calibration-source" ).disabled = $( "camera-device" ).disabled;
	$( "obs-scene" ).disabled = $( "camera-device" ).disabled;
	if ( inputSource === "obs" && ( !shared.scene || !shared.obs.connected ) ) $( "connect-camera" ).disabled = true;
	window.preRecord.report( { feedback: { enabled: state.tracking, active: !!cameraStream, person: performance.now() - lastDetection < 1400 ? state.person : null, mirror: state.mirror, error: cameraError || state.error || ( !cameraStream ? "Enable the selected calibration picture." : "" ) } } );
	$( "camera-status" ).textContent = cameraError || ( cameraConnecting ? "Opening the selected camera. Capture starts only after your request." : "" );
	$( "camera-status" ).hidden = !cameraError && !cameraConnecting;
	$( "camera-status" ).className = cameraError ? "note danger" : "note";
	const accept = $( "accept-frame" );
	if ( accept ) accept.disabled = !m.aligned;
	const record = $( "record-test" );
	if ( record ) record.disabled = !m.aligned || !microphoneStream;
}
function guideControls() {
	return [ [ "x", "Guide left / right", -45, 45 ], [ "y", "Guide up / down", -45, 45 ], [ "size", "Guide head size", 40, 200 ] ].map( ( [ key, label, min, max ] ) => `<label class="range-row" for="guide-${ key }"><span>${ label }</span><input id="guide-${ key }" data-guide="${ key }" type="range" min="${ min }" max="${ max }" step="1" value="${ Math.round( state.target[key] ) }" ${ state.mode === "return" ? "disabled" : "" }><output>${ Math.round( state.target[key] ) }%</output></label>` ).join( "" );
}
function referenceData() {
	const a = state.audio ?? saved?.audio;
	return "<dl class=\"reference-data\">" + [ [ "Eye centre", Math.round( state.target.x ) + "% offset" ], [ "Eye height", Math.round( state.target.y ) + "% offset" ], [ "Apparent size", Math.round( state.target.size ) + "%" ], [ "Camera / crop", `${ escape( state.camera?.label ?? saved?.camera?.label ?? "Camera" ) } · 16:9` ], [ "Voice baseline", `${ a?.voice?.toFixed( 1 ) ?? "—" } dBFS` ], [ "Room baseline", `${ a?.noise?.toFixed( 1 ) ?? "—" } dBFS` ] ].map( ( [ label, value ] ) => `<div><dt>${ label }</dt><dd>${ value }</dd></div>` ).join( "" ) + "</dl>";
}
function panel() {
	let html = `<div class="step-label">${ state.step + 1 } of 5 · ${ state.mode === "return" ? "Match previous shots" : "Prepare to record" }</div>`;
	const m = match();
	if ( state.step === 0 ) html += "<h2 id=\"panel-title\">Align your head</h2><p>Use the manual guide as usual. Optional local detection adds colour feedback and arrows against the fixed target.</p><label class=\"switch\" for=\"tracking\"><strong>Position feedback</strong><input id=\"tracking\" type=\"checkbox\" " + ( state.tracking ? "checked " : "" ) + ( cameraStream ? "" : "disabled" ) + "></label><p class=\"model-note\">On-device detection · no account or cloud processing.</p><div class=\"actions\"><button type=\"button\" id=\"lock-current\" " + ( state.mode === "return" || !state.tracking || !state.person || m.kind === "lost" ? "disabled" : "" ) + ">Lock current position</button><button type=\"button\" id=\"restore-reference\" " + ( saved ? "" : "disabled" ) + ">Restore saved reference</button></div><div class=\"note\">" + ( state.mode === "return" ? "Match the saved frame. Choose New setup to change its target." : "Lock current uses the detected position and size as a draft. Save the reference after reviewing your test." ) + "</div><h3>Manual guide adjustment</h3>" + guideControls() + ( !state.tracking ? "<label class=\"check\"><input id=\"manual-confirm\" type=\"checkbox\" " + ( state.manualConfirmed ? "checked" : "" ) + ">I have checked the framing against the manual guide.</label>" : "" ) + "<div class=\"next\"><button type=\"button\" class=\"primary\" id=\"accept-frame\" " + ( m.aligned ? "" : "disabled" ) + ">Framing checked · next</button><p>" + ( state.tracking ? "Realign until green. Manual adjustment is available with position feedback off." : "Enable your camera, then confirm the framing yourself." ) + "</p></div>";
	else if ( state.step === 1 ) {
		const advice = state.audio ? audioCheckAdvice( state.audio ) : null;
		html += "<h2 id=\"panel-title\">Verify your audio</h2><p>Check voice and room noise together, then listen to the test before deciding whether to change gain.</p><div class=\"microphone-field\"><label for=\"microphone-device\">Microphone</label><select id=\"microphone-device\" " + ( state.measuring ? "disabled" : "" ) + ">" + deviceOptions( "audioinput", state.microphoneId ) + "</select></div><h3>Voice and room level</h3><div class=\"meter\" id=\"audio-meter\" style=\"--level:0%\"></div><div class=\"scale\"><span>−60 dBFS</span><span>−30</span><span>−12</span><span>0</span></div><div class=\"actions\"><button type=\"button\" id=\"measure-audio\" " + ( state.measuring ? "disabled" : "" ) + ">" + ( state.measuring ? "Checking levels…" : "Enable mic and run check" ) + "</button></div><p id=\"audio-phase\" class=\"model-note\">" + ( state.measuring ? "Stay quiet briefly, then speak when prompted." : "First remain quiet for one second, then speak a short sentence." ) + "</p>";
		if ( state.audio ) html += "<dl class=\"result-grid\">" + [ [ "Voice level", state.audio.voice, "dBFS" ], [ "Voice above room", state.audio.voice - state.audio.noise, "dB" ], [ "Loudest peak", state.audio.peak, "dBFS" ], [ "Background noise", state.audio.noise, "dBFS" ] ].map( ( [ label, value, unit ] ) => `<div><dt>${ label }</dt><dd>${ value.toFixed( 1 ) } ${ unit }</dd></div>` ).join( "" ) + "</dl><div class=\"note " + ( !advice.usable ? "danger" : advice.advisory ? "warning" : "success" ) + "\">" + advice.text + "</div>" + ( advice.usable && advice.advisory ? "<label class=\"check\"><input type=\"checkbox\" id=\"accept-audio-warning\" " + ( state.audioOverride ? "checked" : "" ) + ">Continue with this advisory result and review the test recording.</label>" : "" );
		html += "<div class=\"next\"><button type=\"button\" class=\"primary\" id=\"accept-audio\" " + ( !advice?.usable || ( advice.advisory && !state.audioOverride ) || state.measuring ? "disabled" : "" ) + ">Audio checked · next</button><p>Input gain is not changed. The test clip uses this selected microphone.</p></div>";
	} else if ( state.step === 2 ) {
		html += "<h2 id=\"panel-title\">Make a test recording</h2><p>Record a short sample, then review the actual picture and sound before saving the setup.</p><div class=\"note\">This records the selected camera and microphone locally. It does not start your production recorder.</div>";
		if ( state.testState === "idle" ) html += "<div class=\"actions\"><button type=\"button\" class=\"primary\" id=\"record-test\" " + ( m.aligned && microphoneStream ? "" : "disabled" ) + ">Record test</button></div><p class=\"model-note\">Say a short sentence. The test stops after eight seconds, or use Stop test.</p>";
		if ( state.testState === "recording" ) html += `<div class="record-clock" id="test-clock">00:${ String( state.testSeconds ).padStart( 2, "0" ) }</div><button type="button" id="stop-test">Stop test</button>`;
		if ( state.testState === "saving" ) html += "<p role=\"status\" style=\"margin-top:16px\">Saving the test clip locally…</p>";
		if ( state.testState === "review" ) html += "<div class=\"review-box\"><h3>Test clip ready</h3><p>Review both the picture and sound. The guide is not burned into the camera recording.</p><button type=\"button\" id=\"play-test\">Review test recording</button><video id=\"test-playback\" playsinline controls hidden></video><p class=\"model-note\">Use the playback volume and headphones if needed.</p></div>" + ( state.testReviewed ? "<label class=\"check\"><input id=\"test-picture\" type=\"checkbox\" " + ( state.testPicture ? "checked" : "" ) + ">Picture and framing checked.</label><label class=\"check\"><input id=\"test-sound\" type=\"checkbox\" " + ( state.testSound ? "checked" : "" ) + ">Voice and background noise checked.</label>" : "" ) + "<div class=\"actions\"><button type=\"button\" id=\"redo-test\">Make another test</button></div><div class=\"next\"><button type=\"button\" class=\"primary\" id=\"accept-test\" " + ( state.testReviewed && state.testPicture && state.testSound ? "" : "disabled" ) + ">Test checked · next</button></div>";
	} else if ( state.step === 3 ) html += "<h2 id=\"panel-title\">" + ( state.mode === "return" ? "Keep your recording reference" : "Save your recording reference" ) + "</h2><p>" + ( state.mode === "return" ? "Your original framing stays fixed for consistency between shots. The audio recheck is complete." : "Save the checked framing with its camera, audio baseline and reviewed local test clip." ) + "</p>" + referenceData() + "<div class=\"note\">" + ( state.mode === "return" ? "Returning keeps the original target and saved test. It does not silently replace them." : "The saved position can also be restored from the manual Head guide controls. Existing Ideal proportions are retained." ) + "</div><div class=\"next\"><button type=\"button\" class=\"primary\" id=\"save-reference\">" + ( state.mode === "return" ? "Keep saved reference · ready" : saved ? "Replace saved recording reference" : "Save recording reference" ) + "</button></div>";
	else html += "<div class=\"ready-icon\" aria-hidden=\"true\">✓</div><h2 id=\"panel-title\">Ready to record</h2><p>Your framing, audio and test recording have been checked. Restore this reference to match shots after a break.</p><ul class=\"ready-list\"><li>Head position and size checked.</li><li>Microphone check accepted" + ( state.audioOverride ? " with an advisory result" : "" ) + ".</li><li>Test picture and sound reviewed.</li><li>Reference retained in this Sightline profile.</li></ul><div class=\"note success\">Return to your script to record. This check does not start your production recorder.</div><div class=\"actions\"><button type=\"button\" class=\"primary\" id=\"finish-prepare\">Return to script</button><button type=\"button\" id=\"ready-break\">Restore after a break</button></div>";
	$( "step-panel" ).innerHTML = html;
	if ( state.step === 0 ) {
		const actions = document.createElement( "div" ); actions.className = "actions";
		actions.innerHTML = '<button id="shared-guide-show" type="button">Show head guide</button><button id="shared-guide-adjust" type="button">Head guide adjustments…</button>';
		$( "panel-title" ).after( actions );
	}
	if ( state.step === 2 && state.testState === "review" ) {
		const fail = Object.assign( document.createElement( "button" ), { id: "fail-test", type: "button", textContent: "Test failed · retry" } );
		$( "redo-test" ).after( fail );
	}
}
function render() {
	renderSteps();
	renderCamera();
	panel();
}
function stopTracking() {
	generation++;
	clearInterval( frameTimer );
	frameTimer = null;
	worker?.terminate();
	worker = null;
	workerReady = false;
	workerBusy = false;
	state.person = null;
	lastDetection = 0;
}
async function startTracking() {
	stopTracking();
	if ( !cameraStream || !state.tracking ) return;
	const session = generation;
	state.error = "Preparing local detection…";
	renderCamera();
	const model = await window.preRecord.model();
	if ( session !== generation || disposed ) return;
	worker = new Worker( "./framing-worker-bundle.js" );
	worker.onerror = () => {
		state.error = "Local detection could not start. Manual guide adjustment remains available.";
		stopTracking();
		renderCamera();
		panel();
	};
	worker.onmessage = ( { data } ) => {
		if ( session !== generation ) return;
		if ( data.type === "ready" ) {
			workerReady = true;
			state.error = "";
			renderCamera();
		}
		if ( data.type === "error" ) {
			state.error = "Detection is unavailable. Manual guide remains available. " + data.message;
			stopTracking();
			renderCamera();
			panel();
		}
		if ( data.type === "result" ) {
			workerBusy = false;
			const next = detectedPose( data );
			state.person = next ? state.person ? Object.fromEntries( [ "x", "y", "size" ].map( key => [ key, state.person[key] * 0.55 + next[key] * 0.45 ] ) ) : next : null;
			if ( next ) lastDetection = performance.now();
			renderCamera();
			renderSteps();
			if ( $( "lock-current" ) ) $( "lock-current" ).disabled = state.mode === "return" || !state.person;
		}
	};
	worker.postMessage( { type: "init", model } );
	const canvas = document.createElement( "canvas" );
	canvas.width = 320;
	canvas.height = 180;
	const context = canvas.getContext( "2d" );
	frameTimer = setInterval( async () => {
		if ( !workerReady || workerBusy || !cameraStream || $( "camera-video" ).readyState < 2 ) {
			renderCamera();
			return;
		}
		workerBusy = true;
		try {
			const video = $( "camera-video" ), ratio = video.videoWidth / video.videoHeight, desired = 16 / 9;
			const width = ratio > desired ? video.videoHeight * desired : video.videoWidth, height = ratio > desired ? video.videoHeight : video.videoWidth / desired;
			context.drawImage( video, ( video.videoWidth - width ) / 2, ( video.videoHeight - height ) / 2, width, height, 0, 0, 320, 180 );
			const frame = await createImageBitmap( canvas );
			if ( session !== generation || !worker ) {
				frame.close();
				workerBusy = false;
				return;
			}
			worker.postMessage( { type: "frame", frame, time: performance.now() }, [ frame ] );
		} catch {
			workerBusy = false;
			state.person = null;
			renderCamera();
		}
	}, 140 );
}
async function connectCamera() {
	if ( cameraConnecting || [ "recording", "saving" ].includes( state.testState ) ) return;
	cameraError = "";
	state.error = "";
	if ( cameraStream ) {
		captureGeneration++;
		clearInterval( obsTimer ); obsTimer = null; obsGeneration++;
		stopTracking();
		cameraStream.getTracks().forEach( t => t.stop() );
		cameraStream = null;
		$( "camera-video" ).srcObject = null;
		await window.preRecord.input( "virtual-stop" ).catch( () => {} );
		state.camera = null;
		invalidate();
		render();
		return;
	}
	cameraConnecting = true;
	const captureEpoch = ++captureGeneration;
	renderCamera();
	try {
		if ( inputSource === "temporary" ) {
			await window.preRecord.input( "virtual-start" ); await listDevices();
			const virtual = knownDevices.find( d => d.kind === "videoinput" && /OBS.*Virtual/i.test( d.label ) );
			if ( !virtual ) throw new Error( "OBS Virtual Camera is unavailable. Choose OBS scene preview instead." );
			state.cameraId = virtual.deviceId;
		}
		const stream = inputSource === "obs" ? await obsStream() : await navigator.mediaDevices.getUserMedia( { audio: false, video: { ...( state.cameraId !== "default" ? { deviceId: { exact: state.cameraId } } : {} ), width: { ideal: 1280 }, height: { ideal: 720 } } } );
		if ( disposed || captureEpoch !== captureGeneration ) {
			stream.getTracks().forEach( t => t.stop() );
			return;
		}
		cameraStream = stream;
		const track = cameraStream.getVideoTracks()[0], settings = track.getSettings();
		if ( inputSource !== "obs" ) state.cameraId = settings.deviceId || state.cameraId;
		state.camera = { deviceId: state.cameraId, label: track.label, width: settings.width, height: settings.height };
		if ( inputSource === "obs" ) state.camera = { deviceId: "obs:" + shared.scene, label: "OBS scene · " + shared.scene, width: 640, height: 360 };
		track.onended = () => {
			cameraStream = null;
			state.camera = null;
			stopTracking();
			invalidate();
			cameraError = "Camera disconnected. Choose an available input and select Enable camera.";
			state.error = cameraError;
			render();
		};
		$( "camera-video" ).srcObject = cameraStream;
		await $( "camera-video" ).play();
		await listDevices().catch( () => {} );
		state.error = "";
		render();
	} catch ( error ) {
		clearInterval( obsTimer ); obsTimer = null; obsGeneration++;
		await window.preRecord.input( "virtual-stop" ).catch( () => {} );
		cameraStream?.getTracks().forEach( t => t.stop() );
		cameraStream = null;
		state.camera = null;
		const advice = {
			NotReadableError: "The camera could not open. It may be in use by another app. Choose a virtual camera, or release the camera there and try again.",
			NotAllowedError: "Camera access was denied. Check camera permission for Sightline in your system settings, then try again.",
			NotFoundError: "No camera input is available. Connect a camera or enable a virtual-camera feed, then try again.",
			OverconstrainedError: "The selected camera is unavailable. Choose another camera or virtual-camera feed, then try again."
		};
		cameraError = `${ advice[error.name] ?? "The camera could not open. Choose another input and try again." } (${ error.name })`;
		if ( inputSource !== "camera" ) cameraError = error.message;
		state.error = cameraError;
		await listDevices().catch( () => {} );
	} finally {
		cameraConnecting = false;
		if ( !disposed ) render();
	}
	if ( !disposed && cameraStream && state.tracking ) await startTracking().catch( error => {
		state.error = "Position feedback unavailable: " + error.message;
		render();
	} );
}
async function connectMicrophone() {
	microphoneStream?.getTracks().forEach( t => t.stop() );
	await audioContext?.close().catch( () => {} );
	microphoneStream = await navigator.mediaDevices.getUserMedia( { video: false, audio: { ...( state.microphoneId !== "default" ? { deviceId: { exact: state.microphoneId } } : {} ), echoCancellation: false, noiseSuppression: false, autoGainControl: false } } );
	state.microphoneId = microphoneStream.getAudioTracks()[0].getSettings().deviceId || state.microphoneId;
	audioContext = new AudioContext();
	await audioContext.resume();
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 2048;
	audioContext.createMediaStreamSource( microphoneStream ).connect( analyser );
	await listDevices();
}
async function measureAudio() {
	state.audio = null;
	state.audioAccepted = false;
	state.audioOverride = false;
	state.measuring = true;
	window.preRecord.report( { meter: { active: true, phase: "room", level: -100, peak: -100 } } );
	panel();
	renderSteps();
	try {
		await connectMicrophone();
	} catch ( error ) {
		state.measuring = false;
		window.preRecord.report( { meter: { active: false } } );
		say( `Microphone unavailable: ${ error.name }. Choose an available input and try again.` );
		panel();
		renderSteps();
		throw error;
	}
	const start = performance.now(), noise = [], voice = [], peaks = [], samples = new Float32Array( analyser.fftSize );
	let announced = false;
	say( "Stay quiet for a moment to measure room noise." );
	measuringTimer = setInterval( () => {
		if ( disposed ) return;
		analyser.getFloatTimeDomainData( samples );
		const rms = Math.sqrt( samples.reduce( ( sum, n ) => sum + n * n, 0 ) / samples.length ), peak = samples.reduce( ( max, n ) => Math.max( max, Math.abs( n ) ), 0 );
		const db = Math.max( -100, 20 * Math.log10( Math.max( 0.00001, rms ) ) ), elapsed = performance.now() - start;
		window.preRecord.report( { meter: { active: true, phase: elapsed < 1200 ? "room" : "voice", level: db, peak: Math.max( -100, 20 * Math.log10( Math.max( 0.00001, peak ) ) ) } } );
		if ( $( "audio-meter" ) ) $( "audio-meter" ).style.setProperty( "--level", `${ Math.max( 0, Math.min( 100, ( db + 60 ) / 60 * 100 ) ) }%` );
		if ( elapsed < 1200 ) noise.push( db );
		else {
			voice.push( db );
			peaks.push( Math.max( -100, 20 * Math.log10( Math.max( 0.00001, peak ) ) ) );
			if ( !announced ) {
				announced = true;
				say( "Now say a short sentence at your normal recording voice." );
				if ( $( "audio-phase" ) ) $( "audio-phase" ).textContent = "Speak normally for three seconds.";
			}
		}
		if ( elapsed >= 4400 ) {
			clearInterval( measuringTimer );
			measuringTimer = null;
			const percentile = ( values, p ) => values.sort( ( a, b ) => a - b )[Math.floor( ( values.length - 1 ) * p )] ?? -100;
			state.audio = { noise: percentile( noise, 0.6 ), voice: percentile( voice, 0.75 ), peak: Math.max( -100, ...peaks ) };
			state.measuring = false;
			window.preRecord.report( { meter: { active: false } } );
			panel();
			renderSteps();
			say( "Audio check complete. Review the readings and make a test recording." );
		}
	}, 50 );
}
async function recordTest() {
	if ( !cameraStream || !microphoneStream || !match().aligned ) throw new Error( "Connect the camera and microphone and confirm framing first" );
	const stream = new MediaStream( [ ...cameraStream.getVideoTracks(), ...microphoneStream.getAudioTracks() ] );
	const mimeType = [ "video/webm;codecs=vp8,opus", "video/webm" ].find( type => MediaRecorder.isTypeSupported( type ) );
	if ( !mimeType ) throw new Error( "This system cannot create the local WebM test clip" );
	const chunks = [];
	let failed = false;
	recorder = new MediaRecorder( stream, { mimeType, videoBitsPerSecond: 3000000, audioBitsPerSecond: 96000 } );
	recorder.ondataavailable = ( event ) => {
		if ( event.data.size ) chunks.push( event.data );
	};
	recorder.onerror = () => {
		failed = true;
		window.preRecord.report( { test: { state: "failed" } } );
		say( "The test recording failed. Check the devices and try again." );
	};
	recorder.onstop = async () => {
		clearInterval( recordTimer );
		recordTimer = null;
		window.preRecord.activity( false );
		if ( disposed || failed ) {
			state.testState = "idle";
			if ( !disposed ) panel();
			return;
		}
		state.testState = "saving";
		window.preRecord.report( { test: { state: "saving" } } );
		$( "clip-badge" ).hidden = true;
		panel();
		try {
			testBlob = new Blob( chunks, { type: mimeType } );
			if ( testURL ) URL.revokeObjectURL( testURL );
			testURL = URL.createObjectURL( testBlob );
			const result = await window.preRecord.saveTest( new Uint8Array( await testBlob.arrayBuffer() ) );
			state.testFile = result.file;
			state.testState = "review";
			window.preRecord.report( { test: { state: "review" } } );
			panel();
			renderSteps();
			say( "Test clip saved locally. Review its picture and sound." );
		} catch ( error ) {
			state.testState = "idle";
			window.preRecord.report( { test: { state: "failed" } } );
			panel();
			say( "Could not save the test clip: " + error.message );
		}
	};
	state.testSeconds = 0;
	state.testReviewed = false;
	state.testPicture = false;
	state.testSound = false;
	state.testApproved = false;
	state.testState = "recording";
	window.preRecord.report( { test: { state: "recording" } } );
	window.preRecord.activity( true );
	recorder.start( 250 );
	$( "clip-badge" ).hidden = false;
	$( "clip-badge" ).textContent = "● Test recording";
	panel();
	renderSteps();
	renderCamera();
	recordTimer = setInterval( () => {
		state.testSeconds++;
		if ( state.testSeconds >= 8 ) recorder.stop();
		else if ( $( "test-clock" ) ) $( "test-clock" ).textContent = "00:" + String( state.testSeconds ).padStart( 2, "0" );
	}, 1000 );
}
async function reviewTest() {
	if ( !testURL && saved?.testFile ) {
		const bytes = await window.preRecord.readTest();
		testBlob = new Blob( [ bytes ], { type: "video/webm" } );
		testURL = URL.createObjectURL( testBlob );
	}
	if ( !testURL ) throw new Error( "Make a test recording first" );
	const video = $( "test-playback" );
	video.hidden = false;
	video.src = testURL;
	await video.play();
	state.testReviewed = true;
	video.onended = () => panel();
}
function restoreReference() {
	if ( !saved && !shared.reference?.pose ) return;
	const pose = shared.reference?.pose;
	const restored = pose ? { x: pose.x, y: pose.y - 14 / 562.5 * 100, size: pose.scale * 100 } : copy( saved.target );
	const same = saved && [ "x", "y", "size" ].every( key => Math.abs( restored[key] - saved.target[key] ) < 0.0001 );
	state.mode = same ? "return" : "setup";
	if ( !cameraStream && saved?.camera?.deviceId && !saved.camera.deviceId.startsWith( "obs:" ) ) state.cameraId = saved.camera.deviceId;
	state.target = restored;
	draft();
	state.step = 0;
	state.manualConfirmed = false;
	state.framingAccepted = false;
	state.audio = null;
	state.audioAccepted = false;
	state.audioOverride = false;
	state.microphoneId = saved?.microphoneId ?? "default";
	state.testApproved = same && saved.testReviewed === true;
	state.testState = same && saved.testFile ? "review" : "idle";
	state.referenceSaved = true;
	render();
	say( "Saved target restored. Your current position has not been used to replace it." );
}
async function saveReference() {
	if ( !match().aligned || !state.audioAccepted || !state.testApproved ) throw new Error( "Complete the framing, audio and test checks first" );
	if ( state.mode !== "return" ) saved = await window.preRecord.save( { target: framingPose( state.target ), camera: state.camera, microphoneId: state.microphoneId, audio: { ...state.audio, override: state.audioOverride }, testReviewed: true, framingChecked: true } );
	state.referenceSaved = true;
	state.step = 4;
	render();
	say( state.mode === "return" ? "Original recording reference retained." : "Recording reference saved in your Sightline profile." );
}
async function action( id ) {
	if ( id === "lock-current" ) {
		state.target = detectedFramingTarget( state.person, shared.pose );
		await draft();
		invalidate();
		render();
		say( "Current detected position is the draft target. Save after reviewing a test." );
	}
	if ( id === "restore-reference" || id === "ready-break" ) restoreReference();
	if ( id === "accept-frame" ) {
		state.framingAccepted = true;
		go( 1 );
	}
	if ( id === "measure-audio" ) await measureAudio();
	if ( id === "accept-audio" ) {
		state.audioAccepted = true;
		go( state.mode === "return" && state.testApproved ? 3 : 2 );
	}
	if ( id === "record-test" ) await recordTest();
	if ( id === "stop-test" && recorder?.state === "recording" ) recorder.stop();
	if ( id === "play-test" ) await reviewTest();
	if ( id === "redo-test" || id === "fail-test" ) {
		window.preRecord.report( { test: { state: id === "fail-test" ? "failed" : "stale" } } );
		state.testState = "idle";
		state.testApproved = false;
		state.referenceSaved = false;
		panel();
	}
	if ( id === "accept-test" ) {
		if ( !state.testReviewed || !state.testPicture || !state.testSound ) throw new Error( "Review and confirm the picture and sound first" );
		state.testApproved = true;
		window.preRecord.report( { test: { state: "passed" } } );
		go( 3 );
	}
	if ( id === "save-reference" ) await saveReference();
	if ( id === "finish-prepare" ) window.preRecord.close();
	if ( id === "shared-guide-adjust" ) await window.preRecord.input( "guide", "adjust" );
	if ( id === "shared-guide-show" ) await window.preRecord.input( "guide", "show" );
}
$( "step-panel" ).addEventListener( "click", ( event ) => {
	const button = event.target.closest( "button" );
	if ( button && !button.disabled ) action( button.id ).catch( error => {
		if ( [ "record-test", "play-test" ].includes( button.id ) ) window.preRecord.report( { test: { state: "failed" } } );
		say( error.message );
	} );
} );
$( "step-panel" ).addEventListener( "input", ( event ) => {
	if ( event.target.dataset.guide ) {
		state.target[event.target.dataset.guide] = Number( event.target.value );
		draft();
		event.target.nextElementSibling.textContent = event.target.value + "%";
		invalidate();
		renderCamera();
		renderSteps();
	}
} );
$( "step-panel" ).addEventListener( "change", ( event ) => {
	if ( event.target.id === "tracking" ) {
		state.tracking = event.target.checked;
		if ( state.tracking ) window.preRecord.input( "guide", "show" );
		state.manualConfirmed = false;
		state.framingAccepted = false;
		if ( state.tracking ) startTracking().catch( ( error ) => {
			state.error = error.message;
			renderCamera();
		} );
		else stopTracking();
		render();
	}
	if ( event.target.id === "manual-confirm" ) {
		state.manualConfirmed = event.target.checked;
		render();
	}
	if ( event.target.id === "microphone-device" ) {
		if ( state.testApproved ) window.preRecord.report( { test: { state: "stale" } } );
		state.microphoneId = event.target.value;
		state.audio = null;
		state.audioAccepted = false;
		state.testApproved = false;
		microphoneStream?.getTracks().forEach( t => t.stop() );
		microphoneStream = null;
		panel();
		renderSteps();
	}
	if ( event.target.id === "accept-audio-warning" ) {
		state.audioOverride = event.target.checked;
		panel();
	}
	if ( event.target.id === "test-picture" || event.target.id === "test-sound" ) {
		state[event.target.id === "test-picture" ? "testPicture" : "testSound"] = event.target.checked;
		const video = $( "test-playback" );
		if ( video && !video.hidden ) video.pause();
		panel();
	}
} );
$( "connect-camera" ).onclick = () => connectCamera().catch( error => say( error.message ) );
$( "camera-device" ).onchange = async ( event ) => {
	const id = event.target.value;
	const reconnect = !!cameraStream;
	if ( reconnect ) await connectCamera();
	state.cameraId = id;
	await window.preRecord.input( "camera", id );
	cameraError = "";
	state.error = "";
	if ( reconnect ) await connectCamera();
	else renderCamera();
};
$( "mirror" ).onchange = ( event ) => {
	state.mirror = event.target.checked;
	renderCamera();
};
$( "steps" ).onclick = ( event ) => {
	const button = event.target.closest( "[data-step]" );
	if ( button && !button.disabled ) go( Number( button.dataset.step ) );
};
$( "return-break" ).onclick = restoreReference;
$( "new-setup" ).onclick = () => {
	window.preRecord.report( { test: { state: "stale" } } );
	state.mode = "setup";
	state.step = 0;
	state.target = copy( shared.target ?? config.guide ?? { x: 0, y: 0, size: 100 } );
	state.audio = null;
	state.audioAccepted = false;
	state.testApproved = false;
	state.testReviewed = false;
	state.testState = "idle";
	invalidate();
	render();
	say( "New draft setup. The previous saved reference remains until explicitly replaced." );
};
$( "return-script" ).onclick = $( "close-prepare" ).onclick = () => window.preRecord.close();
window.addEventListener( "beforeunload", () => {
	disposed = true;
	navigator.mediaDevices.removeEventListener( "devicechange", refreshDevices );
	stopTracking();
	clearInterval( measuringTimer );
	clearInterval( recordTimer );
	if ( recorder?.state === "recording" ) recorder.stop();
	cameraStream?.getTracks().forEach( t => t.stop() );
	microphoneStream?.getTracks().forEach( t => t.stop() );
	audioContext?.close();
	if ( testURL ) URL.revokeObjectURL( testURL );
} );
function refreshDevices() {
	listDevices().then( () => { if ( !disposed ) renderCamera(); } ).catch( error => {
		if ( disposed ) return;
		cameraError = "Could not list camera inputs. Try Enable camera to request access. (" + error.name + ")";
		renderCamera();
	} );
}
async function chooseInput( source, scene = shared.scene ) {
	await stopInput();
	inputSource = source;
	if ( source === "obs" && shared.obs.connected && !shared.obs.scenes?.length ) await window.preRecord.input( "obs-scenes" );
	await window.preRecord.input( "source", { source, scene } );
	invalidate(); renderInput(); render();
}
$( "calibration-source" ).onchange = event => chooseInput( event.target.value ).catch( error => say( error.message ) );
$( "obs-scene" ).onchange = event => chooseInput( inputSource, event.target.value ).catch( error => say( error.message ) );
$( "refresh-obs-scenes" ).onclick = () => window.preRecord.input( "obs-scenes" ).catch( error => say( error.message ) );
window.preRecord.onShared( async value => {
	const nextSource = value.obs.available ? value.source : "camera";
	if ( inputSource !== nextSource || shared.scene !== value.scene || ( inputSource !== "camera" && !value.obs.connected ) ) await stopInput();
	shared = value; inputSource = nextSource;
	if ( value.cameraId && state.cameraId !== value.cameraId && inputSource !== "obs" ) { await stopInput(); state.cameraId = value.cameraId; $( "camera-device" ).value = state.cameraId; }
	const changed = [ "x", "y", "size" ].some( key => Math.abs( state.target[key] - value.target[key] ) > 0.0001 );
	if ( changed ) {
		state.target = copy( value.target ); invalidate();
		if ( state.mode === "return" ) { state.mode = "setup"; state.step = 0; }
	}
	renderInput(); if ( changed ) render(); else renderCamera();
} );
async function handleGuideAction( { name, value, background } ) {
	try {
		if ( name === "controller" ) {
			const command = Object.keys( PREPARATION_COMMANDS ).find( key => PREPARATION_COMMANDS[key] === value.action );
			const reason = preparationBlockReason( command, { preparation: controllerStatus() } );
			if ( !command || reason ) throw new Error( reason ?? "Unknown controller operation" );
			if ( value.action === "measure-audio" ) go( 1 );
			if ( [ "record-test", "stop-test", "play-test" ].includes( value.action ) ) go( 2 );
			await action( value.action );
			reportControllerStatus();
			window.preRecord.report( { controllerResult: { id: value.id, ok: true } } );
			return;
		}
		if ( name === "background" ) {
			clearInterval( measuringTimer ); state.measuring = false;
			window.preRecord.report( { meter: { active: false } } );
			microphoneStream?.getTracks().forEach( track => track.stop() ); microphoneStream = null;
			await audioContext?.close(); audioContext = null; return;
		}
		if ( name === "source" ) { await chooseInput( value ); return; }
		if ( name === "scene" ) { await chooseInput( inputSource, value ); return; }
		if ( name === "scenes" ) { await window.preRecord.input( "obs-scenes" ); return; }
		if ( name === "picture" ) { await connectCamera(); return; }
		if ( name === "camera" ) { await stopInput(); state.cameraId = value; await window.preRecord.input( "camera", value ); await listDevices(); render(); return; }
		if ( name === "lock" && state.person ) { state.mode = "setup"; await action( "lock-current" ); return; }
		if ( name === "tracking" ) {
			state.tracking = value === true;
			if ( state.tracking ) { if ( !cameraStream ) await connectCamera(); else await startTracking(); }
			else { stopTracking(); if ( background ) await stopInput(); }
			render();
			if ( !state.tracking && background ) window.preRecord.close( true );
		}
	} catch ( error ) {
		if ( name === "controller" ) window.preRecord.report( { controllerResult: { id: value.id, ok: false, error: error.message } } );
		state.error = error.message; say( error.message ); render();
	}
}
let guideActions = Promise.resolve();
window.preRecord.onGuideAction( value => { guideActions = guideActions.then( () => handleGuideAction( value ) ); } );
navigator.mediaDevices.addEventListener( "devicechange", refreshDevices );
refreshDevices();
renderInput();
render();
window.preRecord.input( "ready" );
if ( saved ) say( "A recording reference is available. Choose Restore saved reference to match previous shots." );
