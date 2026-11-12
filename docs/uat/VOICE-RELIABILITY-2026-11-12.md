# Recorded Voice reliability review — 12 November 2026

This reviews next-candidate source changes against a completed 22-section
recording from RC11. The running package and original media remain intact.
Private scripts, transcripts and recordings are held with the production job;
they are not fixtures in this public repository.

## Retake recognition

Seven unmatched command attempts occurred during the final recorder session.
Independent local transcription identifies each as a spoken Retake request.
The recogniser emitted A RETAKE four times, plus VO TAKE, PTAKE and VOTE.
Replaying those exact timed chunks produced no Retake callbacks before the
change and seven afterwards. The extra forms require the selected wake word.
The operator should continue saying Prompter, retake.

Tests cover chunk splits, every registered wake word, ordinary-speech negatives,
command deadlines and recording-command permission boundaries. This does not
retrain speech recognition or guarantee future acoustic performance.

## Tracking recovery

Misheard names and compound terms left the follower stationary while speech
continued. The bounded ordered matcher can now recognise a longer clear phrase
after a short gap within the current section. In three private replay windows,
the first advance is about 2.9–3.2 seconds earlier. Remaining acoustic errors
and the preceding delay are not described as solved.

The wider recovery cannot cross a section boundary. Existing short nearby
continuity, distant-word guards, repeated-heading protection and explicit
Resync retain their purposes. Synthetic tests cover the recovered gap and
refusal to relocate into a following section on the same common phrase.

## Heading start and edit/resume

The saved heading-start preference was enabled, but automatic boundaries
selected body words. A shared exclusion policy now selects the requested H2
heading or body start consistently. Go and quick-edit boundary restoration
reuse that policy. Ordinary mid-paragraph edits keep their current position.

Native synthetic checks pass with the preference enabled and disabled,
including soft transitions, Go, Retake before/after next-passage speech and
paused quick editing. The existing cold-start/navigation checks remain.

## Audio and metadata limits

All 22 sections have a logged completed take. Some takes contain repeated
readings or recognition delays, so take endpoints are not blind edit points.
The final session's sole quiet warning is a discarded 0.2-second take.
Delivered-take levels are fairly consistent; the Windows input-level change
cannot be attributed without hardware-level observations.

Audio correlation verifies the soundtrack clock separately for each output
file. It does not establish camera picture-to-sound synchronisation. Original
live word timings remain navigation estimates; production uses reviewed
recorded-audio evidence for cuts and captions.

## Delivery

These source fixes join the [combined RC queue](1.3.0-RC11-FEEDBACK.md).
No RC12 package, tag, stable release, website deployment or Marketplace update
is claimed here. Physical microphone UAT remains part of that handover.
