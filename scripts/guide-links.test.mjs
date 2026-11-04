import assert from "node:assert/strict";
import { guideTarget } from "../src/client/guide-links.js";

assert.equal( guideTarget( "README.md", "18-installation.md" ), "18-installation.md" );
assert.equal( guideTarget( "README.md", "../RELEASE-1.2.0.md" ), "../RELEASE-1.2.0.md" );
assert.equal( guideTarget( "../RELEASE-1.2.0.md", "guide/18-installation.md#macos" ), "18-installation.md#macos" );
assert.equal( guideTarget( "../FEATURES.md", "FEATURE-GRID.md" ), "../FEATURE-GRID.md" );
assert.equal( guideTarget( "README.md", "../../ROADMAP.md" ), "../../ROADMAP.md" );
assert.equal( guideTarget( "../../ROADMAP.md", "docs/RELEASE-1.2.0.md" ), "../RELEASE-1.2.0.md" );
assert.equal( guideTarget( "../FEATURES.md", "../readme.md#change-log" ), "../../readme.md#change-log" );
for ( const href of [ "../../../secret.md", "../../.env", "../../src/main.js", "https://example.com/file.md", "file:///private.md", "javascript:alert(1)", "../private/data.md", "18-installation.md?file=private" ] ) assert.equal( guideTarget( "README.md", href ), null );
console.log( "Guide links: canonical cross-folder navigation, anchors and bounded public paths pass" );
