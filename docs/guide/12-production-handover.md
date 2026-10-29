# From recording to the editor

**Development branch: not yet released.** This workflow includes the optional
OBS connection and head-position guide. Physical camera lip sync, normal
speech commands and the Stream Deck recording keys still need hands-on checks.

## 1. Set up before the session

Open the right script and check its section names and slide cues. Keep delivery
directions such as `[smile]` or `[point]` in square brackets: they stay visible
without counting as spoken words. No extra OBS directives are required.

In **Settings > Scrolling**, enable scratch audio and choose **Flash and beep**
for the slate. Scratch audio is an independent microphone reference, not your
production master. Choose steady or voice scrolling for the session. In voice
mode, take your own beat at timed pauses; `{stop}` still holds the prompter.

In **Settings > OBS**, connect to OBS and allow recording controls. With OBS
stopped, enable **Include the slate in the OBS recording**, **Apply**, then
**Prepare recorded slate**. Prepare again after restarting Sightline or changing
the OBS scene. Include OBS audio track 1 so the recorded tone reaches the file.

![The OBS settings tab, including recording controls and recorded-slate preparation](images/settings-obs.png)

For the Academy setup, check the camera and output are **3840 × 2160 at 30 fps**.
Keep the microphone before OBS processing. The workstation test used **48 kHz,
24-bit PCM**, with a separate clean camera recording and microphone track.
Those are OBS settings; Sightline does not set them automatically. The optional
[clean-camera setup](11-obs.md#separate-clean-camera-and-microphone) needs the
Source Record filter.

## 2. Frame yourself and make a short test

Show the head guide with **Ctrl+Shift+H**, its Stream Deck key, or **☰ > Window >
Head-position guide / unlock**. Use your saved ideal outline, then move and scale the
actual outline to match your head in the camera preview. These are manual
reference shapes; the app does not detect your face.

![The head guide and its framing controls](images/head-guide.png)

Use the saved **Centre** or **Beside panel** placement as needed. The guide
stays across script changes, and new takes save its ideal/actual outlines and
window position. **Ctrl+Alt+H** fills the guide's current monitor or restores
its window. On Mac, use **Cmd** in place of **Ctrl** for these shortcuts.

Put the OBS Preview Projector underneath, the guide above it and the prompter
text on top. Record camera sources rather than the whole desktop for this
setup. Inspect the actual test file: capture protection and a preview alone
cannot prove the guide is absent from every recording method.

Before the main session:

1. Choose **Record take** and wait for the slate to finish.
2. Make three visible claps, about two seconds apart, with the microphone in
   its normal position. Follow them with a few sentences at your usual level.
3. Choose **Finish recording**, then play the recorded file. Check picture,
   microphone, absence of the guide, and the recorded flash and tone.

The digital flash and tone identify the composed OBS recording. The claps
check the camera/microphone path. They are different measurements: do not use
the digital slate's audio delay as a microphone correction.

## 3. Record, pause and retake

| Control | What happens to the prompter | What happens to OBS |
| --- | --- | --- |
| **Record take** | Starts the usual countdown, slate and prompting after OBS confirms recording | Starts a recording if stopped, or uses the current recording |
| **Play / Pause** or a script `{stop}` | Starts or holds the script | Keeps recording |
| **On air** | Changes the on-air display and saved backing level | Does not start or stop recording |
| **Again** or a section jump | Returns to the relevant section for another take | Keeps recording |
| **Back to the marker** | Returns to the previous marker within the take | Keeps recording |
| **Keeper / Scrap** | Rates the current or most recent take | Keeps recording |
| Open another module | Saves the old script's take and scratch audio before loading the next script | Keeps the same recording running |
| **Finish recording** | Stops prompting | Asks OBS to finish and waits for confirmation |

An OBS recording paused outside Sightline must be resumed in OBS first.
If a command stays **confirming**, or the state becomes **unknown**, inspect
OBS before assuming anything has started or stopped.

Use **K** or **"Prompter, keeper"** for a good take, and **Shift+K** or
**"Prompter, scrap that"** for one to discard. Say your selected wake word,
leave a brief beat, then the command. **"Prompter, again"** prepares a retake;
**Shift+B** or **"Prompter, back to the marker"** returns to the last marker.
OBS stays recording through all of these actions.

Sightline picks the last keeper for each section, otherwise the last complete
take that was not scrapped. Check those choices before handing over.

## 4. Finish, export and collect the files

Finish recording and confirm OBS is stopped **before exporting**. This gives
Sightline the final main recording filename. Open **File > Recordings**, choose
each script's session and export its edit pack. A continuous OBS recording can
cover several modules; export a pack for every module used.

![The Recordings library, where sessions can be inspected and exported](images/recordings.png)

Give the editor these files together:

| File or folder | Why the editor needs it |
| --- | --- |
| Each module's complete edit pack | Takes, keeper choices, markers, timings, captions and scratch audio |
| The main composed OBS recording | The full session, including the recorded digital slate |
| The separate clean camera recording | Camera picture without composed overlays |
| The clean microphone master | Audio before OBS effects; PCM can be copied from its recording container to WAV without re-encoding |
| A short handover note | Module order, recording-file pairs, any OBS sync adjustment, and known problems |

**OBS videos and master microphone files are not copied into the edit pack.**
Collect them separately. Sightline resolves the main OBS filename when OBS
supplies it; it does not discover Source Record's separate file automatically.
The clean file can have a different start time and filename. Identify the
actual pair rather than assuming matching names mean matching clocks.

## 5. What the editor should use

Start with `take-log.json` and its section choices. `takes.csv` is the quick
take list; `edit-marks.json` and `edit-marks.csv` contain markers and restarts.
Word and sentence detail depends on speech tracking; steady scrolling does
not supply a verified word-by-word reading.

The development edit pack also includes these files when that information was
captured:

- **`script-snapshots.json` and `script-001…` files:** the actual source and
  rendered script tied to the take, including its directions and slide cues.
  Use this version rather than a later revision of the working script.
- **`recorded-sync.json`:** recorded-slate reference IDs, section/take links,
  recording IDs and estimated OBS positions. A browser acknowledgement means
  the slate ran; verify its flash and tone in the recording itself.
- **`head-guide.json`:** the saved ideal and actual outlines and window
  geometry. It describes framing references, not detected head movement.
- **Scratch WAVs:** independent microphone recordings placed on the take-log
  clock by the log's `audio` entries. They are reference audio, not masters.

For precise cuts, locate a recorded reference and align the take-log clock to
the file. Check later references for drift. Match the clean camera/microphone
recording separately using the physical clap or shared room audio; it does
not contain the composed digital flash. OBS status times are estimates, not
frame-accurate file positions.

Record any applied OBS sync offset in the handover note. Correct a measured
gap once, then verify normal speech. Do not apply the same correction again
in the edit. An unknown filename or offset should stay unknown until checked.

See the [edit-pack reference](../EDIT-PACK.md) for field meanings, and
[Recording with OBS](11-obs.md) for connection settings and troubleshooting.
