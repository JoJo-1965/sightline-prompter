import { agentReadiness } from "./component-availability.js";

export function createComponentSettings( root, { changeModel, toast, onStatus = () => {} } ) {
	const field = id => root.querySelector( `#${ id }` );
	let working = false;
	let speech = { installed: false };
	let checking = null;
	function paintSpeech( value ) {
		speech = value;
		const text = value.error ? `Model: ${ value.error }` : value.downloading ? `Working… ${ Math.min( 100, Math.round( value.received * 100 / value.total ) ) }%` : value.installed ? "Installed · offline English voice recognition" : "Not installed · optional 73 MB download";
		field( "component-speech-status" ).textContent = text;
		for ( const prefix of [ "component-speech", "set-speech-model" ] ) {
			for ( const action of [ "reinstall", "remove" ] ) {
				field( `${ prefix }-${ action }` ).classList.toggle( "hidden", !value.installed );
				field( `${ prefix }-${ action }` ).disabled = working || value.downloading;
			}
		}
		field( "component-speech-install" ).classList.toggle( "hidden", value.installed );
		field( "component-speech-install" ).disabled = working || value.downloading;
	}
	async function check() {
		try {
			const result = await window.electron.components();
			if ( result.error ) throw new Error( result.error );
			paintSpeech( result.speech );
			field( "component-kit-status" ).textContent = result.kit.installed ? `Installed · ${ result.kit.version }${ result.kit.current ? "" : " · Reinstall to refresh from this app" }` : "Not installed · supplied with Sightline";
			field( "component-kit-commands" ).textContent = agentReadiness( result );
			for ( const action of [ "install", "reinstall", "remove", "open" ] ) {
				field( `component-kit-${ action }` ).classList.toggle( "hidden", action === "open" ? false : action === "install" ? result.kit.installed : !result.kit.installed );
				field( `component-kit-${ action }` ).disabled = working || ( action === "open" && !result.kit.installed );
			}
			field( "component-kit-open" ).title = result.kit.installed ? "Open the kit and START-HERE instructions" : "Install the AI agent kit first";
			field( "component-node-status" ).textContent = result.node.ready ? `Available · Node.js ${ result.node.version }` : result.node.installed ? `Update needed · ${ result.node.version }. Commands need 22.16 or later.` : "Not found · AI commands need Node.js 22.16 or later";
			for ( const name of [ "obs", "streamdeck" ] ) {
				const app = result[name];
				field( `component-${ name }-status` ).textContent = app.supported === false ? "Not supported on this operating system" : app.installed ? "Installed · use the app's own updater for version updates" : "Not found · install or locate a portable/custom copy";
				field( `component-${ name }-locate` ).disabled = working || !app.supported;
				field( `component-${ name }-check` ).disabled = working;
				if ( name === "streamdeck" ) field( "component-streamdeck-plugin" ).textContent = app.plugin ? `Sightline plugin ${ app.plugin.version } found. Check compatibility in Controls > Stream Deck to confirm the live connection.` : "Sightline plugin not found in the usual folder. Check compatibility in Controls > Stream Deck; a live connection confirms custom plugin installs.";
			}
			onStatus( result );
		} catch ( err ) {
			field( "component-kit-status" ).textContent = err.message;
			field( "component-kit-open" ).disabled = true;
			field( "component-kit-commands" ).textContent = "Could not check components. Use Check again.";
			onStatus( { error: err.message } );
		}
	}
	function refresh() {
		checking ??= check().finally( () => {
			checking = null;
		} );
		return checking;
	}
	async function change( component, action ) {
		if ( working || ( component === "speech" && speech.downloading ) ) return;
		if ( action === "remove" && !root.ownerDocument.defaultView.confirm( `Remove the ${ component === "speech" ? "offline speech model" : "managed AI agent kit" }? It will move to your system bin. You can install it again here.` ) ) return;
		working = true;
		await checking;
		for ( const button of root.querySelectorAll( "[id^=component-] button, button[id^=component-], #set-speech-model-reinstall, #set-speech-model-remove" ) ) button.disabled = true;
		field( `component-${ component }-status` ).textContent = "Working…";
		try {
			const result = component === "speech" ? await changeModel( action ) : await window.electron.components( "kit", action );
			if ( result?.error ) throw new Error( result.error );
			toast( action === "open" ? "AI kit folder opened" : `${ component === "speech" ? "Speech model" : "AI kit" }: ${ action === "remove" ? "removed" : "ready" }` );
		} catch ( err ) {
			toast( err.message );
		} finally {
			working = false;
			field( "component-refresh" ).disabled = false;
			await refresh();
		}
	}
	for ( const component of [ "speech", "kit" ] ) {
		for ( const action of [ "install", "reinstall", "remove", ...( component === "kit" ? [ "open" ] : [] ) ] ) field( `component-${ component }-${ action }` ).addEventListener( "click", () => change( component, action ) );
	}
	for ( const action of [ "reinstall", "remove" ] ) field( `set-speech-model-${ action }` ).addEventListener( "click", () => change( "speech", action ) );
	field( "component-refresh" ).addEventListener( "click", refresh );
	for ( const name of [ "obs", "streamdeck" ] ) field( `component-${ name }-check` ).addEventListener( "click", refresh );
	for ( const name of [ "obs", "streamdeck" ] ) field( `component-${ name }-locate` ).addEventListener( "click", async () => {
		if ( working ) return;
		working = true;
		field( `component-${ name }-locate` ).disabled = true;
		try {
			const result = await window.electron.components( name, "locate" );
			if ( result.error ) throw new Error( result.error );
		} catch ( error ) {
			toast( error.message );
		} finally {
			working = false;
			await refresh();
		}
	} );
	return { refresh, paintSpeech };
}
