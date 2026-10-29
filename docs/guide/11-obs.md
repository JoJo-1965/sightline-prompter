# Recording with OBS Studio

**Development branch: not yet merged or released.** These instructions
describe the optional OBS integration being prepared for a later release.

Sightline connects to OBS Studio's built-in WebSocket interface. OBS handles
the audio and video recording; Sightline handles the script, takes and edit
information. You do not need a separate OBS plugin, Stream Deck or MCP server.

![The OBS settings tab](images/settings-obs.png)

## Connect once

1. In OBS Studio 28 or later, open **Tools > WebSocket Server Settings**.
   Enable the server and authentication. Note its port and password.
2. In Sightline, open **Settings > OBS**. Tick **Enable OBS integration**.
3. Use **127.0.0.1** for OBS on this computer. Enter OBS's port (normally
   **4455**) and password, then click **Apply**.
4. Click **Test saved connection**. Test uses the saved values; apply any
   changes first. A failed test shows a reason without starting recording.

The screenshot uses an isolated test server, so its port differs from OBS's
usual default. The password field never displays a saved password. Leave it
blank to keep the existing one, or select **Remove the saved OBS password**.
Passwords use the operating system's protected storage and are excluded
from settings exports and the local control API. On Linux a working keyring
is needed; Sightline does not fall back to plaintext password storage.

The connection is off by default. Disabled means no OBS socket, polling,
reconnection attempts or commands. Disabling or quitting Sightline leaves
OBS recording. Apply or Save the disabled setting to disconnect.

OBS on another computer can be addressed by hostname or IP, but this initial
integration uses unencrypted WebSocket. Use it only on a trusted network;
the default is this computer. There is no automatic network discovery.

## Watch status, or enable recording controls

Leave **Allow Sightline to start and stop OBS recordings** off for status
only. Sightline shows whether OBS is recording, paused or stopped, with
the same information in its control window. A lost connection shows
**recording status unknown**; it does not claim the recording stopped.

Enable recording controls to get **Record take** and **Finish recording**
beside the script, in the control window and on the phone remote:

- **Record take** checks OBS first. If OBS is stopped, it asks it to record,
  waits for confirmation and then starts Sightline's usual countdown,
  slate and prompting. If OBS is already recording, it uses that recording.
  An OBS recording paused externally must be resumed in OBS first.
- **Finish recording** stops prompting and asks OBS to finish its recording.
  If confirmation fails, inspect OBS before assuming recording has stopped.
- **Play, Pause, Again and On air** keep their existing behaviour. They
  do not start, pause or stop OBS. You can pause or repeat sections while
  OBS makes one continuous recording.

With voice commands listening, say **"Prompter, record take"** or
**"Prompter, finish recording"**, using your selected wake word. In a
stopped prompter, use the Always listening option if you want to start
hands-free. These commands require OBS integration and recording controls.
They do not enable the integration themselves.

The local API accepts `obs-record` and `obs-finish` as command actions,
subject to the same saved permissions. Request acceptance means the action
was dispatched, not that OBS has confirmed it: inspect `status.obs`.
The existing Stream Deck plugin can gain matching actions later; this
branch does not change that separate plugin's buttons or profiles.

## Chapters, file links and editing

Enable **Send section starts and named markers as OBS chapters** if wanted.
It also needs recording controls, a version of OBS exposing chapter
requests, and a compatible output format such as Hybrid MP4. Unsupported
chapters do not prevent prompting or recording; Sightline's own markers
are still saved. Chapter support is checked by capability, not assumed
from the OBS version number alone.

The take log and edit pack's `take-log.json` gain an optional `obs` array
of observations. It includes a recording identifier, observed state and
duration, and the output path when OBS supplies it, normally on stop.
The actual OBS video is not copied or moved into the edit pack.

These observations are control-message timing, not frame-accurate sync.
Keep the slate or scratch-audio synchronisation when accuracy matters.
Save or export the active script's edit pack after recording has finished
to include its confirmed file reference. Earlier exports are not rewritten.
After a connection break, or when a script was closed before recording
finished, a file reference may be unknown; do not guess the association.

## If the connection fails

Check OBS is open, its WebSocket server and authentication are enabled,
and the address, port and password match. Sightline retries an enabled
connection. It never automatically stops OBS, changes its scenes, starts
a livestream or changes recording settings.

Before release, the branch needs a real OBS recording test in addition
to the simulated-server tests. An OBS dock, scene changes and dedicated
Stream Deck actions are follow-up work, not controls promised by this build.

See [OBS's connection guide](https://obsproject.com/kb/remote-control-guide)
and [recording chapter support](https://obsproject.com/kb/hybrid-mp4).
