# Logo usage

> What to do, what not to do, and minimum sizes.

## Clear space

The logo mark is built on a **22‑unit grid** (the rounded square is `viewBox="0 0 100 100"` with `rx="22"`). Maintain clear space equal to **the height of the amber spark** (~6 units, or 6% of the mark's size) on all sides. So:

| Mark rendered size | Minimum clear space |
| --- | --- |
| 16px | 1px |
| 24px | 1.5px |
| 32px | 2px |
| 64px | 4px |
| 256px | 16px |

## Minimum size

| Context | Minimum size |
| --- | --- |
| Square mark | 16 × 16 px on screen, 8 × 8 mm in print |
| Horizontal lockup | 96 × 24 px on screen, 36 × 9 mm in print |
| Wordmark only | 80 × 22 px on screen, 30 × 8 mm in print |

Below these sizes, use the favicon variant ([logo/favicon.svg](logo/favicon.svg)) which has simplified geometry tuned for tiny pixel grids.

## Placement

### Light backgrounds (preferred)

Use the full‑color mark from [logo/logo-mark.svg](logo/logo-mark.svg). Indigo + amber on light surfaces is the brand's signature presentation.

### Dark backgrounds

Use [logo/logo-mark-dark.svg](logo/logo-mark-dark.svg) — the rounded square becomes the `--cream` colour (`#FAFAF7`) with indigo strokes and the amber spark held. NEVER place the dark‑surface mark on a light surface.

### Photography

Drop the mark in a corner with a translucent dark mat behind it (rgba(39,39,43,0.7) at 12px blur) so the indigo doesn't fight whatever's in the photo.

### Monochrome / single‑colour

Use [logo/logo-mark-monochrome.svg](logo/logo-mark-monochrome.svg) for embroidery, debossing, single‑colour stamps, faxes (yes, that still happens), and anywhere print constraints can't carry two inks.

## What NOT to do

- ❌ **Never** stretch, skew, or rotate the mark.
- ❌ **Never** swap the amber for any other accent colour.
- ❌ **Never** invert the indigo and amber.
- ❌ **Never** place the mark inside another container shape (circle, hexagon, etc.) — it already has its own rounded square.
- ❌ **Never** add a drop shadow, glow, or 3D effect to the mark.
- ❌ **Never** reproduce the mark from memory or a screenshot. Always pull from `brand/logo/`.
- ❌ **Never** use the trophy icon, the red `#b73737`, or any pre‑rebrand artwork. If you see it in a partner deck, fix it.

## Co‑branding

When pairing with a partner mark:

1. Both marks at the **same optical height** (not necessarily the same pixel height — adjust for visual balance).
2. Separated by a vertical rule `1px var(--rule)` with `24px` clear space on either side.
3. Employed mark on the **right** (we are the platform; the partner gets the lead position).

## File format guidance

| Use case | Format | Source file |
| --- | --- | --- |
| Web, app, email signatures | SVG | any `brand/logo/*.svg` |
| Slide decks (Keynote/PPT) | SVG or 300dpi PNG | rsvg‑convert at 1024px wide |
| Print (business cards, flyers) | PDF | inkscape `--export-pdf` |
| Embroidery / merch | EPS or DST | open SVG in Illustrator, save as EPS |
| Favicon | already wired | `public/images/favicon.svg` |
| OG card | already wired | `public/images/og-card.svg` |
