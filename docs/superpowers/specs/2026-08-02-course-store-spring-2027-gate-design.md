# Course Store "Available Spring 2027" gate

**Date:** 2026-08-02
**Status:** Approved

## Goal

Grey out the Course Store (`/academy/store`) for all tenants and overlay an
"Available Spring 2027" watermark. The store stays visible as a teaser, but
nothing on it is actionable until launch.

## Scope

- `src/pages/academy/CourseStorePage.tsx` only. Nav links to the store
  (AcademyShell, TeacherAcademyDashboard, InstructorConsole) stay as-is so
  tenants can still find the teaser page.
- "New course" / `/academy/new` entry points on *other* pages are untouched;
  only the store page's own "Build from scratch" header button is disabled.

## Design

- A `STORE_LOCKED = true` const at the top of the page gates everything.
  Spring 2027 launch = flip it to `false` (or delete the gate).
- Page body (template grid / loading / empty states) wraps in a `relative`
  container; the content layer gets `grayscale opacity-50 pointer-events-none
  select-none` and `aria-hidden`, so Adopt buttons are unreachable.
- Adopt buttons are also rendered `disabled` and the mutation early-returns
  when locked (belt and suspenders).
- A centered, slightly rotated watermark pill overlays the grid:
  "Available Spring 2027" — theme tokens only (muted-foreground/background),
  per the light-theme rules.
- The "Build from scratch" header action renders `disabled` with an
  "Available Spring 2027" tooltip title.

## Non-goals

- No per-tenant feature flag or DB change — the gate is global and temporary.
- No server-side block on `adopt_course_template`; this is a presentational
  coming-soon gate for free templates.

## Testing

- `npm run typecheck:guard`, `npm run lint`, production build.
- Visual check of the deployed page.
