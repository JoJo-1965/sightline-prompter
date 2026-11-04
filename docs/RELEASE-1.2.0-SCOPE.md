# 1.2.0 RC scope

Joanne approved UAT 09 and requested a live release, with local MCP support,
the existing automatic head-detection workflow and a Mac launch fix. Free
ad-hoc Mac signing is explicitly authorised; paid Developer ID signing and
Apple notarisation are outside this release's scope.

Joanne subsequently confirmed all six UI items for this RC:

- Merge Controls and Components into Connections; move Restore defaults to
  Getting started.
- Keep one OBS sidebar entry, with Connection, Recording control and Profile
  and scenes button subtabs, preserving feature gating and deep links.
- Distinguish OBS connection from recorder state.
- Show working/pass/fail test feedback in Settings and on the prompter.
- Automatically show the meter during voice and room-noise checks.
- Show a yellow current-section pill on the OBS status row.

Also include the recorded finish/end/restart-section command variants,
section-twelve recognition regression, recorder-file/clock association fixes,
and accurate qualification of live word/coverage/pace estimates. Carry forward
the implemented 10–15 launch coffee reminder and all approved UAT 09 features.

Implement a bounded optional local MCP adapter over the authorised app API.
Remote/cloud MCP, automatic updater installation, Zoom/Teams control, browser
edition, general in-app production recording, post-record transcription and
automatic audio-derived offset calculation are deferred.

Before packaging: review the complete delivered feedback queue, finish the
combined changes, update help/screenshots/feature exports/JL snapshot, and run
appropriate source and packaged checks. Preserve the approved three-column
Settings composition and Joanne's retained profile and promo slot 4.

Prepare one candidate and publish only artifacts whose required checks pass.
Ad-hoc signing verifies bundle integrity; it does not establish notarisation
or promise a warning-free Mac download. Verify Mac signing on Mac runners.
