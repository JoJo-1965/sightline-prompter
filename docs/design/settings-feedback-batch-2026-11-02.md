# Settings feedback batch — 2 November 2026

These are review proposals unless marked implemented. Show the combined layout
before wiring any departure from the signed-off interactive preview. No new
package, RC, supported-feature claim or website deployment is implied.

## Implemented, awaiting the next batched package

- Mode and pace: one selector for Notes / page, Voice and Scroll replaces the
  independent Notes checkbox. Scroll shows WPM, script pacing and countdown;
  Voice shows response; Notes shows page-navigation guidance. Irrelevant fields
  and their number boxes are hidden and disabled. Mode changes retain pace,
  response and countdown preferences. Notes retains the previous underlying
  scrolling choice. Voice still requires speech and microphone input.
- Native checks cover all three modes, retained values, saving/reopening Notes,
  Apply/Cancel, component prerequisites and compact layouts. The running package
  is unchanged. Source captures for review:
  [Scroll](images/mode-context-scroll.png),
  [Voice](images/mode-context-voice.png),
  [Notes / page](images/mode-context-notes.png).
- Mirror group: restore the vertical layout lost when it moved outside the
  old Layout host. Source and the open preview use 12px above the group and
  8px before its buttons. Native checks pass at five window sizes. The open
  preview's temporary CSS lasts for this app session.

## Screens and mirroring — proposal

- Replace the hidden Window and mirroring / Eye-line strip dropdown with two
  visible named tabs. Keep the signed-off left navigation and right preview.
- Show Eye-line strip configuration only when that mode is enabled.
- The blue extra edge is the 2px keyboard-focus outline offset 3px beyond the
  normal border. Propose one consistent focus treatment that preserves clear
  keyboard focus. Do not remove focus indicators globally.

## Head guide — proposal

The current Settings page is only a launcher. The Show guide action invokes
show, not toggle; the label never communicates visibility. Most candidate
settings already exist in the dedicated adjustment window.

| Group | Candidate controls |
| --- | --- |
| Guide | Stateful Show/Hide switch; centred/beside-prompter placement; fullscreen/window state. |
| Appearance | Existing outline colour choices, outline opacity, background opacity and Show Ideal. |
| Recording reference | Saved/not saved status; Save current as recording reference; Restore saved reference; eye-lock state. |

Use the page for setup and the recording reference. Keep the precise eye
centre/level, top/bottom and left/right fitting in the floating Adjust guide
controls, accessible during recording. Keep Save as Ideal separate from Save
recording reference. Restore is unavailable until a reference exists.

When hidden, retain saved guide preferences. Use the right preview for an
illustration of Actual versus Ideal, labelled as manual framing, not tracking.
Any capture status must report the protection policy honestly; it cannot prove
the actual guide is absent from recorded footage.

The mock must fit the fixed panel without scrolling, hidden group dropdowns or
cramped controls. Check compact widths and the absence of hanging label words.
Review what fits before choosing which appearance controls belong directly on
this page. A useful page is the goal; filling every blank area is not.
