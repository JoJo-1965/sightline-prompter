# Sightline 1.3.0 RC7 preview

11 November 2026 · documentation revision 23. Includes RC6 and earlier
candidate features. Public stable app and Marketplace versions are unchanged.

## OBS setup

Guided setup previously stopped with `OBS rejected GetReplayBufferStatus`
when OBS's optional replay buffer was disabled or unavailable. That prevented
the camera, microphone and presentation lists from loading despite a working
OBS connection. RC7 accepts that specific unavailable-output response and
continues to inspect configured sources.

Recording, streaming and an active replay buffer still block setup changes.
Unexpected request errors and lost connections remain blocking. Setup does
not enable the replay buffer, start recording or alter an existing profile
while inspecting sources. Creation still requires reviewing the plan.

## Validation and retained setup

Regression tests cover disabled replay buffers, active outputs, unexpected
errors, reviewed creation and restoration. A read-only check uses the local
OBS connection; creating a real profile remains an explicit user action.

The local preview retains a backed-up copy of Joanne's current RC6 settings,
slots, saved OBS password and supporting files. No controller mapping, script
directive or approved interface layout changes. Test the source lists in
Connections > OBS integration > Profile and scenes > Set up OBS.
