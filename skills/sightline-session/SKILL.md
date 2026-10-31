---
name: sightline-session
description: Use when working with Sightline Prompter around a recording session: loading scripts into its nine slots before recording, controlling the prompter (play, pause, sections, speed, markers, keeper or scrap), checking its status, and afterwards fetching the take log and building the edit pack (takes, word timings, sentences, edit marks, captions) to pick takes, plan cuts or make captions for the recording.
---

# Running a Sightline session: before, during and after

**Where Sightline is:** the managed AI kit from **Settings > Components
> AI kit > Install > Open folder**, or the Sightline Prompter source folder, a clone of
https://github.com/JoJo-1965/sightline-prompter. Use the `SIGHTLINE_HOME`
environment variable if it's set; otherwise, if this skill sits in that
repo's `skills` folder, it's two folders up; otherwise ask the user. Below,
`<sightline>` means that folder.

Everything goes through one command, which reads the app's address and secret
token itself and never prints the token:

```
node "<sightline>/scripts/sightline.mjs" <verb> …
```

Run it with no verb for its help. Never read out, print or copy the token
from `remote-control.json`.

## Before: load the scripts

For occasional configuration, Help > Getting started links to existing setup
screens; Tools > Session check links to script review, sound, framing, enabled
OBS and sync checks. Components and Debug are top-level Settings groups. These
statuses cannot certify a captured camera or microphone. Refresh after changes.

About > Restore defaults is a native, confirmed restart into onboarding. It
retains installed components, script files, recordings and service keys, but
clears preferences, slots and pairings and disables integrations. It is not an
API action. Never use it as a routine fix or trigger it without the user's
explicit reset request; it blocks recording, editing and component maintenance.

The optional native-only OBS setup assistant lives under Recording > OBS setup.
It requires local OBS, configured sources, idle outputs and an explicitly
reviewed plan. Do not create profiles through unrelated automation or claim
that a 4K canvas proves native capture or that MKV mic tracks are separate WAVs.
Read docs/guide/15-obs-setup.md for the clean-output and physical-test steps.

### Optional OBS integration (1.0.7 release candidate)

The user must enable the integration in **Settings > Recording > OBS connection**
and allow controls in **Recording > OBS recording** themselves. These settings
are protected from the API and script files. Use the private Stream Deck
0.1.9 companion for physical recording-key checks. The public 1.0.6 app does
not contain OBS integration. See the [acceptance walkthrough](../../docs/guide/14-acceptance-test.md)
for the two sample scripts and the remaining manual checks.
The status response now includes appVersion and streamDeckApi; commands is
the capability list. Use both versions and command support rather than
assuming a version number grants OBS access. Legacy builds may omit version
metadata; leave it unconfirmed. The authenticated plugin hello is only a
local compatibility report, not proof of the caller's identity or an update feed.
Never ask for, print or copy the OBS password. No extra OBS plugin is needed.

Once enabled, `command obs-record` confirms OBS is recording before it starts
prompting; `command obs-finish` stops prompting and asks OBS to finish. The
command route only acknowledges dispatch: inspect `status.obs` for confirmed
state, and treat a disconnected or null recording state as unknown. Normal
play, pause, again and On air do not control OBS. Do not stop recording
without the user's instruction to finish that recording.

The edit pack's `take-log.json` can contain OBS observations and a confirmed
recording path after stop. Read [docs/EDIT-PACK.md](../../docs/EDIT-PACK.md)
for fields and timing limits. The recording file is not included in the
pack, and the observation times do not replace slate or audio sync.

Optional recorded slates need a prepared source in **Settings > Recording > OBS recording** and
track 1 in the OBS recording. `recorded-sync.json` links browser acknowledgements
to a section/take, the recording identifier, UTC times and log-clock `t`.
Locate the actual flash in the file and map it to `t`; do not use the OBS
poll as an exact edit point. A digital flash/tone does not establish physical
camera lip sync. A clean Source Record file has its own start offset and is
not discovered by this manifest. Preserve it and the independent scratch WAV.
Module changes flush the old take/audio before loading another script.

Controlling the app needs its local API switched on, once, by the user:
**Settings > Controls > AI & API**, tick **Let an AI assistant or script on this computer
load scripts and control the teleprompter**. If a command says Sightline
can't be reached, ask the user to open Sightline and tick that box. Don't
try to switch it on any other way.

- `status`: the open script, slot, section, speed, progress and what's in
  each of the nine slots. Start here.
- `open "<script file>" <slot>`: opens a script file where it is, into slot
  1 to 9. Edits to the file show in the prompter as they're saved.
- `load "<script file>" <slot>`: sends the text; the app saves its own copy.
  Use `open` when the user will go on editing the file.
- `slot <n>`: switch to a slot.

Check each script first with the `sightline-script` skill's checker.
For a batch session, put the scripts in slot order (module 1 in slot 1, and
so on) and finish with `status` to confirm.

