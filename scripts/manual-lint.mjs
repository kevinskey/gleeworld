// scripts/manual-lint.mjs — validates docs/manual single-source content.
// No external deps, no time APIs (dates are authored, not generated).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = "docs/manual";
const REQUIRED = ["title", "audience", "order", "summary", "updated"];
const AUDIENCES = new Set(["tenant", "student", "fan", "all"]);
const BANNED = [/\balumnae?\b/i, /\balumni\b/i]; // hard-fail terms in user copy
const ADVISORY = [/\bsingers\b/i, /\bmembers\b/i]; // soft warnings
const strict = process.argv.includes("--strict");
let errors = [], warnings = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function parseFrontmatter(text, file) {
  if (!text.startsWith("---")) { errors.push(`${file}: missing frontmatter`); return null; }
  const end = text.indexOf("\n---", 3);
  if (end === -1) { errors.push(`${file}: unterminated frontmatter`); return null; }
  const fm = {};
  for (const line of text.slice(3, end).trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: text.slice(end + 4) };
}

const files = existsSync(ROOT) ? walk(ROOT) : [];
for (const file of files) {
  if (file.includes("/_factsheets/")) continue; // factsheets are internal, not user pages
  if (file.endsWith("STYLE.md")) continue;
  const text = readFileSync(file, "utf8");
  const parsed = parseFrontmatter(text, file);
  if (!parsed) continue;
  const { fm, body } = parsed;
  for (const k of REQUIRED) if (!fm[k]) errors.push(`${file}: frontmatter missing '${k}'`);
  if (fm.audience && !AUDIENCES.has(fm.audience)) errors.push(`${file}: bad audience '${fm.audience}'`);
  for (const re of BANNED) if (re.test(body)) errors.push(`${file}: banned term ${re}`);
  for (const re of ADVISORY) if (re.test(body)) warnings.push(`${file}: advisory term ${re}`);
  for (const m of body.matchAll(/\[VERIFY[^\]]*\]/g)) {
    (strict ? errors : warnings).push(`${file}: unresolved ${m[0]}`);
  }
  // internal relative links resolve
  for (const m of body.matchAll(/\]\((\.[^)]+\.md)[^)]*\)/g)) {
    const target = resolve(dirname(file), m[1]);
    if (!existsSync(target)) errors.push(`${file}: dead link ${m[1]}`);
  }
}

// _meta.json integrity
const metaPath = join(ROOT, "_meta.json");
if (existsSync(metaPath)) {
  let meta;
  try { meta = JSON.parse(readFileSync(metaPath, "utf8")); }
  catch (e) { errors.push(`_meta.json: invalid JSON (${e.message})`); }
  if (meta) {
    const referenced = new Set();
    const collect = (nodes) => nodes.forEach((n) => {
      if (n.path) { referenced.add(resolve(ROOT, n.path)); if (!existsSync(resolve(ROOT, n.path))) errors.push(`_meta.json: references missing ${n.path}`); }
      if (n.children) collect(n.children);
    });
    if (Array.isArray(meta.nav)) collect(meta.nav);
    else errors.push(`_meta.json: missing 'nav' array`);
    for (const file of files) {
      if (file.includes("/_factsheets/") || file.endsWith("STYLE.md")) continue;
      if (!referenced.has(resolve(file))) warnings.push(`${file}: not referenced in _meta.json`);
    }
  }
}

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${files.length} files · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
