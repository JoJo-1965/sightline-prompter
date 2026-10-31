# Sightline Prompter: what it adds to Electron Teleprompter

**Release-candidate status, 31 October 2026:** the Windows 1.1.0 candidate
contains the OBS integration (52), head guide (55), production exports,
voice tuning and Settings/help updates described below. The matching private
Stream Deck plugin is 0.1.9 (39). These features are built and awaiting final
acceptance; the published release remains 1.0.6. RC2 refreshes RC1's bundled
documentation and acceptance samples. RC3 adds a local version handshake,
required/recommended versions and capability guards, shown in Settings >
Controls > Stream Deck and the plugin's Test connection. Unreported legacy
versions are unconfirmed, not assumed current. See the
[test walkthrough](guide/14-acceptance-test.md) and [roadmap](../ROADMAP.md).

**Development navigation:** seven Settings groups with focused subtabs, a Files
menu for input/output and a Tools menu for live recording and operator tools.
Duplicate file operations and Display preferences have been removed from
Settings. The top bar keeps live controls and Steady/Voice switching; native
menus retain standard platform access. Keyboard tab navigation, visible focus,
modal focus containment and focus return are covered by app checks. Settings
keeps a consistent width and height without scrolling: longer topics and word lists use labelled
Previous/Next pages. Small raised ? pills beside options support hover,
keyboard and touch, with Escape to dismiss. Appearance separates Text,
Background, Reading aids, Spacing and Screens. Immediate-save controls are
labelled; pending changes show Unsaved changes, with Apply and Save & close.
See the
[Settings map](guide/07-settings.md).

The next batch also includes **Components**: offline model and AI kit
status, Install/Reinstall/Remove, and a separate Node.js availability check.
The kit runs without cloning the repository or installing npm dependencies.
Components also detects optional OBS/Stream Deck applications and the Sightline
plugin manifest, with official installer links and a portable/custom **Locate**
option. Missing dependencies have grey controls and visible explanations;
preferences are retained. Local kit-command readiness stays separate from
general API access. Remote OBS needs no local installation, and live plugin
compatibility is checked separately from installed files.
**Controls > Buttons & keys** learns controller buttons and local keyboard
inputs from clickers/pedals, with the pad's action choices, duplicate-input
replacement, immediate saving, three-entry pages and reset. Held/reconnected
buttons do not repeat; typing, editing and Settings suspend actions. Plain
keys and Shift combinations can be assigned; system shortcuts stay reserved.
These additions are source changes for review, absent from installed RC14.

The setup/session workflow (58) separates occasional configuration from live
recording: first-use **Getting started**, reopenable from Help; **Tools >
Session check** before recording; named Components subtabs and top-level Debug.
OBS connection, recording and setup are together under Recording. Components
has no numbered overflow pages; the Settings frame remains stable.

**About > Restore defaults** offers a confirmed restart into onboarding with
shipped preferences. Layouts, shortcuts, slots, recent history and pairings
reset; integrations start off. Installed components/locations, script files,
recordings, scratch audio and service keys stay. It saves pending take data,
keeps a private local settings backup and blocks active recording, editing or
component maintenance. No OBS profiles or scenes are modified.

The optional [OBS setup assistant](guide/15-obs-setup.md) (59) reuses configured
camera/mic sources, offers a folder and 1080p/4K canvas, then shows a plan.
Only Create applies a separate profile and three scenes. It retains previous
setups, requires idle outputs and starts no recording. Actual capture mode,
encoder quality, clean camera/WAV and sync need a physical recording test.

The development guide includes [From recording to the editor](guide/12-production-handover.md):
an illustrated session checklist covering setup, framing, a short test,
retakes, keeper choices and collecting the master files alongside each edit
pack. It is available offline through **Help > User Guide**.

The private Stream Deck companion test build **0.1.9** includes OBS Record take
and Finish recording keys, confirmed-state feedback and optional recording
layouts for each model. The OBS development app enforces saved permissions
and waits for actual recording state changes. These additions are unreleased;
all five production requirements remain the publication gate.

The development app also has an optional recorded OBS slate: Prepare adds a
dedicated flash/tone source to the current scene, with acknowledgements and
estimated file-clock references in the edit pack. A cached transparent page
keeps the source blank after Sightline closes. Module changes flush the old
take and scratch WAV before loading the new script. A real two-module test
retained three takes under one OBS recording. Separate clean 4K camera and
PCM/WAV outputs passed; physical camera lip sync remains unvalidated.

