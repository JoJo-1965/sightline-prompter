import { BrowserWindow, dialog, ipcMain, shell, screen } from "electron";
import { windowPlacement, rememberWindow } from "./utils/window-placement.js";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { buildPostRecord, normaliseTranscript } from "./client/post-record.js";
import { editPack } from "./client/edit-pack.js";
import { logFingerprint, reviewedLog, saveReview, reviewInputsUnchanged } from "./recording-review-store.js";

const safeJson = async file => {
	const stat = await fs.stat( file );
	if ( !stat.isFile() || stat.size > 25 * 1024 * 1024 ) throw Error( "Choose a JSON file smaller than 25 MB" );
	return JSON.parse( ( await fs.readFile( file, "utf8" ) ).replace( /^\uFEFF/, "" ) );
};

export function createRecordingReview( { dir, profile, dialogParent, getSettings, saveSettings, busy = () => false, readme = async () => "", openGuide = () => {} } ) {
	let window = null, data = null, source = null, reference = null, media = [], transcripts = [], offsets = [], inputs = [], report = null;
	let active = null, runningAction = false, message = "Choose a finished session. Original logs and recordings stay unchanged.", runtime = null;
	const configFile = path.join( profile, "recording-review-runtime.json" );
	let config = { python: process.platform === "win32" ? "python" : "python3", cache: path.join( profile, "review-models" ) };
	const worker = path.join( dir, "recording-review-worker.py" ).replace( /app\.asar([\\/])/, "app.asar.unpacked$1" );
	const summary = () => ( {
		busy: !!active || runningAction, message, runtime, python: config.python,
		source: source ? { name: path.basename( source ), takes: data?.takes.length, fingerprint: logFingerprint( data ).slice( 0, 12 ) } : null,
		reference: reference ? { ...reference, name: path.basename( reference.file ), url: pathToFileURL( reference.file ).href, file: undefined } : null,
		media: media.map( m => ( { name: path.basename( m.file ), id: m.id, offset: offsets.find( o => o.id === m.id ) ?? null } ) ),
		transcripts: transcripts.map( t => ( { name: t.name, words: t.words.length, offsetS: t.sessionOffsetS, sourceClock: t.sourceClock, engine: t.engine } ) ),
		report: report ? { ...report, transcripts: undefined, takes: report.takes.map( t => ( { ...t, words: undefined, sentences: undefined, issues: t.issues.slice( 0, 100 ) } ) ) } : null
	} );
	const update = text => { if ( text ) message = text; if ( window && !window.isDestroyed() ) window.webContents.send( "recordingReviewState", summary() ); };
	function assertIdle() { if ( active ) throw Error( "Wait for the current job or cancel it" ); if ( busy() ) throw Error( "Pause prompting and finish the recorder before audio review" ); }
	const validOffset = value => {
		if ( value === "" || value === null || !Number.isFinite( Number( value ) ) || Math.abs( Number( value ) ) > 86400 ) throw Error( "Enter the file's session offset in seconds, or choose session-clock transcript" );
		return Number( value );
	};
	async function fingerprintInput( file, before ) {
		const hash = crypto.createHash( "sha256" );
		for await ( const block of createReadStream( file ) ) hash.update( block );
		const stat = await fs.stat( file );
		if ( before && ( stat.size !== before.size || stat.mtimeMs !== before.mtimeMs ) ) throw Error( "An audio input changed during analysis. Analyse the finished file again." );
		return { localPath: file, file: path.basename( file ), size: stat.size, mtimeMs: stat.mtimeMs, sha256: hash.digest( "hex" ) };
	}
	const rememberInput = input => { inputs = [ ...inputs.filter( i => i.localPath !== input.localPath ), input ]; };
	function job( action, args = {} ) {
		assertIdle();
		return new Promise( ( resolve, reject ) => {
			const env = Object.fromEntries( Object.entries( process.env ).filter( ( [ key ] ) => [ "path", "systemroot", "windir", "temp", "tmp", "home", "userprofile", "appdata", "localappdata", "homedrive", "homepath", "lang", "lc_all", "ssl_cert_file", "ssl_cert_dir", "requests_ca_bundle", "https_proxy", "http_proxy", "no_proxy" ].includes( key.toLowerCase() ) ) );
			const child = spawn( config.python, [ worker ], { windowsHide: true, stdio: [ "pipe", "pipe", "pipe" ], env: { ...env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8", HF_HUB_DISABLE_TELEMETRY: "1" } } );
			let text = "", errorText = "", result = null, problem = null, cancelled = false;
			const timer = setTimeout( () => { problem = "Analysis exceeded 30 minutes. Try a shorter file."; child.kill(); }, 30 * 60000 );
			const recordingGuard = setInterval( () => { if ( busy() ) { problem = "Analysis stopped because prompting or recording started. Previous review evidence is retained."; child.kill(); } }, 500 );
			active = { cancel: () => { cancelled = true; child.kill(); } };
			update( "Starting local audio analysis…" );
			child.stdin.on( "error", () => {} ); child.stdout.setEncoding( "utf8" ); child.stderr.setEncoding( "utf8" );
			child.stdout.on( "data", block => {
				text += block.toString();
				if ( text.length > 50 * 1024 * 1024 ) { problem = "Analysis output is too large"; child.kill(); return; }
				let newline;
				while ( ( newline = text.indexOf( "\n" ) ) >= 0 ) {
					const line = text.slice( 0, newline ); text = text.slice( newline + 1 );
					try { const event = JSON.parse( line ); if ( event.type === "progress" ) update( String( event.message ).slice( 0, 500 ) ); if ( event.type === "result" ) result = event.result; if ( event.type === "error" ) problem = String( event.message ); } catch { /* External library messages are not protocol. */ }
				}
			} );
			child.stderr.on( "data", block => errorText = ( errorText + block.toString() ).slice( -4000 ) );
			child.on( "error", error => { problem = `Python could not start: ${ error.message }. Choose the local review runtime.`; } );
			child.on( "close", code => {
				clearTimeout( timer ); clearInterval( recordingGuard ); active = null;
				if ( cancelled ) reject( Error( "Cancelled. Original files and the last saved review are unchanged." ) );
				else if ( code !== 0 || problem || !result ) reject( Error( problem ?? ( errorText || "Local analysis failed" ) ) );
				else resolve( result );
				update();
			} );
			child.stdin.end( JSON.stringify( { action, cache: config.cache, ...args } ) + "\n" );
		} );
	}
	async function load( file ) {
		assertIdle();
		const next = await safeJson( file );
		if ( !Array.isArray( next.takes ) || !next.takes.length || next.takes.length > 5000 || !next.startedAt ) throw Error( "Choose a finished Sightline take-log JSON with a session clock" );
		for ( const t of next.takes ) if ( !Number.isFinite( t.start ) || !Number.isFinite( t.end ) || t.end < t.start ) throw Error( "The take log contains invalid ranges" );
		data = next; source = file; reference = null; media = []; transcripts = []; offsets = []; inputs = []; report = null;
		for ( const audio of [ ...( next.audio ?? [] ) ].reverse() ) {
			if ( typeof audio.file !== "string" || /[\\/]/.test( audio.file ) ) continue;
			for ( const folder of [ path.join( path.dirname( file ), "scratch-audio" ), path.join( path.dirname( file ), "..", "scratch-audio" ) ] ) {
				const candidate = path.join( folder, audio.file );
				try { await fs.access( candidate ); reference = { file: candidate, startS: audio.startExactS ?? audio.start, clockUncertaintyS: audio.startExactS === undefined ? .05 : .005 }; break; } catch { /* Missing scratch audio is optional. */ }
			}
			if ( reference ) break;
		}
		const saved = await reviewedLog( data, profile );
		if ( saved !== data && saved.postRecord ) {
			report = saved.postRecord; transcripts = report.transcripts; offsets = report.recordings; inputs = report.inputs ?? [];
			media = offsets.flatMap( offset => { const input = inputs.find( i => i.sha256 === offset.mediaSha256 ); return input ? [ { file: input.localPath, id: offset.id } ] : []; } );
			if ( !reference ) { const input = inputs.find( i => i.sha256 === transcripts[0]?.sourceSha256 || i.sha256 === offsets[0]?.referenceSha256 ); if ( input ) reference = { file: input.localPath, startS: transcripts[0]?.sessionOffsetS ?? offsets[0]?.referenceStartS ?? null, clockUncertaintyS: .05 }; }
		}
		update( `Loaded ${ data.takes.length } takes. ${ reference ? "Scratch audio found." : "Choose a scratch or reference soundtrack to continue." }` );
	}
	async function choose( kind ) {
		assertIdle();
		const selection = await dialog.showOpenDialog( window, { title: kind === "log" ? "Choose a finished Sightline take log" : kind === "python" ? "Choose the local review Python executable" : "Choose audio or a recording with audio", properties: [ "openFile" ], ...( [ "log", "transcript" ].includes( kind ) ? { filters: [ { name: "JSON", extensions: [ "json" ] } ] } : {} ) } );
		return selection.canceled ? null : selection.filePaths[0];
	}
	async function rebuild() {
		if ( !data ) throw Error( "Choose a finished session first" );
		report = await saveReview( data, { ...buildPostRecord( data, transcripts, offsets ), inputs }, profile );
		update( "Review saved separately. Listen to the candidates before making editorial decisions." );
	}
	async function action( name, args = {} ) {
		if ( name === "state" ) return summary();
		if ( name === "cancel" ) { active?.cancel(); return summary(); }
		if ( name === "help" ) { openGuide( "19-post-record-review.md" ); return summary(); }
		assertIdle();
		if ( name === "choose-log" ) { const file = await choose( "log" ); if ( file ) await load( file ); }
		else if ( name === "choose-python" ) { const file = await choose( "python" ); if ( file ) { config.python = file; await fs.writeFile( configFile, JSON.stringify( config, null, 2 ) ); runtime = null; update( "Runtime selected. Check it before analysis." ); } }
		else if ( name === "check" ) { runtime = await job( "check" ); update( runtime.modelReady ? "Local runtime and model are ready." : "Local runtime checked. Download the model once before transcription." ); }
		else if ( name === "download" ) { await job( "download" ); runtime = { ...( runtime ?? {} ), modelReady: true }; update( "small.en is ready. Transcription runs locally without uploading audio." ); }
		else if ( name === "choose-reference" ) {
			const file = await choose( "audio" );
			if ( file ) { const found = data?.audio?.find( a => a.file === path.basename( file ) ); reference = { file, startS: found?.startExactS ?? found?.start ?? null, clockUncertaintyS: found?.startExactS === undefined ? .05 : .005 }; update( "Reference selected. Confirm its session start before analysing." ); }
		} else if ( name === "add-media" ) { const file = await choose( "audio" ); if ( file && !media.some( m => m.file === file ) ) { media.push( { file, id: crypto.createHash( "sha256" ).update( file ).digest( "hex" ).slice( 0, 16 ) } ); update( "Recording added. Measure each file independently." ); } }
		else if ( name === "transcribe" ) {
			if ( !data || !reference ) throw Error( "Choose a session and reference audio first" );
			const offset = validOffset( args.offsetS );
			const before = await fs.stat( reference.file );
			const raw = await job( "transcribe", { file: reference.file } );
			const input = await fingerprintInput( reference.file, before ); rememberInput( input );
			const next = normaliseTranscript( raw, { offsetS: offset, name: path.basename( reference.file ) } );
			next.sourceSha256 = input.sha256;
			transcripts = [ next ]; reference.startS = offset; await rebuild();
		} else if ( name === "import" ) {
			if ( !data ) throw Error( "Choose a session first" );
			const file = await choose( "transcript" );
			if ( file ) { const next = normaliseTranscript( await safeJson( file ), { name: path.basename( file ), clock: args.clock, offsetS: args.clock === "session" ? 0 : validOffset( args.offsetS ) } ); transcripts = [ next ]; await rebuild(); }
		} else if ( name === "sync" ) {
			if ( !data || !reference ) throw Error( "Choose a session and reference audio first" );
			const recording = media.find( m => m.id === args.id ); if ( !recording ) throw Error( "Choose a recording first" );
			const start = validOffset( args.offsetS );
			const beforeReference = await fs.stat( reference.file ), beforeMedia = await fs.stat( recording.file );
			const measured = await job( "sync", { reference: reference.file, file: recording.file, referenceStartS: start, clockUncertaintyS: reference.clockUncertaintyS } );
			const referenceInput = await fingerprintInput( reference.file, beforeReference ), mediaInput = await fingerprintInput( recording.file, beforeMedia ); rememberInput( referenceInput ); rememberInput( mediaInput );
			const result = { ...measured, id: recording.id, file: path.basename( recording.file ), mediaSha256: mediaInput.sha256, referenceSha256: referenceInput.sha256, referenceStartS: start, reference: path.basename( reference.file ) };
			offsets = [ ...offsets.filter( o => o.id !== result.id ), result ]; reference.startS = start; await rebuild();
		} else if ( name === "export" ) {
			if ( !data || !report ) throw Error( "Create or load a review first" );
			if ( logFingerprint( await safeJson( source ) ) !== report.sourceFingerprint ) throw Error( "The source log changed. Reload it and analyse again before exporting." );
			if ( !await reviewInputsUnchanged( report ) ) throw Error( "A reviewed audio or recording file changed. Analyse it again before exporting." );
			const result = await dialog.showOpenDialog( window, { title: "Save a new reviewed edit pack", properties: [ "openDirectory", "createDirectory" ] } );
			if ( !result.canceled ) {
				const originalBytes = await fs.readFile( source );
				if ( logFingerprint( JSON.parse( originalBytes.toString( "utf8" ).replace( /^\uFEFF/, "" ) ) ) !== report.sourceFingerprint || !await reviewInputsUnchanged( report ) ) throw Error( "The source or audio changed while choosing the export folder. Analyse it again." );
				const base = path.join( result.filePaths[0], "Sightline reviewed edit pack" ); let out = base;
				for ( let i = 2; await fs.access( out ).then( () => true, () => false ); i++ ) out = base + ` (${ i })`;
				await fs.mkdir( out );
				const augmented = { ...data, postRecord: report, recordings: [ ...( data.recordings ?? [] ), ...report.recordings ] };
				const files = { ...editPack( augmented, await readme() ), "original-take-log.json": originalBytes };
				for ( const [ name, content ] of Object.entries( files ) ) {
					const file = path.resolve( out, name ); if ( !file.startsWith( out + path.sep ) ) throw Error( "Invalid export path" );
					await fs.writeFile( file, content );
				}
				update( "Reviewed edit pack exported to a new folder." ); shell.openPath( out );
			}
		}
		else throw Error( "Unknown review action" );
		return summary();
	}
	ipcMain.handle( "recordingReview", async ( event, name, args ) => {
		if ( !window || window.isDestroyed() || event.sender !== window.webContents ) return { error: "Review window required" };
		if ( [ "state", "cancel", "help" ].includes( name ) ) return action( name, args );
		if ( runningAction ) return { ...summary(), error: "Wait for the current action or cancel analysis" };
		runningAction = true;
		try { await action( name, args ); } catch ( error ) { update( error.message ); }
		finally { runningAction = false; update(); }
		return summary();
	} );
	return {
		async open( file ) {
			if ( !window || window.isDestroyed() ) {
				try { config = { ...config, ...JSON.parse( await fs.readFile( configFile, "utf8" ) ) }; } catch { /* Optional runtime config. */ }
				const parent = dialogParent();
				const bounds = windowPlacement( getSettings().utilityWindowBounds?.recordingReview, parent.getBounds(), screen.getAllDisplays(), { width: 1180, height: 850 } );
				window = new BrowserWindow( { ...bounds, parent, minWidth: Math.min( 680, bounds.width ), minHeight: Math.min( 500, bounds.height ), title: "Sightline Recording review", backgroundColor: "#242b33", show: false, webPreferences: { nodeIntegration: false, sandbox: false, preload: path.join( dir, "client", "recording-review-preload.mjs" ) } } );
				rememberWindow( window, "recordingReview", { screen, getSettings, saveSettings } );
				window.removeMenu(); window.webContents.setWindowOpenHandler( () => ( { action: "deny" } ) ); window.webContents.on( "will-navigate", e => e.preventDefault() );
				window.on( "closed", () => { active?.cancel(); window = null; } );
				await window.loadFile( path.join( dir, "client", "recording-review.html" ) );
			}
			if ( file && !runningAction ) { try { await load( file ); } catch ( error ) { update( error.message ); } }
			window.show(); window.focus();
		},
		dispose() { active?.cancel(); window?.destroy(); window = null; ipcMain.removeHandler( "recordingReview" ); }
	};
}
