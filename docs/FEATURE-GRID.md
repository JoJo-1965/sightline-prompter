# Sightline Prompter feature grid

**Review basis: Recording Workflow Preview 02, documentation revision 2, 1 November 2026.**
This grid describes the preview built from `647272d`, with companion Stream
Deck plugin **0.2.0**. It includes the existing features and the unpublished
preview additions. The public app release remains **1.1.0**; this document
does not announce a new release or certify a recording setup.

Use the [searchable grid](FEATURE-GRID.html) to browse by subject or support
level. The [CSV comparison sheet](FEATURE-GRID.csv) includes a blank reviewer
notes column. Each section links to the detailed instructions and limitations.

**Availability:** **Included** is part of the app; **Optional** needs enabling,
configuration or an optional download; **Dependent** needs external software,
hardware or a service; **Limited** has a material qualification; **Not included**
is outside the current product. These labels describe capability, not a test
result. Options marked “preview addition” are present in this preview and
must not be advertised as available in the published installer.

## 01 · Product, platform and installation

Reference: [Getting started](guide/01-getting-started.md) and [Policies](POLICIES.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Product type | Included | Desktop teleprompter with a translucent script overlay, voice control and production metadata. | A separate recording application or camera supplies the production video. |
| Price and account | Included | Sightline Prompter is free to download and use, with no required Sightline account or subscription. | Optional third-party services can have their own charges and accounts. |
| App source and licence | Included | Public GitHub source under the MIT licence; adapted from Electron Teleprompter. | Preserve applicable copyright and licence notices when redistributing. |
| Desktop platforms | Included | Windows, macOS Apple silicon and Intel, and Linux distribution targets. | Physical hardware validation varies by platform; macOS hardware and VoiceOver checks remain outstanding. |
| Local desktop operation | Included | Ordinary reading, editing and steady prompting run on the computer. | First downloads, updates, linked documents and online services require connectivity. |
| Packaged installation | Included | Downloadable desktop packages; Windows installer and app branding. | Signing and operating-system security prompts are described in the installation guide. |
| Windows process identity | Included | Short Sightline Prompter name in packaged Windows metadata; preview addition. | Existing installed releases need an updated build to change their process description. |
| Optional components | Optional | Component checks and setup for the offline speech model, AI agent kit and external integrations. | Detecting a component does not validate its hardware, permissions or complete configuration. |
| Missing dependency feedback | Included | Dependent controls explain missing components and offer the relevant setup route. | Available functions still depend on connection and permission state. |
| Update and compatibility checks | Included | Version information and app/plugin compatibility feedback. | A detected version is not automatic installation or a passed acceptance test. |

## 02 · Prompting, pace and navigation

Reference: [Scrolling and voice](guide/03-scrolling-and-voice.md) and [Recording a take](guide/05-recording-a-take.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Steady scrolling | Included | Automatic scrolling at a chosen words-per-minute pace. | Timings are estimates and depend on the script and delivery. |
| Voice following | Optional | Advances through the script as recognised speech matches the words being read. | Requires microphone access and a configured local or online speech engine. |
| Page and talking-point mode | Included | Notes mode displays pages of talking points; headings or explicit page breaks divide them. | Pages advance through navigation controls rather than continuous speech alignment. |
| Start, pause and resume | Included | Toolbar, keyboard, voice and enabled remote controls. | Recorder behaviour is separately configured in the OBS section. |
| On air reading view | Included | A separate On air state changes the operator/reading presentation and configured backing. | On air describes the prompter view; use the confirmed recording pill to check the recorder. |
| Restart and return to top | Included | Return to the beginning; reset can also restore normal pace and clear the pacing clock. | Returning to top and starting a fresh timed run are distinct actions. |
| Section navigation | Included | Previous, next and numbered section jumps; section retakes. | Section boundaries come from the script structure. |
| Speed and responsiveness | Included | Change steady WPM or voice-following responsiveness during use. | Recognition accuracy and responsiveness are different concerns. |
| Start countdown | Optional | Set a countdown before prompting begins. | A countdown alone does not start an external recorder. |
| Section targets | Optional | Per-section WPM and target duration, plus script-wide pacing instructions. | Targets guide delivery; they do not guarantee the final running time. |
| Pace feedback | Included | Pacing light, elapsed time, progress and estimated time remaining. | Speech-derived figures require useful recognition data. |
| Sentence and reading position | Optional | Reading-line marker, sentence highlight and focus band. | These are reading aids rather than a measure of eye contact. |
| First spoken line at start | Included | Long preparation notes are removed from the delivery view and the first spoken line is positioned for reading; preview addition. | Use production comments for long instructions and pause to inspect them. |

## 03 · Speech recognition and voice commands

Reference: [Speech engines and command phrases](guide/03-scrolling-and-voice.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Offline speech recognition | Optional | On-computer recognition with a downloadable local model. | Initial component download and microphone permission are required; results depend on voice and environment. |
| Recognition language | Limited | The supplied offline Zipformer model and current recognition configuration use English. | Do not assume multilingual recognition because the external provider offers other languages. |
| Online speech recognition | Dependent | Optional Deepgram engine with the user's API key. | Requires internet access, a Deepgram account and its service terms; audio leaves the computer. |
| Microphone choice | Included | Select the input used for voice following and command recognition. | Device availability, drivers and operating-system permissions apply. |
| Listening modes | Optional | In voice mode, Always listening, or Off. | Always listening keeps microphone recognition active while prompting is stopped. |
| Wake word | Optional | Prompter, Computer, Teleprompter or Director. | Wake-word recognition is speech recognition, not guaranteed keyword detection. |
| Reading and display commands | Optional | Go, pause, slower, faster, bigger, smaller, back, next and return to top. | Enable command listening; several phrases have documented aliases. |
| Retake and edit commands | Optional | Again, marker, back to marker, keeper and scrap that. | Ratings and markers describe the take log; they do not cut video automatically. |
| Spoken section selection | Optional | Select numbered sections, including natural spoken numbers. | A section number can act as a spoken slate and a retake instruction. |
| Explicit recording commands | Dependent | Record take, finish recording, and record on, off, pause or resume; explicit recorder commands are a preview addition. | OBS integration and recording-control permission must be enabled. |
| Head-guide voice commands | Optional | Guide on and guide off request a definite visible or hidden state. | Controls the manual guide; it does not detect a face. |
| Voice recovery and resync | Included | Listener health/recovery events and a resync command to find the reading position. | Noise, silence, paraphrasing and lost recognition can still require intervention. |
| Recognition corrections | Optional | Personal word corrections and sound-alike handling for script alignment. | Corrections do not retrain the speech engine or guarantee command recognition. |
| Heard report and tracing | Optional | Inspect recognised words for troubleshooting; separate optional command-word tracing. | Tracing can capture nearby conversation while listening; it is off by default. |
| Command help | Included | Grouped What can I say window and contextual help. | Recording commands are shown only when the relevant OBS controls are enabled. |

## 04 · Script files, editor and library

Reference: [Writing scripts](guide/02-scripts.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Markdown and plain text | Included | Open `.md`, `.markdown` and `.txt` scripts. | Markdown structure provides the richest control over sections and directions. |
| Word and rich text | Included | Import `.docx` and `.rtf` documents. | Conversion creates a reading script; it is not a full word-processing layout editor. |
| PDF import | Included | Extract readable text from PDF files. | Image-only scans need OCR elsewhere; complex columns and layouts can require cleanup. |
| HTML import | Included | Open `.html` and `.htm` script files. | Imported content is for prompting, not a complete browser application. |
| Google Docs links | Dependent | Import accessible Google Docs content. | Sharing and internet access must permit retrieval; private account access is not implied. |
| Built-in Markdown editor | Included | CodeMirror editor, preview toggle, save, Save as and unsaved-change prompts. | The app does not replace a full collaborative document suite. |
| External editing | Included | Watch an opened file and refresh when it changes externally. | Watching pauses during built-in editing to avoid conflicting edits. |
| Script slots | Included | Nine quick-access slots, recent files and switching controls. | A slot points to its script; clearing a slot is separately confirmed. |
| Slot clearing protection | Included | Confirmation before clearing an occupied slot. | Keep source files backed up independently of slot assignments. |
| Sample scripts | Included | Welcome, voice/directive demonstrations and recording acceptance examples. | Samples are protected originals: view them and save a working copy to edit. |
| Recording preview sample | Included | Preparation, Continuous and linked recording, explicit commands and handover walkthrough; preview addition. | Exercise recorder controls only with the intended test setup connected. |
| Exact recording script | Included | Preserve the source actually used, including section IDs, slide cues and directions, in the edit pack. | The export is the recording snapshot, which can differ from a later file edit. |

## 05 · Script directions and production notes

Reference: [Script directives](SCRIPT-DIRECTIVES.md) and [AI script brief](AI-SCRIPT-BRIEF.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Ordinary scripts | Included | Read a script without adding compulsory application directives. | Optional directions add workflow control when needed. |
| Sections and IDs | Included | Structured headings organise navigation, takes, targets and handover. | Stable section identity helps an editor match the recording script. |
| Short delivery cues | Included | Square-bracket notes such as `[smile]`, `[think]` or `[point]` remain available inline. | Unquoted direction words are excluded from spoken word counts and alignment. |
| Quoted spoken cues | Included | `[Say: "Section one"]` distinguishes words intended to be spoken. | Quoted words are included in the spoken script; do not use this form for silent instructions. |
| Long production comments | Included | HTML comments hold preparation instructions; visible while paused and hidden during delivery; preview addition. | All comment contents, including quoted words and directive examples, are excluded from speech tracking and command execution. |
| Direction display | Optional | Normal, dimmed or hidden bracket directions; quoted spoken words remain visible. | Long production comments follow the separate paused/delivering rule. |
| Manual script stops | Included | `{stop}` or `{pause}` holds prompting until the user continues. | Continuous recording keeps OBS running; linked recording changes that behaviour explicitly. |
| Timed pauses | Included | `{pause: 3s}` provides a timed beat. | In voice mode it is a visible pause cue rather than a forced timed scroll. |
| Named markers | Included | `{marker}` or `{marker: Setup}` creates a navigation and edit reference. | Marker positions are timing references, not verified frame-accurate cuts. |
| Off-script passages | Optional | `{listen: off}` and `{listen: on}` support ad-lib or demonstration passages. | The microphone is off in the off-script hold; manual continuation is required. |
| Script sound checks | Optional | `{soundcheck: room}` and `{soundcheck: voice}` request the appropriate check. | Measurement uses the selected input and the current acoustic conditions. |
| Script control commands | Optional | `{prompter: ...}` supports documented display, pace and marker actions. | Only documented commands are supported. |
| Script recording commands | Dependent | Optional `{record: on}`, `{record: off}`, `{record: pause}` and `{record: resume}`; preview addition. | Require enabled OBS recording controls; loading a script never executes them. |
| Pace, notes and page directives | Optional | Section WPM/targets, script pacing, `{mode: notes}` and `{page}`. | The script checker documents supported values and catches unknown directives. |

## 06 · Theme, typography and reading aids

Reference: [Layout and display](guide/04-layout-and-display.md) and [Settings](guide/07-settings.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Theme settings | Included | Dedicated Theme subtab; Standard, Yellow on dark, High contrast and Soft cream. | The dedicated subtab is a preview addition. |
| Custom colours | Included | Text, background, heading and comment colour controls. | Legibility still depends on the content behind a translucent window. |
| Text and heading fonts | Included | Standard, Atkinson Hyperlegible, OpenDyslexic and Verdana; separate heading choice or follow text. | Font preference is personal and is not an accessibility certification. |
| Script text size | Included | Toolbar and settings adjustment, with remote and voice size actions. | Available reading area depends on window dimensions and margins. |
| Heading size | Included | Heading scale independent of the body text. | Long headings can require rewording or a smaller scale. |
| Comment appearance | Included | Independent comment colour and size; font follows headings. | Short inline directions and long notes serve different purposes. |
| Independent line spacing | Included | Separate script, heading and comment line spacing; preview addition. | Adjust each against the actual reading window and text size. |
| Alignment and margins | Included | Left or centred text; side, top and bottom margin controls. | Extreme settings can reduce the usable reading area. |
| Background and text visibility | Included | Background opacity, separate on-air backing and text brightness. | Overlay appearance does not change the underlying video content. |
| Text edge | Optional | None, outline or shadow to separate words from a busy background. | Preview against the intended slides, call or camera picture. |
| Focus band | Optional | Dim text away from the reading line; adjustable strength. | Does not remove text from the script or edit pack. |
| Reading marker and progress | Optional | Reading-line position and marker, sentence highlight, progress and time-left display. | Display aids can be configured separately from the script content. |

## 07 · Windows, screens and capture

Reference: [Layout and display](guide/04-layout-and-display.md) and [Remotes and screens](guide/06-remotes-and-screens.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Transparent content overlay | Included | Read over a video call, slides, camera/projector preview or other desktop content. | Sightline does not supply or embed the underlying call or presentation. |
| Always on top | Optional | Keep the prompter above ordinary application windows. | Operating-system window rules and other topmost windows can affect stacking. |
| Windowed and fullscreen use | Included | Size and position the prompter, or use a fullscreen reading view. | Multi-window arrangements need checking on the intended display. |
| Horizontal and vertical mirror | Included | Separate mirror controls, including toolbar icons. | Set the flips appropriate to the physical teleprompter glass or monitor. |
| Prompter monitor | Optional | Choose the display used for the reading window. | Requires the display to be connected and recognised by the operating system. |
| Eye-line strip | Optional | Compact reading strip with configurable screen height and reading-line position. | Lens alignment is a manual setup task. |
| Click-through | Optional | Let pointer interaction reach content beneath the overlay. | Use the documented shortcut or remote control to regain interaction. |
| Operator window | Optional | Separate upright controls and script/session status while the reading window is mirrored. | A second monitor is useful but not required. |
| Toolbar hiding | Included | Toolbar retreats when the pointer moves away; faster distance-based hiding is a preview addition. | Keyboard focus keeps controls available while they are in use. |
| Utility windows | Included | Separate Settings, help and command windows, with movable positioning. | Window stacking must still be checked in the user's chosen fullscreen arrangement. |
| Capture protection | Limited | Request that supported capture paths exclude Sightline utility/reading windows. | Platform, capture method and compositor determine the result; verify the actual recording. |
| Capture override for testing | Optional | Debug control allows capture of Sightline windows for demonstrations and diagnostics. | This intentionally removes protection; inspect every captured output before recording. |
| Small-screen layout | Limited | Grouped, paged settings avoid a changing-size settings panel. | A known 1024 × 600 preview issue can overlap guide access and OBS toolbar actions; queued for the next UI review. |

## 08 · Head positioning and framing reference

Reference: [Head guide and controls](guide/06-remotes-and-screens.md) and [Production handover](guide/12-production-handover.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Floating head guide | Optional | Separate transparent framing window above a camera/projector view and below the prompter. | The underlying camera picture comes from another application. |
| Ideal and Actual outlines | Included | Distinct target framing and manually aligned actual framing. | Actual is a user-set reference, not a camera measurement. |
| Eye-line anchoring | Included | Set centre and eye level before adjusting the shape around the eyes. | Manual alignment must be repeated if camera framing changes. |
| Head-edge adjustment | Included | Adjust top, bottom, left and right independently. | Changes the outline, not the camera crop or the person's image. |
| Move and scale | Included | Horizontal/vertical position, overall size, width and height controls. | Shape adjustments are separate from moving the guide window itself. |
| Guide visibility | Included | Outline colour/opacity and background-opacity control. | A busy or bright camera picture may need stronger backing. |
| Guide templates | Included | Choose a session framing template and keep it across script/module changes. | A session setting is separate from script-specific directions. |
| Guide placements | Included | Centre and beside-panel placements, plus window positioning and sizing. | Beside panel refers to a guide placement alongside the reading area. |
| Fullscreen and chromeless guide | Included | Toggle the guide into and out of fullscreen; lock the adjustment view when ready. | Test stacking with the OBS projector and prompter on the chosen monitor. |
| Adjustment panel | Included | Movable controls; bottom placement avoids the main top toolbar by default; preview refinement. | Dense small-screen combinations still have the separate known toolbar issue. |
| Save Ideal | Included | Save the preferred target outline for repeatable framing. | This is distinct from saving an Actual reference for a recording. |
| Save and restore recording reference | Included | Save Actual position, dimensions and eye lock; restore without overwriting Ideal; preview addition. | Restoring the shape does not restore the physical camera, body or guide window. |
| Guide export metadata | Included | Record Ideal/Actual information, recording reference and guide window geometry in the edit pack. | Metadata describes the configured guide, not proof that it was absent from the video. |
| Keep guide out of output | Limited | Capture protection and a camera-source recording workflow keep the guide on the operator's screen. | No universal automatic guarantee; verify the recorded file and chosen capture source. |
| Automatic face or eye tracking | Not included | Actual framing is aligned by the user. | No automatic face detection, posture scoring or lens-gaze correction is claimed. |

## 09 · Keyboard, clickers and controllers

Reference: [Remotes and screens](guide/06-remotes-and-screens.md) and [Shortcuts](guide/08-shortcuts-and-troubleshooting.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Keyboard control | Included | Start/pause, sections, markers, display actions and documented shortcuts. | Some shortcuts depend on focused windows; documented global shortcuts cover specific actions. |
| Presentation clickers | Dependent | Navigate using compatible keyboard-like presentation remotes. | Button codes vary by device and may need mapping. |
| Pedals and gamepads | Dependent | Map supported input events to prompter actions. | Hardware, drivers and device-event support vary. |
| Learn and customise input | Optional | Input mapping controls let users assign supported buttons to actions. | This is not a driver for every USB controller. |
| Editing input safeguards | Included | Reading-oriented mappings are suspended where editing requires ordinary input. | Check unusual remotes against the editor before live use. |
| Common action model | Included | Navigation, display, take and framing actions are shared across applicable control surfaces. | Available buttons and feedback depend on the surface and enabled features. |

## 10 · Floating pad and phone remote

Reference: [Pad and phone setup](guide/06-remotes-and-screens.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Floating control pad | Optional | Separate touch/mouse control window with selectable action buttons. | Enable and customise it in Settings > Controls > Pad. |
| Select and reorder actions | Included | Choose the supported actions and drag to arrange their order. | The layout uses a defined action catalogue, not arbitrary third-party plugins. |
| Pad column count | Included | Two, three, four or six columns. | Choose a count suitable for the available pad width. |
| Layout presets | Included | Compact, Reading, Studio, and Framing & checks presets. | Applying a preset replaces the current selected layout. |
| Reading buttons | Included | Start/pause, top, previous/next, pace, text and other supported reading actions. | State and button availability reflect the current session. |
| Production buttons | Dependent | Marker, keeper, scrap, sound check and recorder controls. | OBS actions need OBS permission; other actions follow their own microphone/session requirements. |
| Framing and listening buttons | Included | Guide visibility, fullscreen, available framing adjustments and listening controls. | No dial hardware is required to use equivalent button actions. |
| Phone browser remote | Optional | Open the supplied local-network URL or scan the QR code. | Phone and computer need network reachability; this is a browser controller, not a native phone app. |
| Shared phone/pad layout | Included | Phone uses the same selected actions and order as the desktop pad. | Change the shared configuration in Sightline. |
| Portrait and landscape | Included | Responsive button layout for phone orientation and screen size. | Long layouts can need scrolling; browser chrome reduces the usable height. |
| Live state and reconnect | Included | Prompting, section/progress and confirmed recorder status; connection recovery feedback. | A disconnected client cannot confirm current state; network delays can affect response. |
| Finish recording safeguard | Optional | Hold Finish recording for one second on pad and phone. | This safeguard applies to those surfaces, not every external control route. |
| Remote access security | Included | Token-based local-network access rather than an open public control page. | Treat a pairing URL/token as a control credential; this is not an internet relay service. |

## 11 · Stream Deck companion

Reference: [Stream Deck installation, permissions and profiles](guide/06-remotes-and-screens.md#stream-deck).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Companion plugin | Dependent | Sightline Stream Deck 0.2.0, paired with the app's supported control contract. | Requires Elgato Stream Deck software; the companion is an optional installation. |
| Supported desktop hosts | Dependent | Plugin host support for Windows and macOS. | The Linux app does not imply an official Elgato Linux host. |
| Keys, Mobile and Pedal | Included | Ready-made profiles for supported Stream Deck models, including Mobile and Pedal. | Requires the corresponding Elgato hardware/software entitlement where applicable. |
| Stream Deck + dials | Included | Dial-based controls for supported reading and framing adjustments. | Requires Stream Deck + and the appropriate action configuration. |
| Prompting and slots | Included | Play/pause, navigation, script slots, speed and display actions. | The companion controls loaded scripts; its restricted key does not grant script-file access. |
| Take and recording keys | Dependent | Record take and Finish recording, markers and take ratings. | OBS recording keys require app integration plus explicit recording-control permission. |
| Head-guide controls | Included | Show/hide, fullscreen and supported position/size/reference actions. | Adjusts the manual guide rather than a camera source. |
| Session listening controls | Included | Supported command-listening actions from assigned keys. | Microphone permissions and selected engine remain app responsibilities. |
| State on the keys | Included | Play/pause, On air, selected slot, section/time and confirmed recording state. | Unknown/disconnected recording state must not be treated as stopped. |
| Recording profiles | Included | Separate OBS recording layouts alongside ordinary prompting profiles. | The Pedal recording layout's last pedal finishes the whole recording file. |
| Discovery and pairing | Included | Enable once under Controls > Stream Deck; local discovery avoids manual token entry. | Preview pairing is separate from the normal installed app's discovery. |
| Permission separation | Included | Dedicated restricted companion credential, separate from general AI/API access. | No arbitrary settings, recording-file access or broad AI permission is granted. |
| Version compatibility | Included | App/plugin version reporting and required-feature compatibility feedback. | Use a matched app/plugin pair; successful installation is not hardware validation. |
| Distribution and source | Limited | Installer available with the app release; source repository remains private. | Elgato Marketplace submission is pending review, not an approved live listing. |

## 12 · OBS connection, recording and setup

Reference: [Recording with OBS](guide/11-obs.md) and [OBS setup assistant](guide/15-obs-setup.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Standalone OBS connection | Dependent | Connect through OBS WebSocket with address, port and password. | Requires OBS with a compatible WebSocket server, enabled and reachable. |
| Optional integration | Optional | OBS support is off until enabled; dependent help and controls follow that state. | Ordinary prompting works without OBS. |
| Credentials | Included | Save the OBS password using supported operating-system protection; remove it from settings. | Operating-system credential protection availability and user profile apply. |
| Status versus control permission | Included | Observe recorder state separately from permission to start, stop, pause and resume. | Connecting alone does not authorise recorder commands. |
| Confirmed recording pill | Included | OFF green, RECORDING red, PAUSED orange and UNKNOWN grey; persistent preview addition. | Text accompanies colour; OBS-disabled mode hides it. |
| Record take | Included | Confirm OBS recording before starting the prompter. | Needs a healthy connection and recording-control permission. |
| Finish recording | Included | Finish the prompter session and request the end of the OBS recording. | Verify the acknowledged state and resolved file before handover. |
| Continuous recording | Included | Keep one OBS recording running through prompting holds, section stops and retakes. | Default behaviour; a prompter pause is not an OBS pause. |
| Linked recording | Optional | Link recording to prompting: confirmed start/resume, pauses with holds, finish at final stop/end; preview addition. | Enable with OBS stopped; requires recording permission and a pause-capable recording format. |
| Explicit recorder actions | Included | Record on, off, pause and resume through supported controls, voice or optional directives; preview addition. | OBS/format limitations apply; script loading alone cannot trigger recording. |
| Recording reminder | Included | Visible recording state and start/finish controls help distinguish prompting from recording. | A reminder or On air display is not proof of a running recorder. |
| Recording file and clock | Included | Log OBS recording starts/stops, pause/resume/restart events, file identity and reported time references. | File names and offsets remain unknown where OBS has not supplied enough information. |
| Take-to-file references | Included | Section starts, takes and markers link to OBS recording segments and clock positions. | Estimated timing and discontinuities are retained as such; inspect the media for precise edits. |
| OBS chapters | Optional | Send section starts and named markers as recording chapters. | Requires support from the OBS version, output format and recording state. |
| Recorded slate source | Optional | Prepare a browser-source picture/tone route for a reference in the recorded output. | Add it to the recorded scene and include the routed audio track; confirm it in a test file. |
| Setup assistant | Optional | Review and apply a separate OBS profile/scene collection using selected existing camera, mic and presentation sources. | Does not guess hardware; source types must be supported and configured first. |
| Output presets | Optional | Choose a 1080p or 3840 × 2160 4K canvas/output at 30 fps and an output folder. | A 4K canvas does not prove native 4K capture or adequate encoding performance. |
| Generated scene layout | Included | Camera and presentation layouts with selected microphone routed to tracks 1 and 2. | No head-guide/prompter capture source is added; track 2 in MKV is not a separate WAV. |
| Preserve existing OBS setup | Included | Review named changes, use a separate profile/collection and check setup results. | Restoration and recording quality must still be verified on the actual workstation. |
| Simultaneous clean-camera master | Dependent | Documented separate camera/microphone route using the Source Record filter. | Requires an additional OBS plugin and configuration; separate filenames are not discovered automatically. |
| Unprocessed mic master | Dependent | Preserve the mic before processing using the documented separate route; extract PCM to WAV as appropriate. | A composed OBS track or Sightline scratch WAV is not automatically an unprocessed production master. |

## 13 · Audio measurement and sync

Reference: [Sound check and scratch audio](guide/05-recording-a-take.md) and [Production handover](guide/12-production-handover.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Microphone level display | Optional | Live sound-level information during applicable microphone use. | Measures the input as Sightline receives it, before another tool's later processing. |
| Room and voice checks | Optional | Separate checks for background noise and speech level. | Room conditions, microphone placement and hardware gain affect the result. |
| Advisory low-level handling | Included | Explain quiet/noisy/clipping conditions and allow Continue anyway; preview addition. | Increasing gain can also increase background noise; the user decides the compromise. |
| Per-take loudness | Optional | Voice-mode-only, Always during prompting, or Off. | Always mode opens the microphone during prompting; monitoring is not a mastering process. |
| Logged audio measures | Included | Loudness LUFS, peak dBFS, background noise, voice-above-noise and warnings. | Available only when measured; accepted warnings are retained with the session. |
| Scratch recording | Optional | Independent local microphone WAVs for timing and edit checks. | Scratch audio is a reference, not a guarantee of production quality or a replacement for the clean mic master. |
| Local take slate | Optional | Off, Flash and beep, or Flash only; visible choices in this preview. | A flash seen only on the operator display does not prove recorded camera/audio sync. |
| Recorded sync reference | Dependent | Slate IDs and known picture/tone routing into OBS, logged against takes. | The selected recorded scene and audio track must actually contain the reference. |
| Physical camera lip sync | Limited | Use visible/audible claps and inspect camera/mic recordings; compare later references for drift. | No automatic verified camera latency estimate or universal sync correction is claimed. |
| Sync adjustment | Dependent | Apply verified offsets in OBS or in the external edit workflow. | Sightline metadata is a timing aid; validate the result by looking and listening. |

## 14 · Takes, logs and production handover

Reference: [Take log and edit pack](guide/05-recording-a-take.md) and [Production handover](guide/12-production-handover.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Session and section log | Included | Section/take IDs, start/end times, durations, UTC times and completion state. | Keep the recording media alongside the matching session export. |
| Retakes and restarts | Included | Record reruns, section restarts, skipped or stopped takes and edit markers. | A logged restart is not automatically the point an editor should cut. |
| Keeper and scrap choices | Included | Rate takes and preserve a preferred-use choice per section. | Choices are reviewable metadata, not destructive edits to media. |
| Take summary | Included | Review pace, target difference, completion and available sound/recognition feedback. | Results depend on the information captured for that take. |
| Saved recording browser | Included | Revisit saved sessions and export reports/edit packs. | The log browser is not a video editor or media-management system. |
| Core log exports | Included | `take-log.json` and `takes.csv`. | Field availability can differ between older and newer sessions. |
| Word and sentence detail | Optional | `words.csv` and `sentences.csv` with recognised timing and coverage. | Requires voice alignment; recognition errors and paraphrases affect coverage. |
| Edit marks | Included | `edit-marks.csv` and `edit-marks.json`, including markers, pauses and rereads where available. | Suggestions and recognition-derived boundaries need editorial review. |
| Draft captions | Optional | `captions.srt` and `captions.vtt`, built from available aligned speech/script data. | Review text and timing before publication; not a guaranteed verbatim transcript. |
| Script snapshot files | Included | `script-snapshots.json` plus numbered source snapshots tie words, IDs and cues to the recording. | Later edits to the source file do not replace the captured version. |
| Recorded sync export | Included | `recorded-sync.json` preserves reference IDs, routing and take/recording links. | Reference metadata does not certify the physical camera/microphone path. |
| Head-guide export | Included | `head-guide.json` includes Ideal, Actual, saved reference and window geometry. | Reference save/restore is a preview addition. |
| Rehearsal export | Included | `rehearsal-coach.json` provides the available coaching report. | No performance score or automatic keeper reassignment is produced. |
| Scratch WAV handover | Optional | Include available independent mic recordings with their session/timing references. | Audio exists only when scratch capture was enabled and succeeded. |
| External recording collection | Limited | Main OBS filename is resolved when reported; collect video, clean camera and clean mic masters separately. | The edit pack does not automatically locate or bundle every external recording file. |
| Automatic finished video | Not included | Logs and edit packs support a human or an external editing agent. | Sightline does not render a finished promotional film or automatically edit the production master. |

## 15 · Script review and rehearsal coaching

Reference: [Script health](guide/02-scripts.md#script-health-before-you-read) and [Rehearsal coaching](guide/05-recording-a-take.md#rehearsal-coaching).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Script review | Included | Local review of script structure, reading load and supported directions before recording. | Rule-based feedback; no external generative AI is required. |
| Directive checking | Included | Check known directives and values, including sample scripts and AI-generated drafts. | A syntactically valid script still needs a delivery rehearsal. |
| Non-destructive suggestions | Included | Inspect findings and make deliberate edits in the script editor. | Review does not silently rewrite the script. |
| Rehearsal pace | Included | Compare speaking pace, overall pace and section target times for finished takes. | Speaking and overall WPM include pauses differently. |
| Coverage and rereads | Optional | View matched, partly matched, not matched and outside-range text, plus logged rereads. | These are aligner findings, not confirmed mistakes; steady takes can lack alignment. |
| Filler/repetition feedback | Optional | Count recognised um, uh, erm, er and adjacent repeated-word candidates. | Explicit opt-in; recognition can omit fillers or count intentional/scripted repetition. |
| Coaching data minimisation | Included | Filler feedback saves aggregate counts without starting an extra listener. | The selected engine's local/online processing still applies. |
| Current and saved reports | Included | Open rehearsal reports from the current take summary or an earlier recording. | Reports identify the session; unavailable measurements are not invented. |
| Performance grading | Not included | Feedback assists the speaker's own judgement. | No emotion, confidence, acting-quality or universal delivery score is claimed. |

## 16 · AI assistance and local automation

Reference: [Working with AI and the local API](guide/09-working-with-ai.md) and [Setting up your AI](guide/10-setting-up-your-ai.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| AI-optional workflow | Included | Write and run scripts yourself or work with a preferred external AI assistant. | No built-in cloud AI account is required for ordinary prompting. |
| AI script brief | Included | Copy documented instructions for sections, targets, cues, stops and optional control directives. | The chosen assistant generates the script; check its output before use. |
| Assistant choice | Dependent | ChatGPT, Claude, Gemini, Copilot or another assistant can prepare a compatible script. | Assistant capabilities, costs and privacy terms are external. |
| Local control API | Optional | Enable token-protected local endpoints to load scripts, select slots and issue supported commands. | Off by default; intended for authorised local tools, not public web pages. |
| Live automation feedback | Included | Status and event updates expose supported state and app/control-contract versions. | Clients need to handle connection loss, permissions and unsupported capabilities. |
| Configure through an agent | Optional | An authorised local agent can change supported settings and control prompting. | General API access is separate from the restricted Stream Deck credential. |
| Recording-data access | Optional | Authorised tools can retrieve saved-session and edit-pack information for editorial work. | Data access is not equivalent to an integrated video-editing engine. |
| Agent kit | Optional | Install the local command-line/helper kit and use its documented commands and reports. | Node.js is for the optional kit; packaged Sightline does not require a separate user Node installation. |
| Dependency checks | Included | Show whether required local components are available before offering dependent operations. | A detected runtime does not establish that an AI agent has been configured or authorised. |
| External AI edit assistance | Dependent | An editing agent can interpret takes, keeper choices, markers and timing exports. | Selecting or rendering a final edit depends on that external tool and human review. |
| Built-in generative AI/video editor | Not included | Sightline provides prompting, control and structured handover. | Script generation, synthetic narration and video rendering are external services/tools. |

## 17 · Settings, onboarding and help

Reference: [Settings](guide/07-settings.md), [Screenshot gallery](guide/settings-gallery.md) and [User guide](guide/README.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Grouped settings | Included | Top-level task groups and focused subtabs separate prompting, appearance, recording and controls. | The detailed settings guide describes the current placement of each tool. |
| Stable settings panel | Included | Consistent width/height, grouped pages and no internal settings scrolling. | The screen must still accommodate the minimum usable dialog size. |
| Named page navigation | Included | Previous/Next name their destinations and disable at the bounds; preview addition. | Page navigation is used where one settings topic needs more space. |
| Contextual explanations | Included | Small question-mark pills beside options explain purpose and consequences. | Help should be checked against the selected mode and enabled components. |
| Apply, save and cancel | Included | Review changed settings, apply them and keep or cancel the dialog changes. | Some setup operations and permissions have their own explicit controls. |
| Onboarding and components | Included | First-use setup distinguishes component installation from everyday operation. | Components remain optional where the app can run without them. |
| Restore defaults | Included | Return preferences to the shipped starting setup and re-enter onboarding. | Does not uninstall components or delete the user's scripts and recording media. |
| Settings transfer | Optional | Import/export supported settings in JSON or XML, including structured pad layouts and word lists. | Secrets and sensitive opt-ins are not a way to bypass explicit permissions. |
| Settings access | Included | Toolbar settings control and a Settings item in the hamburger menu. | The menu remains an accessible route when toolbar icons are less obvious. |
| Grouped help | Included | Tabbed shortcuts and commands; relevant help follows enabled modes/features. | Disabled OBS features do not need to display unusable recording keys. |
| Built-in user guide | Included | Illustrated guide, settings screenshots, samples and recording acceptance walkthrough. | The shared source guide is canonical; a separate GitHub wiki is not enabled. |
| Credits and attribution | Included | Product credits and attribution grouped in About. | Third-party licence notices still accompany their relevant distributions. |
| Accessibility support | Limited | Keyboard access, readable fonts, contrast themes, contextual explanations and consistent panels. | Manual screen-reader/magnification checks remain; no full accessibility-conformance claim. |

## 18 · Privacy, diagnostics and review qualifications

Reference: [Privacy and accessibility policies](POLICIES.md) and [Acceptance walkthrough](guide/14-acceptance-test.md).

| Capability | Availability | Options and behaviour | Dependencies and limits |
| --- | --- | --- | --- |
| Local-first operation | Included | Scripts, settings and logs are held locally; local speech avoids a cloud recogniser. | Deepgram, document links and chosen external AI tools have their own network behaviour. |
| No required telemetry account | Included | No Sightline sign-in is required to prompt or create local take logs. | Elgato, online recognition and AI providers can have independent accounts/telemetry. |
| Local recording information | Included | Keep script snapshots, recognised timing, take choices and optional scratch audio for handover. | These files can contain personal or confidential content; manage them as production material. |
| Diagnostic logging | Optional | Debug events and listener health/recovery help investigate failures. | More detailed command-word tracing is separate and off by default. |
| Optional word tracing | Optional | Enable recognised command-word logging to investigate actual mishearings. | May include nearby speech; only enable it for the intended diagnostic period. |
| Recording-state honesty | Included | Confirmed stopped/recording/paused states are distinct from unknown/disconnected. | UI state cannot certify that the resulting picture/audio is usable. |
| Hardware acceptance | Limited | Walkthrough covers real camera, mic, controls, clean tracks, sync and output inspection. | Local automated tests do not replace camera/mic and physical-control testing. |
| Published versus preview | Limited | This grid covers Preview 02 and companion 0.2.0 together. | Do not compare the public 1.1.0 installer as though it already includes all preview additions. |
| Reviewer comparison scope | Included | Compare prompting, control, scripting, production handover, privacy and setup effort separately. | No competitor feature, price, performance ranking or endorsement is asserted here. |

## Maintaining this grid

The Markdown tables are the source for the HTML and CSV. Rebuild both with
`node scripts/build-feature-grid.mjs` after editing a row. Check the guide and
the running build before changing a capability's availability. Keep the build
identifier above when this document is used as a review snapshot.

Reviewers should record their operating system, app/plugin versions, speech
engine, camera/microphone, recording format and tested control surfaces in
their notes. Measure recognition, latency and sync on that setup rather than
treating a feature tick as a measured result.
