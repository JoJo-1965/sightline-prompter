import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let detector;
self.onmessage = async ( { data } ) => {
	try {
		if ( data.type === "init" ) {
			const files = await FilesetResolver.forVisionTasks( new URL( "./vision-runtime", self.location.href ).href );
			detector = await FaceDetector.createFromOptions( files, { baseOptions: { modelAssetBuffer: new Uint8Array( data.model ) }, runningMode: "VIDEO", minDetectionConfidence: 0.65 } );
			self.postMessage( { type: "ready" } );
		} else if ( data.type === "frame" && detector ) {
			try {
				const result = detector.detectForVideo( data.frame, data.time );
				self.postMessage( { type: "result", detections: result.detections, width: data.frame.width, height: data.frame.height } );
			} finally {
				data.frame.close();
			}
		}
	} catch ( error ) {
		data.frame?.close?.();
		self.postMessage( { type: "error", message: String( error.message ).slice( 0, 300 ) } );
	}
};
