# Sightline 1.3.0 RC6 preview

9 November 2026 · documentation revision 22. Includes the earlier RC1–RC5
features. The public app remains 1.2.0. Marketplace plugin 0.2 is published;
the optional 0.2.1.6 companion remains a separate candidate.

## Reading and review

- Paused/review mode leaves space above the opening script so the first
  preparation comment can scroll clear of the floating session controls.
- The space follows wrapped control rows on smaller windows. Scroll up or
  choose Back to the start to read the beginning in full.
- Delivery removes the review space, hides preparation comments and keeps
  the reading-line alignment. Script content and saved appearance stay intact.

## Voice and script pauses

- Bare `{pause}` and timed `{pause: 3s}` directives apply to Scroll mode.
  Voice keeps following naturally, including when OBS recording is linked.
- Explicit `{stop}`, spoken pause commands, sound checks and recording
  commands retain their deliberate behaviour. A timed Voice tag remains a
  visual beat cue; it does not force a countdown or pause linked recording.
- RC5's section-heading lead-in and Next/section/retake behaviour remain.
  A section jump resumes Voice without a separate Prompter, go command.

## Documentation and distribution

The included guide, authoring instructions, demos and 268-entry feature grid
describe RC6. Marketplace links use the published 0.2 listing, with a direct
download alternative. Public stable references retain their 1.2.0 basis.
The missing Marketplace video poster is a listing-media follow-up, outside
this app package. No video recut, plugin installation or submission is included.

## UAT and retained setup

The RC6 launcher uses its own profile copied from the latest backed-up RC5
setup. Existing scripts, slots, themes, connections and mappings are retained.
A focused RC6 test script can occupy the first spare slot; occupied slots are
never replaced. The opening active script stays selected.

Automated tests use isolated profiles and synthetic inputs. Real microphone
recognition, camera framing and production recordings still need Joanne's UAT.
Keep the current Virtual Stream Deck profile; the companion is not changed.
