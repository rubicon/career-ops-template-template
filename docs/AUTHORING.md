# Authoring a career-ops template pack

This guide takes you from the plain example to a finished, validator-clean pack.
It carries the design-lever taxonomy the reactive pack was built on, the pack-wide
invariants, the placeholder and render contracts, and the publish flow. The
validator (`validate-template-pack.mjs`) enforces everything here; if this guide
and the validator ever disagree, the validator wins.

## The shape of a pack

A pack is passive data:

- `pack.json` -- the manifest (id, templates, lever coordinates, accents,
  previews, attribution).
- `templates/cv-template.<id>.html` and
  `templates/cover-letter-template.<id>.html` -- the designs.
- `templates/previews/<id>-cv.png` and `templates/previews/<id>-cover.png` --
  render previews at 1224x1584.

career-ops discovers templates by the filename convention and reads each file's
own `<!-- career-ops-template -->` meta block. Installing a pack is copying files
into a career-ops checkout. Core never executes anything in a pack.

## Build steps

1. Copy this repository (GitHub "Use this template", or clone).
2. Choose a pack id (kebab-case). Set `pack.json` `id`, `name` (must equal
   `career-ops-template-<id>`), `displayName`, and `homepage`.
3. Claim a coordinate in the taxonomy below for your first theme, and diverge
   from the plain example.
4. Rename the two template files to `cv-template.<theme-id>.html` and
   `cover-letter-template.<theme-id>.html`, set the meta block `name:` to the
   theme's display name, and fill in the `pack.json` entry.
5. Regenerate the previews: `npm run previews:setup` (once), then `npm run previews`.
6. `npm install && npm run validate && npm test && npm run smoke` until green.

## Pack-wide invariants (non-negotiable, validator-enforced)

1. Single column. No sidebars, no parallel body columns, no CSS multi-column at
   page level (multi-column text inside one linear block, for example a
   competency list, is permitted because source order is unaffected).
2. System-safe font stacks only. No `@font-face`, no webfont links. Ligatures
   disabled globally (`font-variant-ligatures: none;
font-feature-settings: "liga" 0, "clig" 0, "dlig" 0`).
3. Exactly one accent color, grayscale-safe (must remain legible printed in black
   and white; record the white-background contrast ratio in the manifest, at or
   above 4.5:1).
4. The accent never appears in body or bullet copy. Allowed accent scopes are the
   candidate name, section-header text, and rules or borders. Nothing else: not
   company or org lines, not bullet markers, not `<strong>` inside bullets.
   In-bullet emphasis is bold near-black or nothing.
5. No icons, SVG glyphs, photos (beyond the opt-in `{{PHOTO}}` slot), skill bars,
   rating dots, timeline graphics, gradients, shadows, or background art. Light
   flat background fills behind selectable text (shaded header bars) are
   permitted; decorative fills are not.
6. No glyph decoration. Visual devices (flanking rules, spines, tabs) must be CSS
   borders or pseudo-elements, never literal glyph runs (long dash runs, middot
   runs, box-drawing) that a parser would ingest as text.
7. No layout tables, no nested tables. Dates align via flex, never tabs or tables.
8. Standard section headers; selectable UTF-8; nothing under 10pt; no critical
   information in page header or footer regions.
9. DOM order equals reading order. Any visually two-tier device (gutter labels)
   must be source-linear: label, then that section's content.

## The design-lever taxonomy

Every theme occupies a unique coordinate. The hard rule, enforced by the
validator, is that no two themes in a pack share the same primary triple
`{face-class, axis, header-treatment}`. All values below are ATS-safe by
construction; anything not listed is out of bounds for a pack template.

### The axes

| Axis                | Values (ATS-safe range)                                                                                                                                                                                                                                                                                                  | Distinctive power  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| A. Face class       | serif: Georgia, Cambria/Caladea, Times/Tinos, Palatino/Book Antiqua; sans: Helvetica/Arial/Liberation, Calibri/Carlito, Verdana, Tahoma, Trebuchet MS                                                                                                                                                                    | High               |
| B. Axis (alignment) | left, centered masthead, left-gutter labels                                                                                                                                                                                                                                                                              | High               |
| C. Header treatment | full-width rule, flanked centered rules, uppercase letterspaced with rule, uppercase letterspaced no rule, small-caps with hairline, small-caps no rule, short accent tab, colored underline, shaded bar (flat fill, selectable text), page-top letterhead bar, name-band (oversized name over heavy rule), gutter label | High               |
| D. Accent hue       | mono (none), navy, indigo, bronze, gold, steel-blue, ocean-blue, teal, forest, plum, burgundy; all dark enough to read as dark gray in black and white                                                                                                                                                                   | Low alone; texture |
| E. Density          | compact, regular, airy (margins, line-height, section gaps)                                                                                                                                                                                                                                                              | Medium             |
| F. Rule weight      | none, hairline (light, at or below 1px), standard (1px dark), heavy (2px or more)                                                                                                                                                                                                                                        | Low to medium      |
| G. Date treatment   | right-flush (flex), inline-after                                                                                                                                                                                                                                                                                         | Low                |
| H. Competency form  | 2-col text list, 3-col text grid, inline middot run, categorized lines (never pills, boxes, or dots)                                                                                                                                                                                                                     | Medium             |

