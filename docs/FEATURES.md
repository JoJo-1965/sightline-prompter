# Sightline Prompter: what it adds to Electron Teleprompter

**Release-candidate status, 30 October 2026:** the Windows 1.0.7 candidate
contains the OBS integration (52), head guide (55), production exports,
voice tuning and Settings/help updates described below. The matching private
Stream Deck plugin is 0.1.8 (39). These features are built and awaiting final
acceptance; the published release remains 1.0.6. RC2 refreshes RC1's bundled
documentation and acceptance samples. See the
[test walkthrough](guide/14-acceptance-test.md) and [roadmap](../ROADMAP.md).

**Development navigation:** five Settings groups with focused subtabs, a Files
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

The development guide includes [From recording to the editor](guide/12-production-handover.md):
an illustrated session checklist covering setup, framing, a short test,
retakes, keeper choices and collecting the master files alongside each edit
pack. It is available offline through **Help > User Guide**.

The private Stream Deck companion test build **0.1.8** adds OBS Record take
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
  On air, speed, size, backing and explicit Steady/Voice switching. Tools,
  Settings and Help stay reachable on narrow windows.
- **Files menu (☰)** for scripts, recordings, edit packs, settings-file
  import/export and Quit, with shortcuts shown. Recording helpers and quick
  adjustments live under Tools.
- **Check for updates** on Settings > About, and a quiet check at start-up
  (can be turned off). Nothing downloads by itself.
- **Settings in five groups:** Prompting, Appearance, Recording, Controls and
  About, with focused subtabs and shared live controls. File operations stay
  in Files; settings still import/export as JSON or XML.
- **Layout and Voice panels** for changes while the script runs. Drag them,
  or Settings, by the title to anywhere in the window.
- **Settings** with **Apply** (save and stay) and a prompt before closing with
  unsaved changes; **Quit Sightline** always at the foot of the ☰ menu; and a
  **check for updates** on Settings > About.
- **On air** on the control bar, mirror axes in **Tools > Spacing and mirror**,
  and quick panels for text/colour, take display and voice/microphone.
- **Floating button pad** that stays on top, even over the prompter, and flips
  with the mirror setting.
- **Phone remote:** scan a QR code and your phone gets big buttons, over your
  own Wi-Fi, protected by the code in the QR.
- **Control window** for a second screen: an upright, live copy of the script
  with big buttons. Click any line to move the prompter there. Its broadcast
  row sets the prompter's on air, text size, backing, mirroring, eye-line and
  voice or steady scrolling, and shows the sound-check meter, even during a take.
- **Presenter clickers that start and pause** as well as jump sections, **USB
  foot pedals** and **game controllers**.
- **Stream Deck plugin** (coming to the Elgato Marketplace): keys that light up
  to match the prompter (▶ or ❚❚, On air, the open slot, the time left), keys for scroll mode, the
  pad and the control window, every key ready for an AI on Stream Deck's MCP,
  dials on the Stream Deck + and the three-pedal Stream Deck Pedal, with a
  sample profile for every model. See
  [Remotes and second screens](guide/06-remotes-and-screens.md#stream-deck).
- A keyboard shortcuts panel (F1) and an About page.

## Recording setups

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
- Independent text opacity, background opacity and text brightness, margins
  that fade out at the edges, line spacing and alignment.

## Help and installers

- **Optional OBS integration** (1.0.7 candidate): **Settings > Recording > OBS connection**
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
