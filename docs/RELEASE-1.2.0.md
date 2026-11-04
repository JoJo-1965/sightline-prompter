# Sightline Prompter 1.2.0

4 November 2026 · documentation revision 16 · Stream Deck companion 0.2.0

Sightline 1.2.0 brings reading configuration, recording preparation and optional
connections into a more consistent workflow. Existing personal scripts, profiles,
recordings and Ideal references are retained. The app remains free and MIT-licensed.

## Download and installation help

Windows installers are unsigned; Mac apps are ad-hoc signed and unnotarised.
For a chosen official download, Edge may need **… > Keep > Show more > Keep anyway**;
Windows may need **More info > Run anyway**; Mac offers **Open Anyway** in
**System Settings > Privacy & Security**. See the
[illustrated installation guide](guide/18-installation.md) before bypassing a
warning. File-integrity checks and organisation policy still apply.

## Settings, themes and reading

- The approved Settings composition has expanding navigation, permanent named
  sections, header search and a persistent reading example. Compact windows
  retain usable controls; hidden dropdown page stacks and height-driven pages
  are replaced by visible topic tabs. Longer panels and full mapping lists scroll.
- Spoken script, headings, inline cues and production comments each have font,
  size, colour, bold, italic and line spacing. Backing colour and opacity are
  editable. Save the current reading appearance as a named portable theme.
  Theme exports exclude scripts, devices, credentials and window configuration.
- Controls use consistent spacing and bounded numerical steps/readouts. Mode
  and pace adapts to Scroll, Voice or Notes / page mode. Focus controls depend
  on the aid being enabled; comments are excluded from the spoken focus treatment.
- Live Tools groups Prepare, Adjust and During take. Main-window placement
  after a manual screen move defaults to a centred 75% window.

## Preparation and repeatable framing

- Prepare to record is prominent in Settings and on the main toolbar. Align
  head, check audio, review a real short test, save a reference and return to it
  after a break. Test outcomes appear in Settings and on the prompter.
- Optional bundled local face/eye-position detection supplements the manual
  Ctrl+Shift+H guide. Both views share one fixed target, manual adjustments and
  Lock current. Ideal remains distinct from the reference for this recording.
- Distance advice includes overall Size, Width and independent side adjustments.
  The live percentage shows progress; mirrored arrows agree. Lock current
  preserves custom proportions. This estimates apparent size, not metres or gaze.
- The bottom guide toolbar recovers from a retained hover tab and sits above
  the prompter. Pin, move, Adjust, lock/unlock, fullscreen and Guide off stay
  available. The redundant footer message is removed without moving guide bounds.
- Calibration stays in Guide adjustments. Its service initialises invisibly;
  input selection does not start capture. Only the explicit action opens the
  full workflow. Guide off releases a picture running only for the guide.
- Sound advice balances voice, room noise and peaks. Quiet/noisy readings can
  be acknowledged after listening to the test; gain is not changed automatically.
  The meter appears during room and voice checks.

## Recording and OBS

- Connections replaces the split Controls/Components navigation. OBS has one
  sidebar home with Connection, Recording control and Profile and scenes tabs.
  Connection success and recorder state are displayed separately.
- Optional linked prompting can start/pause/resume/end recording, subject to
  enabled OBS controls and recording permission. Explicit record on/off/pause/
  resume and finish/end aliases supplement the take commands. State is confirmed
  in the recording pill; a yellow pill identifies the current section/page.
- Production notes in `<!-- ... -->` hide while reading and return while
  paused. Short inline cues remain separate. Notes and comments do not drive
  speech counts or accidentally execute enclosed directives.
- Choose a real OBS scene for calibration without switching the programme
  scene or starting recording. OBS-specific choices hide when disabled or
  unavailable. Temporary virtual capture preserves an existing virtual output
  and stops only one Sightline started.
- Recorder-file/clock observations, retakes, markers and script snapshots remain
  together. Live word timing, missing-word/coverage flags, pace and draft captions
  are qualified as estimates requiring review against the recorded master.

## Controllers, Stream Deck and AI

- Optional interfaces have explicit enable gates and reveal their configuration
  only while enabled. Keyboard/clicker and controller pages show every mapping.
  Pad layouts show all buttons with drag and Earlier/Later ordering.
- Stream Deck companion 0.2.0 remains compatible, with connection/version checks,
  supported key/dial/pedal actions and starter profiles. It is included as the
  unchanged free companion; Marketplace review is a separate process.
- The optional local stdio MCP adapter uses the official SDK and separate read,
  script, prompting and recording grants. Configure MCP opens local instructions
  beside the switch. Disable MCP to revoke an existing client's access.
- Broader finish/restart/section aliases and difficult-number regression cases
  improve command handling. Recognition can still miss phrases; another controller
  remains available. No recognition-speed guarantee is implied.

## Installation, help and demos

- Windows metadata identifies Sightline by name. Both Mac architectures use
  free ad-hoc signing, with strict bundle verification and packaged-runtime checks.
  This is not paid Developer ID signing or Apple notarisation.
- The twelve-stop welcome tour and focused samples cover current features and
  safe recording practice. Help, screenshots, canonical web/wiki guide, grouped
  notes, roadmap and the 249-row feature grid are maintained with this release.
- The existing voluntary coffee note repeats after a saved random 10–15 launch
  interval and defers while busy. It does not restrict the app or add a payment gate.

## Validation and practical limits

The release checklist records source tests, native Settings/preparation/production
checks and platform installer results. Physical camera, microphone, projector
crop, controller and recorder checks remain specific to your setup. Guide window
placement is manual. OBS-scene test clips sample preview frames with the selected
microphone; check the actual production file for picture, sound and lip sync.
After a lost OBS connection, confirm any temporary virtual-camera output manually.

Post-record transcription, automatic audio-derived offsets, remote/cloud MCP,
general production-video capture and automatic finished-video editing are not
part of 1.2.0. See the [current roadmap](../ROADMAP.md).

[Download](https://github.com/JoJo-1965/sightline-prompter/releases/tag/v1.2.0)
· [User guide](guide/README.md) · [Feature grid](FEATURE-GRID.md)
· [Archived development/release chronology](CHANGELOG-HISTORY.md)
