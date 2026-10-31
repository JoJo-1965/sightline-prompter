# Sightline audience and messaging reference

Reviewed 31 October 2026 for Sightline 1.1.0 and Stream Deck 0.2.0.
The plugin installer is available with the app release; its source stays private.
Marketplace listing is pending. This is the editorial source for the
[one-pager](ONE-PAGER.md), [channel copy](COPY.md) and JL product page.

## Positioning

**The teleprompter that works with your AI.**

A traditional teleprompter, built for your workflow: free, open source and
see-through, with voice control and voice following or steady scrolling.
Use your favourite AI to prepare scripts and, through an authorised local
agent, configure and control Sightline. Optional scripting directives steer
sections, stops, beats and other operations. Phone, floating pad and optional
OBS/Stream Deck controls fit the recording setup you choose. Take information
supports the handover to an external editor. For speakers, content creators
and learning teams recording to camera. **Your words. Your pace.** is the
delivery benefit. **AI is optional** is reassurance, not the lead message.

**By a speaker, for speakers. By a content creator, for content creators.**
Joanne's experience explains the design choices. It is not a claim of customer
endorsement or proof that every speaker needs this workflow.

## Ideal users and the job they need done

| Priority | Audience | Situation and need | Message and first useful action |
| --- | --- | --- | --- |
| Primary | Professional speakers, trainers and coaches recording themselves | Wants words near the lens and room to pause or retake, with slides/call visible | Keep your words in sight at your own pace. Open a sample and try voice or steady scrolling |
| Primary | Solo content creators making camera-led videos | Works alone; reaching for a mouse disrupts delivery and identifying takes adds editing work | Control the take by voice or phone; mark keepers for the edit |
| Primary | Course authors and small L&D production teams | Records modular e-learning with sections, cues and retakes; needs a clear handover to an editor | Keep scripts, take choices and timing evidence together. Trial two modules and inspect the edit pack |
| Secondary | Operators, editors and OBS/Stream Deck users supporting those creators | Needs independent controls and recording references | Use the control window, shared pad/phone and optional OBS/plugin tools after basic prompting works |
| Not the lead audience | Users seeking an autonomous video editor, AI presenter or broadcast automation suite | Expects rendered video, automatic face tracking or universal conferencing control | Explain the product boundary before inviting installation |

These are product-fit hypotheses grounded in Joanne's stated workflow and the
implemented features. They have not been validated by customer interviews,
conversion data or comparative market research. Test them with early users;
do not describe them as demonstrated demand.

## Message hierarchy

1. **A familiar teleprompter that works with your AI:** prepare structured
   scripts, configure and control it through an authorised local agent, and
   hand over a machine-readable edit pack. This is
   the lead differentiator, even though none of these steps is compulsory.
2. **Deliver naturally:** see-through text near the camera, with your slides or
   call behind it. Choose voice following or steady scrolling.
3. **Keep control while presenting:** voice commands, phone/pad and optional
   Stream Deck. Listening preferences and feature permissions remain explicit.
4. **Keep useful evidence for the edit:** section/take references, markers,
   keeper choices and recognition-derived alignment estimates.
5. **Build the workflow you need:** optional local AI/API, OBS tools and manual
   guide. Basic prompting does not require those integrations.
6. **Free and open:** MIT licence, no Sightline account/subscription. Local
   speech works offline after downloading its model. Optional services have
   their own accounts, connectivity and terms.

## Differentiators and evidence

Treat these as the product's useful combination, not proven exclusive USPs.
No competitor comparison establishes that Sightline is the only or best option.

| Differentiator | User benefit | Evidence and qualification |
| --- | --- | --- |
| AI-assisted workflow across authoring, operation and handover | Connect an existing assistant to the recording process rather than copy only plain script text | [AI script prompt](../AI-SCRIPT-BRIEF.md), [agent setup](../guide/10-setting-up-your-ai.md) and [edit pack](../EDIT-PACK.md). External AI/editor and explicit local permissions are required for agent use; not a built-in generative editor |
| See-through prompting plus pacing choices | Keep the camera, slides and delivery in one view | Core overlay and scrolling; see [display](../guide/04-layout-and-display.md). Overlay heritage is credited to David Neal |
| Human-readable script directions | Plan sections, holds, beats and edit markers in the script | [Script specification](../SCRIPT-DIRECTIVES.md); timed pauses count down only in steady mode; voice mode treats them as visible beats; stops still hold |
| Prompting-to-edit handover | Give an editor take choices and context rather than just a video file | [Edit pack](../EDIT-PACK.md); timing is estimated, not guaranteed frame-accurate; an external editor makes the cut |
| One configurable pad/phone vocabulary | Keep useful controls within reach without separate layouts | [Controls guide](../guide/06-remotes-and-screens.md); shared customisation/new fitting panels are in 1.1.0 |
| Optional OBS and framing workflow | Coordinate recording and manual references while retaining normal prompting | [OBS](../guide/11-obs.md), [handover](../guide/12-production-handover.md); physical routes need setup-specific checks; guide capture exclusion depends on the route |
| Local recognition and optional AI | Use your own script or assistant, with clear data choices | [AI guide](../guide/09-working-with-ai.md), [privacy](../PRIVACY.md); Deepgram sends audio online if selected |

## Claims to use and avoid

| Use | Avoid |
| --- | --- |
| Follows your voice; recognition can need tuning or recovery | Never misses a word; flawless recognition |
| Take/section references and estimated word alignment | Exact word times, guaranteed lip sync or frame-accurate automatic cuts |
| Optional scratch microphone recording for sync | Sightline records no audio |
| Production video comes from OBS or your usual recorder | Sightline records or edits your finished video |
| External AI can prepare scripts or interpret the edit pack | Built-in generative AI writes your script or edits the video |
| Script health/rehearsal review uses local checks and estimates | The coach is an AI judge or detects every delivery problem |
| Separate manual Ideal/Actual framing reference | Automatic face detection or head tracking |
| Capture protection depends on platform and capture method; verify a recording | Guaranteed invisible in every recording or screen share |
| Plugin installer is available with the app release; source private, Marketplace pending | Install it from Marketplace now; a made-up listing link |
| App targets Windows, macOS and Linux | This build has passed physical Mac/VoiceOver acceptance |
| OBS is optional and has dedicated permissions | Sightline automatically controls Teams, Zoom or Riverside recording |

## Voice, attribution and calls to action

Use Joanne's warm, direct British English. Lead with a concrete recording need,
then show the feature that helps. Avoid unexplained production/API jargon in
the opening. Keep short blocks balanced and longer prose pretty-wrapped.

Primary CTA: **Download the public release** at
<https://github.com/JoJo-1965/sightline-prompter/releases/latest>.
Secondary: read the guide or try a sample. Earlier acceptance material is
historical; current download links identify 1.1.0/0.2.0. Voluntary support is
tertiary, with no paid perks.

Attribution: **Adapted and enhanced by Joanne Lockwood from SEE Change Happen
Ltd, based on Electron Teleprompter by David Neal.** Credit Claude Code for
Joanne's build collaboration without presenting it as a vendor endorsement.

## Learn from the first users

Ask which audience they belong to, what they recorded, which pacing/control
mode helped and where they got stuck. Review install-to-first-take success,
voice reliability and edit-pack usefulness before widening the promise.
GitHub download counts are asset requests, not unique people or active users.
Do not add tracking to the app to support marketing claims.
