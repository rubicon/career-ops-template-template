# Agent Instructions

This is the canonical instruction file for AI coding agents working in this
repository. `AGENTS.md` is a pointer to this file.

## What this project is

career-ops-template-template is the scaffold for building a
[career-ops](https://github.com/santifer/career-ops) template pack. It is itself
a valid, installable pack (id `example`) with one plain CV and cover-letter pair,
and it carries the pack validator and the authoring guide. See `README.md` for
the author-facing flow and `ARCHITECTURE.md` for the layout.

## What a template pack is

A pack is passive data: HTML templates, preview PNGs, and a `pack.json` manifest.
career-ops renders `cv.md` through a chosen template to produce a PDF or a cover
letter. Core never executes pack code; installing a pack copies template files
into a career-ops checkout. There is no runtime code here that career-ops runs,
so a pack needs no hooks, no environment, and no network.

## Non-negotiable invariants

- **ATS-safe templates.** Single column, system font stacks only (no
  `@font-face`, no webfonts), pt-only font sizes at or above 10pt, no images or
  tables or icons (the `{{PHOTO}}` slot is filled at generation time), ligatures
  disabled, and at most one grayscale-safe accent that never appears in body or
  bullet copy. `validate-template-pack.mjs` enforces all of this and runs in CI.
- **Placeholder completeness.** A CV template fills every slot in
  `CV_PLACEHOLDERS`; a cover template fills every slot in `COVER_PLACEHOLDERS`.
- **Meta block equals manifest.** Each template carries a
  `<!-- career-ops-template -->` meta block whose `name:` must equal the entry's
  `displayName` in `pack.json`.
- **No personal data.** Templates and previews carry no real CV content. The
  example renders a plain, generic layout.
- **The validator is the single source of truth.** Do not weaken a check to make
  a template pass; fix the template. If the contract changes, change the
  validator and its tests together.

## Commands

- `npm ci` (or `npm install`) once after cloning; Prettier and commitlint are
  devDependencies the commands below need.
- `npm run validate` runs the validator against `pack.json`.
- `npm test` runs the validator's unit tests (`node --test`).
- `npm run smoke` asserts this pack validates against its own manifest.
- `npm run format` / `npm run format:check` (Prettier). `templates/` is
  Prettier-ignored on purpose; the validator is their gate.

## Working conventions

- Conventional Commits; linted in CI. No AI-authorship trailers, no "Generated
  with" lines. No em-dashes, no emojis in code, comments, docs, commits, issues,
  or PRs. Use `--` for a dash separator.
- Run `npm run validate`, `npm test`, and `npm run format:check` before opening a
  PR. Regenerate the previews when a template changes: `npm run previews:setup`
  once, then `npm run previews` (approximates the authoritative career-ops
  `generate-pdf.mjs` render; Playwright is installed on demand, never a
  dependency).
- The example theme stays plain. New designs belong in a copy of this pack (its
  own `career-ops-template-<id>` repository), not layered onto the example.

## Authoring

`docs/AUTHORING.md` is the guide for building a real pack from this scaffold: the
design-lever taxonomy, the pack-wide invariants, the placeholder and render
contracts, and how to claim a unique coordinate.
