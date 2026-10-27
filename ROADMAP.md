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
| 6   | **Cue pause.** Scrolling stops at each `[pause]` direction until you press Space or the remote                                                                                                  | S    | Natural beats without losing your place                                                    |
| 7   | **Click-through mode.** Mouse clicks pass through the script to the window behind it (Riverside, slides)                                                                                        | S    | Operate other apps without moving the prompter                                             |

## 1.2: rehearsal and pacing

| #   | Item                                                                                             | Size | Notes                                       |
| --- | ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------- |
| 8   | **Rehearsal timer.** Times each section during a practice run and suggests your words per minute | M    | Uses the section markers that already exist |
| 9   | **Finish by a target time.** Set a section or script length; the speed adjusts to match          | M    | Pairs well with the rehearsal timer         |
| 10  | **Markers.** Drop a bookmark during a take with one key, and jump back to it                     | S    | Useful for retakes                          |
| 11  | **Highlight the word you're saying** in voice mode                                               | M    | An eye anchor while reading                 |
| 12  | **On-air light and start beep** when the countdown ends                                          | S    | A clear "you're live" cue                   |

## 1.3: comfort and accessibility

| #   | Item                                                                                                   | Size | Notes                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------- |
| 13  | **Colour themes,** for example yellow on black and high contrast, plus a dyslexia-friendly font option | S    | Saved per slot                                                                          |
| 14  | **Foot pedals and game controllers** for hands-free scrolling                                          | S    | USB pedals that act as keyboards already work; this adds mapping and controller support |
| 15  | **Right-to-left scripts** (Arabic, Hebrew)                                                             | S    | Text direction setting and RTL-aware alignment                                          |
| 16  | **Open PDFs and Google Docs links** directly                                                           | M    | PDF text extraction; Google Docs via its export link                                    |

## Later

| Item                                      | Notes                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Automatic updates                         | Once installers are established                                                                             |
| Code signing for Windows and Mac          | Removes the first-run warnings; needs a certificate and an Apple Developer account                          |
| Short-lived Deepgram tokens and key terms | More secure voice scrolling, with better recognition of names and jargon. Approved (27 October 2026) |

## On hold

| Item                                   | Notes                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Start Riverside recording from the app | On hold at Joanne's request (27 October 2026). Depends on what Riverside's tools allow |
