# Documentation maintenance

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
