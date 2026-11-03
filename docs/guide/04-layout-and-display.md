# Layout and display

This source guide follows **Settings Redesign Preview 05**. The released
1.1.0 installer has its own bundled guide.

## Toolbar and live tools

**Edit**, immediately left of **Tools**, edits the current script; samples
open as read-only source. The toolbar has separate left/right and top/bottom
mirror icons. Each axis stays lit while enabled.

Every toolbar slider has a label: Speed in steady mode, Response in voice
mode, Text size and Background. Background changes the backing level in use:
off air or on air. Voice Response controls following speed, not microphone gain.

**Tools** opens below its button with **Prepare**, **Adjust** and **During take**
tabs. It is labelled **Live adjustments**. Text size, backing and line spacing
apply immediately. Other buttons open session checks, script review, framing
and enabled recording functions. A short prompting window uses a separate
Tools window so the controls remain reachable.

**Settings** has permanent controls; opening Tools never moves them.
Its fixed frame uses named sections rather than automatic pages.
Preferences preview together and use **Apply**, **Save & close** or **Cancel**.
See [Settings and its complete section map](07-settings.md).

## Text, directions and notes

Open **Reading > Text and directions**, then choose Spoken script, Headings,
Inline directions or Production notes. Each target has an independent font,
size, colour, Bold, Italic and line spacing. A non-script font can Follow script.
The same slider/numeric controls are used for each target.

Spoken-script size is the toolbar's base size. Other sizes are relative to the
script: section headings normally start at 150%, inline directions at 85% and
production notes at 55%. Titles retain their larger hierarchy.
Line spacing runs from 100–250% of the selected text type's font height.

Inline `[smile]` cues have separate Normal/Dimmed/Hidden visibility. Changing
visibility no longer changes their size. Unquoted directions stay out of
speech alignment, word counts and timing; words explicitly marked for speech
keep script styling.

Production `<!-- preparation notes -->` appear while paused and hide during
delivery. All contents remain silent, including quoted text and directives.
Their font/style, size, colour and spacing are separate from both headings
and inline cues.

## Themes and transparency

**Reading > Theme and background** has Standard, Yellow on dark, High contrast
and Soft cream. The new cream palette has dark text on a light backing;
older saved cream profiles retain their prior colours until changed/reset.

Choose any supported text colour or backing colour. **Use theme** beside a
colour restores only that item's palette colour. Background off air and
Background on air have independent opacity. Text opacity and brightness are
separate, so clear words can sit over a faint backing.

**Save current as…** keeps a named reading theme. Save/load it from My saved
themes, or import/export a portable theme JSON file for another computer.
Themes contain reading appearance, not the entire UI, recorder configuration,
window geometry, scripts, pairings or credentials. Use the separate settings
file transfer for broader supported preferences.

## Layout and reading aids

**Reading > Prompter layout** contains alignment, side/top/bottom margins and reading-line
position. The top/bottom margins fade the text near their edges.

**Reading > Reading aids** groups the reading marker, sentence highlight,
progress/time, focus band/strength and outline/shadow text edge.
The focus band dims spoken text; production comments and inline directions
retain their own appearance. Margin fading still applies to all text.
A named choice shows slide cues and directive tags separately.
Long notes remain silent regardless of their display settings.

## Screens and mirroring

**Reading > Screens and mirroring** uses named Window/mirroring and Eye-line
strip choices. Set the monitor, always on top, toolbar visibility, click-through
and capture preference there. The mouse pointer remains visible when the
toolbar hides.

## Mirroring

For beam-splitter rigs, where you read the screen through angled glass,
mirror the prompter. In **Settings > Reading > Screens and mirroring**, two
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
on **Settings > Reading > Screens and mirroring > Eye-line strip**.

## Keeping the prompter off recordings

Enable **Hide from capture** in **Reading > Screens and mirroring** to request
exclusion from supported capture routes while keeping the prompter visible
to you. Verify a short recorded file in your chosen recording setup.

Settings, keyboard Help, voice-command help and Guide adjustments follow this
preference too, including changes while they are open. Turn it off to capture
these windows for support. The head-guide overlay keeps its own protection.
For a deliberate demo or support recording, **Settings > Debug >
Allow all windows to be captured** temporarily overrides every window's
protection, including the guide. Its banner stays visible until you turn it
off; quitting resets the override without changing your saved preferences.

**Click-through** (**Ctrl+Shift+X**) lets clicks on the script go to the
window behind, so you can work in another app with the script on top.
