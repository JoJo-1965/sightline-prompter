# Script directives

## Editor insertion tools — prepared after RC12

The next combined preview adds **Ctrl+E > Insert…** for 41 templates covering
all directive families, silent directions, presenter-relative pointing,
production notes and headings. Templates insert at the cursor and replace
selected text; editable values remain selected. Read placement hints and
save normally. Insertion never executes a directive. Syntax is unchanged.

**RC10 Voice boundaries:** `{stop}` prepares the next spoken passage without
holding Voice. Retake returns to the completed section until you speak the next
passage; no extra Go is needed. Stops and timed pauses still control Scroll.
Use an explicit spoken Pause for a deliberate Voice hold, and finish recording
explicitly after the final passage. Off-script and sound-check holds remain.

## Production notes and recording controls

RC8 voice practice/go leaves OBS unchanged and ignores recorder directives,
recorded slates and chapters during that run. Use an explicit recording
command or Record take to return to recording operation; script syntax is
unchanged. Commands demonstrated aloud should stay deliberate.

HTML comments `<!-- ... -->` show production notes while paused and hide them
during delivery. Their entire contents, including quotes and braces, stay
outside speech tracking, timing and directive execution. Keep short `[smile]`
cues inline. No compulsory directives are added.

Optional `{record: on}`, `{record: off}`, `{record: pause}` and `{record: resume}`
require enabled OBS recording controls. On/resume before the first spoken word
runs on Play; inline commands run as reading reaches them. Off/pause also hold
prompting. Loading never triggers recording. Normal stops keep continuous OBS
recording running unless the user selects linked recording in Settings.

Status: **syntax agreed** (27 October 2026): `[ ]` for the speaker, `{ }` for the app. **Built:** hiding, `{pause}`, `{pause: ns}`, `{marker}`, and section and inline `{wpm}` and `{target}` for steady scrolling. Also built: the pacing light, talking points (`{mode: points}`) and the script checker (`npm run check-script`). Parts of this are built in roadmap
items 6 (cue pause) and 8 to 10 (pacing).

A script distinguishes these kinds of text:

| Mark                | Who it's for                                                                      | On screen                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `[square brackets]` | **You, the speaker.** Reminders such as `[Say: "Section one."]` or `[smile]` | Dimmed, hidden or normal in Settings. Quoted words are spoken, except asset labels in structured pointing cues |
| `{curly braces}`    | **The app.** Pace targets, pause points, pacing mode                              | Hidden while you read. Settings > **Show directives** shows them as small grey tags for checking a script |
| `<!-- production comments -->` | **Preparation, command exercises and editing.** Keep spoken lines outside | Visible while paused; hidden during delivery. Quotes and directives inside are never spoken or executed |

Directives work the same in markdown, plain text, Word (`.docx`) and rich text
(`.rtf`) scripts. They're case-insensitive, and spaces inside the braces don't
matter.

For authored scripts, keep long setup steps and literal voice-command examples
inside production comments. Reserve inline brackets for short delivery cues or
genuine quoted spoken words. Do not include a wake-word command in spoken copy
unless executing that command is deliberate. The yellow section pill removes
the need for spoken section slates. Check audio once, keep a recording reference
separate from Ideal, and put a clap/slate in the file after Record starts.
See the [demo-script guide](DEMO-SCRIPTS.md) for the shipped examples and limits.

## Pointing and graphic cues (1.3.0 RC3)

Use `[point left: growth-chart]` immediately before the line where you want
to point. The optional label identifies the intended graphic or artifact for
the production agent. The entire cue stays silent, including quoted labels:
`[point right: "Product screenshot"]` does not add words to speech or captions.

Directions are `left`, `right`, `up`, `down`, `up-left`, `up-right`,
`down-left`, `down-right` and `centre`. Left/right mean **your own sides while
presenting**. In an unmirrored shot your left appears on the viewer's right;
the editor must check the actual recording. Preview mirroring does not prove
the recorded orientation.

Put cues in a section's body, outside headings, code and production comments.
They inherit **Reading > Text and directions > Inline directions** appearance
and Normal/Dimmed/Hidden visibility. Use Normal or Dimmed when following them.
Generic `[point]` and existing notes still work; only recognised directional
cues carry structured production metadata. Curly-brace app commands are unchanged.

The captured script stores direction, label, section and nearby spoken-word
anchors. The edit pack adds `production-cues.json`, `production-cues.csv` and
`PRODUCTION-CUES.md`, with occurrences for each take and its selection status.
Transcript anchors are preferred when reviewed evidence exists; live timings
are approximate. Missing anchors have a null time. These are intended gestures,
not detected movements: confirm the picture before inserting an asset or cutting.
Sightline does not find or insert the graphic automatically.