### The reactive pack's fifteen coordinates

The primary triple `{A, B, C}` is unique per row. These are the coordinates the
reactive pack occupies; pick different ones (or the same axes with a different
face or header) for your own pack.

|   # | Theme    | RR origin | Face                  | Axis        | Header treatment                         | Accent       | Density | Competencies      | Register                     |
| --: | -------- | --------- | --------------------- | ----------- | ---------------------------------------- | ------------ | ------- | ----------------- | ---------------------------- |
|   1 | Ledger   | rhyhorn   | Georgia               | left        | full-width rule                          | mono         | regular | 2-col list        | law / finance / academe      |
|   2 | Slate    | onyx      | Helvetica             | left        | full-width rule, heavy name rule         | mono         | compact | categorized lines | engineering classic          |
|   3 | Meridian | kakuna    | Georgia               | centered    | flanked centered rules                   | bronze       | regular | inline middot run | ceremonial / board / gov     |
|   4 | Cadence  | meowth    | Helvetica             | left        | uppercase letterspaced with rule         | indigo       | regular | 3-col grid        | modern corporate / tech mgmt |
|   5 | Beacon   | scizor    | Trebuchet MS          | left        | page-top letterhead bar, tight uppercase | steel-blue   | compact | inline middot run | consulting / strategy        |
|   6 | Gazette  | bronzor   | Verdana               | left-gutter | gutter labels (DOM-linear)               | mono         | airy    | 2-col list        | editorial (design-forward)   |
|   7 | Tempo    | lapras    | Calibri/Carlito       | left        | short accent tab                         | ocean-blue   | airy    | 2-col list        | product / design-adjacent    |
|   8 | Harbor   | glalie    | Cambria/Caladea       | left        | colored underline under header text      | teal         | regular | categorized lines | calm senior professional     |
|   9 | Fern     | chikorita | Tahoma                | left        | small-caps with hairline                 | forest       | regular | 2-col list        | scientific / methodical      |
|  10 | Regent   | gengar    | Palatino/Book Antiqua | left        | small-caps, no rule                      | plum         | airy    | inline middot run | distinguished senior IC      |
|  11 | Herald   | ditto     | Helvetica             | left        | name-band over heavy rule                | burgundy     | regular | 3-col grid        | communications / sales       |
|  12 | Compass  | ditgar    | Verdana               | left        | uppercase letterspaced, no rule          | slate-navy   | compact | categorized lines | operations / logistics       |
|  13 | Bastion  | leafish   | Calibri/Carlito       | left        | shaded header bars (flat fill)           | deep-pine    | regular | 2-col list        | structured enterprise        |
|  14 | Laurel   | pikachu   | Times/Tinos           | left        | gold page-top hairline with small-caps   | antique-gold | regular | inline middot run | prestige / legal / academia  |
|  15 | Wayfarer | azurill   | Helvetica             | left        | thin rules with experience left-spine    | azure        | regular | 2-col list        | program mgmt / journey       |

Face-class spread across the reactive set: five serif themes, ten sans (the
Reactive Resume set skews modern, which is honest to the source). Hue spread:
three monochrome, twelve unique hues, none repeated.

### Distinctness is architecture, not hue

Masthead and section architecture separate themes; accent hue does not. Of the
fifteen, eight are strong silhouettes (Ledger, Meridian, Cadence, Beacon, Harbor,
Herald, Bastion, Wayfarer), six are family variants distinguished by face, hue,
and density (Slate, Tempo, Fern, Regent, Compass, Laurel), and Gazette is
design-forward. Family variants are legitimate pack members; disclose the tier so
nobody mistakes hue variety for structural variety. When you add a theme, change
the architecture, not just the color.

## Claiming a coordinate

1. Pick a face class and a header treatment that no existing theme in your pack
   pairs. The validator rejects a duplicate `{face, axis, header}` triple.
2. Choose one accent hue (or monochrome). Compute its white-background contrast
   and record it in `pack.json`; it must be at or above 4.5:1 and read as dark
   gray in grayscale.
3. Set density and rule weight to match the register you are targeting.
4. Fill the `levers` object in the manifest entry to match what the CSS actually
   does. The manifest is a description of the template, not an aspiration.

## Placeholder contracts

Every template must fill every slot for its kind. The authoritative lists are
`CV_PLACEHOLDERS` and `COVER_PLACEHOLDERS` in `validate-template-pack.mjs`; the
validator fails a template that is missing any slot.

CV slots (25): `LANG`, `PAGE_WIDTH`, `PHOTO`, `NAME`, `PHONE`, `EMAIL`,
`LINKEDIN_URL`, `LINKEDIN_DISPLAY`, `PORTFOLIO_URL`, `PORTFOLIO_DISPLAY`,
`LOCATION`, `SECTION_SUMMARY`, `SUMMARY_TEXT`, `SECTION_COMPETENCIES`,
`COMPETENCIES`, `SECTION_EXPERIENCE`, `EXPERIENCE`, `SECTION_PROJECTS`,
`PROJECTS`, `SECTION_EDUCATION`, `EDUCATION`, `SECTION_CERTIFICATIONS`,
`CERTIFICATIONS`, `SECTION_SKILLS`, `SKILLS`.

