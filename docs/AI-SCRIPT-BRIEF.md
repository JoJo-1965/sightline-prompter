# Brief for AI script writers: Sightline Prompter scripts

**Further authoring tools prepared after RC12:** Auto format previews a starter
structure for pasted plain text. Preserve the speaker's wording. Optional
opening cues, audio checks and pace targets are deliberate author choices;
never invent recorder commands or forced pauses. Operators can switch Voice,
Page and Scroll without rewriting a script's mode declaration. Scripts still
need correct scope placement and the script checker before recording.

**Authoring tools prepared after RC12:** the next editor Insert menu uses the
existing syntax here; it adds no directives. Operators can add templates at the
cursor and edit selected values. Generated scripts still need correct scope
placement and the script checker. Voice sampling now starts when speech begins
and ends after sustained silence or ten seconds. No speech is incomplete. Do
not prescribe a fixed seven-second voice sample or suggest that inserting a
recorder code executes it in the editor.

**RC10 Voice boundaries:** `{stop}` prepares the next spoken passage without
holding Voice. Retake returns to the completed section until you speak the next
passage; no extra Go is needed. Stops and timed pauses still control Scroll.
Use an explicit spoken Pause for a deliberate Voice hold, and finish recording
explicitly after the final passage. Off-script and sound-check holds remain.

**RC8 recording workflow:** keep voice-command demonstrations in preparation
comments. Use Prompter, record / start recording / begin for a confirmed OBS
take; practice / start practice / go is rehearsal with OBS unchanged. Practice
ignores recorder directives and recorded slates without changing the script.
Do not promise that a command was recognised or a production file captured;
check the confirmed recording state and a real test file.

**Paste everything below the line into your script-writing AI** (ChatGPT,
Claude, Gemini, or your own pipeline) as instructions, then describe the script
you want. It produces scripts that Sightline Prompter can pace, stop and count
down automatically. In the app, **Help > Copy the AI Script Prompt** (or ☰ >
Help) puts it on the clipboard for you.

Spec version: **0.7 (silent pointing cues and production intent)**.
Authoring guidance reviewed 6 November 2026 for the current RC. Full spec:
[SCRIPT-DIRECTIVES.md](SCRIPT-DIRECTIVES.md). Machine-readable definition:
[script-directives.json](script-directives.json).

---

You are writing a script that a person will read aloud from **Sightline
Prompter**, a teleprompter. Write the spoken words in plain, natural prose and
use the mark-up below. Follow every rule exactly.

## 1. Text for delivery, preparation and control

Use `<!-- production notes -->` for setup, editing and command exercises.
Keep them brief and close to the relevant section. They are preparation notes,
not a second spoken script. They show paused and hide during delivery; nothing inside is
spoken or executed. Keep short `[smile]` cues inline. Add optional `{record: on}`,
`{record: off}`, `{record: pause}` or `{record: resume}` only when requested;
they require OBS mode and recording permission. On/resume before the first
spoken word runs on Play, never on load. Off/pause also hold prompting.
Continuous recording remains the default.

1. **Spoken words:** plain text. This is what the speaker says, word for word.
2. **Notes to the speaker:** in `[square brackets]`, for example `[smile]`,
   `[slower here]` or `[Say: "Thank you".]`. They're shown dimmed. Put
   any words the speaker must say inside a note in "double quotes".
3. **Directives to the app:** in `{curly braces}`. They're hidden from the
   speaker and control pacing, stops and countdowns. Use only the directives
   listed in section 3.

Never use `{` or `}` for anything else. Never put directives inside
`[square brackets]`, or notes inside `{curly braces}`.

For a planned gesture/graphic insert in Sightline 1.3.0 RC3, use
`[point left: growth-chart]` immediately before the relevant spoken phrase.
Use left/right/up/down, up-left/up-right/down-left/down-right or centre.
Directions always mean the presenter's own sides. The optional label names
the graphic for the editor; the whole cue, including a quoted label, is silent.
Keep these short cues in section body text, outside comments, code and headings.
They use the existing inline-direction styling. The edit pack retains their
section, script snapshot and take anchors; it does not verify a gesture or
insert an asset. Ask the editor to check the recorded orientation and visible
gesture before placing graphics. Plain `[point]` remains an ordinary note.

HUD-enabled RC4 uses the same bracket syntax. During delivery a short cue or
pointing target appears automatically; Review retains inline directions. Ask
the presenter to point towards the marker, finish the gesture, then return to
the lens. Do not prescribe a hand, invent HUD directives or require a gesture
button. The recorded script and production metadata keep the original labels.
Confirm the actual app version before promising this display in a demo shot.

## 2. Structure

For an optional natural lead-in in Sightline 1.3.0 RC5, keep each section title
as an ordinary H2 heading. Ask the presenter to enable **Start from section
heading** in Voice mode, wait for Listening, say a short warm-up phrase, read
the heading, settle, then deliver the body. The editor trims the spoken lead-in
using the section/body structure and recording. Do not repeat the title as body
copy, invent a lead-in directive or promise a verified automatic cut boundary.
Keep any editor instructions in a preparation comment. The preference is off
by default; Scroll/Notes retain their existing behaviour.

For a gesture-led graphic, plan it in the directions **and** the script.
Choose one stable graphic label, presenter-relative direction, exact spoken
anchor and visual purpose. Match that label in a paused-only production
comment and a short inline cue immediately before the phrase. For example:

```md
<!-- GRAPHIC growth-chart. Use the reviewed chart; verify recorded orientation. -->
[point left: growth-chart]
Here is how the figures changed.
```

