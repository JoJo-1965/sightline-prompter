# Sightline edit pack

This folder comes from Sightline Prompter (**File > Export Edit Pack…**, or
**Export edit pack…** on a session in **File > Recordings**). It describes one recording session of one script: every take of every section,
when each script word was said, the sentences, places worth cutting, and
captions in the script's own wording. It's written for an editor, or for an
AI editing and assembly agent, to cut the recording with.

Nothing here is audio or video: Sightline doesn't record. The recording
comes from whatever was used (OBS, Riverside, Zoom, a camera); this pack is
what the prompter knew while you read, with timings to line up with it.

## The clock

Every time is in **seconds on the session clock**. Time 0 is the first
**slate**: the white flash and beep at the start of the first take (Settings >
Scrolling > Slate). If no slate was used, 0 is when the first take started.

To line the pack up with a recording, find the first slate's flash or beep in
the video (a white frame and a short tone), and subtract that time:
`video time = session time + offset`, where `offset` is when the first slate
appears in the video. Every take with its own slate has a `slate` time too, so
the offset can be checked at each take or found per file if the camera was
stopped between takes.

`startedAt` and `endedAt` in `take-log.json` are wall-clock times (UTC), for
recordings that carry a time of day instead.

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

| File | What's in it |
| ---- | ------------ |
| `take-log.json` | Everything, as Sightline saved it: takes, their words, sentences, markers, ratings and slates, plus `sections` with the take to use for each |
| `takes.csv` | One row per take: section, title, take, start, end, duration, status, rating, slate, use, wall-clock times, markers, then its pace (below) |
| `sentences.csv` | One row per sentence per take: when it was said, how many of its words were said, whether it's complete, any words missing, and its text |
| `words.csv` | One row per word said: section, take, sentence, word index, the word as written, start, end |
| `edit-marks.csv` and `edit-marks.json` | Places worth knowing about, in time order (below) |
| `captions.srt` and `captions.vtt` | Captions for every take, on the session clock, in the script's own wording and spelling, at most two lines of about 42 characters |
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
- **Local API** (the app open, with **Settings > Remotes** ticked):
  `GET /recordings`, `GET /recording?id=…`, `GET /recording/pack?id=…`
  (the files as `{ files: { name: contents } }`) and
  `POST /recording/update { id, title, note, processed }`.
  `POST /recording/delete { id }` only works if the user ticked **Let it
  delete recordings too**; only use it when they ask.

A session's name, note and processed time come back as `title`, `note` and
`processed`; they never change the take log itself.
