// node scripts/version.test.mjs
import assert from "node:assert/strict";
import { isNewer } from "../src/utils/version.js";

assert.equal( isNewer( "1.0.3", "1.0.2" ), true );
assert.equal( isNewer( "v1.0.10", "1.0.9" ), true );
assert.equal( isNewer( "1.1.0", "1.0.99" ), true );
assert.equal( isNewer( "1.0.2", "1.0.2" ), false );
assert.equal( isNewer( "1.0.1", "1.0.2" ), false );
assert.equal( isNewer( "2.0.0-beta", "1.9.9" ), true );
assert.equal( isNewer( "", "1.0.2" ), false );
assert.equal( isNewer( "1.1.0", "1.1.0-rc.1" ), true );
assert.equal( isNewer( "1.1.0-rc.1", "1.1.0" ), false );
assert.equal( isNewer( "1.1.0-rc.10", "1.1.0-rc.2" ), true );
assert.equal( isNewer( "v1.1.0-rc.1+build.2", "1.0.7-rc.14" ), true );
assert.equal( isNewer( "1.1.0-rc.1", "1.1.0-rc.1" ), false );
assert.equal( isNewer( "1.1.0-rc.1", "1.1.0-rc" ), true );
assert.equal( isNewer( "1.0.6", "1.1.0-rc.1" ), false );
assert.equal( isNewer( "unknown", "1.1.0-rc.1" ), false );
console.log( "version tests pass" );
