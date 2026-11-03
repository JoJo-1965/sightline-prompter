# UAT Preview 09 verification

3 November 2026. Unpublished Windows x64 UAT, app 1.1.0, documentation
revision 10; Stream Deck companion remains 0.2.0.

## Combined source checks

- All existing unit suites pass, plus annotation-mask geometry tests.
- Native Settings passes all 34 sections, subtabs and five window sizes.
  The approved three-column composition is preserved, with Getting started
  promoted to the first group. Its guidance alone scrolls in the centre pane.
- Getting started resolves component checks and reflects actual setup.
  Status and recovery displays the existing listener health and restart action.
- Slate radio inputs remain 17 pixels with complete unbroken labels.
  Floating guide and recording controls fit three main-window sizes; Guide off
  hides the guide without replacing its saved position.
- Rendered pixel checks leave inline and production comments at full brightness
  while spoken probes dim to 40%. Margin fades still apply. The same regression
  assertion fails against the unchanged UAT 08 package.
- Simulated native cross-display drags leave maximised/full-screen modes and
  apply centred 75% geometry. Same-display moves retain size; programmatic
  placement does not trigger the manual-drag default. Negative display origins
  and small work areas are covered by the geometry tests.
- Production integration passes against its isolated recorder protocol fixture,
  including linked record/pause/resume/finish, guide controls and comments.
- Help, feature-grid exports and affected Settings captures are updated together.

## Package and acceptance

The package manifest records exact executable/archive hashes and source commits.
The retained-profile launcher uses the existing preview profile and promo slot 4;
the portable launcher uses a separate profile. Packaging does not overwrite UAT 08.

Physical cross-display dragging, camera/microphone quality, real OBS capture and
physical Stream Deck remain Joanne's UAT. No release, tag, live website deployment
or Marketplace submission is part of this preview handover.
