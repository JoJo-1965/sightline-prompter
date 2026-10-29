# Review notes and publication checklist

**Internal working document — 29 October 2026.**

This pack is a first complete draft of roadmap item 51, rather than a
claim that the organisation has adopted the policies or completed a legal
or accessibility assessment. Review against the actual business arrangements
before publishing. No application code or published policy has been changed.

## Decisions that need factual confirmation

| Question | How the draft handles it |
| --- | --- |
| Who receives the tips and controls the associated information? | Assumes SEE Change Happen Ltd for drafting only. Confirm both Stripe and Ko-fi records; use a separate recipient section if Joanne personally receives either. |
| Which territories' rules apply? | Joanne confirmed the England/UK base. The drafts identify the ICO as the UK regulator and preserve applicable local rights and complaint routes. Assess overseas activity and any EU representation duties before claiming UK law alone applies. No exclusive English-court clause is proposed. |
| Is the contact correct and monitored? | Uses the existing project maintainer email. Confirm it can handle privacy, accessibility and payment requests; add verified organisational address and registration details as appropriate. |
| Which company details are already public? | The website lists SEE Change Happen Ltd, company 13138905, registered office 1 The Briars, Waterberry Drive, Waterlooville, PO7 7YH, and VAT GB 368 9768 15. Company number and office have been added to the privacy draft. Obtain the ICO registration reference and confirm the preferred privacy contact and payment recipient; VAT is not an ICO reference. |
| Which support, email, hosting, accounting and payment providers are used? | No invented provider inventory or processor labels. Complete the actual inventory and international-transfer assessment before publishing. |
| Which retention periods can be operated? | Proposes 24 months for resolved support correspondence and 90 days for diagnostic attachments. These are proposed choices, not existing deletion controls. Company accounting retention is separate. |
| Who handles requests and incidents? | Internal procedure needs an owner, cover and a workable review process. Confirm the company's existing policies and registration cover this project. |
| How will mistaken tips be handled? | Offers a review route without inventing an automatic refund policy or restricting payment-provider rights. Agree an operating procedure. |
| Is support restricted to a project or purpose? | Describes generic voluntary support, no purchased benefits and no earmarking. Check the live checkout, Ko-fi goals and page copy for a conflicting promise. |
| What accessibility evidence is available? | Says conformance has not been established. Do not substitute "partially compliant" without evidence. Arrange keyboard and assistive-technology evaluation before making stronger claims. |

Have the company's adviser review the proposed public terms and privacy
notice, including controller roles, lawful bases and non-excludable rights.
Have its accountant confirm the treatment of the actual tip arrangements.
Neither Stripe configuration nor the word "donation" settles VAT or other
tax treatment. Do not add perks or advertising benefits without reassessing
the arrangement. No tax exemption is asserted in the public draft.

## Implementation evidence reviewed

Read against the 1.0.6 source and the current local plugin source. These
are code-review findings, not a fresh end-to-end microphone or network test.

| Area | Evidence and consequence for wording |
| --- | --- |
| Local recognition | `src/speech.js` downloads model files from Hugging Face; `src/client/auto-scroll.js` selects local or Deepgram. Local processing is not the same as keeping no text. |
| Always listening | `wantCommandListening()` in `src/client/teleprompter.js` permits commands while stopped with local recognition; excludes editing, teaching and an active or starting follower. Always is not an off-air privacy switch. |
| Heard logs | Main's `appendHeardLog` appends recognised text and nearby script text to daily JSONL files. The follower passes `onHeard`; the commands-only session does not. Do not say "nothing you say is kept" without the text-log qualification. |
| Off script | `goOffScript()` mutes the recognition input. Scratch audio is a separate recorder; its UI expressly says it records even off script. Independent metering may also continue. |
| Keys and files | `saveState()` writes the Deepgram key and remote keys into application state. Discovery files contain API keys. Do not claim app-level encryption or hardware-bound pairing. |
| Deepgram requests | `DEEPGRAM_QUERY` uses the global API endpoint and does not include `mip_opt_out`. The draft discloses current behaviour; it does not claim zero retention, a UK endpoint or a training opt-out. |
| Full API | `src/remote.js` binds to loopback. Main's routes permit scripts, settings and recordings using the full key; recording deletion is separately gated. AI-provider handling is outside the local API's control. |
| Phone | `src/phone.js` binds to all IPv4 interfaces with key checks and serves HTTP. It is not a TLS-encrypted connection or internet relay. |
| Plugin | `src/sightline.js` in the plugin reads `stream-deck.json`; the app limits that key to status, events, commands and slots. Status may disclose script and section labels even without a script-read route. |
| Deletion | `deleteRecording()` in `src/recordings.js` trashes the take log and linked scratch audio. It does not remove separate heard logs, exports, scripts or backups. |
| Accessibility | UI includes theme, font, sizing, slate and alternative-control options. Their presence does not prove screen-reader support or WCAG conformance. |

