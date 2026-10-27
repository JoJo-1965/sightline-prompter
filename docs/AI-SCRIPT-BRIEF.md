# Brief for AI script writers: Sightline Prompter scripts

**Paste everything below the line into your script-writing AI** (ChatGPT,
Claude, Gemini, or your own pipeline) as instructions. It produces scripts that
Sightline Prompter can pace and pause automatically.

Spec version: **0.1 (syntax agreed 27 October 2026; the app support isn't built yet)**. Full spec:
[SCRIPT-DIRECTIVES.md](SCRIPT-DIRECTIVES.md). Machine-readable definition:
[script-directives.json](script-directives.json).

---

You are writing a script that a person will read aloud from **Sightline
Prompter**, a teleprompter. Write the spoken words in plain, natural prose and
use the mark-up below. Follow every rule exactly.

## 1. Three kinds of text

1. **Spoken words:** plain text. This is what the speaker says, word for word.
2. **Notes to the speaker:** in `[square brackets]`, for example `[smile]`,
   `[slower here]` or `[Say: "Section one". Pause.]`. They're shown dimmed. Put
   any words the speaker must say inside a note in "double quotes".
3. **Directives to the app:** in `{curly braces}`. They're hidden from the
   speaker and control pacing and pauses. Use only the directives listed in
   section 3.

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
| `{pause}`                                  | Inline, on its own or at the end of a sentence                    | Scrolling stops until the speaker continues. Use it at natural breath or retake points, and before a slide change |
| `{pause: ns}`                              | Inline                                                            | Stops for n seconds (1 to 30), then continues, for example `{pause: 3s}`                                          |
| `{marker}`                                 | Inline                                                            | A bookmark for retakes. Put one at the start of any passage that's hard to deliver                                |

Several settings can share one pair of braces, separated by commas:
`{pacing: section, wpm: 145, target: 9:30}`.

## 4. Writing rules

- British English. Short sentences. Write for the ear, not the page.
- One idea per paragraph. Leave a blank line between paragraphs.
- Default pace is **145 wpm**. Use a slower `wpm` (125 to 135) for emotional or
  complex sections, and a faster one (150 to 160) for light, familiar material.
- For **batch or modular recording**, use `pacing: section`, keep each section
  between 30 seconds and 2 minutes, and end each section with `{pause}`.
- For **one continuous take**, use `pacing: session`, give a whole-script
  `target`, and use `{pause}` only where a real stop is needed.
- Don't put stage directions, camera notes or slide numbers in the spoken text.
  Put them in `[square brackets]`.
- Never invent other directives. If you need something not listed, write it as
  a note in `[square brackets]`.

## 5. Check before you hand it over

- [ ] Exactly one script settings line or front matter block, before the first
      section.
- [ ] Every section heading ends with `{target: m:ss}` or `{wpm: n}`.
- [ ] Section targets add up to within 10% of the whole-script `target` (session
      mode).
- [ ] Only the directives in section 3 appear inside `{ }`, each spelled exactly
      as shown.
- [ ] Every `{` has a matching `}`, and no braces appear anywhere else.
- [ ] Notes in `[ ]` contain no directives.

## 6. Example (markdown)

```md
{pacing: section, wpm: 145}

## Section 1 · Cold open {target: 0:45}

[Say: "Section one". Pause.]

There's one worry I hear from managers more than any other. It isn't
hostility. It's "what if I say the wrong thing?" {pause}

## Section 2 · Why it matters {wpm: 135}

[slower, warmer] {marker} I get it. But if you're afraid of saying the wrong
thing, it's very easy to end up saying nothing at all.

And saying nothing is still a decision. {pause}
```
