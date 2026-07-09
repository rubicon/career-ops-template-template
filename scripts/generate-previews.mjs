#!/usr/bin/env node
// generate-previews.mjs — regenerate the preview PNGs for this pack.
//
// Two steps: FILL (pure string substitution, no browser) then RENDER
// (Playwright screenshot at 1224x1584 = 8.5x11in at 144dpi). The fill step is
// exported and browser-free so test/previews-fill.test.mjs can assert every
// template's placeholders are covered by sample-cv.json without installing a
// browser.
//
// Usage:
//   node scripts/generate-previews.mjs            # all templates in pack.json
//   node scripts/generate-previews.mjs ledger     # one or more theme ids
//
// Playwright is intentionally NOT a dependency (this repo stays passive data).
// Install it on demand:  npm run previews:setup
//
// The previews APPROXIMATE the authoritative career-ops render (generate-pdf.mjs,
// which uses @page + preferCSSPageSize). This script mimics the ~0.6in print
// margin with a screen-only padding rule so the screenshot matches the printed
// page closely, not pixel-for-pixel. Coupling the pack to career-ops core would
// be the worse trade.

import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SECTION_LABELS = {
  SECTION_SUMMARY: 'Professional Summary',
  SECTION_COMPETENCIES: 'Core Competencies',
  SECTION_EXPERIENCE: 'Work Experience',
  SECTION_PROJECTS: 'Projects',
  SECTION_EDUCATION: 'Education',
  SECTION_CERTIFICATIONS: 'Certifications',
  SECTION_SKILLS: 'Skills',
};

const competenciesHtml = (list) =>
  list.map((c) => `<span class="competency-tag">${c}</span>`).join('\n');

const experienceHtml = (jobs) =>
  jobs
    .map(
      (j) => `<div class="job">
  <div class="job-header"><span class="job-company">${j.company}</span><span class="job-period">${j.period}</span></div>
  <div class="job-role">${j.role} · ${j.location}</div>
  <ul>
${j.bullets.map((b) => `    <li>${b}</li>`).join('\n')}
  </ul>
</div>`,
    )
    .join('\n');

const projectsHtml = (projects) =>
  projects
    .map(
      (p) =>
        `<div class="project"><span class="project-title">${p.title}</span><span class="project-badge">${p.year}</span><div class="project-desc">${p.description}</div></div>`,
    )
    .join('\n');

const educationHtml = (edu) =>
  edu
    .map(
      (e) =>
        `<div class="edu-item"><div class="edu-header"><span class="edu-title">${e.degree} — <span class="edu-org">${e.org}</span></span><span class="edu-year">${e.year}</span></div></div>`,
    )
    .join('\n');

const certificationsHtml = (certs) =>
  certs
    .map(
      (c) =>
        `<div class="cert-item"><span class="cert-title">${c.title} — <span class="cert-org">${c.org}</span></span><span class="cert-year">${c.year}</span></div>`,
    )
    .join('\n');

const skillsHtml = (skills) =>
  skills
    .map(
      (s) =>
        `<div class="skill-item"><span class="skill-category">${s.category}:</span> ${s.items}</div>`,
    )
    .join('\n');

// Recipient block for the cover letter. Graceful: skips missing lines, and
// returns "" when nothing is known (the template places {{RECIPIENT_BLOCK}}
// bare, so an empty value renders nothing).
const recipientHtml = (r) => {
  if (!r || typeof r !== 'object') return '';
  const lines = [
    r.name,
    r.title,
    r.company,
    ...(Array.isArray(r.address_lines) ? r.address_lines : []),
  ].filter(Boolean);
  if (!lines.length) return '';
  return `<div class="recipient">\n${lines.map((l) => `    <div>${l}</div>`).join('\n')}\n  </div>`;
};

