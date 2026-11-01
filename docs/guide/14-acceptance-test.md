# Recording acceptance walkthrough

**Published baseline: Sightline 1.1.0 + Stream Deck 0.2.0.**
The installed 0.1.9 remains compatible for its existing controls. Neither
updated package is installed by preparing it. Add these checks after installation:

- Short Finish recording press must do nothing; a one-second hold finishes.
  Repeat with the OBS Pedal and a disconnected/revoked-permission setup.
- Choose session status on the Status key. Check reported state and open
  the Session check while prompting is paused. Read a blocked action's reason.
- Test listening off/on and recovery with the normal microphone. Confirm
  saved Always/off preference is retained and OBS keeps recording.
- On +/+ XL, show the guide fullscreen, move eye X/Y, lock eyes, then fit
  all four edges. X/Y must stay fixed; ideal visibility and restore must
  preserve the saved ideal. Confirm the edit-pack guide metadata matches.

The next unpublished recording preview adds the checks below. Source and
published guides can differ; check Help > About before following preview steps.
The [freeze record](../BUILD-FREEZE-1.1.0.md) and RC1–RC14 notes retain the
earlier test history and do not describe today's installed version.

## Next-preview recording check

1. With recording stopped, select a slate and Apply. Reopen Settings to confirm
   it. Previous/Next must name their destination and disable at the bounds.
   Stream Deck setup should have one home under Controls.
2. Use the **Recording preview** sample. Long production comments show while
   paused and hide during delivery; short cues stay visible. The first spoken
   line should be ready when prompting starts. Comments add no spoken words.
3. Save a recording reference, move Actual and restore it. Ideal must not change.
   Keep the guide out of the production capture and confirm this in a real file.
4. In Continuous mode, start recording, pause the prompter and retake a section.
   OBS must keep recording. Use Finish recording explicitly at the end.
5. With OBS stopped, enable **Link recording to prompting**. Play must confirm
   recording first; pause/resume must retain its identity; reaching the final
   stop finishes it. The chosen format must support pausing. Test a short file.
6. Try “Prompter, record on”, “record pause”, “record resume” and “record off”.
   Confirm the state pill, then test optional directives only in a disposable
   recording. Loading a script must never start recording. OBS off hides its help.
7. Accept a sound-check warning with Continue anyway. Check the measured result
   and acceptance in the take log. Keep scratch audio and inspect the exported
   script, recording-clock references and saved guide reference together.
8. In the directions appearance follow-up, open **Appearance > Directions**.
   Adjust inline directions, then production notes: each has separate size,
   colour and line spacing. Reset one colour to Theme without changing the
   other. Hide inline directions and check paused production notes remain.
   Start prompting: production notes hide, quoted inline speech stays readable.
   Restart the app and check the saved appearance. Settings must keep its size
   with no scrolling, and live changes must not ask to save a pending draft.

## Earlier RC history
RC1 established the feature baseline. RC2 updates the bundled help and adds
both acceptance scripts to **Files (☰) > Sample scripts**.
RC3 adds compatibility reporting with plugin 0.1.9; older candidates do not
show the plugin's reported version in Settings.
RC4 adds persistent labels to the toolbar sliders. It uses the same 0.1.9 plugin.
RC5 adds eye-position locking and independent head-outline width/height.
RC6 adds toolbar Edit beside Tools, a dropdown anchored to Tools, and Settings
centred on opening and window resize. The matching plugin remains 0.1.9.
RC7 adds floating guide adjustments, eye-first four-edge fitting and separate
Background/Outline sliders. The same plugin remains compatible.
RC8 gives Settings and F1 Help separate movable windows, with saved geometry,
stable topic sizes and a Settings draft guard when closing the window or app.
RC9 adds optional Windows installer finish choices for offline release notes
and Getting Started. The matching Stream Deck plugin remains 0.1.9.
RC10 fixes the phone QR image, gives voice help a movable native window,
moves mirroring to Screens and honours Hide from capture for helper windows.
RC11 keeps Settings above the fullscreen prompter and improves OBS button contrast.
RC12 adds Comment size and Comment colour under Appearance > Text. Comments
follow Heading font, independently of heading size; Theme restores their colour.
RC13 adds custom pad/phone layouts and bounded listening recovery. Under
**Controls > Pad**, choose Reading or Studio, reorder a button and check that
the phone shows the same order. **Prompting > Commands** shows listening
state and Restart listening; command-word tracing is off by default.
RC14 moves the optional trace to **Debug**, alongside support logs.
Enable it only to investigate a mishearing, Apply, then turn it off afterwards.
It can capture nearby conversation while Always listening is enabled.

At that earlier RC stage the public app was **1.0.6** and the candidates were
private test builds. Today's published baseline is **1.1.0 / 0.2.0**, as above.

### Additional checks for the next candidate

Under **Controls > Pad**, select **Framing & checks > Use preset**, or add its
buttons to your existing layout. Verify the same order on pad and phone.
Open **Adjust guide** on each: align Eyes, lock them, fit Outline edges, then
use Compare to change contrast, show/hide Ideal and restore Actual. The saved
Ideal must stay unchanged. Session check should report software state locally;
the full checklist is available on the PC while prompting is paused.

