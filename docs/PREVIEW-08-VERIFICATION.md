# UAT Preview 08 verification

2 November 2026. Unpublished Windows x64 UAT before RC. App 1.1.0,
documentation revision 9; existing Stream Deck companion 0.2.0.

## Build and handover

- Implementation: `228b4f8`; packaging source: `67c9060`.
- Executable SHA-256:
  `3bc8ed934e52eeb5a6424bcb59386976da2d930208dc7e6026d22c0e55068497`.
- app.asar SHA-256:
  `daec84259b1e8685e6c8967e5a6ae3be25a52b278122a626cac5a42f3dab94ab`.
- The full package is in `D:/Sightline/Dev/Builds/Previews/sightline-uat-08`.
  Its launcher retains the existing preview profile. The portable ZIP uses a
  separate profile and excludes personal scripts, app state and pairing data.
- Previous preview closed normally before the validated state backup. Native
  handover checks confirm unchanged saved preferences, all nine slots and
  pairings, active promo slot 4, and stopped prompting. No production recording
  was started. The installed release has a separate profile.

## Completed checks

- All 26 existing test suites and the new framing-position tests pass.
- Source and packaged Settings checks pass for 34 sections, every subtab and
  five sizes from 1064 × 691 to 560 × 500. The approved left navigation,
  central controls, right example and compact non-modal preview are retained.
- Packaged preparation checks run real local detection on Joanne's headshot
  and a clean recorded camera frame. Audio measurement, actual WebM recording,
  playback confirmation, explicit reference save, fixed restoration and
  manual fallback pass. These are controlled media fixtures, not live camera
  or microphone acceptance.
- The source production integration suite passes, including its OBS protocol
  fixture, slate, guide, pause/finish and comment behaviour.
- Windows metadata, 629 offline help links/pictures and documentation guards
  pass. The 241-row feature grid across 18 groups and its generated exports
  agree; the JL snapshot check and complete website build pass.
- The installed Stream Deck inspector reports app 1.1.0 / plugin 0.2.0
  compatible with promo slot 4. Test connection, compatibility information
  and all three ready-made profile buttons are present. Inspection changed
  no key assignments or plugin binary.
- Phone review at 390 pixels has no horizontal overflow. Image loading,
  video playback and ranged Windows ZIP downloads pass. The read-only server
  exposes an explicit file whitelist and rejects app-state requests and POST.

## Acceptance still required

Joanne's UAT checks physical camera and microphone quality/permissions,
movement and realignment after a break, real OBS recording format and sync,
capture exclusion, and physical Stream Deck/controller interaction. macOS
and Linux hardware have not been validated for this preview.

The bundled detector runs locally with no OpenAI API key or cloud processing.
Preparation starts camera/microphone only through explicit controls and
releases them when closed. It does not start production capture.

The Elgato media revision is separate: it demonstrates released app 1.1.0 and
released plugin 0.2.0 with labelled scripted SDK inputs. It does not advertise
unreleased automatic framing as part of the submitted plugin. No Marketplace
submission, email, public release or live JL deployment is included.
