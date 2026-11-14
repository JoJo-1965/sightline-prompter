# Sightline Prompter roadmap

Updated 14 November 2026. **Current candidate: 1.3.0 RC15 + Stream Deck 0.2.1.7.**
Released baseline: **Sightline 1.2.0 + Stream Deck 0.2.0**. The plugin is on
Elgato Marketplace; the public 2.0 naming decision remains separate.

## Roadmap highlights

Read from top to bottom: finish the release gate, then take the development
queue in priority order. Value first, then effort; prerequisites can hold an
item back. Scores and sizes are planning assessments, not delivery promises.

| Order | Outcome | Value | Size | v2 scope | Position / next step |
| --- | --- | --- | --- | --- | --- |
| Now | [Accept and release the core candidate](#release-acceptance) | Release gate | UAT | Release acceptance | Real recording, microphone, monitor and controller checks; resolve blockers and approve publication. |
| 1 | [Reliable Voice and commands](#recording-and-onboarding-detail) | ★★★ | M | Existing-feature fixes / UAT | Reproduce recorded misses and tracking stalls; extend regression audio. |
| 2 | [Trustworthy take/file identity](#recording-and-onboarding-detail) | ★★★ | M | RC15 batch | Verify first takes, external recorder restarts and every actual output file. |
| 3 | [Accurate edit-pack word timings](#recording-and-onboarding-detail) | ★★★ | M | RC15 review improvements; automation later | Extend post-record transcription, review and optional automatic processing. |
| 4 | [Measured recording sync](#recording-and-onboarding-detail) | ★★★ | M | Validate existing; extensions later | Check file offsets, recorded sync cues and picture/sound alignment. |
| 5 | [Accessible command training](#recording-and-onboarding-detail) | ★★★ | L | After v2 | Guided, repeatable onboarding for commands and natural speech differences. |
| 6 | [Easier local MCP setup](#smaller-connections-and-diagnostics-work) | ★★ | S | RC15 batch | Broaden client examples and explain capability discovery. |
| 7 | [Useful opt-in diagnostics](#smaller-connections-and-diagnostics-work) | ★★ | M | RC15 batch | Make troubleshooting easier while keeping scripts, media and secrets private. |
| 8 | [Demo capture prototype](#after-the-core-release-product-demos-and-demo-mode) | ★★ | M | After v2 | OBS camera/screen masters, input events, named steps and two-pass handover; optional Playwright runner. |
| 9 | [Full Demo mode](#after-the-core-release-product-demos-and-demo-mode) | ★★ | L | After v2 | Editable mouse effects, zooms, shortcut labels and coordinated scripted production; depends on prototype. |

Later candidates and research are listed [below](#later-connections-and-platform-delivery).
They need scope, dependencies and value/size assessment before entering this
numbered queue. Small ready ★★ work comes before the demo prototype; the
complete module follows remaining ready ★★/S–M work. ★ extras come last.

**Navigation:** [release acceptance](#release-acceptance) ·
[recording and onboarding detail](#recording-and-onboarding-detail) ·
[demo plan](#after-the-core-release-product-demos-and-demo-mode) ·
[later candidates](#later-connections-and-platform-delivery) ·
[research](#longer-term-exploration-platform-and-commercial-model) ·
[completed and preview reference](#completed-and-preview-reference).
Release-by-release changes belong in the [grouped release notes](docs/RELEASE-1.3.0.md).

## V2 release scope

The current RC contains the accumulated prompting, authoring, HUD, recording
review, controller and local MCP features. **Joanne requested the bounded batch
for items 2, 3, 6 and 7.** RC15 implements those additions; physical acceptance
and any reproducible correctness fixes remain release work. Item 3 covers the
existing explicit recorded-audio workflow, with automatic post-stop processing
deferred. Items 4 and 5 retain their separate future extensions.

This scope adds no full training loop, advanced sync analysis or Demo mode.
See [RC15 scope and acceptance](docs/uat/1.3.0-RC15.md) and the
[cumulative feature history](docs/RELEASE-1.3.0.md).

## Priority and size rules

Order proposed development by **value first, then effort**. These are the
standing rules; release numbers do not determine priority.

- **Value:** ★★★ changes recording day; ★★ clearly better; ★ nice to have.
- **Size:** S is about a person's day; M a few days; L a week or more.
  These are relative effort classes, not delivery dates or AI-time promises.
- Within a value band, ready S work precedes M, then L. Dependencies and
  release-blocking defects still govern what can proceed. Completed features
  awaiting UAT are acceptance work, not a fresh development backlog.

## Release acceptance

RC15's recording evidence/setup batch and RC14's controller/API/MCP work are implemented, including the
optional Call overlay preset and companion 0.2.1.7. Existing profiles and action
IDs remain compatible. This is acceptance of implemented work, not a new
feature backlog; see [mapping and migration](docs/CONTROLLER-COMPATIBILITY.md).

- [ ] Complete a real recording: Voice start/resume, section changes, Retake,
  quick edits, OBS outputs and take/file association.
- [ ] Check the actual microphone, sound checks, framing and multi-monitor
  window/toolbar behaviour; investigate any repeatable level change.
- [ ] Check Stream Deck, pad/phone, API and MCP on the devices and clients used
  in practice; preserve existing buttons, profiles, settings and slots.
- [ ] Resolve release-blocking findings and finish documentation, screenshots,
  feature-grid, samples and JL publication review as one batch.
- [ ] Choose the public version and obtain publication sign-off. Marketplace
  submission of the newer companion is a separate release step.

See [RC15 UAT](docs/uat/1.3.0-RC15.md) and the
[detailed acceptance register](#candidate-acceptance-register).

## Recording and onboarding detail

Priorities **1–5**, in the same order as the highlights. Existing RC1 review
and alignment tools provide the starting point; these rows describe remaining
work. Scope and acceptance evidence stay together. Items 2 and 3 now have an
RC15 implementation; automated processing and broader review controls remain
follow-ups, while physical correctness checks belong in release acceptance.

| Topic | Next work | Acceptance evidence |
| --- | --- | --- |
| Voice commands | Expand recorded acoustic fixtures beyond RC1's section 7/12 and finish-tail regressions; preserve deadlines and permission gates | Reproducible recognition cases and no accidental recording actions |
| Recording identity | Continue testing first-take/file association, external stop/restart and short extra recorder sessions | Saved logs checked against physical output files |
| Edit timing | Add opt-in automatic processing after recording stops, human dispositions and broader transcript/long-take coverage to the explicit RC1 workflow | Compare against actual recordings, including late/bunched live recognition and false starts |
| Sync | Extend RC1 per-file audio alignment with in-recording clap candidates and explicit human picture-sync review | Start/middle/end alignment and explicit uncertainty; no invented clean-camera lip-sync result |
| Voice and command onboarding | Internal setup trains the operator and adapts recognition to their natural words, phrases, accent and speech differences. A dedicated internal script proposes `{training}` steps to prompt, listen, compare, suggest a fix and repeat until consistent. Rerunnable from Voice settings. See the [onboarding proposal](docs/design/VOICE-TRAINING-ONBOARDING.md). | Fresh repeated utterances consistently resolve to the intended word/action; confirmed local corrections survive restart; ordinary speech does not trigger commands; accessible timing, repeat/skip/cancel and no real recorder actions during training |

The [RC1 production checklist](docs/PLAN-1.3.0-RC1.md) retains the timing,
transcript, command-range and in-recording sync requirements. Parser aliases
and visible unmatched-command feedback already exist; acoustic reliability
needs real audio evidence. Training remains proposed internal setup, not a
claim that the current app retrains its speech model.

## Smaller connections and diagnostics work

Priorities **6–7**, implemented in the RC15 batch for acceptance. These fit ahead of the demo prototype;
remote/cloud MCP and authentication are separate later candidates.

| Topic | Next work | Acceptance evidence |
| --- | --- | --- |
| Local MCP setup and discovery | Add broader local-client examples and clear capability/permission discovery over the existing adapter. | Follow the instructions with real clients, including disabled grants, reconnection and actionable setup errors; preserve existing API/MCP contracts. |
| Opt-in diagnostics | Improve troubleshooting information without collecting scripts, recordings or secrets by default. | Verify useful microphone/recogniser/recorder context, redaction and explicit consent; keep diagnostics optional and local until the user shares them. |

## After the core release: product demos and Demo mode

**Priorities 8 and 9 in the [highlights](#roadmap-highlights).** The OBS/event-log
prototype is **★★ / M**; the complete module is **★★ / L**. Begin after the core
release, higher-value recording/onboarding work and smaller ready improvements.
The prototype must prove the workflow before the full module proceeds.
No delivery version or date is committed; a possible public 2.0 name is a
separate release decision.

Keep the capture/event/effects engine modular while sharing Sightline's
scripts, takes, recording state, edit-pack clock, OBS, API/MCP and existing
controller families. It belongs in the Sightline workflow; a separate public
product or repository is an implementation decision after the prototype.

| Phase | Proposed scope | Evidence before expanding |
| --- | --- | --- |
| 1 · Capture and event log | Use OBS with Source Record or an equivalent per-source plugin to retain independent clean camera/headshot and screen/app masters, plus identified narration audio. A composed preview is optional. Reuse the documented clean-camera route. Collect cursor positions, clicks and opt-in shortcut events in screen-source coordinates, with source bounds and scaling. Associate each actual output file with the session, script, sections, takes and production cues. | A real demo produces both video masters and identified audio. Verify start/stop/pause/resume for every output, filenames, per-file start offsets, sync and drift; the main OBS recording state alone does not verify plugin outputs. Keep the original full frames. Use the recording clock for events, not live speech-word estimates. Verify script/guide exclusion in each capture route. |
| 2 · Presentation effects | Preview and render cursor highlights, click rings, shortcut labels, smooth zooms and pans from the recorded events. Keep effects editable and preserve the original full-frame video. | The operator can adjust or remove a zoom, avoid rapid mouse-follow movement and regenerate the result without recording again. Check text legibility, crop limits, timing and render output. Live highlighting is a separate optional presentation choice. |
| 3 · Script-directed demos | Associate authored sections and production cues with zoom/highlight targets and graphic inserts. Let a production agent propose an edit using the event log and take choices. | Script, gesture/action and recorded target agree; a reviewed edit plan can be revised before export. Existing scripts, action IDs and profiles retain their meaning; add useful functions within the existing controller groups. |

Start with a Windows proof of concept using one real product demonstration.
Independent camera and screen files let Production switch between the presenter,
the demonstrated application and picture-in-picture, and zoom the screen without
enlarging the presenter. The OBS/source plugin performs capture; Sightline's
new work is event logging, output association and the production handover.
See the [existing clean-camera guidance](docs/guide/11-obs.md#separate-clean-camera-and-microphone)
and [Source Record](https://obsproject.com/forum/resources/source-record.1285/).
The existing guide documents a separate camera route, not a completed dual-source
Demo mode or automatic discovery of the plugin's output files.
Broader platform/input permissions and performance need their own acceptance.
Built-in screen recording can follow if the OBS-based workflow demonstrates
demand; it is not a dependency for the first useful event-log handover.
This plan does not add screen recording, mouse effects or automatic demo
editing to the current RC, feature grid, downloads or public product claims.

### Optional two-pass demo workflow

Support recording the demonstration and presenter separately, as well as the
single-pass camera/screen route. A demo mistake should require a new demo take;
a narration mistake should require a new presenter take. Retain both sets of
originals and identify the capture pass and armed outputs explicitly.

| Pass | Capture and review | Handover |
| --- | --- | --- |
| A · Demonstration | Record the clean screen/app, cursor/click/shortcut events and named demo steps. Optional scratch commentary helps review. Select the useful demo takes before recording the presenter. | Keep the original media/event clocks and a versioned list of selected source ranges. Correcting a demo step does not discard the presenter material. |
| B · Presenter and narration | Play back the selected demonstration behind the prompter while recording camera and microphone. Follow the corresponding script/step. Pause or replay a demo step and retake the narration without re-running the application. | Link presenter takes to stable demo-step IDs and selected source ranges. Keep pass-specific files, source clocks and retake choices; do not treat separately recorded passes as simultaneous footage. |

Production assembles a shared edit timeline from those links. Pauses, trims,
speed changes and held frames need explicit source-to-edit mappings so that
mouse effects, narration and graphic cues remain aligned. A single clock
offset cannot align two independently performed passes. Preserve the full
screen and camera masters for later cuts, picture-in-picture and reframing.

Phase 1's **★★/M** proof of concept can validate separate pass/file identities,
step references and a manual playback handover. Linked playback transport and
automatic edit-timeline coordination belong to the complete **★★/L** Demo mode,
after that foundation is proven. This does not move the item ahead of the
recording reliability, onboarding and smaller ready improvements above it.

### Optional scripted demonstration pass

Pass A can be performed manually, driven by a saved Playwright browser script,
or driven by a desktop automation adapter when the product is a native app.
The runner is an optional external component; Sightline coordinates recording,
step references and the handover. It does not need to become a general-purpose
browser or desktop automation framework.

For a browser demo, record an initial flow with Playwright codegen, review the
generated locators and run the saved script through the CLI in a visible
browser. Use stable element targets and readiness checks, prepared demo data,
deliberate typing/mouse movement and pauses that make each action readable.
Repeat a named step or the full demo and retain only reviewed successful takes.
See [Playwright codegen](https://playwright.dev/docs/codegen),
[actions](https://playwright.dev/docs/input) and
[video recording](https://playwright.dev/docs/videos).

Use OBS/window capture for the browser-master route, with Playwright's own
video as an alternative browser-only source where appropriate. Validate the
chosen video dimensions, cursor presentation and completed output files.
The automated runner should emit step IDs, actual start/end times, action
results, pointer/target positions and shortcut events into the same demo-event
contract as manual capture. Do not rely on a desktop cursor sampler to observe
all programmatic browser actions. Render the intended cursor/click effects
deliberately, and map browser-viewport coordinates to the recorded source.

Desktop automation follows the same step/event contract, using application/UI
targets where available; raw screen coordinates are a fallback requiring
controlled window placement and scaling. Scripted input is optional and never
replaces manual recording. A first browser proof of concept can cover one
repeatable product flow; universal desktop replay and automatic authoring stay
outside that bounded **★★/M** capture prototype. The complete integration stays
**★★/L**, in the same queue position already recorded above.

## Later: connections and platform delivery

Unranked candidates pending scope and value/size assessment. They do not jump
ahead of the numbered queue simply because they appear in this section.

| Topic | Scope and dependencies |
| --- | --- |
| Remote/cloud MCP | Scope authenticated remote access and OAuth separately from the local-client improvements at priority 6; not implemented |
| Mac trust | Paid Developer ID and notarisation remain optional future work. Current ad-hoc signing validates bundle integrity but does not remove every Gatekeeper warning |
| Updates | Safer update delivery after installer and platform testing; current release checks do not silently install updates |
| Additional recording services | Investigate only where supported interfaces and user demand justify it; no current Zoom, Teams or Riverside recording-control claim |
| Support | Consider a supporters wall when useful, respecting visibility choices. Voluntary support does not gate app features |

## Longer-term exploration: platform and commercial model

Saved at Joanne's request, 8 November 2026. These are separate research
questions, with no commitment to migrate, introduce charges or change licensing.
They do not gate the current candidate's UAT or a possible 2.0 public release.
Calling the current product milestone 2.0 would not commit it to a Rust port,
new licence or paid edition.

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
  browser edition are not current Sightline features. The optional Demo mode
  track above is a future proposal, not a delivered capture/editing capability.
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

## Completed and preview reference

This section records delivered work and candidate history. It does not set
development priority. Earlier RC descriptions describe those builds; use the
[cumulative 1.3.0 notes](docs/RELEASE-1.3.0.md) for superseding corrections and
the [current feature grid](docs/FEATURE-GRID.md) for the RC14 reference.
[Earlier roadmaps](docs/ROADMAP-HISTORY.md) remain archived.

### Published on Elgato Marketplace

- [x] **9 November 2026: Stream Deck plugin 0.2 published.**
  [Open the Marketplace listing](https://marketplace.elgato.com/product/sightline-prompter-34676f28-e2e5-422d-9b48-e03dfd80bebe).
  This is the released 0.2.0 companion; Elgato displays its version as 0.2.
  Direct downloads remain available. Newer 0.2.1 candidate builds require
  their own validation and submission; they are not part of this publication.

### Shipped in 1.2.0

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
[current feature grid](docs/FEATURE-GRID.md) for exact behaviour and limits.

### In 1.3.0 preview

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

### Additional candidate delivery notes

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

### Candidate acceptance register

These implementation details remain available for acceptance and investigation.
They are not queued again as new features. Platform and hardware findings can
still create release-blocking fixes.

| Topic | Implemented scope / follow-up | Acceptance evidence |
| --- | --- | --- |
| Toolbar utility layout — RC12 | Keep Help, Settings and window controls together at the top right with consistent alignment; fix narrow-window orphaning and wide-window offsets reported during RC11 UAT. See the [queued feedback](docs/uat/1.3.0-RC11-FEEDBACK.md). | Render actual narrow and wide layouts with full slider values, nine slots and session controls; check alignment, wrapping, clipping, keyboard access and auto-hide. Implemented in RC12; check the actual setup in UAT. |
| Editor exit label — RC12 | Show Close for a clean editor and Cancel while edits are unsaved, retaining discard confirmation. Return to Close after a successful save or Undo to the saved text. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#editor-close-and-cancel). | Cover clean/dirty/save/undo transitions, failed or cancelled saves, retained drafts, read-only samples and accessible labels. Implemented in RC12 with clean/dirty/Undo/save checks. |
| Dialog and Settings placement — RC12 | First open on the actual parent's monitor; subsequently restore each app-owned window's saved monitor, position and size. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#dialog-and-settings-window-placement). | Check independent window types, nested dialogs, all close routes, restart persistence, disconnected screens and scaling changes. Native dialogs retain OS-supported placement and correct ownership. Implemented in RC12; multi-monitor hardware UAT remains. |
| Contextual dialog voice actions — RC12 | While a Sightline dialog/instruction interaction already has attention, accept its enabled button labels without repeating the wake word; include Continue and Check again in audio checks. | Scope to the active window; preserve button handlers, confirmations and permissions; reject disabled/background/ambiguous actions and ordinary script speech. See the [queued feedback](docs/uat/1.3.0-RC11-FEEDBACK.md#speakable-dialog-actions-in-attention-mode). |
| Voice-check timing | Wait for speech before starting the sample; finish after sustained end of speech or ten seconds from onset. Keep room-tone sampling separate and quiet-level results advisory. | Delayed onset, breathing, silence, background noise, quiet voice, timeout and command-free retry samples; consistent preparation/script checks and real microphone UAT. Implemented in RC12; multi-monitor hardware UAT remains. |
| Sightline wake word | Add Sightline as a selectable wake word, retaining the current selection and the existing command set. | Selected-word and split-result tests, settings persistence, consistent help/listening labels, product-name narration guards and real microphone UAT. See the [next-RC queue](docs/uat/1.3.0-RC11-FEEDBACK.md#sightline-wake-word). |
| Microphone level stability | Prepared explicit AGC-off speech/wake capture and selected-mic test metering for the next candidate; included in RC12. | Fake-device default/selected/fallback/permission tests pass. Verify applied stream settings and actual Windows input level alongside other audio apps; the reported 71-to-62 change is not yet attributed. |
| Heading-aligned section starts | Source correction prepared: automatic Voice advance, Go and restored boundary targets honour Start from section heading. Native checks pass with the option on and off; included in RC12; earlier packages stay frozen. | Check heading/body positioning across start, navigation, soft boundaries, quick-edit resume and Retake, with correct take identity. See the [RC11 feedback queue](docs/uat/1.3.0-RC11-FEEDBACK.md#align-section-starts-to-the-heading). |
| Stream Deck companion 0.2.1 | Candidate 0.2.1.7 includes Virtual/device profiles, shared icons, grouped controls and optional Call overlay imports. Published 0.2.0 actions and existing profiles remain compatible. | Physical import/key/dial checks, full layout visibility, retained profiles and OBS permission/hold checks remain part of acceptance. See the [compatibility contract](docs/CONTROLLER-COMPATIBILITY.md). |
| Quick script edits — RC11 candidate | Implemented paused paragraph Save/Cancel, visible breaks, source persistence and refreshed tracking. Ctrl+E retains the full editor. | Native checks cover source preservation, external conflicts, duplicates, read-only samples, playback gates and held Voice resume. Human microphone UAT remains. |
| Framing | Gather feedback on target/crop consistency, movement advice and native toolbar stacking on real multi-screen setups | Camera/projector tests across Windows, Mac and Linux; preserve manual fallback |
| Documentation | Keep current screenshots, topic-based notes, samples, feature grid and JL copy in the same deployment review | Versioned source, checked links and exported-file consistency |
