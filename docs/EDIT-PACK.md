# Sightline edit pack

This folder comes from Sightline Prompter (**File > Export Edit Pack…**). It
describes one recording session of one script: every take of every section,
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
| `takes.csv` | One row per take: section, title, take, start, end, duration, status, rating, slate, use, wall-clock times, markers |
| `sentences.csv` | One row per sentence per take: when it was said, how many of its words were said, whether it's complete, any words missing, and its text |
| `words.csv` | One row per word said: section, take, sentence, word index, the word as written, start, end |
| `edit-marks.csv` and `edit-marks.json` | Places worth knowing about, in time order (below) |
| `captions.srt` and `captions.vtt` | Captions for every take, on the session clock, in the script's own wording and spelling, at most two lines of about 42 characters |
| `README.md` | This brief |

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
| `skipped` | Words of this sentence that weren't said (in `detail`) |
| `marker` | A marker dropped during the take (B, or `{marker}` in the script) |

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
