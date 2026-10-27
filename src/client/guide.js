// The user guide window: a contents list on the left (from the guide's own
// README) and the page on the right. Links between pages stay in this
// window; web links open in the browser.

const contents = document.getElementById( "contents" );
const pageEl = document.getElementById( "page" );
let current = null;

async function show( name ) {
	const result = await window.guide.page( name );
	if ( !result ) return;
	current = result.name;
	pageEl.innerHTML = result.html;
	pageEl.scrollTo( 0, 0 );
	document.title = `${ pageEl.querySelector( "h1" )?.textContent ?? "Guide" } · Sightline Prompter`;
	for ( const a of contents.querySelectorAll( "a" ) )
		a.classList.toggle( "current", a.dataset.page === current );
}

async function buildContents() {
	const home = await window.guide.page( "README.md" );
	const holder = document.createElement( "div" );
	holder.innerHTML = home.html;
	const title = document.createElement( "a" );
	title.className = "home";
	title.textContent = "User guide";
	title.href = "#";
	title.dataset.page = "README.md";
	contents.append( title );
	for ( const link of holder.querySelectorAll( "ol a" ) ) {
		const a = document.createElement( "a" );
		a.href = "#";
		a.textContent = link.textContent;
		a.dataset.page = link.getAttribute( "href" );
		contents.append( a );
	}
}

document.addEventListener( "click", ( event ) => {
	const a = event.target.closest( "a" );
	if ( !a ) return;
	event.preventDefault();
	const href = a.dataset.page ?? a.getAttribute( "href" ) ?? "";
	if ( /^https:\/\//.test( href ) ) window.guide.openExternal( href );
	else if ( /\.md$/.test( href ) ) show( href );
} );

window.guide.onShow( name => show( name ) );
await buildContents();
await show();
