# Settings and Tools: recording setup redesign

Design review, 1 November 2026. This describes a proposed replacement for the
current settings layout. The interactive mock does not control the installed
app. Preview 03 remains an unfinished development build.

[Open the interactive mock](settings-and-tools-prototype.html).
[View the screenshot gallery](settings-and-tools-gallery.md).

## The job to complete

Before recording, Joanne needs to make the spoken script readable, distinguish
short delivery cues from long preparation notes, position the reading area
against the camera, and confirm audio/recorder state. The current interface
requires hunting through overlapping panels and moving pages. This redesign
starts with those jobs, then gives occasional configuration a permanent home.

## Findings from the current interface

| Finding | Evidence or status | Design response |
| --- | --- | --- |
| Appearance controls are hard to find | Comment was renamed and moved; related typography still spans Text, Spacing and Directions. | One Text and directions workspace, with four explicit text targets. Search accepts comment, cue, instruction and production note. |
| Production-note controls disappear | In the running Preview 03 Settings document, the production-note fieldset existed but its size/colour/spacing inputs were absent. | Give Settings stable ownership of its controls. Tools shares their values and actions rather than moving the same DOM nodes between panels. Reproduce the handoff sequence before claiming a fix. |
| Theme buttons appear inactive | The app preview lost its picker; the mock also labelled a colour reset simply Theme, making it look like a theme chooser. | Use theme explicitly restores the selected text colour. Choose theme opens Theme and background, where the selected palette visibly changes the script preview. |
| Note formatting is incomplete | Independent font choice and an italic option were not implemented. | All four text targets use the same complete typography component, including font, size, colour, bold, italic and line spacing. |
| Controls move onto other pages | Pagination measures whatever fits at the current window height. | Fixed named sections with explicit membership. Resizing never reallocates a control to another section. |
| Navigation text wraps or spills | Conflicting wrapping rules and long generated destination labels. | Remove generated page navigation. Choose a named section directly. Keep section names short and show the current location. |
| Toolbar hiding also hides the pointer | `body.controls-hidden, body.controls-hidden *` applies `cursor: none !important`. | Pointer visibility is independent of toolbar visibility. It stays visible over all interactive controls. |
| Tools clips in a short window | A long menu is constrained to the remaining height below the toolbar. | A compact three-topic menu, bounded to the viewport; open a separate utility panel when the available area cannot hold it. |
| Tools and Settings feel unrelated | Tools uses its own long action menu and old quick panels. | Shared colours, typography, spacing, controls, focus treatment and action names. |
| Save rules are inconsistent | Some controls save instantly; others need Apply. Theme was missing from live-control handling. | All Settings values preview together and use one Apply/Cancel contract. Tools explicitly says Live adjustments. Component installation and recorder commands remain explicit actions. |
| Setup is not a clear user journey | Controls are arranged by implementation history. | Prepare to record links to reading, directions, layout, framing, sound and recorder checks. Each link opens the exact settings section. |

The missing-control handoff is an observed defect; its precise cause is not yet
proven. It must not be dismissed as a user-navigation error.

## Permanent homes

The left navigation has stable areas and named sections. The selected area
expands; other areas remain one line. A compact window uses labelled Area and
Section selectors instead of squeezing or clipping the navigation.

