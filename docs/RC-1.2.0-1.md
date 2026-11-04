# Sightline 1.2.0 RC 1

Candidate source: `5656b9c`; documentation revision 11. Companion: 0.2.0.
The stable public app remains 1.1.0.

The delivered feedback queue was reconciled with Joanne's explicit RC scope:
Connections merge, OBS subtabs/status, persistent test outcomes, automatic
audio-check meter and yellow section pill. All six are included in this batch.
The approved three-column Settings composition is retained. This records the
delivered queue; it does not claim access to unseen pending chat messages.

Also included: finish/end and restart-section commands, split-twelve handling,
historical OBS endpoint mapping, live-timing qualifications, scoped local MCP,
ad-hoc Mac packaging, UAT 09 and the repeated 10–15 launch coffee reminder.

## Candidate checks

- Source unit suite: passed.
- Official MCP SDK stdio client/server and permission/revocation checks: passed.
- Native Settings: all 34 internal views, fixed layout and five window sizes passed.
- Native preparation: real local inference, synthetic camera/mic, actual WebM
  playback, retained reference, mirrored test outcomes and automatic meter passed.
- Native OBS/MCP app integration: connection/recording states, subtabs, Apply,
  recording lifecycle and live MCP grants/revocation passed against a test server.
- Packaged Windows checks and cross-platform CI: pending candidate packaging.

## UAT focus

1. Review Connections and all three OBS subtabs on your normal display.
2. Check connection pass/fail, then deliberately reject and accept a real test
   clip. Confirm the same result appears in Settings and on the prompter.
3. Run room and voice checks, checking that meter visibility restores afterwards.
4. Read, pause, retake and change sections; check the yellow section/page count.
5. Try “Prompter, restart section”, “next section”, “section twelve” and, only
   in a test recording, “finish” / “end”. Stop remains a prompting pause.
6. With your actual capture route, record a slate after Record, inspect picture
   and sound, and check the new log's file links and historical endpoint samples.
7. Try MCP read-only before granting scripting, prompting or OBS control.

The recorded extra short OBS identity still needs reproduction on the physical
setup; it has not been attributed to a proven cause. Native simulated protocol
checks do not establish camera lip sync or guaranteed speech recognition.
Ad-hoc signing is not notarisation; first-launch security prompts can remain.
Post-record transcription and automatic media-derived offsets remain deferred.

Use a new isolated profile for automated tests. Joanne's retained UAT profile,
pairings, slot 4 script and original production recording package are preserved.
