import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire( import.meta.url );
const pkg = JSON.parse( await fs.readFile( new URL( "../package.json", import.meta.url ), "utf8" ) );
await build( { entryPoints: [ "src/mcp-server.mjs" ], outfile: "scripts/sightline-mcp.mjs", platform: "node", target: "node22", format: "esm", bundle: true, define: { __SIGHTLINE_VERSION__: JSON.stringify( pkg.version ) }, banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' } } );
const licenses = [];
const sdkRequire = createRequire( require.resolve( "@modelcontextprotocol/server" ) );
for ( const [ name, resolver ] of [ [ "@modelcontextprotocol/server", require ], [ "@modelcontextprotocol/core", sdkRequire ], [ "zod", require ] ] ) {
	let dir = path.dirname( resolver.resolve( name ) );
	while ( !await fs.stat( path.join( dir, "package.json" ) ).catch( () => null ) ) dir = path.dirname( dir );
	const license = await fs.readFile( path.join( dir, "LICENSE" ), "utf8" );
	licenses.push( `${ name }\n${ license }` );
}
await fs.writeFile( "scripts/sightline-mcp-LICENSE.txt", licenses.join( "\n\n" ) );
console.log( "Built standalone Sightline MCP adapter and bundled licences" );
