# Your privacy and Sightline

**Effective: 29 October 2026.**

This notice covers Sightline Prompter, the Sightline Stream Deck plugin,
project support and Joanne's tip jar. It describes version 1.0.6 and the
plugin implementation reviewed alongside it, with development changes
identified separately below. The website and services you
open in your browser also have their own privacy and cookie notices.

## Who handles your information

Joanne Lockwood and the Sightline project are based in England, United
Kingdom. The project is maintained by Joanne at SEE Change Happen Ltd.
SEE Change Happen Ltd is the controller of personal
information it receives to answer project enquiries, administer support
payments and meet its own record-keeping obligations.

Company number: **13138905**. Registered office: **1 The Briars, Waterberry
Drive, Waterlooville, PO7 7YH, United Kingdom**.

ICO data-protection registration reference: **ZB020601**, under the
organisation name **See Change Happen Ltd**. Registration is not ICO
approval or certification of Sightline or these policies.

This notice is written for a UK-based project and explains its handling of
information under UK data-protection law. Other countries may have their
own rules, rights and regulators. Where those laws apply to our activities,
they may give you additional protections; being based in England does not
remove those obligations or your applicable local rights.

Contact us at **info@seechangehappen.co.uk** about privacy or
personal information received by the project. Do not post a privacy request
or sensitive files in a public issue.

Installing Sightline does not send your script, microphone recording or
take log to Joanne. When you use it for an organisation, that organisation
is responsible for the personal information it processes in its scripts
and recordings, and for its choice of any online speech or AI service.
Supplying a local application does not itself give the project access
to those files.

## Microphone use

| Feature | What happens |
| --- | --- |
| Local voice scrolling | Audio is processed on your computer to follow the script. Recognised text can be saved in heard logs; word timings and script words can appear in take logs. |
| Local wake-word commands | Audio is processed locally to recognise your chosen wake word and commands. In Always mode it can listen while scrolling is stopped and while off air. |
| Deepgram voice scrolling | When selected with your key, microphone audio is sent to Deepgram for recognition. Returned words can be used in local logs. |
| Scratch audio | When enabled, the microphone is recorded to a local WAV file during a run, including off-script passages. It can be included in an exported edit pack. |
| Sound checks and level metering | The microphone is measured for levels and background noise. Figures can be saved; this feature does not itself save an audio recording. |
| Teach a word | The microphone is used to recognise the alternatives you choose to save locally. |

Local recognition processes microphone audio before it knows whether you
said the wake word. It is not listening only after you say "Prompter".
By default the commands-only listener does not write a heard log; voice
following does. **Trace command words to the local heard log**, in
**Settings > Debug**, explicitly enables recognised-text
diagnostics for commands-only listening. It is off by default. When enabled,
it can save recognised conversation while stopped or off air. Turn it off
after troubleshooting. This option does not record audio. Automatic recovery
logs health events without spoken words. Other microphone features work independently.

Choose Voice commands **Off**, **In voice mode** or **Always** in Settings > Prompting > Commands. Always requires local recognition and an installed speech model.
The commands-only listener pauses during editing and word teaching; the
voice-following session takes over when you start voice scrolling.

Stopping scrolling or switching off air does not necessarily switch off
the microphone. Setting voice commands to Off disables command recognition,
not voice following, scratch recording or a sound check you start. To stop
all microphone access, quit Sightline or use your operating system's
microphone permission controls.

An explicit `{listen: off}` passage disables the speech-recognition input
until you resume. It does **not** stop enabled scratch audio or independent
level measurement. A timed pause, a stop cue and off-air mode are not
equivalent to turning off all microphone features. The app shows listening
indicators for recognition and meters for level measurement; the operating
system may also show microphone use.

## Files on your computer

Sightline keeps settings, script-slot references, recent file paths, word
alternatives, connection keys, heard logs, take logs and optional scratch
audio locally. Take logs can contain script titles, script wording, word
timings, markers, notes, ratings, pace and level measurements. Heard logs
can include speech that was not in the script. They may contain personal
or confidential information.

Development after version 1.0.6 also keeps a local diagnostic file,
`sightline.log`, for errors, hangs, crashes and troubleshooting steps.
It is periodically trimmed. Error details can include file paths or other
information about the session. Crash dumps can contain information from
application memory. Diagnostic logs and crash dumps are not uploaded
automatically; review any file before sharing it for support.

