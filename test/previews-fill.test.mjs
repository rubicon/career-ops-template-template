// previews-fill.test.mjs — the sample data must fill every placeholder in every
// template the pack ships. This is the browser-free half of the preview tooling:
// it runs the FILL step only (pure string substitution) and asserts no
// {{PLACEHOLDER}} survives, so previews can never silently ship with a literal
// {{FOO}} because a template gained a placeholder sample-cv.json does not supply.
// Runs in the normal `node --test` CI; no Playwright required.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildValues, fillTemplate, loadPack } from '../scripts/generate-previews.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { pack, data } = loadPack(ROOT);
const values = buildValues(data);

const LEFTOVER = /\{\{[A-Z_]+\}\}/g;

for (const t of pack.templates) {
  const kinds = t.kind === 'both' ? ['cv', 'cover'] : [t.kind];
  for (const kind of kinds) {
    test(`sample-cv.json fills every placeholder in ${t.id} (${kind})`, () => {
      const src = t.files[kind];
      assert.ok(src, `${t.id}: files.${kind} missing from pack.json`);
      const filled = fillTemplate(readFileSync(join(ROOT, src), 'utf-8'), values);
      const leftover = filled.match(LEFTOVER);
      assert.equal(
        leftover,
        null,
        `${src} has unfilled placeholder(s): ${[...new Set(leftover || [])].join(', ')}`,
      );
    });
  }
}

test('every value the templates need is a string (no undefined leaks)', () => {
  for (const [k, v] of Object.entries(values)) {
    assert.equal(
      typeof v,
      'string',
      `value for {{${k}}} is not a string (${typeof v}) — check sample-cv.json`,
    );
  }
});
