import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createObs, obsAddress, obsAuthentication } from "../src/obs.js";
import { createObsCredentials } from "../src/obs-credentials.js";
import { createTakeLog } from "../src/client/take-log.js";
import { editPack } from "../src/client/edit-pack.js";
import { obsActionBlock, obsSlateSetupBlock } from "../src/client/obs-ui.js";

const readyObs = { enabled: true, controls: true, connection: "connected", recording: "recording" };
const slateSettings = { obsRecordedSlate: true, slate: "both" };
const slateReady = { ...readyObs, recording: "stopped" };
assert.equal( obsSlateSetupBlock( slateReady, slateSettings ), null );
assert.match( obsSlateSetupBlock( { ...slateReady, enabled: false }, slateSettings ), /Enable OBS integration/ );
assert.match( obsSlateSetupBlock( { ...slateReady, controls: false }, slateSettings ), /Allow Sightline/ );
assert.match( obsSlateSetupBlock( slateReady, { ...slateSettings, obsRecordedSlate: false } ), /Tick Include the slate/ );
assert.match( obsSlateSetupBlock( { ...slateReady, connection: "disconnected" }, slateSettings ), /Connect OBS/ );
assert.match( obsSlateSetupBlock( readyObs, slateSettings ), /must be stopped/ );
assert.match( obsSlateSetupBlock( slateReady, { ...slateSettings, slate: "off" } ), /Choose Flash/ );
assert.match( obsSlateSetupBlock( slateReady, slateSettings, true ), /Waiting/ );
assert.equal( obsActionBlock( readyObs, "stop" ), null );
assert.match( obsActionBlock( { ...readyObs, enabled: false }, "stop" ), /disabled/ );
assert.match( obsActionBlock( { ...readyObs, controls: false }, "stop" ), /status-only/ );
assert.match( obsActionBlock( { ...readyObs, connection: "disconnected" }, "stop" ), /unknown/ );
assert.match( obsActionBlock( { ...readyObs, recording: null }, "stop" ), /unknown/ );
assert.match( obsActionBlock( { ...readyObs, recording: "stopped" }, "stop" ), /already stopped/ );
assert.match( obsActionBlock( readyObs, "start", { busy: true } ), /waiting/ );
assert.match( obsActionBlock( readyObs, "start", { canStart: false } ), /Stop the prompter/ );
assert.match( obsActionBlock( { ...readyObs, recording: "paused" }, "start" ), /resume it in OBS/ );
assert.equal( obsActionBlock( { ...readyObs, recording: "paused" }, "stop" ), null );

const server = { active: false, paused: false, requests: [], ignore: null, reject: null, auth: null, chapters: true, startDelayPolls: 0, stopDelayPolls: 0, starting: 0, stopping: 0 };
class FakeSocket extends EventTarget {
	static instances = [];
	constructor( url ) {
		super();
		this.url = url;
		FakeSocket.instances.push( this );
		queueMicrotask( () => this.message( { op: 0, d: { rpcVersion: 1, authentication: { salt: "salt", challenge: "challenge" } } } ) );
	}

	message( value ) {
		this.dispatchEvent( new MessageEvent( "message", { data: JSON.stringify( value ) } ) );
	}

	close() {
		this.closed = true;
	}

	send( raw ) {
		const { op, d } = JSON.parse( raw );
		if ( op === 1 ) {
			server.auth = d.authentication;
			queueMicrotask( () => this.message( { op: 2, d: { negotiatedRpcVersion: 1 } } ) );
			return;
		}
		server.requests.push( d.requestType );
		server.lastRequest = d;
		if ( server.ignore === d.requestType ) return;
		const result = server.reject !== d.requestType;
		let responseData = {};
		if ( d.requestType === "GetVersion" ) responseData = { availableRequests: server.chapters ? [ "CreateRecordChapter" ] : [] };
		if ( result && d.requestType === "StartRecord" ) {
			server.starting = server.startDelayPolls;
			if ( !server.starting ) server.active = true;
		}
		if ( result && d.requestType === "StopRecord" ) {
			server.stopping = server.stopDelayPolls;
			if ( !server.stopping ) server.active = false;
			responseData = { outputPath: "/recordings/test.mp4" };
		}
		if ( d.requestType === "GetRecordStatus" ) {
			if ( server.starting > 0 && --server.starting === 0 ) server.active = true;
			if ( server.stopping > 0 && --server.stopping === 0 ) server.active = false;
			responseData = { outputActive: server.active, outputPaused: server.paused, outputDuration: 1234 };
		}
		queueMicrotask( () => this.message( { op: 7, d: { requestId: d.requestId, requestType: d.requestType, requestStatus: { result }, responseData } } ) );
	}
}

assert.equal( obsAddress(), "ws://127.0.0.1:4455/" );
assert.equal( obsAddress( "::1", 4455 ), "ws://[::1]:4455/" );
for ( const host of [ "ws://localhost", "localhost/path", "user@localhost", "localhost?key=x", "" ] ) assert.throws( () => obsAddress( host ) );
for ( const port of [ 0, 65536, 1.5, NaN ] ) assert.throws( () => obsAddress( "localhost", port ) );
const hash = text => createHash( "sha256" ).update( text ).digest( "base64" );
assert.equal( obsAuthentication( "private", "salt", "challenge" ), hash( hash( "privatesalt" ) + "challenge" ) );

