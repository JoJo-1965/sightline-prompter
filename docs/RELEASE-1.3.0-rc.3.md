# Sightline 1.3.0 RC3 preview

Documentation revision 19 · compatible with Stream Deck candidate 0.2.1.5.
Stable Sightline 1.2.0 remains the public app release.

## Cue a gesture and graphic

Write `[point left: growth-chart]` before the relevant spoken phrase. The
presenter sees a short inline direction. The production agent receives the
same intent with the captured script, section and take. Left/right always
mean the presenter's own sides. Up/down, four diagonals and centre also work;
the graphic label is optional and remains silent even in quotes.

The existing Inline directions font, size, colour, attributes, line spacing
and Normal/Dimmed/Hidden controls apply. Generic notes and quoted `[Say: ...]`
speech remain supported. No new Settings layout or app command is introduced.

## Hand over the intent

The edit pack adds `production-cues.json`, `production-cues.csv` and
`PRODUCTION-CUES.md` when the captured script has structured cues. It keeps
each retake, selected-take status, source snapshot and nearby spoken anchors.
Matching reviewed transcript evidence takes priority over live estimates.
Unavailable timing stays null. These are navigation candidates, not measured
gesture times. The editor checks the visible gesture, recorded orientation
and chosen asset before placing anything. No asset is downloaded or inserted.

## Try it

Open **Files > Sample scripts > Pointing and graphic cues**, or Save a copy
and add a cue to your own script. Keep inline directions Normal or Dimmed.
The start tour, authoring brief, machine spec/checker, user guide and feature
grid describe the same syntax. A separate promo supplement is included.

RC1 recording review and RC2 controller functions remain included. RC2 profiles
and existing installed settings are not migrated by this preview. Original
recorded scripts, master media and old snapshots remain unchanged.

## Validation and remaining acceptance

Authoring follow-up in the source branch: script and production agents share
`POINTING-CUE-AUTHORING.md`, with a complete promo draft and matching cue plan.
It also requires a check of Academy source-comment conversion in generated
scripts. Installed local skills can use this now; the frozen installer receipt
predates this documentation/kit follow-up and is not silently replaced.

Parser/export tests cover all directions, silent labels, retakes, snapshot
matching, reviewed/live/missing anchors and legacy packs. A native isolated
Windows check covers real rendering, speech exclusions and saved take snapshots.
The handoff manifest records packaged checks. No microphone, camera, OBS or
user profile is used by these fixtures.

Joanne should rehearse an actual cue, export the pack and check it beside the
chosen take. Physical performance, production-agent editing and Mac/Linux UAT
remain human acceptance work. This preview does not publish a release or site.
