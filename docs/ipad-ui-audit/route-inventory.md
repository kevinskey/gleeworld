# GleeWorld — Route Inventory

_Audit date: 2026-07-25_ · _Source: `src/App.tsx` (3,274 lines) + inline nested route files_

## Summary

| Category | Count | Layout Shell | Auth |
|---|---:|---|---|
| Public / Marketing | 15 | UniversalLayout (public header) | PublicRoute |
| Auth | 4 | none / bare | PublicRoute |
| Dashboard (Command Center) | 45 | UniversalLayout + DashboardShell | ProtectedRoute |
| Academy | 39 | UniversalLayout + AcademyShell | Mixed |
| Admin | 42 | UniversalLayout + DashboardShell | ProtectedRoute + role |
| MUS-240 course | 26 | Mixed shells | Mus240EnrollmentRoute |
| Grading | 9 | UniversalLayout + DashboardShell | ProtectedRoute + role |
| Music Theory / Redirects | 18 | UniversalLayout (public) | Mixed |
| Studio & Video | 6 | DashboardShell (Studio session = immersive) | ProtectedRoute |
| Messaging | 4 | UniversalLayout | ProtectedRoute |
| Calendar / Events | 4 | Mixed | Mixed |
| Box Office / Ticketing | 8 | UniversalLayout (public) | PublicRoute |
| Member / User | 11 | DashboardShell | ProtectedRoute |
| Attendance & QR | 9 | Mixed | Mixed |
| Store / Shop | 3 | Mixed | Mixed |
| Wellness / Performance | 3 | DashboardShell | ProtectedRoute |
| Financial / Operations | 8 | DashboardShell | ProtectedRoute + role |
| Alumni / Graduates | 4 | Mixed | Mixed |
| Creative & Tools | 11 | DashboardShell + ModuleGate | ProtectedRoute |
| Tour & Logistics | 5 | DashboardShell | ProtectedRoute |
| Onboarding / Registration | 4 | UniversalLayout (public) | PublicRoute |
| Auditions | 3 | UniversalLayout (public) | PublicRoute |
| Special (LTI, contract, W9) | 5 | Bare / DashboardShell | Mixed |
| Legacy redirects & catch-all | ~20 | n/a | n/a |
| **Total inspected** | **~373** | | |

## Testability Notes

All routes are code-testable (component + import resolvable). Runtime testability depends on:

* **Tenant subdomain**: `IS_TENANT_DOMAIN` is derived from `window.__TENANT_CONFIG__.tenant`. On `main` (platform), `UniversalLayout` renders the marketing `UniversalHeader`; on any tenant, it swaps in `DashboardShell` automatically. Audit tested both branches by reading both code paths.
* **Auth**: `ProtectedRoute` requires a Supabase session; audit reasoned about layout code, not runtime behavior.
* **Seed data**: `Mus240EnrollmentRoute` requires an enrollment row. Static audit only.
* **Module gating**: `ModuleGate('songwriting'|'planner')` requires tenant module enablement. Static audit only.

No Playwright / Cypress / Storybook is installed. Adding a heavy visual-testing stack was ruled out (installation footprint > audit value); code-level static analysis was used instead.

## Notable Layout Groupings

### Uses `UniversalLayout` alone (no DashboardShell) — marketing / public

`/`, `/about`, `/contact`, `/terms`, `/privacy`, `/copyright-policy`, `/security`, `/dpa`, `/thank-you`, `/press-kit`, `/shop`, `/graduates-shop`, `/alumni`, `/graduates`, `/box-office`, `/concert-tickets`, `/concert-tickets/:slug`, `/checkout`, `/shop/success`, `/order-confirmation`, `/audition-application`, `/auditions`, `/join`, `/join/:code`, `/public-calendar`, `/sites/:slug`.

### Uses `UniversalLayout + DashboardShell` — authenticated app

Everything under `/dashboard/*`, `/admin/*`, `/grading/*`, `/songwriting/*`, `/planner/*`, `/studio/*` (except `/studio/sessions/:id`), `/video/*`, plus user pages (`/profile`, `/settings`, `/notifications`, `/messages`, `/first-year`, etc.).

