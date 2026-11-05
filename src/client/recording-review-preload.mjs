import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld( "recordingReview", {
	action: ( name, args ) => ipcRenderer.invoke( "recordingReview", name, args ),
	onState: callback => ipcRenderer.on( "recordingReviewState", ( _event, state ) => callback( state ) )
} );
