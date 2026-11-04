# Feedback queued after UAT 09

## After RC 4 · distance guidance fix ready for the next combined candidate

- [x] Reproduce incorrect distance advice after changing guide Width and
  left/right edges: the comparison used only overall Size. The native regression
  fails on RC 4 source when the visible target width is kept unchanged.
- [x] Compare against the full horizontal target dimensions in preparation
  and Ctrl+Shift+H. Preserve existing manual proportions when Lock current
  converts the detected position to a guide target.
- [x] Retain live face measurements outside the Size slider's 40–200% range,
  with separate validation. Do not silently discard larger observations on
  the overlay while preparation still sees them.
- [x] Show live head-size percentage in distance guidance and use the same
  mirror setting for horizontal arrows in both views.
- [x] Verify with the actual bundled detector on a synthetic moving-size
  camera feed: smaller face → closer, increasing size → progress → green,
  larger face → further away. The target stays fixed; custom proportions,
  Lock current, OBS frames, audio/test/reference checks also pass.
- [ ] Include in the next combined RC after reviewing delivered feedback.
  RC 4's frozen ZIP/review remains unchanged; no one-item build was generated.

Evidence: `D:/Sightline/Dev/Testing/RC-Feedback-20261104/closer-before` and
`closer-after`. Physical response on Joanne's actual OBS/camera feed remains
part of UAT. The follow-up question about how the instruction behaved has
not been answered at this point; the reproduced geometry defect is confirmed,
but a frozen/wrong source feed has not been ruled out for that recording setup.

## Preparation entry points · delivered in RC 4

- [x] Make the significant camera/audio/test/reference workflow the first,
  prominent action under Prepare to record, using the same card style as the
  six Settings shortcuts. Remove the small detached button below the grid.
- [x] Clarify the menu/page labels: Prepare to record > Overview, with detailed
  guide/sound/connection settings below the actual workflow entry.
- [x] Show a direct main-toolbar entry and useful test/reference state.
- [x] Review the combined entry-point mock before implementation. Retain the
  signed-off three-column Settings composition and non-modal preparation.
- [x] Integrate live detection and Lock current with the existing Ctrl+Shift+H
  overlay. Use one shared pose/reference and the existing guide adjustments;
  the current copy-on-open/save-only bridge is insufficient.
- [x] Support OBS calibration without requiring a change to the local recording
  route. Assess selected scene/source frames first; temporary virtual camera
  is an explicit fallback that restores ownership correctly. A projector
  window is a display, not a currently supported detector input.
- [x] Hide OBS scene/source and temporary virtual-camera choices, OBS-specific
  notes and related controls unless OBS is installed and integration is enabled.
  Keep generic camera/virtual feeds available. Apply this in both guide and
  preparation views. Do not equate disconnected/not running with not installed,
  or start a different capture input automatically when OBS is disabled.
- [x] Show a visible OBS scene chooser for direct OBS calibration. List actual
  scenes from the configured connection, retain the choice, and share it with
  the head guide. Selecting it must not switch programme/recording scenes.
  Hide it when OBS is unavailable/disabled or a different input type is selected.
- [x] Verify fixed-target behaviour, crop/aspect/projector mapping, two-way guide
  updates, manual controls, reference restore and camera/feed cleanup. Keep
  Ideal and retain the distinction between saved pose and checked recording.

- [x] Align the pad Columns/preset row and show all nine buttons without a
  selected-row picker. Keep every row reachable, with reorder and Remove.
- [x] Show every game-controller and keyboard/clicker assignment with its
  action and Remove control; scroll long lists rather than hiding mappings.
- [x] Rename the connection page MCP, AI, and API and add Configure MCP beside
  the switch, opening the included offline setup guide.

See [the entry review](PREPARE-ENTRY-REVIEW.md) and its interactive mock.
Joanne requested the build after reviewing the entry/shared-guide mock. These
delivered messages were reconciled as one RC 4 batch; no unseen pending queue
is claimed as reviewed. Source and packaged Windows checks pass, including
real local inference and a scene-frame OBS protocol fixture. All four installer
targets pass CI run 41836022786. Physical camera/projector/OBS UAT remains.

## RC 1 handover · 4 November 2026

All six changes explicitly confirmed for this RC are implemented and packaged:
Connections merge, single OBS home/subtabs, separate OBS states, persistent
test outcomes, automatic audio-check meters and yellow section/page status.
Source and packaged Windows checks pass. Finish/end and restart-section
aliases, split-twelve handling, historical OBS endpoint mapping and timing
qualifications are also included. Local MCP has app-enforced grants and passes
official SDK and native integration checks. Both Mac architectures pass ad-hoc
signature and packaged-runtime verification; all installer targets passed CI
run `41812255674` at `454ee3a`.

