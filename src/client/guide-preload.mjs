import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld( "guide", {
	page: name => ipcRenderer.invoke( "guidePage", name ),
	openExternal: url => ipcRenderer.send( "guideExternal", url ),
	onShow: callback => ipcRenderer.on( "guideShow", ( _event, name ) => callback( name ) )
} );
