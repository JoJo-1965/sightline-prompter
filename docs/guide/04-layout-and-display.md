# Layout and display

## The Layout panel

**Edit**, immediately left of **Tools** on the toolbar, opens the current
script's editor. Samples open as read-only source. **Tools** opens below its
button, with its edges kept inside the window.

The top toolbar has separate **left/right** and **top/bottom** mirror icons.
Each stays lit while its axis is on; click again to turn it off. Both can be
on together. The Layout and Reading toggles, keyboard and remote controls
stay in step with these buttons.

![Toolbar with independent left/right and top/bottom mirror icons](images/control-bar.png)

Every visible toolbar slider keeps a small label above it: **Speed** in steady
mode, **Response** in voice mode, **Text size**, and **Background**. **Response**
sets how quickly voice scrolling follows you. The background label changes
to **On-air BG** while on air. Hover for more detail. Narrow windows retain
these labels; the Tools panels provide sliders hidden to make room.

The **Tools** button opens quick adjustments: **Spacing and mirror**
(**Ctrl+Shift+K**), **Text and colour**, **Take display**, and **Voice and
microphone**. Changes show straight away. Drag a panel by its title to move
it out of the way; double-click the title to recentre it.

Settings reuses these controls in **Appearance** under **Theme**, **Text**, **Directions**, **Background**,
**Reading aids**, **Spacing** and **Screens**, plus **Recording > Takes** and
**Prompting > Script**. There is
one copy of each control; closing Settings returns it to the quick panel.

![The Layout panel](images/layout-panel.png)

- **Text opacity**, **Backing** and **brightness**: how see-through the words
  are, how solid the dark band behind them is, and how bright the text is.
  They're separate, so you can have solid text on a faint background.
- **Background on air**: the backing while you're on air (scrolling, held at
  a stop, or the **On air** button lit); **Background** is the level the rest
  of the time. Off air the window is solid, like any other; on air the
  backing goes almost clear (7% to start with), so you can see your slides or the
  call behind the words while you read. The control
  bar's Background slider changes whichever is in use: its label reads **On-air BG**
  while you are.
- **Margins** keep the text narrow, so your eyes stay near the camera. The top
  and bottom margins fade the text out near the edges.
- **Script and heading line spacing** are independent, in
  **Appearance > Spacing**. Inline direction and production note spacing
  each have their own control in **Appearance > Directions**.
  Each runs from 100% to 250% of its own font size.
  Wrapped directions can be tighter than the spoken text; spoken quotations
  keep script spacing. Existing profiles retain their previous spacing.
- **Alignment** (left or centred) and the **reading line**:
  where the line you're reading sits. Put it just under your webcam.
- **Heading size**: section headings grow with the text, so if they get too
  big when you make the text larger, lower this. 100% is their usual size
  next to the text (40% to 150%).
- **Mirror**, the **reading-line marker**, the **sentence highlight** and the
  **progress bar**.
- **Reading aids** (below), the **ON AIR** light and an optional start beep.
- **Hide from screen capture** and **click-through** (below).
- **Talking points**, the **pacing light**, the **take summary** and **Follow
  the script's pace** (see [Recording a take](05-recording-a-take.md)).
- **Show directives**: see `{ }` instructions as tags, to check a script.

## Reading aids

The separate **Appearance > Reading aids** topic brings these choices together.
Fonts are in **Appearance > Text**, and colour themes are in **Appearance > Theme**.

![Reading aids grouped together in Settings](images/settings-aids.png)

- **Theme**: standard, yellow on dark, high contrast or soft cream.
- **Font**: standard, Atkinson Hyperlegible, OpenDyslexic or Verdana. Some
  people find Atkinson Hyperlegible or OpenDyslexic easier to read.
- **Heading font**: section headings and titles can have their own font, for
  example Standard headings with OpenDyslexic text, where the dyslexia font
  makes big headings hard to read. **Same as the text** (the default) follows
  the Font above.
- **Inline directions**: **Appearance > Directions** groups visibility,
  size, colour and line spacing for `[square-bracket cues]`. Size is 40–150%
  of their usual size: at 100%, Dimmed cues remain smaller than the script,
  while Normal cues match it. Quoted words you read aloud keep their script
  style and remain spoken. Unquoted cues such as `[smile]` stay outside word
  counts, speech tracking and timing.
- **Production notes**: a separate group on the same tab controls long
  `<!-- preparation notes -->`. Their size runs from 40–200% of the usual
  note size, which is 55% of the spoken script. Their colour and spacing are
  independent of inline directions and headings. Notes show while paused,
  hide during delivery and remain silent, including any quoted contents.
  Both groups follow **Heading font**. Each colour swatch has its own **Theme**
  reset, and all these controls save immediately.
- **Text effect**: an outline or a shadow on the text, for busy backgrounds.
- **Focus band**: dims the lines away from the reading line, with a strength
  setting.
- **Sentence highlight**: lights the sentence you're on (see
  [Scrolling and voice](03-scrolling-and-voice.md)).

## Settings > Appearance > Screens

![Window, monitor and eye-line settings under Appearance > Screens](images/settings-display.png)

Window and monitor placement, Keep on top and the eye-line strip. Fonts and
heading size are in **Appearance > Text**; backing is in **Appearance > Background**
and colours are in **Appearance > Theme**. Highlights are in **Appearance > Reading aids**;
the reading line is in **Appearance > Spacing**. Mirroring is in **Appearance > Screens**. Delivery directions are in
**Prompting > Script**.

## Mirroring

For beam-splitter rigs, where you read the screen through angled glass,
mirror the prompter. In **Settings > Appearance > Screens > Beam-splitter mirroring**, two
buttons do it: **↔ Left–right** (most beam splitters) and **↕ Up–down**. Each
stays lit while it's on; click it again to turn it off. Both lit mirrors both
ways, and the panel stays open. **Ctrl+M** steps through off, ↔, ↕ and both.
The control bar, the pad and the control window stay
readable.

For the clearest camera image through the glass, set **Background** to 100%
and **Text brightness** to about 70% in the Reading view.

## Eye-line mode

**Ctrl+L** shrinks the prompter to a strip at the top centre of the screen,
right under the webcam. Its width, height and reading line are set separately
on **Settings > Appearance > Screens**.

## Keeping the prompter off recordings

Tick **Hide from screen capture** in the Layout panel, and the prompter won't
show up in screen shares or screen recordings (Zoom, Teams, Riverside, OBS and
so on). You still see it.

Settings, keyboard Help, voice-command help and Guide adjustments follow this
preference too, including changes while they are open. Turn it off to capture
these windows for support. The head-guide overlay keeps its own protection.
For a deliberate demo or support recording, **Settings > Debug >
Allow all windows to be captured** temporarily overrides every window's
protection, including the guide. Its banner stays visible until you turn it
off; quitting resets the override without changing your saved preferences.

**Click-through** (**Ctrl+Shift+X**) lets clicks on the script go to the
window behind, so you can work in another app with the script on top.
