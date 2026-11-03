# Feedback queued after UAT 09

Keep UAT 09 available for Joanne's combined review. Collect observations here
and produce one subsequent preview after reviewing the complete queue.

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
