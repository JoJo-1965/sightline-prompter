# Settings

**Development branch:** this regrouping is not yet released. For the published
1.0.6 layout, use the guide bundled with that app.

Open **⚙ Settings** on the top bar or press **Ctrl+,** (**Cmd+,** on Mac).
There are five groups, with a second row of focused topics. Each setting has
one home. Script files, recordings and settings import/export are in the
**Files menu (☰)**; live tools are under **Tools** on the top bar.

[Browse the full Settings screenshot gallery](settings-gallery.md) for every
topic and page. The same gallery opens from the guide's contents and works
offline in the app.

Settings keeps the same width and height across every tab and page. It only
reduces its size when the prompter window is too small for the standard panel.
There is no scrolling. Longer topics use **Previous / Next**, with the current
section and page number shown between them. Smaller windows use more pages;
your draft stays intact as you move between them. Word lists use pages too.

The small raised **?** pill sits beside the option it explains, with a larger
tap area. Hover over it, focus it with the keyboard, or tap/click it for an
explanation of the nearby choice. Click again, click elsewhere, or press
**Esc** to dismiss it. When an explanation is open, the first Esc closes
that explanation and leaves Settings open. The explanation can be hovered
without disappearing as you move the pointer onto it.

![Prompting settings, with Scrolling selected and the other topics alongside](images/settings-scrolling.png)

## Find a setting

| Group | Topic | What belongs here |
| --- | --- | --- |
| **Prompting** | Scrolling | Steady or voice mode, steady speed and the opening countdown |
| | Voice | Speech engine, model download, responsiveness, Deepgram key and microphone |
| | Commands | When to listen for commands and which wake word to use |
| | Your words | Script synonyms, command synonyms, sound-alike matching, suggestions and Teach |
| | Script | Notes mode, pacing, script directions, slide cues and directive display |
| **Appearance** | Text | Body and heading fonts, heading size and text-size preview |
| | Background | Text opacity, backing on/off air, brightness and colour theme |
| | Reading aids | Focus band, text edge, reading-line marker, sentence highlight and progress bar |
| | Spacing | Margins, line spacing, reading line, alignment and mirror axes |
| | Screens | Prompter monitor, Keep on top, eye-line strip and keeping controls visible |
| **Recording** | Takes | Slate, ON AIR display, countdown beep, capture protection and click-through |
| | Audio | Scratch audio, loudness per take and keeping the sound-check meter visible |
| | OBS connection | Enable OBS, address, port, protected password and the saved-connection test |
| | OBS recording | Start/stop permission, chapters and preparing the recorded slate |
| **Controls** | Phone | Enable the phone remote, scan its QR code or replace its code |
| | Stream Deck | Enable the companion plugin's buttons-only connection and open its guide |
| | AI & API | Enable local automation, port, token, recording-delete permission and AI setup help |
| **About** | About | Version, a link to credits, updates, support, debug logging and the support-log export |

OBS settings stay discoverable while disabled so you can configure them.
Recording commands in Help and the live recording controls still follow the
permissions you have enabled. The head guide is independent of OBS.

## Fonts, backing and reading aids

Open **Appearance > Text** for the body font, heading font, heading size and
text-size preview. The visible notes distinguish changes saved immediately
from the text-size preview saved with Apply or Save & close.

![Body and heading fonts alongside the text-size preview](images/settings-reading.png)

**Appearance > Background** holds visibility, brightness and colour choices.
Use Background for the off-air level and Background on air for the level used
when ON AIR is enabled. Both values are remembered.

![Separate off-air and on-air backing controls](images/settings-background.png)

**Appearance > Reading aids** holds the focus band, text edge, reading-line
marker, sentence highlight and progress bar. [Layout and display](04-layout-and-display.md)
explains these choices, with illustrations.

## Apply, Save & close and Cancel

- **Apply** saves your changes and keeps Settings open.
- **Save & close** saves and closes.
- **Cancel**, **×** and **Esc** close without saving the pending draft.