Candidate: `D:/Sightline/Dev/Builds/Release-Candidates/sightline-1.2.0-rc.1`.
Review/download: `http://100.72.209.97:4882/rc`. Source `5656b9c`, packaging
snapshot `454ee3a`, docs 11. The stable public app remains 1.1.0. Physical UAT
and the unexplained short OBS identity need follow-up; no final release is
claimed. Earlier unchecked collection notes below are historical scope, not
a request to reimplement these completed changes.

Keep UAT 09 available for Joanne's combined review. Collect observations here
and produce one subsequent preview after reviewing the complete queue.

## Latest release steering

Joanne is happy with the current preview and wants a new live release today.
Priorities are a small local MCP integration, the existing automatic head
detection/preparation workflow, and the Mac launch fix. Joanne explicitly
allows free ad-hoc Mac signing; a paid Developer ID certificate is outside
this release's scope. Do not describe an ad-hoc build as Apple-notarised.

**Before any new build:** Joanne has additional feedback stacked in the chat
queue. Review those remaining messages alongside this list and reconcile the
complete RC scope first. The app connector exposes delivered turns, not an
independent pending-message list. Do not mark unseen queued input as reviewed.
The proposed 1.2.0 scope and deferrals are provisional until that review.

- [x] Reuse the existing Buy Joanne a coffee note. Replace its one-time
  suppression with a saved random interval of 10–15 launches. Keep the existing
  appearance, link, dismissal, 30-second delay and busy checks. A busy launch
  does not consume the reminder. Old one-time flags do not suppress recurrence.
  Implementation and cadence tests pass; not yet packaged.

The coffee change introduces no new support destination or payment flow.

## Settings feedback collected during UAT 09

Implement and review these together before producing one new preview. Keep
the signed-off navigation/control/sample composition and consistent button
subtabs. UAT 09 remains the current review package.

- [ ] Tests started from Settings must show their working and pass/fail result
  beside the action in that dialog, as well as on the main prompter. Keep the
  result visible after completion; a toast behind Settings is insufficient.
  The supplied screenshot shows Test saved connection. Its success confirms
  connectivity only; an actual test recording still needs picture/sound review.
- [ ] Replace the ambiguous OBS stopped label. Show connection and recording
  separately: Connection: Connected and Recording: Not recording, with explicit
  connecting, disconnected, recording, paused and unknown states. A failed test
  must explain the failure without implying OBS has closed.
- [ ] Rename Controls to Connections and merge the existing Components area
  into it. This supersedes the earlier suggestion of two separately renamed
  areas. Installation checks and integration configuration share one group.
  Remove ambiguous Components… links in favour of a descriptive installation
  check/setup label and a direct destination.
- [ ] Restore defaults is settings maintenance, not a component. Move its
  existing section to Getting started, preserving the reset warning and
  confirmation. Do not execute a reset while arranging the interface.
- [ ] Keep one OBS integration sidebar entry. Put Connection, Recording
  control and Profile and scenes behind visible button subtabs on that page,
  using the same interaction as other grouped settings. Remove the two extra
  OBS sidebar entries. Preserve disabled-feature gating, deep links and the
  existing connection/recording/setup behaviour.
- [ ] Automatically display the live sound meter on the main prompter during
  both voice and background/room-noise checks, including script directives and
  checks launched from Settings/preparation. Keep it visible while measuring
  and on retries. Restore its prior visibility on completion, cancellation or
  error without changing the user's meter-during-takes preference or mic gain.
  Use the check's actual microphone measurement; avoid a second capture stream
  or a different device merely to draw the prompter meter. Cover checks started
  while the manual sound-meter toggle is off.
- [ ] Add a yellow current-section pill at the upper left of the prompter,
  aligned on the same status row/baseline as the OBS pill. Use a clear 1-based
  label such as Section 3 / 12, updating on jumps, retakes and reading progress.
  Keep it useful during recording when the main toolbar hides, and check small
  windows, guide controls and mirrored output for overlap.
- [ ] Expand natural recording/section commands from the real UAT capture.
  Retain Prompter stop as pause. Add Prompter finish and Prompter end as aliases
  of finish recording, plus end recording and the observed recognition variant
  stopped recording. Preserve OBS enable/recording-control gates and avoid
  triggering commands inside ordinary script speech. Add restart section and
  restart sections as explicit current-section retake aliases; keep bare restart
  as the existing whole-script reset. Check command help and regression tests.
