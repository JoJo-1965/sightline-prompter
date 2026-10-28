# Working with AI

**Built around AI for the content creators of today.** Sightline is made for people who make video with an AI assistant at their
side: content creators, and learning and development teams recording courses,
explainers and updates at a desk or in a studio. Your AI can write the script,
direct the prompter, run it while you record, and pick up the take log
afterwards for the edit.

| Step       | What the AI does                                                   | What Sightline does                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Write**  | Writes the script, with sections, target times, stops and countdowns | Gives the AI its instructions (the AI Script Prompt) and checks what comes back       |
| **Record** | Loads the script and runs the prompter, if you let it             | Follows your voice, holds at every stop, counts down every pause, logs every take     |
| **Edit**   | Reads the take log and chooses the takes                           | Saves each take's start and end, retakes, markers and your keeper or scrap rating    |

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
| `POST /command`   | `play`, `pause`, `next-section`, `go-to-section`, `set-wpm`, `marker`, `keeper`, `scrap` and more |
| `POST /slot`      | Switch to a slot `{ slot }`                                          |
| `POST /settings`  | Change display settings                                              |

It's off by default. Requests from web pages are refused, the API can't
switch itself on, and **New token** locks out anything that had the old one.
The full list is in the [readme](../../readme.md).

While you record, your voice does the rest: "Prompter, again" for a retake,
"Prompter, keeper" or "Prompter, scrap that" to rate a take, "Prompter,
marker" for a moment to find later. See
[Scrolling and voice](03-scrolling-and-voice.md).

## 3. Edit: hand the take log to your AI

Sightline logs every take of every section as you record: when it started
and ended, whether you read it to the end or went back for a retake, its
markers and its rating. The log picks the take to use for each section (your
last keeper, or else your last complete take).

**File > Export Take Log** saves it as JSON, for an AI editor or edit tool,
and CSV, for a spreadsheet. **File > Show Take Logs Folder** shows where the
logs are kept, one per script per day. The columns are described in
[Recording a take](05-recording-a-take.md#the-take-log).

Give the JSON to your editing assistant with the recording and ask it to cut
the chosen take of each section together, in script order. With the
[slate](05-recording-a-take.md#the-slate) turned on, every take's times line
up with the recording from the first beep or flash.

## Coming next

The [roadmap](../../ROADMAP.md) takes this further, in this order:

- **Word-level timing and an edit pack** (26): when each word was spoken, a
  transcript per take, edit marks and captions, in one folder an editing
  agent can assemble from.
- **Script-controlled listening** (35): `{listen: off}` before an ad-lib or a
  demo turns the microphone off, `{listen: on}` turns it back on, and
  `{prompter: …}` lets the script give the prompter a command.
- **A recordings library with agent access** (36): save, rename and delete
  recording sessions, and let an agent list them and fetch an edit pack
  through the same local API.
