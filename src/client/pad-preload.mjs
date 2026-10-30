import { contextBridge, ipcRenderer } from "electron";

const on = ( channel, callback ) => ipcRenderer.on( channel, ( _event, ...args ) => callback( ...args ) );

contextBridge.exposeInMainWorld( "pad", {
	command: action => ipcRenderer.send( "padCommand", action ),
	moveTo: ( x, y ) => ipcRenderer.send( "padMoveTo", x, y ),
	dragEnd: () => ipcRenderer.send( "padDragEnd" ),
	close: () => ipcRenderer.send( "padClose" ),
	customise: () => ipcRenderer.send( "padCustomise" ),
	onMirror: callback => on( "padMirror", callback ),
	onStatus: callback => on( "padStatus", callback )
} );
