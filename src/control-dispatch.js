// Pad/phone holds are checked in the app too. A timestamp supplied by a client
// is never accepted as proof; tickets are local, short-lived and single-use.
import { randomUUID } from "node:crypto";
import { controlAction, controlView } from "./client/control-actions.js";

const unavailable = message => Object.assign( new Error( message ), { status: 409 } );
const identity = state => JSON.stringify( [ state.obs?.recordingId ?? null, state.obs?.outputPath ?? null ] );
export function createControlDispatcher( { getStatus, onCommand, clock = () => performance.now(), token = randomUUID } ) {
	const tickets = new Map();
	function observe() {
		const state = getStatus();
		const view = controlView( "obs-finish", state );
		for ( const [ key, ticket ] of tickets ) if ( view.disabled || view.hidden || ticket.identity !== identity( state ) || clock() - ticket.at > 6000 || state.padLayout?.holdToFinish === false ) tickets.delete( key );
		return state;
	}
	return {
		observe,
		hold( phase, key ) {
			const state = observe();
			if ( phase === "cancel" ) {
				tickets.delete( key );
				return { ok: true };
			}
			if ( phase !== "begin" ) throw unavailable( "Unknown finish-hold request" );
			const view = controlView( "obs-finish", state );
			if ( view.hidden || view.disabled ) throw unavailable( view.reason || "Finish recording is unavailable" );
			if ( tickets.size >= 32 ) tickets.delete( tickets.keys().next().value );
			const next = token();
			tickets.set( next, { at: clock(), identity: identity( state ) } );
			return { token: next, waitMs: 1000 };
		},
		async command( id, value ) {
			const state = observe();
			const request = controlAction( id, value );
			const view = controlView( id, state );
			if ( !request || !view ) throw unavailable( "Unknown control" );
			if ( view.disabled || view.hidden ) throw unavailable( view.reason || "This control is unavailable" );
			if ( id === "obs-finish" && state.padLayout?.holdToFinish !== false ) {
				const ticket = tickets.get( value?.holdToken );
				tickets.delete( value?.holdToken );
				if ( !ticket || clock() - ticket.at < 1000 ) throw unavailable( "Hold Finish recording for one second" );
			}
			await onCommand( id, value );
			return { ok: true };
		}
	};
}
