# Approved Settings and Tools implementation

Joanne signed off the updated interactive demo on 1 November 2026 and
authorised implementation. This file tracks the combined implementation;
it is not a release announcement or a claim that the app build is finished.

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
- [ ] Build an isolated Preview 04 with manifest and acceptance instructions.
- [x] Update guide/help/screenshots/roadmap/changelog and generated feature grid.
- [ ] Sync the reviewed grid and relevant copy to the draft JL website branch.

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

Pending before handover: pin the matrix to this implementation, sync the draft
JL snapshot and finish the isolated Preview 04 package and manifest. Physical
camera/microphone/recording-route acceptance and macOS hardware/accessibility
checks remain separate from these software tests.
