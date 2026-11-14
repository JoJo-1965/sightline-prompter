import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import http from "node:http";
import { createObs } from "../src/obs.js";
import { createObsLedger } from "../src/obs-ledger.js";
import { recordingAssociations } from "../src/client/recording-associations.js";
import { buildPostRecord, normaliseTranscript, transcriptTimingQuality } from "../src/client/post-record.js";
import { editPack } from "../src/client/edit-pack.js";
import { createSessionDiagnostics } from "../src/client/session-diagnostics.js";
import { createCommandListener } from "../src/client/voice-commands.js";
import { mcpConfigurations, checkMcpConnection } from "../src/mcp-setup.js";

const pause = () => new Promise( resolve => setTimeout( resolve, 2 ) );
const ledger = createObsLedger();
let active = true, duration = 5000, heldStop;
class Socket extends EventTarget {
	static current;
	constructor() {
		super();
		Socket.current = this;
		queueMicrotask( () => this.message( { op: 0, d: { rpcVersion: 1 } } ) );
	}

	message( value ) {
		this.dispatchEvent( new MessageEvent( "message", { data: JSON.stringify( value ) } ) );
	}

	close() {}
	send( raw ) {
		const { op, d } = JSON.parse( raw );
		if ( op === 1 ) return queueMicrotask( () => this.message( { op: 2, d: {} } ) );
		if ( d.requestType === "StopRecord" ) {
			heldStop = d;
			return;
		}
		const responseData = d.requestType === "GetRecordStatus" ? { outputActive: active, outputDuration: duration } : { availableRequests: [] };
		queueMicrotask( () => this.message( { op: 7, d: { ...d, requestStatus: { result: true }, responseData } } ) );
	}
}
const obs = createObs( { WebSocketClass: Socket, timeoutMs: 200, reconnectMs: 5, pollMs: 60000, onState: state => ledger.observe( state ) } );
const event = ( state, outputActive, outputPath ) => Socket.current.message( { op: 5, d: { eventType: "RecordStateChanged", eventData: { outputState: `OBS_WEBSOCKET_OUTPUT_${ state }`, outputActive, outputPath } } } );
try {
	await obs.configure( { enabled: true, controls: true } );
	const firstId = obs.state().recordingId;
	const stopping = obs.command( "stop" );
	for ( let i = 0; !heldStop && i < 100; i++ ) await pause();
	assert.ok( heldStop );
	event( "STOPPED", false, "first.mov" );
	event( "STARTING", false );
	event( "STARTED", true );
	const secondId = obs.state().recordingId;
	assert.notEqual( secondId, firstId );
	assert.equal( obs.state().outputPath, null );
	Socket.current.message( { op: 7, d: { ...heldStop, requestStatus: { result: true }, responseData: { outputPath: "first.mov" } } } );
	await assert.rejects( stopping, /another OBS recording/ );
	assert.equal( obs.state().recordingId, secondId );
	assert.equal( obs.state().outputPath, null, "Late stop replies cannot contaminate a new output" );
	assert.equal( ledger.attach( { takes: [ { section: 1, take: 1, obsStart: { recordingId: firstId } } ] } ).obsRecordings[0].outputPath, "first.mov" );
	const disconnected = new Event( "close" );
	disconnected.code = 1006;
	Socket.current.dispatchEvent( disconnected );
	for ( let i = 0; obs.state().connection !== "connected" && i < 100; i++ ) await pause();
	assert.equal( obs.state().identityUncertain, true, "A connection gap cannot prove output continuity" );
	await obs.command( "test" );
	duration = 100;
	const beforeReset = obs.state().recordingId;
	await obs.command( "test" );
	assert.notEqual( obs.state().recordingId, beforeReset, "A clock rollback needs a distinct recording identity" );
	Socket.current.message( { op: 5, d: { eventType: "RecordFileChanged", eventData: { oldOutputPath: "second.mov", newOutputPath: "split.mov" } } } );
	assert.equal( obs.state().outputPath, "split.mov" );
	assert.equal( obs.state().fileClockUnknown, true );
} finally {
	obs.dispose();
}

