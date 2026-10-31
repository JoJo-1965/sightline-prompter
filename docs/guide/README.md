# Sightline Prompter user guide

Sightline Prompter is a see-through teleprompter for speakers, content creators
and learning teams recording to camera. Choose voice following or a steady
pace, keep your words near the lens and collect take information for the edit.
It is voice controlled too. Your favourite AI can prepare scripts and, through
an authorised local agent, configure and control it. Optional script directions
steer its operation. AI remains optional. See
[Working with AI](09-working-with-ai.md).

The script floats over your screen, close to the webcam, and scrolls at a
steady pace or follows your voice.

**Current release: Sightline 1.1.0 + Stream Deck 0.2.0.** This guide covers
OBS recording, the manual head guide, shared controls and regrouped Settings.
[Download the app and plugin](https://github.com/JoJo-1965/sightline-prompter/releases/tag/v1.1.0).
The plugin source remains private; Marketplace listing is pending. Test your
own recording route using the workflow walkthrough. Earlier
**1.0.7-rc.1–rc.14** names below are test history; no public 1.0.7 release was made.
RC1 established the feature baseline; RC2 refreshes the bundled documentation
and adds the reusable acceptance samples. RC3 adds compatibility reporting in
Sightline and the plugin. These are local test builds, not public releases.
RC9 adds optional offline release notes and Getting Started reading at the end
of Windows installation, independently of opening the app.
RC10 fixes the phone QR in Settings, moves mirroring to Screens and makes
voice help movable. Helper windows now follow Hide from capture.

![The prompter with the control bar, mid-take](images/running.png)

## Contents

1. [Getting started](01-getting-started.md): installing it (and getting past the security warnings), the control bar, opening a script, your first take
2. [Writing scripts](02-scripts.md): file types, sections, notes to yourself and instructions to the app
3. [Scrolling and voice](03-scrolling-and-voice.md): steady pace, voice scrolling, the sentence highlight
4. [Layout and display](04-layout-and-display.md): text size, backing, the reading line, mirroring, reading aids
5. [Recording a take](05-recording-a-take.md): the pacing light, take summary, markers, talking points
6. [Remotes and second screens](06-remotes-and-screens.md): the pad, control window, phone remote, prompter monitor
7. [Settings](07-settings.md): every tab explained
8. [Shortcuts and troubleshooting](08-shortcuts-and-troubleshooting.md)
9. [Working with AI](09-working-with-ai.md): AI-written scripts, letting an AI run the prompter, the take log and edit pack, and what's coming next
10. [Setting up your AI](10-setting-up-your-ai.md): Claude Code, Codex, ChatGPT, Claude or Gemini, and the AI and remote control settings
11. [Recording with OBS](11-obs.md): optional connection, recording controls, chapters and file references (development branch)
12. [Production handover](12-production-handover.md): setup, framing, a short test, retakes, keeper choices and the files to hand over (development branch)
13. [Settings screenshot gallery](settings-gallery.md): all seven groups, named component subtabs and contextual help (development branch)
14. [Release-candidate acceptance test](14-acceptance-test.md): the matching builds, two sample scripts, physical checks and the evidence to keep
15. [OBS setup assistant](15-obs-setup.md): review a separate profile/scenes plan, preserve existing setups and verify 4K, clean audio and sync

Inside the app, open this guide from **Help > User Guide** or the **?** menu.
**F1** shows the keyboard shortcuts.

[Privacy, terms, accessibility and voluntary support](../POLICIES.md)
explain the microphone and local files, online services, your rights and
Joanne's tip jar. The same policies are linked from **Settings > About**.
