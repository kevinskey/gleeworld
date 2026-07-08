# GleeWorld Manual (Phase A — Content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the complete v1 GleeWorld user manual as single-source Markdown under `docs/manual/`, covering tenants, students, fans, add-ons, FAQ, and a glossary, verified accurate against the real product.

**Architecture:** Docs-as-code. A ground-truth inventory pass extracts real product facts from the repo into fact sheets; a multi-expert-lens authoring process turns fact sheets into Markdown pages with YAML frontmatter; a runnable `manual-lint` script validates structure, frontmatter, links, terminology, and unresolved `[VERIFY]` markers after every section. Later phases (B: `/docs` route, C: PDF, D: in-app help) render this content unchanged.

**Tech Stack:** Markdown + YAML frontmatter, JSON nav manifest, Node ESM validation script (`node`, no new deps), existing React/Vite app (Phase B, out of scope here).

## Global Constraints

- Content directory: `docs/manual/` — the single source of truth. Do not scatter manual content elsewhere.
- Every page is Markdown with YAML frontmatter fields: `title`, `audience` (`tenant` | `student` | `fan` | `all`), `order` (integer), `summary` (one line), `updated` (`2026-07-08`).
- Navigation is declarative in `docs/manual/_meta.json`; every path it references must exist and every page must be referenced.
- Tenant-neutral voice: GleeWorld = the platform; individual choirs/schools = **tenants**. Never hardcode a single tenant's name (e.g., "Spelman") in shared copy.
- Terminology: use **"students"** (not "singers"/"members") and **"graduates"** (not "alumnae"/"alumna"/"alumni") in user-facing copy.
- Accuracy: every product claim traces to a fact sheet in `docs/manual/_factsheets/`. Behavior that cannot be confirmed from the repo is marked `[VERIFY: <question>]` and surfaced to the user — never guessed.
- House style: task-oriented, second person, imperative, one action per numbered step, prerequisites stated before steps.
- Dates are fixed at `2026-07-08` (no `Date.now()`); the lint script must not call time APIs.
- Work happens on branch `docs/gleeworld-manual` in the scratchpad clone; commit after each task.

---

## File Structure

```
docs/manual/
├── _meta.json                      # declarative nav tree (Task 1 skeleton, Task 8 final)
├── _factsheets/                    # ground-truth facts extracted from the repo (Task 1)
│   ├── platform.md
│   ├── roles-accounts.md
│   ├── tenants.md
│   ├── students.md
│   ├── fans.md
│   └── addons/{box-office,glee-academy,concert-planner,studio-part-tracks,landing-pages,template-courses}.md
├── STYLE.md                        # house style guide (Task 1)
├── getting-started/                # Task 2
├── tenants/                        # Task 3
├── students/                       # Task 4
├── fans/                           # Task 5
├── add-ons/                        # Task 6
├── faq/                            # Task 7
└── glossary.md                     # Task 8

scripts/manual-lint.mjs             # runnable verification (Task 1)
```

Authoring uses the multi-expert panel (Technical Writer, Music Educator, Professional Musician, Publisher/Editor, Student & Fan reviewers). Because the user opted into multi-agent authoring and chose "full v1 then review," each section task may be executed as a small orchestration (draft → review lenses → apply), then validated by `manual-lint`.

---

### Task 1: Scaffolding, style guide, fact sheets, and the lint harness

**Files:**
- Create: `scripts/manual-lint.mjs`
- Create: `docs/manual/STYLE.md`
- Create: `docs/manual/_meta.json` (skeleton)
- Create: `docs/manual/_factsheets/platform.md`, `roles-accounts.md`, `tenants.md`, `students.md`, `fans.md`, and `addons/*.md` (6 files)
- Create: `docs/manual/getting-started/.gitkeep` and one placeholder page to prove the pipeline

**Interfaces:**
- Produces: `manual-lint.mjs` CLI — `node scripts/manual-lint.mjs [--strict]`. Non-strict allows `[VERIFY]` markers (warns); `--strict` fails on them. Exit 0 = pass, 1 = fail.
- Produces: frontmatter contract (fields above) and `_meta.json` shape consumed by every later task and by Phase B.

- [ ] **Step 1: Write the lint script (the "test" every later task runs)**

```js
// scripts/manual-lint.mjs — validates docs/manual single-source content.
// No external deps, no time APIs (dates are authored, not generated).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";

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
```

