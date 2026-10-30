# Release-candidate acceptance test

**Windows Sightline 1.0.7 release candidate + private Stream Deck 0.1.9.**
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

The public app remains **1.0.6**. The candidate and plugin are private test builds.

Allow about **15 minutes** for setup and the recording walkthrough. Read
ordinary text aloud and square-bracket instructions silently. The numbered
checks identify a failure without needing to describe the whole session.

## Prepare the matching build

Close Sightline before installing the candidate. Reopen it and check the
version under **Help > About**. Install the private **0.1.9** plugin separately;
its archive manifest uses the version **0.1.9.0**. Select the matching
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

## Separate accessibility and publication checks

Keyboard/layout automation has passed, but manual **NVDA**, **Windows
Magnifier** and OS high-contrast checks still need a Windows session. This
recording walkthrough does not complete those checks. macOS/VoiceOver is
deferred for a future Mac tester and is not a gate for this Windows candidate.

The release, merge and website deployment remain on hold while the Academy
evidence is reviewed. The Stream Deck repo remains private. Running or passing
this script does not itself authorise publication.
