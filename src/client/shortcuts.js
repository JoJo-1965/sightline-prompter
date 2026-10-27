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
		section: "Voice scroll sync",
		keys: [
			[ [ "Ctrl+Shift+V" ], "Voice panel: mode, Deepgram API key, microphone" ]
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
			[ [ "Ctrl+," ], "Settings" ],
			[ [ "F1", "?" ], "This help" ],
			[ [ "Esc" ], "Close a panel" ],
			[ [ "Ctrl+W" ], "Close the teleprompter" ]
		]
	}
];
