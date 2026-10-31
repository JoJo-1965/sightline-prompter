# Setting up your AI

Sightline is built to work with an AI at three points: **writing** the
script, **running** the prompter while you record, and **editing** from the
take log afterwards. How much your AI can do depends on where it runs.

Sightline doesn't record video or audio: you record with OBS, Riverside,
Zoom, your camera or anything else. Sightline gives your AI the accurate
timings (takes, sections, words, retakes, markers, the slate) to find and
cut the right parts of that recording.

| Your AI | Write scripts | Load scripts and run the prompter | Use the take log and edit pack |
| --- | --- | --- | --- |
| **Claude Code** or **Codex** (on your computer) | Yes, and checks them | Yes | Yes, straight from Sightline's files |
| **ChatGPT, Claude or Gemini** in a browser or app (Projects, GPTs, Gems) | Yes | No | Yes, from files you upload |

## What's in the [source code](https://github.com/JoJo-1965/sightline-prompter) for AIs

| File | What it's for |
| --- | --- |
| [skills/sightline-script/SKILL.md](https://github.com/JoJo-1965/sightline-prompter/blob/main/skills/sightline-script/SKILL.md) | A skill for writing and checking scripts to the Sightline spec |
| [skills/sightline-session/SKILL.md](https://github.com/JoJo-1965/sightline-prompter/blob/main/skills/sightline-session/SKILL.md) | A skill for loading scripts into slots, controlling the prompter, and building and using the edit pack |
| [docs/AI-SCRIPT-BRIEF.md](../AI-SCRIPT-BRIEF.md) | The script rules, as a prompt (Help > Copy the AI Script Prompt) |
| [docs/SCRIPT-DIRECTIVES.md](../SCRIPT-DIRECTIVES.md) | The full `{directive}` spec |
| [docs/EDIT-PACK.md](../EDIT-PACK.md) | What's in an edit pack and how to cut with it |
| `scripts/check-script.mjs` | Checks a script: `node scripts/check-script.mjs script.md` |
| `scripts/sightline.mjs` | Drives the app, and lists your recordings and fetches their edit packs: `node scripts/sightline.mjs status` |
| `scripts/edit-pack.mjs` | Builds an edit pack from any take log JSON |

## Claude Code or Codex

These run on your computer, so they can check scripts, load them into
Sightline and read its take logs.

**1. Get the files.** In the next candidate, use **Settings > About > Components
> AI agent kit > Install**, then **Open folder**. It copies the skills, briefs,
samples, checker and command tool from the installed app. No clone or npm
install is needed. Read START-HERE.md and use that kit folder below wherever
the instructions say clone. The Components page checks for Node.js 22.16 or
later; Node.js is needed for these commands, not for normal prompting.

**Controls > AI & API** reports whether these supplied command tools are
ready and links to Components when setup is missing. The API itself works
with other clients without Node.js or the kit. Its token controls become
available after enabling the API and applying the change.

With the current public release, or if you prefer working from source,
install [Node.js](https://nodejs.org/) 22.16 or later, then clone the repository:

```
git clone https://github.com/JoJo-1965/sightline-prompter.git
```

The installed app doesn't need to change: the skills use the clone for the
spec, the checker and the `sightline` command.

**2. Tell your AI where it is.** Set `SIGHTLINE_HOME` to the clone's folder:

- Windows (Command Prompt): `setx SIGHTLINE_HOME "C:\path\to\sightline-prompter"`, then open a new terminal
- Mac or Linux: add `export SIGHTLINE_HOME="$HOME/path/to/sightline-prompter"` to `~/.zshrc` or `~/.bashrc`

**3. Add the skills.**

- **Claude Code:** copy the two folders in `skills/` to `~/.claude/skills/`
  (every project) or to your project's `.claude/skills/` (that project only).
  Start a new session. Claude uses them when you ask for a Sightline script
  or session, or call them by name: `/sightline-script`,
  `/sightline-session`.
- **Codex:** Codex reads `AGENTS.md`. Add this to the `AGENTS.md` in your
  project (or `~/.codex/AGENTS.md` for every project):

  ```
  ## Sightline Prompter
  Sightline is at $SIGHTLINE_HOME.
  - To write or check a teleprompter script, follow $SIGHTLINE_HOME/skills/sightline-script/SKILL.md.
  - To load scripts into Sightline, control it, or use its take log and edit pack,
    follow $SIGHTLINE_HOME/skills/sightline-session/SKILL.md.
  ```

**4. Let it run the prompter (optional).** See [Letting an AI run the prompter](10-setting-up-your-ai.md#letting-an-ai-run-the-prompter) below. Writing scripts and using take logs don't need it.

**Try it:**

- "Write module 3 as a Sightline script, with a target for each section."
- "Load modules 1 to 4 into Sightline slots 1 to 4."
- "Make the edit pack from today's take log for M2, and list the take to use
  for each section. The first slate is at 0:12 in my recording."

## Letting an AI run the prompter

On **Settings > Controls > AI & API**, under **AI and remote control**:

- Tick **Let an AI assistant or script on this computer load scripts and
  control the teleprompter**, and save. It's off until you do.
- **Port** is where Sightline listens (on this computer only). Leave it as
  it is unless another program already uses that number.
- The **token** is the secret an AI or script must send. Sightline writes it,
  with the address, to `remote-control.json` in its settings folder, where
  Claude Code and Codex read it, so you don't usually need it.
  **Copy token** is for a script of your own.
- **New token** locks out anything that had the old one.
- The line below says whether the API is running, and its address.

Turn it off when you don't need it. Requests from web pages are always
refused, and the API can't switch itself on.

What an AI can then do (load scripts into slots, play, pause, jump sections,
change speed, drop markers, rate takes) is listed in
[Working with AI](09-working-with-ai.md#2-record-let-the-ai-run-the-prompter).

## ChatGPT, Claude or Gemini in a browser or app

These can't reach your computer, so they write scripts and read the files you
give them, but can't run the prompter.

- **Writing:** in Sightline, **Help > Copy the AI Script Prompt**, and paste
  it into your project's instructions (a ChatGPT Project or GPT, a Claude
  Project, or a Gemini Gem). Add
  [SCRIPT-DIRECTIVES.md](../SCRIPT-DIRECTIVES.md) as a project file if you want
  the full spec to hand. Then ask for a script and paste it into Sightline
  (Edit, or save it as a `.md` file and open it).
- **Editing:** after recording, **File > Export Edit Pack…**, then upload the
  pack's `README.md`, `take-log.json`, `sentences.csv`, `edit-marks.csv` and
  `captions.srt`, and ask, for example, "Which take should I use for each
  section, and where do I cut? The first slate is at 0:12 in my recording."

## Keeping it private

Scripts, take logs and edit packs stay on your computer unless you upload
them. The `sightline` command never prints the token, and the skills tell
the AI not to send your files anywhere unless you ask.
