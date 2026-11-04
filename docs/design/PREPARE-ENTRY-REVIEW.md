# Preparation entry review · 4 November 2026

Status: proposal for Joanne's combined layout review; not an RC feature claim.
Interactive mock: `prepare-entry-review.html`, served at `/prepare-entry`.
Shared-guide simulation: `guide-integration-review.html`, `/guide-integration`.

The current Prepare to record menu opens a Recording setup shortcut page. Its
six cards jump to permanent Settings homes, while a small button below them
opens the separate five-step camera/audio/test/reference workflow. Both use
similar names, but the workflow is visually secondary and requires extra hops.

Keep the approved three-column Settings composition. Rename the single child
Overview and use Prepare to record as the page title. Put the real workflow
first as a full-width card using the same border, typography and Open action
as the other cards. Show the five stages, test outcome and recording reference
beside that entry. Keep the six detailed setup shortcuts below it, with labels
that distinguish guide/sound settings from performing the actual checks.

Add a visible Prepare to record action beside Tools on the main toolbar. Keep
the existing Tools entry and keyboard routes, all pointing to the same window.
It remains non-modal because it owns camera capture, microphone checks, local
test playback and a saved-reference session rather than a Settings draft.

The entry mock opens the shared-guide integration simulation in a separate
window; it does not open a real camera or alter settings. Step/test states in
this entry mock are examples, not live measurements. Final implementation must
derive supported state from saved/report data, label unknown/not-checked states
honestly and retain recording guards. Do not show invented individual passes.

The entry mock retains the Settings composition. The integration simulation
below extends it to a shared head guide. Neither proposes embedding the
camera into Settings, changing the signed-off columns or replacing the guide.
Collect this with the rest of Joanne's feedback before producing another RC.

## Added feedback: integrate the existing head guide

The entry-only proposal is insufficient on its own. Joanne's follow-up requires
live alignment to appear on the existing Ctrl+Shift+H overlay, with one set of
guide controls and reference actions. Keep the recording workflow concept;
avoid a second independent framing tool or a competing set of position sliders.

Current code confirms the gap: `src/pre-record.js` loads a copy of guide pose
when preparation opens and writes a compatible manual pose/reference on Save.
Its live reports carry test/meter state, not detected pose or a draft target.
`Lock current` and preparation adjustments therefore have no live connection
to `src/client/head-guide.js`. Merely moving the entry button does not fix this.

The integrated proposal shares target pose, detected position/quality, selected
picture, manual shape, visibility and recording reference across both views.
Existing head-guide adjustments are the single control surface. Preparation's
Align head stage opens/uses those controls. The mock uses BroadcastChannel for
two-window demonstration only; the app will need validated main-process state
and IPC, not browser storage as a replacement for app preferences.

- Live colour/arrows belong on the Ctrl+Shift+H overlay and the workflow view.
- Target stays fixed as the person moves. Lock current explicitly sets a draft;
  Save recording position keeps it, and Restore recalls the same pose everywhere.
- Preserve Ideal, manual shape/appearance and the existing controls. Detection
  supplements manual adjustment and must stop/release its feed when disabled.
- Matching the selected picture, crop, aspect ratio and projector bounds is
  required. A source/crop change invalidates the old measured match rather than
  reporting a false green result. Coordinate conversions must have one owner.
- Saving a head position is separate from passing audio/test review. The demo
  deliberately leaves both tests Not checked; saving a pose never marks Ready.

## OBS calibration without changing the recording route

Preferred proposal: use bounded-rate frames from a selected OBS scene/source
through the existing connection. The official [OBS protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#getsourcescreenshot)
supports GetSourceScreenshot for inputs and scenes. This could avoid opening
the physical camera twice or requiring a virtual-camera output. It still needs
performance, active-source and coordinate checks against the actual OBS setup.
Show an explicit OBS scene chooser for this route, populated from the actual
connection. The mock uses example scene names and updates both views' picture
labels when selected. Keep this visible under Calibration picture, not hidden
in an unrelated navigation dropdown. Remember its selection across visits and
flag a renamed/deleted scene. Choosing a calibration scene must never issue a
programme-scene switch; it selects a measurement picture only. Hide the chooser
when OBS is unavailable/disabled or the calibration input is a camera/virtual
feed. The scene and crop belong to the recording-reference match metadata.
Use the scene/source corresponding to the projector and recorded framing;
do not silently switch OBS programme scenes, source filters, crop or recording.

Optional fallback: allow a temporary OBS virtual-camera feed for calibration.
Check its initial state. Start it only through an explicit calibration action,
and stop it afterwards only if Sightline started it. Leave an existing virtual
camera active; do not automatically reconfigure its output or interrupt another
consumer. OBS recording remains independent. Exact restoration/error behaviour
needs testing; it is not supported by RC 3 yet.

Directly capturing a projector window is another possible input, but is not
implemented. Prefer the underlying OBS picture to avoid sampling the prompter
or guide overlay. Non-OBS camera/virtual feeds remain available. Snapshot-based
calibration does not by itself provide an OBS recording test or lip-sync proof;
the real recorder's output still needs review.

## Review verification

OBS calibration choices require both confirmed OBS availability and enabled
integration. Disabled or not installed hides the OBS scene/source option,
temporary virtual-camera option and product OBS notes in both windows. The
remaining generic camera path uses a fixed label instead of a one-choice
dropdown. The mock's review bar exposes Installed/Integration enabled switches
to inspect the four combinations; those switches are not product controls.
Preferred source is retained when the options are hidden. A real app must stop
OBS sampling without automatically enabling another capture input. Disconnected
or not running is different from not installed; a configured remote OBS host
must use its own confirmed availability, not a local executable lookup alone.

The Settings entry mock renders at 1440 and 390 pixels without horizontal
overflow. Its compact sample preview is non-modal and can be closed while
Settings remains available. Both workflow entries open the integration mock.

The integration simulation passes a two-window interaction check: Lock current
in the workflow updates the floating guide; saving and adjusting in the guide
updates preparation; restoring there restores both views to the same position.
The main integration view also fits 390 pixels. These are prototype checks,
not evidence that RC 3 has live guide integration or new OBS frame access.
The shown sliders illustrate shared ownership; all existing manual axes, shape,
appearance and placement controls must remain available in implementation.