## Wording and engineering follow-up

The current `docs/POLICIES.md` opens with a broad "never records" statement
before describing optional scratch audio later. Prefer the feature-by-feature
explanation in the draft. Its statement that everything stays on the computer
also needs the existing network and user-export exceptions kept close by.

Consider making Deepgram requests opt out of model improvement by default,
with an explicit product decision and tests. That would change behaviour;
it is not included in this authoring task. Until then, retain the disclosure.

The phrase "mic off" for off-script mode can be misleading when scratch
audio or metering remains active. Consider "Speech following off" and
separate recording/meter indicators. Again, wording must describe the build
that users actually have, not an intended future fix.

Local file cleanup, finer heard-log controls and a full accessibility audit
can be future development items. Do not describe them as current features.

## Authoritative sources checked

Sources were checked on 29 October 2026. Recheck them before adoption;
some ICO guidance notes ongoing updates following the Data (Use and Access)
Act. These links support review, not a claim of regulatory approval.

- [ICO: privacy information to provide](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)
- [ICO: who the UK GDPR applies to](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/who-does-the-uk-gdpr-apply-to/)
- [European Data Protection Board: local complaint routes](https://www.edpb.europa.eu/contact_en)
- [ICO: responding to access requests](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/what-should-we-consider-when-responding-to-a-request/)
- [ICO: special-category information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/special-category-data)
- [ICO: personal data breaches](https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/)
- [ICO: international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/a-brief-guide-to-international-transfers/)
- [HMRC: donations and consideration](https://www.gov.uk/hmrc-internal-manuals/vat-supply-and-consideration/vatsc06110)
- [GOV.UK: company accounting records](https://www.gov.uk/running-a-limited-company/company-and-accounting-records)
- [GOV.UK: unfair business terms](https://www.gov.uk/unfair-terms-in-sales-contracts/unfair-business-contracts)
- [Unfair Contract Terms Act, section 2](https://www.legislation.gov.uk/ukpga/1977/50/section/2)
- [W3C: accessibility statements](https://www.w3.org/WAI/planning/statements/generator/)
- [W3C: conformance evaluation](https://www.w3.org/WAI/test-evaluate/conformance/)
- [Deepgram: data handling and request controls](https://developers.deepgram.com/trust-security/your-data)
- [Stripe privacy](https://stripe.com/gb/privacy)
- [Ko-fi privacy](https://more.ko-fi.com/privacy)
- [Existing company privacy notice and registered office](https://joannelockwood.co.uk/privacy-policy/)

## Publication handover

After the factual review and adoption, give each public document its
effective and review dates. Move approved public documents into the normal
documentation location and resolve links there. Keep this checklist and
the operational procedure separate from user-facing policy navigation.

Replace the current policy hub with a short plain-English summary and links
to the approved pages. Keep the existing About link usable, then add matching
signposts in the app readme and help, plugin readme and About/help, website,
and relevant tip-jar or checkout pages. Website cookie and hosting claims
need a separate check against the actual website setup.

Use one maintained source for each policy and update the copies or links
together. Record policy publication in the next appropriate change log.
Do not rewrite the 1.0.6 release tag or assets, claim the plugin is already
on the Marketplace, or mark roadmap item 51 complete merely because the
drafts exist.