The usual application folder is:

- Windows: `%APPDATA%\Sightline Prompter`
- macOS: `~/Library/Application Support/Sightline Prompter`
- Linux: the `Sightline Prompter` directory under `$XDG_CONFIG_HOME`, or
  `~/.config` when that variable is not set.

Scripts stay where you open or save them. Exports go where you choose.
Backups and folders synced by another application may create other copies.
There is no automatic expiry of heard logs, take logs or retained scratch
files. Uninstalling the application normally leaves its data folder.

Deleting a session from Recordings moves its take log and linked scratch
audio to the system trash. It does not delete separate heard logs, original
scripts, exports, backups or recipients' copies. Close Sightline before
removing other application files manually; keep anything you need first.
Emptying the trash is a separate operating-system action, and is not a
guarantee of secure erasure from storage or backups.

The application does not add encryption to these local files. A saved
Deepgram key and remote-control keys are stored in local application state;
connection discovery files also contain keys. Protect your computer account
and backups. Do not share the whole settings folder as a support attachment.

## Connections you choose

Sightline has no project account system and no built-in usage analytics or
advertising trackers. That does not mean every feature is offline:

- Update checks contact GitHub with a version-bearing request. They are
  enabled by default and can be switched off; updates are not installed
  automatically.
- Optional rehearsal filler/repetition counting defaults off. When enabled
  in Recording > Takes, it uses recognised words already supplied by your
  selected voice engine during active following, after command filtering and
  outside holds/mute. Only counts are added to takes and edit packs, not an
  extra transcript or audio file. It starts no extra listener. Recognition
  and existing heard-log behaviour otherwise remain as described above;
  Deepgram still sends audio online if you selected it. Script-health review
  processes the current script/editor draft locally and never saves it itself.
- The local speech model is downloaded from Hugging Face when requested.
  Reinstall downloads it again. The optional AI kit is copied from the app
  into its own managed local folder; installing it does not enable the API or
  send scripts anywhere. The Components page checks Node.js locally. Custom
  key/controller assignments and controller names stay in local settings and
  are included if you export those settings.
- Optional OBS/Stream Deck checks inspect known installation locations, running
  application paths and the local Sightline plugin manifest. Locate stores
  your chosen application path locally, separately from settings exports.
  These checks never launch the apps or upload an inventory. Installer links
  open the supplier's website when selected.
- Opening a Google Docs link fetches content from Google.
- Selecting Deepgram sends audio to its service while voice scrolling runs.
- Help, project and support-payment links open external services.

These services receive the network information needed for a connection,
such as your IP address. Their own notices and arrangements apply.