### Uses `AcademyShell` (nested inside `UniversalLayout`)

`/academy` and all `/academy/c/:code/...` sub-routes. Course consumer pages (`/academy/:courseCode/*`) use a page-level layout inside `AcademyCoursePage`.

### Bare / immersive full-screen (sidebar and shell hidden)

* `/studio/sessions/:id` — DashboardShell detects via regex and returns `null` from Sidebar. Full-window DAW.
* `/dashboard/viewer/:scoreId` — Same treatment. Full-window score reader.
* `/attendance/scan`, `/attendance-scan`, `/qr-generator`, `/qr-scanner` — QR pages typically bare.
* `/contract-signing/:contractId`, `/w9-form`, `/event-checkin/:token` — Bare (no auth).

## Guard Types

| Guard | Purpose | File |
|---|---|---|
| `PublicRoute` | No auth required; wraps public/marketing pages | `src/components/routing/` |
| `ProtectedRoute` | Requires Supabase session; supports `skipProfileCheck` | `src/components/routing/` |
| `AdminOnlyRoute` | Wraps ProtectedRoute; checks admin role | `src/components/routing/` |
| `FanRoute`, `GraduatesRoute`, `HomeRoute` | Role-aware redirects | `src/components/routes/` |
| `ControlCenterRedirect` | Redirects `/control-center` by role | `src/components/routes/` |
| `Mus240EnrollmentRoute` | Requires MUS-240 enrollment | course-specific |
| `ModuleGate('key')` | Requires tenant module enablement | `src/components/routes/` |
| `LegacyMus240Redirect`, `InstructorRedirect` | Legacy path cleanups | inline |

## Feature Areas at a Glance

**Academy (39 routes)** — Course platform. Heavy: attendance ledger, gradebook, quiz builder/taker, discussion threads, canvas LMS integration (13 sub-routes).

**Dashboard (45 routes)** — Command Center. Home + specialized workspaces: analytics, alumni, box office, calendar, concert planner, feeds, finance, librarian, liturgy, media library, messenger, music library, music toolkit, office hours, part-tracks, PR hub, sight-reading, viewer, workspace.

**Admin (42 routes)** — Tenant admin: access control, academy courses, AI rehearsal, analytics, announcements, approvals, auditions, ticketing, database, documents, ensembles, events, fan/public page editors, financial, contacts, graduates, inventory, module access, permissions, products, prospects, rehearsal plans, settings, students, schedules, scholarships, platform tenants.

**MUS-240 (26 routes)** — Bespoke class portal: groups, journals, polls, instructor grading, test-builder, test-taker.

**Studio & Video (6 routes)** — Studio home, session editor (immersive), video library, video player, YouTube channel.

**Communications (4 routes)** — Messenger, communications hub, email composer.

**Box Office / Ticketing (8 routes)** — Public event listing, ticket purchase, checkout, order confirmation, will-call, check-in.

**Attendance & QR (9 routes)** — Legacy attendance page + pin/scan/token check-in flows.

**Financial (8 routes)** — Budgets, treasurer, dues, payments, receipts, accounting, approvals.

**Creative & Tools (11 routes)** — Songwriting library + editor, planner (notes), liturgy, read-music, PR hub, wardrobe.

## Routes That Warrant Immersive iPad Treatment (verified from code)

These already suppress the sidebar via `DashboardShell.tsx:359-365`:

* `/studio/sessions/:id` — Studio session editor (needs full window for clips + mixer)
* `/dashboard/viewer/:scoreId` — Score reader (has its own back chrome)

Candidates that could benefit from the same pattern but do NOT currently opt in:

* `/read-music/*` — score practice studio
* `/dashboard/sight-reading` — sight-reading studio
* `/dashboard/part-tracks/:projectId` — part-tracks recording
* `/dashboard/concert-planner/:id` — concert editor
* `/dashboard/liturgy/:massId` — Mass planner detail

These currently render with the sidebar consuming ~256px on iPad landscape. This is a P2 recommendation, not a P0 (audit does not change this without team review — flagged in the implementation plan).
