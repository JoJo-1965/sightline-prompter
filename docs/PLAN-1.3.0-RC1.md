# 1.3.0 RC1: recording evidence and editorial accuracy

Proposed candidate scope, reviewed 4 November 2026 against the production
desk's slot-04 brief. These are outstanding requirements, not shipped features.
The original brief and recording evidence are retained in the private development
notes; production masters and their immutable handoff remain unchanged.

## Retain the working handover

Preserve take/section structure, ratings and suggested picks, chapters, scratch
audio, script snapshots, edit notes and measured loudness. The production review
found those useful. Keep old packs readable and do not overwrite their evidence.

## Priority 1: timings and delivery review

- Transcribe scratch or selected recorded audio after the session using an
  explicitly installed local engine. Keep live-follow alignment separately as
  navigation evidence. Do not silently relabel interpolated times as measured.
- Align the transcript to the script. Show expected text, heard text and audio
  range for omission, substitution and uncertain candidates. Recognition can
  still be wrong; require listening/review before declaring a misread.
- Distinguish timing origin, quality and unavailable results in words,
  sentences, captions and pace reports. Late/bunched live stamps must not
  produce an apparently authoritative speaking-speed score.
- Prioritise uncertain passages with only one usable take for editorial review.
  Do not change keeper selections automatically.

Acceptance: reproduce late section openings, six words sharing a timestamp,
false missing opening words, paraphrases, repeated words and partial starts.
Include the slot-04 sections 4 and 10 as listening cases, not established truth.
Measure final alignment error against reviewed audio; retain provenance and
uncertainty. Test export cancellation, unavailable models and legacy packs.

## Priority 2: commands as edit evidence

1.2.0 already supports next section, restart section/sections, finish/end and
recording variants, a fragmented `twel` + `ve` regression, and a visible
“Didn't catch that” cue after an acknowledged but unmatched wake phrase.
This does not establish reliable acoustic recognition of the whole recording.

- Replay difficult section 7/12 and teen-number recordings through the real
  recogniser. Test pause boundaries, wake variants and background speech.
- Export successful and failed command attempts as reviewable audio ranges,
  with heard phrase, attempted/resolved action, outcome and timing quality.
  Detect attempts after recording too where live recognition missed them.
- Use ranges with pre/post context, not only a point marker. Distinguish
  suggested command removal from the surrounding spoken content. Keep
  overlapping ranges and out-of-recording events explicit.
- Keep recording permission and wake-phrase safeguards. A bare number must
  not become a global command that can interrupt ordinary script content.

Acceptance: all identified attempts in the recording have reviewable ranges;
failed attempts are not lost; ordinary numbers and quoted command phrases do
not trigger destructive/recording actions. Test recogniser audio as well as
parser strings and retain controller fallback.

## Priority 3: measured sync and recording readiness

- Derive per-file session offsets from scratch/master audio where both exist,
  reporting method, confidence, overlap and start/middle/end drift checks.
  Keep nominal OBS observations separate from measured audio offsets.
- Support separate main and clean-camera files; do not assume a shared zero
  or silently apply one file's offset to every file.
- Offer a visible clap/sync reminder only after confirmed recorder start.
  Record detected candidates as candidates until reviewed. If no in-recording
  sync reference is established, show that state in preparation and the pack.
- Distinguish audio-to-audio alignment from picture-to-sound sync. A matching
  scratch waveform cannot prove clean-camera lip sync.

Acceptance: known offsets, different file starts, clipping/noise, ambiguous
correlation, missing audio, stop/restart and clock drift. A clap before Record
cannot satisfy readiness for the resulting file. No fabricated confidence or
pass result when the reference is absent.

## Delivery gate

Use the same real-recording fixture for app tests and production review.
Keep model downloads and transcription opt-in; document storage and processing
costs. Review the schema before adding fields. Update built-in help, samples,
feature grid, roadmap and JL copy with implementation evidence, then build RC1
for UAT. Do not advertise this plan as part of 1.2.0.
