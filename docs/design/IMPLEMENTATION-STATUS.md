# Approved Settings and Tools implementation

**UAT Preview 08, 2 November:** implements the approved pre-record composition
with real local detection, manual fallback, audio measurement/advisory override,
actual WebM test playback and fixed reference save/restore. Uses the bundled,
pinned Apache-2.0 model/runtime. Joanne's existing headshot supplies only the
synthetic camera fixture; no live camera or microphone was used by automation.
Heading/action spacing is expanded at ordinary sizes and constrained at the
smallest supported frame. Preview 07 fixes remain included.

**Numeric patch, 2 November:** source `83ef675`, code reference `9d05dbb`.
Whole/five-point controls, two-decimal fine readouts and retained stored precision
pass pure and native checks, including the packaged executable. The approved
layout is unchanged. The patch reuses the Preview 05 profile; a state backup is
retained. The full unit/recording fixture and 587 offline help links pass. The
matrix/JL draft now cover 235 entries and documentation revision 5.

**Preview 05 handed over, 2 November:** package source `4d7f879`, code reference
`d55c205`, approved interactive reference `d1302a1`. The packaged native suite
passes, including explicit layout checks. Matched app screenshots are recorded.
The app is open at 1064 × 691 with the dedicated right preview visible and the
unchanged promo loaded in slot 4. Wireless GO II RX passed a temporary device
check; the local speech model is installed; Stream Deck 0.2.0 is compatible;
OBS is connected with recording permission and confirmed stopped. No recording
was started. The build manifest and START-HERE are in
`D:\Sightline\Dev\Builds\Previews\settings-layout-preview-05`.

The recording integrations were recovered from the earlier working preview,
with current reading/head-guide preferences retained. OBS's older stored
password was refreshed through OS-protected storage using its local config.
Physical output and sync remain for the user's actual recording test.

**Preview 05 correction:** Joanne authorised implementation of the exact signed-off
demo on 2 November. The expanding left list, central form, persistent right
preview, header search, fixed footer and compact behaviour are restored. See
[matched screenshots and independent layout checks](LAYOUT-ACCEPTANCE.md).
Functional unit/native and recording fixtures pass. Preview 05 packaging and
the final handover are being completed; the earlier Preview 04 review below
is retained as the reason for this correction.

**Layout review, 2 November:** Preview 04's composition is not signed off.
It substituted a category grid and inline sample for the approved expanding
left navigation and dedicated right preview. App changes are paused while
Joanne reviews the [layout comparison](LAYOUT-PARITY-REVIEW.md). The original
interactive demo is the specification; software test passes below do not
establish visual fidelity. Earlier completion notes describe functional work.

Joanne signed off the updated interactive demo on 1 November 2026 and
authorised implementation. This file tracks the combined implementation;
it is not a release announcement. Preview 04 is now packaged and validated.

- [x] Signed-off design and conditional interface/help rules recorded.
- [x] Permanent Settings ownership; remove control borrowing and automatic pages.
- [x] Shared complete text formatting and preview; editable backing colour.
- [x] Named native reading themes with safe save/import/export and migration.
- [x] Consistent Settings preview, Apply, Save and close, Cancel and close guard.
- [x] Fixed named navigation, compact selectors, search and preparation route.
- [x] Separate controller homes; optional-interface enable/configuration rules.
- [x] Runtime input/service gates, dependency/readiness messages and matching help.
- [x] Matching Tools groups, live controls, placement and visible pointer.
- [x] Combined native app checks including Tools first, reopen and resize.
- [x] Build an isolated Preview 04 with manifest and acceptance instructions.
- [x] Update guide/help/screenshots/roadmap/changelog and generated feature grid.
- [x] Sync the reviewed grid and relevant copy to the draft JL website branch.

No new version tag, public release or live website deployment is authorised
by the design sign-off. Stream Deck source remains private. The disabled
OpenAI credential is not needed for this implementation or its tests.

## Validation so far

The existing unit suite passed. The new reading-appearance suite covers theme
round-trips, credential exclusion, bounded files, migration, interface gates
and draft rebasing. The native Settings suite checks all 34 sections at desktop,
1024 × 600, 680 × 600, 576 × 539 and 560 × 500; all four typography targets;
real file dialogs; Apply/Cancel; core Space with custom mappings off; temporary
microphone cleanup using synthetic input; and the separate short-window Tools.
Native gallery captures are in the development testing tree.

The production integration fixture now uses the new Settings contract. It passed
with no renderer exceptions, including head fitting/eye lock, saved placements,
fullscreen adjustments, Stream Deck button-token commands, exact script/section
metadata and mocked OBS start/pause/resume/stop/continuous recording. It found
and prompted a fix for a real race: closing/reopening Settings while microphone
enumeration was pending must not access the discarded draft.

The old paged utility harness now delegates to the permanent-section checks.
Final source lint, the full unit suite, native Settings/Tools checks, production
integration fixture and feature-grid guards passed on 2 November 2026. The
refreshed gallery contains 38 real app captures. Guides, help, samples, roadmap,
changelog and staged marketing copy describe the implemented preview.

Preview folder:
`D:\Sightline\Dev\Builds\Previews\settings-redesign-preview-04`.
The package manifest pins source `3598b6d`, capability reference `59358aa` and
the package hashes. Its own profile starts optional inputs/integrations off,
retains allowlisted appearance/head-guide settings and loads the review script
in slot 1 and the promo copy in slot 4. The native suite passed against the
packaged executable as well as the development source. Windows metadata and
577 offline help links/pictures passed; the searchable reference and identical
comparison data are bundled. A final quote-style correction to the help builder
does not change its generated output or app capabilities.

The draft JL branch contains the same 233-entry grid and six refreshed preview
images. Its full 518-page build passed; desktop/phone checks confirmed search,
reset and layout. Its public download remains 1.1.0/0.2.0. Nothing was deployed.

Physical camera/microphone/recording-route acceptance and macOS hardware/manual
accessibility checks remain separate from these software tests. The next action
is review of the actual preview, followed by the live production acceptance.
