// Build a print-ready PDF booklet from docs/manual (single source of truth).
// Markdown -> HTML (marked) -> PDF (puppeteer-core + system Chrome). No Chromium download.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { marked } from "marked";
import puppeteer from "puppeteer-core";

const ROOT = "docs/manual";
const OUT = "public/GleeWorld_User_Manual.pdf";
const DATE = "2026-07-08";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fm = {};
  for (const line of raw.slice(3, end).trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: raw.slice(end + 4).replace(/^\n+/, "") };
}

const anchorFor = (manualPath) => manualPath.replace(/\.md$/, "").replace(/\//g, "--");

// Resolve a relative .md href from the current page dir to a manual path.
function resolveManualPath(currentPath, href) {
  const dir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const stack = dir ? dir.split("/") : [];
  for (const part of href.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const meta = JSON.parse(readFileSync(join(ROOT, "_meta.json"), "utf8"));

let toc = "";
let chapters = "";
let sectionCount = 0;
let pageCount = 0;

for (const sec of meta.nav) {
  const children = (sec.children || []).filter((c) => c.path && existsSync(join(ROOT, c.path)));
  if (!children.length) continue;
  sectionCount++;
  toc += `<li class="toc-section">${esc(sec.title)}<ul>`;
  for (const child of children) {
    const raw = readFileSync(join(ROOT, child.path), "utf8");
    const { fm, body } = parseFrontmatter(raw);
    const title = fm.title || child.title;
    const anchor = anchorFor(child.path);
    pageCount++;
    toc += `<li><a href="#${anchor}">${esc(title)}</a></li>`;

    let html = marked.parse(body, { mangle: false, headerIds: false });
    // Rewrite internal .md links to in-document anchors.
    html = html.replace(/href="([^"]+)"/g, (m, href) => {
      if (/^(https?:|mailto:|#)/i.test(href)) return m;
      if (!href.endsWith(".md")) return m;
      return `href="#${anchorFor(resolveManualPath(child.path, href))}"`;
    });
    chapters += `<section class="page" id="${anchor}"><div class="eyebrow">${esc(sec.title)}</div>${html}</section>`;
  }
  toc += `</ul></li>`;
}

const css = `
  :root { --accent: #6d28d9; --ink: #1f2937; --muted: #6b7280; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: var(--ink); font-size: 11pt; line-height: 1.55; margin: 0; }
  h1, h2, h3, h4, .brand, .eyebrow, .toc h2 { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  a { color: var(--accent); text-decoration: none; }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 0.85em; background: #f3f4f6; padding: 0.1em 0.35em; border-radius: 4px; }
  pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
  blockquote { margin: 1em 0; padding: 0.4em 1em; border-left: 3px solid var(--accent); background: #faf5ff; color: #4b5563; }
  h1 { font-size: 22pt; color: var(--ink); margin: 0 0 0.3em; }
  h2 { font-size: 15pt; color: var(--accent); margin: 1.4em 0 0.4em; }
  h3 { font-size: 12.5pt; margin: 1.1em 0 0.3em; }
  ul, ol { padding-left: 1.3em; }
  li { margin: 0.2em 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10pt; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  th { background: #f9fafb; }
  .page { page-break-before: always; }
  .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 8.5pt; color: var(--accent); font-weight: 600; margin-bottom: 0.2em; }

  .cover { height: 9.3in; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .cover .brand { font-size: 40pt; font-weight: 800; color: var(--accent); letter-spacing: -0.02em; }
  .cover .subtitle { font-size: 20pt; margin-top: 0.1em; color: var(--ink); font-family: Georgia, serif; font-style: italic; }
  .cover .tagline { margin-top: 1.2em; font-size: 12pt; color: var(--muted); }
  .cover .version { margin-top: 2.5em; font-size: 10.5pt; color: var(--muted); }
  .cover .rule { width: 80px; height: 4px; background: var(--accent); margin: 1.4em auto; border-radius: 2px; }

  .toc { page-break-before: always; }
  .toc h2 { color: var(--ink); font-size: 18pt; border-bottom: 2px solid var(--accent); padding-bottom: 0.2em; }
  .toc ul { list-style: none; padding-left: 0; }
  .toc > ul > li.toc-section { font-family: -apple-system, "Segoe UI", sans-serif; font-weight: 700; margin-top: 0.9em; color: var(--ink); }
  .toc > ul > li.toc-section > ul { margin: 0.3em 0 0; padding-left: 0.8em; }
  .toc > ul > li.toc-section > ul > li { font-family: Georgia, serif; font-weight: 400; }
  .toc a { color: var(--ink); }
`;

const cover = `
  <div class="cover">
    <div class="brand">GleeWorld</div>
    <div class="rule"></div>
    <div class="subtitle">User Manual</div>
    <div class="tagline">Run your music program. Beautifully.</div>
    <div class="version">Version 1.0 &middot; July 2026</div>
  </div>`;

const tocHtml = `<div class="toc"><h2>Contents</h2><ul>${toc}</ul></div>`;

const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body>${cover}${tocHtml}${chapters}</body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent(doc, { waitUntil: "networkidle0" });
await page.pdf({
  path: OUT,
  format: "Letter",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:9px;color:#9ca3af;text-align:center;font-family:sans-serif;">GleeWorld User Manual &nbsp;&middot;&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: "0.55in", bottom: "0.7in", left: "0.85in", right: "0.85in" },
});
await browser.close();

console.log(`Wrote ${OUT} — ${sectionCount} sections, ${pageCount} pages (generated ${DATE}).`);
