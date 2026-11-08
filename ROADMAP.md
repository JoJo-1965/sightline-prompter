# Sightline Prompter roadmap

Updated 8 November 2026. Released baseline: **Sightline 1.2.0** and
**Stream Deck companion 0.2.0**.
This is the current plan. [Earlier plans](docs/ROADMAP-HISTORY.md) are archived;
their RC labels and old version buckets do not describe the current release.

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

## In 1.3.0 RC1 preview

**RC5 candidate:** optional Voice-mode start at the section heading, so a
presenter can warm up, read the title and continue naturally into the body.
The existing heading/body structure remains available for editorial trimming;
automatic verified cut boundaries are outside this setting. First body line
remains the default; Scroll and Notes keep their existing behaviour.

**RC3 adds pointing cues:** silent presenter-relative directions with optional
graphic labels, captured-script anchors and take-linked production exports.
Use existing inline appearance controls. The editor must verify the gesture,
output orientation and asset; automatic gesture detection/insertion is deferred.
See the [RC3 notes](docs/RELEASE-1.3.0-rc.3.md). RC1/RC2 features remain included.

Authoring follow-up: the shared script/production cue contract and matched
promo direction plan are written, with local agent instructions updated.
Academy's source-to-Sightline generator still needs its actual output checked
by Production before a cue-bearing module is marked Ready to record.

**RC2 now adds controller consolidation for UAT:** function-specific grouped
keys, useful preparation/review controls, explicit reading modes, Again,
OBS pause/resume, status displays, Adjustment dial and separate Virtual/Plus
test profiles. All published UUIDs remain registered. See the
[RC2 notes](docs/RELEASE-1.3.0-rc.2.md). Physical morning UAT is outstanding.

Explicit local post-record transcription/import, script comparison, command
cut ranges, per-file audio offsets and optional coach marks are implemented
for candidate testing. Original source logs remain intact. See the
[RC1 notes](docs/RELEASE-1.3.0-rc.1.md). Windows native checks are recorded with
the preview manifest; other platforms require acceptance.

## Next: recording accuracy and real-world feedback

**RC4 candidate:** the approved HUD layout is implemented for UAT: gold short
cues, fixed head-edge/screen-edge midpoint targets below the eyes, foreground
script text and Review's inline directions. One optional shared visibility
action covers pad/phone/mappings and companion 0.2.1.6 Display keys. Navigation
hold/position fixes, product-name wake protection, note wrapping and consolidated
About/coffee controls accompany the same batch. Packaged UAT and actual device
acceptance remain required. See [RC4 notes](docs/RELEASE-1.3.0-rc.4.md).

These are priorities, not release promises or dates.
The [1.3.0 RC1 checklist](docs/PLAN-1.3.0-RC1.md) records the production desk's
timing, transcript, command-range and in-recording sync requirements, with
acceptance evidence. Parser aliases and visible unmatched-command feedback
already exist in 1.2.0; acoustic reliability still needs the real audio tests.

| Topic | Next work | Acceptance evidence |
| --- | --- | --- |
| Stream Deck companion 0.2.1 | Bundle on-screen Virtual Stream Deck standard/OBS profiles with the shared key icons and an 8 × 5 operator layout; standalone previews use existing 0.2.0 actions | Real type-11 profile import and key response, full layout visibility, retained existing profiles and OBS permission/hold checks; separate from the MCP Deck |
| Edit timing | Add opt-in automatic processing after recording stops, human dispositions and broader transcript/long-take coverage to the explicit RC1 workflow | Compare against actual recordings, including late/bunched live recognition and false starts |
| Sync | Extend RC1 per-file audio alignment with in-recording clap candidates and explicit human picture-sync review | Start/middle/end alignment and explicit uncertainty; no invented clean-camera lip-sync result |
| Recording identity | Continue testing first-take/file association, external stop/restart and short extra recorder sessions | Saved logs checked against physical output files |
| Voice commands | Expand recorded acoustic fixtures beyond RC1's section 7/12 and finish-tail regressions; preserve deadlines and permission gates | Reproducible recognition cases and no accidental recording actions |
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

## Explore for Sightline 2.0: platform and commercial model

Saved at Joanne's request, 8 November 2026. These are separate research
questions, with no commitment to migrate, introduce charges or change licensing.
They do not change RC5's scope or interrupt its UAT and release work.

| Topic | Exploration and decision criteria |
| --- | --- |
| Rust / Tauri feasibility | Investigate retaining the approved HTML/CSS/JavaScript interface and editor while replacing Electron's desktop layer. Start with a separate bounded prototype. Compare installer size, startup, memory, CPU and voice responsiveness against Electron under the same recording workload. Proceed only if measurable benefits justify the migration and maintenance cost. |
| Commercial model and licensing | Explore paid editions and possible proprietary distribution independently of the framework choice. Review code ownership, contributions, dependencies and notices before choosing terms. No current licence or pricing change is approved. |

The platform prototype must check transparent overlays, click-through,
always-on-top behaviour, capture exclusion and multiple monitors on Windows
and macOS. Include microphone/audio capture, local speech bindings, camera
and head-guide behaviour. Preserve settings and script migration, existing
Stream Deck actions/profiles, and the OBS, pad/phone, API and MCP contracts.
A smaller shell alone does not establish better speech recognition.

MIT already permits commercial use and distribution without source code,
subject to its notice requirements; a Rust port does not erase obligations
for retained or adapted code. Existing MIT releases retain their permissions.
Any new terms must distinguish code we own from third-party components.
See [MIT permissions](https://choosealicense.com/licenses/mit/), the
[MIT licence](https://opensource.org/license/mit) and
[Tauri's architecture and licensing](https://v2.tauri.app/concept/architecture/).

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
