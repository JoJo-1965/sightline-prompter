import fs from "node:fs/promises";

// Serialize snapshots and replace the finished file. Readers see the previous
// complete state or the next complete state, never a truncated JSON document.
export function atomicStateWriter( file ) {
	let queue = Promise.resolve();
	return ( state ) => {
		const text = JSON.stringify( state );
		const write = queue.catch( () => {} ).then( async () => {
			const temporary = `${ file }.pending`;
			await fs.writeFile( temporary, text );
			for ( let attempt = 0; ; attempt++ ) {
				try {
					await fs.rename( temporary, file );
					break;
				} catch ( error ) {
					// Windows briefly denies replacement while a reader/AV has it open.
					if ( ![ "EPERM", "EACCES", "EBUSY" ].includes( error.code ) || attempt >= 29 ) throw error;
					await new Promise( resolve => setTimeout( resolve, 10 ) );
				}
			}
		} );
		queue = write;
		return write;
	};
}
