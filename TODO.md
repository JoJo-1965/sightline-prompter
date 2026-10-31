# TODO

## Workflow design to review before wider changes

- [ ] Named Components subtabs and direct Components/Debug access, replacing
  numbered component pages (58). See the workflow proposal and mock-ups.
- [ ] First-use checklist and session-check entry point (58).
- [ ] Optional separate OBS profile/scenes setup assistant and guide (59).

## Built for the next candidate, not yet packaged

- [x] Component prerequisites: optional OBS/Stream Deck discovery, separate plugin
  checks, supplier installers/Locate and clear grey-control reasons. Preserve
  preferences, remote OBS and independent API clients.

- [x] Script health (#30): current editor text, section estimates, long-sentence
  and similar-word-start prompts, with section navigation and no rewrite/save.
- [x] Rehearsal coach (#28): per-take pace, qualified sentence/reread review,
  optional aggregate filler counts and additive CLI/API/edit-pack reports.

- [x] Components manager (#47): model and AI-kit status, Install/Reinstall/
  Remove, separate Node check, bundled standalone tools and model busy guards.
- [x] Button mappings (#40): learn local keys and controller buttons, choose
  shared pad actions, device overrides, pages, immediate saving and reset.
- [ ] Physical controller/pedal acceptance of the new mappings after packaging.

- [x] Compact phone landscape layout: preserve button order, use four or six
  columns, fit Studio in two rows and add browser-safe footer spacing.
  Portrait/landscape previews checked; real iPhone acceptance follows RC15.

- [x] Accept and validate `padLayout` through the API and JSON/XML imports,
  preserving structured values and protected permissions. Changes are live.
- [x] Session-only capture override (#57), desktop/phone warnings, normal-rule
  restoration, guide metadata and restart reset.
- [x] Phone sending/sent, refused/no-reply feedback, pending-tap suppression,
  bounded request waits and no automatic replay.
- [x] Plan-first install helper: verify candidate hash, retain spaces in the
  intended folder, request normal Windows elevation only on Run, then verify
  installed location/version. Native NSIS argument test does not install.

## Before packaging

- [ ] Joanne reviews this batch in [RC15 review](docs/RC15-REVIEW.md).
- [ ] Check the conversation queue again immediately before any RC build.

## After an approved installation

- [ ] Actual installation-directory repair follows an approved installation;
  the running RC14 has not been relocated or replaced during this work.

The current feature backlog and release status are in [ROADMAP.md](ROADMAP.md).
The older checklist below is retained as project history.

## Features

- [ ] Auto-scroll mode — toggleable auto-scroll at configurable speed (words-per-minute), spacebar to toggle, up/down to adjust speed
- [x] Add a basic markdown editor (CodeMirror 6, Cmd+E toggle, Save/Save As)
- [ ] Allow for custom CSS

## Completed

- [x] Font size adjustment at runtime — `Cmd/Ctrl+Plus`/`Cmd/Ctrl+Minus` to scale up/down, `Cmd/Ctrl+0` to reset
- [x] Persist last opened file — auto-load on next launch
- [x] Recently opened files — File > Open Recent submenu, persisted in `app-state.json`
- [x] Mirror/flip mode — `Cmd/Ctrl+M` to toggle horizontal flip for beam splitter setups
- [x] Opacity control — `Cmd/Ctrl+Shift+Up`/`Down` to adjust, `Cmd/Ctrl+Shift+0` to reset
- [x] Center window on screen when no saved state exists
- [x] Drag-to-resize handle — bottom-right corner grip for the frameless window
