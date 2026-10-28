# Script directives

Status: **syntax agreed** (27 October 2026): `[ ]` for the speaker, `{ }` for the app. **Built:** hiding, `{pause}`, `{pause: ns}`, `{marker}`, and section and inline `{wpm}` and `{target}` for steady scrolling. Also built: the pacing light, talking points (`{mode: points}`) and the script checker (`npm run check-script`). Parts of this are built in roadmap
items 6 (cue pause) and 8 to 10 (pacing).

A script can carry two kinds of note besides the words you speak:

| Mark                | Who it's for                                                                      | On screen                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `[square brackets]` | **You, the speaker.** Reminders such as `[Say: Section one. Pause.]` or `[smile]` | Dimmed (or hidden, or normal, in Settings). Any `"quoted words"` inside stay bright, because you say them |
| `{curly braces}`    | **The app.** Pace targets, pause points, pacing mode                              | Hidden while you read. Settings > **Show directives** shows them as small grey tags for checking a script |

Directives work the same in markdown, plain text, Word (`.docx`) and rich text
(`.rtf`) scripts. They're case-insensitive, and spaces inside the braces don't
matter.

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
| `{stop}`      | Stops here until you carry on: say "Prompter, go" (or just "go"), or press Space, the clicker or the phone remote. A yellow **Stopped** label shows. Works in steady and voice scrolling. In section mode the section timer stops too |
| `{pause}`     | The same as `{stop}`                                                                                                     |
| `{pause: 3s}` | Stops for 3 seconds, with a blue **Carrying on in 3** countdown, then carries on by itself. "Prompter, go" carries on sooner; "Prompter, pause" turns it into a stop |
| `{marker}`    | A bookmark you can jump to (`Ctrl+B` cycles through them), useful for retakes. Optionally named: `{marker: Setup}` (up to 40 characters) puts the name in the take log and the edit pack's marks. Each marker is logged with the take when it's read past |
| `{wpm: n}`    | Changes the target pace from this point until the end of the section                                                     |

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
- `[square brackets]` never control the app. Writing `[Pause.]` as a note to
  yourself won't stop the scroll; use `{pause}` for that.

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
