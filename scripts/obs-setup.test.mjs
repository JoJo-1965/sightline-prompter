import assert from "node:assert/strict";
import { createObsSetup, SETUP_REQUESTS } from "../src/obs-setup.js";
import { workflowRows } from "../src/client/workflow.js";

function fixture() {
	const originalVideo = { baseWidth: 1920, baseHeight: 1080, outputWidth: 1920, outputHeight: 1080, fpsNumerator: 30, fpsDenominator: 1 };
	const profiles = new Map( [ [ "Original", { video: { ...originalVideo }, params: {}, directory: "previous" } ] ] );
	const collections = new Map( [ [ "Original scenes", { sources: new Map( [
		[ "Camera", { kind: "dshow_input", settings: { video_device_id: "camera-id", resolution: "3840x2160", use_custom_audio_device: true } } ],
		[ "Rode mic", { kind: "wasapi_input_capture", settings: { device_id: "mic-id" } } ],
		[ "Slides window", { kind: "window_capture", settings: { window: "presentation" } } ],
		[ "Desktop", { kind: "monitor_capture", settings: { monitor_id: "screen" } } ]
	] ), scenes: [] } ] ] );
	const calls = [];
	let profile = "Original";
	let collection = "Original scenes";
	let active = false;
	let replay = false;
	let stream = false;
	let failure = null;
	let sequence = 0;
	let expired = 0;
	let connected = true;
	const request = async ( type, data = {} ) => {
		calls.push( { type, data, profile, collection } );
		if ( type === failure ) {
			failure = null;
			throw new Error( "Simulated failure" );
		}
		const p = profiles.get( profile );
		const c = collections.get( collection );
		switch ( type ) {
			case "GetVersion": return { availableRequests: SETUP_REQUESTS };
			case "GetRecordStatus": return { outputActive: active };
			case "GetStreamStatus": return { outputActive: stream };
			case "GetReplayBufferStatus": return { outputActive: replay };
			case "GetProfileList": return { profiles: [ ...profiles.keys() ], currentProfileName: profile };
			case "GetSceneCollectionList": return { sceneCollections: [ ...collections.keys() ], currentSceneCollectionName: collection };
			case "GetVideoSettings": return { ...p.video };
			case "GetInputList": return { inputs: [ ...c.sources ].map( ( [ inputName, source ] ) => ( { inputName, inputKind: source.kind } ) ) };
			case "GetInputSettings": return { inputSettings: structuredClone( c.sources.get( data.inputName ).settings ) };
			case "CreateProfile":
				profiles.set( data.profileName, { video: { ...originalVideo }, params: {}, directory: "new-default" } );
				profile = data.profileName;
				return {};
			case "SetCurrentProfile":
				profile = data.profileName;
				return {};
			case "CreateSceneCollection":
				collections.set( data.sceneCollectionName, { sources: new Map( [ [ "Default desktop", {} ] ] ), scenes: [] } );
				collection = data.sceneCollectionName;
				return {};
			case "SetCurrentSceneCollection":
				collection = data.sceneCollectionName;
				return {};
			case "SetProfileParameter":
				p.params[data.parameterCategory + "." + data.parameterName] = data.parameterValue;
				return {};
			case "GetProfileParameter": return { parameterValue: p.params[data.parameterCategory + "." + data.parameterName] };
			case "SetRecordDirectory":
				p.directory = data.recordDirectory;
				return {};
			case "GetRecordDirectory": return { recordDirectory: p.directory };
			case "SetVideoSettings":
				p.video = { ...data };
				return {};
			case "GetSpecialInputs": return { desktop1: "Default desktop", mic1: null };
			case "RemoveInput":
				c.sources.delete( data.inputName );
				return {};
			case "CreateScene":
				c.scenes.push( data.sceneName );
				return {};
			case "CreateInput":
				c.sources.set( data.inputName, { kind: data.inputKind, settings: data.inputSettings } );
				return { sceneItemId: ++sequence };
			case "CreateSceneItem":
				assert.ok( c.sources.has( data.sourceName ) );
				return { sceneItemId: ++sequence };
			case "GetInputAudioTracks":
				if ( data.inputName === "Sightline presentation" ) throw Object.assign( new Error( "Video only" ), { obsComment: "The specified input does not support audio." } );
				return { inputAudioTracks: { 1: true } };
			case "SetInputAudioTracks": return {};
			case "SetSceneItemTransform": return {};
			case "SetCurrentProgramScene": return {};
			default: throw new Error( "Unexpected request " + type );
		}
	};
	const setup = createObsSetup( { request, allowed: () => {
		if ( !connected ) throw new Error( "Disconnected" );
	}, now: () => expired } );
	return { setup, calls, profiles, collections, choices: { camera: "Camera", microphone: "Rode mic", presentation: "Slides window", height: 2160 }, originalVideo,
		get profile() {
			return profile;
		}, get collection() {
			return collection;
		},
		active: ( value ) => {
			active = value;
		}, replay: ( value ) => {
			replay = value;
		}, stream: ( value ) => {
			stream = value;
		}, fail: ( type ) => {
			failure = type;
		}, expire: () => {
			expired = 600001;
		}, disconnect: () => {
			connected = false;
		} };
}
const writes = fixture => fixture.calls.filter( call => /^(?:Create|Set|Remove|Start|Stop)/.test( call.type ) );
const f = fixture();
const inspection = await f.setup.inspect();
assert.equal( inspection.cameras.length, 1 );
assert.equal( inspection.presentations.length, 1, "Display capture cannot be selected as a presentation" );
const plan = await f.setup.plan( f.choices, "recordings" );
assert.equal( writes( f ).length, 0, "Inspect and plan are read-only" );
assert.match( plan.notes.join( " " ), /does not prove native 4K/ );
const result = await f.setup.apply( plan.id );
assert.equal( result.ok, true );
assert.equal( f.profile, plan.name );
assert.equal( f.collection, plan.name );
assert.equal( f.collections.get( plan.name ).scenes.length, 3 );
assert.deepEqual( f.profiles.get( "Original" ).video, f.originalVideo );
assert.deepEqual( f.profiles.get( "Original" ).params, {}, "Existing profile parameters stay unchanged" );
assert.equal( f.collections.get( "Original scenes" ).sources.size, 4 );
assert.equal( f.collections.get( plan.name ).sources.has( "Default desktop" ), false );
assert.equal( f.collections.get( plan.name ).sources.get( "Sightline camera" ).settings.use_custom_audio_device, false );
assert.equal( f.profiles.get( plan.name ).params["AdvOut.RecAEncoder"], "ffmpeg_pcm_s24le" );
const audio = f.calls.find( call => call.type === "SetInputAudioTracks" && call.data.inputName === "Sightline microphone" );
assert.deepEqual( Object.values( audio.data.inputAudioTracks ), [ true, true, false, false, false, false ] );
assert.equal( f.calls.some( call => /^(?:Start|Stop)/.test( call.type ) ), false, "Setup never starts/stops any output" );
assert.equal( f.calls.some( call => call.type === "CreateSourceFilter" ), false );
await assert.rejects( f.setup.apply( plan.id ), /Review/ );
await f.setup.restore();
assert.equal( f.profile, "Original" );
assert.equal( f.collection, "Original scenes" );
const collision = await f.setup.plan( f.choices, "recordings" );
assert.equal( collision.name, "Sightline Academy 2" );
for ( const output of [ "active", "replay", "stream" ] ) {
	const blocked = fixture();
	const draft = await blocked.setup.plan( blocked.choices, "recordings" );
	blocked[output]( true );
	const stopped = await blocked.setup.apply( draft.id );
	assert.equal( stopped.ok, false );
	assert.equal( writes( blocked ).length, 0 );
}
for ( const failAt of [ "CreateProfile", "CreateSceneCollection", "SetSceneItemTransform", "GetInputAudioTracks" ] ) {
	const partial = fixture();
	const draft = await partial.setup.plan( partial.choices, "recordings" );
	partial.fail( failAt );
	const stopped = await partial.setup.apply( draft.id );
	assert.equal( stopped.ok, false );
	assert.equal( stopped.restored, true );
	assert.equal( partial.profile, "Original" );
	assert.equal( partial.collection, "Original scenes" );
}
const expired = fixture();
const expiredPlan = await expired.setup.plan( expired.choices, "recordings" );
expired.expire();
await assert.rejects( expired.setup.apply( expiredPlan.id ), /Review/ );
const changed = fixture();
const changedPlan = await changed.setup.plan( changed.choices, "recordings" );
changed.collections.get( "Original scenes" ).sources.get( "Camera" ).settings.resolution = "1920x1080";
assert.equal( ( await changed.setup.apply( changedPlan.id ) ).ok, false );
assert.equal( writes( changed ).length, 0 );
const rows = workflowRows( { settings: { scrollMode: "steady", obsEnabled: false }, components: null, obs: {} }, true );
assert.equal( rows.some( row => row[0] === "OBS recording" ), false );
assert.equal( rows.some( row => row[0] === "Microphone and sound" ), true );
console.log( "PASS: read-only OBS plans, idle guards, clean input routing, retained profiles, expiring approval, partial restoration and workflow rows" );
