# GleeWorld Manual (Phase C — PDF Booklet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Generate a print-ready PDF booklet of the manual from the same `docs/manual/` Markdown, downloadable from the site.

**Architecture:** A Node build script reads `_meta.json` + pages (nav order), converts Markdown to HTML with `marked`, resolves internal `.md` links to in-document anchors, assembles one styled HTML document (cover → table of contents → chapters), and renders it to PDF with `puppeteer-core` driving the system-installed Chrome (no Chromium download). Output lands in `public/` so the SPA serves it, and the docs header links to it.

**Tech Stack:** Node ESM, `marked`, `puppeteer-core` (devDeps), system Google Chrome.

## Global Constraints

- Single source: read `docs/manual/`; never fork the content. `[VERIFY]` markers are already stripped from published pages.
- Exclude `_factsheets/` and `STYLE.md` (internal).
- Output: `public/GleeWorld_User_Manual.pdf` (served at `/GleeWorld_User_Manual.pdf`).
- Chrome path (macOS): `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; allow override via `CHROME_PATH` env.
- Dates fixed at `2026-07-08`; no `Date.now()` in the script (pass a stamp constant).
- Run in the scratchpad clone on branch `docs/gleeworld-manual`.

## File Structure

```
scripts/build-manual-pdf.mjs   # generator: markdown → HTML → PDF
public/GleeWorld_User_Manual.pdf  # generated artifact (committed for download)
package.json                   # + "manual:pdf" script, + marked, puppeteer-core devDeps
src/features/docs/DocsApp.tsx  # + "Download PDF" link in header
```

---

### Task 1: Add dev dependencies

- [ ] `bun add -d marked puppeteer-core` → installs both; exit 0.
- [ ] Verify: `node -e "require.resolve('puppeteer-core'); console.log('ok')"` → `ok`.
- [ ] Commit: `chore(docs): add marked + puppeteer-core for PDF build`.

### Task 2: The generator script

**Files:** Create `scripts/build-manual-pdf.mjs`.

Behavior:
- Load `docs/manual/_meta.json`; iterate `nav` → sections → children in order.
- For each page: read the `.md`, parse frontmatter (inline tiny parser), `marked.parse(body)` → HTML.
- Wrap each page in `<section class="page" id="<anchor>">` where `anchor = manualPath.replace(/\.md$/,'').replace(/\//g,'--')`.
- Resolve links: for every `href="X.md..."` in a page's HTML, resolve `X` relative to the current page dir (pop `..`, drop `.`), map to `#<anchor>`; leave `http(s)/mailto/#` untouched.
- Assemble: `<!doctype html>` + print CSS + cover page (title, subtitle "User Manual", "GleeWorld", date) + Table of Contents (sections as headings, pages as anchor links) + all page sections (each `page-break-before`).
- Render with `puppeteer-core`: `launch({ executablePath: CHROME, headless: 'new' })`, `setContent(html, {waitUntil:'networkidle0'})`, `pdf({ path, format:'Letter', printBackground:true, margin, displayHeaderFooter:true, headerTemplate:'<span></span>', footerTemplate:'<div style="width:100%;font-size:9px;color:#888;text-align:center">GleeWorld User Manual · <span class="pageNumber"></span> / <span class="totalPages"></span></div>' })`.
- Log the output path + page/section counts.

- [ ] Write the script (full implementation).
- [ ] Run: `bun run manual:pdf` (after Task 4 adds the script) → PDF written.
- [ ] Commit: `feat(docs): PDF booklet generator`.

### Task 3: "Download PDF" link in the docs header

**Files:** Modify `src/features/docs/DocsApp.tsx`.

- [ ] Add a header link `<a href="/GleeWorld_User_Manual.pdf" ...>` with a Download icon next to "← GleeWorld".
- [ ] Commit with Task 2 or separately.

### Task 4: npm script + generate + verify

**Files:** Modify `package.json` (`"manual:pdf": "node scripts/build-manual-pdf.mjs"`).

- [ ] Add script; run `bun run manual:pdf`; confirm `public/GleeWorld_User_Manual.pdf` exists and is non-trivial in size.
- [ ] Verify by opening the PDF (read pages): cover present, TOC lists all sections, chapters render formatted, page numbers in footer, no `[VERIFY]` text.
- [ ] Rebuild app (`bun run build`) so the PDF is copied into `dist/`; confirm `dist/GleeWorld_User_Manual.pdf` exists.
- [ ] Commit the generated PDF + package.json; push.

## Self-Review

- Single-source: reads `docs/manual` only (Task 2). ✓
- Internal exclusion: `_factsheets`/`STYLE.md` skipped (Task 2). ✓
- Downloadable: output in `public/`, linked in header (Tasks 2–4). ✓
- No new runtime deps: `marked`/`puppeteer-core` are devDeps; Chrome is system-installed. ✓