Deepgram may retain submitted audio and transcripts and use them for model
improvement under its service arrangements. Version 1.0.6 does not send
the `mip_opt_out=true` request parameter. Do not assume that selecting
Deepgram gives zero retention or a UK-only processing location. Review
its [data controls](https://developers.deepgram.com/trust-security/your-data)
and your account agreement before sending confidential material.

## Remotes, Stream Deck and AI assistants

The OBS integration under development is optional and off by default.
When enabled, it connects to the OBS address you save and reads recording
status. Recording controls need a separate choice. Optional chapter markers
send section titles and marker labels to OBS; recording identifiers,
observations and paths can be kept in the local take log and its exports.
The integration does not send microphone audio or video to OBS. A saved
OBS password uses separate OS-protected storage and is excluded from
settings exports and API responses. Other local logs and files remain
unencrypted by the app. The initial OBS connection uses unencrypted
WebSocket; use a trusted network if OBS is on another computer.
Disabling it closes the connection without stopping OBS's recording.

The phone remote is optional. It serves a password-keyed page over ordinary
HTTP on your local network. The pairing URL contains its access key. Use
it on a network you trust, keep the QR code private and do not forward its
port to the internet. It does not use a project-operated relay service.

The optional local API listens on `127.0.0.1`. Its full key lets an authorised
local tool control the app and access scripts, settings and logs through
the supported routes. Deleting recordings through it needs a separate
setting. An AI assistant using that access may transmit information to its
own provider according to how you configure it.

The Stream Deck plugin uses a separate key for status, commands, events,
slot selection and a local version-compatibility report. Reported plugin and
connection versions and the last announcement time are held in memory while
Sightline is running; the check sends nothing to an external update service.
It does not have the full script, settings or recordings
API access. Status can still contain script or section labels. Its
connection to Sightline stays on your computer. Stream Deck software and
the Elgato Marketplace have their own privacy terms.

Local keys are permissions, not proof that the caller is a particular
product. Other software running with access to your files may read them.
Disable remotes you do not need, and check what you share with an agent.

## When you contact or support the project

The optional **Settings > Debug > Allow all windows to be captured**
control lets screenshots and recording tools capture every Sightline window,
including the head guide. It is off by default, applies for the current session
and shows a persistent warning. Turning it off restores the normal capture
rules; quitting clears it. It does not itself record or send anything.
Support logs note the override's state without adding recognised speech.

Joanne or the company can receive your name, email, message and any files
you send voluntarily. Public GitHub issues and contributions are visible
to others and subject to GitHub's privacy and retention arrangements.
Please send a minimal, redacted example rather than a real recording or
complete settings file.

For tips, Stripe or Ko-fi can make your supporter name, contact details,
message, amount and transaction reference available to the recipient.
Joanne and the company do not receive your full card number or card
security code through Sightline. See [Voluntary support](SUPPORT.md),
[Stripe's privacy notice](https://stripe.com/gb/privacy) and
[Ko-fi's privacy notice](https://more.ko-fi.com/privacy).

Purposes and lawful bases for information the company receives:

| Purpose | Lawful basis |
| --- | --- |
| Answer enquiries, fix reported problems and resolve payment mistakes | Legitimate interests in maintaining the project and responding to people who contact it |
| Administer voluntary payments and prevent misuse | Legitimate interests in receiving and managing support securely |
| Keep required tax and accounting records | Legal obligation |
| Publish a separate supporter acknowledgement, if introduced | Consent, obtained separately before publication |

**You can object to processing based on legitimate interests.** We will
consider your circumstances and stop unless there is a lawful reason to
continue. A tip or support enquiry does not subscribe you to marketing.
There is no automated decision-making by the project that has legal or
similarly significant effects on you.

## Retention and sharing

We keep ordinary support correspondence for up to 24 months after resolution,
and delete troubleshooting attachments within 90 days after resolution
unless an ongoing investigation needs them.
Information needed for company tax and accounting is kept for six
years from the end of the relevant company financial year, or longer where
legally required. A dispute or legal requirement may justify longer
retention of relevant records.

Access is limited to people helping with the enquiry or administration,
and service providers such as email, hosting, payment and accounting
services where needed. Necessary information may also go to professional
advisers or authorities where required by law. The project does not sell
your personal information or automatically publish its own supporter list.
Ko-fi's own public-supporter and message settings are separate.

Service providers may process information outside the UK. Where the company
makes a restricted transfer, it must be covered by UK adequacy regulations,
appropriate safeguards or another applicable lawful mechanism. Our wider
[company privacy notice](https://joannelockwood.co.uk/privacy-policy/)
explains the company's international-transfer arrangements. Contact us for
details of the arrangements relevant to information we hold about you.

## Your choices and rights

For information the company holds, you can ask for access, correction,
deletion or restriction, and where applicable portability. You can object
as explained above. Where processing relies on consent, you can withdraw
it without affecting earlier lawful processing. Rights depend on the
circumstances; some records must be retained by law.

Contact the privacy address above. We may ask for proportionate information
to verify your request. We normally respond within one month, with
any permitted extension or clarification explained. We cannot retrieve or
delete local files we have never received, or copies held independently
by other organisations.

You can complain to the
[Information Commissioner's Office (ICO)](https://ico.org.uk/make-a-complaint/),
the United Kingdom's independent data-protection regulator. It is not a
worldwide regulator. Where applicable law gives you that right, you may
also complain to the relevant authority in your country or region. For
example, where the EU GDPR applies, you may complain to the competent
supervisory authority in the country of your habitual residence, place of
work or the alleged infringement; the
[European Data Protection Board explains these routes](https://www.edpb.europa.eu/contact_en).

You can contact us first, but that is not a condition of exercising your
right to complain. We will date updates to this notice and explain
material changes.
