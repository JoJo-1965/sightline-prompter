# Pre-record workflow PoC

Design experiment requested by Joanne, 2 November 2026. It supplements manual
guide adjustment with optional automatic position feedback. It has two jobs:
establish good framing, and restore the same position after a break for
consistency between shots. This is not an installed-app feature.

## Design plan

Use the accepted Sightline palette: canvas #14171c, surface #272c34, field
#20252d, blue selection #294d70, gold #edc766 and pale text #eef2f7. Reuse Segoe
UI and standard compact controls. Red/amber/green have a specific role in the
cutout mask; grey means unavailable. Colour always accompanies text.

The desktop layout has a workflow sidebar, camera/guide example and contextual
controls. On phones the steps become a compact top strip and the stage and
controls stack vertically. Leave deliberate gaps before headings and actions.
The numbered steps represent an actual sequence, not decorative labels.

The distinctive element is the existing head/shoulders cutout, with a fixed
target and a movable simulated person. The rest follows the approved app
language. This avoids introducing a separate dashboard visual style.

## Scope and behaviour

- Align head, verify audio, make/review a short test, save reference, ready.
- Manual adjustments remain available. Optional detection changes the mask and
  supplies arrows; no face detection is implemented in this mock.
- Lock current position establishes a draft target. Explicit Save commits it
  after the test. A return after a break restores that same immutable reference.
- Compare eye centre, eye height and apparent size. Natural movement has a
  tolerance. A lost face is grey and cannot claim automatic alignment.
- Audio scenarios include quiet/noisy/clipping advice with acknowledgement;
  an unavailable microphone is distinct. Gain is never forced upwards.
- The illustrated test requires picture/sound review acknowledgement. The
  mock records no media and plays no real audio.
- Save only simulated reference data in this browser. New setup retains the
  previous reference until explicit replacement. No app state, camera, mic,
  recorder, API key or production recording is accessed.

Serve `pre-record-poc.html` at `/prepare` on the existing private review server.
This PoC does not change Preview 07, its approved Settings layout or release
claims. The separate spacing observations remain queued for the PC review.

## Review checks

The browser walkthrough passed 17 checks: colour transitions, unavailable
tracking, Lock current, advisory audio acknowledgement, test completion/review,
explicit Save, Ready, restore after a break, unchanged saved target and manual
fallback. Portrait checks at 390×844 cover alignment, audio, warnings, test
review, Save and Ready without horizontal overflow or controls outside the
viewport. Desktop and phone captures were inspected. No media API or external
model/script is loaded by the mock.

Private review URL: `http://100.72.209.97:4882/prepare` through Tailscale.
The PC must remain awake. Demo references are isolated in localStorage under
`sightline.pre-record-poc.v1`; they do not alter Sightline preferences.
