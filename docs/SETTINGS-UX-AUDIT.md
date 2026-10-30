# Settings usability and accessibility review

30 October 2026 · OBS development branch · implemented and checked locally.

[View the screenshot gallery](guide/settings-gallery.md).

The review covered finding settings, understanding their effects, saving and
cancelling changes, keyboard operation, contextual help and visual consistency.
The panel keeps its agreed 660 × 560 size, reducing only to fit a smaller
prompter window. Longer topics use pages, with no scrolling.

## Findings and changes

| Finding | Resolution | Evidence |
| --- | --- | --- |
| Fonts, backing, colours and reading aids shared a long topic | Appearance now has Text, Background, Reading aids, Spacing and Screens. Body and heading fonts sit together; heading size is with typography | All 18 topics are reachable; rendered screenshots reviewed |
| A separate question mark and caption took space and could describe a whole section rather than its option | Approved superscript-style pills sit beside the relevant label; broader explanations use a section heading | 17 × 12 visual pill inside a 24 × 24 target; no repeated caption |
| Adding help inside an implicit control label could make a help click toggle the setting | Controls use explicit labels, with help as a separate sibling button | Every form control has an accessible name; no help or numeric buttons nested in labels; clicking checkbox help leaves its value unchanged |
| Immediate-save behaviour was hidden in optional help, while text size is only a preview | Live fieldsets visibly say Saved immediately as you adjust. The text-size preview has its own Apply/Save & close note | Live notes remain visible on later pages of their fieldset; shared controls still persist |
| Apply and Save did not explain the difference without a hover | Apply stays open; Save & close names its effect. The footer announces Unsaved changes and Saved | Trusted input updates draft feedback; Apply preserves the live reading-line value |
| Choosing or clearing a cue file did not flag the pending draft | Both paths now mark Settings as changed | Source event paths reviewed alongside existing close/save/discard behaviour |
| Invalid numbers could be normalised without pointing to the problem | Save checks native validity before applying. The relevant topic and page open, the field gets focus, and native validation explains its limits | An invalid API port entered on another topic returns to the correct field and prevents saving |
| Some native actions and checkboxes used light defaults; shared controls had inconsistent widths | Dark native controls, grey secondary actions, blue primary action, consistent select columns and slider rows | Rendered controls reviewed; inputs have stronger boundary contrast |
| Next-page focus could land on help rather than the setting | Paging focuses the first editable control or ordinary action | Paging and keyboard checks pass without opening an unsolicited explanation |
| Some informational paragraphs contained usable links | Links remain in the form rather than inside a non-interactive tooltip | No links or buttons occur inside tooltip content |
| An OBS slate message referred to an old Settings location | It now points to Recording > Takes | Source path corrected; OBS tests pass |

## Principles used

Related controls have named groups and explicit labels, following the WAI
[grouping](https://www.w3.org/WAI/tutorials/forms/grouping/) and
[labelling](https://www.w3.org/WAI/tutorials/forms/labels/) guidance. The main
groups follow the user's task; the same control is reused in quick panels.

Help opens on hover, focus or click and is dismissed with Escape without
closing Settings. The pointer can move onto the explanation without losing
it. This follows the interaction goals of
[Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus).
The small visual pill retains a larger target, following
[Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The tab rows use selected-state semantics, roving focus, arrows and Home/End,
following the [APG tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
Validation uses native field constraints and directs the user to the problem,
following the [WAI validation guidance](https://www.w3.org/WAI/tutorials/forms/validation/).

Calculated ratios for the declared palette: primary text 5.16:1, secondary
button text 9.48:1, input boundary against the panel 3.77:1, question-mark text
9.85:1 and its boundary against the panel 4.69:1. These calculations cover
those colour pairs; they do not measure every OS-drawn control state.

## Verification

- Existing core suites pass with `npm test`.
- The isolated Electron check, `npm run test:production-app`, visits all
  18 topics and every generated page at 1100 × 900 and 560 × 500.
- Each page keeps the same frame size and footer position. Visible controls
  stay inside the panel, with no scrolling. Eighteen word rows remain
  reachable through pages.
- Checks cover names and label structure, help target size, nested-span
  clicks, hover persistence, focus, Escape, tab navigation, pending changes,
  cross-topic validation and saved shared controls.
- OBS, head-guide and continuous module-handover checks remain in the same
  run. The generated test profile uses a fake OBS connection and microphone
  capture stays off.
- Documentation and screenshots are refreshed for this development build.

## Remaining manual review

Run first-time tasks with Joanne or another speaker: find the microphone,
choose command listening, adjust off-air backing, configure OBS and collect
an edit pack. This evaluates discoverability rather than only control access.

NVDA/VoiceOver, stronger magnification, high-contrast OS themes and native
macOS/Linux controls still need hands-on checks. The automated evidence
above supports this review; a full accessibility conformance assessment
requires that wider testing.

A separate Settings window remains roadmap item 48. This pass improves the
existing dialog; the five production validations still govern publication.
