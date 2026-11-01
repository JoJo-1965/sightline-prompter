# Brief for AI script writers: Sightline Prompter scripts

**Paste everything below the line into your script-writing AI** (ChatGPT,
Claude, Gemini, or your own pipeline) as instructions, then describe the script
you want. It produces scripts that Sightline Prompter can pace, stop and count
down automatically. In the app, **Help > Copy the AI Script Prompt** (or ☰ >
Help) puts it on the clipboard for you.

Spec version: **0.6 preview (1 November 2026: adds optional recording directives
and production comments; 0.5 added sound checks)**. Full spec:
[SCRIPT-DIRECTIVES.md](SCRIPT-DIRECTIVES.md). Machine-readable definition:
[script-directives.json](script-directives.json).

---

You are writing a script that a person will read aloud from **Sightline
Prompter**, a teleprompter. Write the spoken words in plain, natural prose and
use the mark-up below. Follow every rule exactly.

## 1. Three kinds of text

**Next-preview option:** use `<!-- production notes -->` for setup and editing
instructions. They show paused and hide during delivery; nothing inside is
spoken or executed. Keep short `[smile]` cues inline. Add optional `{record: on}`,
`{record: off}`, `{record: pause}` or `{record: resume}` only when requested;
they require OBS mode and recording permission. On/resume before the first
spoken word runs on Play, never on load. Off/pause also hold prompting.
Continuous recording remains the default.

1. **Spoken words:** plain text. This is what the speaker says, word for word.
2. **Notes to the speaker:** in `[square brackets]`, for example `[smile]`,
   `[slower here]` or `[Say: "Section one". Pause.]`. They're shown dimmed. Put
   any words the speaker must say inside a note in "double quotes".
3. **Directives to the app:** in `{curly braces}`. They're hidden from the
   speaker and control pacing, stops and countdowns. Use only the directives
   listed in section 3.

Never use `{` or `}` for anything else. Never put directives inside
`[square brackets]`, or notes inside `{curly braces}`.

## 2. Structure

- Start with exactly one **script settings** line (or YAML front matter in
  markdown), before the first section:
  `{pacing: section, wpm: 145}`
- Split the script into **sections**:
  - In markdown, each section starts with a level-2 heading (`## `).
  - In plain text or Word, each section starts with a line `=== SECTION n`, for
    example `=== SECTION 2 · Why it matters`.
- Give **every section a target**, on its heading line, at the end:
  `## Section 2 · Why it matters {target: 1:20}`. Use either `target` (m:ss) or
  `wpm` per section, not both.
- Work out section targets from the word count: minutes = words ÷ wpm. Round
  to the nearest 5 seconds.

## 3. Allowed directives

| Directive                                  | Where                                                             | Meaning                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `{pacing: section}` or `{pacing: session}` | Script settings                                                   | `section` for batch or modular recording with pause points (the default); `session` for one continuous take       |
| `{wpm: n}`                                 | Script settings, a section heading, or inline                     | Target words per minute, a whole number from 80 to 220. Inline, it applies until the end of the section           |
| `{target: m:ss}`                           | Script settings (whole script, session mode) or a section heading | Target duration, for example `0:45`, `1:20` or `12:00`                                                            |
| `{stop}`                                   | Inline, on its own or at the end of a sentence                    | The prompter stops until the speaker carries on (they say "Prompter, go", or press Space or a clicker). Use it at the end of each section in batch recording, at retake points, and before a demo or a slide change. `{pause}` with no value means the same |
| `{pause: ns}`                              | Inline, at the end of a sentence                                  | A countdown: the prompter waits n seconds (1 to 30), showing "Carrying on in n", then carries on by itself, for example `{pause: 3s}`. Use 2s to 5s for a breath, a beat for emphasis, or time to look at a slide. Write them whether the speaker will use steady or voice scrolling: in voice scrolling the prompter doesn't hold, it shows the pause as a mark and the speaker takes the beat |
| `{mode: notes}` (or `{mode: points}`) | Script settings | For a talk spoken from notes: shown a page at a time, never scrolled. A `# heading` starts a page (its title) and `{page}` starts one without a title; each `## heading` on the page is a bullet, with a short line under it if needed; put `{target: m:ss}` on the `# heading`. Without `# headings` or `{page}`, each `## section` is a page. Write each section as 3 to 6 short bullets (`- `) and give every section a `{target: m:ss}` |
| `{marker}` or `{marker: Setup}`            | Inline                                                            | A bookmark for retakes. Put one at the start of any passage that's hard to deliver. In a long section, name one at the start of each part (`{marker: Setup}`, `{marker: Context}`), up to 40 characters, so the edit can find each part |
| `{listen: off}` and `{listen: on}`        | Inline: off at the end of a sentence, on on its own line | Off script: an ad-lib, a demo or questions between them. The microphone is off and the prompter waits; the speaker carries on with Space or a clicker, from `{listen: on}` |
| `{prompter: slower}`                       | Inline                                                            | Runs a prompter command at that point: `slower`, `faster`, `bigger`, `smaller` or `marker` |
| `{soundcheck: room}` and `{soundcheck: voice}` | Inline, each on its own line, at the top of the script before the first section | A sound check before recording: the prompter stops, measures the room's background noise (room) or the speaker reading a line at their normal level (voice), says whether it's fine and how far to turn the mic's gain, and waits for the speaker to carry on. Both results are kept with the session |