Cover-letter slots (14): `NAME`, `ROLE_TITLE`, `CONTACT_LINE`, `DATELINE`,
`RECIPIENT_BLOCK`, `GREETING_BLOCK`, `OPENING`, `PROFILE_INTRO`, `PROBLEMS_BLOCK`,
`ACHIEVEMENTS_BLOCK`, `CREDENTIALS_BLOCK`, `CLOSING_BLOCK`,
`LANGUAGE_CLOSING_BLOCK`, `FOOTNOTES_BLOCK`.

The `{{PHOTO}}` slot is the only place an image may appear; it is filled at
generation time and is empty by default. The `SECTION_*` slots let a section be
hidden when empty; keep them wrapping the section title.

### Cover-letter structure

Pack cover letters follow standard business-letter order:

```text
letterhead ({{NAME}} / {{CONTACT_LINE}} / {{CREDENTIALS_BLOCK}})
<hr class="divider">
{{DATELINE}}                        # the date
{{RECIPIENT_BLOCK}}                 # recipient address block, or empty
Re: Application for {{ROLE_TITLE}}  # reference line, above the salutation
{{GREETING_BLOCK}}                  # salutation
body ({{OPENING}}, {{PROFILE_INTRO}}, {{ACHIEVEMENTS_BLOCK}}, ...)
```

`{{RECIPIENT_BLOCK}}` is a required slot but its filled value is optional: the
fill path emits either a self-wrapped `<div class="recipient">...</div>` or an
empty string, so place the placeholder bare (no wrapper of its own) and an empty
value renders nothing. `.recipient` is ink only, like the other letter furniture.

## Render contract

1. **Font sizes are pt-only, minimum 10pt.** CSS `px` renders at 0.75pt on paper
   (1px is 1/96in against 1pt at 1/72in), which silently sinks 11px body copy to
   8.25pt, under the 10pt ATS paper floor. The validator rejects any non-pt
   font-size declaration.
2. **No page-level horizontal padding.** career-ops injects `@page { margin }` on
   the render path, so template-side page padding would double the margins.
   Vertical-only padding (for example `2px 0`) is fine. Enforced on `.page`,
   `body`, and `html`.
3. **Letter furniture is ink, pack-wide.** Greeting, salutation, valediction,
   signature, and closing blocks never carry the accent, not even as a border.

## Why ATS-safe means what it does

- **Webfonts corrupt extraction.** A `@font-face` or an external font `<link>`
  can cause the PDF text layer to encode ligatures and substituted glyphs that a
  text extractor (what an ATS reads) decodes back to private-use codepoints, so
  "verification" becomes an unsearchable string. System fonts plus a global
  ligature disable avoid it. This is why webfonts and `<link>` are hard-rejected.
- **Images and tables break linear reading.** ATS parsers read a linear text
  stream. A layout table or an out-of-flow image scrambles order or drops
  content. Single-column, flex-aligned, image-free markup reads back in order.
- **Accent must survive grayscale.** Many ATS previews and many human printers are
  black and white. An accent that only works in color fails silently, so the
  contrast floor is measured on white and the accent is kept out of body copy.

## Design-forward disclosure

A theme whose visual layout could confuse a minority of parsers (for example a
gutter-label two-tier look) sets `atsRisk` to `design-forward` in the manifest and
must carry an `atsRiskNote` describing the risk and a plain-parsing fallback. The
DOM must still be source-linear. Everything else is `atsRisk: none`. Do not hide a
real risk behind `none`; the honest tier is the point.

## Previews

Previews are rendered from `sample-cv.json` (small, non-personal sample data)
and screenshot one page at 1224x1584 (8.5 by 11 inches at 144 dpi) to
`templates/previews/<id>-cv.png` and `<id>-cover.png`. Regenerate them whenever a
template changes:

```bash
npm run previews:setup   # one-time: installs Playwright + Chromium (not saved as a dependency)
npm run previews         # renders every template in pack.json; scope with ids: npm run previews <id>
```

`scripts/generate-previews.mjs` is `pack.json`-driven, so it works unchanged for
your pack: list your themes in `pack.json` and it renders them. Fill your own
`sample-cv.json` fields; `test/previews-fill.test.mjs` (part of `npm test`) fails
if a template has a placeholder your sample does not supply, so the two stay in
sync. Playwright is installed on demand and is never a dependency, keeping the
pack passive data.

The previews **approximate** the authoritative career-ops render
(`generate-pdf.mjs`, which uses `@page` margins and `preferCSSPageSize`); the
script mimics the print margin with a screen-only padding rule, so the result is
close, not pixel-for-pixel.

## Publish

Push to a public repository named `career-ops-template-<id>`, keep CI green
(format, tests, and the pack validator all run there), and cut a release.
release-please reads your Conventional Commits, proposes the version bump, and
keeps `pack.json` `version` in lockstep with the git tag.
