# Working with AI

**Built around AI for the content creators of today.** Sightline is made for people who make video with an AI assistant at their
side: content creators, and learning and development teams recording courses,
explainers and updates at a desk or in a studio. Your AI can write the script,
direct the prompter, run it while you record, and pick up the take log
afterwards for the edit.

Sightline doesn't record your video or audio: keep using OBS, Riverside,
Zoom, your camera or whatever you record with. What Sightline adds is the
accurate timings (every take, section and word, with your retakes, markers
and ratings) and a slate to line them up with that recording, so your AI
can find the right take and cut it without anyone scrubbing through by ear.

| Step       | What the AI does                                                   | What Sightline does                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Write**  | Writes the script, with sections, target times, stops and countdowns | Gives the AI its instructions (the AI Script Prompt) and checks what comes back       |
| **Record** | Loads the script and runs the prompter, if you let it             | Follows your voice, holds at every stop, marks every pause, logs every take          |
| **Edit**   | Reads the edit pack, chooses the takes and plans the cuts          | Saves every take, the words you said and when, and builds the edit pack               |

**Setting your AI up:** Claude Code and Codex can do all three, with two
ready-made skills and a command for driving Sightline; ChatGPT, Claude or
Gemini in a browser can write scripts and read the files you upload. How to
set up each one is in [Setting up your AI](10-setting-up-your-ai.md).

## 1. Write: scripts with directions in them

Choose **Help > Copy the AI Script Prompt** (or ☰ > Help). Paste it into
ChatGPT, Claude, Gemini or Copilot, then describe the video: the audience,
the length, the points to land. The script that comes back is ready for
Sightline:

- `## Headings` become sections you can jump between and retake one by one.
- `{target: 1:20}` and `{wpm: 140}` set the pace section by section.
- `{stop}` holds the prompter until you say "Prompter, go"; `{pause: 3s}`
  counts down and carries on. Use them before a demo, a slide change or a
  change of shot.
- `{marker}` drops a marker in the take log, for the edit.
- `[Notes in square brackets]` are directions to you, dimmed on screen.

The same instructions are in [AI-SCRIPT-BRIEF.md](../AI-SCRIPT-BRIEF.md), and
every directive is in [SCRIPT-DIRECTIVES.md](../SCRIPT-DIRECTIVES.md).

If your team drafts in Google Docs, open the doc straight from **File > Open a
Google Doc**; Sightline fetches the latest version each time. Word and PDF
files open too.

**Checking the script.** Sightline marks any directive it doesn't recognise
with ⚠. In an AI pipeline, run the checker from the source folder:

```
npm run check-script -- my-script.md
```

It reports unknown directives, bad values, unmatched braces and sections
without a target, and exits with 1 on errors, so an agent can fix the script
before you see it.

## 2. Record: let the AI run the prompter

On **Settings > Remotes**, tick **Let an AI assistant or script on this
computer load scripts and control the teleprompter**. Sightline then listens
on `127.0.0.1` (this computer only) and writes its address and a secret token
to `remote-control.json` in its settings folder:

- Windows: `%APPDATA%\Sightline Prompter`
- Mac: `~/Library/Application Support/Sightline Prompter`
- Linux: `~/.config/Sightline Prompter`

An AI agent that can run commands on your computer, such as Claude Code, reads
that file and sends each request with the header
`Authorization: Bearer <token>`. It can:

| Request           | What it does                                                         |
| ----------------- | -------------------------------------------------------------------- |
| `GET /status`     | The current script, slot, speed, progress and slots                  |
| `POST /load-text` | Save a script it wrote and open it `{ text, name, slot }`            |
| `POST /open`      | Open a script file `{ path, slot }`                                  |
| `POST /command`   | `play`, `pause`, `next-section`, `go-to-section`, `set-wpm`, `marker`, `keeper`, `scrap` and more; for buttons, `on-air`, `mirror`, `mirror-h`, `mirror-v`, `bigger`, `smaller`, `layout`, `reading`, `recording`, `eye-line`, `click-through`, `sound-check`, and `scroll` or `backing` with a number of steps |
| `GET /events`     | A live stream (server-sent events) of the state, sent again each time something changes: playing, on air, mirror, slot, section, time left, speed, backing |
| `POST /slot`      | Switch to a slot `{ slot }`                                          |
| `POST /settings`  | Change display settings                                              |
| `GET /recordings` | Every recording session, newest first, with its id                  |
| `GET /recording?id=…` | One session: its takes and which ones the edit uses            |
| `GET /recording/pack?id=…` | A session's edit pack, as `{ files: { name: contents } }` |
| `POST /recording/update` | Name it, add a note or mark it processed `{ id, title, note, processed }` |
| `POST /recording/delete` | To the Recycle Bin `{ id }`, only if you tick **Let it delete recordings too** |

It's off by default. Requests from web pages are refused, the API can't
switch itself on, and **New token** locks out anything that had the old one.
The full list is in the [readme](https://github.com/JoJo-1965/sightline-prompter#readme), and
[Setting up your AI](10-setting-up-your-ai.md) explains each setting and how
Claude Code and Codex use it.

While you record, your voice does the rest: "Prompter, again" for a retake,
"Prompter, keeper" or "Prompter, scrap that" to rate a take, "Prompter,
marker" for a moment to find later. See
[Scrolling and voice](03-scrolling-and-voice.md).

## 3. Edit: hand the take log to your AI

Sightline logs every take of every section as you record: when it started
and ended, whether you read it to the end or went back for a retake, its
markers and its rating. In voice mode it also records when you said each
word of the script, so an editing assistant can cut on a word or a sentence. The log picks the take to use for each section (your
last keeper, or else your last complete take).

**File > Export Edit Pack…** saves everything an editing assistant needs in
one folder: the take log, every word with its start and end, every sentence
(with any words you missed), edit marks (sentence starts, pauses, re-reads,
skipped words) and captions in your script's wording, with a README that
tells the AI how to use them. See [the edit pack](05-recording-a-take.md#the-edit-pack).
**File > Recordings…** lists every session, one per script per day, to name,
note, export as a folder or zip, or delete; see
[Recordings](05-recording-a-take.md#recordings). The columns are described in
[Recording a take](05-recording-a-take.md#the-take-log). An agent can list the
sessions and fetch any one's edit pack itself, through the API above or
`node scripts/sightline.mjs recordings` and `recording-pack <id>`.

Give the edit pack to your editing assistant with the recording and ask it
to cut the chosen take of each section together, in script order. With the
[slate](05-recording-a-take.md#the-slate) turned on, every take's times line
up with the recording from the first beep or flash.

## Coming next

The [roadmap](https://github.com/JoJo-1965/sightline-prompter/blob/main/ROADMAP.md) takes this further, in this order:

- **Settings in its own window** (48), regrouped into more tabs, for
  prompter monitors and second screens.
- **Code signing** (27), so the installers don't trigger security warnings.
- **Choose your own buttons** (40) for clickers, pedals and game controllers.

Already built: script lines that switch the microphone off for a demo
(`{listen: off}`), commands in the script (`{prompter: …}`), and sound checks
(`{soundcheck: room}`, `{soundcheck: voice}`); see
[Writing scripts](02-scripts.md).
