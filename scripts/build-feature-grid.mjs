// The Markdown grid is the source; HTML and CSV are reviewable exports.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const source = fs.readFileSync( path.join( root, "docs/FEATURE-GRID.md" ), "utf8" );
const availability = [ "Included", "Optional", "Dependent", "Limited", "Not included" ];
const sections = [];
let current = null;
for ( const line of source.split( /\r?\n/ ) ) {
	if ( /^## \d{2} · /.test( line ) ) {
		current = { title: line.slice( 3 ), id: `section-${ sections.length + 1 }`, reference: "", rows: [] };
		sections.push( current );
	} else if ( /^## /.test( line ) ) {
		current = null;
	} else if ( current && line.startsWith( "Reference: " ) ) {
		current.reference = line.slice( 11 );
	} else if ( current && line.startsWith( "| " ) && !/^\| (?:Capability|---)/.test( line ) ) {
		const cells = line.slice( 1, -1 ).split( "|" ).map( value => value.trim() );
		if ( cells.length !== 4 || cells.some( cell => !cell ) || !availability.includes( cells[1] ) ) {
			throw new Error( `Invalid feature row in ${ current.title }: ${ line }` );
		}
		current.rows.push( cells );
	}
}
if ( !sections.length || sections.some( section => !section.reference || !section.rows.length ) ) {
	throw new Error( "Every numbered section needs a reference and at least one feature." );
}
const titles = sections.flatMap( section => section.rows.map( row => row[0] ) );
if ( new Set( titles ).size !== titles.length ) throw new Error( "Feature names must be unique." );
for ( const match of source.matchAll( /\]\(([^)#]+)(?:#[^)]*)?\)/g ) ) {
	if ( /^https?:/.test( match[1] ) || /^FEATURE-GRID\.(?:html|csv)$/.test( match[1] ) ) continue;
	if ( !fs.existsSync( path.resolve( root, "docs", match[1] ) ) ) throw new Error( `Missing reference: ${ match[1] }` );
}
const csvCell = value => `"${ value.replaceAll( "\"", "\"\"" ) }"`;
const csv = [ [ "Review build", "Section", "Capability", "Availability", "Options and behaviour", "Dependencies and limits", "Reference", "Reviewer notes" ],
	...sections.flatMap( section => section.rows.map( row => [ "Preview 02 / 647272d / Stream Deck 0.2.0", section.title, ...row, section.reference, "" ] ) )
].map( row => row.map( csvCell ).join( "," ) ).join( "\r\n" );
fs.writeFileSync( path.join( root, "docs/FEATURE-GRID.csv" ), `\uFEFF${ csv }\r\n` );
const escape = value => value.replaceAll( "&", "&amp;" ).replaceAll( "<", "&lt;" ).replaceAll( ">", "&gt;" ).replaceAll( "\"", "&quot;" ).replaceAll( "'", "&#39;" );
const inline = value => escape( value )
	.replace( /`([^`]+)`/g, "<code>$1</code>" )
	.replace( /\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\">$1</a>" );
const head = [ "Capability", "Availability", "Options and behaviour", "Dependencies and limits" ];
const body = sections.map( section => `<section id="${ section.id }" class="feature-section">
<div class="section-heading"><h2>${ escape( section.title ) }</h2><a href="#top">Back to top ↑</a></div>
<p class="reference">Read more: ${ inline( section.reference ) }</p>
<div class="table-wrap"><table><caption class="sr-only">${ escape( section.title ) }</caption>
<thead><tr>${ head.map( title => `<th scope="col">${ title }</th>` ).join( "" ) }</tr></thead>
<tbody>${ section.rows.map( row => `<tr data-status="${ escape( row[1] ) }">${ row.map( ( cell, index ) => index === 0
	? `<th scope="row">${ inline( cell ) }</th>`
	: `<td data-label="${ head[index] }">${ index === 1 ? `<span class="badge ${ row[1].toLowerCase().replaceAll( " ", "-" ) }">${ cell }</span>` : inline( cell ) }</td>` ).join( "" ) }</tr>` ).join( "\n" ) }</tbody></table></div></section>` ).join( "\n" );
const html = `<!doctype html>
<html lang="en-GB">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sightline Prompter · Preview 02 feature grid</title>
<meta name="description" content="Detailed reviewer feature grid for Sightline Prompter Preview 02, with separate Stream Deck and OBS sections, requirements and limitations.">
<style>
:root{color-scheme:dark;--bg:#0c1420;--panel:#152232;--line:#40536b;--ink:#eef3fa;--muted:#c1cddd;--gold:#f1ce78;--link:#a6d5ff}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:1rem}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}a{color:var(--link);text-underline-offset:.18em}p,td,th,li,label{overflow-wrap:anywhere;text-wrap:pretty}h1,h2,h3{line-height:1.2;text-wrap:balance}button,input,select{font:inherit}button,a,input,select{touch-action:manipulation}button,input,select{min-height:44px;border:1px solid #7e94ae;border-radius:8px;background:#1e3045;color:var(--ink);padding:.55rem .75rem}button{cursor:pointer}button:hover{background:#2a425d}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--gold);outline-offset:4px}main{max-width:1450px;padding:2.5rem 2rem 4rem;margin:auto}.eyebrow{letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-size:.8rem;font-weight:750;margin:0 0 .75rem}h1{font-size:clamp(2rem,4vw,3.5rem);margin:0 0 1rem;max-width:26ch}.intro{max-width:85ch;color:var(--muted)}.build{border-left:4px solid var(--gold);background:var(--panel);padding:1rem 1.2rem;margin:1.4rem 0;max-width:90ch}.build p{margin:.25rem 0}.links{display:flex;flex-wrap:wrap;gap:.4rem 1.5rem;margin:1rem 0 1.5rem}.links a{display:inline-flex;align-items:center;min-height:44px}.controls{padding:1.2rem;border:1px solid var(--line);border-radius:12px;background:var(--panel);display:grid;grid-template-columns:2fr 1.4fr 1fr auto;gap:1rem;align-items:end}.controls label{display:grid;gap:.4rem;font-size:.9rem;font-weight:650}.controls input,.controls select{width:100%;min-width:0}.result{margin:.75rem 0;color:var(--gold);font-weight:650}.legend{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;font-size:.9rem;color:var(--muted)}.legend p{margin:.25rem 0}.badge{display:inline-block;border:1px solid #71869d;border-radius:20px;padding:.15rem .6rem;font-size:.78rem;font-weight:700;white-space:nowrap}.included{background:#173e36;color:#c8f5e4;border-color:#609d86}.optional{background:#213d5b;color:#daecff;border-color:#6d95bc}.dependent{background:#423725;color:#ffdfaa;border-color:#b39767}.limited{background:#443144;color:#f2d9f5;border-color:#b58cba}.not-included{background:#303843;color:#e1e7ef;border-color:#929fae}.feature-section{margin-top:2.7rem;scroll-margin-top:1rem}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}.section-heading h2{margin:0;font-size:1.55rem}.section-heading>a{font-size:.82rem;white-space:nowrap}.reference{color:var(--muted);font-size:.9rem;margin:.75rem 0 1rem}.table-wrap{border:1px solid var(--line);border-radius:10px;overflow:hidden}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.91rem}th,td{vertical-align:top;text-align:left;padding:.9rem 1rem;border-bottom:1px solid var(--line)}thead th{background:#203249;color:var(--gold);font-size:.82rem}thead th:nth-child(1){width:21%}thead th:nth-child(2){width:12%}thead th:nth-child(3){width:34%}thead th:nth-child(4){width:33%}tbody th{font-weight:650;background:#132030}tbody tr:nth-child(even) td{background:#111d2b}tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}td{color:#d9e3ef}code{font: .92em ui-monospace,Consolas,monospace;color:#ffe6ab;overflow-wrap:anywhere}.closing{margin-top:3rem;padding:1.25rem;background:var(--panel);border:1px solid var(--line);border-radius:12px;max-width:90ch}.closing h2{margin-top:0;font-size:1.3rem}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
.intro,.build p,.reference{ text-wrap:balance }
@media(max-width:680px){.section-heading{display:block}.section-heading>a{display:inline-block;margin-top:.5rem}tbody td{ text-wrap:balance }}
@media(max-width:1050px){.controls{grid-template-columns:1fr 1fr}thead th:nth-child(1){width:20%}thead th:nth-child(2){width:16%}thead th:nth-child(3),thead th:nth-child(4){width:32%}}
@media(max-width:680px){main{padding:1.5rem 1rem 3rem}.controls{grid-template-columns:1fr;gap:.85rem}.section-heading{align-items:flex-start}.section-heading h2{font-size:1.35rem}.section-heading>a{font-size:.74rem}.table-wrap{border:0;border-radius:0;overflow:visible}table,tbody,tr,th,td{display:block;width:100%;table-layout:auto}thead{display:none}tbody tr{border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:1rem;background:#111d2b}tbody th{padding:.9rem 1rem;font-size:1rem;border:0}tbody td{border:0;padding:.55rem 1rem .8rem}tbody td::before{content:attr(data-label);display:block;font-size:.73rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:650;margin-bottom:.3rem}tbody td:first-of-type{padding-top:.4rem}tbody tr:nth-child(even) td{background:transparent}.legend{display:block}.legend p{margin:.55rem 0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{:root{color-scheme:light;--ink:#111;--muted:#333;--line:#aaa;--panel:#fff;--link:#111}body{background:white;color:#111;font-size:10pt}main{max-width:none;padding:0}.controls,.links,.legend,.result,.section-heading>a{display:none}.feature-section{margin-top:1.5rem;break-inside:auto}.section-heading,.reference{break-after:avoid}h1{font-size:26pt}h2{font-size:17pt}table{font-size:8pt}thead{display:table-header-group}tr{break-inside:avoid}thead th,tbody th,tbody tr:nth-child(even) td{background:#f1f1f1;color:#111}td{color:#111}th,td{padding:.45rem}.badge{background:white;color:#111;border-color:#777}code{color:#111}.build,.closing{border-color:#777}.closing{break-inside:avoid}a{text-decoration:none}}
</style></head>
<body><main id="top">
<header><p class="eyebrow">Sightline Prompter · Reviewer reference</p><h1>The detailed feature grid</h1>
<p class="intro">A traditional teleprompter with voice control, transparent reading, optional AI assistance and production handover. Browse ${ titles.length } capabilities in ${ sections.length } groups, including dedicated Stream Deck and OBS sections.</p>
<div class="build"><p><strong>Review basis: Recording Workflow Preview 02 · revision 2</strong></p><p>1 November 2026 · app source <code>647272d</code> · Stream Deck companion <strong>0.2.0</strong></p><p>This is an unpublished preview. The public app release remains <strong>1.1.0</strong>. Availability describes support, not a passed hardware test.</p></div>
<div class="links"><a href="FEATURE-GRID.csv" download>Download comparison CSV</a><a href="FEATURE-GRID.md">Markdown source</a><a href="guide/README.md">Detailed user guide</a><a href="POLICIES.md">Privacy and accessibility</a></div></header>
<div class="controls" role="search" aria-label="Filter feature grid">
<label for="query">Find a feature<input type="search" id="query" placeholder="Try WAV, mirror, voice or guide" autocomplete="off"></label>
<label for="section">Feature group<select id="section"><option value="">All ${ sections.length } groups</option>${ sections.map( section => `<option value="${ section.id }">${ escape( section.title ) }</option>` ).join( "" ) }</select></label>
<label for="status">Availability<select id="status"><option value="">All support levels</option>${ availability.map( status => `<option>${ status }</option>` ).join( "" ) }</select></label>
<button type="button" id="reset">Clear filters</button></div>
<p id="result" class="result" role="status" aria-live="polite">${ titles.length } capabilities · ${ sections.length } groups</p>
<div class="legend"><p><span class="badge included">Included</span> Part of the app or named companion.</p><p><span class="badge optional">Optional</span> Enable, configure or download.</p><p><span class="badge dependent">Dependent</span> Needs an external tool or service.</p><p><span class="badge limited">Limited</span> Read the qualification.</p><p><span class="badge not-included">Not included</span> Outside this build.</p></div>
<p class="reference">“Preview addition” identifies unpublished changes. Requirements still apply to features labelled Included. Every group links to its instructions.</p>
${ body }
<div id="empty" class="closing" hidden><h2>No matching features</h2><p>Try a shorter search or clear the group and availability filters.</p></div>
<footer class="closing"><h2>Record the setup behind the verdict</h2><p>Note the OS, app/plugin versions, speech engine, camera, microphone, recording format and tested control surfaces. Measure recognition, latency and sync on that setup. A feature tick is not a measured result.</p><p>The CSV provides space for reviewer notes. This grid makes no competitor, performance-ranking or endorsement claim.</p><button type="button" id="print">Print full grid / save PDF</button></footer>
</main><script>
const query=document.querySelector('#query'),group=document.querySelector('#section'),status=document.querySelector('#status');
const sections=[...document.querySelectorAll('.feature-section')];
const normal=value=>value.normalize('NFKD').toLocaleLowerCase('en-GB').replace(/[\\u0300-\\u036f]/g,'');
for(const section of sections) for(const row of section.querySelectorAll('tbody tr')) row.searchText=normal(row.textContent+' '+section.querySelector('h2').textContent);
function filter(){const terms=normal(query.value).trim().split(/\\s+/).filter(Boolean);let rows=0,groups=0;for(const section of sections){let count=0;for(const row of section.querySelectorAll('tbody tr')){const show=(!group.value||group.value===section.id)&&(!status.value||status.value===row.dataset.status)&&terms.every(term=>row.searchText.includes(term));row.hidden=!show;if(show)count++;}section.hidden=!count;rows+=count;if(count)groups++;}document.querySelector('#result').textContent=rows+' '+(rows===1?'capability':'capabilities')+' · '+groups+' '+(groups===1?'group':'groups');document.querySelector('#empty').hidden=rows>0;}
function reset(){query.value='';group.value='';status.value='';filter();}
query.addEventListener('input',filter);group.addEventListener('change',filter);status.addEventListener('change',filter);document.querySelector('#reset').addEventListener('click',()=>{reset();query.focus();});document.querySelector('#print').addEventListener('click',()=>{reset();window.print();});
</script></body></html>
`;
fs.writeFileSync( path.join( root, "docs/FEATURE-GRID.html" ), html );
console.log( `Built ${ titles.length } capabilities in ${ sections.length } groups: docs/FEATURE-GRID.html and docs/FEATURE-GRID.csv` );
