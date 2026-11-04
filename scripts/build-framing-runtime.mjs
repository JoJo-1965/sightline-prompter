import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { build } from "esbuild"; // eslint-disable-line n/no-unpublished-import

const root = path.resolve( import.meta.dirname, ".." ), require = createRequire( import.meta.url ); // eslint-disable-line n/no-unsupported-features/node-builtins
let sdk;
try {
	sdk = path.dirname( require.resolve( "@mediapipe/tasks-vision" ) );
} catch {
	sdk = process.env.SIGHTLINE_VISION_PACKAGE;
}
if ( !sdk ) throw new Error( "Install @mediapipe/tasks-vision before building local framing" );
const manifest = JSON.parse( await fs.readFile( path.join( sdk, "package.json" ), "utf8" ) );
if ( manifest.version !== "1.2.0" ) throw new Error( "Framing runtime must use the pinned version" );
const model = path.join( root, "src/client/vision-model/blaze-face-short-range-v1.tflite" );
if ( createHash( "sha256" ).update( await fs.readFile( model ) ).digest( "hex" ) !== "b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f" ) throw new Error( "Framing model checksum mismatch" );
const destination = path.join( root, "src/client/vision-runtime" );
await fs.mkdir( destination, { recursive: true } );
for ( const name of await fs.readdir( path.join( sdk, "wasm" ) ) ) await fs.copyFile( path.join( sdk, "wasm", name ), path.join( destination, name ) );
await build( { entryPoints: [ path.join( root, "src/client/framing-worker.js" ) ], bundle: true, format: "iife", platform: "browser", outfile: path.join( root, "src/client/framing-worker-bundle.js" ), alias: { "@mediapipe/tasks-vision": path.join( sdk, "vision_bundle.mjs" ) } } );
await fs.copyFile( path.join( root, "build/third-party/mediapipe-LICENSE.txt" ), path.join( destination, "LICENSE.txt" ) );
console.log( "Built local framing runtime 1.2.0 and checked the pinned model." );
