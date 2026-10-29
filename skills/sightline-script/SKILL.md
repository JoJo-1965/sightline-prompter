---
name: sightline-script
description: Use when writing, rewriting or checking a script to be read from Sightline Prompter, the teleprompter, in any folder: course modules, talks to camera, batch recordings, talking points. Applies the Sightline script spec (spoken words, [notes], {directives}, ## sections with targets) and runs the script checker before handing the script over.
---

# Writing a Sightline Prompter script

**Where Sightline is:** the Sightline Prompter source folder, a clone of
https://github.com/JoJo-1965/sightline-prompter. Use the `SIGHTLINE_HOME`
environment variable if it's set; otherwise, if this skill sits in that
repo's `skills` folder, it's two folders up; otherwise ask the user. Below,
`<sightline>` means that folder.

The spec changes with the app, so read it fresh every time rather than
working from memory:

1. **Read `<sightline>/docs/AI-SCRIPT-BRIEF.md`**, everything below the first
   `---` line. Those are the rules. Follow every one.
2. For anything the brief doesn't settle, read
   `<sightline>/docs/SCRIPT-DIRECTIVES.md` (the full spec).
   `docs/script-directives.json` is the list the checker enforces.
3. For the look of a finished script, see `<sightline>/src/samples/`:
   `batch-module.md` (sections with targets, for batch recording),
   `single-take.md`, `voice-and-stops.md` (`{stop}` and countdowns) and
   `talking-points.md`.

If there's no clone, the brief and spec are at
https://github.com/JoJo-1965/sightline-prompter/tree/main/docs; write to them,
and say the checker couldn't be run.

## Writing it

- Write the spoken words for the ear: short sentences and plain words, in the
  user's spelling (British or American).
- One `##` heading per section, so each can be recorded, timed and retaken on
  its own. Sightline's take log, pacing light and edit pack all work by
  section.
- Notes to the speaker go in `[square brackets]`; app directives go in
  `{curly braces}`. Never put spoken words inside either, except quoted words
  in a note.
- Use only the directives the brief allows. Don't invent new ones.
- In a long section, name a marker at the start of each part,
  `{marker: Setup}`, so the edit can find and recut each part.
- For a recording session, start with `{soundcheck: room}` and
  `{soundcheck: voice}`, each on its own line before the first section, so the
  room and the mic are checked and the results kept with the session.
- For a demo, an ad-lib or questions, put `{listen: off}` before it and
  `{listen: on}` where the script starts again, with the demo notes in
  `[brackets]` between: the microphone is off and the edit keeps that part
  whole.
- For a talk from notes rather than a script, use `{mode: notes}`: a
  `# heading` (or `{page}`) starts each page and each `## heading` on it is a
  short bullet. See `src/samples/notes.md`.
- Save as `.md`, named for the piece (for example `M2 Inclusive language.md`),
  in the folder the user is working in unless they say otherwise.

## Check before handing it over

Run the checker on every script you write or change:

```
node "<sightline>/scripts/check-script.mjs" "path/to/script.md"
```

Exit code 0 means no errors (warnings are allowed). Fix every error, and fix
or explain each warning, then run it again. Report the result in one line,
for example "Checker: no errors, no warnings".

Then give the user, briefly: the sections with their targets, an estimate of
the total spoken time at the script's pace, and anything you weren't sure of.

To put the script straight into the prompter, use the `sightline-session`
skill (`load` into a slot).

## Don't

- Don't change the Sightline app or its repo: it's only read for the spec and
  the checker.
- Don't put personal file paths, keys or anything private in a script.
