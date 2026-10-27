# Sightline Prompter roadmap

What's planned and in which order. Every item below was approved by Joanne
on 27 October 2026, apart from the one on hold. This list changes as we learn from
recording sessions. The [change log in the README](readme.md#change-log)
records what has shipped.

Each item has a rough size: **S** takes about a day, **M** a few days, **L**
a week or more.

## 1.0: first public release

Make what exists today available to everyone.

| Item                                                                                                | Size | Notes                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installers for Windows (`.exe`), Mac (`.dmg`, Intel and Apple Silicon) and Linux (AppImage)         | M    | Built by GitHub Actions and attached to GitHub Releases. Not code-signed at first, so the README gives first-run steps for Windows SmartScreen and Mac Gatekeeper |
| Public GitHub repo `JoJo-1965/sightline-prompter`, forked from `reverentgeek/electron-teleprompter` | S    | Check the profile first: bio, website, profile README, commit email privacy, two-factor login                                                                     |
| README with screenshots, a download section and topics (`teleprompter`, `electron`, `voice-scroll`) | S    |                                                                                                                                                                   |
| Sightline page on joannelockwood.co.uk, linked from the sites that already cross-link               | S    |                                                                                                                                                                   |
| A note to David Neal, offering focused pull requests                                                | S    | Joanne approves the draft before it's sent                                                                                                                        |

## 1.1: next release (recommended)

The features that make the biggest difference when recording to camera.

| #   | Item                                                                                                                                                                                            | Size | Why it's here                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------ |
| 1   | **Control window and monitor choice.** Choose which monitor the prompter uses (full screen, mirrored if needed) and control it from a separate operator window with a live preview and progress | L    | Professional prompters work this way, and it suits beam-splitter and second-monitor setups |
| 2   | **Hidden from screen sharing and recording.** The prompter window doesn't show in Zoom, Teams, Riverside or screen recordings                                                                   | S    | The script never leaks into a recording or a shared screen                                 |
| 3   | **Phone remote.** Start, pause, change speed and jump sections from your phone over Wi-Fi                                                                                                       | M    | Hands-free on camera. Builds on the existing local API, with pairing by QR code            |
| 4   | **Text outline or shadow.** Keeps see-through text readable over busy slides and video                                                                                                          | S    | Makes the see-through mode reliable to read                                                |
| 5   | **Focus band.** Dims the lines away from the reading line                                                                                                                                       | S    | Keeps your eye on the current line                                                         |
| 6   | **Script directives and cue pause.** `{curly braces}` in a script are instructions to the app and are hidden while reading. `[square brackets]` stay as notes to the speaker. This adds script settings (`pacing`, `wpm`, `target`), section targets and inline `{pause}`, `{pause: 3s}` and `{marker}`. Scrolling stops at each `{pause}` until you press Space or the remote. See [docs/SCRIPT-DIRECTIVES.md](docs/SCRIPT-DIRECTIVES.md) | M    | Joanne's request; syntax agreed on 27 October 2026. The pacing items 8 to 11 read their targets from these directives. It also includes: in-app help for directives (Help panel and editor), a script checker (`Check script` in the editor, plus a command-line check AI pipelines can run), and the AI authoring kit (docs/AI-SCRIPT-BRIEF.md, docs/script-directives.json, llms.txt) kept in step with the app |
| 7   | **Click-through mode.** Mouse clicks pass through the script to the window behind it (Riverside, slides)                                                                                        | S    | Operate other apps without moving the prompter                                             |

## 1.2: rehearsal and pacing

| #   | Item                                                                                             | Size | Notes                                       |
| --- | ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------- |
| 8   | **Pacing indicator, with two modes.** **Section mode** (for batch and modular recording with pause points; the default): the timer restarts at each section and stops while scrolling is paused, each section can have its own target time or words per minute, and the indicator shows that section's target against your actual rate, with an on-track / ahead / behind light (green, amber or red, always with words). A short per-section log after each take shows how each section went. **Whole-session mode** (for one continuous recording): elapsed time against the script's target time, overall on/off track, and target against actual words per minute. The mode can be set per slot, so a batch script and a single-take script each remember their own | M    | Joanne's request (27 October 2026): per-section pace matters most for batch and modular work; overall time matters most for single sessions. Actual rate comes from voice recognition in voice mode, and from progress over time in steady mode |
| 9   | **Talking-points mode, for speaking off script.** Each section is shown on its own as large bullet points, with no scrolling, so you can talk freely. Move to the next section with the arrow keys, clicker or phone remote. A section timer shows the time spent against the section's target with the on-track light, plus overall time and the sections still to come. Set it with `{mode: points}` in the script, or per slot. Section targets use the same `{target: m:ss}` directive | M    | Joanne's request (27 October 2026): for themed talks where she speaks around bullet points rather than reading. Reuses the section timers from item 8 |
| 10  | **Finish by a target time.** Set a section or script length; the speed adjusts to match, and the pacing indicator shows the target | M    | Uses the same target times as the pacing indicator |
| 11  | **Rehearsal timer.** Times each section during a practice run, then offers those times as targets and suggests your words per minute | M    | Uses the section markers that already exist |
| 12  | **Markers.** Drop a bookmark during a take with one key, and jump back to it                     | S    | Useful for retakes                          |
| 13  | **Highlight the word you're saying** in voice mode                                               | M    | An eye anchor while reading                 |
| 14  | **On-air light and start beep** when the countdown ends                                          | S    | A clear "you're live" cue                   |
| 15  | **Free on-device speech recognition as the default for voice scrolling.** Runs on the computer (Moonshine via sherpa-onnx, with Vosk for older machines), so it needs no account or key, works offline and keeps audio private. Cloud services (Deepgram, plus AssemblyAI and Speechmatics) stay available as options, each using the person's own key, through one shared connection point | L    | Joanne's request (27 October 2026): on-device by default **if it works**. Step 1 is a side-by-side test against Deepgram with Joanne's RØDE mic and real scripts. If on-device can't keep up, Deepgram stays the default and on-device becomes an option |

## 1.3: comfort and accessibility

| #   | Item                                                                                                   | Size | Notes                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------- |
| 16  | **Colour themes,** for example yellow on black and high contrast, plus a dyslexia-friendly font option | S    | Saved per slot                                                                          |
| 17  | **Foot pedals and game controllers** for hands-free scrolling                                          | S    | USB pedals that act as keyboards already work; this adds mapping and controller support |
| 18  | **Right-to-left scripts** (Arabic, Hebrew)                                                             | S    | Text direction setting and RTL-aware alignment                                          |
| 19  | **Open PDFs and Google Docs links** directly                                                           | M    | PDF text extraction; Google Docs via its export link                                    |

## Later

| Item                                      | Notes                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Automatic updates                         | Once installers are established                                                                             |
| Code signing for Windows and Mac          | Removes the first-run warnings; needs a certificate and an Apple Developer account                          |
| Short-lived Deepgram tokens and key terms (applies to the Deepgram option in item 14) | More secure voice scrolling, with better recognition of names and jargon. Approved (27 October 2026) |

## On hold

| Item                                   | Notes                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Start Riverside recording from the app | On hold at Joanne's request (27 October 2026). Depends on what Riverside's tools allow |
