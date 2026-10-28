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

### What it heard

While voice scrolling listens, Sightline keeps a **heard log**: every word
the speech engine heard, next to the script words it matched them with, one
file per script per day in the `heard-logs` folder in Sightline's settings
folder. It never leaves your computer. It's there to find the words voice
scrolling keeps mishearing (a name, a technical term), so they can be
corrected. An AI assistant can read it with `node scripts/sightline.mjs heard`
(see [Setting up your AI](10-setting-up-your-ai.md)), which lists the words
heard in place of script words, most often first.

### Your words

Names and unusual words are what speech recognition gets wrong most:
*Siobhan* heard as *shivawn*, *Sightline* as *site line*. **Settings > Voice >
Your words** fixes them.

![Settings > Voice > Your words](images/settings-words.png)

- **Match words that sound alike** (on unless you turn it off): a word heard
  that isn't in the script but sounds like a longer script word, starts with
  the same letter and is about as long counts as that word: *marsha* for
  *Moshe*, *abrams* for *Abrahams*. No list needed.
- **Your list** is for the rest. Type your word, then what it hears instead,
  with commas between. A heard form of two or three words, such as *site
  line*, works too.
- Each form is a **synonym**, not a replacement: it counts as your word
  wherever the script has your word, and as itself everywhere else. So a
  script that really says *Marsha* still matches *Marsha*.
- **Suggest from what it heard** looks through the heard logs for words it
  took for another more than once, with **Add** beside each.
- **Teach…** listens for eight seconds while you say the word a few times,
  with a pause between, and adds whatever it hears that isn't the word. It
  needs the speech model on this computer.

The fixes apply the next time voice scrolling starts, and they're kept with
your settings, so **Export Settings** takes them to another computer.

## Voice commands: "Prompter, …"

**The wake word** is "Prompter" unless you choose another on **Settings > Voice >
Wake word**: Computer, Teleprompter or Director. Pick one that doesn't come up in
your scripts. Below, read "Prompter" as whichever you chose; it takes effect the
next time Sightline starts listening.

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
| **back** (or previous section, previous page) | Back to the start of this section, or the one before. In notes, the previous page |
| **next section** (or next page) | On to the next section. In notes, the next page |
| **from the top** (or top, start again) | Back to the start |
| **reset** (or restart) | Back to the start, with the speed back to normal and the pacing clock cleared, ready for a fresh run |
| **section 3** (any number) | To the start of that section. You can say it without "Prompter" too, as your spoken slate before each section: saying the section you're in counts as a retake |
| **again** (or retake) | Drops a marker where you are, then goes back to the start of the section for a retake |
| **marker** | Drops a marker |
| **back to the marker** (or from the marker, last marker) | Back to the last marker, to read on from there (Shift+B) |
| **keeper** (or keep that, good take) | Marks the take you're on, or the one you've just finished, as a keeper in the [take log](05-recording-a-take.md#the-take-log) |
| **scrap that** (or bin it, bad take) | Marks that take to be thrown away |
| **resync** (or find me) | Voice mode: if it has lost you, keep reading and it finds your place anywhere in the script |
| **bigger** / **smaller** | Text size |
| **what can I say** (or help, commands) | Shows every command on the prompter, until your next command, a click, Esc or 15 seconds |

Choose when it listens on **Settings > Voice**, under **Voice commands**:

- **In voice mode** (the default): commands work while voice scrolling.
- **In voice mode and while steady scrolling**: the microphone also listens
  for commands while the script scrolls at a steady pace. A small
  **🎙 Prompter** label at the bottom right shows that it's listening. This
  uses speech recognition on this computer, so nothing is sent anywhere.
- **Off**.

## Stops and timed pauses

Put these in the script where you want the prompter to wait. A stop works in
steady and voice scrolling. A countdown only holds in steady scrolling (see
[In voice scrolling](#in-voice-scrolling) below).

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

### In voice scrolling

In voice mode the prompter only moves when you speak, so it already waits for
you. A `{stop}` still holds, so you can go off script, for a demo or a
question, without the prompter jumping ahead on a word it recognises. Say
"Prompter, go" when you're back.

A countdown, `{pause: 3s}`, doesn't hold or count down in voice mode. It shows
as a small blue **⏸ 3s** mark in the script, and you take the beat yourself.
Scripts can carry countdowns for steady scrolling without them getting in the
way when you read by voice.

To try it all, open ☰ > Script > **Sample scripts > Voice control, stops and
countdowns**. It walks you through a countdown, a stop and the voice commands.

## The sentence highlight

The sentence you're on is lit with a soft band, so your eyes always have
somewhere to land. In voice mode it's the sentence you're **about to say**.
Otherwise it's the sentence on the reading line.

![The sentence on the reading line, highlighted](images/running.png)

Turn it off or on in **Settings > Display**, the Layout panel, or the ☰ menu
under Display.