| Area | Named sections | What belongs here |
| --- | --- | --- |
| Prepare to record | Reading; Directions; Layout; Framing; Sound; Recorder | A route into the actual controls, with current state and a return to the checklist. No second copy of settings. |
| Reading | Mode and pace | Steady/Voice/Notes, steady WPM, responsiveness link, start countdown and script pacing. |
| Reading | Text and directions | Spoken script, headings, inline directions and production notes. Complete typography controls for each target. |
| Reading | Theme and background | Built-in palettes, named custom themes, off-air/on-air backing, text opacity and brightness. Choose theme links here from typography. |
| Reading | Layout | Alignment, margins, reading-line position and text-area preview. Line spacing lives with typography. |
| Reading | Reading aids | Sentence highlight, focus band/strength, reading marker, progress/time and text edge. |
| Reading | Screens and mirroring | Display selection, fullscreen, always on top, horizontal/vertical mirror, eye-line strip and click-through. |
| Reading | Head guide | Session template, Ideal/Actual, eye lock, fit edges, saved recording reference, window position and capture state. Adjust guide opens its dedicated panel. |
| Voice | Speech engine | Enable speech first, then local model or Deepgram, readiness, service key and provider/privacy explanation. Installation links to Components. |
| Voice | Microphone | Enable input first, then input selection, meter and device readiness. The same selected input is referenced by sound checks. |
| Voice | Commands | Listening mode, wake word, status, restart and command help. Recording commands follow enabled OBS permissions. |
| Voice | Your words | Script corrections and command sound-alikes, search, select/edit one item and Teach. No height-driven redistribution of rows. |
| Recording | Takes | Summary, pacing display, start beep, optional filler counts, markers and take-rating behaviour. |
| Recording | Sound check | Room/voice checks, per-take loudness, advisory acceptance and sound-check display. |
| Recording | Slate and sync | Local slate choices, scratch WAV references, recorded-slate route and sync limitations. |
| Controls | Pad and phone | Enable the floating pad; shared button layout appears when either the pad or phone is enabled. Selected actions, ordering, presets, columns and hold-to-finish. |
| Controls | Phone remote | One phone enable switch; pairing URL/QR and renewal appear only when enabled. |
| Controls | Keyboard and clickers | Enable custom keyboard-like input mappings, then learn, assign, test and restore. Core keyboard navigation remains available. |
| Controls | Game controller | Its own enable switch, then compatible controller selection and button mappings. Separate from onscreen pad layout. |
| Controls | Stream Deck | Install/readiness, enable, pair, compatibility and profile guide in one place. |
| Controls | OBS integration | One OBS enable switch; connection details and other OBS sections appear only when enabled. Installation/readiness, host/port, credentials, test and confirmed status. |
| Controls | OBS recording control | Permission, Continuous/Linked mode, pause capability, chapters and recorded-slate preparation. Hidden while OBS integration is disabled. |
| Controls | OBS profile and scenes | Review a separate profile/scenes plan, folder and 1080p/4K choice; configuration guide. Hidden while OBS integration is disabled. |
| Controls | AI and API | General local API permission, port, tokens, deletion permission and agent-kit links. Clearly separate from restricted companion control. |
| Components | Getting started | Initial setup, installation checks and the route back into session preparation. |
| Components | Installed components | Speech model, AI kit, Node.js and OBS readiness, install/repair/remove/locate actions. Stream Deck links to its single Controls home. |
| Components | Restore defaults | Confirm a clean preference/onboarding reset; preserve installed components, scripts, recordings and service keys. |
| Debug | Status; Speech trace; Capture; Support log | Health and recovery, explicit word-trace opt-in, session-only capture override and diagnostic export. |
| About | Version and updates; Credits; Help and support | Updates, one attribution home, licence/policy links, illustrated guide and support. |

Files retains Open, New, Save, Save as, slots, samples, import/export and
recordings. The toolbar retains the small set of actions used while reading.
Settings is available from both its standard icon and the Files menu for
discoverability. Tools is the quick operating surface, not another settings map.

## Enable first, configure second

Every optional interface has one enable switch in its own settings home.
While off, show its status, the switch and an installation/status link where
needed. Hide configuration fields and actions. Turning it on reveals its
configuration; turning it off preserves values and never uninstalls anything.
The mock applies this to OBS, game controller, Stream Deck, phone, floating
pad, custom keyboard/clicker mappings, speech, microphone and AI/API access.

OBS configuration belongs under Controls, alongside other external interfaces.
Recording keeps Sightline's take, sound-check, slate and sync preferences, plus
a shortcut to the single OBS enable/configuration home. OBS recording/profile
sections disappear from navigation and search while OBS integration is off.
Speech command and word sections follow the same rule for speech features.

Installed components remain discoverable in Components whether enabled or
disabled. Its Open feature controls action links to the owning interface; it
does not duplicate enable switches. Dependencies such as Node.js have install
and readiness states, not a meaningless separate running/on/off state.

The shared pad layout is configurable while either the floating pad or phone
remote is enabled. Phone pairing has one enable home. Basic keyboard access
is retained even when custom mappings are off. Hiding the head-guide window
does not disable its show/unlock shortcut.

Help uses the same feature state. The mock's fixed-size ? dialog hides Voice
and recorder-command topics until their speech, microphone, listening and OBS
permissions are enabled. Its controller list contains enabled interfaces only.
Tools hides sound-check operations without microphone input and recorder
operations without enabled OBS recording permission. Native implementation
must also apply readiness/compatibility checks; this mock never verifies or
starts external devices, services or recording.

## One control vocabulary

| Control type | Consistent behaviour |
| --- | --- |
| Slider and number | Same value, same unit, same bounds and step; arrows and keyboard work identically. Values outside range show an inline explanation. |
| Size | Explicitly labelled relative size. Script is the base; other targets state their relationship to it. Dimming never silently changes font size. |
| Colour | Effective swatch, colour picker and Use theme button on every text target. A selected button means inheritance; a custom colour clears that state. Choose theme opens the palette selector. |
| Font | Same selector on every target. Follow script is an explicit option for headings/directions/notes. A missing font is identified and a fallback is shown. |
| Text style | Matching Bold and Italic toggle buttons, with visible selected state, accessible names and keyboard operation. |
| Line spacing | A percentage of the selected text target's font size everywhere. Paragraph spacing, if later added, must be a different control. |
| Visibility | Explicit choices with a local preview. Inline cue visibility is separate from the automatic paused/delivering behaviour of production notes. |
| Switch | Stable On/Off state, clear label and optional contextual help. A missing dependency shows a reason and a setup link. |
| Action | A verb that says what will happen. Connect, Test, Install and Start recording are actions, not preference switches. |
| Reset | Reset this section affects only that section. Use theme resets only the selected text colour. Changing the palette preserves custom colours. Restore defaults is a separately confirmed whole-app action. |
| Help | The same small ? pill beside the label; hover, focus and click/touch reveal the same explanation. |

