# Plan, write and edit pointing cues

This contract is for script writers, authoring agents and production agents.
Structured cues require Sightline 1.3.0 RC3 or later. The app syntax is a silent
square-bracket direction, not an executable curly-brace command.

## One cue in three places

For each useful graphic moment, agree a short stable `graphic` label, the
presenter's direction and the exact spoken phrase. Put the same label in the
shot/direction plan, the preparation comment and the inline performance cue.
Do not add gestures to every paragraph; keep natural delivery and clear space
for the intended visual. Leave a missing asset explicitly to be supplied.

```md
## Show the trend {target: 0:10}

<!-- GRAPHIC growth-chart. Show the reviewed trend chart beside the gesture.
Confirm recorded orientation; keep the face and captions clear. -->

[point left: growth-chart]
Here is how the figures changed.

{stop}
```

The presenter sees a short cue while reading; the longer production comment
shows while paused. The label remains silent even in quotes. Existing Inline
directions styling and Normal/Dimmed/Hidden visibility apply. Use Normal or
Dimmed when recording the gesture. Quoted `[Say: "words"]` remains spoken.

## Authoring checklist

1. Read the current AI script brief and confirm the intended app supports this
   syntax. Do not silently upgrade a stable-release script's requirements.
2. Plan the visual and its useful gesture before adding the cue. Record the
   label, direction, section, exact spoken anchor, visual purpose and asset
   status in the direction plan. For reusable source use labels, not private paths.
3. Use `left`, `right`, `up`, `down`, `up-left`, `up-right`, `down-left`,
   `down-right` or `centre`. Directions mean **the presenter's own sides**.
4. Put the cue in a section body immediately before the relevant spoken phrase.
   Keep long editorial instructions in the adjacent production comment.
   Match the label/direction to the plan. Do not count cue labels as speech.
5. Run the script checker and review the result. Also compare the plan and
   generated script: every planned cue needs a matching direction/label/anchor,
   and every scripted cue needs a planned purpose. The checker alone does not
   prove that a generator preserved the cue or that a graphic exists.
6. Make an editable revision for a new performance. Do not retrofit intended
   gestures into an earlier recording's immutable script/take snapshots.

## Academy source and generated scripts

Academy Authoring can store inline delivery direction as
`<!--[point left: growth-chart]-->` in its source `script.md`. That is a house
source convention, not Sightline's live cue syntax. Production's generator must
emit `[point left: growth-chart]` outside HTML comments in the final Sightline
script, preserving the label, anchor and existing `[Sn]` section mapping.

Sightline deliberately treats HTML comments as preparation notes. A cue left
inside a comment in the delivered script hides while reading and produces no
structured pointing metadata. Verify the actual generated file before marking
it Ready to record. Run the generator read-only into scratch, then check that
each source gesture appears as a visible bracket cue at the intended phrase.
Do not claim generator support from a hand-written example or modify approved
source/module timing without the normal authoring review.

## Production checklist

- Prefer the captured script snapshot and its `scriptSnapshotId`, then match
  section/take and `selectedTake` in `production-cues.json`. Use CSV for review
  and read `PRODUCTION-CUES.md`. Authored-but-unrecorded cues are not occurrences.
- Use the plan's matching graphic label to resolve or create the intended
  artifact. A label is not an attached file or permission to fabricate data.
- Use nearby spoken text and the qualified timing as navigation, then inspect
  the actual gesture. Reviewed transcript anchors take priority; live following
  is approximate. Null means unavailable, not zero. Apply each file's measured
  offset before using session time. Gesture verification remains a human/video check.
- Confirm recorded horizontal orientation. In an unmirrored shot, presenter-left
  appears viewer-right. A mirrored preview does not establish output orientation.
- Place/hold the graphic to suit the performance without covering the face or
  captions. Follow the approved frame design and review the rendered result.
- If the cue/asset/gesture is missing or a newer script differs from the captured
  take, flag the mismatch and propose a pickup or a clearly separate editorial
  choice. Do not invent an observed gesture or change a keeper silently.

The [script spec](SCRIPT-DIRECTIVES.md), [AI brief](AI-SCRIPT-BRIEF.md) and
[edit-pack fields](EDIT-PACK.md#pointing-and-graphic-intent-13-rc3) are the
technical reference. No asset insertion, new recorder action or automatic
pointing detection is added by these instructions.

## HUD delivery in RC4

Author the same square-bracket source cues; no new directive or gesture key is
needed. In the HUD-enabled RC4, delivery shows the current short cue/pointing
target and Review keeps the inline display. Directions still mean the presenter's
own sides. Complete the gesture towards the marker, then return to the lens;
do not prescribe a hand or ask the performer to mentally reverse the picture.
The marker is fixed relative to the saved framing and sits behind scrolling
text. RC3 keeps its original inline behaviour. Confirm the actual target build
before writing a shot that demonstrates the HUD. See the [HUD guide](guide/22-hud-cues.md).
