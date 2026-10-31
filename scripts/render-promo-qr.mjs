// Keep the functional QR independent of generated illustration pixels.
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const require = createRequire( import.meta.url );
// The renderer path can be supplied for another checkout without personal paths.
const renderer = process.env.SIGHTLINE_RESVG_MODULE ?? "@resvg/resvg-js";
const { Resvg } = require( renderer );
const folder = path.join( root, "docs/marketing" );
const target = "https://joannelockwood.co.uk/sightline";
const source = await fs.readFile( path.join( folder, "infographic-artwork.png" ) );
const qr = await QRCode.toBuffer( target, { width: 600, margin: 4, errorCorrectionLevel: "H", color: { dark: "#071323", light: "#ffffff" } } );
await fs.writeFile( path.join( folder, "sightline-qr.png" ), qr );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1122" height="1402" viewBox="0 0 1122 1402">
<image width="1122" height="1402" xlink:href="data:image/png;base64,${ source.toString( "base64" ) }"/>
<rect x="680" y="1065" width="372" height="246" rx="20" fill="#ffffff"/>
<text x="866" y="1095" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#071323">Explore Sightline</text>
<image x="784" y="1100" width="164" height="164" xlink:href="data:image/png;base64,${ qr.toString( "base64" ) }"/>
<text x="866" y="1289" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#071323">joannelockwood.co.uk/sightline</text>
</svg>`;
const png = new Resvg( svg, { fitTo: { mode: "width", value: 2244 }, font: { loadSystemFonts: true } } ).render().asPng();
await fs.writeFile( path.join( folder, "sightline-promo-infographic-v2.png" ), png );
console.log( "Rendered infographic with an independent functional QR layer" );
