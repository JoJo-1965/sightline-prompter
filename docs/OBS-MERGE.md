# OBS integration: review and merge notes

Developed on `codex/obs-integration`, rebased onto main at `4e00136`. The original
checkout and installed app are separate. Do not release or merge this
branch until the recording workflow has been reviewed.

## Included

- Settings > OBS, disabled by default, authenticated WebSocket v5 connection,
  saved connection test and reconnection while enabled.
- Status-only mode, then separately permitted recording controls.
- Record take: OBS confirmation before the usual prompting sequence.
- Finish recording; ordinary prompting and On air stay independent.
- Control-window, phone and voice actions; API actions ready for a later
  Stream Deck plugin update.
- Optional section/take and marker chapters, with graceful format failure.
- Additive OBS observations and file references in take logs and edit packs.
- Separate OS-protected password storage; no password in settings exports,
  API responses or renderer status. Disabled startup does not decrypt it.
- User guide, screenshot, privacy notes, session skill, roadmap and change log.

## Validation

`npm test` includes the OBS protocol, permission, timeout, credential and
take-log tests. The existing application tests remain part of that run.
Lint and the documentation check must pass before merge.

An isolated Electron smoke test used a temporary profile and a simulated
OBS WebSocket server. It exercised default-off startup, authenticated
connection, saving settings, status-only refusal, recording start, section
chapter, finish, persisted take-log file reference and disabling without
stopping the simulated recording. It does not establish compatibility with
every OBS output configuration or real camera/audio setup.

## Before merge and release

1. Review against current main. Settings and related help may have moved
   while this worktree was isolated; resolve those changes deliberately.
2. Test with real OBS: normal recording, existing recording, paused recording,
   wrong password, OBS closure, disconnect during a command, and disabling
   while recording. Confirm actual file paths and playback.
3. Test chapters with a supporting format and failure with an unsupported
   format. Keep the slate/audio sync checks; network observations are not
   frame-accurate timing.
4. Test macOS keychain and Linux keyring behaviour before promising those
   credential flows have been exercised on hardware.
5. Update the website from the guide after merge. Do not claim a live download
   includes this integration until it has actually shipped. Publish amended
   privacy wording alongside that release.

Recording references currently update the active script's log. Earlier
exports, logs for scripts closed before OBS finishes, and reconnect gaps
may lack the final file association. OBS files are never copied or deleted.

## Separate follow-up work

The Stream Deck repository needs two new actions, Record take and Finish
recording, with state feedback and updated profiles. Keep these distinct
from raw OBS actions because they coordinate OBS with Sightline prompting.

An OBS dock is optional, after testing whether the existing control window
is enough. It could reuse a limited local-control surface for section/take,
prompting controls, markers and ratings. It is not part of this build.
Scene switching and streaming controls are also outside this branch.
