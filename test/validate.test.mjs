// test/validate.test.mjs -- unit tests for the pack validator, run by
// node --test. Each test builds a minimal valid pack in a temp dir, breaks
// exactly one aspect, and asserts the validator reports that specific problem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validatePack,
  contrastOnWhite,
  CV_PLACEHOLDERS,
  COVER_PLACEHOLDERS,
} from '../validate-template-pack.mjs';

// ---------- fixture builders ----------

const CV_META = `<!-- career-ops-template
name: Testly
description: Test theme
version: 0.1.0
-->`;

function cvTemplate({
  meta = CV_META,
  extraCss = '',
  bodyExtra = '',
  placeholders = CV_PLACEHOLDERS,
} = {}) {
  const slots = placeholders.map((p) => `<span>{{${p}}}</span>`).join('\n');
  return `${meta}
<!DOCTYPE html>
<html lang="{{LANG}}">
<head><meta charset="UTF-8"><title>{{NAME}}</title>
<style>
* { font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0, "dlig" 0; }
body { font-family: Georgia, serif; font-size: 11pt; color: #1A1A1A; background: #fff; }
.page { max-width: {{PAGE_WIDTH}}; }
.name { color: #33356B; font-size: 26pt; }
.section-title { color: #33356B; border-bottom: 1px solid #33356B; font-size: 12pt; }
${extraCss}
</style></head>
<body><div class="page">
${slots}
${bodyExtra}
</div></body></html>`;
}

function coverTemplate({ placeholders = COVER_PLACEHOLDERS } = {}) {
  const slots = placeholders.map((p) => `<span>{{${p}}}</span>`).join('\n');
  return `<!-- career-ops-template
name: Testly
description: Test theme cover
version: 0.1.0
-->
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>{{NAME}}</title>
<style>
* { font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0, "dlig" 0; }
body { font-family: Georgia, serif; font-size: 11.5pt; color: #1A1A1A; }
.name { color: #33356B; font-size: 24pt; }
</style></head>
<body><div class="page">
${slots}
</div></body></html>`;
}

function baseManifest() {
  return {
    packVersion: 1,
    id: 'testpack',
    name: 'career-ops-template-testpack',
    displayName: 'Test Pack',
    description: 'A test pack.',
    author: 'Test Author',
    homepage: 'https://github.com/example/career-ops-template-testpack',
    license: 'MIT',
    version: '0.1.0',
    minCareerOpsVersion: '1.18.0',
    templates: [
      {
        id: 'testly',
        displayName: 'Testly',
        description: 'Serif test theme.',
        kind: 'both',
        ats: true,
        atsRisk: 'none',
        origin: 'onyx',
        levers: {
          face: 'georgia',
          axis: 'left',
          header: 'full-rule',
          accent: 'indigo',
          density: 'regular',
        },
        accent: {
          hex: '#33356B',
          contrastOnWhite: contrastOnWhite('#33356B'),
          grayscaleSafe: true,
        },
        files: {
          cv: 'templates/cv-template.testly.html',
          cover: 'templates/cover-letter-template.testly.html',
        },
        previews: { cv: 'previews/testly-cv.png', cover: 'previews/testly-cover.png' },
      },
    ],
  };
}

/** Write a pack to a fresh temp dir; returns { root, packPath, manifest }. */
function buildPack({ manifest = baseManifest(), cv = cvTemplate(), cover = coverTemplate() } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tpack-'));
  mkdirSync(join(root, 'templates'), { recursive: true });
  mkdirSync(join(root, 'previews'), { recursive: true });
  if (cv !== null) writeFileSync(join(root, 'templates', 'cv-template.testly.html'), cv);
  if (cover !== null)
    writeFileSync(join(root, 'templates', 'cover-letter-template.testly.html'), cover);
  writeFileSync(join(root, 'previews', 'testly-cv.png'), 'png');
  writeFileSync(join(root, 'previews', 'testly-cover.png'), 'png');
  const packPath = join(root, 'pack.json');
  writeFileSync(packPath, JSON.stringify(manifest, null, 2));
  return { root, packPath, manifest };
}

