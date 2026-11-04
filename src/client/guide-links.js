// Canonical guide, docs and the two public root references; no arbitrary files.
const BASE = "https://sightline.invalid/docs/guide/";
export function guideTarget( current, href ) {
	try {
		const url = new URL( href, new URL( current ?? "README.md", BASE ) );
		if ( url.origin !== "https://sightline.invalid" || url.search ) return null;
		let name;
		if ( /^\/docs\/guide\/[\w-][\w.-]*\.md$/.test( url.pathname ) ) name = url.pathname.slice( "/docs/guide/".length );
		else if ( /^\/docs\/[\w-][\w.-]*\.md$/.test( url.pathname ) ) name = "../" + url.pathname.slice( "/docs/".length );
		else if ( /^\/(?:ROADMAP|readme)\.md$/.test( url.pathname ) ) name = "../../" + url.pathname.slice( 1 );
		else return null;
		return name + url.hash;
	} catch { return null; }
}
