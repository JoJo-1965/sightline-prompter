// Keyboard shortcuts shown in the help panel (F1). Keep in step with the
// keydown handler in teleprompter.js and the accelerators in menus.js.
export const SHORTCUTS = [
	{
		section: "Scrolling",
		keys: [
			[ [ "Space" ], "Start / pause scrolling (with a countdown)" ],
			[ [ "Page Down" ], "Start / pause (presenter clicker)" ],
			[ [ "↑", "↓" ], "While scrolling: faster / slower by 5 words a minute" ],
			[ [ "Ctrl+]", "Ctrl+[" ], "Faster / slower" ],
			[ [ "Ctrl+\\" ], "Reset the speed" ],
			[ [ "→", "←" ], "Next / previous section (=== SECTION lines and headings)" ],
			[ [ "Page Up" ], "Previous section (presenter clicker)" ],
			[ [ "Ctrl+Home" ], "Back to the start" ],
			[ [ "Space" ], "After a {pause} in the script: carry on" ],
			[ [ "B" ], "Drop a marker at the reading line (for retakes)" ],
			[ [ "K" ], "This take's a keeper (in the take log)" ],
			[ [ "Shift+K" ], "Scrap this take" ],
			[ [ "Ctrl+B" ], "Jump to the next marker ({marker} or one you dropped)" ],
			[ [ "Shift+B" ], "Back to the last marker, to read on from there (logged as a restart for the edit)" ],
			[ [ "↑", "↓", "Wheel" ], "When stopped: scroll by hand" ]
		]
	},
	{
		section: "Text and layout",
		keys: [
			[ [ "Ctrl+=", "Ctrl+-" ], "Bigger / smaller text" ],
			[ [ "Ctrl+0" ], "Reset the text size" ],
			[ [ "Ctrl+Shift+↑", "Ctrl+Shift+↓" ], "More / less background backing" ],
			[ [ "Ctrl+Shift+0" ], "Reset the backing" ],
			[ [ "Ctrl+M" ], "Mirror: off → horizontal → vertical → both" ],
			[ [ "Ctrl+Shift+K" ], "Layout: margins, line spacing, alignment" ]
		]
	},
	{
		section: "Scripts and slots",
		keys: [
			[ [ "Ctrl+O" ], "Open a script into this slot" ],
			[
				[ "Ctrl+1 … Ctrl+9" ],
				"Swap to script slot 1 to 9 (each keeps its place)"
			],
			[ [ "Drop a file" ], "Open it into this slot" ],
			[ [ "Ctrl+N" ], "New script" ],
			[ [ "Ctrl+E" ], "Edit the script (Markdown and text files)" ],
			[ [ "Ctrl+S", "Ctrl+Shift+S" ], "Save / Save as" ]
		]
	},
	{
		section: "Talking points",
		keys: [
			[ [ "Space" ], "Start / stop the talk timer" ],
			[ [ "Page Down", "→" ], "Next point (starts the timer if it isn't running)" ],
			[ [ "Page Up", "←" ], "Previous point" ],
			[ [ "{mode: points}" ], "In a script: open it as talking points (or Layout > Talking points)" ]
		]
	},
	{
		section: "Script mark-up",
		keys: [
			[ [ "[ ]" ], "A note to you, the speaker: shown dimmed. \"Quoted words\" inside stay bright" ],
			[ [ "{ }" ], "An instruction to the app: hidden while you read" ],
			[ [ "{pause}" ], "Stop scrolling here until you press Space or the clicker" ],
			[ [ "{pause: 3s}" ], "Stop for 3 seconds, then carry on" ],
			[ [ "{marker}" ], "A bookmark for retakes (Ctrl+B jumps to it)" ],
			[ [ "{wpm: 140}" ], "On a section heading: that section's pace" ],
			[ [ "{target: 1:20}" ], "On a section heading: that section's target time" ],
			[ [ "Layout" ], "Show directives: see them as small tags, with ⚠ on typos" ]
		]
	},
	{
		section: "Voice scroll sync",
		keys: [
			[ [ "Ctrl+Shift+V" ], "Voice panel: mode, speech recognition, microphone" ],
			[ [ "“Prompter, what can I say?”" ], "Shows every voice command on the prompter" ]
		]
	},
	{
		section: "Window",
		keys: [
			[ [ "F11" ], "Full screen" ],
			[ [ "Shift+F11" ], "Maximise / restore" ],
			[ [ "Ctrl+Shift+M" ], "Minimise" ],
			[
				[ "Ctrl+L" ],
				"Eye-line mode: a strip at the top-centre, under the webcam"
			],
			[ [ "Ctrl+Shift+B" ], "Keep the control bar visible" ],
			[ [ "Ctrl+Shift+A" ], "On air / off air: the on-air backing and the ON AIR light" ],
			[ [ "Ctrl+Shift+X" ], "Click-through on / off (works from any app)" ],
			[ [ "Ctrl+Shift+P" ], "Floating control pad: Start / Pause, Top, Previous, Next" ],
			[ [ "Ctrl+Shift+O" ], "Control window: a live, upright copy of the script with the buttons, for the operator screen" ],
			[ [ "Ctrl+," ], "Settings" ],
			[ [ "F1", "?" ], "This help" ],
			[ [ "Shift+F1" ], "The user guide, with pictures" ],
			[ [ "Esc" ], "Close a panel" ],
			[ [ "Ctrl+W" ], "Quit Sightline (also at the foot of the ☰ menu)" ]
		]
	}
];
