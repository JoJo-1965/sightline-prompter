---
name: sightline-session
description: Use when working with Sightline Prompter around a recording session: loading scripts into its nine slots before recording, controlling the prompter (play, pause, sections, speed, markers, keeper or scrap), checking its status, and afterwards fetching the take log and building the edit pack (takes, word timings, sentences, edit marks, captions) to pick takes, plan cuts or make captions for the recording.
---

# Running a Sightline session: before, during and after

**Where Sightline is:** the Sightline Prompter source folder, a clone of
https://github.com/JoJo-1965/sightline-prompter. Use the `SIGHTLINE_HOME`
environment variable if it's set; otherwise, if this skill sits in that
repo's `skills` folder, it's two folders up; otherwise ask the user. Below,
`<sightline>` means that folder.

Everything goes through one command, which reads the app's address and secret
token itself and never prints the token:

```
node "<sightline>/scripts/sightline.mjs" <verb> …
```

Run it with no verb for its help. Never read out, print or copy the token
from `remote-control.json`.

## Before: load the scripts

Controlling the app needs its local API switched on, once, by the user:
**Settings > Remotes**, tick **Let an AI assistant or script on this computer
load scripts and control the teleprompter**. If a command says Sightline
can't be reached, ask the user to open Sightline and tick that box. Don't
try to switch it on any other way.

- `status`: the open script, slot, section, speed, progress and what's in
  each of the nine slots. Start here.
- `open "<script file>" <slot>`: opens a script file where it is, into slot
  1 to 9. Edits to the file show in the prompter as they're saved.
- `load "<script file>" <slot>`: sends the text; the app saves its own copy.
  Use `open` when the user will go on editing the file.
- `slot <n>`: switch to a slot.

Check each script first with the `sightline-script` skill's checker.
For a batch session, put the scripts in slot order (module 1 in slot 1, and
so on) and finish with `status` to confirm.

## During: control the prompter

`command <action> [value]`, where action is one of: `play`, `pause`,
`toggle`, `restart`, `next-section`, `previous-section`,
`go-to-section <n>` (the n-th `##` section), `faster`, `slower`,
`reset-speed`, `set-wpm <words a minute>`, `marker`, `back-to-marker`, `keeper`, `scrap`,
`help`. `window minimize|maximize|fullscreen` toggles the window.

The user may be recording. **Only send `play`, `pause`, jumps, `keeper` or
`scrap` when the user asks**, and never as a test. `status` is always safe.

## After: the take log and the edit pack

Sightline logs every take of every section as it's recorded, one file per
script per day, saved as it goes. These read the files, so they work with the
app closed:

- `logs`: every take log, with its path.
- `pace ["<script name>"] [yyyy-mm-dd] [--json]` (also `rehearsal`): each
  section's pace summary and every take's words, spoken and speaking time,
  wpm and target. A rehearsal is logged like any recording, so use this after
  a practice run to suggest `{target}` times.
- `heard ["<script name>"] [yyyy-mm-dd]`: what voice scrolling heard, lined
  up with the script, and the words it heard in place of script words, most
  often first. Use it to suggest corrections for words it keeps mishearing.
- `takelog ["<script name>"] [yyyy-mm-dd]`: the path of one log (default: the
  open script, today).
- `pack ["<script name>"] [yyyy-mm-dd] [output folder]`: builds the **edit
  pack** from it: `take-log.json`, `takes.csv`, `sentences.csv`, `words.csv`,
  `edit-marks.csv`/`.json`, `captions.srt`/`.vtt` and a `README.md`. The user
  can also make one in the app with **File > Export Edit Pack…**.

**Read the pack's `README.md` (or `<sightline>/docs/EDIT-PACK.md`) before
using it.** It explains the session clock (0 is the first slate), how to line
the pack up with a recording, and every file and column.

Typical jobs:

- **Pick the takes:** `sections` in `take-log.json` (or `use` in `takes.csv`)
  gives the take to use for each section: the last keeper, else the last
  complete take not scrapped. Report sections with no usable take.
- **Plan the cuts:** ask the user where the first slate's flash or beep is
  in the recording (or find it, if you can analyse the video), then give in
  and out points in video time for each picked take: from just before its
  first `sentence` mark to just after its last word, starting from the second
  reading at any `reread` mark.
- **Script against what was said:** from `sentences.csv`, the sentences
  with words missing (`complete` = no) in the picked takes, and another take
  that said each one in full.
- **Captions:** `captions.srt` in the script's own wording, shifted by the
  slate offset and trimmed to the cuts.

Word timings, sentences and captions exist only for takes read in **voice
mode**; steady-scrolling takes have their times but no words. Times are the
prompter's best knowledge, not frame-accurate, so say so with any cut list.

## Don't

- Don't edit, move or delete anything in Sightline's take-logs folder: read
  it, or build a pack somewhere else.
- Don't send take logs, scripts or packs to any online service unless the
  user asks: they hold the user's script.
- Don't change Sightline's settings unless the user asks.