Try **Files > Sample scripts > Pointing and graphic cues**. See
[edit-pack details](EDIT-PACK.md#pointing-and-graphic-intent-13-rc3).
Script writers and production agents should use the same
[cue plan and handoff contract](POINTING-CUE-AUTHORING.md), including verification
of generated scripts and matching labels in production directions.

## Script settings

These go at the very top of the script, before the first section. Either form
works.

Markdown front matter:

```md
---
title: M2 Managing behaviour, not policing identity
pacing: section # section (batch / modular) or session (one continuous take)
wpm: 145 # default target pace for every section
target: 9:30 # whole-script target time (used in session mode)
---
```

Or, in any format including Word, a single directive line:

```text
{pacing: section, wpm: 145, target: 9:30}
```

Settings in the script override the slot's settings while that script is open.

## Section targets

Put a directive straight after a section heading, on the heading line or on the
next line:

```md
## Section 2 · Why it matters {target: 1:20}

=== SECTION 3 {wpm: 150}
```

- `{target: m:ss}` sets the target time for this section. The target pace is
  then worked out from the section's word count.
- `{wpm: n}` sets the target pace for this section.
- If a section gives both, `target` wins and the pacing light uses time.
- A section with neither uses the script's `wpm`, or else the slot's speed.
- **Rehearsal timer:** after a practice run, the take summary's **Use these
  times as targets** button writes each section's time into the script as
  `{target: m:ss}`, to the nearest 5 seconds. It replaces a `target` already on
  the heading line or the line after it, and otherwise adds one to the heading.

## Inside the text

| Directive     | What it does                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `{stop}`      | Scroll: holds until you continue. Voice: positions the next spoken opening and keeps listening. Retake remains on the completed section until the next passage is spoken |
| `{pause}`     | In Scroll mode, waits until you continue. Voice mode ignores this directive, including when recording is linked. Use an explicit spoken Pause for a Voice hold |
| `{pause: 3s}` | Stops for 3 seconds, with a blue **Carrying on in 3** countdown, then carries on by itself. "Prompter, go" carries on sooner; "Prompter, pause" turns it into a stop. In voice scrolling it doesn't hold: the text only moves when you speak, so it shows as a small blue **⏸ 3s** mark and you take the beat yourself |
| `{marker}`    | A bookmark you can jump to (`Ctrl+B` cycles through them), useful for retakes. Optionally named: `{marker: Setup}` (up to 40 characters) puts the name in the take log and the edit pack's marks. Each marker is logged with the take when it's read past |
| `{listen: off}` | Off script: before an ad-lib, a demo or questions. The microphone is muted (nothing is listened to) and the prompter holds, in steady and voice scrolling, with **Off script · mic off · Space to carry on**. Space, the clicker, the remote or the Stream Deck carries on from the next `{listen: on}`, where voice following picks up again. The take log and edit pack record the time off script |
| `{listen: on}` | Where reading from the script starts again after `{listen: off}` |
| `{soundcheck: room}` | A sound check before you start: the prompter stops and measures the room's background noise for 5 seconds while you stay quiet, then shows **Quiet room ✓**, **OK** or **Noisy ✗**. Works in steady and voice scrolling. **"Prompter, again"** (or **Check again**) measures again; Space or "Prompter, go" carries on. The result goes in the take log and edit pack |
| `{soundcheck: voice}` | The same for your voice: read the line on the card at your normal level for 7 seconds, and it says **Good level ✓**, **Too quiet**, **Loud** or **Clipping ✗**, with how far to turn the mic's gain up or down. Sightline can't change the gain itself: the recording isn't its own |
| `{prompter: slower}` | Runs a prompter command as the reading reaches it: `slower` or `faster` (the steady speed), `bigger` or `smaller` (the text), or `marker`. In voice scrolling it runs when the word before it is said |
| `{wpm: n}`    | Changes the target pace from this point until the end of the section                                                     |

The scroll-only behaviour of bare `{pause}` is included in RC6. Existing
RC3–RC5 packages still treat it as `{stop}`. Timed pauses
in Voice must also remain beat marks when recording is linked; they must not
pause either voice following or the linked recorder. Explicit `{record: pause}`
and spoken pause commands remain independent recording/prompting actions.

## Notes (talking points)

For speaking from notes, put `{mode: notes}` (or `{mode: points}`) in the
script settings. The script is shown a page at a time, with no scrolling, and
you move on with the arrow keys, clicker, remote or "Prompter, next page".

- A `# heading` starts a page; it's the page's title, and a `{target: m:ss}`
  on it times the page.
- `{page}` starts a page with no title.
- Each `## heading` on a page is a bullet; lines under it show smaller.
- With no `# heading` or `{page}` after the title, each `## section` is its own
  page (as below), with its own `{target}`.

```md
{mode: points, pacing: section}

## Why inclusion stalls {target: 2:00}

- Good intentions, no habits
- The quiet voices in meetings
- Story: the project kick-off

## Three moves {target: 3:00}

- Notice
- Make the gap
- Hold it open
```

## Pacing modes

- **`pacing: section`** (the default) is for batch and modular recording with
  pause points. The timer restarts at each section and stops at pauses. The
  indicator shows the section's target against your actual pace, and a short
  per-section log appears after each take.
- **`pacing: session`** is for one continuous recording. The indicator shows
  elapsed time against the whole-script `target`, and overall pace.

## Rules

- `{` and `}` are reserved for directives. To show a literal brace in a script,
  write `\{` or `\}`.
- An unknown directive is hidden as usual. The editor and Show directives mark it
  with a ⚠, so typos are easy to spot.
- `[square brackets]` never control the app. `[pause]` is a natural delivery
  cue. Use `{stop}` for an intentional hold in either reading mode; `{pause}`
  is Scroll-only in RC6.

## Example

```md
---
pacing: section
wpm: 145
---

## Section 1 · Cold open {target: 0:45}

[Say: "Section one". Pause.]

There's one worry I hear from managers more than any other. {pause}

It isn't hostility.

## Section 2 · Why it matters {wpm: 150}

[Slower here] It all comes back to two things. {marker}
```
