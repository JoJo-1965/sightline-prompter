# Sightline Prompter: what it adds to Electron Teleprompter

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
| Controls            | Keyboard shortcuts; arrow keys and a clicker jump between sections; microphone choice | Control bar, ☰ menu, six-tab Settings, nine script slots, floating pad, phone remote, control window, clickers that start and pause, pedals, game controllers |
| Recording rigs      | Mirror (flip) mode                                                                    | Mirroring in any direction, prompter monitor (Elgato Prompter), eye-line mode, beam-splitter setup, hide from screen capture, click-through                    |
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
  and end, retakes, markers, rating and (in voice mode) when each word was
  said, and picks the take to use for each
  section, as JSON for an editing agent and CSV for a spreadsheet.
- **Coming next** ([roadmap](../ROADMAP.md)): an edit pack an editing agent
  can assemble from, with edit marks and captions; `{listen: off}` and
  `{prompter: …}` so the script can direct the microphone and the prompter;
  and a recordings library an agent can list and fetch from.

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
  end of what you say, so a script line about "the prompter" never sets one
  off. Common mishearings are matched too. Optionally, commands also work
  during steady scrolling.
- **Stops and countdowns honoured in voice mode:** the prompter holds at a
  `{stop}` until you say "Prompter, go", and counts down a `{pause: 5s}`.
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
  that runs down. The mic listens for "Prompter, go" at a stop.
- **Markers:** `{marker}` in the script, or press B during a take; Ctrl+B
  jumps between them.
- **Slate and sync mark:** a white flash and a beep at the start of each
  take, then the section and take number, so the edit can line every take up
  with the recording; no clap needed (Settings > Scrolling).
- **Take log for the edit:** every take of every section, with its start and
  end, whether it was read to the end or retaken, and its markers, saved as
  you go and exported as JSON and CSV (File > Export Take Log). Say
  **"Prompter, keeper"** or **"Prompter, scrap that"** (or press K or
  Shift+K) to rate a take; the log picks the take to use for each section.
  In voice mode it also records **when you said each word**, for cutting on
  words and sentences.
- **Edit pack** (File > Export Edit Pack): the take log, word timings,
  sentences, edit marks (sentence starts, pauses, re-reads, skipped words)
  and captions in the script's own wording, in one folder with a brief for
  AI editing agents.
- **Talking points** for speaking off script: one section at a time as large
  bullet points, with a talk timer.
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

- **Control bar** that hides while you read: open, save, edit, the nine slots,
  start, and Speed, Size and Backing, each with a number box you can type into.
- **☰ menu** grouped into Script, Playback, Display, Window, Settings and Help,
  with shortcuts shown.
- **Settings in nine tabs:** Scrolling, Voice, Display, Layout, Reading,
  Recording, Files, Remotes and About, all the same height. Save and load all
  settings as JSON or XML.
- **Layout and Voice panels** for changes while the script runs.
- **On air** and **Mirror** buttons on the control bar, and the Layout
  panel in three views (Layout, Reading, Recording).
- **Floating button pad** that stays on top, even over the prompter, and flips
  with the mirror setting.
- **Phone remote:** scan a QR code and your phone gets big buttons, over your
  own Wi-Fi, protected by the code in the QR.
- **Control window** for a second screen: an upright, live copy of the script
  with big buttons. Click any line to move the prompter there.
- **Presenter clickers that start and pause** as well as jump sections, **USB
  foot pedals** and **game controllers**.
- A keyboard shortcuts panel (F1) and an About page.

## Recording setups

- **Mirroring** horizontally, vertically or both (the original flipped
  horizontally), with the whole display, controls included, mirrored so it all
  reads correctly in the glass.
- **Prompter monitor:** choose a monitor (the Elgato Prompter shows up by name)
  and the prompter opens full screen there every time.
- **Eye-line mode:** a narrow strip right under the webcam.
- **Beam-splitter setup** in one click: black background, dimmed text and
  mirroring.
- **Hide from screen sharing and recordings**, and **click-through** so clicks
  reach the app behind (Ctrl+Shift+X from anywhere).
- Windows that stay reachable when a monitor is unplugged or the resolution
  changes.

## Reading and accessibility

- Sentence highlight, a **focus band** that dims the lines away from the
  reading line, and a **text edge** for reading over busy backgrounds.
- **Colour themes:** standard, yellow on dark, high contrast and soft cream.
- **Fonts** including Atkinson Hyperlegible, OpenDyslexic and Verdana.
- Independent text opacity, background opacity and text brightness, margins
  that fade out at the edges, line spacing and alignment.

## Help and installers

- **User guide** with screenshots, built into the app (Shift+F1) and on GitHub.
- **Installers** for Windows, macOS (Apple silicon and Intel) and Linux
  (AppImage and .deb), built on GitHub for every release.
- Your Electron Teleprompter settings, slots and scripts are copied across the
  first time Sightline starts.
