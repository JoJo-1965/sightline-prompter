// Explicit controller operations. Passing a check remains a human decision.
export const PREPARATION_COMMANDS = {
	"prepare-recording": "open",
	"check-room-voice": "measure-audio",
	"test-recording-start": "record-test",
	"test-recording-stop": "stop-test",
	"test-recording-play": "play-test",
	"guide-lock-current": "lock-current",
	"recording-reference-restore": "restore-reference",
	"recording-reference-save": "save-reference",
	"back-after-break": "ready-break"
};

export function preparationBlockReason( action, status = {} ) {
	if ( !Object.hasOwn( PREPARATION_COMMANDS, action ) ) return null;
	const prep = status.preparation ?? {};
	if ( status.editing || status.scrolling || [ "recording", "paused" ].includes( status.obs?.recording ) ) return "Pause prompting and stop the recording before preparing";
	if ( action === "prepare-recording" ) return null;
	if ( action === "back-after-break" || action === "recording-reference-restore" ) return prep.hasReference ? null : "Save a recording reference first";
	if ( !prep.open ) return "Open Prepare to record first";
	if ( action === "test-recording-stop" ) return prep.testRecording ? null : "No test recording is running";
	if ( prep.testRecording || prep.measuring || prep.testSaving ) return "Finish the current preparation check first";
	if ( action === "guide-lock-current" ) return prep.canLock ? null : "Enable position feedback and detect your head first";
	if ( action === "test-recording-start" ) return prep.canTest ? null : "Confirm framing and audio, with picture and microphone enabled";
	if ( action === "test-recording-play" ) return prep.canPlay ? null : "Make a test recording first";
	if ( action === "recording-reference-save" ) return prep.canSave ? null : "Review and accept framing, audio and the test picture and sound first";
	return null;
}