## During: control the prompter

The OBS development branch also supports `command head-guide` independently
of OBS: show the framing overlay, unlock it if locked, otherwise hide it.
Check `/status` for `showHeadGuide`, `headGuideLocked`, and `commands`
containing `head-guide`. The global shortcut is Ctrl+Shift+H (Cmd on Mac).
It is not an OBS source; do not promise exclusion from every display-capture
method without checking. No script directive or video/audio capture is added.

`command head-guide-fullscreen` opens/toggles borderless screen-fill on the
guide's current display, with a window-size restore. Check advertised command
support first. Status adds `headGuideFullscreen` and `headGuideChromeless`;
Ctrl+Alt+H is the matching global shortcut. `head-guide` reveals controls
without leaving fullscreen when the guide is locked or chromeless.

`command <action> [value]`, where action is one of: `play`, `pause`,
`toggle`, `restart`, `next-section`, `previous-section`,
`go-to-section <n>` (the n-th `##` section), `faster`, `slower`,
`reset-speed`, `set-wpm <words a minute>`, `marker`, `back-to-marker`, `keeper`, `scrap`,
`sound-check` (the sound-check meter on or off: the mic's level, loudness and
the room's noise), `scroll-mode` (steady or voice scrolling), `pad` and
`control` (the floating pad and the control window open or closed), `help`. `window minimize|maximize|fullscreen` toggles the window.

The user may be recording. **Only send `play`, `pause`, jumps, `keeper` or
`scrap` when the user asks**, and never as a test. `status` is always safe.

## After: the take log and the edit pack

Head-guide snapshots also retain Actual/Ideal `width` and `height` ratios
(default `1` in older data), overall `scale`, and `eyesLocked`. This manual
eye-position lock is separate from click-through `locked`. Read the
[edit-pack contract](../../docs/EDIT-PACK.md) before interpreting the geometry.
RC7 also retains independent `top`, `bottom`, `left` and `right` ratios
(default `1`), `background` opacity and `controlsShown`. The floating
Guide adjustments window works over fullscreen/Clean/locked overlays.
Fit eye centre/level first, lock the eyes, then fit top/bottom and left/right.
These remain manual references, not detected head positions.

RC8 also moves Settings and F1 Help into separate movable windows with saved
geometry. Reopening Settings retains its draft; native Close and app exit
use the existing unsaved-change guard. The windows reuse the live controllers,
without starting a second microphone, speech tracker or recording engine.
RC10 also makes voice-command help movable, restores the phone QR in Settings,
moves Settings mirroring to Appearance > Screens and applies Hide from capture
to helper windows. The head-guide overlay keeps independent capture protection.

Sightline logs every take of every section as it's recorded, one file per
script per day, saved as it goes. These read the files, so they work with the
app closed:

- `recordings` (`--json` for the data): every recording session, newest
  first, with its **id**, name, takes, keepers, length, note and whether it's
  been edited. Start here after a session.
- `recording <id>`: one session's takes and which take of each section the
  edit uses.
- `recording-pack <id> [output folder]`: that session's edit pack (as
  `pack` below, but by id).
- `name <id> <name>`, `note <id> <text>`, `processed <id>`,
  `unprocessed <id>`: label a session, or mark it as edited once you've cut
  it. Only when the user asks, or as part of an edit they asked for.
- `logs`: every take log, with its path.
- `pace ["<script name>"] [yyyy-mm-dd] [--json]` (also `rehearsal`): each
  section's pace summary and every take's words, spoken and speaking time,
  wpm and target. A rehearsal is logged like any recording, so use this after
  a practice run to suggest `{target}` times.
- `heard ["<script name>"] [yyyy-mm-dd]`: what voice scrolling heard, lined
  up with the script, and the words it heard in place of script words, most
  often first. Use it to suggest corrections for words it keeps mishearing:
  the user adds them in **Settings > Prompting > Your words** (your word, then
  what it hears instead), and words that sound alike are already matched.
  For command checks, distinguish the wake word from the command. Leave a
  brief beat after the wake word and finish within four seconds. Avoid broad
  synonyms such as “prone to” for Prompter; they can occur in ordinary speech.
  Recording and guide states require explicit phrases or taught forms;
  conflicting taught forms are declined. Test command audio offline or in
  an isolated profile, so it cannot control a live recording.
- `takelog ["<script name>"] [yyyy-mm-dd]`: the path of one log (default: the
  open script, today).
- `pack ["<script name>"] [yyyy-mm-dd] [output folder]`: builds the **edit
  pack** from it: `take-log.json`, `takes.csv`, `sentences.csv`, `words.csv`,
  `edit-marks.csv`/`.json`, `captions.srt`/`.vtt` and a `README.md`. The user
  can also make one in the app with **File > Export Edit Pack…**.

