# UAT Preview 08

Full unpublished Windows preview, app 1.1.0, documentation revision 9.
This is the UAT before an RC, not an approved RC or public release.

Includes the signed-off Settings layout and all Preview 07 fixes, more space
around headings, button subtabs and actions, and the approved preparation
workflow with real local face detection, audio checks, actual test recording
and a fixed saved framing reference.

Run **Launch Sightline UAT 08.cmd** in the preview folder. It retains the current
preview profile, pairings, settings and promo script in slot 4. The installed
release uses its own profile. A validated state backup is retained before
handover. Preparation does not automatically enable a camera or microphone.

## Morning review — one feedback batch

1. Open Settings. Review the left navigation, middle controls and right sample.
   Resize, check headings/actions and confirm the compact companion remains
   non-modal. Check all four Text and directions targets, themes and background.
2. Open **Tools > Prepare > Prepare to record**. Enable your camera. Try manual
   fitting, then enable Position feedback. Move left/right, up/down and closer/
   further away. Grey must replace feedback if the face is obscured.
3. Lock current position, accept framing and check the intended microphone.
   Compare voice with room noise. An advisory result must allow an acknowledged
   continuation; gain must stay unchanged.
4. Record and play the actual test clip. Confirm its picture and sound, then
   explicitly save the reference. Return to your script.
5. Reopen preparation, restore the saved target and realign after moving away.
   Restart Sightline and restore again. The target must remain fixed; the old
   reference must survive New setup until explicitly replaced.
6. Record the promo from slot 4. Check comments hide during delivery while
   inline cues remain. Verify voice following or scrolling, sound meter and
   take telemetry. Test enabled OBS record/pause/resume/finish and its status
   pill. Check Stream Deck with the installed 0.2.0 companion.

Collect observations together before the next revision. Record camera/microphone,
display scaling, mode and the failed step. Do not include service keys.

The preparation test is separate from production capture. Physical camera,
audio quality, OBS capture protection/sync and physical controllers require
Joanne's UAT. Software checks and exact build hashes are recorded alongside
the package. No Marketplace upload, email or live JL deployment is included.
