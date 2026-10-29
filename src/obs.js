// OBS WebSocket v5, in main only. Disabled means no socket, timers or commands.
// Never stream, change scenes, pause or stop an output as a side effect.
import { createHash, randomUUID } from "node:crypto";

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
	const pending = new Map();
	const snapshot = () => ( { ...state, controls: config.controls, markers: config.markers } );
	const publish = ( partial ) => {
		state = { ...state, ...partial, observedAt: new Date().toISOString() };
		onState( snapshot() );
	};
	function clearConnection() {
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
		const recording = !data.outputActive ? "stopped" : data.outputPaused ? "paused" : "recording";
		const fresh = data.outputActive && ( !state.recordingId || state.recording === "stopped" );
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
		polling = request( "GetRecordStatus" ).then( ( data ) => {
			if ( current === generation ) recordStatus( data );
			return snapshot();
		} ).catch( ( error ) => {
			if ( current === generation ) {
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
						else item.reject( new Error( `OBS rejected ${ d.requestType }; check OBS and the recording format` ) );
					} else if ( op === 5 ) {
						if ( d.eventType === "CurrentSceneCollectionChanging" ) changingScenes = true;
						if ( d.eventType === "CurrentSceneCollectionChanged" ) changingScenes = false;
						if ( d.eventType === "ExitStarted" ) return lost( "OBS closed; recording status is unknown" );
						if ( d.eventType === "RecordStateChanged" ) {
							const record = d.eventData;
							recordStatus( { outputActive: record.outputActive, outputPaused: record.outputState === "OBS_WEBSOCKET_OUTPUT_PAUSED" } );
							if ( record.outputPath ) publish( { outputPath: record.outputPath } );
						}
						if ( d.eventType === "RecordFileChanged" ) {
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
			if ( action === "test" ) return state.connection === "connected" ? refresh() : connect();
			if ( !config.controls ) throw new Error( "OBS is in status-only mode" );
			if ( state.connection !== "connected" || changingScenes ) throw new Error( "OBS is not ready; check its connection" );
			if ( action === "marker" ) {
				if ( !config.markers || !state.chapters || state.recording !== "recording" ) return snapshot();
				await request( "CreateRecordChapter", { chapterName: String( label ).slice( 0, 120 ) || "Sightline marker" } );
				return snapshot();
			}
			if ( action !== "start" && action !== "stop" ) throw new Error( "Unknown OBS action" );
			if ( recordingBusy ) throw new Error( "An OBS recording command is still waiting for confirmation" );
			recordingBusy = true;
			const current = generation;
			const stillAllowed = () => {
				if ( current !== generation || !config.enabled || !config.controls ) throw new Error( "OBS settings changed; the prompter has not started" );
			};
			try {
				if ( action === "start" ) {
					await refresh();
					stillAllowed();
					if ( state.recording === "paused" ) throw new Error( "OBS recording is paused; resume it in OBS first" );
					if ( state.recording !== "recording" ) await request( "StartRecord" );
					await refresh();
					stillAllowed();
					if ( state.recording !== "recording" ) throw new Error( "OBS did not confirm recording; the prompter has not started" );
				} else {
					const result = await request( "StopRecord" );
					stillAllowed();
					recordStatus( { outputActive: false } );
					publish( { outputPath: result.outputPath ?? state.outputPath } );
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
