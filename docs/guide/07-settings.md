# Settings

This source guide describes **Settings Redesign Preview 06**, based on the
approved interactive demo. It is an unpublished preview of Sightline 1.1.0.
For the released app, use the guide bundled with its installer.

Open **Settings** on the toolbar, **Files (☰) > Settings**, or **Ctrl+,**
(**Cmd+,** on Mac). Settings opens in an upright, movable window. It retains
the same frame while you change sections; resizing never moves a control
onto another page. There is no internal scrolling or numbered pagination.

On larger windows, choose an area and a named section in the sidebar, or use
**Find a setting**. Compact windows use **Area** and **Section** selectors.
Disabled features are excluded from search and navigation where appropriate:
OBS recording/setup needs OBS enabled; speech commands/words need speech enabled.

The selected area expands in the left list. Controls stay in the centre and
**Script view preview** stays on the right; search is in the header. Compact
windows use a **Preview** action to open a movable, non-modal companion.
It stays in sync while Settings remains usable. The third column follows width,
so a short but wide window keeps it. Paused/Reading changes only the example,
never the actual prompter, microphone or recorder.

## Apply, save and cancel

Every preference in Settings uses the same draft:

- Appearance changes preview in the sample and the prompter.
- **Apply** saves the draft and keeps the window open.
- **Save and close** saves and closes.
- **Cancel** discards changes made since opening or the last Apply.
- **×**, native Close and **Esc** check for unapplied changes.

Device/service activation happens on Apply, rather than while choosing values.
**Tools** is labelled **Live adjustments**: its controls apply immediately.
Installing a component, importing/saving a theme, testing a microphone,
resetting pairings, recorder commands and guide visibility/placement/reference
actions are explicit actions. Cancelling another Settings edit does not undo
them. Guide appearance and eye-lock preferences use Apply like other settings.

The small **?** pill explains the adjacent option. Hover, focus or click/tap
it. An open explanation takes the first Esc; Settings stays open.
Sliders have matching numeric values, units and keyboard adjustment.
Text size, line spacing, voice response and WPM use five-point increments.
Margins, opacity, countdown and reading positions use whole values. Fine head
alignment displays at most two decimals. Sliders and number boxes agree;
existing stored precision is retained until you adjust the value.

## Areas and sections

| Area | Sections |
| --- | --- |
| Prepare to record | Recording setup |
| Reading | Mode and pace; Text and directions; Theme and background; Layout; Reading aids; Screens and mirroring; Head guide |
| Voice | Speech engine; Microphone; Commands; Your words |
| Recording | Takes; Sound check; Slate and sync |
| Controls | Pad and phone; Phone remote; Keyboard and clickers; Game controller; Stream Deck; OBS integration; OBS recording control; OBS profile and scenes; AI and API |
| Components | Getting started; Installed components; Restore defaults |
| Debug | Status and recovery; Speech trace; Capture for demos; Support log |
| About | Version and updates; Credits and licences; Help and support |

## Prepare and reading

**Session checklist** opens the existing preparation checks and links directly
to script review, appearance and framing.

**Mode and pace** has one Mode selector offering
Notes/page, Voice and Scroll. Voice shows response; Scroll shows WPM, script
pacing and countdown; Notes/page shows page-navigation guidance. Unrelated
controls are hidden and disabled, with their values retained. The separate
Notes checkbox is removed. Apply saves the chosen mode; Cancel restores it.

A movable **non-modal preview window** is available for compact Settings
layouts. It remains open while you change settings, using the same draft as the
inline example. Its small Close preview button, native X and Escape close the
preview without closing Settings. Preview controls never start prompting or
recording. The [combined review](../design/settings-feedback-batch-2026-11-02.md)
records the approved layout. Voice requires enabled speech and microphone input;
Scroll and Notes/page do not require speech components.

**Text and directions** has four named targets:

| Target | Script syntax and behaviour |
| --- | --- |
| Spoken script | The words you read aloud; also the base size used by the toolbar |
| Headings | Titles and section headings, with their existing title hierarchy |
| Inline directions | Square-bracket cues such as `[smile]`; silent, with separate Normal/Dimmed/Hidden visibility |
| Production notes | HTML comments such as `<!-- prepare the slide -->`; silent, visible while paused and hidden during delivery |

Each target has its own **font, size, colour, Bold, Italic and line spacing**.
Non-script fonts can **Follow script**. Size is expressed as a percentage:
headings are relative to script size, inline directions normally start at
85%, and production notes at 55%. Visibility no longer changes direction size.
Quoted words marked for speaking retain spoken-script styling and tracking.

**Use theme** beside a colour restores that item's palette colour.
**Choose theme** opens **Theme and background**.

### Theme and background

Choose Standard, Yellow on dark, High contrast or Soft cream. Soft cream's
new palette has a light cream background and dark text. Existing cream
profiles retain their earlier appearance until you change/reset their colours.

The **Background colour** picker is independent of text colour. Off-air and
on-air background opacity, text opacity and brightness have their own controls.
The right preview demonstrates paused versus reading appearance. Palette changes
preserve custom colours; Use theme restores inheritance.

**Save current as…** creates a named reading theme; choose it again from
**My saved themes**. Optionally export a copy while saving. **Import theme…**
and **Export theme…** use portable `.sightline-theme.json` files.
Names are unique; imported duplicates receive a suffix.

A reading theme contains the four text styles and reading background values.
It excludes scripts, window positions, controller/pad layouts, recorder setup,
pairings and credentials. It is **not a complete app backup**. Use
**Files > Save/Load settings** for the broader supported JSON/XML preference
transfer; sensitive opt-ins still require explicit setup on the destination.

