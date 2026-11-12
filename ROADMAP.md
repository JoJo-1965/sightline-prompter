# Sightline Prompter roadmap

**RC14 candidate:** controller/API/MCP consistency batch implemented, including
the optional Call overlay preset and companion 0.2.1.7. Existing profiles/IDs
remain; hardware UAT and the public 2.0 naming decision are still separate.
[Mapping and migration](docs/CONTROLLER-COMPATIBILITY.md).


Updated 12 November 2026. Released baseline: **Sightline 1.2.0** and
**Stream Deck companion 0.2.0**.
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

## In 1.3.0 preview

**RC13:** editor Insert templates, plain-text Auto format, three visible reading
modes and recoverable Clean view, Click-through and On top toolbar controls.
Includes RC12; [queue review and UAT](docs/uat/1.3.0-RC13.md).

**RC12:** combined toolbar utility alignment, clean/dirty editor exit, remembered
dialog screens, foreground button-label commands, speech-driven audio checks,
optional Sightline wake word, applied-input diagnostics, short-take assessment,
Retake fallbacks and heading-aware continuous Voice recovery.
[UAT and limits](docs/uat/1.3.0-RC12.md). Physical microphone validation remains.

**RC11 preview:** paused double-click paragraph editing with Save/Cancel,
visible line breaks and source preservation. Small windows use a slot picker;
window controls stay top right on the first row. Native checks cover editing,
conflicts, held Voice resume and compact layouts. Human microphone UAT remains.

