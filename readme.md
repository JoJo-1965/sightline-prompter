# Sightline Prompter

**The teleprompter that works with your AI.** A free, open-source, see-through
desktop teleprompter for content creators and learning and development teams
who record to camera at a desk or in a studio. Your AI assistant writes the
script and its directions, Sightline follows your voice through the take, and
the take log goes back to your AI for the edit. Speech recognition runs on
your own computer. Windows, macOS and Linux.

**Sightline doesn't record your video or audio.** Keep recording with the
tools you already use (OBS, Riverside, Zoom, Teams, your camera or your
phone). Sightline sits alongside them and gathers what they can't: accurate
timings for every take, section and word, your retakes, markers and ratings,
and a slate to line them all up with the recording.

**[Download the latest release](https://github.com/JoJo-1965/sightline-prompter/releases/latest)** · [User guide](docs/guide/README.md) · [Working with AI](docs/guide/09-working-with-ai.md) · [Everything it adds](docs/FEATURES.md) · [joannelockwood.co.uk/sightline](https://joannelockwood.co.uk/sightline)

> **About Sightline Prompter.** This is a fork of
> [reverentgeek/electron-teleprompter](https://github.com/reverentgeek/electron-teleprompter),
> created by [David Neal](https://reverentgeek.com) and released under the MIT
> licence. Adapted and enhanced by Joanne Lockwood from SEE Change Happen Ltd.
> Everything from the original still works. See the [change log](#change-log)
> for the details, and **Help > About** in the app for credits.

## Built around AI for the content creators of today

| Step       | What your AI does                                                         | What Sightline does                                                                                        |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Write**  | Writes the script, with sections, target times, stops and countdowns      | **Help > Copy the AI Script Prompt** gives it the instructions, and a checker validates the result         |
| **Record** | Loads the script and runs the prompter through a local API, if you let it | Follows your voice, holds at every `{stop}`, counts down every `{pause: 3s}`, takes "Prompter, …" commands |
| **Edit**   | Reads the take log and chooses the takes                                  | Logs every take of every section, with retakes, markers and your keeper or scrap rating, as JSON and CSV   |

- **Scripts that direct the prompter.** The [AI Script Prompt](docs/AI-SCRIPT-BRIEF.md)
  works with ChatGPT, Claude, Gemini or Copilot. The script that comes back has
  `## sections`, `{target: 1:20}` pacing, `{stop}` before a demo, `{pause: 3s}`
  for a breath, `{marker}` for the edit and `[notes to you]`, all
  [documented](docs/SCRIPT-DIRECTIVES.md). Draft in Google Docs, Word or PDF
  and open it as it is.
- **An AI that can run the prompter.** Switch on the local API (Settings >
  Remotes) and an agent on your computer, such as Claude Code, can write a
  script into a slot, start, pause, jump sections, change speed, drop markers
  and rate takes. It's off by default, token-protected and closed to web
  pages.
- **A take log made for an editing agent.** Each take's start and end, whether
  it was read through or retaken, its markers and rating, and the take to use
  for each section.
- **Private by design.** Voice recognition runs offline on your own computer,
  so nothing you say is sent anywhere.

The whole workflow is in the guide: [Working with AI](docs/guide/09-working-with-ai.md).

**Coming next** ([roadmap](ROADMAP.md)): word-level timing and an "edit pack"
an editing agent can assemble a video from; `{listen: off}` and `{prompter: …}`
so the script can direct the microphone and the prompter; and a recordings
library that an agent can list and fetch from.

## Features

- **Follows your voice**, with speech recognition on your own computer (free
  and offline), or [Deepgram](https://deepgram.com/) if you prefer. The
  sentence you're about to say is highlighted
- **"Prompter, …" voice commands:** pause, go, slower, again (for a retake),
  keeper, scrap that, marker, resync and more
- **Or a steady pace** in words per minute, with section targets, a pacing
  light, a take summary and a rehearsal timer
- **Stops and countdowns** written into the script, and a **take log** for the
  edit
- Opens **Markdown, Word, rich text, plain text, PDF and Google Docs links**,
  with a built-in editor and live reload
- **Nine script slots**, a control bar and menu, six tabs of settings, a
  floating button pad, a phone remote, a control window for a second screen,
  clickers, pedals and game controllers
- **For real rigs:** mirroring for beam-splitter glass, full screen on a
  prompter monitor such as the Elgato Prompter, an eye-line mode, hiding from
  screen sharing and click-through
- **Reading aids:** a focus band, colour themes, and fonts including Atkinson
  Hyperlegible and OpenDyslexic
- A **user guide** with screenshots, built into the app

The full list, side by side with the original, is in [FEATURES.md](docs/FEATURES.md).

## Usage

**New to Sightline? Read the [user guide](docs/guide/README.md)**, with screenshots of every screen. It's also built into the app: Help > User Guide (Shift+F1). Coming from Electron Teleprompter? See [everything Sightline adds](docs/FEATURES.md).

Sightline Prompter can load any markdown and/or HTML syntax and display that as a translucent overlay on the screen. In this way you can load a script and still see your presentation, video conferencing, or any other applications through the script.

Use the File -> Open menu (or keyboard shortcut) to open a text file that contains markdown or HTML as a script.

### What is Markdown?

Markdown is a lightweight syntax for creating formatted documents. For example, headings use the <code>#</code> symbol.

```md
# This is a Main Heading
## This is a Secondary Heading
```

### Use H2 tags for navigation

Use H2 tags (`##` in markdown) to create both headings and navigation points in your script. Pressing the right arrow on your keyboard will jump the script to the next heading, left arrow to go back. You can also use a presentation remote/clicker (e.g. [Logitech presentation remotes](https://www.logitech.com/en-us/products/presenters.html)) to go navigate forward/back.

### Built-in Markdown Editor

Press `Cmd/Ctrl+E` to open the built-in editor, or `Cmd/Ctrl+N` to start a new script. The editor uses a dark theme with syntax highlighting for markdown, and the background becomes opaque so you can focus on writing.

You can freely toggle between the editor and the teleprompter preview with `Cmd/Ctrl+E` to see how your script looks — your changes are preserved as you switch back and forth. Save with `Cmd/Ctrl+S` or use `Cmd/Ctrl+Shift+S` to save as a new file. If you close the app or open a different file with unsaved changes, you'll be prompted to save first.

### Voice-Driven Auto-Scroll

The teleprompter can listen to you and scroll the script automatically as you speak. No keyboard, remote, or foot pedals required! Your speech is turned into words and matched against your script, so the prompter follows your real cadence and tolerates ad-libs and re-reads. The sentence you're about to say is lit up as you go.

Speech recognition runs **on this computer** by default, with the [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) streaming Zipformer English model: no account or key, it works offline, and nothing you say leaves the PC. [Deepgram](https://deepgram.com/) (online, with your own key) is still there as an option.

#### Setup

1. Open **Settings > Voice** (or click **Voice** in the control bar). With "On this computer" chosen, click **Download speech model**. It's a one-off download of about 73 MB.
2. To use Deepgram instead, choose it there and paste in a key from [console.deepgram.com](https://console.deepgram.com/). The key is stored locally in the app's state file and is never written to exported settings files.
3. Choose **Voice** as the scroll mode, and grant microphone access the first time you start.

#### Auto-Scroll Usage

- Press `Cmd/Ctrl+Shift+L` (or `Script > Toggle Auto-scroll`) to start listening. A green "Listening" pill appears in the top-right corner.
- Start reading your script. As you speak, the prompter smoothly scrolls to keep your current word about a third of the way down the screen.
- If you scroll manually (trackpad, arrow keys, page keys), auto-scroll yields to you for a few seconds before resuming.
- Press `Cmd/Ctrl+Shift+L` again, or click the indicator pill, to stop listening.

#### Adjusting the speed

Auto-scroll uses a smooth, critically-damped animation. If it feels too laggy or too snappy for your speaking style, tune it with:

| Shortcut             | Action                          |
| -------------------- | ------------------------------- |
| `Cmd/Ctrl+]`         | Increase auto-scroll speed      |
| `Cmd/Ctrl+[`         | Decrease auto-scroll speed      |
| `Cmd/Ctrl+\`         | Reset auto-scroll speed to 1×   |

The speed is persisted across sessions. Speed range is 0.25× to 4× in 0.1 steps.

#### Selecting a microphone

By default, auto-scroll uses your system's default audio input. To pick a specific microphone (e.g. a USB lavalier or a podcasting mic), open `Script > Select Microphone…` and choose one from the list. The selection is saved and reused on every subsequent auto-scroll session.

A few notes:

- Device names only appear after you've granted microphone access at least once. If the dropdown shows generic IDs, start auto-scroll once to grant access, then reopen the picker.
- Plugging or unplugging a mic while the picker is open refreshes the list automatically.
- If the previously selected mic is unavailable when auto-scroll starts (unplugged, disconnected hub, etc.), it falls back to the system default and briefly shows "Saved mic unavailable — using default" in the indicator. The saved selection is kept so it picks up automatically when you reconnect.
- A microphone change takes effect the next time you start auto-scroll; it does not interrupt an active session.

### Keyboard Shortcuts

#### Shortcuts for the managing the teleprompter overlay

| Shortcut              | Action                        |
| --------------------- | ----------------------------- |
| `Right Arrow`         | Jump to next section (H2)     |
| `Left Arrow`          | Jump to previous section (H2) |
| `Ctrl+Shift+P`        | Floating control pad on / off |
| `Ctrl+Shift+O`        | Control window (operator screen) on / off |
| `Up/Down Arrow`       | Scroll up/down                |
| `Cmd/Ctrl+Plus`       | Increase font size            |
| `Cmd/Ctrl+Minus`      | Decrease font size            |
| `Cmd/Ctrl+0`          | Reset font size to default    |
| `Cmd/Ctrl+M`          | Toggle mirror/flip mode       |
| `Cmd/Ctrl+Shift+Up`   | Increase background opacity   |
| `Cmd/Ctrl+Shift+Down` | Decrease background opacity   |
| `Cmd/Ctrl+Shift+0`    | Reset opacity to default      |

#### Shortcuts for managing the editor

| Shortcut              | Action                        |
| --------------------- | ----------------------------- |
| `Cmd/Ctrl+N`          | New file                      |
| `Cmd/Ctrl+O`          | Open a markdown/text file     |
| `Cmd/Ctrl+E`          | Toggle editor / preview       |
| `Cmd/Ctrl+S`          | Save (in editor mode)         |
| `Cmd/Ctrl+Shift+S`    | Save As (in editor mode)      |

#### Shortcuts for voice-driven auto-scroll

| Shortcut              | Action                        |
| --------------------- | ----------------------------- |
| `Cmd/Ctrl+Shift+L`    | Toggle auto-scroll            |
| `Cmd/Ctrl+]`          | Increase auto-scroll speed    |
| `Cmd/Ctrl+[`          | Decrease auto-scroll speed    |
| `Cmd/Ctrl+\`          | Reset auto-scroll speed       |

## More from Joanne Lockwood

| | |
| --- | --- |
| Speaker site | [joannelockwood.co.uk](https://joannelockwood.co.uk) |
| Book: Don't Be a D*ck | [ninetynineways.co.uk](https://ninetynineways.co.uk) |
| Inclusion Bites Podcast | [inclusionbites.co.uk](https://inclusionbites.co.uk) |
| Inclusion Bites Academy | [academy.inclusionbites.co.uk](https://academy.inclusionbites.co.uk) |
| Consulting: SEE Change Happen | [seechangehappen.co.uk](https://seechangehappen.co.uk) |
| The Trans Inclusion Toolkit | [thetransinclusiontoolkit.co.uk](https://thetransinclusiontoolkit.co.uk) |
| LGBTQ+ History | [lgbtq-history.info](https://lgbtq-history.info) |
| Connected Ecosystem | [connected-ecosystem.co.uk](https://connected-ecosystem.co.uk/) |

## Roadmap

Planned features and their order are in [ROADMAP.md](ROADMAP.md).

## Change log

### Next release

- **Mirror pills:** the Layout panel's Mirror dropdown and the **Beam-splitter setup** button are replaced by four pills in a row, in the Layout and Reading views: → not mirrored, ↔ left to right, ↕ top to bottom, ↔↕ both. The one in use is lit, and choosing one leaves the panel open. Beam-splitter setup only looked as if it changed the mirroring; for the same look, set Background to 100% and Text brightness to about 70%
- The dropdowns in the Layout panel and on Settings > Layout, Reading and Recording are all the same width, so they line up
- **Heading font** (Layout panel > Reading, and Settings > Reading): section headings and titles can use a different font from the text, for example Standard headings with OpenDyslexic text. **Same as the text** is the default
- **Heard log** (voice scrolling): every word the speech engine hears is logged next to the script words it was matched with, one file per script per day in the `heard-logs` folder, never leaving your computer. `node scripts/sightline.mjs heard` (or `node scripts/heard-report.mjs <file>`) lists the words heard in place of script words, most often first, to find mishearings worth correcting (roadmap 20, first part)
- **Move Settings and the panels:** drag Settings, the Layout panel or the Voice panel by its title to anywhere in the window, to see the script while you change things. Each opens where you left it; double-click the title to put it back
- **Say "Section 3" to go there:** a spoken slate such as "Section one" (with or without "Prompter") now takes you to the start of that section; saying the section you're already in counts as a retake. Before, the words were ignored, because the slate line is a note in the script
- **"Prompter, reset"** goes back to the top and also puts the speed back to normal and clears the pacing clock, for a fresh run. "From the top" still just goes back to the start

### 1.0.5 (28 October 2026)

- **Heading size** (Layout panel > Layout, and Settings > Layout): section headings grew with the text, so they got very big when you made the text larger. Now they have their own size, from 40% to 150% of their usual size next to the text

### 1.0.4 (28 October 2026)

- **Easier to find: the control pad and the control window** are now at the top of ☰ > Window (they were at the foot of ☰ > Playback), and Settings > Remotes has a tickbox for each
- **"Prompter, what can I say?"** (or "Prompter, help"): shows every voice command and what it does on the prompter, until your next command, a click, Esc or 15 seconds. It's in the F1 shortcuts too
- **"Prompter" is acknowledged straight away:** as soon as Sightline hears the wake word, a message says *Listening… go · pause · again · marker*, so you know it's ready for the command; if what follows isn't a command, *Didn't catch that* shows the words it heard. *Heard: "Prompter, go"* still confirms each command
- **Apply in Settings:** saves your changes and keeps Settings open; **Save** saves and closes. Closing with changes you haven't saved now asks first (Save, Discard or Keep editing), including when a button in Settings opens something else
- **Quit Sightline** at the foot of the ☰ menu, always in view (and at the end of ☰ > Window); the old "Close the teleprompter" item in ☰ > Help is gone
- The Voice panel's microphone hint no longer names a particular microphone

### 1.0.3 (28 October 2026)

- **Help for the AI and remote settings:** Settings > Remotes now says what an AI can do and has a **How to set up your AI** button, which opens a new user guide page, [Setting up your AI](docs/guide/10-setting-up-your-ai.md) (Claude Code, Codex, ChatGPT, Claude and Gemini, and every AI and remote control setting). The guide also covers game controllers, and its links to the readme and roadmap open on GitHub instead of going back to the contents
- **Check for updates** (Settings > About): says whether there's a newer release, with a link to what's new and the download. Sightline also checks quietly when it starts and shows a small note if there is one; untick **Check for updates when Sightline starts** to stop that. Nothing downloads or installs by itself (roadmap 38)
- **Clickable progress bar:** point at the bar along the bottom to see the section and time at that place, click to jump there, or drag along it; white ticks mark where each section starts. Clicks are ignored while the prompter runs, so pause first (roadmap 37)
- **Sightline doesn't record your video or audio**, and now says so up front (readme, guide, feature list): it works alongside OBS, Riverside, Zoom or your camera, and gathers the timings to line up with the recording
- **Skills for Claude Code and Codex, and a setup guide for every AI** ([Setting up your AI](docs/guide/10-setting-up-your-ai.md), also in the app's user guide): `skills/sightline-script` writes and checks scripts to the Sightline spec; `skills/sightline-session` loads scripts into slots, controls the prompter, and builds and uses the edit pack. They use a new command, `node scripts/sightline.mjs` (status, open, load, slot, command, logs, takelog, pack), which reads the API token itself and never prints it. ChatGPT, Claude and Gemini projects get steps for writing and for editing from uploaded files
- **Edit pack** (File > Export Edit Pack…, also ☰ > Playback): the take log turned into what an editor or an AI editing agent cuts with, in one new folder: every word you said with its start and end, every sentence of every take (with any words you missed), edit marks (sentence starts, long pauses, re-reads, skipped words, markers), and captions in your script's own wording as SRT and VTT, with a README brief for editing agents ([docs/EDIT-PACK.md](docs/EDIT-PACK.md)). The take log now also notes each re-read and keeps each take's sentences. Words and captions come from voice mode (roadmap 26)
- **Export the take log…** in the ☰ menu, and the **Export take log…** button in the take summary, now work. Before, only File > Export Take Log did
- **On air is the see-through one now:** off air, the prompter is an ordinary solid window (Backing 100% to start with); on air (scrolling, held at a stop, or the On air button lit) the backing goes almost clear (Background on air, 7% to start with), so you can see your slides or the call behind the words while you read. 1.0.2 had it the other way round. Levels you've already set are kept

### 1.0.2 (28 October 2026)

- **On air button** on the control bar, next to ▶ (**Ctrl+Shift+A**, also ☰ > Playback): go on air by hand, for a talk to camera or to check the look. It lights red whenever you're on air, scrolling included, and the control bar slides away as quickly as it does while scrolling
- **Two backing levels, off air and on air:** Backing is the level while you set up; **Background on air** (90% to start with) takes over while scrolling, held at a stop, or with the On air button lit, so you can see the room through the glass while you set up and read easily while you record. The control bar's Backing slider and **Ctrl+Shift+↑ / ↓** adjust whichever level is in use (the slider reads **On air** while you are), and both are also in the Layout panel > Reading and Settings > Reading
- **The control bar fits any window from about 640 pixels wide.** With the new buttons it ran off the right edge of narrower windows (in a 1280-pixel window, Help, Settings and the window buttons were cut off). Now, as the window narrows, the bar drops the units, then the slider labels, then the number boxes (On air becomes a red record dot), then Edit, Save and Settings, then the empty slots, and last Reading, Recording and Mirror. The sliders stay in every width (they used to vanish below 1150 pixels)
- **Mirror button** on the control bar: steps through off, ↔ horizontal, ↕ vertical and ↔↕ both, and shows which is on (same as **Ctrl+M**)
- **Reading** and **Recording** buttons on the control bar, and **Reading** and **Recording** tabs in Settings: the long Layout panel is now three shorter views, so nothing sits below the fold
- **One Sightline at a time:** starting it again (from the Start menu, a shortcut or the command line) brings the open one to the front instead of opening a second copy, which could overwrite the first one's settings and take log
- **Settings > About**, a new last tab: the version, credits and links, with buttons for the full About page and the user guide. It replaces the line at the foot of every tab
- Settings stays the same height on every tab, so it no longer jumps as you switch
- The arrows on the number boxes are drawn, not typed, so they keep their size at any Windows display scaling (the down arrow could vanish at 125% or 150%, on Settings > Layout)
- The speed box has room for "wpm"
- Click-through's shortcut sits beside its name in the Recording view, so the hint fits on one line
- The reading-line arrow points at the middle of the line you're reading, in any font and size (it pointed at the top of the words)
- Running from source shows the Sightline icon, not Electron's
- **Word timings in the take log** (voice mode): every take now records when you said each word of the script, from the speech engine's own timings (so a word is placed when it was said, not when it was recognised a moment later), on the same clock as the take times and the slate. A phrase read again replaces the first reading. They're in the exported JSON, for an editing assistant to cut on words and sentences (roadmap 26, first part)
- **No scroll bar on the script**, in the prompter or the control window. The progress bar and time left show where you are; the mouse wheel, arrow keys, sections and clicking a line in the control window still move it
- **Working with AI**, a new page in the user guide (Help > User Guide): how your AI writes the script and its directions, runs the prompter through the local API, and takes the take log for the edit. The readme, feature list and Help > About now lead with it
- Help > About lists one feature per line, and text in the menus, panels and dialogs no longer leaves a single word hanging on the last line
- **Slate and sync mark** (Settings > Scrolling, "Slate at the start of each take"): before each take the screen flashes white and beeps, then shows the section and take number for a second. The take log records when each slate went off (the first is time 0), so every take can be lined up with the recording; no clap needed. It shows when you start scrolling, carry on from a `{stop}`, start voice scrolling, or say "Prompter, again". Choose flash and beep, flash only, or off (the default)
- Two pauses on one line, such as a countdown and then a `{stop}`, now both count. Before, the second was skipped
- A take that ends at a `{stop}` now ends where you stopped reading, not when you carried on

### 1.0.1 (28 October 2026)

- **Take log for the edit** (File > Export Take Log): every take of every section is logged as you record, with its start and end times, whether you read it to the end or went back for a retake ("Prompter, again" or ←), and its markers. Say **"Prompter, keeper"** or **"Prompter, scrap that"** (or press **K** or **Shift+K**) to rate the take you're on or have just finished; the log picks the take to use for each section (the last keeper, else the last complete take not scrapped). It's saved as you go, one per script per day, and exports as JSON for edit tools with a CSV beside it. The take summary shows the takes and keepers so far
- **Floating chevrons instead of scroll bars** in Settings, the Layout and Voice panels, the ☰ menu and Help, as in the About box: a small ▲ or ▼ appears at the edge only when there's more to see. In Settings they sit inside the pinned title and tabs and the Save and Cancel row
- **What Sightline adds**, side by side with Electron Teleprompter 4.1.20: [docs/FEATURES.md](docs/FEATURES.md)

### 1.0.0 (27 October 2026), based on Electron Teleprompter 4.1.20

The first Sightline Prompter release. Your settings, slots and saved scripts
from Electron Teleprompter are copied across automatically the first time it
starts. Earlier version numbers belong to the original project.

**Scrolling and playback**

- Steady scrolling at a set words per minute, alongside the original voice-driven mode
- Countdown before scrolling starts
- Progress bar and time left, worked out from your words per minute
- Back to the start (`Ctrl+Home`)
- Presenter clickers: `Page Down` starts and pauses, `Page Up` goes back a section

**Scripts**

- Opens Word (`.docx`), rich text (`.rtf`) and plain text as well as markdown and HTML
- `=== SECTION` lines in Word and rich-text scripts become sections you can jump between
- `[Stage directions]` are dimmed or hidden, while "quoted words" inside them stay bright
- Slide-cue phrases from a `cues.yaml` file are highlighted in script order
- Script directives in `{curly braces}` are hidden while you read (see [docs/SCRIPT-DIRECTIVES.md](docs/SCRIPT-DIRECTIVES.md)). `{pause}` stops steady scrolling until you press Space or the clicker, and `{pause: 3s}` waits and carries on. A section's `{wpm: n}` or `{target: m:ss}` sets the scroll pace (switch this off with Layout > Follow the script's pace). Show directives in the Layout panel shows them as small tags, with ⚠ on typos
- Check a script from the command line: `npm run check-script -- my-script.md`. It reports unknown directives, bad values, unmatched braces and sections without a target, and exits with 1 on errors, so AI script pipelines can use it
- Reading aids in the Layout panel: a **focus band** that dims lines away from the reading line, with a strength setting; a **text edge** (outline or shadow) for see-through reading over busy backgrounds; **colour themes** (standard, yellow on dark, high contrast, soft cream); and **fonts**, including Atkinson Hyperlegible, OpenDyslexic and Verdana
- Recording helpers: an **ON AIR** light while scrolling; an optional **beep** when the countdown ends (off by default, since the mic would hear it); **hide from screen sharing and recordings**; and **click-through**, where clicks on the script reach the window behind but the controls still work (**Ctrl+Shift+X** toggles it from any app)
- **Game controllers:** A starts and pauses, B drops a marker, X jumps to the next marker, the d-pad changes speed and section. USB foot pedals that send keys (Page Down, arrows) work as before
- **Talking points** for speaking off script: `{mode: points}` in a script, or Layout > Talking points. Each section shows on its own as large bullet points, with no scrolling. Space starts and stops the talk timer; Page Down or → moves to the next point and Page Up or ← goes back. The pacing light shows each point's time against its `{target}` ("On track", "10 s left", "Over by 12 s") and the whole talk's time, and the summary lists every point
- **Floating control pad** (View > Floating Control Pad, **Ctrl+Shift+P**): a small window with Start / Pause, Top, Previous and Next that stays on top of everything. Drag it by its grip anywhere, even onto another monitor or over Riverside, and it reopens where you left it. Over the prompter window it flips with the prompter's mirror setting, so it reads correctly in beam-splitter glass; off the prompter it reads normally. In talking points, Previous and Next step through the points
- Next and Previous section (arrow keys, pedals, the pad and the remote) now go from where you are in the script, not from the last section you jumped to. Previous from part-way through a section goes back to its start first
- **Phone remote** (Settings > Remotes): scan the QR code with a phone on the same Wi-Fi to get big Start / Pause, Previous, Next, Top, Slower, Faster and Drop a marker buttons, with the current section and time left. Off by default. Only a device with the code in the QR code can connect; New code disconnects phones already connected. The first time, Windows may ask to allow the app on the network: allow it on private networks
- **Control window** (View > Control Window or the ☰ menu under Playback, **Ctrl+Shift+O**): an ordinary, upright window for a second screen. It shows a live copy of the script that follows the prompter, with the reading line, the pacing light, the section and time left, and big Top / Previous / Start / Next / Slower / Faster / Marker buttons. Click any line in the copy to move the prompter there. Keys work too: Space, Page Up / Down, Home, ↑ / ↓ and B. A− / A+ change the copy's text size, and it reopens where you left it
- **Prompter monitor** (Settings > Display, or Window > Prompter Monitor): pick a monitor (the Elgato Prompter shows up by name) and the prompter opens full screen there, now and each time the app starts. F11 gives a normal window on that monitor
- **Windows stay in view.** If the prompter is bigger than its screen, or its control bar ends up above or off the screen (after a drag, a monitor unplugged, or a resolution change), it shrinks or moves back so the bar can be reached. The control window does the same when a monitor goes away
- **Voice scrolling on your own computer** (Settings > Voice): free, offline and private, and now the default. A one-off 73 MB download (with progress shown) fetches the speech model; after that nothing you say leaves the PC. Words reach the prompter while you're still speaking, not at the next pause. In a side-by-side test on a real 9-minute recording with retakes, it kept the prompter on the reader's line 96% of the time, with a typical delay of a few hundredths of a second; Moonshine, which waits for pauses, managed 75%. Deepgram stays as a choice, with your own key
- **The sentence you're on is highlighted** (Settings > Display, the Layout panel or the ☰ menu under Display; on by default): in voice mode, the sentence you're about to say; otherwise the one on the reading line. A soft band that keeps the text colour on every theme
- Words with apostrophes now match whichever apostrophe the script uses: "isn't" heard matches "isn’t" typed
- **Voice commands: "Prompter, …"** (Settings > Voice): say "Prompter", then pause, go, slower, faster, back, next section, from the top, again (marker and retake), marker, resync, bigger or smaller, then stop for a moment. They only count at the end of what you say, so a script line such as "the prompter pauses" never triggers one. In voice mode, "pause" holds the scroll but keeps listening, and "resync" finds your place anywhere in the script. Choose "In voice mode and while steady scrolling" to use them with steady scrolling too (the mic listens for commands only, on this computer). Commonly misheard words are matched too ("paws", "rezinc")
- **User guide with screenshots** ([docs/guide](docs/guide/README.md)): getting started, writing scripts, scrolling and voice, layout, recording a take, remotes and second screens, every Settings tab, shortcuts and troubleshooting. It opens inside the app from Help > User Guide, the ☰ menu or **Shift+F1**, and works offline; the shortcuts panel (F1) links to it
- **Stops and timed pauses in scripts:** `{stop}` (or `{pause}`) waits until you say "Prompter, go" (or just "go"), press Space or use the clicker, with a yellow Stopped label; `{pause: 5s}` shows a blue "Carrying on in 5" countdown with a bar that runs down, then carries on. Both now work in voice scrolling too. In steady scrolling the mic listens for "Prompter, go" while it waits. A new sample script, **Voice control, stops and countdowns**, walks through them all, and the other samples use them too
- **Help > Copy the AI Script Prompt** (also in ☰ > Help): puts the [brief for AI script writers](docs/AI-SCRIPT-BRIEF.md) on the clipboard, ready to paste into ChatGPT, Claude or Gemini. The brief now covers `{stop}` and countdowns
- **PDFs and Google Docs** (File > Open a Google Doc…): open a PDF like any other script, with its paragraphs and headings rebuilt and page numbers and running headers left out; or paste the link of a Google Doc shared as "Anyone with the link" (or drag it from the browser). The latest version is fetched each time you open it, or with File > Reload from Google Docs
- A [note in brackets] that wraps onto the next line of the script file is now dimmed like any other note (before, it showed as normal text)
- **Tidier menu and Settings.** The ☰ menu groups fold up: Script and Playback start open; opening another group closes the rest, so the menu stays short (the menu remembers). The menu closes when you click anywhere else. The button pad is now in the menu under Playback (Ctrl+Shift+P). Settings is split into tabs (Scrolling, Voice, Display, Layout, Files, Remotes; Files has opening and saving scripts, the settings file and slide cues) with an × at the top right, and Save / Cancel always in view. A quiet line at the foot of the menu and Settings shows the version, release date, licence and credits, with a link to About (Help > About lists the newer features too)
- **Rehearsal timer:** after a practice run, **Use these times as targets** in the take summary writes each section's time into the script as `{target: m:ss}` (to the nearest 5 seconds), replacing any target it had. Sections started part-way through are left alone. Works with .md and .txt scripts
- The take summary flags sections that ran short as well as long: within 5% of the target is "On track", 5 to 10% under or over is amber ("Under by 8 s"), and more than 10% is red
- **Finish on time:** a single take (`{pacing: session}`) with a whole-script `{target: m:ss}` sets its scroll pace so it lands on that time, as section targets already do for each section
- **Pacing light** while scrolling: time against target and actual against target words per minute, with a green, amber or red light and the words "On track", "Ahead 5 s" or "Behind 8 s". In section mode (the default, for batch recording) each pass through a section is timed afresh and the timer stops at `{pause}`s; `{pacing: session}` times the whole take instead. When you stop, a **summary** lists each section you read to the end, with its time, target, pace and result
- Markers: `{marker}` in a script, or press **B** to drop one at the reading line during a take; **Ctrl+B** jumps between them
- Built-in sample scripts (Script > Sample scripts): a welcome tour, which opens on first run, plus batch recording, a single take, a formatting test and plain-text sections. Each opens as a copy, so editing never changes the original
- Nine script slots (`Ctrl+1` to `Ctrl+9`). Each slot reopens where you left it, even after a restart
- Drag a script file onto the window to open it

**Controls and layout**

- Control bar with open, save, edit, slots, play, sliders, layout, voice, help, settings and window buttons. It hides while you read and comes back when you move the mouse
- Every slider has a number box beside it. You can type a value, use the arrow keys (`Page Up` / `Page Down` move 10 steps), or press and hold the ▲ ▼ buttons. Speed shows words per minute; everything else shows a percentage
- In-app menu grouped into Script, Playback, Display, Window, Settings and Help
- Layout panel: text opacity, background opacity and text brightness, each set independently (none affects the controls), left/right and top/bottom margins (the text fades out near the window edges), line spacing, reading line, alignment, mirror and reading-line marker
- Eye-line mode: a small window near the camera
- Beam-splitter setup button: a solid black background, text dimmed to 70% and mirroring on, which stops bright light from the screen making the camera image look milky
- Mirror the script horizontally, vertically or both, for any beam-splitter or reflector rig. `Ctrl+M` steps through Off → Horizontal → Vertical → Both. The whole prompter display is mirrored, controls included, so everything reads correctly in the reflection (this also fixes the control bar scrolling away while mirrored)
- Minimise, maximise and full screen, which work properly on a transparent window
- Keyboard shortcuts panel (`F1` or `?`) and an About page

**Voice scroll sync**

- Voice panel with the Deepgram key box, microphone choice, a live level meter and a responsiveness setting

**Settings**

- Save and load all settings as JSON or XML (File > Save Settings to File). The Deepgram key is never written to these files

**AI and remote control** (off by default)

- An optional HTTP API on `127.0.0.1` so an AI assistant or a local script can open or write scripts, switch slots, play, pause, change speed and jump sections. `node scripts/sightline.mjs` wraps it for AI agents, and [Setting up your AI](docs/guide/10-setting-up-your-ai.md) shows how to set up Claude Code, Codex, ChatGPT, Claude or Gemini
- Each request needs a secret token. Requests from web pages are refused, and the API can't switch itself on
- When the API is on, its address and token are written to `remote-control.json` in the app's settings folder:
  - Windows: `%APPDATA%\Sightline Prompter`
  - Mac: `~/Library/Application Support/Sightline Prompter`
  - Linux: `~/.config/Sightline Prompter`

  The file is deleted when the API is switched off. The app never shows your full user path.

| Endpoint            | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `GET /status`       | Current script, slot, speed, progress and slots           |
| `POST /open`        | Open a script file `{ path, slot }`                       |
| `POST /load-text`   | Save text as a script and open it `{ text, name, slot }`  |
| `POST /command`     | `play`, `pause`, `toggle`, `restart`, `next-section`, `previous-section`, `faster`, `slower`, `reset-speed`, `set-wpm`, `go-to-section`, `marker`, `keeper`, `scrap`, `help` |
| `POST /slot`        | Switch to a slot `{ slot }`                               |
| `POST /settings`    | Change display settings                                   |
| `POST /window`      | `minimize`, `maximize` or `fullscreen` (each toggles)     |

## Developer Setup

1. Install [Node.js LTS](https://nodejs.org/) (v22+)
1. Clone or download the source code.
1. Open a terminal/command window, change to the source code folder, and install dependencies using `npm install`.
1. Launch the app from the terminal using `npm start`.

## Origin Story

Electron Teleprompter, the app this is based on, was originally built "in the open" on the [All Hands on Tech Live](https://www.twitch.tv/pluralsight_live) developer stream. You can watch past streams on Pluralsight's [YouTube](https://www.youtube.com/c/pluralsight), [LinkedIn](https://www.linkedin.com/company/pluralsight), or [Facebook](https://www.facebook.com/pluralsight).
