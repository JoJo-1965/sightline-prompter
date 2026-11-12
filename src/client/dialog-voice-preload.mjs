import { contextBridge, ipcRenderer } from "electron";

export function exposeDialogVoice() {
	contextBridge.exposeInMainWorld( "dialogVoice", {
		report: actions => ipcRenderer.send( "dialogVoiceInventory", actions ),
		onAction: callback => ipcRenderer.on( "dialogVoiceAction", ( _event, id ) => callback( id ) )
	} );
}
