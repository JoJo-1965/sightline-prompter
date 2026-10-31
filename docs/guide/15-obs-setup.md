# Set up OBS for a recording session

Development preview for the next candidate; not present in RC14. This optional
assistant creates a separate OBS profile and scene collection. Existing setups
remain available. Ordinary prompting works without OBS or this assistant.

## Before you begin

Install OBS from **Settings > Components > OBS**. Open OBS and enable its
WebSocket server. In **Settings > Recording > OBS connection**, enable the
connection, enter the local address/password, **Apply**, then test the saved
connection. The assistant supports OBS on this computer; remote OBS can still
be controlled using the ordinary connection settings.

In your current OBS scene collection, add and test a camera source and an
audio-input source for your microphone. The assistant copies those configured
device settings. It does not discover device modes or open temporary devices
to guess which camera or mic you want. A window capture or slide/image source
can also be reused. Desktop/display capture is deliberately excluded.
Only supported source types appear. If your existing camera or microphone is
absent, configure its route manually in OBS rather than adding duplicate
devices just to satisfy the assistant. Native validation has been on Windows;
macOS hardware validation remains deferred.

Stop recording, streaming and the replay buffer. Pause prompting, then open
**Settings > Recording > OBS setup > Set up OBS…**, or use the OBS row in
**Help > Getting started…**. If OBS is unavailable, use **Connection…**
or the configuration guide; inspection changes nothing.

## Choices, then a review

Choose your configured camera, microphone and optional presentation. Choose
a recording folder using **Choose folder…** and select a 1080p or 4K canvas.
The proposed frame rate is 30 fps. Give the new setup a name. If that name is
already used, the plan chooses a numbered alternative.

![OBS setup choices using illustrative configured sources](images/obs-setup-choices.png)

**Review plan** shows the profile/collection name, sources, full output folder,
canvas, scenes and remaining checks. It makes no OBS changes. Only
**Create separate setup** applies the reviewed plan. Plans expire after ten
minutes; changed source settings, profile selection or video settings require
a fresh review. Duplicate taps do not run the plan twice.

![Review the separate profile and scene plan before applying it](images/obs-setup-review.png)

Creation adds these scenes and leaves the camera scene selected:

- **Sightline - Camera:** camera fills the canvas.
- **Sightline - Camera and presentation:** camera at the left, presentation at
  the right. Without a presentation source, that area stays blank.
- **Sightline - Presentation and camera:** presentation fills the canvas with
  the camera beside its lower-right edge.

The new profile requests MKV, software x264 video, 48 kHz stereo 24-bit PCM
audio and tracks 1/2. The selected mic feeds both tracks. Camera/presentation
audio is excluded; default desktop and microphone inputs in the new collection
are removed to avoid duplicate audio. OBS filters and sync offsets are not
copied; hardware/driver processing remains whatever your device uses.

**Use previous setup** restores the prior profile and collection, retaining
the new setup for later. On a partial failure Sightline attempts that same
restoration while OBS remains idle. Read the reported result and inspect any
partial setup in OBS. It never stops an output to force a rollback and never
starts recording as part of setup.

## Verify the recording, not just the settings

A 3840 × 2160 canvas does not prove that your camera is capturing native 4K.
Check the camera source's actual resolution, frame rate and format in OBS.
Check encoder availability, recording quality and missed/lagged frames with a
short recording on your own hardware. Software 4K encoding can be demanding.

Track 2 is a microphone track inside the MKV, not a separate WAV file. A camera
scene alone also does not create a simultaneous clean-camera master when you
switch to a composed scene. For Academy delivery, retain the additional
clean-camera recording route and extract/check the independent mic WAV as
described in [Production handover](12-production-handover.md). Existing clean
output routes are not copied into this new collection; configure and test
them explicitly. Keep Sightline scratch audio as a separate timing reference.

The assistant adds no prompter or head-guide capture source. Confirm this in
your actual recorded picture; other capture routes you later add can change
what is recorded. Prepare the recorded slate separately in **Recording > OBS
recording** and verify its picture and tone in a test file. Make early and late
physical claps and speak normally to check camera/mic sync. A digital slate
alone cannot establish camera lip sync.

## Before each session

Open **Tools > Session check…** for links to script review, sound check,
framing, OBS settings and slate preparation. Refresh after changing your setup.
It reports known settings and connection state; it cannot certify camera
quality, clean output or lip sync. See [Recording with OBS](11-obs.md) for
record/finish commands and continuous recording through prompter stops.
