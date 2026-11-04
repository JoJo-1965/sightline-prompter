# Sightline 1.2.0 RC 3 · camera recovery

The physical Facecam returned `NotReadableError` on Joanne's setup. RC 2 left
the camera selector disabled until capture succeeded, trapping preparation
on the unavailable default input. Its error was also below the camera preview.

RC 3 lists camera/virtual inputs before capture, keeps selection available
after a failed attempt and shows a useful error beside Enable camera. Selecting
an input while capture is off keeps it off. Opening capture disables duplicate
requests; device changes refresh the list without starting capture.

The source preparation regression passes busy-camera failure, explicit input
selection and retry, then real bundled local inference, microphone measurement,
actual WebM review and fixed-reference save/restore with synthetic devices.
A separate real-device probe reproduced the physical-camera failure and opened
Elgato Virtual Camera at 1280 pixels wide after selecting it. Local detection
started; no reliable single face was present during that probe. This validates
capture recovery, not alignment accuracy on Joanne's face.

RC 3 retains the approved layout, RC 1 app changes and RC 2 demo library.
Packaging and native packaged checks follow before the download is offered.
Stable remains 1.1.0. Existing profiles, slot 4, Ideal and recordings are retained.

## Test the corrected path

1. Close the older preview normally, saving any script or Settings draft first.
2. Launch RC 3 with the retained-preview-profile launcher.
3. Open Prepare to record. Choose **Elgato Virtual Camera** from the input list,
   then select **Enable camera**. Choose the feed that matches your production
   picture; a physical camera owned by another app may remain unavailable.
4. Turn on **Position feedback**, align in view and lock the current position.
   Grey means no reliable single face; green/amber/red describe the match.
5. Review audio and a short clip, then Save recording reference. Keep Ideal
   unless deliberately replacing it. Check the actual recorded picture and sound.