If there are unsaved changes, closing offers **Save**, **Discard** or
**Keep editing**. Shared live controls show **Saved immediately as you adjust**;
cancelling the draft keeps those changes. The text-size preview has its own
**Preview until Apply or Save & close** note and is restored when cancelled.

The footer shows **Unsaved changes** when you edit the pending draft and
**Saved** after Apply. Clearing or choosing a slide-cue file also counts as a
pending change. Invalid numbers return you to the relevant topic and page,
with the field focused and its permitted range explained.

Changing group or topic never applies or discards the draft. Settings remembers
the last topic used, and returning to a group recalls its last topic during
that session. Older saved tab choices are carried across where possible.

Use **Tab** to move between the selected group, selected topic and controls.
Within either tab row, **← / →** changes selection; **Home / End** goes to its
first or last tab. Hidden topics stay out of keyboard navigation. Focus stays
inside Settings until you close it, then returns to the control that opened it.

Drag the title to move Settings within the prompter window. Double-click it
to recentre. A separate Settings window remains on the roadmap.

## Voice and commands are separate

**Prompting > Voice** chooses how speech is recognised and which microphone
to use. **Prompting > Commands** chooses when the wake word is heard, including
Always listening while stopped. **Your words** holds training and synonyms.

![Command listening and the wake-word choice on their own topic](images/settings-commands.png)

![The question-mark button explains command listening without adding permanent text to the form](images/settings-commands-help.png)

See [Scrolling and voice](03-scrolling-and-voice.md) for the modes and commands.
Sound checks and loudness are in **Recording > Audio**, with a live meter
available from **Tools > Sound check** or **Ctrl+Shift+D**.

![Recording audio settings for scratch audio, loudness and the sound-check display](images/settings-audio.png)

## Connections in Controls

**Controls > Phone** pairs a phone on the same Wi-Fi. **Controls > Stream Deck**
enables the companion plugin's connection. **Controls > AI & API** enables an
AI assistant or local script to control Sightline. Each connection is optional.

![The Stream Deck connection has its own topic and contextual help](images/settings-streamdeck.png)

Follow [Remotes and second screens](06-remotes-and-screens.md) for pairing and
connection steps, or [Setting up your AI](10-setting-up-your-ai.md) for automation.

## Tools and Files

**Tools** holds Sound check, the head guide and fullscreen/restore, Keeper,
Scrap, quick display/voice panels, the control pad and the control window.
Quick panels reuse the existing live controls rather than separate copies.
Their keyboard shortcuts, voice commands and Stream Deck actions still work.

![Tools grouped into recording tools, quick adjustments and operator windows](images/tools-menu.png)

**Files (☰)** holds New/Open, Google Docs, recent and sample scripts,
Edit/Save/Save as, Clear slot, Recordings, the edit-pack export, settings-file
import/export and Quit. It does not repeat playback, appearance, voice or
window tools. The top bar keeps slots, playback, speed, size, backing and
mode switching; on narrow windows, Tools and Settings provide the additional adjustments.

![The compact Files menu](images/menu.png)

The native application menu keeps standard keyboard/platform access through
**File, Edit, Playback, Tools, Window and Help**. Script slots are under File.
Detailed preferences remain in Settings. **F1** opens grouped shortcuts;
**Shift+F1** opens the illustrated guide. On Mac the usual application menu
also remains available.

**Copy the AI script prompt** is available in F1 Help as well as the native
Help menu, without enabling remote control.

## About, updates and support

**About** gives the version, **Credits and licence**, the user guide,
Joanne's tip jar and **Check for updates**. Update checks ask GitHub; nothing
downloads or installs automatically.

**Credits and licence** opens the full About page, also available from
**Help > About**. Copyright and attribution live there, with no repeated
messages in the Files menu or the Settings overview.

**Debug mode** adds detail to the local support log. **Save a log for support…**
creates a file containing the version, system and enabled features, excluding
scripts, keys and audio. It sends nothing itself.

Sightline is free and stays free. Support is voluntary and gives no extra
features. See [privacy, terms and support](../POLICIES.md).
