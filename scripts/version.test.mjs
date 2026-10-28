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
console.log( "version tests pass" );
