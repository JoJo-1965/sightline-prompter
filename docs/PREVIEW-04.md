# Settings Redesign Preview 04

Unpublished Windows development build, 2 November 2026. The app version remains
1.1.0 and the Stream Deck companion remains 0.2.0. This is a preview of the
approved Settings/Tools design, with the earlier recording-preview additions.

## Open the preview

Close the previous preview, then run **Launch settings preview.cmd** in
`D:\Sightline\Dev\Builds\Previews\settings-redesign-preview-04`.
The portable app uses its own `test-profile`; it does not replace the installed
application. Speech input and external integrations start disabled for this
layout review. Enable and Apply only the interfaces you want to test. The
launcher supports temporary Stream Deck pairing once that interface is enabled.

The folder includes a disposable Settings review script and a copy of Joanne's
promo script. Original project files and earlier profiles remain available.
The build manifest identifies the exact source, checks and package hashes.

## Review the complete workflow

1. Open Settings from the toolbar or Files. Choose **Reading > Text and
   directions**. Select each of the four text types and try its font, size,
   colour, bold, italic and line spacing. **Use theme** restores that type's
   palette colour. The backing sample previews the result.
2. Choose **Theme and background**. Change backing colour and opacity, choose
   a palette, then save a named reading theme. Export/import it if useful.
   It carries reading appearance, excluding credentials and controller setup.
3. Change a few values and use **Cancel**; the saved view should return. Repeat
   with **Apply**, then close and reopen. Those changes should remain. Saving
   or importing a theme is an explicitly durable library action.
4. Find another task through the named sections or search. Resize Settings.
   Its sections stay fixed; compact windows use named selectors. There are no
   automatic pages, Next/Previous controls or internal scrolling.
5. In **Controls**, inspect the separate pad/phone, keyboard/clicker, game
   controller, Stream Deck, OBS and local API homes. Each optional interface
   reveals configuration only when enabled. Turning it off retains its values;
   Apply commits the change. Help follows the enabled functions.
6. Open **Tools > Adjust**. Live size, backing and spacing controls change the
   current view directly. On a short prompting window, Tools opens in its own
   utility window. The mouse pointer should remain visible over the script.
7. Open the promo script. Prepare the reading view, then follow its existing
   recording directions when ready. Use this preview's own edit pack and logs.

For the later live recording run, follow the
[production acceptance script](guide/14-acceptance-test.md) and inspect real
files, clean tracks, scratch audio, slate routing, guide exclusion and sync.
Native software checks do not establish those physical recording results.

[All Settings screenshots](guide/settings-gallery.md) ·
[Settings guide](guide/07-settings.md) ·
[Searchable feature grid](FEATURE-GRID.html)
