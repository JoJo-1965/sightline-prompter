# Writing scripts

## File types

Sightline opens Markdown (`.md`, `.markdown`), plain text (`.txt`), Word
(`.docx`), rich text (`.rtf`), PDF (`.pdf`) and web pages (`.html`, `.htm`).
Markdown and plain text can be edited inside the app (**Edit** or **Ctrl+E**).
Word and rich text files open in Word, and the prompter reloads them when you
save.

**PDFs:** Sightline reads the text and rebuilds the paragraphs. Larger text
becomes headings, so the arrow keys jump between sections, and page numbers and
running headers or footers are left out. To change a PDF script, edit the
original document and save the PDF again: the prompter reloads it. A scanned
PDF is a picture of the page, with no text to read, so open the original
instead.

### Google Docs

Choose **File > Open a Google Doc…** (or ☰ > Script), paste the doc's link and
click **Open**. You can also drag the link from your browser's address bar onto
the prompter.

- In Google Docs, choose **Share** and set General access to **Anyone with the
  link** first. Sightline doesn't sign in to Google, so it can only fetch docs
  shared that way.
- Headings in the doc become sections, and `{pause}`, `[directions]` and the
  other script markings work as usual.
- Edit the script in Google Docs. Each time you open it, Sightline fetches the
  latest version; to fetch it now, choose **File > Reload from Google Docs**.
- Offline, the last copy fetched is used.

![The built-in editor](images/editor.png)

## Sections

Break a script into sections with headings (`## Section title` in Markdown) or
with a line like `=== SECTION ===` in plain text. Sections let you:

- jump between them with **←** and **→**, a presenter clicker, the pad or the
  phone remote
- give each one its own pace and target time
- record a module one section at a time, with a summary at the end

## Notes for you: [square brackets]

Anything in square brackets is a note to you, the speaker, such as
`[smile]` or `[Say: "Section one". Pause.]`. Notes are shown dimmed, so they
don't get read out by mistake. Any `"quoted words"` inside a note stay bright,
because you do say those. Settings > Display can show notes normally, or hide
them.

Voice scrolling and the sentence highlight both ignore notes.

## Instructions for the app: {curly braces}

Words in curly braces are instructions to the app. They're hidden while you
read.

| Directive                     | What it does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `{pause}`                     | Scrolling stops here until you press Space or the clicker |
| `{pause: 3s}`                 | Stops for 3 seconds, then carries on                      |
| `{marker}`                    | A bookmark for retakes. **Ctrl+B** jumps to the next one  |
| `{wpm: 140}`                  | On a section heading: that section's pace                 |
| `{target: 1:20}`              | On a section heading: that section's target time          |
| `{mode: points}`              | At the top: open the script as talking points             |
| `{pacing: section, wpm: 145}` | At the top: settings for the whole script                 |

To check a script, tick **Show directives** in the Layout panel. Each
directive appears as a small tag, with ⚠ on any it doesn't recognise (usually a
typo).

![Directives shown as tags for checking](images/directives.png)

The full reference is in [SCRIPT-DIRECTIVES.md](../SCRIPT-DIRECTIVES.md). If
you write scripts with an AI assistant, [AI-SCRIPT-BRIEF.md](../AI-SCRIPT-BRIEF.md)
is a brief you can give it.
