export function createComponentSettings( root, { changeModel, toast } ) {
	const field = id => root.querySelector( `#${ id }` );
	let working = false;
	let speech = { installed: false };
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
	async function refresh() {
		try {
			const result = await window.electron.components();
			if ( result.error ) throw new Error( result.error );
			paintSpeech( result.speech );
			field( "component-kit-status" ).textContent = result.kit.installed ? `Installed · ${ result.kit.version }${ result.kit.current ? "" : " · Reinstall to refresh from this app" }` : "Not installed · supplied with Sightline";
			for ( const action of [ "install", "reinstall", "remove", "open" ] ) {
				field( `component-kit-${ action }` ).classList.toggle( "hidden", action === "install" ? result.kit.installed : !result.kit.installed );
				field( `component-kit-${ action }` ).disabled = working;
			}
			field( "component-node-status" ).textContent = result.node.ready ? `Available · Node.js ${ result.node.version }` : result.node.installed ? `Update needed · ${ result.node.version }. Commands need 22.16 or later.` : "Not found · AI commands need Node.js 22.16 or later";
		} catch ( err ) {
			field( "component-kit-status" ).textContent = err.message;
		}
	}
	async function change( component, action ) {
		if ( working || ( component === "speech" && speech.downloading ) ) return;
		if ( action === "remove" && !root.ownerDocument.defaultView.confirm( `Remove the ${ component === "speech" ? "offline speech model" : "managed AI agent kit" }? It will move to your system bin. You can install it again here.` ) ) return;
		working = true;
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
	return { refresh, paintSpeech };
}
