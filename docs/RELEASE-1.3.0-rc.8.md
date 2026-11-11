# Sightline 1.3.0 RC8 preview

11 November 2026 · documentation revision 24. Includes RC7 and all earlier
candidate features. Public stable app and Marketplace versions are unchanged.

## Recording and practice

- Say **Prompter, record**, **start recording**, **begin** or **record take**
  to confirm OBS is recording, then enter prompter delivery. Recording-control
  permission is required; a failed confirmation leaves prompting stopped.
- Say **Prompter, practice**, **start practice** or **go** to run the prompter
  while leaving OBS unchanged. This bypasses saved linked-recording behaviour,
  recorder directives, recorded slates and chapters for practice. It never
  stops a recorder that was already running. Explicit recording commands and
  Record take return to recording operation.
- An explicit recording command can transition from running practice: hold
  prompting, confirm the recorder, then resume delivery at the current place.

## Voice feedback and recognition

A prominent gold acknowledgement appears in the script and every open local
Settings/utility window. It confirms the wake word, recognised commands and
recording outcomes or explains blocked/failed commands. It does not take focus
or play a sound into a recording.

Observed exact transcripts such as "recalled take" and "cord take" map to
Record take. Recording commands still require the wake word and explicit
permission; no generic fuzzy recorder matching is introduced. A recording
prefix heard within four seconds can finish within six seconds of the wake
word, accommodating delayed final words. Unrelated commands still expire.

## Guided OBS setup

The stage hint names missing camera, microphone and recording-folder choices.
The top Review plan action unlocks when ready and performs the same review as
the footer button. Result unlocks after creating the reviewed setup. Existing
OBS setups can record without using this optional assistant.

## Validation and handover

Native regression uses synthetic audio/speech and a simulated OBS IPC boundary:
foreground acknowledgements, recording permission, practice with linked mode
and recorder directives, practice-to-record transition, failed confirmation
and setup stage progression. Physical recognition remains Joanne's UAT.
The preview retains a backed-up copy of the latest RC7 settings and slots.
