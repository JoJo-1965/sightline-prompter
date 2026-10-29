# OBS integration: review and merge notes

Developed on `codex/obs-integration`, rebased onto main at `4e00136`. The original
checkout and installed app are separate. Do not release or merge this
branch until the recording workflow has been reviewed.

## Included

- Floating head-position guide (55), independent of OBS: move/resize,
  size/opacity/colour, saved placement, click-through lock and global
  Ctrl+Shift+H show/unlock/hide hotkey. Menu recovery if the hotkey is in use.
  Always capture-protected, with no camera/mic access or OBS source.
  The separate Stream Deck `codex/head-position-guide` branch adds its key.

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

The guide now supports borderless screen-fill/chromeless mode and restores
its windowed bounds. Ctrl+Alt+H and a separate Stream Deck action toggle this;
Ctrl+Shift+H reveals controls without exiting fullscreen. The prompter is
temporarily placed above the guide while it is open; its Keep on top setting
is restored on close. Verify the real OBS projector's own Always on top setting
does not compete, and verify placement across multiple displays.

Check the framing guide on the real preview and chosen screen-capture method,
hotkey registration, moved/unplugged displays and Stream Deck hardware. An
isolated Electron run verified popup/preferences, lock/unlock/hide/reopen,
saved placement and the Stream Deck button-token API route.

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

Recording references update saved logs for all scripts associated with that
recording during the same app session. Earlier exports and reconnect/restart
gaps may lack the final association. OBS files are never copied or deleted.

## Mandatory production validation before publication

Joanne has explicitly held publication until all five are validated:
exact recording-script snapshots; confirmed filenames and estimated OBS
clock positions on takes/markers; session guide metadata and capture
exclusion; separate clean camera and unprocessed microphone; a known
recorded picture-and-sound sync route. Unit and isolated-app checks cover
the snapshot, ledger, help and manual guide features. Clean-track and
recorded-sync validation remain pending. No tags or releases while held.

The guide now has independent Ideal position and Actual position outlines,
manual drag/nudge/scale, saved Centre/Beside placements and per-take metadata.
It performs no face tracking. A real camera test must check the guide stays
out of the recorded picture and assess physical lip sync separately.

Run `npm test` for unit checks and `npm run test:production-app` for the
isolated Electron checks. The latter uses a temporary profile, a simulated
authenticated OBS server and disabled microphone features; it does not
connect to the user's OBS. Port 9335 must be free. Screenshots and logs are
written to temporary folders, reported on completion.

## Separate follow-up work

The Stream Deck repository needs two new actions, Record take and Finish
recording, with state feedback and updated profiles. Keep these distinct
from raw OBS actions because they coordinate OBS with Sightline prompting.

An OBS dock is optional, after testing whether the existing control window
is enough. It could reuse a limited local-control surface for section/take,
prompting controls, markers and ratings. It is not part of this build.
Scene switching and streaming controls are also outside this branch.