const states = [];
const obs = createObs( { WebSocketClass: FakeSocket, timeoutMs: 100, reconnectMs: 60000, pollMs: 60000, onState: s => states.push( s ) } );
try {
	await obs.configure( { enabled: false } );
	assert.equal( FakeSocket.instances.length, 0, "disabled must not open a socket" );
	await assert.rejects( obs.command( "test" ), /disabled/ );
	await obs.configure( { enabled: true, password: "private" } );
	assert.equal( server.auth, obsAuthentication( "private", "salt", "challenge" ) );
	assert.equal( obs.state().recording, "stopped" );
	await assert.rejects( obs.command( "start" ), /status-only/ );
	assert.equal( server.requests.includes( "StartRecord" ), false );
	const count = FakeSocket.instances.length;
	await obs.configure( { enabled: true, controls: true, markers: true } );
	assert.equal( FakeSocket.instances.length, count, "permissions should not reconnect" );
	server.startDelayPolls = 2;
	await obs.command( "start" );
	assert.equal( server.starting, 0, "start acknowledgement must wait for an active output" );
	const id = obs.state().recordingId;
	assert.ok( id );
	assert.equal( obs.state().recording, "recording" );
	await obs.command( "start" );
	assert.equal( server.requests.filter( x => x === "StartRecord" ).length, 1, "a retake uses the current recording" );
	await obs.command( "marker", "Setup" );
	assert.ok( server.requests.includes( "CreateRecordChapter" ) );
	server.reject = "CreateRecordChapter";
	await assert.rejects( obs.command( "marker", "Another" ), /rejected/ );
	assert.equal( obs.state().recording, "recording", "chapter failures leave recording alone" );
	server.reject = null;
	await assert.rejects( obs.command( "stream" ), /Unknown/ );
	await obs.configure( { enabled: false } );
	assert.equal( server.active, true, "disabling must leave OBS recording" );
	assert.equal( server.requests.includes( "StopRecord" ), false );
	const disabledRequests = server.requests.length;
	FakeSocket.instances.at( -1 ).message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputActive: false } } } );
	assert.equal( obs.state().connection, "disabled", "old socket events must not revive OBS" );
	await assert.rejects( obs.command( "stop" ), /disabled/ );
	assert.equal( server.requests.length, disabledRequests );
	await obs.configure( { enabled: true, controls: true } );
	assert.equal( obs.state().recording, "recording", "join an existing recording" );
	server.paused = true;
	await assert.rejects( obs.command( "start" ), /paused/ );
	server.paused = false;
	server.stopDelayPolls = 2;
	await obs.command( "stop" );
	assert.equal( server.stopping, 0, "stop acknowledgement must wait for a stopped output" );
	assert.equal( obs.state().outputPath, "/recordings/test.mp4" );
	assert.equal( obs.state().recording, "stopped" );
	server.ignore = "GetRecordStatus";
	const waiting = obs.command( "start" );
	const held = server.lastRequest;
	const beforeRevocation = server.requests.filter( x => x === "StartRecord" ).length;
	await obs.configure( { enabled: true, controls: false } );
	server.ignore = null;
	FakeSocket.instances.at( -1 ).message( { op: 7, d: { requestId: held.requestId, requestType: "GetRecordStatus", requestStatus: { result: true }, responseData: { outputActive: false, outputPaused: false, outputDuration: 0 } } } );
	await assert.rejects( waiting, /settings changed/ );
	assert.equal( server.requests.filter( x => x === "StartRecord" ).length, beforeRevocation, "revoking controls must cancel a pending start" );
	await obs.configure( { enabled: true, controls: true } );
	server.ignore = "StartRecord";
	const firstStart = obs.command( "start" );
	await assert.rejects( obs.command( "start" ), /still waiting/ );
	await assert.rejects( firstStart, /did not confirm/ );
	assert.equal( obs.state().recording, null, "a timed out start leaves recording status unknown" );
	server.ignore = null;
	const close = new Event( "close" );
	close.code = 4009;
	FakeSocket.instances.at( -1 ).dispatchEvent( close );
	assert.equal( obs.state().connection, "disconnected" );
	assert.equal( obs.state().recording, null );
	assert.match( obs.state().error, /password/ );
	assert.ok( states.every( state => !JSON.stringify( state ).includes( "private" ) ), "password must not reach UI or logs" );
} finally {
	obs.dispose();
}

