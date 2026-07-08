# GleeWorld Manual — Phase C: PDF booklet generator

**Status:** SHIPPED 2026-07-08 · Spec: `docs/superpowers/specs/2026-07-08-gleeworld-manual-docs-design.md`

## Goal
Render the single-source manual (`docs/manual/*.md` + `_meta.json`, the same
content Phase B serves at `/docs`) into a distributable PDF booklet —
`GleeWorld_User_Manual.pdf` — with a cover, table of contents, and per-section
pagination.

## Approach (no puppeteer / no Chromium download / no network)
`scripts/manual-pdf.mjs`:
1. Read `docs/manual/_meta.json` for the ordered nav tree (sections → pages).
2. For each page: read the Markdown, strip YAML frontmatter (`js-yaml`), take
   the title from frontmatter/`_meta`, drop the duplicate leading H1.
3. Markdown → HTML via the existing `unified` stack
   (`remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-stringify` —
   only `rehype-stringify` was added, a tiny pure-JS dep).
4. Assemble one print-optimized, self-contained HTML: cover page, generated
   TOC, sections with `page-break-before`, print `@page` margins + typography.
   Missing files referenced by `_meta.json` are warned + skipped (never crash).
5. Print to PDF with **headless Chrome** (`--headless=new --print-to-pdf`,
   auto-detected macOS path or `CHROME_BIN`). If Chrome is absent, the HTML is
   still written — open it and Print → Save as PDF.

Output → `docs/manual/dist/` (gitignored build artifact). Run: `npm run manual:pdf`.

## Verified
- 7 sections, 32 pages assembled → **67-page Letter PDF**, 1.25 MB.
- pdftotext word count (15,812) matches the HTML (15,739) — nothing truncated.
- `npm run manual:lint` still 0 errors; `npm run build` unaffected.

## Not in scope
- Phase D (in-app help drawer / onboarding deep-linking into `/docs`) — future.
- Committing the generated PDF (it's a build artifact; regenerate on demand).
