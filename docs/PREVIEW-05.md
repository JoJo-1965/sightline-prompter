# Settings layout Preview 05

Unpublished Windows preview, 2 November 2026. App version 1.1.0; documentation
revision 4; Stream Deck companion 0.2.0. This implements the signed-off
interactive layout and retains the working recording-preview behaviour.

Run **Launch settings preview.cmd** from
`D:\Sightline\Dev\Builds\Previews\settings-layout-preview-05`.
The isolated profile retains the saved Preview 04 preferences. The installer
and original profiles remain available. The manifest records the source and
package hashes; this is a portable preview, not a replacement installation.

## What to check first

- The left area list expands the selected area in place.
- Controls occupy the centre; Script view preview stays on the right.
- Search is in the header. Cancel, Apply and Save and close stay in the footer.
- Paused/Reading changes only the example. It never operates the prompter,
  microphone or recorder. Compact windows use Area/Section and Preview.
- Spoken script, headings, inline cues and production notes keep independent
  font, size, colour, bold, italic and spacing. Palette changes retain custom
  colours; Use theme restores the selected item's inheritance.

## Record the promo

The unchanged promo script is in **slot 4**, with its production directions,
sound checks, named sections and markers. Close Settings when the view is ready.

1. Confirm the chosen input under **Voice > Microphone** is the RØDE Wireless
   GO II. Enable speech/microphone input if using voice following or commands.
2. Under **Controls > OBS integration**, check the connection, then the separate
   recording permission in **OBS recording control**. Choose Continuous to keep
   the file running through section stops and retakes.
3. Check the real camera picture, microphone track and recording format. Keep
   the independent scratch audio. Preview toggles do not prove actual sync,
   clean tracks or capture exclusion.
4. Follow the script's sound checks and three visible claps. Start the real
   recording, confirm its recording pill, then say **Prompter, start** or use
   your normal pad/Stream Deck control.
5. Use retakes and keeper choices as needed. Finish the real recording at the
   end. Export the edit pack from this same preview: it includes the exact
   recording script, takes, available file/clock references and scratch audio.

The native checks cover the signed-off composition, all 34 sections, compact
windows, Apply/Cancel, theme files and controller mappings. The production
fixture verifies manual guide behaviour and mocked recorder transitions.
Your actual recording supplies the remaining hardware acceptance evidence.

[Settings guide](guide/07-settings.md) ·
[Screenshot gallery](guide/settings-gallery.md) ·
[Full production acceptance](guide/14-acceptance-test.md)
