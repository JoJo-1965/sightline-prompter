import path from "node:path";
import { execFileSync } from "node:child_process";
import { signAsync } from "@electron/osx-sign";

// electron-builder 25 does not implement identity: "-". Sign explicitly after
// packing, before DMG creation, with Apple's free local ad-hoc identity.
export default async function signMac( context ) {
	if ( context.electronPlatformName !== "darwin" ) return;
	const app = path.join( context.appOutDir, `${ context.packager.appInfo.productFilename }.app` );
	await signAsync( {
		app, identity: "-", identityValidation: false,
		preAutoEntitlements: false, preEmbedProvisioningProfile: false,
		optionsForFile: () => ( { hardenedRuntime: false, timestamp: "none", entitlements: path.join( context.packager.projectDir, "build/entitlements.mac.plist" ) } )
	} );
	execFileSync( "/usr/bin/codesign", [ "--verify", "--deep", "--strict", "--verbose=2", app ], { stdio: "inherit" } );
}
