# Sightline Prompter features

**RC14:** shared On top/Clean view/mode controls, optional Call overlay preset,
three-mode operator window, companion 0.2.1.7 Display choices and opt-in profiles.
MCP adds explicit display states and paused modes, with existing grants and
legacy control IDs retained. [Compatibility contract](CONTROLLER-COMPATIBILITY.md).


**RC13 preview:** direct Voice/Page/Scroll and page-navigation
buttons; recoverable Clean view, Click-through and On top; plain-text Auto
format with optional starter cues/checks/pace and preview/Undo/Save. Source
checks pass. Included in RC13; frozen RC12 remains unchanged.

**RC13:** Ctrl+E **Insert…** provides 41 grouped templates
covering every directive family, silent/pointing cues, production notes and
headings. Cursor insertion, editable values, Undo and Save are checked; samples
stay protected. Included in RC13; frozen RC12 is unchanged.

**RC12 preview · 12 November 2026:** combined recording and interface fixes.
Help, Settings and window controls form one upper-right toolbar group. The full
editor uses Close when saved and Cancel while dirty, including Undo. App-owned
dialogs remember their own screen and bounds, starting on their parent's screen.
Enabled button labels are speakable in the foreground Sightline dialog while
command listening is on; native OS prompts retain normal controls. Voice checks
wait for speech and finish after sustained silence or ten seconds; no speech is
incomplete. Sightline is an optional wake word. Capture requests AGC off and logs
actual input processing locally; short takes retain raw readings without a
misleading quiet verdict. Heading-aware Voice boundaries and recorded Retake
fallbacks are included. [RC12 checks and limits](uat/1.3.0-RC12.md).

**RC11 preview:** paused double-click paragraph editing with Save/Cancel,
visible line breaks and source preservation. Small windows use a slot picker;
window controls stay top right on the first row. Native checks cover editing,
conflicts, held Voice resume and compact layouts. Human microphone UAT remains.

**RC10 Voice boundaries:** `{stop}` prepares the next spoken passage without
holding Voice. Retake returns to the completed section until you speak the next
passage; no extra Go is needed. Stops and timed pauses still control Scroll.
Use an explicit spoken Pause for a deliberate Voice hold, and finish recording
explicitly after the final passage. Off-script and sound-check holds remain.


**1.3.0 RC9:** independent script paragraph spacing (0–300%) in the existing
appearance controls, with settings/theme persistence and legacy defaults.
Nearby ordered phrases improve Voice continuity; Scroll catch-up speed
controls movement rather than recognition. Bookmark flags are removed while
navigation, logs and enabled OBS chapters remain.

**1.3.0 RC8:** record/start recording/begin confirms OBS before prompting;
go/practice/start practice runs the prompter with OBS unchanged. Gold voice
acknowledgement is mirrored into Settings; OBS setup stages explain their gates.

**1.3.0 RC7:** guided OBS setup loads sources when the optional replay buffer
is unavailable. Active outputs and unknown states still block changes.

**1.3.0 RC6:** bare and timed `{pause}` directives are Scroll-only. Voice
follows natural beats, including linked recording. Explicit `{stop}` and
spoken pause commands remain deliberate. Paused review also leaves opening
comments clear of floating controls. See [RC6 notes](RELEASE-1.3.0-rc.6.md).
These corrections retain the 268 existing feature-grid rows.

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
italic and line spacing. RC9 adds separate script paragraph spacing. Choose a theme or save your current reading appearance.
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
remains private. [Get the free plugin on Elgato Marketplace](https://marketplace.elgato.com/product/sightline-prompter-34676f28-e2e5-422d-9b48-e03dfd80bebe),
where it is listed as version 0.2, or use the direct installer with the app
release. Configuration and capabilities vary by device/action.

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

RC12 dialog speech also covers the separate guide, guide-adjustment and
recording-review windows, using the same listener and rechecking the focused
window and enabled button before dispatch. These windows do not open another
microphone. Native operating-system dialogs retain normal controls.
