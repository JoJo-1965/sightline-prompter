# Sightline 1.2.0 RC 4

Combined scope approved by Joanne's request to build after the entry/shared-guide
mock, plus the subsequently delivered pad alignment, complete assignment lists,
MCP page name and Configure MCP instructions. No personal profile is reset.

- Prepare to record becomes the first workflow card, with a direct toolbar
  action and an Overview menu label. Test/reference outcomes sit by the entry.
- Ctrl+Shift+H receives live local feedback; guide adjustments, Lock current
  and the recording position are shared with preparation. Ideal is preserved.
- Choose an actual OBS calibration scene without changing programme/recording
  state. OBS choices hide when disabled/unavailable. A temporary virtual feed
  retains an existing session and stops only one Sightline started.
- Camera/input selection and explicit picture enable are available in guide
  adjustments. Returning to the script can retain feedback on a visible guide;
  hiding both views or disabling feedback releases the background feed.
- All pad buttons and keyboard/controller assignments render in scrollable
  lists. The columns/preset row aligns; no selected-only row suppression remains.
- MCP, AI, and API has an offline Configure MCP guide next to its switch.

Source checks pass for the unit suite, full native Settings at five sizes,
nine visible pad rows and controller assignments. Native preparation verifies
two-way guide updates, actual bundled inference, measured audio, real WebM
review and fixed-reference handling. The local OBS protocol fixture verifies
scene selection and preview-frame calibration without recording/scene changes.
Packaged checks and cross-platform installer CI follow before handover.

## UAT

Close the older preview normally and save any Settings/script draft. Launch
RC 4 using the retained-profile shortcut. Review Prepare to record and choose
your camera feed, or OBS scene preview with the appropriate scene. Match the
head-guide window to the same projector picture and centred 16:9 crop. Check
Lock current and manual adjustments in both views, then Save/Restore position.
Do not replace Ideal unless intentional. Recheck after scene/crop changes.

Use actual camera/mic/OBS output for final physical UAT. The local test of an
OBS picture is a sampled preview plus the selected microphone; it does not
prove the production recording's picture/sound or lip sync. Check the real
output file. If OBS disconnects during a temporary virtual feed, confirm that
output's state in OBS. Ad-hoc Mac signing remains unnotarised. Stable is 1.1.0.
