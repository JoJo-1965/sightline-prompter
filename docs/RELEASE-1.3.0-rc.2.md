# Sightline 1.3.0 RC2 preview

4 November 2026 · documentation revision 18 · companion candidate 0.2.1.1.
Stable Sightline 1.2.0 and companion 0.2.0 remain the public releases.

## Useful controller functions

Stream Deck has grouped action entries with a Function selector. Each placed
key performs its chosen function directly and shows its own icon. Play/pause,
Record take and Finish recording retain dedicated entries. Navigation adds
Again; Reading mode offers Notes, Voice and Scroll explicitly. The Adjustment
dial offers pace, text size, scrolling, sections or backing, with a visible
press/tap choice. The focused Head guide dial remains available.

The pad, phone and mapped keyboard/controller picker use the same workflow
names. Preparation controls open the real workflow, run the combined room/voice
check, start/stop/play a test, lock a detected draft position, restore a recording
reference or return after a break. Saving requires the existing framing, audio
and human picture/sound acceptance. Assigning a key never starts capture.

Recorder utilities explicitly pause/resume OBS, with enabled/permission,
connection and confirmed-state checks. Recording review opens the current
script's logged session; reviewed export needs matching post-record evidence
and asks for a destination in the app. Neither function downloads a model or
starts transcription. Display-only status keys default to no press action.

## Compatibility

All 34 published key/dial UUIDs remain registered. Older entries can be hidden
from the action list while saved keys, settings, states, resource paths and
profiles continue working. There is no automatic profile conversion or switch.
The two RC2 profiles are separate opt-in layouts; the blank Virtual profile,
existing Virtual layouts and MCP Deck stay separate.

RC1's recording review, audio alignment and optional guided tour remain in this
build. See [RC1 notes](RELEASE-1.3.0-rc.1.md) and the
[controller guide](guide/21-controller-functions.md).

## Acceptance limits

Windows source and packaged checks are recorded in the handoff manifest.
Joanne's physical camera, microphone, OBS and controller workflow still need
morning UAT. Mac/Linux hardware and dial feel are not certified by Windows
fixtures. No stable release, live website deployment or Marketplace submission
is part of this preview. Existing production recordings remain unchanged.
