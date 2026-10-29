# Recorded OBS workflow validation

29 October 2026. Development branch only. Publication remains held for the
remaining human checks.

## Recording route

OBS 33.0.0, a 3840×2160/30 fps camera-source scene, Facecam Pro and RØDE
Wireless GO II. The composed recording receives a separate **Sightline
recorded sync** browser source, above the camera, with audio on track 1 and
speaker monitoring off. The guide and prompter are separate desktop windows.

Prepare updates only Sightline's marked source. Disabled/status-only modes,
remote hosts, streaming and preparation during recording are refused.
Runtime checks reject missing, hidden, cropped, moved, covered or muted
sources. An acknowledgement is not proof of the recorded file's contents.

The source uses a cached local HTML page and a private loopback-only service,
with no OBS credentials in the page. Refreshing it after the service closed
was tested in real OBS: every pixel remained transparent. No error page
appeared. Prepare again after restarting Sightline.

## Independent camera and microphone

Source Record was configured on the camera, following recording start/stop,
with NVENC video and 48 kHz/24-bit PCM from the RØDE. The first experiment
caught a routing mistake: selecting the named microphone while leaving
**Audio track 1** selected still used the mixed track. **Different audio +
RØDE + Audio track None** selects the source audio (`audio_track: 0`). No
OBS microphone filters or microphone gain changes were applied.

In the corrected direct-reference-only experiment, 1 kHz amplitude reached
about 0.495 in the composed mono analysis mix, versus 0.00081 in the clean
mic. Only the composed picture contained white flash frames. Both files had
3840×2160/30 fps video and 48 kHz/24-bit PCM stereo. The clean file has its
own start offset; its clock is not assumed to match the main file.

The local prompter beep can still be heard acoustically by an unprocessed
mic. That differs from routing the digital browser tone into the clean
track. No noise removal was applied.

## Integrated two-module rehearsal

A disposable Sightline profile used real OBS, camera and RØDE input,
steady scrolling, local/recorded slates, scratch audio and a shown guide.
The regular installed app and its settings were not used.

- Module A: first take, markers, a `{stop}`, then a retake and keeper choice.
  OBS continued recording through the prompting stop and retake.
- Module B: changed scripts without stopping OBS, retained guide settings,
  recorded another take and marker, then used Finish recording.
- Both logs referenced one recording identifier and confirmed main filename.
  Module A had two takes; module B had one.
- Each pack retained its own exact script snapshot, guide metadata,
  recorded references and independent 16 kHz/16-bit/mono scratch WAV.
- Module changes now flush the old take, scratch WAV and pending slate
  acknowledgement before loading the new log. The rehearsal exposed and
  verified this fix; an isolated application regression covers handover.
- The scene contained camera, microphone and recorded-sync source. No screen
  capture included the guide. Recorded camera footage was checked separately.
  Other Display Capture setups and operating systems remain unchecked.

Both composed and clean-camera PCM streams were extracted to standalone
WAVs. Sample hashes matched the original streams exactly.

A stricter replay caught a stop-event/poll race that could assign the final
take end a new recording identity. Status replies sent before a newer event
are now ignored; starting/stopping stay transitional until confirmed. Finish
closes the take before Stop reaches OBS. A final real rehearsal required all
take starts and ends to retain one recording identifier, verified the source
bytes and required actual prompting time in each take; it passed.

## Measured digital timings

The final rehearsal contained three flash/tone references. Flash windows
were measured from 30 fps frames; tone detection used 10 ms windows, so
onsets and durations are approximate.

| Reference | Flash start | White duration | Tone start |
| --- | --- | --- | --- |
| Module A, take 1 | 0.467 s | 0.100 s | 0.510 s |
| Module A, take 2 | 6.533 s | 0.167 s | 6.620 s |
| Module B, take 1 | 12.933 s | 0.200 s | 13.050 s |

White flashes ended within 0.5 seconds; detected tones exceeded 100 ms.
The generated tone remains 1 kHz/250 ms, with a nominal 150 ms flash and
1.1 second card. The existing local slate contract was not changed.

The browser tone followed its flash by about 43–117 ms in this run. Recent
OBS estimates were around 0.40–0.43 seconds behind encoded flash positions.
Neither is a universal correction. Match the actual reference to log-clock
`t`, check later references for drift, and use that file's measured mapping.
Neither browser acknowledgement nor an OBS poll is an exact frame time.

## Still required before publication

Normal human speech/wake commands, a visible physical clap with the camera
and microphone in recording positions, and the physical Stream Deck keys.
The digital source does not establish camera lip sync. Real multi-display
projector stacking and other capture methods need their own checks.

No recordings, microphone audio, credentials or personal paths are committed.
Validation files and reports remain in the chosen production folder.
