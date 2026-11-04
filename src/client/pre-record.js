import { framingPose, framingMatch, detectedPose, audioCheckAdvice } from "./framing-position.js";

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
const state = { step: 0, mode: "setup", tracking: false, mirror: true, person: null, target: copy( config.guide ?? { x: 0, y: 0, size: 100 } ), manualConfirmed: false, framingAccepted: false, audio: null, audioAccepted: false, audioOverride: false, measuring: false, testState: "idle", testSeconds: 0, testApproved: false, testReviewed: false, testPicture: false, testSound: false, referenceSaved: false, microphoneId: config.microphoneId || "default", cameraId: "default", camera: null, testFile: null, error: "" };
const names = [ "Align head", "Check audio", "Test recording", "Save reference", "Ready" ];
const colours = { green: "#72dfad", amber: "#edc766", red: "#ff8585", lost: "#a7b2c0", manual: "#89c4ff" };
function say( text ) {
	$( "message" ).textContent = text;
}
function match() {
	if ( !cameraStream ) return { kind: "lost", aligned: false, arrow: "—", text: "Camera is off", detail: "Enable a camera or virtual-camera feed to check your framing." };
	if ( state.mode === "return" && saved && ( state.camera?.deviceId !== saved.camera.deviceId || state.camera?.width !== saved.camera.width || state.camera?.height !== saved.camera.height ) ) return { kind: "lost", aligned: false, arrow: "—", text: "Camera setup has changed", detail: "Use the saved camera and resolution, or choose New setup to establish a new reference." };
	return framingMatch( performance.now() - lastDetection < 1400 ? state.person : null, state.target, { enabled: state.tracking, manual: state.manualConfirmed, mirror: state.mirror } );
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
	knownDevices = await navigator.mediaDevices.enumerateDevices();
	$( "camera-device" ).innerHTML = deviceOptions( "videoinput", state.cameraId );
	if ( knownDevices.some( d => d.kind === "videoinput" && d.deviceId === state.cameraId ) ) $( "camera-device" ).value = state.cameraId;
}
function renderSteps() {
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
	const m = match(), colour = colours[m.kind];
	$( "camera" ).style.setProperty( "--signal", colour );
	const mirrored = state.mirror ? "translate(1000 0) scale(-1 1)" : "";
	const transform = `translate(${ state.target.x * 10 } ${ state.target.y * 5.625 }) translate(500 169) scale(${ state.target.size / 100 }) translate(-500 -169)`;
	$( "camera-video" ).style.transform = state.mirror ? "scaleX(-1)" : "";
	$( "target-space" ).setAttribute( "transform", mirrored );
	$( "target" ).setAttribute( "transform", transform );
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
	$( "connect-camera" ).textContent = cameraStream ? "Turn camera off" : "Enable camera";
	$( "connect-camera" ).disabled = [ "recording", "saving" ].includes( state.testState );
	$( "camera-device" ).disabled = !cameraStream || [ "recording", "saving" ].includes( state.testState );
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
	if ( cameraStream ) {
		stopTracking();
		cameraStream.getTracks().forEach( t => t.stop() );
		cameraStream = null;
		state.camera = null;
		invalidate();
		render();
		return;
	}
	$( "connect-camera" ).disabled = true;
	try {
		cameraStream = await navigator.mediaDevices.getUserMedia( { audio: false, video: { ...( state.cameraId !== "default" ? { deviceId: { exact: state.cameraId } } : {} ), width: { ideal: 1280 }, height: { ideal: 720 } } } );
		const track = cameraStream.getVideoTracks()[0], settings = track.getSettings();
		state.cameraId = settings.deviceId || state.cameraId;
		state.camera = { deviceId: state.cameraId, label: track.label, width: settings.width, height: settings.height };
		track.onended = () => {
			cameraStream = null;
			stopTracking();
			invalidate();
			state.error = "Camera disconnected. Choose an available input.";
			render();
		};
		$( "camera-video" ).srcObject = cameraStream;
		await $( "camera-video" ).play();
		await listDevices();
		state.error = "";
		render();
		if ( state.tracking ) await startTracking();
	} catch ( error ) {
		cameraStream?.getTracks().forEach( t => t.stop() );
		cameraStream = null;
		state.error = `Camera unavailable: ${ error.name }. If another app owns the camera, select its virtual-camera output or release it there.`;
		render();
	}
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
		return;
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
	if ( !saved ) return;
	state.mode = "return";
	if ( !cameraStream ) state.cameraId = saved.camera.deviceId;
	state.target = copy( saved.target );
	state.step = 0;
	state.manualConfirmed = false;
	state.framingAccepted = false;
	state.audio = null;
	state.audioAccepted = false;
	state.audioOverride = false;
	state.microphoneId = saved.microphoneId || "default";
	state.testApproved = saved.testReviewed === true;
	state.testState = saved.testFile ? "review" : "idle";
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
		state.target = framingPose( state.person );
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
		event.target.nextElementSibling.textContent = event.target.value + "%";
		invalidate();
		renderCamera();
		renderSteps();
	}
} );
$( "step-panel" ).addEventListener( "change", ( event ) => {
	if ( event.target.id === "tracking" ) {
		state.tracking = event.target.checked;
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
	if ( cameraStream ) await connectCamera();
	state.cameraId = id;
	await connectCamera();
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
	state.target = copy( config.guide ?? { x: 0, y: 0, size: 100 } );
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
	stopTracking();
	clearInterval( measuringTimer );
	clearInterval( recordTimer );
	if ( recorder?.state === "recording" ) recorder.stop();
	cameraStream?.getTracks().forEach( t => t.stop() );
	microphoneStream?.getTracks().forEach( t => t.stop() );
	audioContext?.close();
	if ( testURL ) URL.revokeObjectURL( testURL );
} );
render();
if ( saved ) say( "A recording reference is available. Choose Restore saved reference to match previous shots." );
