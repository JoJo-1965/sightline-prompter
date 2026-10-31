// Keep one confirmation open and never clear a script that changed meanwhile.
export function createSlotClearAction( { current, ask, leave, clear } ) {
	let pending = false;
	return async () => {
		if ( pending ) return;
		const target = current();
		if ( !target.slot ) return;
		const unchanged = () => {
			const now = current();
			return now.index === target.index && now.slot === target.slot;
		};
		pending = true;
		try {
			const { response } = await ask( {
				type: "question",
				buttons: [ "Cancel", "Clear slot" ],
				defaultId: 0,
				cancelId: 0,
				noLink: true,
				message: `Clear slot ${ target.index + 1 }?`,
				detail: `Remove “${ target.name }” from this slot? The saved script file stays on your computer.`
			} );
			if ( response !== 1 || !unchanged() ) return;
			if ( !( await leave() ) || !unchanged() ) return;
			await clear( target );
		} finally {
			pending = false;
		}
	};
}
