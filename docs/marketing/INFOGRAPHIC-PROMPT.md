# Promotional infographic revision

Built-in image generation, editing the previous navy/gold draft. This is a
review asset, not a product screenshot or a publication announcement.

## Final edit prompt

Use image 1 as the edit target and image 2 as a functional QR insert. Preserve
the navy/gold brand, headline, typography, mock prompter, four audience cards,
white footer panels and attribution. Make these changes:

1. Replace the low-contrast emoji icons in the four coloured tiles with bold,
   simple, flat dark-navy pictograms: video camera, graduation cap, AI sparkles,
   microphone. Give each icon a clear silhouette, substantial stroke/fill and
   ample padding. No gradients or pale details within the icons. Dark navy
   against the bright gold/blue/green/pink tiles should be immediately readable.
2. Make voice control explicit. Replace the paragraph under “Your words. Your
   pace.” with these exact four balanced lines:
   “A traditional teleprompter, built for your workflow.
   Voice controlled. Voice following or steady scrolling.
   Your favourite AI can prepare scripts and control it.
   Optional script directions steer the prompting.”
   Keep the text fully inside the left column; reflow the layout slightly if
   needed, retaining generous spacing and avoiding one/two-word final lines.
3. Update the desk/studio card body to exactly: “Phone and pad controls, with
   optional OBS and Stream Deck support. Keep your usual recorder.” Add a small
   legible line below the cards: “OBS and Stream Deck: 1.1.0 preview; plugin in
   private testing.” This is not a release announcement.
4. Restore a real, scannable QR in the bottom-right white panel. Use image 2
   exactly as supplied, a square raster insert without redrawing, stylising,
   distorting, cropping or changing any QR modules. It encodes
   https://joannelockwood.co.uk/sightline . Make it at least 220 image pixels
   wide, including its generous white quiet zone. Rework that panel around the
   QR with a short title “Explore Sightline”, then the QR and a small readable
   joannelockwood.co.uk/sightline URL. Move the two “By a speaker...” lines to
   another suitable location or omit them if necessary to avoid overcrowding.

Preserve all other accurate text, including free/open-source/platform labels,
privacy qualifications, MIT and David Neal/Joanne attribution. Do not add
autonomous editing, automatic face tracking or exact timing claims. Keep all
text crisp and readable. No decorative fake QR.

## QR verification

The independent QR source is `sightline-qr.png`, generated from the product URL
with high error correction and a four-module white quiet zone. Decode the
completed artwork before calling the QR tested.

The generated edit redrew the QR and failed decoding. The delivered PNG uses
the generated illustration with an independent QR/label panel rendered by
`scripts/render-promo-qr.mjs`. OpenCV successfully decoded the final 2244×2804
artwork to `https://joannelockwood.co.uk/sightline`. This checks the digital
asset; check a printed copy again at the intended print size.
