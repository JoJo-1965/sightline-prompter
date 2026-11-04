# Prepare to record

![Native preparation window before camera capture starts](images/prepare-to-record.png)

This workflow is included in the **1.2.0 RC 1 candidate**. It uses the approved
pre-record layout with real local camera detection, microphone measurement and
a short recorded test. It supplements the existing manual Head guide.

Open **Tools > Prepare > Prepare to record**, or **Settings > Prepare to record >
Recording setup > Prepare to record**. Pause prompting and stop production
recording first. The preparation window is non-modal.

RC 1 retains test results in **Settings > Prepare to record > Recording setup**
and on the main prompter. A saved clip initially says **Review required**.
Review its picture and sound, confirm both, then select **Test checked** to pass.
Use **Test failed · retry** to retain a failed result while correcting the setup.
Changing the preparation setup marks it for recheck. An earlier saved test is
labelled as previous; it does not automatically validate today's recording.
The room/voice check shows its meter on the prompter using the same microphone
measurements, without opening a second capture stream.

## Align the shot

Select **Enable camera**. Camera capture starts only after this action. Choose
the camera or virtual-camera feed that matches your production picture. If your
recording app owns the camera exclusively, use its virtual camera or release it.
The preparation view uses a centred 16:9 crop; verify that your recorder uses
the same framing. Mirroring changes the view and arrow direction, not the file.

The manual guide remains available. With **Position feedback** off, adjust the
guide and explicitly confirm your framing. Turn feedback on for local detection:
green means eye position and apparent face size are within tolerance, amber is
close, red asks for a correction, and grey means no reliable single face.
This estimates placement; it does not trace hair, identify you or correct gaze.

**Lock current position** makes the measured position a draft target. It does
not save or replace your recording reference. Manual adjustments change this
draft. The model is bundled; there is no API key, cloud processing or download.

## Check audio and review a real clip

Select your microphone and run the check. Remain quiet briefly, then speak when
prompted. Sightline measures room level, voice level and peaks without changing
gain. Quiet, noisy or clipping results are advisory: acknowledge the warning,
make a test and listen before deciding whether to change gain. An absent or
unusable signal needs correcting.

Record a short test, up to eight seconds. **Review test recording** plays the
actual camera-and-microphone WebM. Check picture and sound before accepting it.
The guide is not burned into this camera recording. This does not start OBS or
any production recorder.

## Save and return after a break

**Save recording reference** explicitly stores the target, camera/resolution,
microphone, measured audio baseline and reviewed test location in this profile.
It also saves a compatible manual Head guide reference, retaining Ideal.

**Restore saved reference** or **Restore after a break** recalls that fixed
target. Align yourself and recheck audio. It retains the original target and
test; current movement never silently replaces them. A different camera or
resolution requires a new setup. **New setup** retains the old reference until
you explicitly replace it after a new test. Returning to the script releases
the preparation camera and microphone and leaves production recording stopped.

## Storage and limitations

Test clips are in this profile's `pre-record-tests` folder. They stay local and
are not included in reading themes or shareable settings exports. Review them
before sharing diagnostics or recordings. Existing test clips are retained;
delete unwanted clips from that folder when they are no longer needed.

Detection works best with one well-lit face near the camera. Multiple faces,
turning away, occlusion or camera loss produces an unavailable state. Use the
manual guide when automatic feedback is unsuitable. The Windows UAT validates
the software path with synthetic devices; your camera, microphone, framing and
recorder still need the acceptance check. macOS and Linux hardware checks remain
outstanding.
