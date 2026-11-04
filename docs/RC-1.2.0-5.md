# Sightline 1.2.0 RC 5

One combined build of the head-guide feedback delivered after RC 4. The
approved Settings composition, existing profile, slots and Ideal are retained.

- Distance advice includes overall Size, Width and both side adjustments.
  Lock current preserves custom proportions. A live percentage shows progress
  towards the target; both views use the same mirrored arrow directions.
- Calibration controls in Guide adjustments initialise their shared service
  invisibly. Selecting an input leaves capture off. Enable picture is explicit;
  only Prepare to record opens the full workflow. Cold-start choices stay ordered.
- The bottom toolbar collapses to a Head guide reveal tab. Hover restores it;
  Pin controls keeps it visible. Its small window layer sits above the prompter
  while the outline retains its picture bounds. Lock/unlock, fullscreen, Move
  guide, Adjust and Guide off remain accessible. Guide off removes the controls
  and releases a hidden picture feed, including with detection disabled.

Source verification covers the actual bundled detector on growing/shrinking
test frames, fixed targets and custom proportions, guide-only cold starts,
toolbar recovery/lock/fullscreen, three compact widths, OBS scene frames,
measured audio, real WebM review and saved references. Unit and full native
production/OBS regressions pass. The included BUILD-MANIFEST.json records
packaged validation, provenance and hashes. The feature grid remains 249 rows
in 18 groups, updated together with help, samples and screenshots (docs 15).

## UAT

Save any draft and close the older preview normally. Extract the entire ZIP
and use the existing-preview launcher on Joanne's PC. Use the isolated-profile
launcher on another PC. No private profile or recording media is included.

1. Show Ctrl+Shift+H. Hover the bottom Head guide tab, open Adjust, then choose
   the calibration picture. The full preparation window should stay closed.
2. Enable picture and local position feedback. Move closer/further and watch
   the percentage change towards 100%; green also requires matching eye position.
   Check Lock current after custom Width/side adjustments. Keep Ideal separate.
3. Move the pointer away, then hover the tab again. Check pin/unpin, lock/unlock
   and fullscreen/restore. Guide off should remove the toolbar and guide.
4. Explicitly open Prepare to record. Confirm audio, review a short recording,
   save the reference and restore it after a break using the actual production
   camera/projector crop. Check the real production file for picture and sound.

Detection uses apparent width, not distance in metres. Match the same camera
crop and manually placed guide bounds. An OBS-scene test samples preview frames
with the selected mic, not the production encoder output. Check actual lip sync.
A lost OBS connection during temporary virtual capture may require checking
that output manually. Live word timings remain navigation estimates. Mac builds
are ad-hoc signed and unnotarised. Stable remains 1.1.0, companion 0.2.0.
