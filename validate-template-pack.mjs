#!/usr/bin/env node
// @ts-check
// validate-template-pack.mjs — deterministic shape + ATS gate for template
// packs (pack.json + the template files it declares). Sibling of
// validate-plugin-registry.mjs; run locally and by pack CI. No network, no
// dependencies: JSON.parse + fs + regex. See docs/template-packs/ for the
// manifest schema and the design-lever taxonomy these rules come from.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const NAME_PREFIX = 'career-ops-template-';
const KINDS = new Set(['cv', 'cover', 'both']);
const ATS_RISKS = new Set(['none', 'design-forward']);
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// Placeholder contracts (the full slot sets of the base templates; the
// resolver's own minimum lives in cv-templates.mjs KINDS — this is stricter
// on purpose: a pack template must fill every slot the pdf/cover modes emit).
export const CV_PLACEHOLDERS = [
  'LANG',
  'PAGE_WIDTH',
  'PHOTO',
  'NAME',
  'PHONE',
  'EMAIL',
  'LINKEDIN_URL',
  'LINKEDIN_DISPLAY',
  'PORTFOLIO_URL',
  'PORTFOLIO_DISPLAY',
  'LOCATION',
  'SECTION_SUMMARY',
  'SUMMARY_TEXT',
  'SECTION_COMPETENCIES',
  'COMPETENCIES',
  'SECTION_EXPERIENCE',
  'EXPERIENCE',
  'SECTION_PROJECTS',
  'PROJECTS',
  'SECTION_EDUCATION',
  'EDUCATION',
  'SECTION_CERTIFICATIONS',
  'CERTIFICATIONS',
  'SECTION_SKILLS',
  'SKILLS',
];
export const COVER_PLACEHOLDERS = [
  'NAME',
  'ROLE_TITLE',
  'CONTACT_LINE',
  'DATELINE',
  'RECIPIENT_BLOCK',
  'GREETING_BLOCK',
  'OPENING',
  'PROFILE_INTRO',
  'PROBLEMS_BLOCK',
  'ACHIEVEMENTS_BLOCK',
  'CREDENTIALS_BLOCK',
  'CLOSING_BLOCK',
  'LANGUAGE_CLOSING_BLOCK',
  'FOOTNOTES_BLOCK',
];

// Accent scope (critique rule, pack-wide): a non-border declaration carrying
// the accent hex must sit on a selector that is nameable as a name / header /
// rule / structural-moment element. Border properties are allowed anywhere
// (spines, tabs, bands ARE borders).
const ACCENT_SELECTOR_ALLOW =
  /name|header|head\b|heading|title|rule|band|tab|spine|mast|label|sec\b|sec-|section|dateline|eyebrow/i;

// Letter furniture (salutation, valediction, signature, closing blocks) may
// never carry the accent — not even as a border. Ink only, pack-wide.
const ACCENT_FURNITURE_DENY = /greeting|salutation|valediction|signature|closing/i;

// Glyph-decoration runs (visual devices must be CSS, never literal glyphs).
const GLYPH_RUNS = /[—–―]{2,}|[─-╿]{2,}|[•▪●◆]{2,}|[★☆✦✧]/u;