See [RC11 notes](docs/RELEASE-1.3.0.md#rc11).


**RC10 Voice boundaries:** `{stop}` prepares the next spoken passage without
holding Voice. Retake returns to the completed section until you speak the next
passage; no extra Go is needed. Stops and timed pauses still control Scroll.
Use an explicit spoken Pause for a deliberate Voice hold, and finish recording
explicitly after the final passage. Off-script and sound-check holds remain.


**RC9 usability batch:** paragraph spacing now lives with Spoken script
appearance and persists in reading themes. Bookmark flags are removed; anchors,
logs and enabled OBS chapters remain. Nearby ordered speech can advance through
common-word stalls, with guarded distant relocation. Physical microphone UAT
remains. See [RC9 notes](docs/RELEASE-1.3.0-rc.9.md).

**RC8 usability batch:** record/start recording/begin confirms OBS before
prompting; go/practice/start practice leaves OBS unchanged. Foreground gold
voice feedback, observed recogniser-fragment handling and clear setup stage
requirements support recording without hunting for controls.

**RC7 correction:** guided OBS setup accepts an unavailable optional replay
buffer, allowing configured camera/microphone sources to load. Active outputs
and unconfirmed connection states remain protected. Local preview only.

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

**Call overlays and Auto format — included in RC13.** Three toolbar
modes, paragraph paging, recoverable Clean view, Click-through and On top,
plus plain-text formatting with optional basic codes and preview/Undo/Save.
Combined with Insert tools in RC13, with an updated matrix/JL review archive.
Physical call-overlay UAT remains.
[Combined review](docs/uat/RC12-OVERLAY-AUTHORING-FEEDBACK.md).

**Editor insertion menu — included in RC13.** Grouped templates for
directions, pointing, notes/headings and existing codes insert at the cursor.
Editable values, Undo, Save, compact layouts and protected samples are checked.
Included in the RC13 preview and its feature-grid/JL archive refresh.
[Review](docs/uat/RC12-EDITOR-INSERT-FEEDBACK.md).

**RC6 correction batch:** bare and timed `{pause}` directives are Scroll-only.
Voice follows natural pauses without a forced hold or linked-recorder pause;
explicit `{stop}`, sound checks and spoken pause commands remain deliberate.
Paused review also leaves opening comments clear of floating session controls,
including wrapped rows. RC5's heading lead-in and section-jump fixes remain.
See [RC6 notes](docs/RELEASE-1.3.0-rc.6.md); actual microphone/recording UAT remains.

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
| Toolbar utility layout — RC12 | Keep Help, Settings and window controls together at the top right with consistent alignment; fix narrow-window orphaning and wide-window offsets reported during RC11 UAT. See the [queued feedback](docs/uat/1.3.0-RC11-FEEDBACK.md). | Render actual narrow and wide layouts with full slider values, nine slots and session controls; check alignment, wrapping, clipping, keyboard access and auto-hide. Implemented in RC12; check the actual setup in UAT. |
| Editor exit label — RC12 | Show Close for a clean editor and Cancel while edits are unsaved, retaining discard confirmation. Return to Close after a successful save or Undo to the saved text. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#editor-close-and-cancel). | Cover clean/dirty/save/undo transitions, failed or cancelled saves, retained drafts, read-only samples and accessible labels. Implemented in RC12 with clean/dirty/Undo/save checks. |
| Dialog and Settings placement — RC12 | First open on the actual parent's monitor; subsequently restore each app-owned window's saved monitor, position and size. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#dialog-and-settings-window-placement). | Check independent window types, nested dialogs, all close routes, restart persistence, disconnected screens and scaling changes. Native dialogs retain OS-supported placement and correct ownership. Implemented in RC12; multi-monitor hardware UAT remains. |
| Contextual dialog voice actions — RC12 | While a Sightline dialog/instruction interaction already has attention, accept its enabled button labels without repeating the wake word; include Continue and Check again in audio checks. | Scope to the active window; preserve button handlers, confirmations and permissions; reject disabled/background/ambiguous actions and ordinary script speech. See the [queued feedback](docs/uat/1.3.0-RC11-FEEDBACK.md#speakable-dialog-actions-in-attention-mode). |
| Voice-check timing | Wait for speech before starting the sample; finish after sustained end of speech or ten seconds from onset. Keep room-tone sampling separate and quiet-level results advisory. | Delayed onset, breathing, silence, background noise, quiet voice, timeout and command-free retry samples; consistent preparation/script checks and real microphone UAT. Implemented in RC12; multi-monitor hardware UAT remains. |
| Sightline wake word | Add Sightline as a selectable wake word, retaining the current selection and the existing command set. | Selected-word and split-result tests, settings persistence, consistent help/listening labels, product-name narration guards and real microphone UAT. See the [next-RC queue](docs/uat/1.3.0-RC11-FEEDBACK.md#sightline-wake-word). |
| Microphone level stability | Prepared explicit AGC-off speech/wake capture and selected-mic test metering for the next candidate; included in RC12. | Fake-device default/selected/fallback/permission tests pass. Verify applied stream settings and actual Windows input level alongside other audio apps; the reported 71-to-62 change is not yet attributed. |
| Heading-aligned section starts | Source correction prepared: automatic Voice advance, Go and restored boundary targets honour Start from section heading. Native checks pass with the option on and off; included in RC12; earlier packages stay frozen. | Check heading/body positioning across start, navigation, soft boundaries, quick-edit resume and Retake, with correct take identity. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#align-section-starts-to-the-heading). |
| Stream Deck companion 0.2.1 | Bundle on-screen Virtual Stream Deck standard/OBS profiles with the shared key icons and an 8 × 5 operator layout; standalone previews use existing 0.2.0 actions | Real type-11 profile import and key response, full layout visibility, retained existing profiles and OBS permission/hold checks; separate from the MCP Deck |
| Edit timing | Add opt-in automatic processing after recording stops, human dispositions and broader transcript/long-take coverage to the explicit RC1 workflow | Compare against actual recordings, including late/bunched live recognition and false starts |
| Sync | Extend RC1 per-file audio alignment with in-recording clap candidates and explicit human picture-sync review | Start/middle/end alignment and explicit uncertainty; no invented clean-camera lip-sync result |
| Recording identity | Continue testing first-take/file association, external stop/restart and short extra recorder sessions | Saved logs checked against physical output files |
| Voice commands | Expand recorded acoustic fixtures beyond RC1's section 7/12 and finish-tail regressions; preserve deadlines and permission gates | Reproducible recognition cases and no accidental recording actions |
| Quick script edits — RC11 candidate | Implemented paused paragraph Save/Cancel, visible breaks, source persistence and refreshed tracking. Ctrl+E retains the full editor. | Native checks cover source preservation, external conflicts, duplicates, read-only samples, playback gates and held Voice resume. Human microphone UAT remains. |
| Voice and command onboarding | Internal setup trains the operator and adapts recognition to their natural words, phrases, accent and speech differences. A dedicated internal script proposes `{training}` steps to prompt, listen, compare, suggest a fix and repeat until consistent. Rerunnable from Voice settings. See the [onboarding proposal](docs/design/VOICE-TRAINING-ONBOARDING.md). | Fresh repeated utterances consistently resolve to the intended word/action; confirmed local corrections survive restart; ordinary speech does not trigger commands; accessible timing, repeat/skip/cancel and no real recorder actions during training |
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