Use a gesture only when it helps the visual explanation. Keep asset status
explicit; a label is not an attached file. For generated scripts, verify that
the final Sightline copy contains the cue outside HTML comments. See
[the authoring/production contract](POINTING-CUE-AUTHORING.md).

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
| `{stop}`                                   | Inline, on its own or at the end of a sentence                    | Scroll holds; RC10 Voice positions the next spoken passage and keeps listening. Retake belongs to the completed section until next delivery. For ad-libs, use listen directives |
| `{pause}`                                  | Inline, at the end of a sentence                                  | Scroll-only manual hold in RC6. Voice ignores it; use a spoken Pause for a deliberate Voice hold. RC3–RC5 packages still treat bare pause as stop |
| `{pause: ns}`                              | Inline, at the end of a sentence                                  | A countdown: the prompter waits n seconds (1 to 30), showing "Carrying on in n", then carries on by itself, for example `{pause: 3s}`. Use 2s to 5s for a breath, a beat for emphasis, or time to look at a slide. Write them whether the speaker will use steady or voice scrolling: in voice scrolling the prompter doesn't hold, it shows the pause as a mark and the speaker takes the beat |
| `{mode: notes}` (or `{mode: points}`) | Script settings | For a talk spoken from notes: shown a page at a time, never scrolled. A `# heading` starts a page (its title) and `{page}` starts one without a title; each `## heading` on the page is a bullet, with a short line under it if needed; put `{target: m:ss}` on the `# heading`. Without `# headings` or `{page}`, each `## section` is a page. Write each section as 3 to 6 short bullets (`- `) and give every section a `{target: m:ss}` |
| `{marker}` or `{marker: Setup}`            | Inline                                                            | A bookmark for retakes. Put one at the start of any passage that's hard to deliver. In a long section, name one at the start of each part (`{marker: Setup}`, `{marker: Context}`), up to 40 characters, so the edit can find each part |
| `{listen: off}` and `{listen: on}`        | Inline: off at the end of a sentence, on on its own line | Off script: following and voice commands hold; resume with Space or a controller. Any enabled scratch capture or production recorder can continue independently |
| `{prompter: slower}`                       | Inline                                                            | Runs a prompter command at that point: `slower`, `faster`, `bigger`, `smaller` or `marker` |
| `{soundcheck: room}` and `{soundcheck: voice}` | Inline, each on its own line, before the first section | Room-noise and normal-voice measurement, with automatic meter visibility and logged results. Advice is not a mandatory gain increase; balance speech against noise. Resume after reviewing each result |

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
- Establish framing, audio, a reviewed test clip and a saved recording reference
  before a production take. If audio is already checked in Prepare to record,
  do not add duplicate compulsory sound checks. Otherwise offer the two
  `{soundcheck: …}` directives before the first section and explain the choice.
- A connection test proves connectivity, not recording quality. Confirm the
  actual recording state, then record a clap or prepared recorded slate.
  A sync cue before Record is useless for synchronising that recording.
- Use `{prompter: slower}` (or `faster`, `bigger`, `smaller`, `marker`) only
  where the speaker will want it every time, such as `{prompter: slower}`
  before a dense passage.
- You don't know whether the script will be read with steady or voice scrolling,
  so explain the mode difference: `{stop}` holds Scroll but prepares the next
  passage in RC10 Voice. Countdowns only hold Scroll. Use a spoken Pause or
  listen directives for deliberate Voice holds.
- Keep literal voice-command exercises in production comments, outside spoken
  copy. Reading a complete command aloud can execute it. Do not put them inside
  quoted `[Say: …]` cues, which belong to the spoken alignment. Use short inline
  cues such as `[smile]` only for delivery. A comment can say `Prompter, go`;
  the speaker uses it deliberately while paused and command listening is enabled.
- `restart section` / `again` retakes the current section; `next section`
  advances. `restart` alone resets the whole script. With OBS controls enabled,
  explicit `finish` / `end` finishes recording; ordinary `stop` pauses prompting.
  Do not add executable recording directives unless the user requested them.
- Put camera setup, slide changes and longer instructions in production comments.
  Keep `[square brackets]` for brief delivery cues or genuine quoted spoken words.
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
- [ ] Each planned pointing moment has the same graphic label, direction and
      spoken anchor in the shot plan and final script; its cue is outside comments.
- [ ] Left/right are presenter-relative. Graphic labels stay silent, assets
      are identified honestly and the editor is told to verify the actual gesture.
- [ ] Every section in batch recording ends with `{stop}`.
- [ ] No literal control commands are embedded in spoken copy; no unrequested
      executable recording directive appears outside a production comment.
- [ ] Targets reflect spoken words and deliberate beats; Notes targets allow
      ad-lib delivery. A continuous take may use only a whole-script target.
- [ ] Framing references preserve Ideal unless deliberately replaced; clap/slate
      occurs after Record. Live word times and unmatched-word reports are estimates.

## 6. Example (markdown)

```md
{pacing: section, wpm: 145}

## Section 1 · Cold open {target: 0:45}

[smile]

There's one worry I hear from managers more than any other. It isn't
hostility. {pause: 2s} It's "what if I say the wrong thing?" {stop}

## Section 2 · Why it matters {wpm: 135}

[slower, warmer] {marker} I get it. But if you're afraid of saying the wrong
thing, it's very easy to end up saying nothing at all.

And saying nothing is still a decision. {stop}
```