/** Build the full {{PLACEHOLDER}} -> value map (CV + cover) from sample data. */
export function buildValues(data) {
  const c = data.contact;
  const cov = data.cover || {};
  const contactLine = [c.location, c.phone, c.email, c.linkedin_display]
    .filter(Boolean)
    .join(' · ');
  return {
    // CV
    LANG: 'en',
    PAGE_WIDTH: '8.5in',
    PHOTO: '',
    NAME: c.name,
    PHONE: c.phone,
    EMAIL: c.email,
    LINKEDIN_URL: c.linkedin_url,
    LINKEDIN_DISPLAY: c.linkedin_display,
    PORTFOLIO_URL: c.portfolio_url,
    PORTFOLIO_DISPLAY: c.portfolio_display,
    LOCATION: c.location,
    SUMMARY_TEXT: data.summary,
    COMPETENCIES: competenciesHtml(data.competencies),
    EXPERIENCE: experienceHtml(data.experience),
    PROJECTS: projectsHtml(data.projects),
    EDUCATION: educationHtml(data.education),
    CERTIFICATIONS: certificationsHtml(data.certifications),
    SKILLS: skillsHtml(data.skills),
    ...SECTION_LABELS,
    // Cover letter
    ROLE_TITLE: cov.role_title,
    CONTACT_LINE: contactLine,
    DATELINE: cov.dateline,
    RECIPIENT_BLOCK: recipientHtml(cov.recipient),
    GREETING_BLOCK: cov.greeting ? `<p class="greeting">${cov.greeting}</p>` : '',
    OPENING: cov.opening,
    PROFILE_INTRO: cov.profile_intro,
    ACHIEVEMENTS_BLOCK:
      cov.achievements && cov.achievements.length
        ? `<ul class="achievements">\n${cov.achievements.map((a) => `  <li>${a}</li>`).join('\n')}\n</ul>`
        : '',
    PROBLEMS_BLOCK: '',
    CREDENTIALS_BLOCK: '',
    CLOSING_BLOCK: `<p>${cov.closing}</p>\n<p>Sincerely,</p>\n<p class="signature">${c.name}</p>`,
    LANGUAGE_CLOSING_BLOCK: '',
    FOOTNOTES_BLOCK: '',
  };
}

/** Substitute every {{TOKEN}} present in the map; leave unknown tokens intact. */
export function fillTemplate(html, values) {
  return html.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) => (key in values ? values[key] : token));
}

/** Load pack.json and the sample data. */
export function loadPack(root = ROOT) {
  const pack = JSON.parse(readFileSync(join(root, 'pack.json'), 'utf-8'));
  const data = JSON.parse(readFileSync(join(root, 'sample-cv.json'), 'utf-8'));
  return { pack, data };
}

// ---- CLI (render) ----
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const wanted = new Set(process.argv.slice(2));
  const { pack, data } = loadPack();
  const values = buildValues(data);

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(
      'Playwright is not installed (it is intentionally not a dependency of this pack).\n' +
        'Install it on demand, then re-run:\n' +
        '  npm run previews:setup\n' +
        '  npm run previews',
    );
    process.exit(1);
  }

  // Screen-only padding mimics the ~0.6in @page margin of the authoritative
  // career-ops render so the screenshot matches the printed page.
  const screenMargin =
    '<style>@media screen { html, body { background: #fff; } body { padding: 0.6in; } }</style>';

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 816, height: 1056 },
    deviceScaleFactor: 1.5,
  });

  let rendered = 0;
  for (const t of pack.templates) {
    if (wanted.size && !wanted.has(t.id)) continue;
    const kinds = t.kind === 'both' ? ['cv', 'cover'] : [t.kind];
    for (const kind of kinds) {
      const src = t.files[kind];
      const out = t.previews[kind];
      if (!src || !out) continue;
      const html = fillTemplate(readFileSync(join(ROOT, src), 'utf-8'), values).replace(
        '</head>',
        `${screenMargin}\n</head>`,
      );
      mkdirSync(join(ROOT, dirname(out)), { recursive: true });
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({
        path: join(ROOT, out),
        clip: { x: 0, y: 0, width: 816, height: 1056 },
      });
      console.log(`rendered ${out}`);
      rendered++;
    }
  }
  await browser.close();

  if (wanted.size) {
    const known = new Set(pack.templates.map((t) => t.id));
    for (const id of wanted)
      if (!known.has(id)) console.error(`warning: no template with id "${id}" in pack.json`);
  }
  console.log(`\n${rendered} preview(s) rendered.`);
  if (rendered === 0) process.exit(1);
}
