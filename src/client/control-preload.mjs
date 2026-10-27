import { contextBridge, ipcRenderer } from "electron";

const on = ( channel, callback ) => ipcRenderer.on( channel, ( _event, ...args ) => callback( ...args ) );

contextBridge.exposeInMainWorld( "control", {
	command: action => ipcRenderer.send( "controlCommand", action ),
	jump: ( index, fraction ) => ipcRenderer.send( "controlJump", index, fraction ),
	close: () => ipcRenderer.send( "controlClose" ),
	onContent: callback => on( "controlContent", callback ),
	onPosition: callback => on( "controlPosition", callback ),
	onStatus: callback => on( "controlStatus", callback )
} );
