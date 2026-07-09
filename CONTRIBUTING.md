# Contributing

Thanks for your interest in improving this career-ops template pack.

## Development setup

You need Node 20 or newer.

```bash
npm install        # dev tooling only (Prettier, commitlint); a pack has no runtime dependencies
npm run validate   # shape, ATS, and render checks against pack.json
npm test           # the validator's unit tests
npm run smoke      # the pack validates against its own manifest
npm run format:check
```

## Template rules

Every template is single-column and ATS-safe: system font stacks only (no
webfonts), pt-only font sizes at or above 10pt, no images or tables or icons, and
at most one grayscale-safe accent that never appears in body or bullet copy.
`validate-template-pack.mjs` is the gate and runs in CI. If you add or change a
template, `npm run validate` must pass, and the preview PNGs must be regenerated
to match. Person-specific branding belongs in your own fork of the pack, not
here.

## Issues and branches

Open an issue before starting non-trivial work, so the approach can be agreed on
first. Branch names follow `dev/<issue-number>-<short-kebab-description>`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
`fix:`, `docs:`, `chore:`, and so on). Commit messages are linted in CI. Do not
add AI-authorship trailers.

## Pull requests

Keep a PR scoped to one issue. Fill in the PR template, link the issue, and make
sure CI is green. Describe what changed and how you verified it.
