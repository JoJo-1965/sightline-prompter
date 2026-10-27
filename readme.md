# Sightline Prompter

A see-through desktop teleprompter for recording to camera, built with [Electron.js](https://www.electronjs.org/).

> **About Sightline Prompter.** This is a fork of
> [reverentgeek/electron-teleprompter](https://github.com/reverentgeek/electron-teleprompter),
> created by [David Neal](https://reverentgeek.com) and released under the MIT
> licence. Adapted and enhanced by Joanne Lockwood from SEE Change Happen Ltd.
> It adds steady words-per-minute scrolling, script
> slots, a control bar and menu, layout controls, Word and rich-text scripts,
> settings files and an optional local API for AI assistants. Everything from
> the original still works. See the [change log](#change-log) for the details,
> and **Help > About** in the app for credits.

## Features

- Translucent overlay — see through the script to your presentation or video call
- Built-in markdown editor with syntax highlighting
- Voice-driven auto-scroll — speak your script and the prompter follows you, powered by [Deepgram](https://deepgram.com/)
- Live reload — script automatically reloads when the file is modified externally
- Adjustable background opacity
- Font size is persisted across sessions
- Mirror/flip mode — for physical teleprompter setups with beam splitters
- Recently opened files — File > Open Recent submenu
- Auto-loads last opened file on startup
- Window position and size are persisted across sessions

## Usage

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

The teleprompter can listen to you and scroll the script automatically as you speak. No keyboard, remote, or foot pedals required! Speech is transcribed by [Deepgram](https://deepgram.com/) and the recognized words are matched against your script, so the prompter follows your real cadence and tolerates ad-libs and re-reads.

#### Setup

1. Get a Deepgram API key from [console.deepgram.com](https://console.deepgram.com/) (a free tier is available).
2. Click **Voice** in the control bar (or open Settings) and paste in your key. The key is stored locally in the app's state file and is never written to exported settings files.
3. Grant microphone access the first time you start auto-scroll.

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

- An optional HTTP API on `127.0.0.1` so an AI assistant or a local script can open or write scripts, switch slots, play, pause, change speed and jump sections
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
| `POST /command`     | `play`, `pause`, `toggle`, `restart`, `next-section`, `previous-section`, `faster`, `slower`, `reset-speed`, `set-wpm`, `go-to-section` |
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
