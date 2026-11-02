# TODO

## Current build — Settings Preview 07

Requested as one combined repreview after all queued cards arrived in full.
Includes the compact mirror buttons and all Preview 06 UI fixes. Source native
checks passed at five sizes. Documentation revision 8 and the new build manifest
identify this package. Reuse the existing Preview 05 profile and promo slot 4;
the previous handover below is retained as history. No release is implied.

Preview 07 is packaged-tested and running. Saved preferences, slots and pairing
were verified retained against the valid pre-launch backup. See
[Preview 07 verification](docs/PREVIEW-07-VERIFICATION.md).

## Current handover — Settings Preview 06

The combined layout was approved on 2 November 2026. Before packaging, review
the conversation queue, not only this backlog. The four visible queued cards
are included: Prompter layout naming, visible group subtabs, matching toolbar
mirror icons and one combined preview containing all preceding UI fixes.

- [x] Implement the approved Settings batch and retain saved preferences.
- [x] Include the older Guide/OBS shortcut overlap in this batch.
- [x] Complete native and packaged checks, documentation/matrix/JL snapshot sync.
- [x] Deliver one portable Preview 06 using the existing Preview 05 profile.

Packaged source `50e2a08`, code `c0b1b9a`, documentation revision 7. Running
from `D:/Sightline/Dev/Builds/Previews/settings-layout-preview-06`; the retained
profile's preferences, slots and pairing were checked unchanged. No recording
was started. See [verification](docs/PREVIEW-06-VERIFICATION.md).

Physical controller/pedal/iPhone acceptance, clean recording/capture and sync
remain manual checks. Code signing, updates, meeting integrations and other
roadmap proposals are outside this preview. No release or live deployment is
implied. The sections below retain earlier candidate history.

## Built for the next candidate, not yet packaged

- [x] Setup/session workflow (58): named component subtabs, top-level
  Components/Debug, OBS now under Controls, first-use checklist and Session check.
- [x] Restore shipped defaults and restart onboarding, with confirmation,
  private settings backup and retained components/files/keys. Active recording,
  editing and maintenance block reset. Native isolated-profile checks pass.
- [x] OBS setup assistant (59): configured-source choices, folder picker,
  reviewed separate profile/scene plan, idle guards, retained old setups and
  configuration guide. Actual device quality, clean outputs and sync still
  require a recording test. No user OBS setup has been changed by this work.

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
  Portrait/landscape previews checked; real iPhone acceptance follows 1.1.0-rc.1.

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

- [ ] Joanne reviews this batch in [1.1.0-rc.1 review](docs/RC15-REVIEW.md).
- [ ] Check the conversation queue again immediately before any RC build.

## After an approved installation

- [ ] Actual installation-directory repair follows an approved installation;
  the running RC14 has not been relocated or replaced during this work.

The current feature backlog and release status are in [ROADMAP.md](ROADMAP.md).
The older checklist below is retained as project history.

## Features

- [x] Auto-scroll mode — configurable words-per-minute pace and keyboard controls
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