Test listening off/on and Restart listening on both surfaces with the normal
microphone. These must not stop OBS or change the saved listening preference.
Tap Finish briefly: OBS must continue. Hold for one second: one Finish request
should be sent. Repeat after a connection loss. The **Hold Finish recording**
checkbox in Controls > Pad affects pad and phone; Stream Deck has its own
per-key setting. Restore your normal layout and leave protection enabled.

RC14 does not yet include this batch. After the next candidate is approved
and installed, check the seven Settings groups and the five named Components
subtabs; each component should keep its status and actions together. OBS
connection/recording/setup belong under Recording. Confirm the Settings frame
stays the same size without scrolling and your draft survives navigation.

On a disposable profile, **About > Restore defaults…** should offer Cancel as
the initial choice. Cancel must preserve the setup. Confirm only when you want
to clear preferences, layouts, slots and pairings and restart onboarding.
Installed components, original script files, recordings and service keys must
remain. Do not run this check on a production setup you want to keep configured.

Reopen **Getting started** from Help, then use **Tools > Session check…**.
Try its links and Refresh. Disabled OBS should have no session recording row;
known configuration must not be labelled as a passed physical recording test.

The optional [OBS setup assistant](15-obs-setup.md) can be inspected without
applying it. On a disposable setup, review the chosen camera/mic, folder,
canvas and new names before Create. Confirm existing setups remain available,
the previous selection can be restored, and recording/streaming/replay block
creation. Verify native capture quality, clean outputs and physical sync in
actual files before using the result for production.

Allow about **15 minutes** for setup and the recording walkthrough. Read
ordinary text aloud and square-bracket instructions silently. The numbered
checks identify a failure without needing to describe the whole session.

## Prepare the matching build

Close other Sightline copies before opening the preview. Check its build under
**Help > About** and its local build notes. Use the published **0.2.0** plugin;
its archive manifest uses **0.2.0.0**. Earlier 0.1.9 assignments remain supported.
Select the matching
**Sightline … OBS** profile in Stream Deck. Keep existing profiles.

The required physical keys are **Record take**, **Play / Pause** and
**Finish recording**. Larger profiles also offer section navigation,
Keeper/Scrap, guide controls and slots. For missing keys on smaller devices,
use Sightline's controls or documented shortcuts and record that fallback.
A mouse fallback does not prove a physical Stream Deck key works.

## Preflight

1. In **Settings > Recording > OBS connection**, enable the connection,
   Apply and test it. In **OBS recording**, allow recording controls.
   These permissions must be chosen in Settings; the scripts do not enable them.
   In **Controls > Stream Deck**, choose **Check compatibility** and confirm
   both reported versions. In the plugin, open a key's settings and check its
   Test connection result. A compatible pairing still needs the physical tests.
2. With OBS stopped, choose **Flash and beep** in **Recording > Takes > Slate**.
   Enable **Include the slate in the OBS recording**, Apply, then
   **Prepare recorded slate**. Include OBS audio track 1.
3. Enable scratch audio under **Recording > Audio**. Select the normal
   microphone in Sightline and OBS. The Academy reference setup uses
   **3840 × 2160 at 30 fps** and an independent unprocessed microphone route
   at **48 kHz / 24-bit PCM**; those are OBS settings, not script commands.
4. Choose **Voice** scrolling. In **Prompting > Commands**, choose **Always**
   listening and wake word **Prompter** for these exact scripts. Leave a brief
   beat after the wake word, then finish the command within four seconds.
5. Put the OBS Preview Projector below the guide and Sightline text above.
   Use camera-source recording, keep the microphone at its usual distance,
   and preserve the current Ideal outline for the comparison check.
6. Open **RC acceptance: module A** from Sample scripts into **slot 1**, then
   **RC acceptance: module B** into **slot 2**. Return to slot 1.
   Samples opened from the menu belong to the slot currently selected.

