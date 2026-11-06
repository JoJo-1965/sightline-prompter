# RC4 HUD controller and content mapping

Native candidate 1.3.0 RC4; optional companion 0.2.1.6. Implemented mappings
still require the final packaged UAT; no physical-device pass is implied.

| Function | Existing/new action | Placement |
| --- | --- | --- |
| Start/pause delivery | Existing Play/pause | Keep each device's current primary control; mode follows delivery, not OBS |
| Next/Previous/Again | Existing navigation | Keep current mappings; RC4 corrects the inherited voice stop and spoken-line anchor |
| Prepare/restore framing | Existing preparation/head-guide functions | Keep Prepare page and saved-reference controls |
| HUD visibility | One new `hud-cues` action | Optional Display/View function; state comes from native `hud` status |
| Smile/point in any direction | Authored `[]` cues | Automatic from the script; no per-gesture key or cue-stepping menu |
| Production record/pause/finish | Existing guarded OBS actions | Keep integration, permission, confirmation and Finish-hold behaviour |

## Device layout decisions

- Six-key Core Pages keep Read, Record, Prepare and Adjust; no fifth page or
  displaced core key. Eight/15-key models can assign the Display function if
  useful. Existing standard/XL/+ and encoder layouts retain their dials.
- Virtual/Mobile 64 receive four separate optional HUD RC4 imports, each adding
  the HUD key to an unused cell. Existing model/grid choices stay authoritative.
- Other supported key interfaces can assign the same grouped action manually.
  This adds no guessed model/geometry or hardware acceptance claim.
- Pedal retains its three direct functions. Pad/phone share one action vocabulary;
  HUD is optional in the picker, with no automatic change to saved button order.
- Keyboard, clicker and controller mappings use that same native action. No
  new global shortcut is reserved and existing bindings are untouched.

Existing companion UUIDs/defaults and previous profile exports remain intact.
No profile is automatically imported; preserve Joanne's edited 8x8 Virtual pages.
An older app disables the new key through command-capability checking.

## Content and release coordination

The built-in [HUD guide](guide/22-hud-cues.md), Help card, Settings tooltip,
welcome/pointing demos and new promo draft use the same language and source cues.
Capture actual RC4 reading/review/Settings screens after native validation.
Refresh feature-grid exports and the versioned JL preview snapshot with those
screens; retain stable download/version labels until publication is approved.
The recorded RC3 promo and captured script/take snapshots remain unchanged.
