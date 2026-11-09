# Sightline Prompter roadmap

Updated 9 November 2026 for **Sightline 1.2.0** and **Stream Deck companion 0.2.0**.
This is the current plan. [Earlier plans](docs/ROADMAP-HISTORY.md) are archived;
their RC labels and old version buckets do not describe the current release.

## Published on Elgato Marketplace

- [x] **9 November 2026: Stream Deck plugin 0.2 published.**
  [Open the Marketplace listing](https://marketplace.elgato.com/product/sightline-prompter-34676f28-e2e5-422d-9b48-e03dfd80bebe).
  This is the released 0.2.0 companion; Elgato displays its version as 0.2.
  Direct downloads remain available. Newer 0.2.1 candidate builds require
  their own validation and submission; they are not part of this publication.

## Shipped in 1.2.0

| Topic | Delivered |
| --- | --- |
| Reading and Settings | Approved navigation/control/preview composition; independent fonts, colour, attributes and line spacing for speech, headings, cues and comments; editable backgrounds and portable reading themes; mode-aware controls and live Tools |
| Recording preparation | Shared manual head guide and local position feedback; fixed target and Lock current; advisory room/voice check; real reviewed test clip; saved reference for returning after a break |
| Guide usability | Recoverable bottom toolbar, pin, lock/unlock, fullscreen, Move guide and Guide off; calibration stays in Guide adjustments; distance respects Width and side adjustments; redundant footer removed |
| OBS | Single Connections home and subtabs; separate connection/recorder state; explicit permission for recording commands and linked prompting; scene chooser for calibration; temporary virtual-output ownership |
| Controllers | One home per interface, enable gates, complete assignment lists, pad ordering and Stream Deck connection/version checks |
| AI and handover | Optional local MCP adapter, separate grants and offline setup help; script/take snapshots and qualified edit-pack estimates |
| Reliability and distribution | Expanded finish/restart/section voice aliases, persistent test results, sound-check meters, current-section pill, refreshed demos/help and free ad-hoc Mac signing |

See [grouped release notes](docs/RELEASE-1.2.0.md) and the
[249-row feature grid](docs/FEATURE-GRID.md) for exact behaviour and limits.

## Next: recording accuracy and real-world feedback

These are priorities, not release promises or dates.
The [1.3.0 RC1 checklist](docs/PLAN-1.3.0-RC1.md) records the production desk's
timing, transcript, command-range and in-recording sync requirements, with
acceptance evidence. Parser aliases and visible unmatched-command feedback
already exist in 1.2.0; acoustic reliability still needs the real audio tests.

| Topic | Next work | Acceptance evidence |
| --- | --- | --- |
| Edit timing | Derive word/caption timings from post-record transcription rather than live following; only flag missing words when a reviewed transcription supports it | Compare against actual recordings, including late/bunched live recognition and false starts |
| Sync | Calculate and record audio-derived session/recording offsets where sufficient scratch/master audio exists | Start/middle/end alignment and explicit uncertainty; no invented clean-camera lip-sync result |
| Recording identity | Continue testing first-take/file association, external stop/restart and short extra recorder sessions | Saved logs checked against physical output files |
| Voice commands | Improve difficult section numbers, pauses, end/finish and restart phrases from production examples | Reproducible recognition cases and no accidental recording actions |
| Framing | Gather feedback on target/crop consistency, movement advice and native toolbar stacking on real multi-screen setups | Camera/projector tests across Windows, Mac and Linux; preserve manual fallback |
| Documentation | Keep current screenshots, topic-based notes, samples, feature grid and JL copy in the same deployment review | Versioned source, checked links and exported-file consistency |

## Later: connections and platform delivery

| Topic | Scope and dependencies |
| --- | --- |
| MCP | Broader client examples and capability discovery; remote/cloud MCP and OAuth remain unimplemented |
| Mac trust | Paid Developer ID and notarisation remain optional future work. Current ad-hoc signing validates bundle integrity but does not remove every Gatekeeper warning |
| Updates | Safer update delivery after installer and platform testing; current release checks do not silently install updates |
| Additional recording services | Investigate only where supported interfaces and user demand justify it; no current Zoom, Teams or Riverside recording-control claim |
| Privacy and diagnostics | Improve opt-in diagnostics without collecting scripts, recordings or secrets by default |
| Support | Consider a supporters wall when useful, respecting visibility choices. Voluntary support does not gate app features |

## On hold or outside the current scope

- Right-to-left scripts and translated interface packs remain on hold. English
  directives and command words are the current reference.
- General production video recording, automatic finished-video editing and a
  browser edition are not current Sightline features.
- Face identity, gaze correction, automatic projector-window discovery and
  automatic fitting of the head guide to an arbitrary window are not provided.
- Future paid plugin editions are a separate product/licensing decision.
  Existing permissions and the current app's free MIT licence remain intact.

## Release practice

Review delivered feedback as a batch. Preserve the approved Settings layout,
working scripts/profiles and recording references. Verify source and packages,
then update help, samples, screenshots, matrix, website and release notes
together. User approval controls publication; tests do not replace physical
camera, recorder or controller acceptance.
