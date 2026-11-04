# Recording acceptance walkthrough

For Sightline 1.2.0 and Stream Deck companion 0.2.0. These checks confirm your
actual setup; automated software tests do not establish hardware capture or sync.
The earlier RC chronology is [archived](../ACCEPTANCE-DEVELOPMENT-HISTORY.md).

## Before changing anything

Save open work. Keep existing scripts, recordings, Ideal and device profiles.
Record the app/plugin versions, OS, camera, mic and recorder format. Test with
a copied sample before a production session. Enable only the interfaces you use.
Use the [illustrated installation help](18-installation.md) for unsigned builds.

## Reading and Settings

1. Open the welcome tour from Files > Sample scripts. Move through its stops
   with Space and try Scroll, Voice and Notes / page mode as appropriate.
2. Open Settings. Check navigation, search, visible topic tabs and the live
   reading example. Resize the window and confirm controls stay reachable.
3. Change each text type's font, colour, bold/italic and spacing. Apply; then
   make another draft and Cancel. Check that the last applied look returns.
4. Save a custom reading theme, export/import it and check its appearance.
   Credentials, scripts and controller configuration must not travel with it.
5. Confirm production comments disappear during delivery and return paused;
   inline cues stay separate from spoken words. Check focus-band treatment.

## Head guide and recording preparation

1. Show Ctrl+Shift+H. Move away from the bottom toolbar, then hover its Head
   guide tab to restore controls. Check pin/unpin, lock/unlock and fullscreen.
2. Open Adjust and choose a calibration source. The full preparation workflow
   should stay closed. Selecting a source must not start its picture.
3. Enable the picture and optional local position feedback. Check movement
   arrows and apparent-size progress against the same camera/projector crop.
   A fixed target must not drift with you. Test custom Width/side adjustments.
4. Lock current and manually adjust the target in each view. Confirm the other
   view follows. Save a recording position and restore it; Ideal stays separate.
5. Open Prepare to record explicitly. Measure room/voice levels, listen to the
   real short test and confirm its picture and sound. Review required is not
   a pass. Reject a test and confirm the failure appears in Settings too.
6. Save the reviewed reference, step away and restore it after a break. Recheck
   audio. Guide off removes the guide, controls and background-only picture.

## OBS and a recorded sync reference

1. If used, enable Connections > OBS integration, Apply and test the saved
   connection. Distinguish connected from recording. Grant recording control
   only for this test and choose a format that supports pause if you need it.
2. Try linked prompting and explicit record on/off/pause/resume commands.
   Confirm OFF/RECORDING/PAUSED or UNKNOWN accurately; a command is not proof.
3. Choose an OBS scene for calibration and verify the programme scene does not
   switch. Disabled OBS must hide its specific configuration and choices.
4. Start the production recording, then clap or use a flash-and-beep slate that
   actually reaches the file. A clap before Record is not a sync reference.
5. Read two short sections, retake one, place a marker and mark a keeper.
   Restart/next-section and finish commands should give the intended result.
   Confirm the yellow section pill and actual recorded file.

## Controllers and AI

Check every configured pad, keyboard/clicker and game-controller assignment.
Reorder a longer pad layout and verify all rows are reachable. Core shortcuts
remain usable when custom mappings are off. Test phone access only on your
chosen network. Stream Deck connection/version checks should identify the app;
test the physical keys/dials/pedal you will use, including the Finish hold guard.

For MCP, follow [Configure MCP](17-configure-mcp.md). Start read-only, grant one
needed action, verify a denied action stays denied, then disable MCP and confirm
revocation. Keep private tokens out of client prompts and shared diagnostics.

## Review and hand over

Inspect the actual master picture and sound at the start, middle and end.
Check camera lip sync by eye as well as audio alignment. Capture exclusion and
an OBS preview/test do not prove the production route. Keep masters with the
script snapshot, take log, markers, ratings and optional scratch audio.

Compare timings and missing-word flags against a fresh transcription before
using them for cuts or captions. Live following can be late or bunched. Record
known limits and device failures in one feedback batch; do not mark an untested
route as passed. Use [production handover](12-production-handover.md) for the files.
