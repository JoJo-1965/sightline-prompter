# Recognition investigation: quiet synthetic-speech capture

29 October 2026. This is one controlled development check, not a live
speaker-accuracy benchmark or completion of the production release gate.

## Finding

The partial transcript came from a very quiet speaker-to-microphone test.
The original TTS source was recognised through the ending. The same
microphone capture recovered every sentence after a diagnostic level boost,
without changing the model, endpoint settings, microphone or recorded master.
This isolates input level as a cause of the missed ending in this clip.

The Stream Deck plugin does not run recognition. Its recording buttons,
permissions and state feedback are separate from this check.

## Method

Windows synthetic speech was played through the workstation output and
captured by the RØDE Wireless GO II in OBS. The original source and recorded
microphone were converted to 16 kHz mono analysis copies and decoded with
Sightline's installed streaming Zipformer model and current recogniser
settings. The original 4K MOV and 48 kHz/24-bit PCM WAV were kept unchanged.
All audio and machine-specific diagnostic files remain local, outside Git.

The 27-word reference was:

> This is a Sightline audio check. A clear voice should follow these words
> at a comfortable pace. Blue, green, silver and gold. That completes this
> short test.

The original source measured about −33.0 dBFS RMS. The microphone analysis
mix measured −45.7 dBFS RMS, about 12.7 dB lower. Each separately decoded
microphone channel measured −48.7 dBFS RMS; the two channel copies were
identical. These are unweighted file levels, not LUFS or a microphone
calibration recommendation.

## Controlled results

| Input | Analysis boost | Lexical edits / 27 reference words | Final sentence present |
| --- | --- | --- | --- |
| Original TTS source | 0 dB | 3 | Yes |
| Microphone mix | 0 dB | 14 | No |
| Microphone mix | +3 dB | 9 | No |
| Microphone mix | +6 dB | 7 | No |
| Microphone mix | +9 dB | 7 | No |
| Microphone mix | +12 dB | 5 | Yes |
| Microphone mix | +15 dB | 3 | Yes |
| Left microphone channel | 0 dB | 24 | No |
| Right microphone channel | 0 dB | 24 | No |
| Left microphone channel | +18 dB | 3 | Yes |
| Right microphone channel | +18 dB | 3 | Yes |

The edit count treats a split proper name and homophones as errors. It is
not a claim that each edit changes meaning. At +15 dB, the microphone
transcript included every sentence; the remaining differences were
`Sightline` → `side line` and `check` → `cheque`. The direct source likewise
split `Sightline` and used `cheque`. The boosted copy's peak remained below
clipping, at about −12 dBFS.

Copying each audio chunk, explicitly finishing the input, and disabling
endpoint detection were tested separately. None recovered the missing
sentences at the original microphone level.

## Script following

The recognised words were replayed through the existing aligner with
sound-alike matching enabled, without changing saved synonyms. The original
source and +12/+15 dB microphone copies reached the script's final word,
`test` (index 26). The quiet original capture stopped at `pace` (index 16).
This validates that replay only; it does not establish live UI timing,
microphone processing or wake-word accuracy.

## Product implications

- Keep normal microphone settings until checking a person speaking at their
  usual distance and level. The diagnostic boost is not an instruction to
  raise a microphone by 15 dB.
- Use Sightline's room and voice sound checks when many ordinary words are
  missed. A moving meter can still represent a very quiet signal.
- Use Your words for recurring names, terminology and phonetic forms after
  checking the input level. Missing whole lines should not be taught as
  replacement words.
- Sightline's voice input requests echo cancellation and noise suppression;
  the OBS capture used here had no source processing filters. A room-based
  TTS test is therefore not equivalent to normal live voice following.
- No recognition algorithm, audio defaults, microphone settings or master
  recording samples were changed on the basis of this single clip.

Live voice checks, physical Stream Deck button checks, separate clean camera
output and the recorded picture-and-sound sync route remain outstanding.

## Command tuning and direct speech-engine checks

The command matcher previously chose the closest spelling with a score of
72% or better. This caused false matches even with optional sound-alike
matching off: `start reading` → OBS Record, `stop reading` → OBS Finish,
`show the slide` → Guide on, `next question` → Next section, and `market` →
Marker. These were tested after the selected wake word.

The branch now uses built-in phrases, unambiguous taught forms and optional
word-by-word phonetics. Recording and guide states require explicit phrases
or taught forms. Built-in meanings take precedence over conflicting taught
forms, and ambiguous forms are declined. Commands still require an ending
pause; reading a complete valid command aloud can trigger it.

The listener also expires an unused wake after four seconds, retains split
wake/section/resume prefixes until they can be classified, accepts the
five-word help phrase and handles repeated wakes. Section numbers support
spoken tens and units through 99. Ordinary reading no longer accumulates an
unbounded whole-phrase buffer. Regression tests cover all default phrases
with all four wake choices, every two-chunk partition, taught forms,
ambiguous matches, timeout, passthrough and negative phrases.

For a separate acoustic check, Windows Microsoft Hazel generated 37 silent
WAV fixtures: 21 Prompter commands, four commands for each other wake choice,
and four negative phrases. Files were converted to 16 kHz mono in memory,
fed in 100 ms blocks through the installed Zipformer model with the app's
settings and one-word holdback, then passed to the command listener. Only
test callbacks ran; no microphone, speakers, live app or OBS command was used.

| Delivery | Intended commands recognised | Negative phrases declined |
| --- | --- | --- |
| Synthetic voice, wake and command run together | 4 / 33 | 4 / 4 |
| Same voice with a 200 ms beat, before split-Teleprompter fix | 29 / 33 | 4 / 4 |
| Same 200 ms beat, with split-Teleprompter fix | 33 / 33 | 4 / 4 |

The main improvement in this synthetic test came from separating the wake
word from the command. The engine consistently wrote `TELE PROMPTER` with
the beat; that observed spelling now works for the Teleprompter choice.
It also wrote `PAUS`, `MARKA`, `REZINC` and `CANSEL`, handled by explicit
aliases or optional phonetics. Broad mishearings such as `PRONE TO` were
deliberately not added as default wake phrases.

These are synthetic file checks, not an accuracy percentage for Joanne's
voice. A normal speaking-distance check remains necessary before release.
No microphone settings, model configuration or saved synonyms were changed.
