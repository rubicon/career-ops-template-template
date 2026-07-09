// test/smoke.mjs -- self-validation. The pack must validate against its own
// bundled validator with zero problems. Run in CI (npm run smoke) and locally
// before publishing. No network, no dependencies. Also picked up by `node
// --test` (files under test/ are treated as test files), so it doubles as a
// coverage check that the shipped pack.json is valid.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validatePack } from '../validate-template-pack.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = validatePack(root, path.join(root, 'pack.json'));
assert.deepEqual(problems, [], `pack.json failed validation:\n${problems.join('\n')}`);
console.log('smoke ok: pack.json validates with zero problems');
