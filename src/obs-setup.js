import { randomUUID, createHash } from "node:crypto";

const cameraKinds = new Set( [ "dshow_input", "av_capture_input", "v4l2_input", "pipewire-camera-source" ] );
const micKinds = new Set( [ "wasapi_input_capture", "coreaudio_input_capture", "pulse_input_capture", "alsa_input_capture" ] );
const presentationKinds = new Set( [ "window_capture", "xcomposite_input", "image_source", "slideshow" ] );
export const SETUP_REQUESTS = [ "GetRecordStatus", "GetStreamStatus", "GetReplayBufferStatus", "GetProfileList", "GetSceneCollectionList", "GetVideoSettings", "GetInputList", "GetInputSettings", "CreateProfile", "SetCurrentProfile", "CreateSceneCollection", "SetCurrentSceneCollection", "SetVideoSettings", "SetProfileParameter", "GetProfileParameter", "SetRecordDirectory", "GetRecordDirectory", "GetSpecialInputs", "RemoveInput", "CreateScene", "CreateInput", "CreateSceneItem", "SetSceneItemTransform", "GetInputAudioTracks", "SetInputAudioTracks", "SetCurrentProgramScene" ];
const hash = value => createHash( "sha256" ).update( JSON.stringify( value ) ).digest( "hex" );
const tracks = enabled => Object.fromEntries( Array.from( { length: 6 }, ( _, i ) => [ String( i + 1 ), enabled.includes( i + 1 ) ] ) );
const sceneNames = [ "Sightline - Camera", "Sightline - Camera and presentation", "Sightline - Presentation and camera" ];

