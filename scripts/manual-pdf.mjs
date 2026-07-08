#!/usr/bin/env node
// Phase C — GleeWorld User Manual PDF booklet generator.
//
// Single source of truth: docs/manual/*.md + _meta.json (same content Phase B
// renders at /docs). This assembles every page, in _meta.json nav order, into
// one print-optimized HTML booklet (cover + table of contents + sections with
// page breaks), then prints it to PDF with headless Chrome — no puppeteer /
// Chromium download, no network. Output lands in docs/manual/dist/ (gitignored;
// it's a build artifact).
//
//   npm run manual:pdf
//
// Chrome path is auto-detected (macOS default) or overridden with CHROME_BIN.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANUAL_DIR = join(ROOT, 'docs', 'manual');
const OUT_DIR = join(MANUAL_DIR, 'dist');
const HTML_OUT = join(OUT_DIR, 'GleeWorld_User_Manual.html');
const PDF_OUT = join(OUT_DIR, 'GleeWorld_User_Manual.pdf');

const md = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

/** Strip YAML frontmatter, returning { fm, body }. */
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: raw };
  let fm = {};
  try { fm = yaml.load(raw.slice(3, end)) || {}; } catch { fm = {}; }
  return { fm, body: raw.slice(end + 4).replace(/^\s*\n/, '') };
}

const slug = (p) => p.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render one manual page → { id, title, html } or null if the file is missing. */
function renderPage(relPath, navTitle) {
  const abs = join(MANUAL_DIR, relPath);
  if (!existsSync(abs)) {
    console.warn(`  ⚠ missing (skipped): ${relPath}`);
    return null;
  }
  const { fm, body } = parseFrontmatter(readFileSync(abs, 'utf8'));
  const title = fm.title || navTitle || relPath;
  // Drop a leading H1 that duplicates the title — we print our own page header.
  const body2 = body.replace(/^\s*#\s+.*\n/, '');
  const html = String(md.processSync(body2));
  return { id: slug(relPath), title, html };
}

function main() {
  const meta = JSON.parse(readFileSync(join(MANUAL_DIR, '_meta.json'), 'utf8'));
  const sections = [];
  let pageCount = 0;
  for (const section of meta.nav || []) {
    const pages = [];
    for (const child of section.children || []) {
      const page = renderPage(child.path, child.title);
      if (page) { pages.push(page); pageCount++; }
    }
    if (pages.length) sections.push({ id: slug(section.title), title: section.title, pages });
  }

  const toc = sections.map((s) => `
    <li><a href="#${s.id}">${esc(s.title)}</a>
      <ul>${s.pages.map((p) => `<li><a href="#${p.id}">${esc(p.title)}</a></li>`).join('')}</ul>
    </li>`).join('');

  const bodyHtml = sections.map((s) => `
    <section class="section" id="${s.id}">
      <h1 class="section-title">${esc(s.title)}</h1>
      ${s.pages.map((p) => `
        <article class="page" id="${p.id}">
          <h2 class="page-title">${esc(p.title)}</h2>
          ${p.html}
        </article>`).join('')}
    </section>`).join('');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(meta.title || 'GleeWorld User Manual')}</title>
<style>
  @page { size: Letter; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 11pt/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a2e; margin: 0; }
  a { color: #2563eb; text-decoration: none; }
  h1, h2, h3, h4 { line-height: 1.25; color: #0f0f2e; }
  code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em; background: #f2f2f7; padding: 0.1em 0.35em; border-radius: 4px; }
  pre { background: #f2f2f7; padding: 12px 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.95em; }
  th, td { border: 1px solid #d8d8e0; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f2f2f7; }
  blockquote { border-left: 3px solid #2563eb; margin: 12px 0; padding: 2px 14px; color: #444; }
  img { max-width: 100%; }
  .cover { display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center; height: 100vh; page-break-after: always; }
  .cover .brand { font-size: 15pt; letter-spacing: 0.35em; text-transform: uppercase; color: #2563eb; margin-bottom: 18px; }
  .cover h1 { font-size: 34pt; margin: 0 0 10px; }
  .cover .sub { color: #555; font-size: 13pt; }
  .cover .updated { margin-top: 40px; color: #888; font-size: 10pt; }
  .toc { page-break-after: always; }
  .toc h1 { font-size: 20pt; border-bottom: 2px solid #e5e5ea; padding-bottom: 8px; }
  .toc ul { list-style: none; padding-left: 0; }
  .toc > ul > li { margin: 10px 0; font-weight: 600; }
  .toc ul ul { padding-left: 18px; font-weight: 400; margin: 4px 0; }
  .toc ul ul li { margin: 2px 0; color: #333; }
  .section { page-break-before: always; }
  .section-title { font-size: 22pt; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-bottom: 4px; }
  .page { page-break-inside: auto; margin-top: 22px; }
  .page-title { font-size: 15pt; margin: 18px 0 8px; padding-top: 6px; border-top: 1px solid #eee; }
  .section > .page:first-of-type { margin-top: 8px; }
  .section > .page:first-of-type .page-title { border-top: none; }
</style></head><body>
  <div class="cover">
    <div class="brand">GleeWorld</div>
    <h1>${esc(meta.title || 'User Manual')}</h1>
    <div class="sub">The complete guide for directors, students, and fans</div>
    <div class="updated">Updated ${esc(meta.updated || '')}</div>
  </div>
  <nav class="toc"><h1>Contents</h1><ul>${toc}</ul></nav>
  ${bodyHtml}
</body></html>`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(HTML_OUT, html, 'utf8');
  console.log(`✓ HTML booklet: ${HTML_OUT} (${sections.length} sections, ${pageCount} pages)`);

  // Print to PDF with headless Chrome — no bundled Chromium, no network.
  const chrome = process.env.CHROME_BIN
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!existsSync(chrome)) {
    console.warn(`\n⚠ Chrome not found at ${chrome}. HTML written — open it and Print → Save as PDF,`);
    console.warn('  or set CHROME_BIN to your Chrome/Chromium binary and re-run.');
    return;
  }
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw', '--virtual-time-budget=15000',
      `--print-to-pdf=${PDF_OUT}`, `file://${HTML_OUT}`,
    ], { stdio: 'ignore' });
    console.log(`✓ PDF booklet: ${PDF_OUT}`);
  } catch (e) {
    console.warn(`\n⚠ Chrome print-to-pdf failed (${e.message}). The HTML is ready at ${HTML_OUT} — open it and Print → Save as PDF.`);
  }
}

main();