- [ ] **Step 2: Run the lint on an empty tree to verify it runs clean**

Run: `cd <clone> && node scripts/manual-lint.mjs`
Expected: `0 files · 0 errors · 0 warnings`, exit 0. (Directory may not exist yet — script handles it.)

- [ ] **Step 3: Write `docs/manual/STYLE.md`** — the house style guide: voice (task-oriented, second person, imperative), step formatting (one action per step, prerequisites first), frontmatter contract (the five fields with an example block), terminology rules (tenants / students / graduates / tenant-neutral), the `[VERIFY: ...]` convention, and a page template. Copy the frontmatter contract verbatim from Global Constraints.

- [ ] **Step 4: Extract ground-truth fact sheets** into `docs/manual/_factsheets/`. For each area, read the real code and record verified facts with `file:line` provenance; mark unknowns `[VERIFY: ...]`. Sources to inventory:
  - `platform.md` — what GleeWorld is, top-level routes (`src/App.tsx`), mobile/iOS app (`ios/`, `capacitor.config.ts`).
  - `roles-accounts.md` — roles/entitlements, sign-in flows (`src/contexts`, auth utils), tenant model.
  - `tenants.md` — program setup, branding, landing pages, roster/sub-accounts, content, calendar & QR attendance, billing (`src/pages`, `src/features`, `src/components/attendance`).
  - `students.md` — student surfaces: music, Part Tracks, Studio, assignments, attendance.
  - `fans.md` — public/fan surfaces: following, Box Office tickets, concerts.
  - `addons/*.md` — one per add-on (Box Office, Glee Academy, Concert Planner, Studio/Part Tracks, Landing Pages, Template Courses): what it does, how it's enabled/entitled, key user actions.

- [ ] **Step 5: Write `docs/manual/_meta.json` skeleton** with the seven top-level sections and empty `children` arrays:

```json
{
  "title": "GleeWorld User Manual",
  "updated": "2026-07-08",
  "nav": [
    { "title": "Getting Started", "children": [] },
    { "title": "For Tenants (Directors & Admins)", "children": [] },
    { "title": "For Students", "children": [] },
    { "title": "For Fans", "children": [] },
    { "title": "Add-ons Reference", "children": [] },
    { "title": "FAQ & Troubleshooting", "children": [] },
    { "title": "Glossary", "children": [] }
  ]
}
```

- [ ] **Step 6: Create one placeholder page** `docs/manual/getting-started/what-is-gleeworld.md` with valid frontmatter and a short body, add it to `_meta.json` under "Getting Started", to prove the pipeline end-to-end.

- [ ] **Step 7: Run the lint (now with content)**

