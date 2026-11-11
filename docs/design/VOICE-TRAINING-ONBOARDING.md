# Voice and command training during onboarding

**Status: planned, requested 11 November 2026. Not implemented in RC8.**
This is an internal setup function within onboarding, rather than a normal
production-script mode or a separate application. Offer it when speech is
enabled during first use; make the same workflow rerunnable from Voice
settings. Exact placement and appearance need a mock within the approved
Settings design before implementation. No release date is committed.

## Purpose

Train the operator in the commands and train Sightline to recognise the
operator's natural speech. Support different accents, pronunciation and
disability-related speech differences without requiring a standard accent
or treating the person's pronunciation as wrong. These are design aims;
recognition reliability needs testing with the people the workflow serves.

Build on the existing **Your words**, command aliases, wake-word choices,
Teach function and heard-log comparison. Keep one source of saved corrections,
shared with ordinary prompting, rather than a second training dictionary.
Initially, learning can mean reviewed vocabulary/phrase corrections and
recogniser configuration. It must not be described as acoustic-model
retraining unless that separate capability is implemented and validated.

## Guided setup loop

1. **Prepare:** select and check the intended microphone. Explain what is
   being learnt, and let the person choose comfortable words or phrases.
2. **Prompt:** display one short example and its purpose. Offer an optional
   spoken prompt; do not count that playback as the operator's response.
3. **Listen:** capture a fresh utterance with a visible acknowledgement and
   an adjustable response window. Accommodate slower or interrupted speech.
4. **Compare:** show what was requested, what was heard and the interpreted
   word or action. Separate no audio, an incomplete phrase, a mishearing,
   an expired command window and a permission problem.
5. **Fix:** propose a local word/phrase correction or recognition adjustment.
   Show its intended meaning and any ambiguity; the operator confirms it.
6. **Repeat:** try fresh utterances until the item is recognised consistently.
   A failed attempt resets that item's success streak and returns to the
   comparison/fix loop. Do not count interim and final transcripts from one
   utterance as separate successes.
7. **Verify and save:** test the correction on a fresh attempt and in a short
   mixed exercise, then save accepted changes and show what was learnt.

An initial consistency target could be **three consecutive correct fresh
utterances**, followed by a mixed exercise. This is a proposed acceptance
rule, not a shipped threshold. For commands, success means the intended
canonical action within the person's configured timing window; matching a
raw spelling alone is insufficient. For script vocabulary, check the word
or phrase in context. Recheck previous items to avoid overfitting one phrase.

Keep iterating until consistent, or until the operator chooses Repeat later,
Skip or Cancel. Repeated difficulty should offer a microphone check, another
wake word, a more comfortable equivalent phrase or button control. It must
not trap the person in an endless or mandatory exercise. A skipped item is
unverified, not a pass; partial progress can be resumed.

## Internal training script and proposed directives

A dedicated bundled training script drives the setup. Operators see clear
prompts and controls, not directive syntax. The script is a maintained setup
resource, not loaded into or substituted for a personal production slot.

The following is **illustrative proposed syntax only**. `{training}` is not
part of the current supported directive grammar and must not be added to
the live samples, checker or authoring instructions as a working feature.

```text
{training: start}
{training: prompt, say: "Prompter, practice", expect: "go"}
{training: listen}
{training: compare}
{training: fix}
{training: repeat-until-consistent}

{training: prompt, say: "Prompter, start recording", expect: "obs-record"}
{training: listen}
{training: compare}
{training: fix}
{training: repeat-until-consistent}
{training: review-and-save}
{training: end}
```

Resolve exact field names and state transitions during design. The script
needs cases for the wake word, practice/go, record/start recording, pause,
finish recording, section navigation, and personal script words or phrases.
Each item identifies whether a correction belongs to a script word, command
or wake word. Ambiguous mappings must be reviewed rather than guessed.

## Behaviour and accessibility

- Training intercepts command actions: saying record, pause or finish reports
  the simulated result without operating OBS, changing scenes or running a
  production script. Existing recording and device settings remain intact.
- Show progress and feedback in the setup window, with the same prominent
  acknowledgement used elsewhere. Allow keyboard/controller alternatives and
  an accessible exit; a voice command cannot be the only way out of training.
- Offer adjustable timing, repeated prompts, readable text and contrast, and
  optional spoken guidance. Avoid speed pressure and compulsory retries.
- Store approved corrections locally with their microphone/setup context and
  offer review, removal and reset. Raw training audio is not kept by default.
  Do not silently change global command meanings or recording permissions.
- After a microphone/setup change, offer a short recheck rather than discarding
  working corrections. Review training settings separately from reading themes.

## Acceptance before release

- Correct recognition over fresh repetitions and a mixed follow-up exercise,
  including the accents and speech differences the workflow aims to support.
- No action on ordinary, negated or ambiguous speech; include product-name
  mentions and the observed record-take mishearings from the November UAT.
- A failed attempt returns to compare/fix; skip, resume and cancel preserve
  useful progress without marking unverified items as successful.
- No real recorder actions, microphone permission escalation, overwritten
  scripts or automatic acceptance of suggested aliases during setup.
- Confirmed corrections persist and work in ordinary prompting after restart.
- Review actual setup screens, accessible controls, onboarding/help, internal
  training script, directive spec/checker, feature grid and JL copy together
  when implemented. Keep this proposal distinct from the current RC package.