## Typography completeness

### Saving a reading theme

In the interactive mock, **Reading > Theme and background > Save current as…**
captures the four text targets (font, size, colour, bold, italic and line
spacing), inline-cue visibility, background colour, off-air/on-air backing,
text opacity and brightness. Each saved appearance value has an editable UI
control; production-note hiding during delivery is fixed behaviour, not a
theme option. The background picker uses the same swatch/Use theme reset
pattern as text colours. Paused and Reading previews show their respective
backing opacity, and text opacity and brightness update the preview.
It saves the values currently being previewed, including unapplied changes.
Recorder, microphone, connection, script and window settings are excluded.
Theme export is a reading-appearance preset, not a whole-UI setup export; pad
layout, key mappings, window placement and recorder configuration are outside
its scope.

Named themes appear under **My saved themes** in the Script theme selector.
Choosing one restores its formatting into the Settings preview. Apply keeps
that look; Cancel restores the previous applied settings. Saving a named
theme is an explicit library action, so Cancel does not delete that theme.
Built-in palettes continue to change only palette colours and preserve
custom text colours.

The mock stores its theme library in this browser. Select **Download a copy
for another laptop** when saving to keep a portable JSON file; **Import theme…**
loads it into another browser or copy of the demo. Browser storage can differ
between downloaded file paths. If storage is unavailable, the mock reports
that a saved theme is limited to the current session. Imported values are
validated, and duplicate names receive a suffix rather than replacing a theme.

This is implemented in the mock only. Native app storage, theme management
and integration with settings transfer remain implementation work.

### Formatting targets

One target selector exposes **Spoken script**, **Headings**, **Inline directions**
and **Production notes**. Every target has Font, Size, Colour, Bold, Italic and
Line spacing in the same order. Visibility appears below for the relevant
target. Inline directions and production notes no longer inherit a font
implicitly: Follow script or a specific font is visible and editable.

The preview can switch between Paused and Reading. Production notes disappear
only in Reading. Inline cues remain according to their own visibility choice.
Quoted spoken words in inline cues use spoken-script styling; all contents of
production notes remain silent. Formatting does not change tracking semantics.

## Settings and Tools have explicit lifecycles

In Settings, changes are previewed while the dialog is open. **Apply** saves
and stays open. **Save and close** saves and closes. **Cancel** restores the
unapplied preview. The pending-change indicator and close guard are consistent.
An explicit connection/install/record action is not falsely presented as
undoable by Cancel.

Tools says **Live adjustments** and changes operational values immediately.
The same slider, picker and toggle components have the same units and
behaviour. A visible **Open in Settings** link takes the user to its permanent
home. Tools never borrows or removes a control from Settings.

## Tools layout

| Named topic | Quick actions |
| --- | --- |
| Prepare | Session check, script review, sound check, head guide. |
| Adjust | Script view, reading pace, background, reading line, guide adjustment. |
| During a take | Marker, keeper, scrap, record take, recorder pause/resume, finish recording. Recorder actions appear only with the relevant permission. |

Use the same dark surfaces, Segoe UI/system type, button styles and focus ring
as Settings. Place the compact menu within the viewport; flip its anchor if
needed. If it cannot fit at the minimum supported size, use a separate native
utility panel rather than clipping rows or reducing the text size.

## Layout rules and acceptance

- Stable frame for a given window size; changing sections never resizes it.
- Fixed section membership, with no generated Previous/Next page names.
- No internal settings scrolling. Keep each section small enough to fit;
  split it into another named task section when necessary.
- Compact navigation replaces a wide sidebar at smaller widths. It changes
  navigation presentation, not which controls belong together.
- The pointer remains visible while interacting and is independent of
  toolbar hiding. Any optional idle-pointer feature needs a separate preference.
- Missing controls are tested after opening Tools first, opening/closing
  Settings repeatedly, resizing, mirroring and moving between monitors.
- Colour pickers and Theme resets are checked for every target. Font, italic,
  size, spacing, visibility, Apply, Cancel and restart are checked together.
- Use focused interaction/layout checks while implementing. Run the broad
  integration suite once the combined batch is stable, not after each label edit.

## Delivery order

1. Review this coherent mock: typography, first recording setup, compact layout
   and Tools together.
2. Implement stable control ownership and the consistent settings transaction.
3. Implement the shared typography controls and fixed navigation.
4. Replace Tools and separate toolbar/pointer hiding.
5. Build one preview with focused tests, screenshots and a clear acceptance list.
6. Refresh help, guide, feature grid and staged JL copy from that verified build.

The JL feature-grid summary and searchable page are implemented in draft
branches, with maintained app exports and website sync checks; they are not
deployed. Their reference remains the verified Preview 02 snapshot. Proposed
controls remain excluded until implemented and verified in an app build. No
release, Marketplace submission or website deployment is authorised by this
design review alone.
