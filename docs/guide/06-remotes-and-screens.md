# Remotes and second screens

## Presenter clickers and foot pedals

Most clickers and pedals send Page Down and Page Up. **Page Down** starts and
pauses, and **Page Up** goes back a section. Pedals that send the arrow keys
work too: → and ← move between sections.

## Game controllers

Plug in or pair a game controller (Xbox, PlayStation or similar) and it works
straight away:

| Button | What it does |
| --- | --- |
| **A** (✕ on PlayStation) | Start and pause, or carry on from a stop |
| **B** (○) | Drop a marker |
| **X** (□) | Jump to the next marker |
| D-pad up and down | Faster and slower, while scrolling |
| D-pad left and right | Previous and next section |

The buttons can't be changed yet; choosing your own is on the roadmap.

## Stream Deck

The **Sightline Prompter plugin for Stream Deck** runs the prompter from an
Elgato Stream Deck's keys, the Stream Deck + dials and the Stream Deck Pedal,
and the keys show what the prompter is doing: ▶ or ❚❚, On air in red, the
script slot that's open, the section and the time left.

**Getting it:** the plugin is coming to the Elgato Marketplace, where you'll
find it by searching for *Sightline Prompter* in the Stream Deck app. The
latest news and the link are on the
[Sightline page](https://joannelockwood.co.uk/sightline#stream-deck).

**Setting it up:**

1. In Sightline, **Settings > Remotes > Stream Deck**, tick **Let the
   Sightline plugin for Stream Deck control the prompter**, and **Save**. The
   plugin finds Sightline itself, so there's no code or token to type. It gets
   its own key, for buttons only: it can play and pause, move through the
   script, switch slots and show what's happening, but it can't load scripts,
   change settings or touch your recordings. (That's separate from AI access,
   which you can leave off.)
2. Install the plugin. Stream Deck offers a ready-made **Sightline** profile
   for each Stream Deck you have: the Mini, Stream Deck, Neo, XL, +, + XL and
   the Pedal.
3. Keep Sightline open while you record. If a key goes grey, it says why:
   *Get Sightline* (Sightline isn't installed), *Turn on Stream Deck* (step 1), or
   *Not running* (Sightline is closed). Pressing a grey key opens the download
   page or these steps.

| Keys | What they do |
| --- | --- |
| Play / pause, On air, Eye-line, Click-through | Two-state keys that light up to match the prompter |
| Back to the top, Previous and Next section | Move through the script |
| Marker, Back to the marker, Keeper, Scrap that | The same as the keys and voice commands |
| Script slot | Opens slot 1 to 9; lit while that slot is open |
| Mirror | Steps through the modes, or turns ↔ or ↕ on and off |
| Layout, Reading, Recording | Opens or closes that panel |
| Faster, Slower, Bigger, Smaller | Speed and text size |
| Section and time left | Shows them; press to play or pause |

On the Stream Deck +, the dials turn through sections, scroll the script by
hand, and change the speed, text size and backing, with the values on the
touch strip. The Pedal's three pedals are previous section, play or pause, and
next section.

The plugin works with Sightline 1.0.6 or later, on Windows and macOS (Stream
Deck doesn't run on Linux).

## The floating pad

**Ctrl+Shift+P**, ☰ > Window > Control pad, or Settings > Remotes. It's a small bar with Top,
Previous, Start / Pause and Next that stays on top of every other window.

![The floating pad](images/pad.png)

Drag it by the dots on the left, even onto another monitor or over Riverside.
It reopens where you left it. Over a mirrored prompter, it flips to match.

## The control window

**Ctrl+Shift+O**, ☰ > Window > Control window, or Settings > Remotes. It's an ordinary, upright
window for a second screen or an operator. It shows a live copy of the script
that follows the prompter, with the reading line, the pacing light, the
section and time left, and big buttons.

![The control window](images/control-window.png)

Click any line in the copy to move the prompter there. **A−** and **A+** change
the copy's text size. The keys work here too: Space, Page Up and Page Down,
Home, the arrows and B.

## The phone remote

On **Settings > Remotes**, tick **Control the prompter from a phone on the
same Wi-Fi** and save. Scan the QR code with your phone to get big buttons for
Start / Pause, Previous, Next, Top, Slower, Faster and Drop a marker, with the
current section showing.

![The phone remote](images/phone-remote.png)

Only a phone with the code in the QR code can connect. **New code**
disconnects any phone already connected. The first time, Windows may ask
whether to let Sightline Prompter use the network. Allow it on private
networks.

![Settings > Remotes](images/settings-remotes.png)

## AI and remote control

Also on **Settings > Remotes**, you can let an AI assistant (such as Claude
Code or Codex) or a script on this computer load scripts and control the
prompter. It's off by default, and only programs on this computer that have
the token can connect. **How to set up your AI** on that tab opens
[Setting up your AI](10-setting-up-your-ai.md), which explains the port, the
token and the status line, and how to set up each AI. What an AI can do with
it is in [Working with AI](09-working-with-ai.md#2-record-let-the-ai-run-the-prompter).

## Choosing the prompter monitor

On **Settings > Display** (or Window > Prompter Monitor), pick a monitor and
the prompter opens full screen there, now and each time the app starts. A
dedicated prompter screen such as the Elgato Prompter shows up by name.
**F11** gives a normal window again.

If a monitor is unplugged or the resolution changes, the prompter and the
control window move back onto a screen you can see, with the control bar in
reach.
