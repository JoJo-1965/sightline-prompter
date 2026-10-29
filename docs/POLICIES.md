# Privacy, licence and policies

Sightline Prompter is free, open-source software by Joanne Lockwood, SEE Change
Happen Ltd. Full terms of use, privacy, accessibility and data protection
policies are being written. Until then, this page says plainly what Sightline
does with your microphone and your data, and on what terms you use it.

## What Sightline does with your microphone

- **It never records your video or your voice for the recording.** Keep
  recording with OBS, Riverside, Zoom, your camera or your phone.
- **Voice scrolling and voice commands listen on your own computer.** The
  speech recognition runs on your PC: what you say isn't recorded, kept or
  sent anywhere. Only the words it recognised are noted, in the heard log
  (see below), to help it learn the words it mishears.
- **You can always see when the microphone is on.** While it follows your
  voice, the prompter says **Listening**; while it only listens for the wake
  word, a **🎙 Listening for “Prompter”** label shows, and the control window
  shows the same.
- **Choose when it listens** in Settings > Voice > Voice commands: in voice
  mode, always (even when stopped), or off.
- **Deepgram, only if you choose it.** If you pick Deepgram for speech
  recognition and add your own key, your audio goes to Deepgram while voice
  scrolling runs, under Deepgram's terms. It's off unless you choose it.
- **Scratch audio, only if you turn it on** (Settings > Scrolling): a plain
  recording of your microphone while the prompter runs, kept on your computer
  beside the take log, to line your real recording up with it.
- **The sound check** measures the level and background noise; it keeps the
  figures, not the sound.

## What Sightline keeps, and where

Everything stays on your computer, in Sightline's folder (`%APPDATA%\Sightline
Prompter` on Windows, `~/Library/Application Support/Sightline Prompter` on a
Mac, `~/.config/Sightline Prompter` on Linux):

- your settings and your nine script slots;
- take logs (timings, ratings, markers, the words you said and when, loudness
  and sound checks) and anything you export from them;
- heard logs (the words voice scrolling recognised, as text);
- scratch audio, if you turned it on;
- the speech model.

Uninstalling leaves them in case you reinstall; delete the folder to remove
them. Sightline has no accounts, no analytics and no tracking.

## When Sightline goes online

- **Checking for updates** asks GitHub for the latest version (Settings >
  About; it can be turned off). Nothing downloads by itself.
- **The speech model** is downloaded once, when you ask for it.
- **Google Docs links** you open are fetched from Google.
- **Deepgram**, only if you choose it (above).
- **The phone remote** works over your own Wi-Fi, and **the local API** for
  AI agents and the Stream Deck only on your own computer (127.0.0.1); both
  are off unless you turn them on.
- **The tip jar** opens Stripe's or Ko-fi's page in your browser; Sightline
  never sees your payment details.

## Licence and warranty

Sightline is released under the [MIT licence](../LICENSE): you may use, copy,
change and share it, including commercially. It's based on Electron
Teleprompter by David Neal, also MIT. As the licence says, it comes **as is,
without warranty of any kind**: check it suits your use, and keep your own
copies of anything important.

## Questions

Open an issue on
[GitHub](https://github.com/JoJo-1965/sightline-prompter/issues), or contact
Joanne through [joannelockwood.co.uk](https://joannelockwood.co.uk).
