// Local version/capability exchange, not plugin identity or an update service.
export const STREAM_DECK_PROTOCOL = 1;
export const MINIMUM_PLUGIN_VERSION = "0.1.5";
export const RECOMMENDED_PLUGIN_VERSION = "0.2.0";

export function versionAtLeast( version, minimum ) {
	const parts = ( value ) => {
		if ( typeof value !== "string" || value.length > 64 || !/^v?\d+\.\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?$/.test( value ) ) return null;
		return value.replace( /^v/, "" ).split( "-" )[0].split( "." ).map( Number );
	};
	const a = parts( version );
	const b = parts( minimum );
	if ( !a || !b ) return false;
	for ( let i = 0; i < 4; i++ ) {
		if ( ( a[i] ?? 0 ) !== ( b[i] ?? 0 ) ) return ( a[i] ?? 0 ) > ( b[i] ?? 0 );
	}
	return true;
}

export function streamDeckContract() {
	return {
		protocolVersion: STREAM_DECK_PROTOCOL,
		minimumPluginVersion: MINIMUM_PLUGIN_VERSION,
		recommendedPluginVersion: RECOMMENDED_PLUGIN_VERSION
	};
}

export function createStreamDeckPeer( { now = Date.now, ttl = 30000, onChange = () => {} } = {} ) {
	let peer = null;
	let timer = null;
	return {
		hello( { pluginVersion, protocolVersion } = {} ) {
			if ( !versionAtLeast( pluginVersion, "0.0.0" ) || !Number.isInteger( protocolVersion ) || protocolVersion < 1 ) {
				throw Object.assign( new Error( "A valid pluginVersion and protocolVersion are required" ), { status: 400 } );
			}
			const compatible = protocolVersion === STREAM_DECK_PROTOCOL && versionAtLeast( pluginVersion, MINIMUM_PLUGIN_VERSION );
			const update = protocolVersion > STREAM_DECK_PROTOCOL ? "Sightline" : "the Stream Deck plugin";
			peer = {
				pluginVersion, protocolVersion, compatible,
				updateRecommended: compatible && !versionAtLeast( pluginVersion, RECOMMENDED_PLUGIN_VERSION ),
				message: compatible ? "Compatible" : `Update ${ update } to use this connection`,
				lastSeen: now()
			};
			clearTimeout( timer );
			timer = setTimeout( onChange, ttl + 1 );
			timer.unref?.();
			onChange();
			return this.status();
		},
		status() {
			return {
				...streamDeckContract(),
				...peer,
				connected: !!peer && now() - peer.lastSeen < ttl
			};
		},
		clear() {
			clearTimeout( timer );
			peer = null;
		}
	};
}
