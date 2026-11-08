# Sightline Prompter features

**Queued after RC5:** bare and timed `{pause}` directives are Scroll-only.
Voice follows natural beats, including linked recording. Explicit `{stop}`
and spoken pause commands remain deliberate. This source correction is not
in the frozen RC5 package and does not add a feature-grid row.

## 1.3.0 RC5 heading lead-in

In Voice mode, optionally start at the H2 section title for a spoken warm-up
before the actual script. Cold starts, section navigation and retakes use the
preference; the editor retains the heading/body distinction. The option defaults
off and does not affect Scroll/Notes. See [voice guidance](guide/03-scrolling-and-voice.md)
and [RC5 notes](RELEASE-1.3.0-rc.5.md). The feature count remains 268.

## 1.3.0 RC4 HUD preview

Short delivery directions use a gold HUD pill while reading; paused Review
keeps the inline bracket view. Pointing targets use the saved head reference,
stay fixed during the cue and sit behind spoken text. One optional HUD visibility
function is available across controller mappings and companion preview 0.2.1.6.
Read the [HUD guide](guide/22-hud-cues.md) and [RC4 notes](RELEASE-1.3.0-rc.4.md).
The preview grid has 268 entries; the stable summary below remains 1.2.0.

## 1.3.0 RC3 pointing cues

Silent `[point left: graphic-label]` cues cover four directions, diagonals and
centre. Left/right mean the presenter's own sides. Existing inline appearance
controls apply; labels stay silent even in quotes. Captured scripts preserve
intent and per-take edit-pack occurrences, with qualified spoken-word anchors.
The production agent verifies the actual gesture and recording orientation;
Sightline does not insert an asset or detect the pointing movement.
Try the **Pointing and graphic cues** sample and read the
[RC3 notes](RELEASE-1.3.0-rc.3.md).
The [authoring/production contract](POINTING-CUE-AUTHORING.md) keeps graphic
labels, presenter directions and spoken anchors consistent in plan and script.

## 1.3.0 RC2 controller additions

Companion 0.2.1.1 groups related new assignments with function-specific icons.
Preparation, reviewed export, explicit reading modes, Again, OBS pause/resume,
display-only status and configurable adjustment dials supplement the existing
controls. Published UUIDs and saved layouts remain intact. Read the
[controller guide](guide/21-controller-functions.md) for gates and limits.

## 1.3.0 RC1 additions

The candidate adds [post-record review](guide/19-post-record-review.md), timed
transcript import, expected/heard candidates, command cut ranges and measured
file offsets. A [guided tour](guide/20-guided-tour.md) is optional, cancelable
and rerunnable. Local transcription needs a separate optional Python runtime
and model; import works without it. These additions require RC1.
The stable feature summary below remains 1.2.0; the detailed grid labels both.

**Sightline 1.2.0 · Stream Deck companion 0.2.0 · 4 November 2026**

The [full feature grid](FEATURE-GRID.md) is the detailed reviewer reference:
249 capabilities in 18 groups, with options, requirements and limitations.
Use its [searchable HTML](FEATURE-GRID.html) or [comparison CSV](FEATURE-GRID.csv).
This page groups the product's main functions; it does not mix future plans
with shipped features. [Development history](FEATURES-DEVELOPMENT-HISTORY.md)
and the [roadmap](../ROADMAP.md) are separate.

## Scripts

Open Markdown, text, Word, PDF or a supported Google Docs link. Edit Markdown
in the app, retain recent files and nine script slots, and watch external edits.
Sections, pacing targets, stops, countdowns and markers can guide the read.
Production comments hide during delivery; inline cues remain separate from
spoken words. Protected samples can be saved as personal copies.

## Scrolling and pacing

Choose Scroll, Voice or Notes / page mode. Use the controls that apply to that
mode, navigate sections and markers, pause or restart, and monitor pacing.
Voice following uses local recognition after the model download, with optional
Deepgram. Recognition and pacing are estimates, not a transcript of record.

## Reading and accessibility

Keep the script translucent over a call, slides or a camera picture. Configure
speech, headings, cues and comments independently: font, size, colour, bold,
italic and line spacing. Choose a theme or save your current reading appearance.
Adjust backing colour/opacity, margins, reading line, focus band, markers,
eye-line strip and mirroring. Themes exclude device credentials and scripts.

## Prepare to record

Align manually or use the bundled local face/eye-position detector. The
preparation window and Ctrl+Shift+H guide share a fixed target, Lock current
and recording reference. Distance feedback accounts for custom guide width
and side adjustments; it compares apparent face size rather than metres.

The guide's bottom toolbar hides to a recoverable hover tab and stays above
the prompter. Pin, lock/unlock, fullscreen, Move guide, Adjust and Guide off
remain accessible. Calibration stays in Guide adjustments until you choose
the full workflow. Guide off releases a picture running only for the guide.

Measure room and voice levels, listen to a real short test and explicitly save
the reviewed reference. Quiet/noisy results are advisory; unusable input needs
correcting. Restore the reference after a break and recheck the real picture
and sound. Manual placement and the production capture route remain your checks.

## Controls

Use keyboard shortcuts, custom clickers/pedals, a game controller, floating pad,
phone remote or upright control window. Optional interfaces have enable gates.
Mapping lists show every assignment and pad layouts show every configured
button, with drag and Earlier/Later ordering. Complete lists scroll.

### Stream Deck

The 0.2.0 companion supplies keys, supported dials and pedal actions, starter
profiles, status feedback and connection/version checks. Its source repository
remains private; the free installer accompanies the app release. Marketplace
review is separate. Configuration and capabilities vary by device/action.

## Recording setups

### OBS

One Connections home contains Connection, Recording control and Profile and
scenes subtabs. Connection and recording state are distinct. Explicit recording
commands and optional linked prompting require recording permission. Recorded
slates, markers and file/clock observations support the handover.

Choose an OBS calibration scene without switching the programme scene or
starting a recording. OBS-only controls hide when unavailable or disabled.
Temporary virtual camera capture preserves an existing virtual output and
stops only one Sightline started; a lost connection can require manual checking.
The optional setup assistant reviews a separate profile/scene plan before applying it.

## AI-assisted production

Your preferred AI can write a structured script from the published brief.
The optional local API and stdio MCP adapter let authorised clients inspect
status, load scripts, select slots, control prompting and access recording
information. MCP is read-only by default, with separate script/prompt/record
grants. It is not a cloud MCP endpoint or automatic editor.

Take logs and edit packs retain sections, retakes, keeper choices, markers,
script snapshots, available recorder references and optional scratch audio.
Live word alignment, coverage, pace and draft captions need review against
the recording. They are navigation/editing aids, not dependable word-level cuts.

## Voice

Use configured “Prompter” commands for prompting, navigation, markers and take
choices. Finish/end, recording on/off/pause/resume and section/restart aliases
are supported where the corresponding feature is enabled. Recorder permission
and confirmed state remain important. Background noise and difficult phrases
can still affect recognition; use another controller when needed.

## Help and installers

Getting started is prominent; the welcome tour and focused samples demonstrate
safe recording practice. Help, tooltips, shortcuts, offline user guide and this
feature reference accompany the build. Optional component checks and MCP setup
live beside their interfaces. Voluntary coffee reminders do not restrict use.

Installers target Windows, Mac (Apple silicon/Intel) and Linux. Mac bundles use
verified free ad-hoc signing and are not notarised. Read the installation guide.
Keep using your usual recorder for production video, and verify device support,
capture exclusion and actual picture/sound sync on your setup.