### Prompter layout, aids and screens

**Prompter layout** contains alignment, margins and reading-line position.
Line spacing lives with each typography target.

**Reading aids** uses visible button subtabs for reading indicators versus slide cues
and directive tags. Sentence highlight, progress/time, marker, focus band,
strength and text edge stay together. **Focus strength** appears only while
**Focus band** is on; switching the band off retains the selected strength.
Small **?** pills explain every control in both groups. Hover, focus with the
keyboard or click a pill to read its explanation; Escape closes it.

**Screens and mirroring** uses visible **Window and mirroring** and
**Eye-line strip** subtabs. Set the monitor, always on top, toolbar visibility, capture protection,
click-through and independent left/right and top/bottom mirroring here.
Enable the eye-line strip to reveal its width, height and reading-line controls.
These use the same sliders, number boxes and help pills as other settings.
The mouse pointer remains visible when the main toolbar hides.

**Head guide** has a stateful Show/Hide switch and visible **Guide**,
**Appearance** and **Recording reference** subtabs. Choose centred/beside-prompter
placement, eye locking, outline colour/opacity, backing opacity and Show Ideal.
Appearance/eye-lock preferences use Apply. Show/Hide, placement, fullscreen and
reference actions act immediately. Apply guide edits before saving/restoring
a reference. Save recording reference keeps Ideal separate; Restore is available
after a reference exists. The right-hand manual diagram is not camera tracking.
Use **Adjust guide** to fit eye centre/level, then top/bottom and sides.
See [head guide and capture limits](04-layout-and-display.md).

## Voice

**Speech engine** has an enable switch, engine choice, readiness and service
key controls. Manage the offline model in **Components > Installed components**.
The local engine runs on the computer; Deepgram is an optional online service.

**Microphone** has a separate enable switch, input selector and explicit
**Test selected microphone** meter. A test is temporary and stops when you
leave the section, disable input or close Settings. Selecting an input does
not adjust its gain.

**Voice commands** contains listening mode, wake word, listener status and
restart. **Your words** provides script-word corrections and command phrases,
with named item selectors rather than height-dependent pages.
Voice-command help needs speech, microphone input and listening enabled.
Recording commands also need the relevant recording integration and permission.

## Recording

**Takes** contains take summary, pacing light, start beep, on-air indication and
optional aggregate rehearsal counts. **Sound and scratch audio** holds per-take
level feedback, the independent scratch reference and sound-check display.
A low level is advisory; consider room noise before increasing gain.

**Slate and sync** holds the local slate choice. A screen-only flash does not
validate camera lip sync. OBS's recorded slate route is configured separately
under **Controls > OBS recording control**. Verify the actual recorded picture/sound.

Section stops and retakes keep the existing recording workflow. Ordinary
reading needs no compulsory recorder directives.
See [production handover](12-production-handover.md).

Installed components uses visible **Speech model**, **AI kit**, **Node.js** and
**OBS** subtabs. Dropdowns choose values or list entries; they do not hide these
functional groups. Group tabs share pointer, arrow-key and Home/End behaviour.

## Controls and optional components

Each optional interface has **one enable switch**. Off hides its configuration
and preserves saved values. Installation/readiness is separate from activation.
Disabling an interface does not uninstall its software.

- **Pad and phone** arranges the shared layout when either interface
  is enabled. Choose a button by name, use Earlier/Later or drag neighbouring
  buttons, and select presets, columns and hold-to-finish. Compact views edit
  the selected button without arbitrary page numbers.
- **Phone remote** shows the local QR/link after enabling and applying.
  New code disconnects previously paired phones. Use the same private network.
- **Keyboard and clickers** learns custom plain-key/Shift mappings.
  Core shortcuts remain available when custom mappings are off.
- **Game controller** separately enables and assigns controller buttons.
  Resetting one input type preserves the other type's mappings.
- **Stream Deck** is its single setup home: installation/readiness,
  enablement, companion plugin compatibility and support.
- **OBS integration** lives under Controls. Enable it before its recording
  and profile/scene sections appear. Apply, start OBS and test the saved
  WebSocket connection. Recording control is a separate permission.
- **AI and API** uses a local port and access token. General authorised
  clients can use it; the supplied AI kit commands additionally need the
  optional kit and a suitable Node.js installation.

**Components > Installed components** selects the offline model, AI kit, Node.js
readiness or OBS installation. External apps keep their own update process.
**Restore defaults** confirms a restart into onboarding; components, scripts,
recordings and retained service keys are not uninstalled.

## Tools, debug and help

**Tools** has Prepare, Adjust and During take tabs. It follows the same visual
controls as Settings, with separate controls and shared saved values.
Disabled functions are omitted. If the prompting window cannot fit the menu,
Tools opens in its own utility window.

**Debug > Health** explains listener recovery. **Command tracing** is off by
default and can record recognised nearby conversation during Always listening.
Health/recovery events contain no spoken words. **Support logs** exports a
local diagnostic file without sending it.

**Screen capture > Allow all windows to be captured** is an immediate,
session-only override, including the head guide. Its banner stays visible.
Turning it off restores the normal capture rules. It is not exported or
available through the settings API. Capture protection still depends on the
recording route: check a short recorded file.

**About** holds version/update information, credits and support.
**F1 / ?** and voice help use grouped topics and omit disabled feature keys.
See the [screenshot gallery](settings-gallery.md) and
[privacy, terms and support](../POLICIES.md).
