# Sightline 1.1.0 and Stream Deck 0.2.0 feature freeze

Frozen for final acceptance on 31 October 2026. These version numbers identify
local test packages, not a published release. The latest public app is 1.0.6.
No tag, merge, public upload, Marketplace submission or website deployment is
part of this freeze. The plugin repository stays private. Building a package
does not install it over an existing copy.

**Documentation revision 1:** a separate delivery refresh corrects help/version
labels and reviewed marketing claims, adds the one-pager and audience reference,
and bundles that material offline. See the [audit](marketing/AUDIT-2026-10-31.md).
The original frozen packages are retained; refreshed checksums identify the new
documentation build. Prompting, recording and control behaviour is unchanged.

The app includes the work in the [batch review](RC15-REVIEW.md): recording and
edit-pack improvements, OBS tools, guide fitting, component checks, onboarding,
script/rehearsal reviews, settings/help redesign and shared controls. The final
pad/phone additions bring listening, local session status, guide adjustments,
eye lock and ideal controls to both surfaces. Finish recording has a default
one-second hold; Stream Deck retains its independent per-key preference.

Existing pad selections, script formats and additive edit-pack fields remain
compatible. **Framing & checks** is an opt-in preset, not a replacement layout.
Plugin 0.2.0 preserves older saved action IDs and profiles. New actions require
the app to advertise their capabilities; basic controls still support 1.0.6.

## Final acceptance

Follow the [acceptance walkthrough](guide/14-acceptance-test.md), using the two
bundled acceptance samples. Automated fixtures do not replace these checks:

- Normal microphone speech, wake words, listening off/on and recovery.
- Clean camera and unprocessed microphone outputs, including required 4K/WAV.
- Recorded slate and visible claps, with physical camera/audio sync measured.
- Projector/guide stacking, saved Ideal/Actual positions and guide exclusion
  from the actual captured recording.
- Physical Stream Deck keys, guide dials and OBS Pedal, including short/long
  Finish holds, lost connections and retained profiles.

Windows acceptance is the immediate target. macOS hardware and VoiceOver checks
are deferred because no Mac is available; no physical Mac pass is claimed.
Session checks report known software state, not proof of recorded quality.

## Reproducing the pair

The delivery folder contains the Windows installer, private Stream Deck package,
acceptance scripts, a start guide, a build manifest and SHA-256 checksums.
The manifest records the exact source commits and checks for that pair. Keep
the files together and verify their hashes before installing. Subsequent fixes
must replace the frozen pair with a newly identified build and fresh checksums;
do not silently overwrite an accepted artifact.

Publication remains on hold until Joanne accepts the physical workflow and
authorises the release. Further feature ideas go to the roadmap for a later
version; only acceptance-blocking fixes belong in this frozen batch.