const start = "2026-11-14T10:00:00.000Z";
const source = { startedAt: start, events: [], takes: [
	{ section: 1, take: 1, start: 0, end: 4, sentences: [ { s: 0, from: 0, text: "Same opening words" } ], obsStart: { recordingId: "A", seconds: 1 } },
	{ section: 1, take: 2, start: 5, end: 9, sentences: [ { s: 0, from: 0, text: "Same opening words" } ], obsStart: { recordingId: "B", seconds: 0 }, obsEnd: { recordingId: "B", seconds: 4 } }
], obsRecordings: [ { recordingId: "A", outputPath: "first.mov" }, { recordingId: "B", outputPath: "redo.mov" } ] };
for ( const take of source.takes ) {
	take.markers = [];
	take.words = [];
	take.duration = take.end - take.start;
}
const original = JSON.stringify( source );
const transcript = normaliseTranscript( [ "Same", "opening", "words" ].map( ( word, i ) => ( { word, start: 5.1 + i, end: 5.6 + i, probability: 0.9 } ) ), { clock: "session" } );
const review = buildPostRecord( source, [ transcript ] );
assert.equal( review.takes[0].status, "unavailable", "The first take cannot borrow a later retake's identical opening" );
assert.equal( review.takes[0].issues.length, 0, "No transcript coverage is not a missing-speech verdict" );
assert.equal( review.takes[1].coverage, 1 );
assert.equal( JSON.stringify( source ), original );
const bunched = normaliseTranscript( [ "Same", "opening", "words" ].map( word => ( { word, start: 5.2, end: 5.2 } ) ), { clock: "session" } );
assert.equal( buildPostRecord( source, [ bunched ] ).takes[1].estimatedWpm, null );
assert.equal( transcriptTimingQuality( bunched.words ).sharedStarts, 2 );
assert.equal( review.takes[1].timingQuality.verified, false );
assert.equal( JSON.parse( editPack( { ...source, postRecord: review } )["timing-quality.json"] ).transcriptTimingQuality.words, 3 );
assert.equal( recordingAssociations( source )[1].files[0].outputPath, "redo.mov" );
assert.equal( JSON.parse( editPack( source )["recording-links.json"] )[0].files[0].outputPath, "first.mov" );
assert.equal( recordingAssociations( { takes: [ { section: 1, take: 1 } ] } )[0].status, "no-recorder-evidence" );

let now = 0;
const diagnostics = createSessionDiagnostics( { clock: () => now } );
diagnostics.input( { input: "Chosen mic", requested: "selected input", deviceId: "private-device-id", applied: { deviceId: "private-device-id", autoGainControl: false } } );
const resolved = [];
const listener = createCommandListener( { onCommand: () => {}, onResolved: ( result ) => {
	resolved.push( result );
	diagnostics.command( { ...result, outcome: "recognised" } );
} } );
listener( [ "Ordinary", "script", "speech" ], true );
assert.equal( resolved.length, 0 );
listener( [ "Prompter", "section", "twelve" ], true );
assert.equal( resolved[0].heard, "Prompter section twelve" );
assert.equal( JSON.stringify( diagnostics.snapshot() ).includes( "private-device-id" ), false );
assert.equal( diagnostics.snapshot( { includeWords: false } ).command.heard, undefined );
now = 600001;
assert.equal( diagnostics.snapshot().command, null );
diagnostics.command( { heard: "clear me" } );
diagnostics.clear();
assert.equal( diagnostics.snapshot().command, null );

const folder = await fs.mkdtemp( path.join( os.tmpdir(), "sightline-rc15-" ) );
const token = "ab".repeat( 24 );
let requests = 0, code = 200;
const server = http.createServer( ( req, res ) => {
	requests++;
	assert.equal( req.method, "GET" );
	assert.equal( req.url, "/status" );
	assert.equal( req.headers.authorization, `Bearer ${ token }` );
	res.writeHead( code, { "Content-Type": "application/json" } );
	res.end( JSON.stringify( { appVersion: "fixture" } ) );
} );
server.listen( 0, "127.0.0.1" );
await once( server, "listening" );
try {
	const configurations = mcpConfigurations( { adapter: "C:\\O'Brien kit\\scripts\\sightline-mcp.mjs", profile: "D:\\My profile", platform: "win32" } );
	assert.equal( JSON.parse( configurations.json ).mcpServers.sightline.env.SIGHTLINE_SETTINGS, "D:/My profile" );
	assert.match( configurations.codex, /O''Brien/ );
	assert.equal( configurations.json.includes( token ), false );
	assert.equal( ( await checkMcpConnection( folder ) ).ok, false );
	assert.equal( requests, 0 );
	await fs.writeFile( path.join( folder, "mcp-control.json" ), JSON.stringify( { url: `http://127.0.0.1:${ server.address().port }`, token } ) );
	assert.equal( ( await checkMcpConnection( folder ) ).ok, true );
	code = 401;
	assert.match( ( await checkMcpConnection( folder ) ).message, /revoked/ );
	await fs.writeFile( path.join( folder, "mcp-control.json" ), JSON.stringify( { url: "https://example.com", token } ) );
	assert.equal( ( await checkMcpConnection( folder ) ).ok, false );
	assert.equal( requests, 2 );
} finally {
	server.closeAllConnections();
	await new Promise( resolve => server.close( resolve ) );
	await fs.rm( folder, { recursive: true, force: true } );
}
console.log( "PASS RC15: late stop/new output, reconnect uncertainty, clock restart/split files, isolated take comparison, timing quality, private session diagnostics and read-only profile-correct MCP setup" );
