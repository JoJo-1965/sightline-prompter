import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld( "preRecord", {
	input: ( action, value ) => ipcRenderer.invoke( "preRecord", action, value ),
	onShared: callback => ipcRenderer.on( "preRecordShared", ( _event, value ) => callback( value ) ),
	onGuideAction: callback => ipcRenderer.on( "preRecordGuideAction", ( _event, value ) => callback( value ) ),
	load: () => ipcRenderer.invoke( "preRecord", "load" ),
	model: () => ipcRenderer.invoke( "preRecord", "model" ),
	save: reference => ipcRenderer.invoke( "preRecord", "save", reference ),
	saveTest: bytes => ipcRenderer.invoke( "preRecord", "test", bytes ),
	readTest: () => ipcRenderer.invoke( "preRecord", "read-test" ),
	activity: busy => ipcRenderer.send( "preRecordActivity", busy === true ),
	report: result => ipcRenderer.send( "preRecordReport", result ),
	close: () => ipcRenderer.send( "closePreRecord" )
} );
