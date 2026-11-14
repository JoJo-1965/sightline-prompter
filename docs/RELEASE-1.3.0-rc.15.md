# Sightline 1.3.0 RC15

## RC15 — Recording evidence, MCP setup and diagnostics

14 November 2026 · documentation revision 31. Includes RC14. This is the
bounded batch for roadmap items 2, 3, 6 and 7 in the proposed v2 release scope.
The package retains the development version 1.3.0-rc.15; public naming and
publication remain release decisions.

- **Recording associations:** late Stop responses cannot give an older file
  to a newer recording. Reconnect gaps and observed clock restarts are explicit
  uncertainty; split files keep separate identities and unverified clocks.
  Recording review and `recording-links.json` expose take/file evidence.
- **Recorded word timings:** adjacent takes cannot borrow each other's repeated
  openings. Missing transcript coverage is unavailable evidence. Shared starts,
  zero durations, overlapping and low-confidence words produce timing warnings;
  unreliable pace is withheld. Recompare saved transcript refreshes comparison
  without another model run. Original logs, live exports and keepers remain.
- **MCP setup:** Connections > MCP, AI, and API provides copyable JSON and a
  Codex CLI command using the installed adapter and this running profile.
  Check connection is read-only; the adapter also accepts `--check`.
  Eight tools, existing schemas and separate permission grants remain.
- **Diagnostics:** Debug > Status and recovery shows the opened microphone,
  applied processing, listening state, recent command words/results and OBS
  connection/recording state. Command words expire after ten minutes or Clear;
  they are session-only. Persistent command tracing remains separately opt-in.

Existing Stream Deck IDs/profiles and pad/phone mappings retain their meaning.
No new controller buttons or directive syntax are required. Automatic post-stop
transcription, full command training, additional sync analysis and Demo mode
remain later work. Physical recording/microphone/device UAT is still required.

[RC15 checklist](uat/1.3.0-RC15.md) · [Recording review](guide/19-post-record-review.md)
· [MCP setup](guide/17-configure-mcp.md) · [Diagnostics](guide/08-shortcuts-and-troubleshooting.md)
