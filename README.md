# career-ops-template-template

The scaffold for building a [career-ops](https://github.com/santifer/career-ops)
template pack. It is itself a valid, installable pack (id `example`) with one
plain CV and cover-letter pair, the pack validator, the authoring guide, and the
full CI and release setup a real pack needs. Copy it, claim your own design, and
publish.

[![CI](https://github.com/rubicon/career-ops-template-template/actions/workflows/ci.yaml/badge.svg)](https://github.com/rubicon/career-ops-template-template/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What a template pack is

A template pack is passive data: HTML templates, preview PNGs, and a `pack.json`
manifest. career-ops renders your `cv.md` through a chosen template to produce a
PDF resume or a cover letter. A pack ships alternative CV and cover-letter
designs, all single-column and ATS-safe. Core never executes pack code:
installing a pack copies files, nothing more. That is the whole security model,
and it is why a pack needs no hooks, no environment, and no network.

## Use this repository

Click "Use this template" on GitHub, or clone it, then:

1. Pick a pack id (kebab-case). Set `pack.json` `id`, `name` (must equal
   `career-ops-template-<id>`), `displayName`, and `homepage`.
2. Read [`docs/AUTHORING.md`](docs/AUTHORING.md). It carries the design-lever
   taxonomy, the pack-wide invariants, the placeholder contracts, and the render
   contract. The first exercise is to claim your own coordinate in the taxonomy
   and diverge from the plain example.
3. Rename the template files to `cv-template.<id>.html` and
   `cover-letter-template.<id>.html`, restyle them, and regenerate the previews.
4. Run `npm install && npm run validate` until it passes.

The example theme is deliberately plain (Georgia serif, monochrome, full-width
ruled headers) so nobody ships it as-is mistaking it for a finished design. It is
the baseline you move away from.

## Install a pack (today)

Installing a pack is copying its template files into your career-ops checkout:

```bash
cp templates/cv-template.example.html            /path/to/career-ops/templates/
cp templates/cover-letter-template.example.html  /path/to/career-ops/templates/
```

career-ops discovers templates by filename convention and reads each file's own
`<!-- career-ops-template -->` meta block, then lists them for selection when you
generate a PDF or a cover letter. There are no core changes to make: the naming
convention is the contract. A future templates registry will add install verbs,
and the `pack.json` here is already the manifest that registry will consume.

## Validate

```bash
npm install        # dev tooling only (Prettier, commitlint); a pack has no runtime dependencies
npm run validate   # shape, ATS, and render checks against pack.json
npm test           # the validator's own unit tests
npm run smoke      # the pack must validate against its own manifest
npm run format:check
```

The validator (`validate-template-pack.mjs`) is dependency-free and is the single
source of truth for what a pack must satisfy: `pack.json` shape, filename
convention, placeholder completeness, and the ATS and render contract (system
fonts only, pt-only font sizes at or above 10pt, no webfonts or images or tables,
one grayscale-safe accent that never touches body copy). This same file is
vendored unchanged into the reactive pack.

## Publish

Push to a public repository named `career-ops-template-<id>`, keep CI green, and
cut a release. release-please reads your Conventional Commits, proposes the
version bump, and keeps `pack.json` `version` in lockstep with the tag.

## What is in here

| Path                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `pack.json`                  | the pack manifest (id, templates, levers, attribution)   |
| `templates/`                 | the CV and cover-letter HTML plus their preview PNGs     |
| `validate-template-pack.mjs` | the dependency-free pack validator                       |
| `test/validate.test.mjs`     | the validator's unit tests                               |
| `test/smoke.mjs`             | self-check: this pack validates against its own manifest |
| `docs/AUTHORING.md`          | the authoring guide, including the design-lever taxonomy |

## Related

The [reactive pack](https://github.com/rubicon/career-ops-template-reactive)
is fifteen finished theme pairs built on exactly this scaffold. Read it as a set
of worked examples.

## License

MIT. See [LICENSE](LICENSE). The plain example derives from the Reactive Resume
rhyhorn template by Amruth Pillai (MIT), reimplemented as ATS-safe HTML.

## Contributors

![Contributors](https://contrib.rocks/image?repo=rubicon/career-ops-template-template)
