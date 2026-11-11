# Approved HUD cues design

**Approved by Joanne on 6 November 2026:** “Ok lock that in”.

This is the implementation reference for the HUD cues reviewed in this session.
Preserve the approved composition and behaviour. Earlier mock coordinates,
screen-third interpretations and collision-only hiding rules are superseded.
Approval covers this design; it does not claim the feature is built or released.

## Cue-pill placement update — 11 November 2026

Joanne explicitly requested: “The HUD should really be at the top just above
the sightline or I won't see it.” This supersedes the gold cue pill's earlier
lower-screen placement only. Position it just above the active reading line,
use a compact pill in short windows and avoid toolbar/session controls where
space permits. Preserve the script layout and all pointing-target geometry,
layers, lifecycle and Recording/Review rules below. Native candidate captures
show the revised position for review; no new settings page is introduced.

## Locked placement and behaviour

- **Side target centres:** halfway across each gap between the saved head-guide
  edge and the corresponding visible prompter edge. Screen-left centre is
  `(view.left + head.left) / 2`; screen-right centre is
  `(head.right + view.right) / 2`.
- **Height:** both side targets sit at the same level, just below the saved
  eye line. Derive placement from that reference; the example's fixed screen
  percentages are not the implementation rule.
- **Reference:** use the saved/shared head guide. Keep a target fixed throughout
  its gesture; do not chase live head movement or move it when words cross it.
- **Layers:** pointing targets sit behind the prompter text. Words remain clear
  in the foreground while scrolling across a marker. Cue appearance/disappearance
  must not reflow the script or change the reading position.
- **Mode:** floating HUD directions and pointing marks appear in Sightline's
  Recording mode. Review mode retains the existing inline `[]` display and
  saved appearance/visibility preferences. This is independent of OBS status.
- **Lifecycle:** show the current cue/target when needed and clear it when the
  cue finishes. All four targets together are a layout comparison, not the
  normal delivery display.
- **Direction meaning:** left/right remain the presenter's own sides. Mirror
  the displayed head geometry and target positions consistently, without
  changing the recorded authoring/editor meaning or prescribing a hand.
- **Other HUD items:** retain the large gold cue pill and familiar section and
  recorder indicators. The pill can use clear space around the prompter;
  pointing-target permission to sit behind words does not permit controls to
  obscure the reading area.

Existing spoken Say text remains spoken/inline. Preparation comments and
operational pause/record directives keep their distinct behaviour. Preserve
saved scripts/settings and captured production-cue metadata during implementation.

## Frozen visual reference

Private snapshot folder:
`D:/Sightline/Dev/Design/HUB-Cues/Approved/2026-11-06-head-gap-midpoints`.

Primary image: `full-camera-head-gap-text-over-markers-screen.png`.
Companion: `full-camera-head-gap-midpoints-screen.png`.
The snapshot also contains the interactive mock, render scripts, camera source,
record/review examples and measured geometry/layer checks. `manifest.json` records
SHA-256 hashes. Personal camera material stays in the private snapshot, outside
the public repository. Use frozen copies rather than changing preview filenames.

## Implementation acceptance

Compare the native app with the frozen reference at matching viewport sizes and
states; functional checks alone do not establish layout fidelity. Verify both
gap midpoints and below-eye alignment with centred/off-centre references and
mirroring, stable targets during gestures/scrolling, foreground text legibility,
cue lifecycle, no cue-induced text movement, and Recording/Review transitions.
Check compact windows and monitor changes without breaking the saved reference.

Any proposed departure from this reference needs a new visual review before
implementation. Implement within the combined UAT batch; this sign-off does not
authorize replacing the current installer, tagging a release or publishing a site.
No supported feature-grid row is added until native implementation is validated.
