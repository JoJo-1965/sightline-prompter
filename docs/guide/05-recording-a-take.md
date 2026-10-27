# Recording a take

## The pacing light

While the script scrolls, a light at the bottom shows how you're doing against
the target. It gives the time so far against the section's target, your pace
in words per minute against the target pace, and a plain verdict.

![The pacing light](images/pacing.png)

- **Green, "On track"**: within 5% of the target.
- **Amber, "Ahead 4 s" or "Behind 8 s"**: 5 to 10% out.
- **Red**: more than 10% out.

By default each section is timed on its own (good for recording a module one
section at a time), and the timer stops at each `{pause}`. Put
`{pacing: session}` at the top of a script to time the whole take instead.

The **ON AIR** light at the top right shows while the script is scrolling.

## The take summary

When you stop, a summary lists each section you read to the end, with its time,
target, pace and result.

![The take summary](images/take-summary.png)

Rehearsing? **Use these times as targets** writes each time into the script as
`{target: m:ss}`, so your next take is paced to match your rehearsal.

## Markers and retakes

- Press **B** to drop a marker at the reading line when you fluff a line.
- **Ctrl+B** jumps to the next marker, whether you dropped it or it's a
  `{marker}` in the script.
- **←** goes back to the start of the section, ready for a retake.

## Talking points

For a talk rather than a word-for-word script, choose **Talking points** in the
Layout panel, or put `{mode: points}` at the top of the script. Each section
shows as one page of points, with no scrolling.

![Talking points](images/talking-points.png)

**Space** starts and stops the talk timer. **→** and **Page Down** go to the
next point, and **←** and **Page Up** go back.