// Events supersede status requests sent earlier. Starting/stopping events are
// transitions, not proof of a finished output or a new recording identity.
server.active = false;
server.paused = false;
server.startDelayPolls = server.stopDelayPolls = 0;
const ordered = createObs( { WebSocketClass: FakeSocket, timeoutMs: 500, pollMs: 60000 } );
try {
	await ordered.configure( { enabled: true, controls: true } );
	await ordered.command( "start" );
	const firstId = ordered.state().recordingId;
	const socket = FakeSocket.instances.at( -1 );
	server.ignore = "GetRecordStatus";
	const oldPoll = ordered.command( "test" );
	const held = server.lastRequest;
	socket.message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputState: "OBS_WEBSOCKET_OUTPUT_STOPPING", outputActive: false } } } );
	assert.equal( ordered.state().recording, null );
	socket.message( { op: 7, d: { requestId: held.requestId, requestType: "GetRecordStatus", requestStatus: { result: true }, responseData: { outputActive: true, outputDuration: 2000 } } } );
	await oldPoll;
	assert.equal( ordered.state().recording, null, "a stale active poll must not undo stopping" );
	assert.equal( ordered.state().recordingId, firstId );
	server.ignore = null;
	await ordered.command( "test" );
	assert.equal( ordered.state().recording, null, "an active output draining during STOPPING is not a new recording" );
	socket.message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED", outputActive: false, outputPath: "same-file.mov" } } } );
	assert.equal( ordered.state().recordingId, firstId );
	assert.equal( ordered.state().recording, "stopped" );
	server.active = false;
	await ordered.command( "test" );
	assert.equal( ordered.state().recordingId, firstId );
	socket.message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputState: "OBS_WEBSOCKET_OUTPUT_STARTING", outputActive: false } } } );
	await ordered.command( "test" );
	assert.equal( ordered.state().recording, null, "starting is not a confirmed stop" );
	server.active = true;
	await ordered.command( "test" );
	const nextId = ordered.state().recordingId;
	assert.notEqual( nextId, firstId, "a real next recording needs its own identity" );
	socket.message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputState: "OBS_WEBSOCKET_OUTPUT_STARTED", outputActive: true } } } );
	assert.equal( ordered.state().recordingId, nextId, "confirmation must not duplicate an identity established by polling" );
} finally {
	ordered.dispose();
	server.active = false;
}

// Credentials use OS protection and do not fall back to plaintext on Linux.
const dir = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-obs-" ) );
const safe = {
	isAsyncEncryptionAvailable: async () => true,
	getSelectedStorageBackend: () => "gnome_libsecret",
	encryptStringAsync: async text => Buffer.from( text.split( "" ).reverse().join( "" ) ),
	decryptStringAsync: async data => ( { result: data.toString().split( "" ).reverse().join( "" ) } )
};
try {
	const credentials = createObsCredentials( dir, safe );
	assert.equal( await credentials.hasSaved(), false );
	assert.equal( await credentials.read(), "" );
	await credentials.write( "private" );
	assert.equal( await credentials.hasSaved(), true );
	assert.equal( await credentials.read(), "private" );
	assert.equal( ( await fs.readFile( path.join( dir, "obs-credentials.json" ), "utf8" ) ).includes( "private" ), false );
	const unavailable = createObsCredentials( dir, { ...safe, isAsyncEncryptionAvailable: async () => false } );
	await assert.rejects( unavailable.write( "secret" ), /unavailable/ );
	const basic = createObsCredentials( dir, { ...safe, getSelectedStorageBackend: () => "basic_text" }, { platform: "linux" } );
	await assert.rejects( basic.write( "secret" ), /unavailable/ );
	await credentials.write( "" );
	assert.equal( await credentials.read(), "" );
} finally {
	// Exact test-created files only; no recursive cleanup outside the workspace.
	await fs.rm( path.join( dir, "obs-credentials.json" ), { force: true } );
	await fs.rmdir( dir );
}

// Additive log schema: preserve old logs, deduplicate polls, retain file links.
let now = 1000;
const chapters = [];
const log = createTakeLog( { clock: () => now, onOpen: ( index, title ) => chapters.push( title ), onMarker: label => chapters.push( label ) } );
log.tick( { active: true, index: 0, title: "Intro", advanced: true } );
const status = { recordingId: "recording-1", connection: "connected", recording: "recording", outputDuration: 42 };
log.obs( status );
log.obs( { ...status, outputDuration: 99 } );
assert.equal( log.data().obs.length, 1 );
now += 2000;
log.marker( { label: "Setup" } );
log.tick( { active: false, index: 0 } );
log.obs( { ...status, recording: "stopped", outputPath: "/recordings/test.mp4" } );
assert.deepEqual( chapters, [ "Intro", "Setup" ] );
assert.equal( log.data().obs.at( -1 ).outputPath, "/recordings/test.mp4" );
const saved = log.data();
assert.equal( JSON.parse( editPack( saved )["take-log.json"] ).obs.at( -1 ).outputPath, "/recordings/test.mp4" );
log.load( saved );
assert.equal( log.data().obs.length, 2 );
log.load( { startedAt: saved.startedAt, takes: [] } );
assert.deepEqual( log.data().obs, [] );
log.reset();
assert.deepEqual( log.data().obs, [] );
console.log( "OBS connection, permissions, credentials and take-log tests pass" );