On the development branch, the head guide also has labelled **Ideal position**
and **Actual position** outlines. Drag, nudge or scale the actual outline
against a saved ideal, and recall Centre or Beside panel window placements.
This is a manual reference check. Both poses persist between scripts and
are saved with new takes. Help uses tabs and follows enabled modes; voice
commands **guide on** and **guide off** set the guide's visibility explicitly.

The prompter's **Guide adjustments** button and **Tools > Guide adjustments…**
toggle a separate control window, including while the guide is fullscreen,
Clean or click-through locked. Set eye centre/level, lock the eyes, then fit
Top/Bottom and Left/Right independently. A **Background** slider dims the
preview behind the guide (0–80%, initially 12%); **Outline** controls line
opacity separately, and the dashed Ideal reference is brighter. Shape and
background settings persist between scripts and in the edit-pack snapshots.

**In development:** a floating head-position guide for camera framing, with
an eye line, head/shoulder outline, adjustable size/opacity/colour, saved
placement, click-through lock, global Ctrl+Shift+H hotkey and Stream Deck
OFF/ON/LOCK action. Separate from OBS scenes; capture protection stays on.

It also fills its monitor as a borderless overlay, with hidden controls and
window-size restore (Ctrl+Alt+H or the fullscreen Stream Deck action). Intended
order: OBS projector, head guide, then prompter text. Actual projector stacking
and other screen-capture methods remain to be checked; the camera-source
recording route excluded the guide in the workstation test.

