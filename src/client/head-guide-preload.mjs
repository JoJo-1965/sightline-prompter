import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld( "headGuide", {
	action: ( name, value ) => ipcRenderer.send( "headGuideAction", name, value ),
	ready: () => ipcRenderer.send( "headGuideAction", "ready" ),
	onState: callback => ipcRenderer.on( "headGuideState", ( _event, value ) => callback( value ) )
} );