See [OBS setup](11-obs.md) for the recorded source and separate clean files,
and [guide controls](06-remotes-and-screens.md#head-position-guide-development)
for the framing window. Do not start if setup is blocked; note the reason.

## Follow the scripts

Before recording, select section 3 in module A, then say **Prompter, section
one**. It should return to section 1. Say **Prompter, reset** and check the
top position, clock and pace reset. Do not reset after recording starts.

Start module A using **Record take** on Stream Deck. After the slate, stay
quiet for the room check and read the voice-check card. Use Play / Pause to
continue after each result. Follow the silent instructions in the script:

| Section | What to test | What should happen |
| --- | --- | --- |
| A1 | Three visible claps, ordinary speech and a section stop | Hands and voice are captured; Sightline holds while the OBS timer continues |
| A2 | Silent delivery notes, a timed beat, voice pause/go, help/cancel | Only spoken words are followed; no forced voice-mode countdown; grouped help opens and closes |
| A3 | Scrap, again, the Muffin pickup marker and Keeper | First attempt remains scrap, second is keeper; marker pickup and retake leave OBS recording |
| A4 | Eye centre/level, independent edges, background contrast, fixed Ideal, fullscreen and Lock | Guide adjustments toggles over the fullscreen guide; both eyes and other edges stay fixed during fitting; Background does not fade the outlines |
| A5 | Off-script hold and physical resume | Speech tracking stops listening; OBS and scratch audio continue; resume returns to the script |
| A6 | On air, text size and module handover | Saved display levels work; slot 2 opens while the same OBS recording continues |
| B1 | Record take during an existing recording | A new module/slate uses the same OBS recording; guide settings persist |
| B2 | Late clap and physical Finish recording | Final sync evidence is captured, then OBS confirms its stop |

At a section stop, **Next section** changes position. If it remains held,
use **Play / Pause** once to resume. Neither should stop OBS. Finish recording
only at the end of module B. Ordinary On air is independent of OBS recording.

If something fails, note the check, phrase/key and approximate recording time.
Say what failed on camera, then use a fallback to continue if practical.
Keep the failed result separate from the successful fallback.

## Review the evidence

After confirmed OBS stop, export a complete edit pack for each module.
Keep both packs, scratch WAVs, the composed OBS file and the separate clean
camera/microphone recording. OBS masters are not copied into the edit pack.

| Requirement | Evidence needed before passing |
| --- | --- |
| Exact script | Each module has its own source snapshot, section identities and slide note; unspoken directions are excluded from speech/pace data |
| Recording-to-take links | Both logs resolve the confirmed main recording file and identity; takes, markers and retakes retain their clock references and keeper choices |
| Session guide | Ideal/Actual poses and window geometry persist across modules; the actual recorded files contain neither guide nor prompter text |
| Clean camera and microphone | Separate 4K/30 camera and composed files, with the independent unprocessed PCM microphone route and playable scratch WAVs |
| Recorded sync | The actual composed file contains the intended flash/tone and matching manifest; early/late claps and normal speech establish physical camera/microphone timing separately |

The clean recording can have another filename and start offset. Sightline
does not discover Source Record's separate output automatically. PCM stored
inside MOV can be extracted to a standalone WAV without re-encoding; the
absence of a neighbouring WAV is not proof that microphone audio is missing.

Digital slate delay is not camera lip sync. Do not apply it as a microphone
correction. Estimated OBS clock positions are not frame-accurate cuts.

Use **Not run**, **Pass**, **Fail** or **Blocked** for every check. Keep the
actual build versions, recording filenames, pack folders and any existing
OBS audio offset with the results. A ready indicator, successful install or
browser acknowledgement is not proof of a correct physical recording.

## Script health and rehearsal feedback in the next candidate

1. Open the acceptance script in the editor and select **Script health…**.
   Check the section estimate, then make an unsaved wording change and Refresh.
   The review should update without saving. A flagged sentence's **Open section
   in editor** should return you to its section without rewriting it.
2. If wanted, enable recognised filler/repetition counts in **Recording > Takes**
   and Apply before a voice rehearsal. Read normally; include a deliberate
   repeat, a small wording change and a pause. Finish the take before review.
3. Open **Tools > Script & rehearsal review… > Rehearsal**. Inspect pace,
   qualified coverage/reread prompts and any recognised filler candidates.
   Compare them with the recording. Engines can omit fillers or misalign words;
   do not treat zero/missing matches as proof. Keeper choices must stay intact.
4. Export the pack and confirm `rehearsal-coach.json` is present. Reopen the
   saved session through **Recordings > Coach…**. With counting off, no new
   filler aggregates should be added; existing saved counts remain available.

## Optional components and custom inputs in the next candidate

These controls are included in 1.1.0. In the next recording preview, Stream Deck
installation and pairing share Controls > Stream Deck. Check the running build:

1. Open **Components**. Check the model status and Node.js result.
   Install the AI kit, open its folder and run the checker on your own script.
   Reinstall should refresh the managed copy. Removal must ask first; Cancel
   should leave it installed. Stop prompting/recording before model changes.
2. In **Controls > Buttons & keys**, choose Next and learn your pedal or
   clicker. Close Settings, focus the prompter and press once. It should
   advance once; holding the button should not keep advancing.
3. Assign a second action, try it, then test that typing or opening Settings
   suspends mapped actions. Reset defaults should restore the original
   controller assignments. Stream Deck profiles should be unchanged.

Keep these results alongside the production checklist; simulated button
checks do not prove a particular physical controller's behaviour.

## Separate accessibility and publication checks

Keyboard/layout automation has passed, but manual **NVDA**, **Windows
Magnifier** and OS high-contrast checks still need a Windows session. This
recording walkthrough does not complete those checks. macOS/VoiceOver is
deferred for a future Mac tester and is not a gate for this Windows candidate.

The release, merge and website deployment remain on hold while the Academy
evidence is reviewed. The Stream Deck repo remains private. Running or passing
this script does not itself authorise publication.
