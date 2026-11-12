# Controllers, API and MCP — RC14

The app candidate is **1.3.0 RC14**; the matching Stream Deck companion is
**0.2.1.7**. Existing app settings, pad order, mappings, plugin UUIDs, saved
function values, dials, custom icons and profile exports retain their meaning.
The public stable app and Marketplace plugin remain separate releases.

| Function | Pad / phone / mappings | Operator window | Stream Deck | MCP |
| --- | --- | --- | --- | --- |
| Voice / Page / Scroll | Existing direct choices and cycle | Three visible choices | Reading mode function selector | `sightline_prompt` with `mode-voice`, `mode-notes`, `mode-scroll` or `mode-cycle` |
| Clean view / Show controls | View function | Visible toggle | Display > Clean view | `sightline_view`, action `clean-view`, explicit value `on` or `off` |
| Click-through | Existing View function | Visible toggle | Existing Display function | `sightline_view`, action `click-through`, explicit value `on` or `off` |
| On top | New optional View function | Visible toggle | Display > On top | `sightline_view`, action `always-on-top`, explicit value `on` or `off` |

## State and permissions

Read `/status` or `sightline_status` first. Require the action in `commands`;
use `readingMode`, `readingModeBusy`, `cleanOverlay`, `clickThrough` and
`alwaysOnTop` to show the observed state. A held Voice session can switch modes
when `readingModeBusy` is false. Older apps without that field retain the
conservative scrolling guard. Active delivery and editing block mode changes.
Voice also requires enabled speech and microphone input.

The full API accepts `/command` with a display action and `value: "on"` or
`"off"`; omitting the value retains the existing toggle convention. MCP uses
explicit values only and needs the existing prompting/control grant. Display
and mode selection do not start audio, prompting or OBS and need no recording
grant. Delivery and recorder commands retain their recording permissions.
The On top flag is the saved preference; eye-line/window mode can also impose
native stacking. This flag does not override operating-system window rules.

## Presets and recovery

**Connections > Pad and phone > Call overlay** is an optional eight-button
preset: Start/Pause, Reading mode, Previous, Next, Clean view, Click-through,
On top and Control window. Use preset deliberately replaces that pad selection;
installing or updating leaves the existing selection intact.

The companion includes 25 separate **Call Overlay RC14** profile imports for
applicable physical, Mobile and Virtual grids. Six-key layouts contain six
core controls; larger layouts add On top and the operator window. Pedal remains
direct. Profiles never import or switch automatically. Existing exports remain
byte-identical. MCP Deck remains qualified by the host/manifest support rules.

Clean view preserves text appearance, reading position, guide reference and
recording state. Its control shows Show controls when active. Recover through
that button, the small top-edge tab, Escape while Sightline has focus, or global
Ctrl+Shift+X turned off. Existing hotkeys remain; optional input mappings can
assign these actions. The editor's Insert and Auto format stay editor actions.

Native checks use isolated profiles and synthetic state. Physical controllers,
microphones and multi-monitor setups still need operator UAT.
