# Shortcuts and troubleshooting

## Keyboard shortcuts

Press **F1** (or **?**) for the full list inside the app.

![Keyboard shortcuts](images/shortcuts.png)

The ones you'll use most:

| Keys                     | What they do                                   |
| ------------------------ | ---------------------------------------------- |
| **Space**                | Start / pause (and carry on after a `{pause}`) |
| **↑** / **↓**            | While scrolling: faster / slower               |
| **→** / **←**            | Next / previous section                        |
| **Ctrl+Home**            | Back to the start                              |
| **B** / **Ctrl+B**       | Drop a marker / jump to the next marker        |
| **K** / **Shift+K** | This take's a keeper / scrap this take (take log) |
| **Ctrl+=** / **Ctrl+-**  | Bigger / smaller text                          |
| **Ctrl+M**               | Mirror                                         |
| **Ctrl+L**               | Eye-line mode                                  |
| **Ctrl+1** to **Ctrl+9** | Swap script slot                               |
| **Ctrl+Shift+P**         | Floating pad                                   |
| **Ctrl+Shift+O**         | Control window                                 |
| **Ctrl+Shift+V**         | Voice panel                                    |
| **Ctrl+Shift+R**         | Recordings                                     |
| **Ctrl+Shift+X**         | Click-through on / off                         |
| **Ctrl+Shift+D**         | Sound-check meter on / off                     |
| **Ctrl+,**               | Settings                                       |

## Troubleshooting

**The control bar has gone off the screen.** The prompter moves itself back
so the bar can be reached. If it hasn't, press **Shift+F11** twice to maximise
and restore it.

**Voice scrolling doesn't move.** Check the scroll mode is **Voice**, the
**Listening** label is showing, and the meter in the Voice panel moves when you
speak. If you use "On this computer", check Settings > Voice says the speech
model is installed.

**Voice scrolling has lost its place.** Scroll by hand to where you are. It
picks up from what's on screen once you stop scrolling.

**Sightline stops responding.** It asks whether to **Wait** or **Reload**;
reloading keeps your scripts and settings, but loses unsaved changes in the
editor. Hangs, crashes and errors are noted in `sightline.log` in Sightline's
folder (`%APPDATA%\Sightline Prompter` on Windows). To report it, turn on
**Settings > About > Debug mode**, make it happen again, then use **Save a log
for support…** and attach the file.

**A voice command isn't heard.** Say "Prompter", then the command, then stop
for a moment: commands only count at the end of what you say. Check Voice
commands is on in Settings > Voice. To use them while steady scrolling, or to
start with "Prompter, go", choose "Always, even when stopped" and look for the
🎙 Prompter label.

**The speech model download failed.** Check you're online and click
**Try again**. It carries on from the files it already has.

**The prompter shows up in my recording.** Tick **Hide from screen capture** in
the Layout panel.

**The phone can't connect.** The phone and the computer need to be on the same
Wi-Fi. Allow Sightline Prompter on private networks if Windows asks. If you
made a new code, scan the new QR code.

**A [note] is showing as normal text.** Check the brackets are closed: the
note must end with `]`.
