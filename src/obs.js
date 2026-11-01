// OBS WebSocket v5, in main only. Disabled means no socket, timers or commands.
// Recording actions require permission; never stream or change scenes.
import { createHash, randomUUID } from "node:crypto";
import { recordedSlateRoute } from "./obs-slate-route.js";
import { createObsSetup } from "./obs-setup.js";

export function obsAddress( host = "127.0.0.1", port = 4455 ) {
	if ( typeof host !== "string" || !host.trim() || /[\s/@?#\\]/.test( host.trim() ) ) throw new Error( "Enter an OBS hostname or IP address, without a URL or path" );
	if ( !Number.isInteger( port ) || port < 1 || port > 65535 ) throw new Error( "OBS port must be between 1 and 65535" );
	const name = host.trim().replace( /^\[|\]$/g, "" );
	const url = new URL( `ws://${ name.includes( ":" ) ? `[${ name }]` : name }:${ port }` );
	return url.href;
}

export function obsAuthentication( password, salt, challenge ) {
	const hash = text => createHash( "sha256" ).update( text ).digest( "base64" );
	return hash( hash( password + salt ) + challenge );
}

export function createObs( { onState = () => {}, WebSocketClass = globalThis.WebSocket, timeoutMs = 5000, reconnectMs = 3000, pollMs = 2000 } = {} ) {
	let config = { enabled: false, host: "127.0.0.1", port: 4455, password: "", controls: false, markers: false };
	let state = { enabled: false, connection: "disabled", recording: null, recordingId: null, outputPath: null, outputDuration: null, chapters: false, error: null };
	let socket = null;
	let generation = 0;
	let retry = null;
	let poll = null;
	let handshake = null;
	let rejectReady = null;
	let polling = null;
	let changingScenes = false;
	let counter = 0;
	let recordingBusy = false;
	let setupBusy = false;
	let setup = null;
	let recordRevision = 0;
	let recordTransition = null;
	const pending = new Map();
	const snapshot = () => ( { ...state, controls: config.controls, markers: config.markers, setupBusy, recordingBusy } );
	const publish = ( partial ) => {
		state = { ...state, ...partial, observedAt: new Date().toISOString() };
		onState( snapshot() );
	};
	function clearConnection() {
		setup = null;
		generation++;
		clearTimeout( retry );
		clearTimeout( handshake );
		clearInterval( poll );
		retry = poll = handshake = null;
		rejectReady?.( new Error( "OBS connection was closed" ) );
		rejectReady = null;
		for ( const request of pending.values() ) {
			clearTimeout( request.timer );
			request.reject( new Error( "OBS connection was closed" ) );
		}
		pending.clear();
		const old = socket;
		socket = null;
		old?.close();
		polling = null;
		changingScenes = false;
		recordTransition = null;
		recordRevision++;
	}
	function request( type, data = {} ) {
		if ( state.connection !== "connected" || !socket ) return Promise.reject( new Error( "OBS is not connected" ) );
		return new Promise( ( resolve, reject ) => {
			const id = String( ++counter );
			const timer = setTimeout( () => {
				pending.delete( id );
				if ( type === "StartRecord" || type === "StopRecord" ) publish( { recording: null, error: "OBS did not confirm the recording state" } );
				reject( new Error( `OBS did not confirm ${ type }; check OBS before trying again` ) );
			}, timeoutMs );
			pending.set( id, { resolve, reject, timer } );
			try {
				socket.send( JSON.stringify( { op: 6, d: { requestType: type, requestId: id, requestData: data } } ) );
			} catch {
				clearTimeout( timer );
				pending.delete( id );
				reject( new Error( "Could not send the command to OBS" ) );
			}
		} );
	}
	function recordStatus( data ) {
		if ( typeof data.outputActive !== "boolean" ) throw new Error( "OBS did not return a recording status" );
		if ( ( recordTransition === "stopping" && data.outputActive ) || ( recordTransition === "starting" && !data.outputActive ) ) {
			publish( { recording: null } );
			return;
		}
		const recording = !data.outputActive ? "stopped" : data.outputPaused ? "paused" : "recording";
		const fresh = data.outputActive && ( !state.recordingId || state.recording === "stopped" || recordTransition === "starting" );
		recordTransition = null;
		publish( {
			recording,
			...( fresh ? { recordingId: randomUUID(), outputPath: null, fileClockUnknown: false } : {} ),
			outputDuration: Number.isFinite( data.outputDuration ) ? data.outputDuration : fresh ? null : state.outputDuration,
			durationObservedAt: Number.isFinite( data.outputDuration ) ? new Date().toISOString() : fresh ? null : state.durationObservedAt,
			error: null
		} );
	}
	function refresh() {
		if ( changingScenes ) return Promise.reject( new Error( "OBS is changing scene collections; wait for it to finish" ) );
		if ( polling ) return polling;
		const current = generation;
		const revision = recordRevision;
		polling = request( "GetRecordStatus" ).then( ( data ) => {
			if ( current === generation && revision === recordRevision ) recordStatus( data );
			return snapshot();
		} ).catch( ( error ) => {
			if ( current === generation && revision === recordRevision ) {
				publish( { recording: null, error: error.message } );
			}
			throw error;
		} ).finally( () => {
			if ( current === generation ) polling = null;
		} );
		return polling;
	}
	function lost( message ) {
		clearConnection();
		publish( { connection: config.enabled ? "disconnected" : "disabled", recording: null, chapters: false, error: message } );
		if ( config.enabled ) retry = setTimeout( () => connect().catch( () => {} ), reconnectMs );
	}
	function connect() {
		clearConnection();
		if ( !config.enabled ) {
			publish( { enabled: false, connection: "disabled", recording: null, recordingId: null, outputPath: null, outputDuration: null, chapters: false, error: null } );
			return Promise.resolve( snapshot() );
		}
		publish( { enabled: true, connection: "connecting", recording: null, recordingId: null, outputPath: null, outputDuration: null, error: null } );
		const current = generation;
		return new Promise( ( resolve, reject ) => {
			rejectReady = reject;
			try {
				socket = new WebSocketClass( obsAddress( config.host, config.port ) );
			} catch {
				lost( "Could not connect to OBS; check its address and WebSocket settings" );
				return;
			}
			handshake = setTimeout( () => {
				if ( current === generation ) lost( "OBS connection timed out; check OBS and its WebSocket settings" );
			}, timeoutMs );
			socket.addEventListener( "message", async ( event ) => {
				if ( current !== generation ) return;
				try {
					const { op, d } = JSON.parse( String( event.data ) );
					if ( op === 0 ) {
						if ( d.rpcVersion < 1 ) throw new Error( "Unsupported OBS protocol" );
						const identify = { rpcVersion: 1, eventSubscriptions: 1 | 2 | 64 };
						if ( d.authentication ) identify.authentication = obsAuthentication( config.password, d.authentication.salt, d.authentication.challenge );
						socket.send( JSON.stringify( { op: 1, d: identify } ) );
					} else if ( op === 2 ) {
						clearTimeout( handshake );
						publish( { connection: "connected" } );
						const version = await request( "GetVersion" );
						if ( current !== generation ) return;
						publish( { chapters: version.availableRequests?.includes( "CreateRecordChapter" ) === true } );
						await refresh();
						if ( current !== generation ) return;
						rejectReady = null;
						poll = setInterval( () => refresh().catch( () => {} ), pollMs );
						resolve( snapshot() );
					} else if ( op === 7 ) {
						const item = pending.get( d.requestId );
						if ( !item ) return;
						clearTimeout( item.timer );
						pending.delete( d.requestId );
						if ( d.requestStatus?.result ) item.resolve( d.responseData ?? {} );
						else item.reject( Object.assign( new Error( `OBS rejected ${ d.requestType }; check OBS and the recording format` ), { obsComment: d.requestStatus?.comment } ) );
					} else if ( op === 5 ) {
						if ( d.eventType === "CurrentSceneCollectionChanging" ) changingScenes = true;
						if ( d.eventType === "CurrentSceneCollectionChanged" ) changingScenes = false;
						if ( d.eventType === "ExitStarted" ) return lost( "OBS closed; recording status is unknown" );
						if ( d.eventType === "RecordStateChanged" ) {
							const record = d.eventData;
							recordRevision++;
							if ( [ "OBS_WEBSOCKET_OUTPUT_STARTING", "OBS_WEBSOCKET_OUTPUT_STOPPING" ].includes( record.outputState ) ) {
								recordTransition = record.outputState === "OBS_WEBSOCKET_OUTPUT_STARTING" ? "starting" : "stopping";
								publish( { recording: null } );
							} else recordStatus( { outputActive: record.outputActive, outputPaused: record.outputState === "OBS_WEBSOCKET_OUTPUT_PAUSED" } );
							if ( record.outputPath ) publish( { outputPath: record.outputPath } );
						}
						if ( d.eventType === "RecordFileChanged" ) {
							recordRevision++;
							if ( d.eventData.oldOutputPath ) publish( { outputPath: d.eventData.oldOutputPath } );
							publish( { outputPath: d.eventData.newOutputPath, recordingId: randomUUID(), fileClockUnknown: true } );
						}
					}
				} catch {
					if ( current === generation ) lost( "OBS connection could not be confirmed; check its version and password" );
				}
			} );
			socket.addEventListener( "close", ( event ) => {
				if ( current === generation ) lost( event.code === 4009 ? "OBS password was not accepted" : "OBS connection lost; recording status is unknown" );
			} );
			socket.addEventListener( "error", () => {
				if ( current === generation ) lost( "Could not reach OBS; check that its WebSocket server is enabled" );
			} );
		} );
	}
	return {
		state: snapshot,
		async setup( action, value ) {
			if ( ![ "inspect", "plan", "apply", "restore" ].includes( action ) ) throw new Error( "Unknown OBS setup action" );
			if ( setupBusy || recordingBusy ) throw new Error( "Wait for the current OBS operation to finish" );
			if ( !setup ) {
				const epoch = generation;
				const allowed = () => {
					if ( epoch !== generation || !config.enabled || state.connection !== "connected" ) throw new Error( "Connect OBS and review the setup again" );
				};
				setup = createObsSetup( { request: async ( type, data ) => {
					allowed();
					return request( type, data );
				}, allowed } );
			}
			if ( action === "inspect" ) return setup.inspect();
			if ( action === "plan" ) return setup.plan( value.choices, value.directory );
			setupBusy = true;
			publish( {} );
			try {
				return action === "apply" ? await setup.apply( value ) : await setup.restore();
			} finally {
				setupBusy = false;
				publish( {} );
				refresh().catch( () => {} );
			}
		},
		async slateRoute( url, prepare = false ) {
			const current = generation;
			const guarded = ( type, data ) => {
				if ( current !== generation || !config.enabled || !config.controls || !config.recordedSlate || changingScenes || setupBusy ) throw new Error( "Enable OBS recording controls and the recorded slate before preparing it" );
				return request( type, data );
			};
			return recordedSlateRoute( guarded, url, prepare );
		},
		async configure( options ) {
			obsAddress( options.host ?? "127.0.0.1", options.port ?? 4455 );
			const next = { ...config, ...options, enabled: options.enabled === true, controls: options.controls === true, markers: options.markers === true };
			if ( JSON.stringify( next ) === JSON.stringify( config ) ) return snapshot();
			const reconnect = [ "enabled", "host", "port", "password" ].some( key => config[key] !== next[key] );
			config = next;
			if ( !reconnect ) {
				publish( {} );
				return snapshot();
			}
			return connect();
		},
		async command( action, label = "" ) {
			if ( !config.enabled ) throw new Error( "OBS integration is disabled" );
			if ( setupBusy ) throw new Error( "Wait for OBS setup to finish" );
			if ( action === "test" ) return state.connection === "connected" ? refresh() : connect();
			if ( !config.controls ) throw new Error( "OBS is in status-only mode" );
			if ( state.connection !== "connected" || changingScenes ) throw new Error( "OBS is not ready; check its connection" );
			if ( action === "marker" ) {
				if ( !config.markers || !state.chapters || state.recording !== "recording" ) return snapshot();
				await request( "CreateRecordChapter", { chapterName: String( label ).slice( 0, 120 ) || "Sightline marker" } );
				return snapshot();
			}
			if ( ![ "start", "stop", "pause", "resume" ].includes( action ) ) throw new Error( "Unknown OBS action" );
			if ( recordingBusy ) throw new Error( "An OBS recording command is still waiting for confirmation" );
			recordingBusy = true;
			const current = generation;
			const stillAllowed = () => {
				if ( current !== generation || !config.enabled || !config.controls ) throw new Error( "OBS settings changed; the prompter has not started" );
			};
			const waitForRecording = async ( desired ) => {
				const deadline = Date.now() + timeoutMs;
				do {
					await refresh();
					stillAllowed();
					if ( state.recording === desired ) return;
					if ( action === "start" && desired === "recording" && state.recording === "paused" ) throw new Error( "OBS recording is paused; use Record resume" );
					await new Promise( resolve => setTimeout( resolve, Math.max( 1, Math.min( 100, timeoutMs / 4 ) ) ) );
				} while ( Date.now() < deadline );
				publish( { recording: null, error: "OBS did not confirm the requested recording state" } );
				throw new Error( "OBS did not confirm the recording state; check OBS before trying again" );
			};
			try {
				if ( action === "start" ) {
					await refresh();
					stillAllowed();
					if ( state.recording === "paused" ) throw new Error( "OBS recording is paused; resume it in OBS first" );
					if ( state.recording !== "recording" ) await request( "StartRecord" );
					await waitForRecording( "recording" );
				} else if ( action === "pause" || action === "resume" ) {
					await refresh();
					stillAllowed();
					if ( state.recording === "stopped" ) throw new Error( "Start an OBS recording before pausing or resuming it" );
					const desired = action === "pause" ? "paused" : "recording";
					if ( state.recording !== desired ) await request( action === "pause" ? "PauseRecord" : "ResumeRecord" );
					await waitForRecording( desired );
				} else {
					await refresh();
					stillAllowed();
					if ( state.recording === "stopped" ) return snapshot();
					const result = await request( "StopRecord" );
					stillAllowed();
					publish( { outputPath: result.outputPath ?? state.outputPath } );
					await waitForRecording( "stopped" );
				}
				return snapshot();
			} finally {
				recordingBusy = false;
			}
		},
		dispose() {
			config.enabled = false;
			clearConnection();
		}
	};
}