Run: `node scripts/manual-lint.mjs`
Expected: `... · 0 errors · ...`, exit 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/manual-lint.mjs docs/manual
git commit -m "docs(manual): scaffold content tree, style guide, fact sheets, and lint harness"
```

---

### Tasks 2–7: Author each section (same cycle)

Each of these tasks follows the identical five-step cycle below. **Interfaces:** each consumes the relevant `_factsheets/*` from Task 1 and produces Markdown pages plus `_meta.json` entries consumed by Task 8's assembly.

For every section task:

- [ ] **Step A: List the pages** for the section (titles + one-line summaries), matching the IA in the spec.
- [ ] **Step B: Author each page** via the expert panel — Technical Writer + relevant domain expert draft from the fact sheet; Publisher/Editor + Student/Fan reviewer pass. Each page gets the five frontmatter fields; unknowns become `[VERIFY: ...]`.
- [ ] **Step C: Add the pages to `_meta.json`** under the section's `children`, in reading order.
- [ ] **Step D: Run `node scripts/manual-lint.mjs`** — expected `0 errors`. Fix any dead links / missing frontmatter / banned terms.
- [ ] **Step E: Commit** — `git commit -m "docs(manual): author <section>"`.

**Task 2 — Getting Started** (`docs/manual/getting-started/`, `audience: all`):
what GleeWorld is · accounts & the three roles · the mobile/iOS app · signing in, resetting a password, getting help.

**Task 3 — For Tenants** (`docs/manual/tenants/`, `audience: tenant`):
program & branded-site setup · branding/theme/landing pages · roster & student sub-accounts · content management (music/media/resources) · calendar, events & QR attendance · activating & configuring add-ons · billing & plan management.

**Task 4 — For Students** (`docs/manual/students/`, `audience: student`):
joining & first sign-in · finding music & resources · Part Tracks & practice · Studio basics · assignments & submissions · QR check-in.

**Task 5 — For Fans** (`docs/manual/fans/`, `audience: fan`):
following a program · buying tickets (Box Office) · attending concerts & events.

**Task 6 — Add-ons Reference** (`docs/manual/add-ons/`, `audience: all`):
one page per add-on — Box Office, Glee Academy, Concert Planner, Studio/Part Tracks, Landing Pages, Template Courses — each: what it does · how to enable · how to use · add-on FAQ. Describe availability as plan/entitlement-dependent, not universal. Cross-link from the relevant audience pages.

**Task 7 — FAQ & Troubleshooting** (`docs/manual/faq/`, `audience: all`):
accounts & sign-in · billing & payments · privacy & data · iOS/mobile app · common issues & fixes.

---

### Task 8: Glossary, assembly, and full consistency sweep

**Files:**
- Create: `docs/manual/glossary.md`
- Modify: `docs/manual/_meta.json` (finalize; add Glossary + cross-section ordering)
- Modify: any pages needing terminology / cross-link fixes

**Interfaces:**
- Consumes: all section pages and `_meta.json` entries from Tasks 2–7.
- Produces: the final, ship-ready `docs/manual/` tree that Phase B/C render unchanged.

- [ ] **Step 1: Write `glossary.md`** — plain-language definitions of every GleeWorld term used across the manual (tenant, sub-account, entitlement, Part Track, Studio, Box Office, etc.), `audience: all`.
- [ ] **Step 2: Cross-link pass** — add "See also" links between related pages (e.g., tenant "activate add-ons" ↔ each add-on page; student "Part Tracks" ↔ Studio). Verify with lint's dead-link check.
- [ ] **Step 3: Terminology & tenant-neutral sweep** — resolve every advisory warning where appropriate; ensure no hardcoded tenant name in shared copy.

Run: `grep -rniE "spelman|alumna|alumnae|alumni" docs/manual --include=*.md | grep -v _factsheets`
Expected: no user-facing hits (fact sheets may quote code).

- [ ] **Step 4: Resolve `[VERIFY]` markers** — compile every remaining `[VERIFY: ...]` into a numbered list for the user. Items the user answers get written in; the rest stay flagged and are reported, not guessed.

Run: `grep -rn "\[VERIFY" docs/manual --include=*.md`

- [ ] **Step 5: Final strict lint**

Run: `node scripts/manual-lint.mjs --strict`
Expected: `0 errors`. (Any remaining `[VERIFY]` becomes an error under `--strict`; if the user has deferred some, run without `--strict` and report the deferred list explicitly.)

- [ ] **Step 6: Finalize `_meta.json`** — Glossary added, ordering correct, every page referenced (lint emits no "not referenced" warnings).
- [ ] **Step 7: Commit**

```bash
git add docs/manual scripts/manual-lint.mjs
git commit -m "docs(manual): glossary, cross-links, consistency sweep, final assembly"
```

- [ ] **Step 8: Present v1 to the user** — summarize what was authored, the deferred `[VERIFY]` list (if any), and how to get the branch into the real repo (push `docs/gleeworld-manual` to GitHub, or provide `cp` commands). This is the "full v1 then review" gate.

---

## Self-Review

**Spec coverage:** Getting Started → T2 · Tenants → T3 · Students → T4 · Fans → T5 · Add-ons (all six) → T6 · FAQ → T7 · Glossary → T8 · single-source Markdown + frontmatter + `_meta.json` → T1 · ground-truth accuracy & `[VERIFY]` → T1 fact sheets + T8 resolution · tenant-neutral/terminology → lint (T1) + sweep (T8). All spec sections map to a task.

**Placeholder scan:** No "TBD/TODO/implement later." The one intentional placeholder page in T1 exists to prove the pipeline and is superseded in T2. The lint script is complete and runnable.

**Type consistency:** `manual-lint.mjs` CLI, the five frontmatter fields, and the `_meta.json` `{title, updated, nav:[{title, path?, children?}]}` shape are used identically across all tasks. Fact-sheet paths in T1 match the consumers named in Tasks 2–8.
