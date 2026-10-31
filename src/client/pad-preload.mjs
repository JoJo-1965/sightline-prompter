import { contextBridge, ipcRenderer } from "electron";

const on = ( channel, callback ) => ipcRenderer.on( channel, ( _event, ...args ) => callback( ...args ) );

contextBridge.exposeInMainWorld( "pad", {
	command: ( action, value ) => ipcRenderer.invoke( "padCommand", action, value ),
	hold: ( phase, token ) => ipcRenderer.invoke( "padHold", phase, token ),
	panel: shown => ipcRenderer.send( "padPanel", shown ),
	moveTo: ( x, y ) => ipcRenderer.send( "padMoveTo", x, y ),
	dragEnd: () => ipcRenderer.send( "padDragEnd" ),
	close: () => ipcRenderer.send( "padClose" ),
	customise: () => ipcRenderer.send( "padCustomise" ),
	onMirror: callback => on( "padMirror", callback ),
	onStatus: callback => on( "padStatus", callback )
} );
