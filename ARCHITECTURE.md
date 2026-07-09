# Architecture

career-ops-template-template is the scaffold for a career-ops template pack, and
a working pack in its own right. A pack is passive data that career-ops renders
`cv.md` through; there is no runtime code here that career-ops executes.

## Layout

```text
career-ops-template-template/
  pack.json                          # the manifest: id, templates, levers, accent, attribution
  templates/
    cv-template.example.html         # the plain baseline CV template
    cover-letter-template.example.html
    previews/
      example-cv.png                 # 1224x1584 render previews
      example-cover.png
  validate-template-pack.mjs         # the dependency-free pack validator
  test/
    validate.test.mjs                # the validator's unit tests (node --test)
    smoke.mjs                        # self-check: this pack validates against its own manifest
  docs/
    AUTHORING.md                     # authoring guide plus the design-lever taxonomy
```

## The manifest and the naming contract

`pack.json` declares each template's id, kind, lever coordinate, accent, and its
file and preview paths. The link to career-ops is a filename convention: a CV
template is `cv-template.<id>.html` and a cover template is
`cover-letter-template.<id>.html`. career-ops discovers templates by that
convention and reads each file's own `<!-- career-ops-template -->` meta block, so
installing a pack is copying files, with zero core changes. `pack.json` is the
pack's own contract (validator input, and the input a future templates registry
will consume), not something career-ops parses today.

## The validator

`validate-template-pack.mjs` is the single source of truth for what a pack must
satisfy. It parses `pack.json`, checks shape and semver fields, enforces unique
`{face, axis, header}` lever coordinates, recomputes each accent's
white-background contrast, and lints each template file: placeholder
completeness, meta-block agreement, and the ATS and render contract (system
fonts, pt-only sizes at or above 10pt, no webfonts or images or tables, ligature
disable, no page-level columns or horizontal padding, accent scoped out of body
copy and letter furniture, no glyph-run decoration). It has no dependencies and
runs in CI. `test/validate.test.mjs` covers it; `test/smoke.mjs` runs it against
this repo's own pack.

## Data flow

```text
cv.md  ->  career-ops fill  ->  cv-template.<id>.html (placeholders filled)  ->  PDF
                                     ^
                                     |
                       pack.json + validator (author side): shape, ATS, render gate
```

## Why templates are Prettier-ignored

The templates are validated data artifacts with a strict render contract. The
pack validator is their gate, not Prettier. Keeping `templates/` out of Prettier
avoids reflow churn and any risk of a formatter altering a template in a way that
changes the rendered PDF.
