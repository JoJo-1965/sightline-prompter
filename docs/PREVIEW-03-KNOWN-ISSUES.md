# Directions appearance Preview 03: review status

Unpublished local development preview, 1 November 2026. This is a checkpoint
of the changes under review, not a release-ready app.

## Included work

Separate inline-direction and production-note size, colour and line spacing;
the Directions topic; independent Theme resets; note sizing independent of a
heading container; high-contrast note visibility; JSON/XML transfer; named
footer destinations and bounded labels. Isolated native-window fixtures and
the automated suite passed during development.

## Reported problems that remain

- In Joanne's running preview, the Settings fieldsets existed but the
  production-note and inline-style inputs were absent from the Settings
  document. Colour/Theme controls were therefore not usable. The precise
  handoff failure has not been reproduced or fixed. Passing isolated tests
  did not establish that the actual-use sequence worked.
- There is no independently selectable production-note font or italic option
  in this app build. The proposed redesign adds these; the mock is not an
  implemented feature.
- Automatic pagination moves controls between pages as height changes.
  Keeping the Directions groups together and containing footer labels does
  not solve the broader navigation problem.
- Hiding the toolbar applies `cursor: none` to the whole prompter, explaining
  the disappearing pointer report. Pointer visibility must be separated.
- Tools can clip in small windows and does not share a complete control
  vocabulary with Settings.

The [Settings and Tools review](design/SETTINGS-AND-TOOLS-REDESIGN.md),
[interactive mock](design/settings-and-tools-prototype.html) and
[screenshot gallery](design/settings-and-tools-gallery.md) are the proposed
replacement. They are explicitly labelled as design artifacts. The initial
recording configuration, fixed navigation, full text attributes and consistent
controls are being reviewed together before another implementation build.

The feature grid's Preview 02 snapshot excludes these proposed controls.
The published baseline remains Sightline 1.1.0 / Stream Deck 0.2.0. No new tag,
release or website deployment has been made for this work.
