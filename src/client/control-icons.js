// Original Sightline Stream Deck glyphs, reused for the pad and phone.
// Copyright 2026 Joanne Lockwood, SEE Change Happen Ltd. MIT licence.
const GLYPHS = {
	mirror: "<path d=\"M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3\"/>",
	status: "<rect x=\"2\" y=\"3\" width=\"4\" height=\"4\" rx=\"1\"/><path d=\"M11 5h11M11 12h8M11 19h11\"/><rect x=\"2\" y=\"10\" width=\"4\" height=\"4\" rx=\"1\"/><rect x=\"2\" y=\"17\" width=\"4\" height=\"4\" rx=\"1\"/>",
	play: "<path d=\"m9 5 11 7-11 7Z\" fill=\"currentColor\" stroke=\"none\"/>",
	pause: "<path d=\"M8 5v14M16 5v14\" stroke-width=\"4\"/>",
	top: "<path d=\"M5 5v14m14-14L8 12l11 7Z\"/>",
	previous: "<path d=\"m15 5-7 7 7 7M4 5v14\"/>",
	next: "<path d=\"m9 5 7 7-7 7M20 5v14\"/>",
	marker: "<path d=\"M6 3h12v18l-6-4-6 4Z\"/>",
	"back-to-marker": "<path d=\"M12 3h9v16l-4.5-3-4.5 3V8M8 7l-5 5 5 5m-5-5h10\"/>",
	keeper: "<path d=\"m12 3 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2-4.6-4.4 6.3-.9Z\"/>",
	scrap: "<path d=\"M8 8l8 8m0-8-8 8\"/><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/>",
	"on-air": "<circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M7 7a7 7 0 0 0 0 10m10-10a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16\"/>",
	"obs-record": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"15\" rx=\"3\"/><path d=\"M8 22h8m-4-4v4\"/><circle cx=\"12\" cy=\"10.5\" r=\"4\" fill=\"currentColor\" stroke=\"none\"/>",
	"obs-finish": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"15\" rx=\"3\"/><path d=\"M8 22h8m-4-4v4\"/><rect x=\"8.5\" y=\"7\" width=\"7\" height=\"7\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/>",
	faster: "<path d=\"m3 6 7 6-7 6m10-12 7 6-7 6\"/>",
	slower: "<path d=\"m11 6-7 6 7 6m10-12-7 6 7 6\"/>",
	bigger: "<path d=\"m2 19 6-15 6 15M4 14h8m4-7h6m-3-3v6\"/>",
	smaller: "<path d=\"m2 19 6-15 6 15M4 14h8m4-7h6\"/>",
	"mirror-h": "<path d=\"M12 2v20\" stroke-dasharray=\"2 3\" opacity=\".5\"/><path d=\"m3 7 5 5-5 5Zm18 0-5 5 5 5Z\"/>",
	"mirror-v": "<path d=\"M2 12h20\" stroke-dasharray=\"2 3\" opacity=\".5\"/><path d=\"m7 3 5 5 5-5Zm0 18 5-5 5 5Z\"/>",
	layout: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><path d=\"M3 9h18M9 9v12\"/>",
	reading: "<path d=\"M7 4h13M7 9h9M7 15h13M7 20h10\"/><path d=\"m1 12 3 3-3 3\"/>",
	recording: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"4\" fill=\"currentColor\" stroke=\"none\"/>",
	"sound-check": "<path d=\"M4 15v5M9 9v11M15 3v17M20 12v8\"/>",
	"eye-line": "<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
	"click-through": "<rect x=\"2\" y=\"2\" width=\"17\" height=\"16\" rx=\"3\" stroke-dasharray=\"3 3\" opacity=\".5\"/><path d=\"m10 9 1 13 4-4 4 4 2-2-4-4 5-2Z\" fill=\"currentColor\" stroke-width=\"1\"/>",
	voice: "<rect x=\"8\" y=\"2\" width=\"8\" height=\"13\" rx=\"4\"/><path d=\"M5 11a7 7 0 0 0 14 0m-7 7v4m-4 0h8\"/>",
	steady: "<path d=\"M2 4h11M2 9h8M2 14h11M2 19h8m8-15v16m-4-4 4 4 4-4\"/>",
	pad: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"/>",
	control: "<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"3\"/><path d=\"M8 22h8m-4-5v5M6 7h12M6 11h7\"/>",
	"head-guide": "<path d=\"M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M5 20c1-6 13-6 14 0\"/><ellipse cx=\"12\" cy=\"9\" rx=\"4\" ry=\"5\"/>",
	fullscreen: "<path d=\"M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6\"/><rect x=\"8\" y=\"8\" width=\"8\" height=\"8\" rx=\"2\" opacity=\".5\"/>",
	restore: "<rect x=\"3\" y=\"7\" width=\"14\" height=\"14\" rx=\"2\"/><path d=\"M8 3h11a2 2 0 0 1 2 2v11\"/>",
	help: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 8a3 3 0 1 1 4 3c-1 0-1 2-1 2m0 4h.01\"/>"
};
GLYPHS["mic-off"] = "<path d=\"M9 4a4 4 0 0 1 7 2v7M8 8v3a4 4 0 0 0 6 3M5 11a7 7 0 0 0 12 5m2-5v2m-7 5v4m-4 0h8M3 3l18 18\"/>";
GLYPHS["listen-restart"] = "<rect x=\"9\" y=\"5\" width=\"6\" height=\"10\" rx=\"3\"/><path d=\"M5 12a7 7 0 0 0 14 0m-7 7v3M4 7V2m0 5h5M4 7a10 10 0 0 1 16-2\"/>";
GLYPHS["guide-lock"] = "<path d=\"M3 8V3h5M3 16v5h5M6 13c-3-4-1-10 3-10 3 0 5 4 3 8\"/><rect x=\"12\" y=\"14\" width=\"10\" height=\"8\" rx=\"2\"/><path d=\"M14 14v-3a3 3 0 0 1 6 0v3\"/>";
GLYPHS["guide-adjustments"] = "<path d=\"M4 5h16M4 12h16M4 19h16\"/><circle cx=\"8\" cy=\"5\" r=\"2\" fill=\"currentColor\"/><circle cx=\"16\" cy=\"12\" r=\"2\" fill=\"currentColor\"/><circle cx=\"10\" cy=\"19\" r=\"2\" fill=\"currentColor\"/>";
GLYPHS["guide-ideal-visible"] = "<ellipse cx=\"9\" cy=\"10\" rx=\"5\" ry=\"7\" stroke-dasharray=\"2 3\"/><ellipse cx=\"15\" cy=\"13\" rx=\"5\" ry=\"7\"/>";
GLYPHS["guide-match-ideal"] = "<ellipse cx=\"15\" cy=\"12\" rx=\"5\" ry=\"8\" stroke-dasharray=\"2 3\"/><path d=\"M2 12h12m-4-4 4 4-4 4\"/>";
export function controlIcon( id, status ) {
	if ( /^slot-[1-9]$/.test( id ) ) return id.slice( 5 );
	if ( id === "listening-toggle" ) id = status.listeningControl?.suspended ? "mic-off" : "voice";
	if ( id === "listening-restart" ) id = "listen-restart";
	if ( id === "session-check" ) id = "status";
	if ( id === "guide-eyes-lock" ) id = status.headGuide?.eyesLocked ? "guide-lock" : "eye-line";
	const key = id === "toggle" ? status.scrolling ? "pause" : "play" : id === "scroll-mode" ? status.scrollMode === "voice" ? "voice" : "steady" : id === "head-guide-fullscreen" ? status.showHeadGuide && status.headGuideFullscreen ? "restore" : "fullscreen" : ( { restart: "top", "previous-section": "previous", "next-section": "next" }[id] ?? id );
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ GLYPHS[key] ?? GLYPHS.help }</svg>`;
}
