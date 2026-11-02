# Preview 06 verification and handover

2 November 2026. One portable build was generated after the
[conversation-queue review](design/PREVIEW-06-QUEUE-REVIEW.md).
Packaged source `50e2a08`; code `c0b1b9a`; documentation revision 7.
The JL review snapshot is `e38e4da`. Published versions remain 1.1.0/0.2.0.

Source and packaged native checks passed: 34 Settings sections and every
button subtab at five window sizes, mode/guide persistence, reference restore
without changing Ideal, theme files, Apply/Cancel, real pointer interaction,
preview Escape/native close and capture-policy requests. The final executable
also passes Windows process-name metadata checks. The full unit suite and
simulated recorder/head-guide regression passed. The Guide/OBS/capture-warning
layout fits without overlap at three prompter sizes.

Offline help checks 598 local links/pictures. Generated HTML/CSV/JSON contain
237 reviewed entries in 18 groups. JL snapshot guards and the complete website
build passed; nothing was deployed. The approved combined reference and actual
native Screens view were compared at 1064×691, retaining the signed-off column
ownership, navigation, search and footer. The queued rename/icons are the
authorized additions. The demonstration appearance can differ from saved user
appearance, which was retained.

The running process was verified at:
`D:/Sightline/Dev/Builds/Previews/settings-layout-preview-06/win-unpacked/Sightline Prompter.exe`.
Settings is open on Screens and mirroring, with the two visible tabs, matching
mirror icons, Prompter layout label and right preview. The existing Preview 05
profile is reused. Its 128 saved settings, nine script slots and stored pairing
credentials were checked unchanged against `app-state-before-preview06.json`.
The active slot remains 4 (internal index 3). No recording was started.

| Artifact | SHA-256 |
| --- | --- |
| Sightline Prompter.exe | `4c3faf059f4dbd580a75dcb69713ecc1ff408395d48fb37ec8995a4abacce77d` |
| resources/app.asar | `aa414b9d9cde5281018f2a0abf0bf3722421042bb40f0f3ba145adc1c66ca74c` |

The launcher, manifest and START-HERE guide are beside `win-unpacked`.
Source test captures are in `D:/Sightline/Dev/Testing/Settings-Redesign/Feedback-Batch`;
packaged captures are in its `Packaged` subfolder. Physical controller/iPhone,
camera output, capture exclusion and audiovisual sync remain real-setup
acceptance checks. No release, tag or Marketplace change was made.