// Setup is local, explicit and separate from ordinary recording commands. No
// device is opened during inspection; choices reuse configured OBS inputs.
export function createObsSetup( { request, allowed, now = Date.now } ) {
	let plan = null;
	let busy = false;
	let previous = null;
	async function idle() {
		allowed();
		const outputs = await Promise.all( [ "GetRecordStatus", "GetStreamStatus", "GetReplayBufferStatus" ].map( type => request( type ) ) );
		if ( outputs.some( value => value.outputActive || value.outputPaused ) ) throw new Error( "Stop OBS recording, streaming and replay buffer before changing its setup" );
		allowed();
	}
	async function inspect() {
		await idle();
		const [ version, profiles, collections, video, inputs ] = await Promise.all( [ "GetVersion", "GetProfileList", "GetSceneCollectionList", "GetVideoSettings", "GetInputList" ].map( type => request( type ) ) );
		if ( SETUP_REQUESTS.some( type => !version.availableRequests?.includes( type ) ) ) throw new Error( "This OBS connection does not support all setup requests. Use the configuration guide or update OBS." );
		return { profiles, collections, video, cameras: inputs.inputs.filter( input => cameraKinds.has( input.inputKind ) ), microphones: inputs.inputs.filter( input => micKinds.has( input.inputKind ) ), presentations: inputs.inputs.filter( input => presentationKinds.has( input.inputKind ) ) };
	}
	async function configuredInput( choices, name ) {
		const input = choices.find( item => item.inputName === name );
		if ( !input ) throw new Error( "Choose a configured camera and microphone from the current OBS collection" );
		const result = await request( "GetInputSettings", { inputName: name } );
		return { name, kind: input.inputKind, settings: result.inputSettings };
	}
	return {
		inspect,
		async plan( choices, directory ) {
			if ( busy ) throw new Error( "OBS setup is already in progress" );
			plan = null;
			if ( typeof directory !== "string" || !directory ) throw new Error( "Choose a recording folder first" );
			if ( ![ 1080, 2160 ].includes( choices.height ) ) throw new Error( "Choose a 1080p or 4K canvas" );
			const snapshot = await inspect();
			const camera = await configuredInput( snapshot.cameras, choices.camera );
			const microphone = await configuredInput( snapshot.microphones, choices.microphone );
			const presentation = choices.presentation ? await configuredInput( snapshot.presentations, choices.presentation ) : null;
			const base = String( choices.name ?? "Sightline Academy" ).trim().slice( 0, 60 );
			if ( !base || Array.from( base ).some( char => char.codePointAt( 0 ) < 32 || "/\\".includes( char ) ) ) throw new Error( "Choose a short profile name without slashes" );
			let name = base;
			for ( let n = 2; snapshot.profiles.profiles.includes( name ) || snapshot.collections.sceneCollections.includes( name ); n++ ) name = `${ base } ${ n }`;
			const publicPlan = {
				id: randomUUID(), name, directory, camera: camera.name, microphone: microphone.name,
				presentation: presentation?.name ?? "Blank presentation area; add a window or slides in OBS later",
				width: choices.height === 2160 ? 3840 : 1920, height: choices.height, fps: 30,
				scenes: sceneNames, previousProfile: snapshot.profiles.currentProfileName, previousCollection: snapshot.collections.currentSceneCollectionName,
				notes: [
					"Creates a new profile and scene collection; existing setups are retained. Leaves the new setup selected without starting recording.",
					`Camera settings are copied from the selected OBS source (${ camera.settings.resolution || "capture resolution not reported" }). Canvas size does not prove native 4K capture.`,
					"Requests MKV, software x264, 48 kHz stereo PCM audio and tracks 1/2. Verify encoder availability, quality and performance in OBS before using a master recording.",
					"Microphone goes to tracks 1 and 2 without copying OBS filters or sync offsets. Hardware/driver processing is unchanged. Other sources do not feed these tracks. A WAV and simultaneous clean camera master need the guide's additional steps.",
					"No desktop/display, prompter or head-guide source is added. Check the actual recorded picture and sound. Prepare the recorded slate separately."
				]
			};
			plan = { publicPlan, snapshot, camera, microphone, presentation, directory, expires: now() + 600000 };
			return publicPlan;
		},
		async apply( id ) {
			if ( busy ) throw new Error( "OBS setup is already in progress" );
			if ( !plan || plan.publicPlan.id !== id || now() > plan.expires ) throw new Error( "Review the OBS setup plan again before creating it" );
			const selected = plan;
			plan = null;
			busy = true;
			let profileCreated = false;
			let collectionCreated = false;
			let step = "Check the reviewed setup";
			const { publicPlan: details, snapshot, camera, microphone, presentation, directory } = selected;
			const original = { profile: snapshot.profiles.currentProfileName, collection: snapshot.collections.currentSceneCollectionName };
			const write = async ( type, data ) => {
				await idle();
				step = type;
				return request( type, data );
			};
			try {
				const fresh = await inspect();
				if ( fresh.profiles.currentProfileName !== original.profile || fresh.collections.currentSceneCollectionName !== original.collection || fresh.profiles.profiles.includes( details.name ) || fresh.collections.sceneCollections.includes( details.name ) || hash( fresh.video ) !== hash( snapshot.video ) ) throw new Error( "The OBS setup changed. Review a fresh plan." );
				for ( const input of [ camera, microphone, presentation ].filter( Boolean ) ) {
					const current = await request( "GetInputSettings", { inputName: input.name } );
					if ( hash( current.inputSettings ) !== hash( input.settings ) ) throw new Error( "An OBS source changed. Review a fresh plan." );
				}
				profileCreated = true;
				await write( "CreateProfile", { profileName: details.name } );
				collectionCreated = true;
				await write( "CreateSceneCollection", { sceneCollectionName: details.name } );
				const values = [ [ "Output", "Mode", "Advanced" ], [ "Audio", "SampleRate", "48000" ], [ "Audio", "ChannelSetup", "Stereo" ], [ "AdvOut", "RecType", "Standard" ], [ "AdvOut", "RecEncoder", "obs_x264" ], [ "AdvOut", "RecAEncoder", "ffmpeg_pcm_s24le" ], [ "AdvOut", "RecFormat2", "mkv" ], [ "AdvOut", "RecTracks", "3" ], [ "AdvOut", "RecUseRescale", "false" ] ];
				for ( const [ parameterCategory, parameterName, parameterValue ] of values ) await write( "SetProfileParameter", { parameterCategory, parameterName, parameterValue } );
				await write( "SetRecordDirectory", { recordDirectory: directory } );
				await write( "SetVideoSettings", { baseWidth: details.width, baseHeight: details.height, outputWidth: details.width, outputHeight: details.height, fpsNumerator: 30, fpsDenominator: 1 } );
				// Reload only the newly created profile so encoder/audio parameters
				// take effect. The previous profile is never edited.
				await write( "SetCurrentProfile", { profileName: original.profile } );
				await write( "SetCurrentProfile", { profileName: details.name } );
				const special = await request( "GetSpecialInputs" );
				for ( const name of new Set( Object.values( special ).filter( value => typeof value === "string" && value ) ) ) await write( "RemoveInput", { inputName: name } );
				for ( const sceneName of sceneNames ) await write( "CreateScene", { sceneName } );
				const cameraName = "Sightline camera";
				const micName = "Sightline microphone";
				const cameraSettings = { ...camera.settings, ...( camera.kind === "dshow_input" ? { audio_output_mode: 0, use_custom_audio_device: false } : {} ) };
				const cam = await write( "CreateInput", { sceneName: sceneNames[0], inputName: cameraName, inputKind: camera.kind, inputSettings: cameraSettings, sceneItemEnabled: true } );
				await write( "CreateInput", { sceneName: sceneNames[0], inputName: micName, inputKind: microphone.kind, inputSettings: microphone.settings, sceneItemEnabled: true } );
				await write( "SetInputAudioTracks", { inputName: micName, inputAudioTracks: tracks( [ 1, 2 ] ) } );
				const muteSourceTracks = async ( name ) => {
					try {
						await request( "GetInputAudioTracks", { inputName: name } );
					} catch ( error ) {
						if ( error.obsComment === "The specified input does not support audio." ) return;
						throw error;
					}
					await write( "SetInputAudioTracks", { inputName: name, inputAudioTracks: tracks( [] ) } );
				};
				await muteSourceTracks( cameraName );
				const place = ( sceneName, sceneItemId, x, y, width, height ) => write( "SetSceneItemTransform", { sceneName, sceneItemId, sceneItemTransform: { positionX: x, positionY: y, boundsType: "OBS_BOUNDS_SCALE_INNER", boundsWidth: width, boundsHeight: height, alignment: 5, boundsAlignment: 0 } } );
				await place( sceneNames[0], cam.sceneItemId, 0, 0, details.width, details.height );
				for ( const [ index, sceneName ] of sceneNames.entries() ) {
					if ( !index ) continue;
					if ( presentation ) {
						const args = { sceneName, sceneItemEnabled: true };
						const item = index === 1 ? await write( "CreateInput", { ...args, inputName: "Sightline presentation", inputKind: presentation.kind, inputSettings: presentation.settings } ) : await write( "CreateSceneItem", { ...args, sourceName: "Sightline presentation" } );
						await place( sceneName, item.sceneItemId, index === 1 ? details.width * 0.32 : 0, 0, index === 1 ? details.width * 0.68 : details.width, details.height );
						if ( index === 1 ) await muteSourceTracks( "Sightline presentation" );
					}
					const item = await write( "CreateSceneItem", { sceneName, sourceName: cameraName, sceneItemEnabled: true } );
					await place( sceneName, item.sceneItemId, index === 1 ? 0 : details.width * 0.74, index === 1 ? 0 : details.height * 0.72, details.width * ( index === 1 ? 0.32 : 0.24 ), details.height * ( index === 1 ? 1 : 0.24 ) );
					await write( "CreateSceneItem", { sceneName, sourceName: micName, sceneItemEnabled: true } );
				}
				await write( "SetCurrentProgramScene", { sceneName: sceneNames[0] } );
				const video = await request( "GetVideoSettings" );
				if ( ( await request( "GetRecordDirectory" ) ).recordDirectory !== directory ) throw new Error( "OBS did not retain the chosen recording folder" );
				if ( video.outputWidth !== details.width || video.outputHeight !== details.height || video.fpsNumerator / video.fpsDenominator !== 30 ) throw new Error( "OBS did not retain the requested video settings" );
				for ( const [ parameterCategory, parameterName, parameterValue ] of values ) {
					const current = await request( "GetProfileParameter", { parameterCategory, parameterName } );
					if ( String( current.parameterValue ) !== parameterValue ) throw new Error( "OBS did not retain a requested recording setting; review the partial setup" );
				}
				previous = original;
				return { ok: true, name: details.name, previous: original, notes: details.notes, needsRecordingTest: true };
			} catch ( error ) {
				let restored = !profileCreated && !collectionCreated;
				if ( profileCreated || collectionCreated ) {
					try {
						await idle();
						if ( collectionCreated ) await request( "SetCurrentSceneCollection", { sceneCollectionName: original.collection } );
						if ( profileCreated ) await request( "SetCurrentProfile", { profileName: original.profile } );
						restored = true;
					} catch { /* Keep the partial setup; never stop someone else's output. */ }
				}
				return { ok: false, error: error.message, step, restored, partial: profileCreated || collectionCreated ? details.name : null, previous: original };
			} finally {
				busy = false;
			}
		},
		async restore() {
			if ( busy || !previous ) throw new Error( "No previous OBS setup is available to restore" );
			await idle();
			await request( "SetCurrentSceneCollection", { sceneCollectionName: previous.collection } );
			await idle();
			await request( "SetCurrentProfile", { profileName: previous.profile } );
			return { ok: true, previous };
		}
	};
}
