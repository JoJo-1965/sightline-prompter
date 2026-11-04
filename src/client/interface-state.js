export const INTERFACE_DEFAULTS = { interfaceSettingsVersion: 1, speechEnabled: false, microphoneEnabled: false, padEnabled: false, gamepadEnabled: false, keyboardMappingsEnabled: false };
export const INTERFACES = {
	engine: { key: "speechEnabled", label: "Enable speech features" },
	microphone: { key: "microphoneEnabled", label: "Enable microphone input" },
	pad: { key: "padEnabled", label: "Enable floating pad" },
	pairing: { key: "phoneRemote", label: "Enable phone remote" },
	mappings: { key: "keyboardMappingsEnabled", label: "Enable custom keyboard mappings" },
	gamepad: { key: "gamepadEnabled", label: "Enable game controller" },
	streamdeck: { key: "streamDeck", label: "Enable Stream Deck control" },
	obs: { key: "obsEnabled", label: "Enable OBS integration" },
	api: { key: "remoteControl", label: "Enable local API" }
};
export function upgradeInterfaceSettings( previous = {} ) {
	if ( previous.interfaceSettingsVersion >= 1 ) return { ...previous };
	// These facilities used to be implicitly available. Preserve established
	// profiles; fresh/reset profiles use the explicit opt-ins above.
	return { speechEnabled: true, microphoneEnabled: true, padEnabled: true, gamepadEnabled: true, keyboardMappingsEnabled: true, ...previous, interfaceSettingsVersion: 1 };
}
export function interfaceEnabled( settings, id ) {
	return settings[INTERFACES[id]?.key] === true;
}
export function settingsSectionAvailable( settings, id ) {
	if ( [ "obs-recording", "obs-setup" ].includes( id ) ) return interfaceEnabled( settings, "obs" );
	if ( [ "commands", "words" ].includes( id ) ) return interfaceEnabled( settings, "engine" );
	return true;
}
export function voiceInputEnabled( settings ) {
	return settings.speechEnabled !== false && settings.microphoneEnabled !== false;
}
export function customInputEnabled( settings, kind ) {
	return kind === "gamepad" ? settings.gamepadEnabled !== false : settings.keyboardMappingsEnabled !== false;
}
