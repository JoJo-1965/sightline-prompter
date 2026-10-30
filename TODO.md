# TODO

## Pending fixes for the next candidate batch

- [ ] Accept and validate shared `padLayout` objects through the existing
  `/settings` API and settings-file import. RC14 drops the object because its
  default is null and `pickKnown` accepts only strings/null in that case.
  The Settings editor and saved-preference loading work. Preserve protected
  settings, validate action IDs/columns and test the API/import round trip.
  Studio was applied to Joanne's saved preferences and verified on the live
  pad/phone status without building another candidate.

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