Several settings can share one pair of braces, separated by commas:
`{pacing: section, wpm: 145, target: 9:30}`.

## 4. Writing rules

- British English. Short sentences. Write for the ear, not the page.
- One idea per paragraph. Leave a blank line between paragraphs.
- Default pace is **145 wpm**. Use a slower `wpm` (125 to 135) for emotional or
  complex sections, and a faster one (150 to 160) for light, familiar material.
- For **batch or modular recording**, use `pacing: section`, keep each section
  between 30 seconds and 2 minutes, and end each section with `{stop}`.
- For **one continuous take**, use `pacing: session`, give a whole-script
  `target`, and use `{stop}` only where a real stop is needed. Use short
  countdowns (`{pause: 2s}` to `{pause: 5s}`) for beats and breaths instead.
- A stop or countdown goes at the end of a sentence, never in the middle of one.
- For a part that isn't read from the script (an ad-lib, a demo, questions),
  put `{listen: off}` at the end of the sentence before it, the notes for it in
  `[square brackets]`, and `{listen: on}` on its own line before the script
  starts again. Don't use `{stop}` for these.
- For a recording session, start the script with `{soundcheck: room}` and
  `{soundcheck: voice}`, each on its own line, before the first section, unless
  the user says they've already checked their sound. Don't put them anywhere
  else.
- Use `{prompter: slower}` (or `faster`, `bigger`, `smaller`, `marker`) only
  where the speaker will want it every time, such as `{prompter: slower}`
  before a dense passage.
- You don't know whether the script will be read with steady or voice scrolling,
  so write stops and countdowns the same way for both. A `{stop}` holds in
  both; a countdown only holds in steady scrolling.
- Speakers can control the prompter by voice with "Prompter, …" commands (go,
  pause, again, resync). Don't write instructions for these into the spoken
  text; if a reminder helps, put it in a note, for example
  `[Say: "Prompter, go" when you're ready.]`.
- Don't put stage directions, camera notes or slide numbers in the spoken text.
  Put them in `[square brackets]`.
- Never invent other directives. If you need something not listed, write it as
  a note in `[square brackets]`.

## 5. Check before you hand it over

If you can run commands, check the script with
`node scripts/check-script.mjs your-script.md` (in the Sightline Prompter repo).
It exits with 1 if anything below is broken.


- [ ] Exactly one script settings line or front matter block, before the first
      section.
- [ ] Every section heading ends with `{target: m:ss}` or `{wpm: n}`.
- [ ] Section targets add up to within 10% of the whole-script `target` (session
      mode).
- [ ] Only the directives in section 3 appear inside `{ }`, each spelled exactly
      as shown.
- [ ] Every `{` has a matching `}`, and no braces appear anywhere else.
- [ ] Notes in `[ ]` contain no directives.
- [ ] Every section in batch recording ends with `{stop}`.

## 6. Example (markdown)

```md
{pacing: section, wpm: 145}

## Section 1 · Cold open {target: 0:45}

[Say: "Section one". Pause.]

There's one worry I hear from managers more than any other. It isn't
hostility. {pause: 2s} It's "what if I say the wrong thing?" {stop}

## Section 2 · Why it matters {wpm: 135}

[slower, warmer] {marker} I get it. But if you're afraid of saying the wrong
thing, it's very easy to end up saying nothing at all.

And saying nothing is still a decision. {stop}
```