function problemsFor(opts) {
  const { root, packPath } = buildPack(opts);
  try {
    return validatePack(root, packPath);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const expectProblem = (problems, re) =>
  assert.ok(
    problems.some((p) => re.test(p)),
    `expected a problem matching ${re}, got:\n${problems.join('\n') || '(none)'}`,
  );

// ---------- contrast math ----------

test('contrastOnWhite: black is 21, AA-boundary gray ~4.5', () => {
  assert.equal(contrastOnWhite('#000000'), 21);
  const g = contrastOnWhite('#767676');
  assert.ok(g > 4.4 && g < 4.7, `#767676 should be ~4.54, got ${g}`);
});

// ---------- happy path ----------

test('a fully valid pack has zero problems', () => {
  const problems = problemsFor({});
  assert.deepEqual(problems, []);
});

// ---------- manifest shape ----------

test('rejects wrong packVersion', () => {
  const m = baseManifest();
  m.packVersion = 2;
  expectProblem(problemsFor({ manifest: m }), /packVersion/);
});

test('rejects name that does not equal prefix + id', () => {
  const m = baseManifest();
  m.name = 'career-ops-template-other';
  expectProblem(problemsFor({ manifest: m }), /name.*career-ops-template-testpack/);
});

test('rejects bad pack id', () => {
  const m = baseManifest();
  m.id = 'Bad_Id';
  m.name = 'career-ops-template-Bad_Id';
  expectProblem(problemsFor({ manifest: m }), /id/);
});

test('rejects missing required pack fields', () => {
  const m = baseManifest();
  delete m.license;
  expectProblem(problemsFor({ manifest: m }), /license/);
});

test('rejects empty templates array', () => {
  const m = baseManifest();
  m.templates = [];
  expectProblem(problemsFor({ manifest: m }), /templates/);
});

// ---------- template entries ----------

test('rejects duplicate template ids', () => {
  const m = baseManifest();
  m.templates.push(structuredClone(m.templates[0]));
  expectProblem(problemsFor({ manifest: m }), /duplicate.*testly/i);
});

test('rejects invalid kind', () => {
  const m = baseManifest();
  m.templates[0].kind = 'poster';
  expectProblem(problemsFor({ manifest: m }), /kind/);
});

test('design-forward atsRisk requires a disclosure note', () => {
  const m = baseManifest();
  m.templates[0].atsRisk = 'design-forward';
  expectProblem(problemsFor({ manifest: m }), /atsRiskNote/);
});

test('rejects duplicate lever coordinate {face, axis, header}', () => {
  const m = baseManifest();
  const clone = structuredClone(m.templates[0]);
  clone.id = 'testly2';
  clone.displayName = 'Testly Two';
  // same face/axis/header as testly -> collision even with different accent
  clone.accent = { hex: null, contrastOnWhite: null, grayscaleSafe: true };
  clone.kind = 'cv';
  clone.files = { cv: 'templates/cv-template.testly.html' };
  clone.previews = { cv: 'previews/testly-cv.png' };
  m.templates.push(clone);
  expectProblem(problemsFor({ manifest: m }), /lever coordinate/i);
});

test('rejects filename that does not match convention for the id', () => {
  const m = baseManifest();
  m.templates[0].files.cv = 'templates/cv-template.wrongname.html';
  expectProblem(problemsFor({ manifest: m }), /convention|filename/i);
});

test('rejects missing template file on disk', () => {
  expectProblem(problemsFor({ cv: null }), /not found|missing file/i);
});

test('rejects manifest contrast that disagrees with computed', () => {
  const m = baseManifest();
  m.templates[0].accent.contrastOnWhite = 12.34;
  expectProblem(problemsFor({ manifest: m }), /contrast/i);
});

test('rejects accent contrast below 4.5', () => {
  const m = baseManifest();
  m.templates[0].accent.hex = '#DDCC00';
  m.templates[0].accent.contrastOnWhite = contrastOnWhite('#DDCC00');
  const cv = cvTemplate().replaceAll('#33356B', '#DDCC00');
  const cover = coverTemplate().replaceAll('#33356B', '#DDCC00');
  expectProblem(problemsFor({ manifest: m, cv, cover }), /4\.5|contrast/i);
});

// ---------- HTML: placeholder completeness ----------

test('rejects CV missing a required placeholder', () => {
  const missing = CV_PLACEHOLDERS.filter((p) => p !== 'SUMMARY_TEXT');
  expectProblem(problemsFor({ cv: cvTemplate({ placeholders: missing }) }), /SUMMARY_TEXT/);
});

test('rejects cover letter missing a required placeholder', () => {
  const missing = COVER_PLACEHOLDERS.filter((p) => p !== 'OPENING');
  expectProblem(problemsFor({ cover: coverTemplate({ placeholders: missing }) }), /OPENING/);
});

test('cover contract requires the RECIPIENT_BLOCK slot', () => {
  assert.ok(
    COVER_PLACEHOLDERS.includes('RECIPIENT_BLOCK'),
    'RECIPIENT_BLOCK must be in the cover contract',
  );
  const missing = COVER_PLACEHOLDERS.filter((p) => p !== 'RECIPIENT_BLOCK');
  expectProblem(
    problemsFor({ cover: coverTemplate({ placeholders: missing }) }),
    /RECIPIENT_BLOCK/,
  );
});

// ---------- HTML: meta block ----------

test('rejects missing career-ops-template meta block', () => {
  expectProblem(
    problemsFor({ cv: cvTemplate({ meta: '<!-- not a meta block -->' }) }),
    /meta block/i,
  );
});

test('rejects meta name that disagrees with manifest displayName', () => {
  const meta = CV_META.replace('name: Testly', 'name: Something Else');
  expectProblem(problemsFor({ cv: cvTemplate({ meta }) }), /displayName|meta name/i);
});

// ---------- HTML: ATS lint ----------

test('rejects @font-face', () => {
  const cv = cvTemplate({ extraCss: '@font-face { font-family: X; src: url(x.woff2); }' });
  expectProblem(problemsFor({ cv }), /font-face|webfont/i);
});

test('rejects external font <link>', () => {
  const cv = cvTemplate({
    bodyExtra: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">',
  });
  expectProblem(problemsFor({ cv }), /link|webfont/i);
});

test('rejects <table>', () => {
  const cv = cvTemplate({ bodyExtra: '<table><tr><td>x</td></tr></table>' });
  expectProblem(problemsFor({ cv }), /table/i);
});

test('rejects <img> and <svg>', () => {
  const cv = cvTemplate({ bodyExtra: '<img src="x.png" alt="">' });
  expectProblem(problemsFor({ cv }), /img|svg|image/i);
  const cv2 = cvTemplate({ bodyExtra: '<svg viewBox="0 0 1 1"></svg>' });
  expectProblem(problemsFor({ cv: cv2 }), /img|svg|image/i);
});

test('rejects page-level CSS columns but allows competency columns', () => {
  const bad = cvTemplate({ extraCss: 'body { column-count: 2; }' });
  expectProblem(problemsFor({ cv: bad }), /column/i);
  const ok = cvTemplate({ extraCss: '.competencies { column-count: 3; }' });
  assert.deepEqual(problemsFor({ cv: ok }), []);
});

test('rejects missing ligature disable', () => {
  const cv = cvTemplate()
    .replace(/font-variant-ligatures: none;/g, '')
    .replace(/font-feature-settings[^;]+;/g, '');
  expectProblem(problemsFor({ cv }), /ligature/i);
});

test('rejects font sizes under 10pt', () => {
  const cv = cvTemplate({ extraCss: '.fine-print { font-size: 8pt; }' });
  expectProblem(problemsFor({ cv }), /10pt|font-size/i);
});

test('rejects px font sizes (print contract requires pt)', () => {
  const cv = cvTemplate({ extraCss: '.body-note { font-size: 11px; }' });
  expectProblem(problemsFor({ cv }), /pt units|px/i);
});

test('rejects page-level horizontal padding (renderer @page margin is the single source)', () => {
  const cv = cvTemplate({ extraCss: '.page { padding: 0.55in 0.6in; }' });
  expectProblem(problemsFor({ cv }), /page-level.*padding|horizontal padding/i);
  const ok = cvTemplate({ extraCss: '.page { padding: 2px 0; }' });
  assert.deepEqual(problemsFor({ cv: ok }), []);
});

test('rejects accent on letter furniture (greeting/valediction/signature), even as border', () => {
  const cover = coverTemplate().replace('</style>', '.signature { color: #33356B; }\n</style>');
  expectProblem(problemsFor({ cover }), /furniture|greeting|signature/i);
  const cover2 = coverTemplate().replace(
    '</style>',
    '.greeting { border-bottom: 1px solid #33356B; }\n</style>',
  );
  expectProblem(problemsFor({ cover: cover2 }), /furniture|greeting|signature/i);
});

// ---------- HTML: critique gates ----------

test('rejects accent color in body/bullet scope (color on li)', () => {
  const cv = cvTemplate({ extraCss: 'li strong { color: #33356B; }' });
  expectProblem(problemsFor({ cv }), /accent scope/i);
});

test('allows accent on borders anywhere (spine), and on header-ish selectors', () => {
  const cv = cvTemplate({
    extraCss: '.jobs-spine { border-left: 2px solid #33356B; } .sec-label { color: #33356B; }',
  });
  assert.deepEqual(problemsFor({ cv }), []);
});

test('rejects glyph-decoration runs in markup', () => {
  const cv = cvTemplate({ bodyExtra: '<div>——— SECTION ———</div>' });
  expectProblem(problemsFor({ cv }), /glyph/i);
});
