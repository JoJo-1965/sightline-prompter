# Scrolling and voice

Choose the scroll mode in **Settings > Scrolling**, the Voice panel, or the ☰
menu under Playback.

## Steady scrolling

The script moves at a fixed pace in words per minute. Set it with the **Speed**
slider. While scrolling, **↑** and **↓** make it faster or slower by 5 words a
minute. A script can set its own pace, section by section, with `{wpm: 140}`.
Turn on **Follow the script's pace** in the Layout panel to use those
settings.

## Voice scrolling

In voice mode the prompter listens to you and keeps the words you're saying on
the reading line. Speed up, slow down, pause to think or ad-lib a line, and it
waits for you and then catches up.

![Settings > Voice](images/settings-voice.png)

### Speech recognition on this computer (the default)

Speech is turned into words **on your own computer**. You don't need an
account or a key, it works offline, and nothing you say leaves the PC.

The first time, open **Settings > Voice** and click **Download speech model**.
It's a one-off download of about 73 MB, and progress is shown as it goes.
After that, voice scrolling works with no internet connection at all.

### Deepgram (online)

If you prefer, choose **Deepgram** as the speech recognition and paste in a key
from [console.deepgram.com](https://console.deepgram.com/). Your audio is then
sent to Deepgram while voice scrolling is on. The key is stored only on this
computer and is never written to exported settings files.

### Using it

1. Choose **Voice** as the scroll mode.
2. Pick your microphone in the Voice panel. Speak a few words and check the
   meter moves.
3. Press **Space** (or **Ctrl+Shift+L**). A green **Listening** label appears
   at the bottom right.
4. Start reading. If you scroll by hand, voice scrolling gives way for a moment
   and then picks up from what's on screen.
5. Press **Space** again, or click the Listening label, to stop.

![The Voice panel](images/voice-panel.png)

**Voice responsiveness** sets how quickly the script glides to catch up with
you. Higher is snappier, lower is smoother.

## Voice commands: "Prompter, …"

Say **"Prompter"**, then a command, then stop for a moment. The command only
counts when it ends what you're saying, so a line in your script such as "the
prompter pauses" never sets it off. A small message confirms what was heard,
such as *Heard: "Prompter, slower"*.

| Say "Prompter, …" | What happens |
| --- | --- |
| **pause** (or stop, hold, wait) | Pause. In voice mode the prompter keeps listening, so you can carry on |
| **go** (or carry on, continue, start) | Start, or carry on after a pause. While paused in voice mode, "go" on its own works too |
| **slower** / **faster** (or slow down, speed up) | Steady scrolling: 10 words a minute slower or faster. Voice mode: less or more responsive |
| **back** (or previous section) | Back to the start of this section, or the one before |
| **next section** | On to the next section |
| **from the top** (or top, reset) | Back to the start |
| **again** (or retake) | Drops a marker where you are, then goes back to the start of the section for a retake |
| **marker** | Drops a marker |
| **resync** (or find me) | Voice mode: if it has lost you, keep reading and it finds your place anywhere in the script |
| **bigger** / **smaller** | Text size |

Choose when it listens on **Settings > Voice**, under **Voice commands**:

- **In voice mode** (the default): commands work while voice scrolling.
- **In voice mode and while steady scrolling**: the microphone also listens
  for commands while the script scrolls at a steady pace. A small
  **🎙 Prompter** label at the bottom right shows that it's listening. This
  uses speech recognition on this computer, so nothing is sent anywhere.
- **Off**.

## The sentence highlight

The sentence you're on is lit with a soft band, so your eyes always have
somewhere to land. In voice mode it's the sentence you're **about to say**.
Otherwise it's the sentence on the reading line.

![The sentence on the reading line, highlighted](images/running.png)

Turn it off or on in **Settings > Display**, the Layout panel, or the ☰ menu
under Display.
