# GleeWorld User Manual & Documentation — Design Spec

**Date:** 2026-07-08
**Status:** Approved for planning
**Owner:** Kevin P. Johnson

## Purpose

Produce an industry-standard instructional manual and documentation set for
GleeWorld, authored through a multi-expert-lens process and delivered from
**gleeworld.org**. The manual serves every audience on the platform: tenants
(directors/admins), student sub-accounts, and fans/public — plus a
cross-cutting FAQ and an add-ons reference.

This is the **Phase A** spec: it defines the content itself and the
single-source architecture that later phases render into. Phase B (hosted
`/docs` site), Phase C (PDF booklet), and Phase D (in-app help) each get their
own plan but consume this same content.

## Goals

- A complete, accurate v1 manual covering all four audiences and all shipped
  add-ons, written to professional software-manual standards.
- Single source of truth: content authored once as Markdown, rendered into
  multiple surfaces without divergence.
- Accuracy grounded in the actual current product, not assumptions.
- Tenant-neutral voice (GleeWorld = platform; individual choirs = tenants).

## Non-Goals (v1)

- In-app contextual help / onboarding tooling (Phase D — future).
- Localization / translation.
- Video tutorials.
- Auto-generated API reference for third-party developers.

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Authoring | Multi-agent expert panel authors the finished manual now |
| Formats | Hosted `/docs` (primary) + PDF booklet + in-app help (later) |
| Audiences | Tenants, Students, Fans, General FAQ — all in v1 |
| `/docs` rendering | **Native route in the existing platform SPA** (React/Vite) |
| Review cadence | Panel authors full v1, then user reviews the whole thing |

## Architecture: docs-as-code, single source

```
docs/manual/                     <- single source of truth (Markdown + frontmatter)
├── _meta.json                   <- ordered nav tree + titles + audience tags
├── getting-started/
├── tenants/
├── students/
├── fans/
├── add-ons/
├── faq/
└── glossary.md

Rendered into:
  Phase B  →  gleeworld.org/docs   (React route reads docs/manual at build time)
  Phase C  →  GleeWorld_User_Manual.pdf  (generator over the same Markdown)
  Phase D  →  in-app help drawer   (deep-links into /docs; later)
```

- Content lives in the repo under `docs/manual/`. Each page is a Markdown file
  with YAML frontmatter: `title`, `audience` (tenant | student | fan | all),
  `order`, `summary`, `updated`.
- `_meta.json` defines the navigation hierarchy and ordering so nav is
  declarative, not inferred from filenames.
- Phase B bundles the Markdown at build time (Vite glob import) — no runtime
  fetch of loose files, consistent with the existing build-locally + rsync
  deploy. Search is a client-side index built over the same content.
- The existing `/docs/architecture` route (`DocsArchitecture` page in
  `src/App.tsx`) is the precedent; the new public manual lives at `/docs` with
  child routes per section and does not disturb that internal page.

## Information architecture (the manual outline)

Organized by audience; add-ons are a cross-cutting reference so each add-on is
documented once and linked from the relevant audience sections.

1. **Getting Started**
   - What GleeWorld is; who it's for
   - Accounts & the three roles (director/admin, student, fan)
   - The mobile / iOS app
   - Signing in, resetting a password, getting help

2. **For Tenants (Directors & Admins)**
   - Setting up your program & branded site (10-minute setup)
   - Branding, theme, and landing pages
   - Roster & student sub-accounts (invite, roles, groups)
   - Content management (music library, media, resources)
   - Calendar, events & QR attendance
   - Activating & configuring add-ons
   - Billing & plan management

3. **For Students (Sub-accounts)**
   - Joining a program & first sign-in
   - Finding your music & resources
   - Part Tracks & practice
   - Studio basics
   - Assignments & submissions
   - Checking in to rehearsals (QR attendance)

4. **For Fans / Public**
   - Following a program
   - Buying tickets (Box Office)
   - Attending concerts & events

5. **Add-ons Reference** (each: what it does · how to enable · how to use · FAQ)
   - Box Office
   - Glee Academy
   - Concert Planner
   - Studio / Part Tracks
   - Landing Pages
   - Template Courses

6. **FAQ & Troubleshooting**
   - Accounts & sign-in
   - Billing & payments
   - Privacy & data
   - iOS / mobile app
   - Common issues & fixes

7. **Glossary** — plain-language definitions of GleeWorld terms.

## Authoring process (the expert panel)

A multi-agent workflow. Each section passes through distinct expert lenses so
the result reads like a professionally published manual.

**Roles:**
- **Technical Writer** — task structure, numbered steps, one action per step,
  consistency, cross-references.
- **Music Educator** — pedagogy, rehearsal/classroom framing, correct musical
  and educational terminology.
- **Professional Musician** — realism and correctness on Studio, Part Tracks,
  and recording workflows.
- **Publisher / Editor** — house style, glossary, industry-standard manual
  conventions, front matter, final polish.
- **Student & Fan reviewers** — plain-language pass; the "I'm new here" first-run
  experience; flag jargon and missing prerequisites.

**Pipeline per section:**
1. **Ground-truth inventory** (runs first, once): extract the actual current
   feature set, routes, UI flows, and add-on behavior from the repo. Produces a
   fact sheet per feature. Ambiguities are flagged for the user, not invented.
2. **Draft** — Technical Writer + the relevant domain expert draft the section
   from the fact sheet.
3. **Review** — Publisher/Editor + Student/Fan reviewer pass; corrections
   applied.
4. **Assemble** — merge sections, build `_meta.json`, glossary, and cross-links;
   consistency sweep for terminology and tenant-neutral voice.

The panel authors the **entire v1** end-to-end; the user then reviews the
complete manual and flagged items, and revisions are applied.

## House style

- Task-oriented ("How to…"), second person, imperative steps.
- One action per numbered step; prerequisites called out before steps.
- Screenshots / callouts where they materially help (captured or flagged).
- Consistent terminology per established conventions:
  - GleeWorld = the platform; individual choirs/schools = **tenants**.
  - Use **"students"** (not singers/members) and **"graduates"** (not alumnae).
  - Never hardcode a single tenant's name in shared copy.
- Every page: a one-line summary, a "who this is for" tag, and a last-updated
  date from frontmatter.

## Accuracy & verification

- Content claims trace back to the ground-truth fact sheets.
- Where the product's behavior can't be confirmed from the repo, the manual
  marks it `[VERIFY]` and it is surfaced to the user rather than guessed.
- Add-on availability is described as plan/entitlement-dependent, not universal.

## Success criteria

- All seven top-level sections complete, covering every audience and every
  shipped add-on.
- No `[VERIFY]` markers left unresolved at ship.
- Reads as a single coherent voice; passes a terminology/tenant-neutral sweep.
- Content structured so Phase B can render it into `/docs` and Phase C can
  generate the PDF with no content changes.

## Phasing

- **Phase A (this spec):** author the manual content (`docs/manual/`).
- **Phase B:** native `/docs` route + client-side search in the platform SPA.
- **Phase C:** PDF booklet generator over the same Markdown.
- **Phase D (future):** in-app help drawer / onboarding, deep-linking into `/docs`.
