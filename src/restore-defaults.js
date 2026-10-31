// Reset only application preferences. Installed components, external component
// locations, recordings and credential files are deliberately outside this path.
export function shippedState( defaults, serviceKey, tokens ) {
	return { ...structuredClone( defaults ), deepgramApiKey: serviceKey, ...tokens, showGettingStarted: true };
}

export function resetBlocked( { renderer, obs, obsEnabled, dirty, maintaining } ) {
	if ( renderer.scrolling || renderer.preparing ) return "Pause prompting and wait for the slate/countdown to finish first.";
	if ( renderer.editing || dirty ) return "Save or close the script editor before restoring defaults.";
	if ( obs.setupBusy || obs.recordingBusy || ( obsEnabled && ( obs.connection !== "connected" || obs.recording !== "stopped" ) ) ) return "Connect OBS and stop its recording/setup before restoring defaults.";
	if ( maintaining ) return "Wait for component installation or maintenance to finish first.";
	return null;
}

export function createDefaultsRestore( { blocked, confirm, flush, settle, replace, clearUi, restart, rollback } ) {
	let busy = false;
	return async () => {
		if ( busy ) return { ok: false, error: "Restore defaults is already in progress." };
		busy = true;
		try {
			let reason = await blocked();
			if ( reason ) return { ok: false, error: reason };
			if ( !await confirm() ) return { ok: true, cancelled: true };
			reason = await blocked();
			if ( reason ) return { ok: false, error: reason };
			if ( !await flush() ) return { ok: false, error: "The current take log could not finish saving. Try again before resetting." };
			reason = await blocked();
			if ( reason ) return { ok: false, error: reason };
			await settle();
			await replace();
			await clearUi();
			restart();
			return { ok: true, restarting: true };
		} catch ( error ) {
			try {
				await rollback();
			} catch {
				return { ok: false, error: "Restore failed. Keep Sightline open and use its local app-state.before-defaults.json backup before restarting." };
			}
			return { ok: false, error: `Defaults could not be restored: ${ error.message }` };
		} finally {
			busy = false;
		}
	};
}
