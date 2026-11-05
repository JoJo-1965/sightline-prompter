# Sightline 1.3.0 RC1 preview

4 November 2026 · documentation revision 17 · stable app 1.2.0 · companion 0.2.0

## Recorded words and editorial evidence

- New nonmodal Recording review, from Files, the session library or Recording >
  Takes. Optional local CPU transcription or timed JSON import uses recorded
  audio after a session; no API key or cloud upload is required.
- Expected/heard comparison, substitutions and uncertain-alignment candidates
  supplement omissions. Single-take sections are prioritised for listening.
  Original takes, ratings, keeper choices, script snapshots and audio stay intact.
- Reviewed exports retain original CSV column prefixes and `live-*` estimates.
  Captions use transcript words; bunched live pace is not relabelled as measured.
  Fingerprinted sidecars prevent reusing evidence after the source log changes.

## Command reliability and cut ranges

- Recorded wake forms `popter` and `pumpter` are recognised. A delayed number
  fragment can wait four seconds from that fragment, with a six-second absolute
  wake limit; recorder commands keep their four-second deadline.
- A separately finalised repeated wake separates a completed bare section
  command from the next attempt. `Prompter twelve` works; a bare number remains
  ordinary speech. Phrase-end and recording permission safeguards remain.
- Post-record command cut ranges include successful and unsuccessful attempts;
  live metadata adds recognised/unmatched/blocked outcomes without raw speech
  unless command tracing was explicitly enabled. Review every suggested cut.

## Audio alignment and sync readiness

- Three waveform windows estimate an independent offset for each master or
  clean-camera file, with scores, drift checks, file hashes and clock allowance.
  Ambiguous/unrelated audio is not accepted as a measured match.
- The recorder-start reminder asks for an in-recording reference. It does not
  fire before a confirmed recording state or declare picture sync verified.
- Changed audio inputs and source logs require a new analysis. Jobs cancel on
  request, window close or a new recording/prompting session.

## Onboarding

- Optional first-use coach marks, rerunnable from Getting started and Help.
  Next/Back, Skip, Escape and Finish work without applying preferences or
  enabling devices. Disabled integrations are skipped. The approved Settings
  composition remains unchanged.

## Validation and remaining limits

The original slot-04 scratch audio produced a 484-word local transcript.
Main audio zero reproduced 658.951 seconds and camera audio zero 659.0965,
with consistent start/middle/end checks. Their difference is approximately
0.145 seconds. This does not establish camera picture-to-sound sync.

The exact live speech worker and command listener recovered both recorded
section-seven attempts, five section-twelve attempts and four tail commands
after the targeted fixes. This is evidence for that recording, not universal
microphone recognition. Negative phrases and command expiration are tested too.

Native review selection/import/export/cancellation, stale-source refusal,
compact layouts and tour navigation/cancellation/rerun pass. The 34-section
Settings checks pass at five sizes. The final preview manifest records package
checks separately; source tests alone do not prove a packaged runtime.

RC1 transcription is explicitly triggered and uses an optional external Python
runtime plus a cached English small.en model. Import works without it. Automatic
post-stop transcription, clap detection, human disposition controls and additional
platform acceptance remain follow-up work. No automatic finished-video edit or
frame-accurate captions are claimed. Windows remains unsigned.

[Post-record setup](guide/19-post-record-review.md) · [Guided tour](guide/20-guided-tour.md)
· [Current roadmap](../ROADMAP.md) · [Stable release](https://github.com/JoJo-1965/sightline-prompter/releases/tag/v1.2.0)
