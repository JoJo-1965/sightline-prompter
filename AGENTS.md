# Documentation maintenance

## Signed-off interface designs

- A signed-off interactive preview is a layout and interaction contract, not
  merely a feature inventory. Reusing old controls must preserve that composition.
- For Settings, the reference is `docs/design/settings-and-tools-prototype.html`
  at `d1302a1`: expanding left navigation, central controls, persistent right
  sample, header search, fixed footer and its compact preview behaviour.
- Before handover, render the actual app and the approved reference in matching
  states and window sizes. Check layout fidelity separately from functional
  tests. A passing overflow/control test does not establish design acceptance.
- Show and obtain approval for any proposed departure before implementing it.
  Preserve working behaviour and user settings while correcting presentation.

Follow [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) for every
app, companion, RC/preview or website deployment, alongside the user's project
and code-style instructions.

- Review the feature matrix with help, guides, screenshots, changelog, roadmap
  and website/marketing copy; it is not optional follow-up work.
- `docs/FEATURE-GRID.md` owns rows and review/version metadata. Update affected
  options, controls, requirements and limits. Record no-feature-impact decisions
  in `docs/FEATURE-GRID-REVIEWS.md` instead of inventing a feature change.
- Generate and commit HTML/CSV/JSON together; run `node scripts/build-feature-grid.mjs --check`.
- Before tagging, also run `--check --release`; a stable release cannot use a
  Preview reference or mismatched version/source labels.
- Sync the reviewed snapshot into the JL repo and check its generated downloads.
  Proposals, known defects and unvalidated controls are not supported features.
- Preserve Joanne's per-publication approval requirement. No tag, release,
  Marketplace submission or live website deployment is implied by editing docs.
