# Settings layout fidelity

## Preview 06 combined approved batch

The approved 2 November batch extends the same composition. The native app
retains the expanding left navigation, centre controls, right example, header
search and fixed footer. Function groups use the same button tabs as Text and
directions. The queue's Prompter layout name and toolbar mirror icons appear
in the [current native Screens capture](../guide/images/settings-preview06-screens.png).
Compare it with the approved [combined interactive review](settings-feedback-batch-prototype.html)
at the same desktop width. The prior typography comparison below records the
unchanged base composition separately from functional checks.

The [gallery](../guide/settings-gallery.md) includes every named section,
guide appearance/reference and the compact companion. At wide widths the
third column remains visible even in a short window. At narrow widths the
companion is a non-modal native window; Settings remains interactive and its
Close button keeps normal size. Native checks additionally cover five sizes,
every subtab and real pointer interaction. Hardware/recording acceptance is
separate from this layout review. No public release is implied.

## Preview 05 base composition

The user reauthorised implementation of the original interactive preview on
2 November 2026. Its source at `d1302a1` remains the reference. Native layout
rules map directly from that preview, while existing form controllers retain
their values, drafts and service permissions.

## Matched production-note screen

[Approved screen, full size](images/typography-production-notes.png)

![Signed-off interactive preview](images/typography-production-notes.png)

[Real app, full size](images/layout-signed-off-typography.png)

![Real Preview 05 with expanding navigation, central typography and the dedicated right sample](images/layout-signed-off-typography.png)

The real app uses its native utility-window frame. The composition, labels,
column ownership, header search, fixed footer and preview modes follow the
approved demo. This image uses matching note/heading sizes for comparison;
the user's saved appearance is retained when launching the app.

## Checks independent of functional tests

- Area labels/order are checked against the actual approved HTML source.
- Areas form one vertical list; exactly one child section list expands under
  its own area. The selected area has the approved highlight.
- Desktop rectangles establish left navigation, centre controls and right
  preview. The sample must not appear inside the controls column.
- Header search opens the actual named section.
- Reading hides only the sample's production note. Prompting remains stopped.
- Compact selectors and Preview dialog follow the approved responsive design;
  Escape dismisses only the example.
- All 34 sections and four typography targets fit the checked frames. Native
  source and packaged-app checks supplement matched screenshot inspection.

The full unit suite, source lint, theme/mapping/close-guard checks and production
guide/recorder fixture remain required. Physical output, clean tracks, capture
exclusion and camera/mic sync still need the actual recording acceptance.
