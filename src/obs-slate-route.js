import { RECORDED_SLATE_SOURCE as sourceName } from "./recorded-slate.js";
import { pathToFileURL } from "node:url";
const SOURCE_CSS = "body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }";

// Touch only the explicitly prepared Sightline source in the current scene.
// The framing guide is never an OBS source. No scene/profile switching.
export async function recordedSlateRoute( request, url, prepare = false ) {
	const localFile = typeof url === "object" ? url.file : null;
	const sourceUrl = localFile ? pathToFileURL( localFile ).href : url;
	const stream = await request( "GetStreamStatus" );
	if ( stream.outputActive ) throw new Error( "Recorded slate is unavailable while OBS is streaming" );
	const record = await request( "GetRecordStatus" );
	if ( prepare && record.outputActive ) throw new Error( "Stop recording in OBS before preparing the recorded slate" );
	if ( !prepare && ( !record.outputActive || record.outputPaused ) ) throw new Error( "OBS must be recording and unpaused for a recorded slate" );
	const { currentProgramSceneName: sceneName } = await request( "GetCurrentProgramScene" );
	const { baseWidth: width, baseHeight: height } = await request( "GetVideoSettings" );
	const { inputs } = await request( "GetInputList" );
	const existing = inputs.find( i => i.inputName === sourceName );
	const input = existing ? ( await request( "GetInputSettings", { inputName: sourceName } ) ).inputSettings : null;
	if ( existing && ( existing.inputKind !== "browser_source" || input.sightlineRecordedSync !== 1 ) ) throw new Error( "A different OBS source already uses the recorded-sync name; rename it in OBS first" );
	if ( prepare ) {
		const inputSettings = { is_local_file: false, url: sourceUrl, width, height, css: SOURCE_CSS, reroute_audio: true, shutdown: false, restart_when_active: false, webpage_control_level: 0, sightlineRecordedSync: 1 };
		if ( existing ) await request( "SetInputSettings", { inputName: sourceName, inputSettings, overlay: true } );
		else await request( "CreateInput", { sceneName, inputName: sourceName, inputKind: "browser_source", inputSettings, sceneItemEnabled: true } );
	} else if ( !input || input.is_local_file === true || input.url !== sourceUrl || input.width !== width || input.height !== height || input.reroute_audio !== true || input.css !== SOURCE_CSS ) throw new Error( "Prepare the recorded slate again for this scene and canvas" );
	let { sceneItems } = await request( "GetSceneItemList", { sceneName } );
	let item = sceneItems.find( i => i.sourceName === sourceName );
	if ( prepare && !item ) {
		await request( "CreateSceneItem", { sceneName, sourceName, sceneItemEnabled: true } );
		sceneItems = ( await request( "GetSceneItemList", { sceneName } ) ).sceneItems;
		item = sceneItems.find( i => i.sourceName === sourceName );
	}
	if ( !item ) throw new Error( "The current OBS scene has no prepared recorded slate" );
	const target = { sceneName, sceneItemId: item.sceneItemId };
	if ( prepare ) {
		await request( "SetSceneItemEnabled", { ...target, sceneItemEnabled: true } );
		await request( "SetSceneItemTransform", { ...target, sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, alignment: 5, boundsType: "OBS_BOUNDS_NONE", cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 } } );
		await request( "SetSceneItemIndex", { ...target, sceneItemIndex: sceneItems.length - 1 } );
		await request( "SetInputMute", { inputName: sourceName, inputMuted: false } );
		await request( "SetInputVolume", { inputName: sourceName, inputVolumeMul: 1 } );
		await request( "SetInputAudioTracks", { inputName: sourceName, inputAudioTracks: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false } } );
		await request( "SetInputAudioMonitorType", { inputName: sourceName, monitorType: "OBS_MONITORING_TYPE_NONE" } );
	} else {
		if ( !item.sceneItemEnabled || item.sceneItemIndex !== sceneItems.length - 1 ) throw new Error( "The OBS recorded slate must be visible above the other sources" );
		const { sceneItemTransform: t } = await request( "GetSceneItemTransform", target );
		if ( t.positionX !== 0 || t.positionY !== 0 || t.scaleX !== 1 || t.scaleY !== 1 || t.rotation !== 0 || t.alignment !== 5 || t.boundsType !== "OBS_BOUNDS_NONE" || t.cropLeft || t.cropRight || t.cropTop || t.cropBottom ) throw new Error( "The OBS recorded slate was moved or cropped; prepare it again" );
		const { filters = [] } = await request( "GetSourceFilterList", { sourceName } );
		if ( filters.some( f => f.filterEnabled ) ) throw new Error( "Remove enabled filters from the recorded slate source before using it" );
		const { inputMuted } = await request( "GetInputMute", { inputName: sourceName } );
		const { inputVolumeMul } = await request( "GetInputVolume", { inputName: sourceName } );
		const { inputAudioTracks } = await request( "GetInputAudioTracks", { inputName: sourceName } );
		const { monitorType } = await request( "GetInputAudioMonitorType", { inputName: sourceName } );
		if ( inputMuted || Math.abs( inputVolumeMul - 1 ) > 0.001 || !inputAudioTracks[1] || Object.entries( inputAudioTracks ).some( ( [ track, enabled ] ) => track !== "1" && enabled ) || monitorType !== "OBS_MONITORING_TYPE_NONE" ) throw new Error( "Prepare the slate's audio again: unmuted, track 1 only, with speaker monitoring off" );
	}
	return { sceneName, sourceName, width, height, audioTrack: 1, outputDuration: record.outputDuration ?? null };
}
