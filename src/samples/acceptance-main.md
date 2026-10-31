{pacing: section, wpm: 140}

# Sightline acceptance · module A

[OPTIONAL REVIEW. In the next candidate, use Script health in the editor before reading. After recording, use Rehearsal in the review panel. Filler counts need a separate opt-in under Settings > Recording > Takes. These review tools are not in RC14.]

[OPTIONAL SETUP CHECK. In the next candidate, Components has named subtabs for the speech model, AI kit, Node.js, OBS and Stream Deck. Debug is top-level; OBS connection/recording/setup are under Recording. Open Help > Getting started, then Tools > Session check. Each checklist link should open its existing tool or setting; Refresh should show the latest status. Finding an installed app does not confirm its connection. Do not apply the optional OBS setup assistant to a production configuration without reviewing its plan.]

[SETUP FIRST. Read the Release-candidate acceptance test in Help > User Guide before recording. Use the OBS profile in Stream Deck, voice scrolling and your normal camera and microphone positions. Leave the prompter paused until you are ready.]

[Check OBS is connected and recording controls are allowed. Prepare the recorded slate, choose Flash and beep, and enable scratch audio. The script does not enable these settings for you.]

[A00. Before recording, choose Check compatibility in Settings > Controls > Stream Deck. Confirm Sightline RC14 and plugin 0.1.9 are reported as compatible. In Stream Deck, open a key's settings and check its connection result.]

[A00b. Before recording, open Settings from Files. Move its window by the native title bar, onto another screen if available. Close and reopen: it should remember its position. Change a draft setting and try closing: Keep editing must retain it; Apply must save without closing. F1 Help should also move independently and keep a stable frame across tabs. Mirror the prompter: Settings and Help must stay upright. Tools opens below its button; Edit beside it opens read-only sample source with Save a copy. In a spare slot try Clear, then Cancel: the sample must remain. Return here.]

[A00c. Before recording, check the phone QR appears under Controls > Phone after Apply. Mirroring belongs only under Appearance > Screens. Say "Prompter, what can I say?", drag its window aside and close it with "Prompter, close". Turn Hide from capture off if you need screenshots of Settings or either help window.]

[Use the Stream Deck Record take key to begin. Wait for confirmation and the slate. For the room check stay quiet; for the voice check read the card. After each result use Play / Pause to carry on.]

[Throughout this test, Next section changes your place. If the prompter is still held afterwards, press Play / Pause once to begin reading that section. OBS must keep recording.]

{soundcheck: room}

{soundcheck: voice}

## Section 1 · Camera and microphone reference {target: 0:30}

[A01. Make three visible claps, about two seconds apart, with your hands in the camera picture. Keep the microphone in its usual position. These claps measure camera and microphone sync; the digital slate is a separate reference.]

This is the Sightline acceptance recording, module A. I am using my usual
camera and microphone, and speaking at my normal level.

[smile]

Peter packed a purple paper bag. My lips should match these words in the
recording. I would like a black decaf and a blueberry muffin, please.

[A02. At the stop, wait five seconds. Sightline should hold while the OBS timer keeps moving. Use Stream Deck Next section to continue. Use Finish recording only at the end of module B.]

I will stop here while OBS keeps recording. {stop}

## Section 2 · Voice, directions and help {target: 0:30}

[A03. Read only the ordinary text. Take the delivery directions silently.]

I can smile, think and gesture without reading the instructions aloud.
[smile] [think] [shrug] [point]
The prompter should follow my spoken words and ignore those delivery notes.

I am taking my own three-second beat here. {pause: 3s}

Now I am reading again. In voice mode there should be no forced countdown
holding me after I start speaking.

[A04. Say: "Prompter, pause". Wait for it to hold, then say: "Prompter, go". Leave a brief beat after the wake word and finish the command within four seconds. If a command fails, use Stream Deck Play / Pause and tell us which phrase failed.]

My voice has brought me back to this sentence, and OBS is still recording.

[A05. At the stop say: "Prompter, what can I say". Check the grouped list, then say: "Prompter, cancel". The list should close. Next section on Stream Deck carries on.]

That completes the voice and help check. {stop}

## Section 3 · Retake and named marker {target: 0:30}

[A06. Read this section twice. After the first pass press Scrap on Stream Deck, then say: "Prompter, again". This should return to this section without stopping OBS. Resume with Play / Pause if it waits.]

This is my retake check. I can try the same section again without creating
a new OBS recording. Sightline should keep both attempts in the take log.

{marker: Muffin pickup}

The useful sentence begins here. A blueberry muffin is an excellent reason
to take a short break. My delivery can change while the script stays the same.

[A07. On the second pass only, say: "Prompter, back to the marker". Resume if needed and repeat from The useful sentence begins here. Do this once. At the final stop press Keeper, then Next section. The first pass is scrap; the second is keeper.]

That is the end of this attempt. {stop}

## Section 4 · Head guide and framing reference {target: 0:30}

[A08. Say: "Prompter, guide on". Reveal the guide controls with Ctrl+Shift+H if needed. In Adjust, keep your saved Ideal outline. Move Actual right, then down, and make it slightly larger with the plus button. Only the solid outline should move; the dashed Ideal should stay fixed.]

My guide is a manual framing reference. The ideal shape shows my preferred
position, and the actual shape records the comparison I have set by hand.

[A09. Open Guide adjustments on the prompter. Set eye centre and level first, then Lock eye position. Fit Top and Bottom, then Left and Right independently: both eye marks and the other edges must stay fixed. Try Background at 0% and 25%: the preview dims without fading the outlines. Save as ideal only if you want this new reference. Use the fullscreen key or Ctrl+Alt+H, then try Clean and Lock. Toggle Guide adjustments from the prompter and Tools without leaving fullscreen or unlocking the guide. Done hides only adjustments. Unlock the eyes to move Actual again. Check the projector stack and leave a small Actual adjustment for the module-change check.]

I can still see my preview and read the words. The guide should stay out
of both the composed camera recording and the separate clean camera file.

[Say: "Prompter, guide off", then "Prompter, guide on". Confirm each explicit command. At the stop use Next section.]

I will check the recorded picture afterwards. {stop}

## Section 5 · Going off script {target: 0:30}

I am about to leave the script for a short demonstration. OBS and scratch
audio should continue recording, although speech tracking will stop listening.

[A10. At the off-script hold, talk for about ten seconds about your morning. Voice commands are deliberately unavailable here. Use Stream Deck Play / Pause to return to the script.]

Here comes the off-script part. {listen: off}

[Ad-lib for ten seconds. Use the physical Play / Pause key when you are ready.]

{listen: on}

I am back on script. These words should be followed normally again.
The off-script interval should be kept in the edit information, with the
recording continuing underneath it.

[At the stop use Next section.]

That completes the off-script check. {stop}

## Section 6 · Controls and module handover {target: 0:30}

[A11. Toggle On air off and on using Stream Deck. The backing should use your saved levels and OBS should keep recording. Try Bigger text once, then Smaller text once. Leave voice mode selected.]

This is the end of module A. I have checked the reading controls without
changing the OBS recording. The next script should keep the same camera file,
the same recording clock and my session guide settings.

[A12. At the stop select Script slot 2 on Stream Deck. On smaller profiles use Sightline's slot 2 button. Do not press Finish recording. Module B gives the final instructions.]

I am handing over to the second module now. {stop}
