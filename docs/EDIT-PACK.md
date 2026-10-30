# Sightline edit pack

This folder comes from Sightline Prompter (**File > Export Edit Pack…**, or
**Export edit pack…** on a session in **File > Recordings**). It describes one recording session of one script: every take of every section,
when each script word was said, the sentences, places worth cutting, and
captions in the script's own wording. It's written for an editor, or for an
AI editing and assembly agent, to cut the recording with.

Sightline doesn't record the video. The recording comes from whatever was
used (OBS, Riverside, Zoom, a camera); this pack is what the prompter knew
while you read, with timings to line up with it. If the user turned on
scratch audio, `scratch-audio/` holds a plain microphone recording to help
line them up (see [Scratch audio](#scratch-audio)).

For the development OBS workflow, [From recording to the editor](https://github.com/JoJo-1965/sightline-prompter/blob/codex/obs-integration/docs/guide/12-production-handover.md)
is the illustrated checklist for setup, retakes, keeper choices and collecting
the master recordings alongside each module's pack.

## The clock

Every time is in **seconds on the session clock**. Time 0 is the first
**slate**: the white flash and beep at the start of the first take (Settings > Recording > Takes > Slate). If no slate was used, 0 is when the first take started.

To line the pack up with a recording, find the first slate's flash or beep in
the video (a white frame and a short tone), and subtract that time:
`video time = session time + offset`, where `offset` is when the first slate
appears in the video. Every take with its own slate has a `slate` time too, so
the offset can be checked at each take or found per file if the camera was
stopped between takes.

`startedAt` and `endedAt` in `take-log.json` are wall-clock times (UTC), for
recordings that carry a time of day instead.

## Scratch audio

With **Settings > Recording > Audio > Record a scratch audio track for syncing** on,
Sightline records the microphone while the prompter runs, as a sync reference
only. `take-log.json` lists the files in `audio` (added in this version;
older logs have none):

```json
"audio": [{ "file": "M2 Intro 2026-10-28 143012.wav",
  "startedAt": "2026-10-28T14:30:12.018Z", "endedAt": "2026-10-28T14:34:40.218Z",
  "start": -0.3, "end": 267.9 }]
```

- Each file is a WAV: 16 kHz, 16-bit, mono, with no echo cancellation, noise
  suppression or gain control, so it sounds like what other microphones
  heard. The pack has them in `scratch-audio/`.
- `start` and `end` place the file on the session clock: **session time =
  file time + start**. `start` is negative when the file began before the
  first slate; recording starts about 0.3 s before the slate, so the slate's
  beep is in the file.
- One file per run (start to stop). It records straight through
  `{listen: off}` parts.
- To line up a master recording, cross-correlate its audio with the scratch
  file to find the offset, then add `start`. This needs no slate at all.

## Word timings

Word timings come from voice scrolling (the speech engine's own timings,
about a twentieth of a second apart). With steady scrolling nothing is
listening, so takes have no words, sentences or captions; their take start
and end times still hold.

A word's **start** is when the speech engine heard it begin. Its **end** is
estimated: the next word's start, or, before a gap, about as long as a word of
that length takes to say. Cut a little after an end, not exactly on it.

When the reader went back and read a phrase again, the later reading replaces
the earlier one, and the place is marked as a **reread**.

## The files

Guide snapshots add a `captureOverride` flag. When the session-only debug
override was on, `captureStatus` says the guide may have been recorded.
This is a capture-policy record, not proof that a particular OBS source
included or excluded the guide; inspect the recorded picture.

| File | What's in it |
| ---- | ------------ |
| `take-log.json` | Everything, as Sightline saved it: takes, their words, sentences, markers, ratings and slates, plus `sections` with the take to use for each |
| `takes.csv` | One row per take: section, title, take, start, end, duration, status, rating, slate, use, wall-clock times, markers, then its pace (below) |
| `sentences.csv` | One row per sentence per take: when it was said, how many of its words were said, whether it's complete, any words missing, and its text |
| `words.csv` | One row per word said: section, take, sentence, word index, the word as written, start, end |
| `edit-marks.csv` and `edit-marks.json` | Places worth knowing about, in time order (below) |
| `captions.srt` and `captions.vtt` | Captions for every take, on the session clock, in the script's own wording and spelling, at most two lines of about 42 characters |
| `scratch-audio/` | Scratch audio files, if it was on (see [Scratch audio](#scratch-audio)) |
| `README.md` | This brief |

## Markers

`markers` on each take (and the `markers` column of `takes.csv`) lists
every marker's time. `markerList`, added later, gives the same markers with
`label` (the name in `{marker: Setup}`, or null) and `from` (`script` for a
`{marker}` in the script, `key` for one dropped while recording). A script
marker is logged once a take, the first time it's read past.

## Restarts from a marker

When the reader goes back to a marker partway through a section (Shift+B, or
"Prompter, back to the marker") and reads on, the take carries on and the
restart is logged in the take's `restarts`: `{ t, label, markerAt }`.

- `t`: when they went back, on the session clock.
- `label`: the marker's name (`{marker: Setup}`), or null.
- `markerAt`: when that marker was first read in this take, or null if it
  wasn't logged (a marker before the take started).

To assemble the take, keep it from its start up to `markerAt`, then cut to
`t` and keep the rest: the reading from `t` replaces the one from `markerAt`
to `t`. With several restarts, apply them in order. Each also appears in
the edit marks as `restart`, with `markerAt` in `edit-marks.json`. In voice
mode the words from the second reading replace the first in `words.csv`.

## Off script

`{listen: off}` and `{listen: on}` in the script mark a part read off script:
an ad-lib, a demo or questions. The microphone was off, so there are no words
or sentences for it. Each take lists them in `offScript`: `[{ start, end }]`
on the session clock, and each is an `off-script` edit mark with its
`duration`. Keep an off-script part whole, or cut it whole: there's nothing
inside it to cut on.

## Pace

Each take read in voice mode has its pace, worked out from its word
timings, which are the rows of `words.csv` for that take, so the same figures
can be worked out from that file:

| Column in `takes.csv` | Field in `take-log.json` | What it is |
| --- | --- | --- |
| `words` | `words` | Words said in the take (its rows in `words.csv`) |
| `spoken_seconds` | `spokenSeconds` | First word's start to last word's end, pauses included |
| `speaking_seconds` | `speakingSeconds` | Spoken time less every gap of a second or more between one word's end and the next word's start |
| `speaking_wpm` | `speakingWpm` | Words ÷ speaking time × 60, rounded |
| `overall_wpm` | `overallWpm` | Words ÷ spoken time × 60, rounded |
| `target_seconds` | `targetSeconds` | The section's `{target}` in the script, if it sets one |
| `vs_target_seconds` | `vsTargetSeconds` | Spoken time minus the target: positive is over, negative under |

The lead-in before the first word and the run-out after the last aren't
counted, so spoken time is shorter than the take's `duration`. Steady
scrolling takes leave these blank.

In `take-log.json`, each entry in `sections` also has `pace` (the fields
above, for the take to use, or the last take with words when none is usable),
`paceFrom` (which take that was) and `summary`, for example
`S3: 2:31 spoken, 151 wpm speaking, 138 wpm overall, target 2:40 (9 s under)`.

A rehearsal is logged like any recording, so a practice run's section times
and pace are here too. Outside the app, `node scripts/sightline.mjs pace
"<script>" [yyyy-mm-dd]` (also `rehearsal`) prints each section's summary and
every take's pace, or `--json` for an agent.

These columns and fields were added after the first edit packs; none of the
earlier ones changed.

## Loudness

With **Settings > Recording > Audio > Loudness for each take** on (in voice scrolling
by default), each take has `loudness` in `take-log.json` (added in this
version; null when it wasn't measured), and the same in the last columns of
`takes.csv`:

| Column in `takes.csv` | Field in `loudness` | What it is |
| --- | --- | --- |
| `loudness_lufs` | `lufs` | Integrated loudness over the take (ITU-R BS.1770, gated), LUFS |
| `peak_dbfs` | `peak` | The loudest sample, dBFS |
| `noise_dbfs` | `noise` | The room's background noise: the 10th percentile of the 100 ms levels, so the gaps between words set it, dBFS |
| `above_noise_db` | `aboveNoise` | Loudness minus background noise: roughly how far the voice sits above the room |
| `level_warning` | `warning` | `clipping` (peak at -1 dBFS or above), `quiet` (below -36 LUFS), `noisy` (noise above -45 dBFS), or empty |

It's the microphone as Sightline heard it, unprocessed, which may not be the
same mic or level as the master recording. Use it to spot takes worth
checking, not as the final loudness: a `clipping` take may be distorted in
the recording too.

## Sound checks

When the script had `{soundcheck: room}` or `{soundcheck: voice}`,
`take-log.json` has `soundChecks` (added in this version; empty otherwise):
`[{ t, at, section, kind, lufs, peak, noise, verdict, advice }]`. `t` is on the
session clock, `at` the wall-clock time, `kind` `room` or `voice`, and
`verdict` one of `quiet`, `ok` or `noisy` (room) or `good`, `too-quiet`,
`loud`, `clipping` or `silent` (voice). A check can be repeated, so the last
of each kind is the one the speaker carried on from. A `noisy` room or a
`clipping` voice is worth listening for in the recording.

## Choosing takes

- **status**: `complete` (read to the end of the section), `retake` (the reader
  said "Prompter, again" or pressed ←), `stopped` (stopped part-way),
  `skipped` (jumped on before the end).
- **rating**: `keeper` or `scrap`, said ("Prompter, keeper", "Prompter, scrap
  that") or pressed (K, Shift+K) during or just after the take.
- **use** (`sections` in the JSON, `use` in `takes.csv` and `sentences.csv`):
  the take to use for each section. It's the last keeper; otherwise the last
  complete take that wasn't scrapped; otherwise none.

When no take of a section is clean, `sentences.csv` shows which takes said
each sentence completely, so a section can be built from the best sentence of
each take.

## Edit marks

| type | Meaning |
| ---- | ------- |
| `take-start`, `take-end` | The take's boundaries (`take-end` gives its status) |
| `slate` | The take's sync point (the beep) |
| `sentence` | A sentence starts here: a clean place to cut in. Its text is in `detail` |
| `pause` | A gap of a second or more between words (`duration` in seconds) |
| `reread` | A fluff: the reader went back and said a phrase again. Cut to the second reading |
| `restart` | The reader went back to a marker and read on from it (below). `markerAt` is when that marker was first read |
| `skipped` | Words of this sentence that weren't said (in `detail`) |
| `marker` | A marker: dropped during the take (B, or "Prompter, marker"), or a `{marker}` in the script, logged as it was read past (in voice mode, when the word after it was said). A named one, `{marker: Setup}`, has its name in `detail` |

## For an editing agent

1. Read `take-log.json` and use `sections` to pick a take per section.
2. Find the first slate in the recording to get the offset (above).
3. For each picked take, cut from its first `sentence` mark (a little before)
   to its last word's end (a little after). Cut out any `reread` by starting
   from the second reading, and consider trimming long `pause` marks.
4. If a picked take has `skipped` words that matter, look in `sentences.csv`
   for another take that said that sentence completely.
5. Use `captions.srt`, shifted by the offset and trimmed to the cuts.

Times are the prompter's best knowledge, not frame-accurate: check each cut
by eye and ear.

## Getting a pack yourself

An agent on the same computer can find a session and fetch its pack without
the user exporting it. Every session (one per script per day) has an **id**,
its file name, such as `M2 Intro 2026-10-28`.

- **Command line** (works with the app closed): `node scripts/sightline.mjs
  recordings` lists the sessions with their ids, `recording <id>` shows one,
  and `recording-pack <id> [folder]` writes its pack. `processed <id>` marks
  it as edited when you're done, and `name` and `note` label it.
- **Local API** (the app open, with automation enabled in **Settings > Controls > AI & API**):
  `GET /recordings`, `GET /recording?id=…`, `GET /recording/pack?id=…`
  (the files as `{ files: { name: contents } }`, with any scratch audio as
  `audio`: where each file is on this computer and its place on the clock) and
  `POST /recording/update { id, title, note, processed }`.
  `POST /recording/delete { id }` only works if the user ticked **Let it
  delete recordings too**; only use it when they ask.

A session's name, note and processed time come back as `title`, `note` and
`processed`; they never change the take log itself.

## OBS recording references (development branch)

When optional OBS integration is enabled, `take-log.json` has an additive
`obs` array. It is empty when no OBS recording has been observed for the
session. Existing fields and CSV columns are unchanged.

Each observation carries `recordingId` (a locally generated association,
not an OBS file ID), `connection`, `recording` (`recording`, `paused`,
`stopped` or null for unknown), `outputPath` (or null), `outputDuration`
(milliseconds reported by OBS), `observedAt` (UTC), and `t` (seconds from
the Sightline log start when the observation was noted).

Repeated status polls do not add entries unless the state or file reference
changes. An output path is normally supplied when OBS finishes recording.
Export after that confirmation to include it. The path belongs to the OBS
computer; the video itself is not copied into the pack. Earlier exports,
are not automatically rewritten. Within the same app session, the recording
ledger also updates saved logs for earlier scripts that referenced the same
recording. A deleted log is not recreated.

New takes add `obsStart` and `obsEnd`; markers and take-start/end events add
an `obs` reference. Each includes `recordingId`, estimated `seconds` into the
recording, the sample time and age, and a timing-quality description.
`obsRecordings` links that identifier to the confirmed filename and observed
state transitions. Stale or disconnected clocks, and unverified offsets
after automatic file splitting, have null positions. They are not exact
edit points. Reopening Sightline does not recover a missing association.

## Recorded OBS sync references (development branch)

When enabled and prepared in Settings > Controls > OBS recording, a dedicated browser source puts
the slate's flash and optional 1 kHz/250 ms tone into the current recorded
scene. It is independent of the protected head guide and the local prompter
slate. `recordedSync` in `take-log.json`, and the optional `recorded-sync.json`,
retain each reference's ID, section/take, requested/rendered/completed UTC
times, log-clock `t`, route, source, scene and canvas, audio track, recording
identifier and recent estimated OBS clock position. The standalone manifest
resolves the main output path from the recording ledger after OBS stops.
Failed requests remain `status: failed`; a successful browser response is
`browser-acknowledged`, not a claim that the file was verified. No audio or
video is embedded in this manifest.

Match the reference to its flash in the actual file. If its log time is `t`
and the flash is at file time `f`, use `file time = log time + (f - t)` for
that module, checking additional references for drift. The observed OBS
clock can differ from file presentation time; do not silently treat it as
exact. The recorded flash and browser tone need not arrive simultaneously,
and neither measures physical camera lip sync. Use the microphone soundtrack
and a visible clap for that check. Separate Source Record camera/WAV files
have their own clock and filenames, which this manifest does not discover.

## Recording-script snapshots (development branch)

Each take's `scriptSnapshotId` identifies the version present when it began.
The pack includes `script-snapshots.json` and numbered rendered HTML copies,
with section IDs and slide-cue phrases. Verified original bytes are stored
as base64 with SHA-256; UTF-8 Markdown, text and HTML originals are also
exported as readable files. Binary source documents remain recoverable from
the base64 bytes. A source changed during conversion is not marked verified.
Later edits to the original file do not replace the snapshot already read.

`head-guide.json` contains per-take snapshots of the separate guide: actual
and ideal head poses, visibility, window bounds, fullscreen state and saved
Centre/Beside placements. Capture-route status is explicitly unverified
until the actual OBS output has been checked. The guide is not added as an
OBS source. No video or camera frames are embedded in these snapshots.

The actual `pose` and `ideal` pose can include additive `width` and `height`
ratios alongside `x`, `y` and `scale`: `1` is the original proportion,
`1.25` is 25% wider or taller. Missing width/height in older logs mean `1`.
The outline scales around the eye centre `(500, 155)` in the guide's
`1000 × 562.5` viewBox; position offsets use percentages of that viewBox.
The eye marks retain their spacing while the head outline changes shape or size.
`eyesLocked` records the manual position lock, separate from click-through
`locked`. These are session preferences, not automatic measurements of a face.

RC7 adds `top`, `bottom`, `left` and `right` ratios to both poses; each defaults
to `1` in older logs. Before applying the existing width/height and scale
transforms around `(500,155)`, the ellipse edges are `155 - 89*top`,
`155 + 153*bottom`, `500 - 86*left` and `500 + 86*right`. These factors reshape
only the outline; the eye marks keep their position and spacing. `background`
is the separate dimming-layer opacity (0–0.8); `opacity` remains outline opacity.
`controlsShown` records whether the separate adjustment window was visible.
Changing its visibility does not alter the recorded guide geometry or lock.

Do not treat these observations as a continuous or frame-accurate timecode
map. Connection loss can leave gaps or unknown file associations. Use the
slate or scratch audio for precise synchronisation, and preserve uncertain
associations rather than guessing a filename or offset.
