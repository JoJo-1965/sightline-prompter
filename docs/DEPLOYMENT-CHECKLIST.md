# Documentation and feature-reference deployment checklist

Required for app/companion releases, RCs, installer handovers and JL deployments.
Complete for the combined batch before tagging, publishing or deploying.

## Review together

- [ ] Help, tooltips, commands and Settings paths match the built app.
- [ ] User guide/canonical wiki and getting-started instructions agree.
- [ ] Affected screenshots/examples and their JL copies show the correct build.
- [ ] README, changelog/release notes, roadmap and known limits are current.
- [ ] Script brief/spec/checker and samples agree when directives change.
- [ ] `docs/FEATURES.md` and **`docs/FEATURE-GRID.md`** describe the exact
  options, controls, dependencies and limits; review OBS and Stream Deck separately.
- [ ] Build/companion/published versions, review basis/date, source build and
  maintained source URL are correct. Proposals are not supported features.
- [ ] Record no feature impact in `docs/FEATURE-GRID-REVIEWS.md` where appropriate.

## Generate and check the app references

Markdown owns the rows and metadata. Do not hand-edit generated HTML/CSV/JSON.

```
node scripts/build-feature-grid.mjs
node scripts/build-feature-grid.mjs --check
node scripts/check-docs-sync.mjs
```

Commit `FEATURE-GRID.md`, `.html`, `.csv` and `.json` together. The commit check
uses staged files with `--staged`. Normal packaging checks exports too. Before
a version tag, also run:

```
node scripts/build-feature-grid.mjs --check --release
```

A stable release requires a Released reference, the package's published
version and a maintained source link to its version tag. A Preview reference
deliberately fails this guard. The installer workflow checks tags before
creating a draft release.

## Synchronise and check the JL website

In the JL repository, using the reviewed app checkout:

```
node scripts/sync-sightline-features.mjs <path-to-app-repository>
node scripts/check-sightline-features.mjs
npm run build
```

Commit the website snapshot and stable Markdown/JSON/CSV/offline-HTML downloads
together. Prebuild and CI reject mismatched source hashes, rows, version data
or download hashes. Explicitly versioned archives can remain; current links
use stable download paths.

- [ ] Review the landing summary, full searchable grid, FAQ/schema, LLM files,
  sitemap, marketing materials and source links with the rest of the docs.
- [ ] When affected, check search, filters/reset/empty results, downloads and
  phone layout. Settings search finds controls; the full grid compares capabilities.
- [ ] Attach checks and the review outcome to the release/deployment.
- [ ] Keep published, preview, limited and untested claims distinct.
- [ ] Obtain Joanne's go for each app/plugin publication or JL deployment.
- [ ] After publication, verify live links, downloads and version labels.

These checks enforce consistency; the feature review remains part of the same
sign-off as the other documentation.
