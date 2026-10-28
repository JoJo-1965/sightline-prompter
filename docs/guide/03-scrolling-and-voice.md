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
prompter pauses" never sets it off.

As soon as it hears **"Prompter"**, a message at the bottom says
*Listening… go · pause · again · marker*, so you know it's ready for the
command. Another confirms what was heard, such as *Heard: "Prompter,
slower"*, and if what followed wasn't a command it says *Didn't catch
that*, with the words it heard, so you can say it again.

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
| **keeper** (or keep that, good take) | Marks the take you're on, or the one you've just finished, as a keeper in the [take log](05-recording-a-take.md#the-take-log) |
| **scrap that** (or bin it, bad take) | Marks that take to be thrown away |
| **resync** (or find me) | Voice mode: if it has lost you, keep reading and it finds your place anywhere in the script |
| **bigger** / **smaller** | Text size |

Choose when it listens on **Settings > Voice**, under **Voice commands**:

- **In voice mode** (the default): commands work while voice scrolling.
- **In voice mode and while steady scrolling**: the microphone also listens
  for commands while the script scrolls at a steady pace. A small
  **🎙 Prompter** label at the bottom right shows that it's listening. This
  uses speech recognition on this computer, so nothing is sent anywhere.
- **Off**.

## Stops and timed pauses

Put these in the script where you want the prompter to wait. They work in
steady scrolling and in voice scrolling.

| In the script | What happens |
| --- | --- |
| `{stop}` (or `{pause}`) | The prompter stops, and a yellow **Stopped** label shows at the bottom right. Say **"Prompter, go"** (or just **"go"**), or press Space, the clicker or the remote, to carry on |
| `{pause: 5s}` | The prompter waits 5 seconds (up to 30), with a blue **Carrying on in 5** countdown and a bar that runs down, then carries on by itself |

![A countdown: the blue label at the bottom right](images/pill-countdown.png)

![A stop: the yellow label, with the Prompter label showing the mic is listening for "Prompter, go"](images/pill-stop.png)

During a stop or a countdown:

- **"Prompter, go"** carries on straight away.
- **"Prompter, pause"** turns a countdown into a stop, so it waits for you.
- In steady scrolling, the microphone listens for "Prompter, go" while the
  prompter waits, even if voice commands are set to voice mode only (the small
  **🎙 Prompter** label shows). Set **Voice commands** to **Off** in
  Settings > Voice to stop this.

To try it all, open ☰ > Script > **Sample scripts > Voice control, stops and
countdowns**. It walks you through a countdown, a stop and the voice commands.

## The sentence highlight

The sentence you're on is lit with a soft band, so your eyes always have
somewhere to land. In voice mode it's the sentence you're **about to say**.
Otherwise it's the sentence on the reading line.

![The sentence on the reading line, highlighted](images/running.png)

Turn it off or on in **Settings > Display**, the Layout panel, or the ☰ menu
under Display.