Each take also has `loudness` (its loudness, peak, background noise and a
`clipping`, `quiet` or `noisy` warning) when it was measured, and
`take-log.json` has `soundChecks`: the room and voice checks a
`{soundcheck: …}` in the script ran before recording, with a verdict each.
Mention a `noisy` room, a `clipping` voice or warned takes when you report
on a session.

**Read the pack's `README.md` (or `<sightline>/docs/EDIT-PACK.md`) before
using it.** It explains the session clock (0 is the first slate), how to line
the pack up with a recording, and every file and column.

Typical jobs:

- **Pick the takes:** `sections` in `take-log.json` (or `use` in `takes.csv`)
  gives the take to use for each section: the last keeper, else the last
  complete take not scrapped. Report sections with no usable take.
- **Plan the cuts:** ask the user where the first slate's flash or beep is
  in the recording (or find it, if you can analyse the video), then give in
  and out points in video time for each picked take: from just before its
  first `sentence` mark to just after its last word, starting from the second
  reading at any `reread` mark.
- **Script against what was said:** from `sentences.csv`, the sentences
  with words missing (`complete` = no) in the picked takes, and another take
  that said each one in full.
- **Captions:** `captions.srt` in the script's own wording, shifted by the
  slate offset and trimmed to the cuts.

Word timings, sentences and captions exist only for takes read in **voice
mode**; steady-scrolling takes have their times but no words. Times are the
prompter's best knowledge, not frame-accurate, so say so with any cut list.

## Production references on the development branch

On the OBS development branch, prefer each take's `scriptSnapshotId` and
the pack's `script-snapshots.json` over reopening a source file that may
have changed. `obsStart`, `obsEnd` and event `obs` fields are estimated
recording-clock positions; resolve `recordingId` through `obsRecordings`.
Null/stale/split-file positions are unknown, not zero. Guide snapshots
include manual Ideal/Actual poses, live bounds and capture-status wording;
they do not establish face tracking or verified recording exclusion.
Publication remains held until all five production requirements are validated.

## Don't

Commands-only listener health is available as `listenerHealth` in status.
Recovery is bounded and respects listening-off and script mute. The user can
use Prompting > Commands > Restart listening. Command-word text tracing is
off by default and must be explicitly enabled in Settings > Debug for troubleshooting;
entries have `mode: "commands"`. Do not enable it through automation. It may
include surrounding conversation, so ask the user to switch it off afterwards.
`padLayout` in status describes the shared phone/pad layout; hardware Stream
Deck profiles keep separate assignments. Configure layouts in Controls > Pad.
The next candidate also accepts `padLayout` through POST /settings. Verify it
appears in `applied` and read back status; RC14 silently dropped that object.
`captureOverride` in status is diagnostic only. The user toggles it manually
in Settings > Debug; do not enable it through automation. It resets
on app restart and may let the guide appear in a recording. Phone “sent”
feedback acknowledges dispatch; use returned state to confirm the effect.

For recognition diagnosis, compare the original source with the captured
microphone and check input level before teaching aliases for missing lines.
The [quiet synthetic-capture investigation](../../docs/VOICE-VALIDATION.md)
recovered every sentence using gain on an analysis copy; microphone and
master recordings were unchanged. That replay is not a live voice pass.
Use normal speech at the usual mic distance for the next calibration, and
distinguish Sightline's input from another app's recording fader.

- Don't edit, move or delete anything in Sightline's take-logs folder
  yourself: read it, build a pack somewhere else, and use the verbs above to
  name or mark sessions. `delete-recording <id>` moves one to the Recycle Bin,
  only works if the user allowed it in Settings > Controls > AI & API, and only ever on
  the user's say-so for that session.
- Don't send take logs, scripts or packs to any online service unless the
  user asks: they hold the user's script.
- Don't change Sightline's settings unless the user asks.

## Review a rehearsal (next candidate)

`node "<sightline>/scripts/sightline.mjs" coach "Script name" yyyy-mm-dd --json`
reads the saved session's per-take pace, sentence coverage/rereads and optional
recognised filler/repetition counts. The edit pack has the same report in
`rehearsal-coach.json`; GET /recording adds `coach`. Unmatched lines can be
recognition errors, deliberate changes or partial readings. No word timings
means unavailable coverage, not missed speech. Never change keepers or make
automatic cuts solely from this report. Filler counting defaults off and is
protected from API/import changes; the user enables it in Recording > Takes.

## Optional component checks

Controls > AI & API reports readiness of the supplied kit commands, which need
Node.js 22.16 or later and the kit. Other API clients do not need either.
Components checks optional OBS/Stream Deck apps and the local plugin
manifest. Installer/Locate links handle missing copies. Installed files do
not confirm a live connection or the newest third-party version; retain the
OBS connection and Stream Deck protocol checks. OBS on another computer needs
no local installation. Component discovery never enables recording permissions.