Sightline Prompter began as a fork of David Neal's
[Electron Teleprompter](https://github.com/reverentgeek/electron-teleprompter)
(version 4.1.20): a see-through, always-on-top teleprompter with a built-in
Markdown editor, section jumps from the arrow keys or a clicker, a mirror
mode, and scrolling that followed your voice through Deepgram. Thank you,
David.

Sightline keeps that heart and rebuilds almost everything around it into a
teleprompter that works with your AI, for content creators and learning and
development teams recording to camera at a desk or in a studio, on Windows,
macOS and Linux. Your AI writes the script and its directions, Sightline
follows your voice through the take, and the take log goes back to your AI
for the edit.

Sightline doesn't record video or audio, and isn't meant to replace OBS,
Riverside, Zoom or your camera. It sits alongside them and gathers what they
can't: accurate timings for every take, section and word, retakes, markers
and ratings, and a slate to line them up with the recording.

This page lists what's new. The [change log](../readme.md#change-log) has the
details, and the [user guide](guide/README.md) shows every screen.

**At a glance**

|                     | Electron Teleprompter 4.1.20                                                          | Sightline Prompter 1.0                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI                  |                                                                                       | **AI writes the script and its directions, can run the prompter, and gets the take log for the edit**                                                                                         |
| Scrolling           | Follows your voice (Deepgram, with your own key)                                      | Follows your voice **on your own computer**, free and offline, or steady at a set pace                                                                         |
| Voice control       |                                                                                       | "Prompter, pause", go, slower, again, resync and more                                                                                                          |
| Script formats      | Markdown and HTML, with a built-in Markdown editor                                    | Adds plain text, Word, rich text, **PDF** and **Google Docs links**                                                                                            |
| Script instructions |                                                                                       | Stops, countdowns, markers, pace and target times in `{curly braces}`; notes in `[brackets]`                                                                   |
| Pacing and takes | | Pacing light, section targets, take summary, rehearsal timer, and a **take log** for the edit with keeper and scrap ratings |
| Controls | Keyboard shortcuts; arrow keys and a clicker jump between sections; microphone choice | Live control bar, Files menu, recording Tools, grouped Settings with focused subtabs, nine slots, pad, phone remote, operator window, controllers and Stream Deck |
| Recording rigs      | Mirror (flip) mode                                                                    | Mirroring in any direction, prompter monitor (Elgato Prompter), eye-line mode, one-click mirroring, hide from screen capture, click-through                    |
| Reading aids        | Background opacity and font size                                                      | Sentence highlight, focus band, text edge, colour themes, Atkinson Hyperlegible and OpenDyslexic                                                               |
| Help                | Readme; recently opened files                                                         | Built-in user guide with screenshots, sample scripts, shortcuts panel                                                                                          |
| Installers          | Build from source                                                                     | Windows, macOS (Apple silicon and Intel) and Linux, built on GitHub                                                                                            |

## AI-assisted production

The whole workflow is in the guide:
[Working with AI](guide/09-working-with-ai.md).

- **Write:** Help > Copy the AI Script Prompt puts instructions for ChatGPT,
  Claude, Gemini or Copilot on the clipboard. The scripts they write come with
  sections, target times, stops, countdowns, markers and notes to the speaker
  ([AI-SCRIPT-BRIEF.md](AI-SCRIPT-BRIEF.md)). Draft in Google Docs, Word or
  PDF and open it as it is.
- **Check:** directives Sightline doesn't recognise are marked ⚠ on screen,
  and the command-line checker (`npm run check-script`) reports unknown
  directives, bad values and sections without a target, so an AI pipeline can
  fix a script before you see it.
- **Record:** an optional local API lets an AI agent on your own computer
  write a script into a slot, start, pause, jump sections, change speed, drop
  markers and rate takes as keeper or scrap. Off by default, token-protected
  and closed to web pages.
- **Edit:** the take log records every take of every section, with its start
  and end, retakes, markers, rating, pace and (in voice mode) when each word
  was said, and picks the take to use for each section. The **edit pack**
  turns it into what an editing agent cuts with: words, sentences, edit marks
  and captions.
- **Recordings library** (File > Recordings): every session to name, note,
  mark as edited, export as a folder or zip, or delete; an agent can list
  them and fetch any edit pack through the local API.
- **The script directs the prompter:** `{listen: off}` before an ad-lib, a demo
  or questions mutes the microphone and holds until you carry on from
  `{listen: on}`, and the edit pack marks the time off script;
  `{prompter: slower}` (or faster, bigger, smaller, marker) runs a command at
  that point.

## Voice

- **Speech recognition on your own computer** (sherpa-onnx, streaming
  Zipformer): free, private and offline after a one-off 73 MB download.
  Nothing you say leaves the PC. On a real 9-minute take with retakes it kept
  the prompter on the reader's line 96% of the time. Deepgram stays as a
  choice.
- **Words arrive while you speak**, not at the next pause, so the scroll keeps
  up with fast delivery, ad-libs and re-reads.
- **"Prompter, …" voice commands:** pause, go, slower, faster, back, next
  section, from the top, again (marker and retake), marker, resync (finds your
  place anywhere in the script), bigger and smaller. Commands only count at the
  end of what you say. Choose a wake word your scripts don't use as an
  instruction. Known mishearings and taught synonyms work; loose spelling
  guesses do not. Recording and guide states require explicit phrases.
  Optionally, commands also work during steady scrolling.
- **It answers you:** saying the wake word shows *Listening…* straight away,
  *Didn't catch that* if what follows isn't a command, and "what can I say"
  shows every command on the prompter. **Choose the wake word:** Prompter,
  Computer, Teleprompter or Director.
- **Say "Section 3"** (a spoken slate) to go to that section, **"reset"** to
  go back to the top with the speed and clock reset, and **"back to the
  marker"** to read on from the last marker.
- **Heard log:** every word it heard, beside the script words it matched, to
  find words it keeps mishearing.
- **Your words** (Settings > Prompting > Voice): words that **sound alike** count as the
  script word ("marsha" for "Moshe") or the command ("prompta" for
  "Prompter"), and lists of script words and command words it mishears, as
  synonyms rather than replacements, with suggestions from the heard log and
  **Teach…** (say it, and it adds what it hears).
- **Stops honoured in voice mode:** the prompter holds at a `{stop}` until
  you say "Prompter, go". A countdown, `{pause: 5s}`, shows as a **⏸ 5s** mark
  instead: you take the beat yourself.
- **Highlights the sentence you're about to say.**
- A live microphone level meter and a responsiveness setting.

## Scrolling and pacing

- **Rehearsal coach, next candidate:** saved-take pace, sentence alignment
  coverage, lines outside the matched reading range and logged rereads.
  Optional recognised filler/repetition counts default off and collect only
  during active voice following. No extra mic listener, transcript or audio.
  Recognition errors and deliberate wording can affect the results; the
  coach does not score speakers or change keeper choices. Available in the
  take summary, Tools, Recordings, CLI/API and additive edit-pack report.

- **Steady scrolling** at a set words per minute, with ↑ and ↓ to adjust it on
  the fly, and a countdown before it starts.
- **Section targets** (`{target: 1:20}` or `{wpm: 140}`) set the pace section
  by section; a single take can be paced to finish on time.
- **Pacing light:** green, amber or red, with "On track", "Ahead 5 s" or
  "Behind 8 s".
- **Take summary** after each run, and a **rehearsal timer** that writes your
  practice times back into the script as targets.
- **Stops and countdowns:** `{stop}` waits for "Prompter, go", Space or a
  clicker, with a yellow label; `{pause: 5s}` shows a blue countdown with a bar
  that runs down (in voice mode, a mark instead). The mic listens for
  "Prompter, go" at a stop.
- **Markers:** `{marker}` in the script, or press B during a take; Ctrl+B
  jumps between them. Name one, `{marker: Setup}`, and the name goes into the
  take log and edit pack. **Shift+B** goes back to the last marker to read on,
  logged as a restart so the edit can cut to the second reading.
- **Slate and sync mark:** a white flash and a beep at the start of each
  take, then the section and take number, so the edit can line every take up
  with the recording; no clap needed (Settings > Recording > Audio).
- **Take log for the edit:** every take of every section, with its start and
  end, whether it was read to the end or retaken, and its markers, saved as
  you go and kept in **File > Recordings**, to name, note and export. Say
  **"Prompter, keeper"** or **"Prompter, scrap that"** (or press K or
  Shift+K) to rate a take; the log picks the take to use for each section.
  In voice mode it also records **when you said each word** and each take's
  **pace** (words, speaking time, words per minute against the target), for
  cutting on words and sentences and setting targets from a rehearsal.
- **Skills for AI agents:** `sightline-script` and `sightline-session` for
  Claude Code and Codex, a `sightline` command for driving the app, and setup
  steps for ChatGPT, Claude and Gemini ([Setting up your AI](guide/10-setting-up-your-ai.md)).
- **Edit pack** (File > Export Edit Pack): the take log, word timings,
  sentences, edit marks (sentence starts, pauses, re-reads, skipped words)
  and captions in the script's own wording, in one folder with a brief for
  AI editing agents.
- **Sound-check meter** (Ctrl+Shift+D, or Sound check in the Voice panel):
  the mic's level, peak, clip light, loudness in LUFS and the room's
  background noise, at the edge of the prompter.
- **Sound checks in the script:** `{soundcheck: room}` and
  `{soundcheck: voice}` check the room's background noise and your level
  before you start, say how far to turn the gain, and keep the results with
  the session.
- **Loudness for each take** (Settings > Recording > Audio): each take's loudness,
  peak and background noise in the take log and edit pack, with a warning as
  it ends if it clipped, was very quiet or had a noisy room.
- **Scratch audio for syncing** (Settings > Recording > Audio): a plain microphone
  recording while the prompter runs, placed on the take log's clock, so an
  editor can line the real recording up by matching soundtracks, with no
  slate needed.
- **Notes** for speaking from notes: a page at a time, never scrolled. A
  `# heading` or `{page}` starts a page and each `## heading` is a bullet, with
  a page timer against each page's `{target}`.
- A progress bar you can click or drag to jump through the script, with
  section ticks and a tip showing the section and time at each point.
- Progress bar, time left, an ON AIR light and an optional end-of-countdown
  beep.

## Scripts

- **Script health, next candidate:** editor button and Tools review window.
  Uses current unsaved text, with per-section word/time estimates, section
  pace/targets, timed-pause information, long-sentence prompts and similar
  word starts to try aloud. Spoken quoted directions count; headings,
  unspoken directions, code and commands do not. Nothing rewrites the script.

- Opens **Word, rich text, plain text, PDF and Google Docs links** as well as
  Markdown and HTML. PDFs have their paragraphs and headings rebuilt; Google
  Docs are fetched afresh each time they open.
- **Notes to the speaker** in `[square brackets]` are dimmed, with any
  "quoted words" inside them kept bright.
- **Script directives** in `{curly braces}` are hidden while you read, or shown
  as tags for checking, with ⚠ on typos. See
  [SCRIPT-DIRECTIVES.md](SCRIPT-DIRECTIVES.md).
- **Nine script slots** (the numbered buttons, or Ctrl+1 to 9), each
  remembering its place, even after a restart.
- Drag and drop, built-in sample scripts, and slide-cue phrases from a
  `cues.yaml` file.
- **Script checker** on the command line (`npm run check-script`), for AI
  script pipelines.

## Controls

- **Control bar** that hides while you read: nine slots, restart, play/pause,
  On air, speed, size, backing, independent mirror-axis icons and explicit Steady/Voice switching. Tools,
  Settings and Help stay reachable on narrow windows.
- **Edit beside Tools** for direct script/source access; the Tools dropdown
  follows its toolbar button and stays within the window edges, including
  mirrored views.
- **Movable Settings and Help windows:** drag their native title bars across
  screens; each remembers its position and size and stays upright when the
  prompter is mirrored. Settings keeps a stable frame with pages instead of
  scrolling. Apply stays open; Save & close, Cancel and native Close preserve
  the existing draft checks. Quitting with a Settings draft asks before
  discarding it. Opening the same window again keeps the draft and brings it
  forward. Both stay above the prompter and follow **Hide from capture**.
- **Movable voice-command help:** “Prompter, what can I say?” opens a separate
  window with a draggable title bar, saved geometry and stable grouped tabs.
- **Mirroring in one Settings topic:** **Appearance > Screens** holds both
  beam-splitter toggles. The toolbar mirrors stay available and in sync.
- **OBS connection, recording and setup together under Recording:** recorded-slate
  preparation shows prerequisites, progress, readiness and errors in Settings.
- **Clear OBS button states:** dark controls with readable enabled/disabled
  labels and a visible focus outline. Settings and help stay above their
  prompter owner, including fullscreen.
- **Visible slider labels:** Speed/Response, Text size and Background remain
  identifiable at a glance. On-air BG identifies the background used on air;
  tooltips explain the controls.
- **Files menu (☰)** for scripts, recordings, edit packs, settings-file
  import/export, a labelled Settings entry and Quit, with shortcuts shown. Recording helpers and quick
  adjustments live under Tools.
- **Protected sample scripts:** inspect and copy their read-only source; Save a
  copy makes an editable version. Clearing any loaded slot asks for confirmation
  and leaves the saved script intact.
- **Stable keyboard and voice help:** grouped topics share a fixed frame;
  disabled-feature help stays hidden.
- **Check for updates** on Settings > About, and a quiet check at start-up
  (can be turned off). Nothing downloads by itself.
- **Settings in seven groups:** Prompting, Appearance, Recording, Controls,
  Components, Debug and About, with focused subtabs and shared live controls. File operations stay
  in Files; settings still import/export as JSON or XML.
- **Layout and Voice panels** for changes while the script runs. Drag them,
  or Settings, by the title to anywhere in the window.
- **Settings** with **Apply** (save and stay) and a prompt before closing with
  unsaved changes; **Quit Sightline** always at the foot of the ☰ menu; and a
  **check for updates** on Settings > About.
- **On air** on the control bar, mirror axes in **Tools > Spacing and mirror**,
  and quick panels for text/colour, take display and voice/microphone.
- **Floating button pad** that stays on top, even over the prompter, and flips
  with the mirror setting. Select up to 36 functions, drag or use Earlier/Later
  to reorder, choose columns and apply Compact, Reading or Studio presets.
  **Controls > Pad** and the pad's Customise button share one editor.
- **Phone remote:** scan a QR code and your phone gets big buttons, over your
  own Wi-Fi, protected by the code in the QR. It follows the pad's button
  selection and order with larger touch targets. Both reuse Stream Deck
  artwork and actions; hardware profiles stay independent.
  Development for 1.1.0-rc.1 adds a compact landscape layout: four or six columns
  with the same order, two rows for Studio, and browser-safe footer spacing.
  Taps have separate sending/accepted feedback, with clear refusal or missing
  acknowledgement states and no automatic command replay.
- **Session capture override:** Debug can temporarily permit every
  window, including the head guide, in screenshots and demo recordings.
  A persistent warning and phone notice show when it is active; turning it
  off restores the latest normal rules. Quitting resets it.
- **Listening recovery:** health checks restart interrupted capture or speech
  processing without moving the script or changing its hold. Silence and
  intentional listening-off do not cause restarts. Retries are bounded, with
  a manual Restart listening button and live state. Optional local word tracing
  lives in **Settings > Debug**, alongside support logs. It is off by
  default, independent of Debug mode, and warns about nearby conversation.
- **Control window** for a second screen: an upright, live copy of the script
  with big buttons. Click any line to move the prompter there. Its broadcast
  row sets the prompter's on air, text size, backing, mirroring, eye-line and
  voice or steady scrolling, and shows the sound-check meter, even during a take.
- **Presenter clickers that start and pause** as well as jump sections, **USB
  foot pedals** and **game controllers**.
- **Stream Deck plugin** (coming to the Elgato Marketplace): keys that light up
  to match the prompter (▶ or ❚❚, On air, the open slot, the time left), keys for scroll mode, the
  pad and the control window, descriptions and optional profiles for AI/MCP setup,
  dials on the Stream Deck + and the three-pedal Stream Deck Pedal, with a
  sample profile for every model. See
  [Remotes and second screens](guide/06-remotes-and-screens.md#stream-deck).
- **Stream Deck 0.2.0 development:** listening off/on or recovery, session
  status and detailed error help, optional hold-to-finish and guide dials for
  eye centre/level, independent edges, proportions and visibility levels.
  Eye lock fixes the reference while shaping. Two opt-in Guide profiles
  cover + and + XL. Existing buttons remain supported; new controls need
  the matching app capabilities and are not in the installed RC14/plugin 0.1.9.
- A keyboard shortcuts panel (F1) and an About page.
- **Windows installer reading options:** separate finish-page tick boxes open
  the release notes and Getting Started guide in your browser. Both are bundled,
  show the installed version and work offline; neither requires launching Sightline.

## Recording setups

- **Eye-anchored head fitting:** independent Actual width/height controls,
  an eye-position lock, saved Ideal proportions and additive guide dimensions
  in the edit pack. The guide stays a separate manual overlay.

- **Mirroring** horizontally, vertically or both (the original flipped
  horizontally), with the whole display, controls included, mirrored so it all
  reads correctly in the glass.
- **Prompter monitor:** choose a monitor (the Elgato Prompter shows up by name)
  and the prompter opens full screen there every time.
- **Eye-line mode:** a narrow strip right under the webcam.
- **Mirroring in one click:** ↔ and ↕ toggles in the Layout panel.
- **Hide from screen sharing and recordings**, and **click-through** so clicks
  reach the app behind (Ctrl+Shift+X from anywhere).
- Windows that stay reachable when a monitor is unplugged or the resolution
  changes.

## Reading and accessibility

- Sentence highlight, a **focus band** that dims the lines away from the
  reading line, and a **text edge** for reading over busy backgrounds.
- **Colour themes:** standard, yellow on dark, high contrast and soft cream.
- **Fonts** including Atkinson Hyperlegible, OpenDyslexic and Verdana, with a
  separate **heading font** and **heading size**, so big headings stay
  readable with a dyslexia font.
- **Delivery-comment styling:** square-bracket notes have independent size
  and colour in **Settings > Appearance > Text**, and follow Heading font.
  A Theme button restores their usual colour. Spoken quotations keep the
  script style; delivery notes remain outside tracking, word counts and timing.
- Independent text opacity, background opacity and text brightness, margins
  that fade out at the edges, line spacing and alignment.

## Help and installers

- **Optional OBS integration** (1.1.0 candidate): **Settings > Recording > OBS connection**
  and **OBS recording**,
  off by default; status-only or recording control; Record take and Finish
  recording from Sightline, its control window, phone and voice commands;
  optional recording chapters and file references in the take log.
  See [OBS setup](guide/11-obs.md). Does not change normal Play or On air.

- [Privacy, terms, accessibility and voluntary support](POLICIES.md), linked
  from About and the user guide, covering Sightline and its Stream Deck plugin.
- **User guide** with screenshots, built into the app (Shift+F1) and on GitHub.
- **Installers** for Windows, macOS (Apple silicon and Intel) and Linux
  (AppImage and .deb), built on GitHub for every release.
- Your Electron Teleprompter settings, slots and scripts are copied across the
  first time Sightline starts.