- [ ] Audit recorder association around record start/stop using the captured
  UAT 09 evidence. The first take starts before the main OBS recording and its
  start snapshot references the previous stopped test file. An additional
  approximately 0.1-second recorder entry has no output path after the real
  stop. Investigate a possible stale-status transition before assigning a cause.
  Historical take-end snapshots can have future/stale clock observations.
  Keep unknown timing explicit and validate editing offsets against actual
  media/scratch audio; do not silently rewrite the original logs.

Private evidence is preserved under
`D:/Sightline/Dev/Testing/Recording-Audit-20261103`. The actual capture contains
15 takes across 12 sections (12 complete and 3 retakes), 259 word timings,
7 sound-check observations, loudness for all 15 takes and two scratch WAVs.
Both reported OBS MOV files exist. The main master is 3840 × 2160 with audio,
286.533 seconds; the earlier test is 6.067 seconds. Recorded slate was off.
Local audio re-transcription confirms Prompter stop, Prompter end, Prompter
stop recording and Prompter finish. The live recogniser emitted stopped
recording for the longer stop request. This is captured evidence, not an
assertion that the current aliases or recorder timing already pass UAT.

With the next combined build, update help, navigation paths, screenshots and
feature-grid exports/JL snapshot together. Distinguish connection-test success
from a reviewed recording and retain unknown states when evidence is missing.

## Mac distribution report

- [ ] A Mac user received the damaged / cannot be opened / move to Bin alert
  for Sightline. The published v1.1.0 tag and current source set mac.identity
  to null; the build workflow sets CSC_IDENTITY_AUTO_DISCOVERY=false and has
  no notarisation step. Signing/package validation is a strong candidate, but
  this screenshot alone does not rule out an altered or corrupt download.
  Obtain the exact DMG, macOS version and processor architecture, compare its
  checksum and inspect codesign/Gatekeeper results on a Mac. The durable public
  distribution fix is Developer ID signing, notarisation/stapling and fresh
  download validation for both supported Mac architectures. Preserve the
  distinction between this alert and ordinary unidentified-developer prompts.

## Production review of the real recording

Joanne supplied the production agent's read-only review and independent word
transcript, originally at `C:/Users/joloc/AppData/Local/Temp/slot4_words.json`.
The transcript and attributed report are preserved as an additive handoff
note; original media, exported metadata and original manifest stay intact.

- Production reports reliable audio-clock alignment: main file offset 658.951 s
  and clean-camera offset 659.096 s on the session clock. The 0.145 s relative
  start offset is audio alignment, not a measured picture/sound correction.
  Start/middle/end correlations show no drift; chapters agree within 0.05 s.
  The 15-take structure and retakes in sections 3, 4 and 7 match the recording.
- [ ] RC correctness: review live word-timing, missing/skipped-word and pace
  claims. Live following delayed section starts, bunched timestamps and falsely
  flagged spoken opening words as missing. Preserve additive schema contracts,
  but mark live coverage as unverified and stop presenting it as an omission
  audit or final edit/caption timing. Derived speaking pace needs qualification
  when timestamps are delayed/grouped. Evidence includes section 1's six equal
  timestamps and reported 251 WPM. Do not silently replace original estimates.
- [ ] Recording instructions: explicitly confirm the actual recorder has
  started before clapping or showing a recorded slate. The two audible claps
  were about 18 s before OBS started and are absent from both video files.
  A composed OBS flash does not automatically enter a separate clean-camera
  recording. Keep picture-to-sound sync unverified until visually checked.
- [ ] Voice-command regression: section 7 required two tries and section 12
  several tries over roughly 26 s. Inspect and test recogniser variants for
  twelve as well as phrase aliases. Preserve end-of-phrase/wake-word guards.
- [ ] Production edit: listen to sections 10 and 4 before requesting pickups.
  Fresh ASR suggests wording changes in section 10 and Prefer talking points
  being heard as For fair talking points in section 4; these are not confirmed
  misreads. The editor should remove control phrases and check camera lip sync.
- [ ] Later feature: post-record scratch/master transcription and alignment,
  with verified missing-word checks. This is separate from live following.
  Export measured recording offsets once derived from authorised media, with
  method, clock basis, verification status and unknown picture/sound offsets.
  Do not claim the current app automatically calculates the reported offsets.
