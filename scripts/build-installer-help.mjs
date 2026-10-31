// Standalone copies of the bundled guide: no running app, web server or network.
import fs from "node:fs/promises";
import path from "node:path";
import showdown from "showdown";

const escapeHtml = value => String( value ).replace( /[&<>"']/g, c => ( { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" } )[c] );

export async function buildInstallerHelp( root, out, version ) {
	const converter = new showdown.Converter( { tables: true, strikethrough: true, ghCompatibleHeaderId: true } );
	const css = await fs.readFile( path.join( root, "src/client/guide.css" ), "utf8" );
	const readme = await fs.readFile( path.join( root, "readme.md" ), "utf8" );
	const pages = new Map( [ [ "readme.md", readme ], [ "ROADMAP.md", await fs.readFile( path.join( root, "ROADMAP.md" ), "utf8" ) ] ] );
	for ( const folder of [ "docs", "docs/guide", "docs/marketing" ] ) {
		for ( const name of await fs.readdir( path.join( root, folder ) ) ) {
			if ( name.endsWith( ".md" ) ) pages.set( `${ folder }/${ name }`, await fs.readFile( path.join( root, folder, name ), "utf8" ) );
		}
	}
	const marker = "## Change log";
	const offset = readme.indexOf( marker );
	if ( offset < 0 ) throw new Error( "Cannot build installer release notes: change log is missing" );
	const render = async ( relative, markdown ) => {
		const target = path.join( out, relative );
		const href = file => path.relative( path.dirname( target ), path.join( out, file ) ).split( path.sep ).join( "/" );
		const html = converter.makeHtml( markdown ).replace( /href="([^"?#]+\.md)([#?][^"]*)?"/g, ( match, file, suffix = "" ) => {
			if ( /^[a-z]+:/i.test( file ) ) return match;
			const source = path.posix.normalize( path.posix.join( path.posix.dirname( relative ), file ) );
			return pages.has( source ) ? `href="${ file.replace( /\.md$/, ".html" ) }${ suffix }"` : `href="https://github.com/JoJo-1965/sightline-prompter/blob/main/${ source }${ suffix }"`;
		} );
		const title = escapeHtml( markdown.match( /^# (.+)/m )?.[1] ?? "Sightline Prompter" );
		await fs.mkdir( path.dirname( target ), { recursive: true } );
		await fs.writeFile( target, `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:">
<title>${ title } · Sightline Prompter ${ escapeHtml( version ) }</title>
<style>${ css }
body{display:block;height:auto}nav{padding:16px 24px;background:var(--panel);display:flex;flex-wrap:wrap;gap:10px 24px}
#page{max-width:1000px;margin:auto;overflow:visible}table{display:block;overflow-x:auto}pre{overflow-x:auto}
@media(max-width:600px){#page{padding:20px}h1{font-size:24px}}
</style></head><body><nav aria-label="Installation help"><a href="${ href( "release-notes.html" ) }">Release notes</a><a href="${ href( "docs/guide/01-getting-started.html" ) }">Getting Started</a><a href="${ href( "docs/guide/README.html" ) }">Full user guide</a><span>Installed version ${ escapeHtml( version ) }</span></nav><main id="page">${ html }</main></body></html>` );
	};
	await render( "release-notes.html", `# Release notes\n\nThis copy is bundled with **Sightline Prompter ${ version }**.\n\n${ readme.slice( offset + marker.length ).trim() }` );
	for ( const [ file, markdown ] of pages ) await render( file.replace( /\.md$/, ".html" ), markdown );
	await fs.copyFile( path.join( root, "LICENSE" ), path.join( out, "LICENSE" ) );
	await fs.copyFile( path.join( root, "docs/script-directives.json" ), path.join( out, "docs/script-directives.json" ) );
	for ( const folder of [ "docs/images", "docs/guide/images", "docs/design/images" ] ) {
		await fs.cp( path.join( root, folder ), path.join( out, folder ), { recursive: true } );
	}
	for ( const name of [ "sightline-one-pager.pdf", "one-pager-preview.png", "sightline-promo-infographic-v2.png", "sightline-qr.png" ] ) await fs.copyFile( path.join( root, "docs/marketing", name ), path.join( out, "docs/marketing", name ) );
}

export default async function beforePack( context ) {
	const root = context.packager.projectDir;
	await buildInstallerHelp( root, path.join( root, "build/installer-help" ), context.packager.appInfo.version );
}