/** WCAG contrast of a hex color against white, rounded to 2 decimals. */
export function contrastOnWhite(hex) {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(String(hex));
  if (!m) return NaN;
  const chan = (i) => {
    const c = parseInt(m[1].slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * chan(0) + 0.7152 * chan(1) + 0.0722 * chan(2);
  return Math.round(((1 + 0.05) / (L + 0.05)) * 100) / 100;
}

function parseMetaBlock(text) {
  const block = text.match(/<!--\s*career-ops-template\s*([\s\S]*?)-->/);
  if (!block) return null;
  const meta = {};
  for (const line of block[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([a-zA-Z_]+)\s*:\s*(.+?)\s*$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2];
  }
  return meta;
}

/** Crude but sufficient CSS rule iterator over every <style> block. */
function* cssRules(text) {
  const styles = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join('\n');
  // strip comments, then walk `selector { declarations }` pairs (at-rule
  // bodies like @media nest; the inner rules still match this walk).
  const css = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    yield { selector: m[1].trim(), body: m[2] };
  }
}

function lintTemplateFile(relPath, kind, entry, root) {
  const problems = [];
  const abs = path.join(root, relPath);
  const where = `${entry.id}: ${relPath}`;
  if (!existsSync(abs)) return [`${where}: missing file (not found on disk)`];
  const text = readFileSync(abs, 'utf-8');

  // placeholder completeness
  const required = kind === 'cv' ? CV_PLACEHOLDERS : COVER_PLACEHOLDERS;
  for (const ph of required) {
    if (!text.includes(`{{${ph}}}`)) problems.push(`${where}: missing placeholder {{${ph}}}`);
  }

  // meta block + displayName agreement
  const meta = parseMetaBlock(text);
  if (!meta) problems.push(`${where}: missing career-ops-template meta block`);
  else if (meta.name !== entry.displayName) {
    problems.push(
      `${where}: meta name "${meta.name}" disagrees with manifest displayName "${entry.displayName}"`,
    );
  }

  // ATS lint
  if (/@font-face/i.test(text))
    problems.push(`${where}: @font-face forbidden (webfonts corrupt ATS text extraction)`);
  if (/<link\b/i.test(text))
    problems.push(`${where}: <link> forbidden (no external stylesheets/webfonts)`);
  if (/<table\b/i.test(text)) problems.push(`${where}: layout <table> forbidden`);
  if (/<img\b|<svg\b/i.test(text))
    problems.push(
      `${where}: <img>/<svg> forbidden (no images; the {{PHOTO}} slot is filled at generation time)`,
    );
  if (!/font-variant-ligatures/.test(text) || !/"liga"\s*0/.test(text)) {
    problems.push(`${where}: ligature disable missing (font-variant-ligatures: none + "liga" 0)`);
  }
  for (const m of text.matchAll(/font-size\s*:\s*([\d.]+)(px|pt|em|rem|%)/g)) {
    if (m[2] !== 'pt') {
      problems.push(
        `${where}: font-size ${m[1]}${m[2]} — pack templates declare font sizes in pt units only (1px prints at 0.75pt, sinking body copy under the 10pt paper floor)`,
      );
    } else if (parseFloat(m[1]) < 10) {
      problems.push(`${where}: font-size ${m[1]}pt below the 10pt minimum`);
    }
  }

  // Page-level horizontal padding is forbidden: generate-pdf.mjs injects
  // @page { margin } on the render path, so template-side page padding
  // doubles the margins. Vertical-only padding (e.g. "2px 0") is fine.
  for (const rule of cssRules(text)) {
    if (
      !/^(\.page|body|html)\s*(,|$)/.test(rule.selector) &&
      rule.selector !== '.page' &&
      rule.selector !== 'body'
    )
      continue;
    for (const decl of rule.body.split(';')) {
      const dm = decl.match(/^\s*(padding(?:-left|-right)?)\s*:\s*(.+)$/);
      if (!dm) continue;
      const prop = dm[1];
      const vals = dm[2].trim().split(/\s+/);
      let horizontal = [];
      if (prop === 'padding-left' || prop === 'padding-right') horizontal = vals;
      else if (vals.length === 1) horizontal = vals;
      else if (vals.length === 2 || vals.length === 3) horizontal = [vals[1]];
      else if (vals.length === 4) horizontal = [vals[1], vals[3]];
      if (horizontal.some((v) => !/^0(px|pt|in|em|rem|%)?$/.test(v))) {
        problems.push(
          `${where}: page-level horizontal padding on "${rule.selector}" (${decl.trim()}) — the renderer's @page margin is the single source of page margins`,
        );
      }
    }
  }

  // CSS-columns: allowed only on clearly non-page containers (competency
  // grids and similar linear text blocks). Page-level columns break the
  // single-column contract.
  for (const rule of cssRules(text)) {
    if (/(?:^|[^-\w])(?:column-count|columns)\s*:/.test(rule.body)) {
      if (
        /(?:^|[\s,>~+])(?:html|body|main)\b/.test(rule.selector) ||
        /\.page\b/.test(rule.selector)
      ) {
        problems.push(`${where}: page-level CSS columns forbidden (on "${rule.selector}")`);
      }
    }
  }

  // Accent scope (critique gate): non-border accent declarations only on
  // name/header/rule-class selectors.
  const hex = entry.accent && entry.accent.hex;
  if (hex && HEX_RE.test(hex)) {
    const hexRe = new RegExp(hex.replace('#', '#'), 'i');
    for (const rule of cssRules(text)) {
      if (!hexRe.test(rule.body)) continue;
      for (const decl of rule.body.split(';')) {
        if (!hexRe.test(decl)) continue;
        const prop = (decl.split(':')[0] || '').trim().toLowerCase();
        if (ACCENT_FURNITURE_DENY.test(rule.selector)) {
          problems.push(
            `${where}: accent on letter furniture — ${hex} via "${prop}" on "${rule.selector}" (greeting/valediction/signature/closing are ink only, pack-wide)`,
          );
          continue;
        }
        if (prop.startsWith('border')) continue; // rules/spines/tabs/bands are borders — allowed anywhere
        if (!ACCENT_SELECTOR_ALLOW.test(rule.selector)) {
          problems.push(
            `${where}: accent scope violation — ${hex} via "${prop}" on "${rule.selector}" (accent is allowed only on name/header/rule selectors or border properties)`,
          );
        }
      }
    }
  }

  // Glyph decoration: check rendered text (markup minus styles/tags).
  const visible = text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ');
  if (GLYPH_RUNS.test(visible)) {
    problems.push(
      `${where}: glyph decoration detected in markup (visual devices must be CSS borders, never literal glyph runs)`,
    );
  }

  return problems;
}

/** Validate a pack manifest + all files it declares. @returns {string[]} problems */
export function validatePack(root, packPath) {
  const problems = [];
  let pack;
  try {
    pack = JSON.parse(readFileSync(packPath, 'utf-8'));
  } catch (err) {
    return [`pack.json unreadable or invalid JSON: ${err.message}`];
  }

  if (pack.packVersion !== 1)
    problems.push(`unsupported packVersion ${JSON.stringify(pack.packVersion)} (expected 1)`);
  if (!ID_RE.test(pack.id || ''))
    problems.push(`invalid pack id ${JSON.stringify(pack.id)} (must match ${ID_RE})`);
  const expectedName = NAME_PREFIX + pack.id;
  if (pack.name !== expectedName)
    problems.push(`pack name must equal "${expectedName}" (got ${JSON.stringify(pack.name)})`);
  for (const field of [
    'displayName',
    'description',
    'author',
    'homepage',
    'license',
    'version',
    'minCareerOpsVersion',
  ]) {
    if (typeof pack[field] !== 'string' || !pack[field].trim())
      problems.push(`missing or empty pack field: ${field}`);
  }
  if (!Array.isArray(pack.templates) || pack.templates.length === 0) {
    problems.push('templates must be a non-empty array');
    return problems;
  }

  const ids = new Set();
  const coords = new Map();
  for (const entry of pack.templates) {
    const eid = entry.id || '?';
    if (!ID_RE.test(entry.id || '')) problems.push(`${eid}: invalid template id`);
    if (ids.has(entry.id)) problems.push(`duplicate template id: ${entry.id}`);
    ids.add(entry.id);
    for (const field of ['displayName', 'description']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim())
        problems.push(`${eid}: missing or empty ${field}`);
    }
    if (!KINDS.has(entry.kind))
      problems.push(`${eid}: invalid kind ${JSON.stringify(entry.kind)} (cv|cover|both)`);
    if (typeof entry.ats !== 'boolean') problems.push(`${eid}: ats must be a boolean`);
    if (!ATS_RISKS.has(entry.atsRisk))
      problems.push(
        `${eid}: invalid atsRisk ${JSON.stringify(entry.atsRisk)} (none|design-forward)`,
      );
    if (
      entry.atsRisk === 'design-forward' &&
      !(typeof entry.atsRiskNote === 'string' && entry.atsRiskNote.trim())
    ) {
      problems.push(`${eid}: atsRiskNote is required when atsRisk is "design-forward"`);
    }

    // lever coordinate uniqueness on {face, axis, header}
    const lv = entry.levers || {};
    for (const axis of ['face', 'axis', 'header', 'accent', 'density']) {
      if (typeof lv[axis] !== 'string' || !lv[axis].trim())
        problems.push(`${eid}: levers.${axis} missing`);
    }
    const coord = `${lv.face}|${lv.axis}|${lv.header}`;
    if (coords.has(coord))
      problems.push(
        `${eid}: duplicate lever coordinate {face, axis, header} = {${lv.face}, ${lv.axis}, ${lv.header}} (already claimed by ${coords.get(coord)})`,
      );
    else coords.set(coord, eid);

    // accent
    const acc = entry.accent;
    if (!acc || typeof acc !== 'object') problems.push(`${eid}: accent object missing`);
    else {
      if (acc.grayscaleSafe !== true) problems.push(`${eid}: accent.grayscaleSafe must be true`);
      if (acc.hex === null) {
        if (acc.contrastOnWhite !== null)
          problems.push(`${eid}: monochrome theme must set accent.contrastOnWhite to null`);
      } else if (!HEX_RE.test(acc.hex || '')) {
        problems.push(`${eid}: accent.hex must be null or a #RRGGBB hex`);
      } else {
        const computed = contrastOnWhite(acc.hex);
        if (
          typeof acc.contrastOnWhite !== 'number' ||
          Math.abs(acc.contrastOnWhite - computed) > 0.05
        ) {
          problems.push(
            `${eid}: accent.contrastOnWhite ${acc.contrastOnWhite} disagrees with computed contrast ${computed} for ${acc.hex}`,
          );
        }
        if (computed < 4.5)
          problems.push(
            `${eid}: accent contrast ${computed} for ${acc.hex} is below the 4.5 minimum on white`,
          );
      }
    }

    // files + previews per kind, naming convention, then per-file lint
    const wantCv = entry.kind === 'cv' || entry.kind === 'both';
    const wantCover = entry.kind === 'cover' || entry.kind === 'both';
    const files = entry.files || {};
    const previews = entry.previews || {};
    const checkFile = (kind, rel, expectedBase) => {
      if (typeof rel !== 'string' || !rel.trim()) {
        problems.push(`${eid}: files.${kind} missing`);
        return;
      }
      if (path.basename(rel) !== expectedBase) {
        problems.push(
          `${eid}: files.${kind} "${rel}" does not match the filename convention "${expectedBase}"`,
        );
      }
      problems.push(...lintTemplateFile(rel, kind, entry, root));
    };
    if (wantCv) {
      checkFile('cv', files.cv, `cv-template.${entry.id}.html`);
      if (typeof previews.cv !== 'string' || !existsSync(path.join(root, previews.cv || ''))) {
        problems.push(`${eid}: missing preview previews.cv`);
      }
    }
    if (wantCover) {
      checkFile('cover', files.cover, `cover-letter-template.${entry.id}.html`);
      if (
        typeof previews.cover !== 'string' ||
        !existsSync(path.join(root, previews.cover || ''))
      ) {
        problems.push(`${eid}: missing preview previews.cover`);
      }
    }
  }

  return problems;
}

// ---- CLI ----
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const packPath = flag('pack');
  if (!packPath) {
    process.stderr.write(
      'Usage: node validate-template-pack.mjs --pack <pack.json> [--root <dir>]\n',
    );
    process.exit(2);
  }
  const root = flag('root') || process.cwd();
  const problems = validatePack(root, path.resolve(packPath));
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log(`✓ template pack is valid (${path.resolve(packPath)})`);
  process.exit(0);
}
