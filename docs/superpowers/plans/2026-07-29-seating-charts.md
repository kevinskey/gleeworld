# Seating Charts (standalone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract seating-chart functionality from Tour Manager into a standalone GleeWorld feature that serves music teachers, band/choir/orchestra directors, classroom teachers, and church/ensemble managers — while keeping Tour Manager working via associations.

**Architecture:** One flexible SVG-based chart engine backed by a normalized schema (chart → arrangement → object → assignment). Templates seed a starting arrangement; the same editor edits every chart. Tour Manager attaches shared charts by association, no longer owning the data. Existing `gw_bus_seats` + `gw_tour_risers` become the first data migrated into the new model (bus + risers become templated arrangements).

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + @dnd-kit (palette drags) + native pointer events (canvas drags) + SVG rendering + Supabase (PostgreSQL + RLS) + vitest.

## Global Constraints

- **Tenant isolation is mandatory**: every new table needs `tenant_id uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id)` + BEFORE INSERT trigger `set_tenant_id_default` + a `RESTRICTIVE` RLS policy `tenant_id = current_tenant_id()` (per `reference_gleeworld_multitenant`).
- **Working directory**: `~/Documents/GitHub/gleeworld/.claude/worktrees/seating-charts-standalone`. Build locally, never rsync `--delete`.
- **Light theme + Studio sizing**: white cards + dark text; base text-xs/text-sm; icons w-4 h-4 minimum (per `feedback_gleeworld_light_theme` + `feedback_gleeworld_studio_sizes`).
- **No hardcoded tenant names** (per `feedback_gleeworld_tenant_neutral`).
- **Prefer existing UI primitives**: `DashboardPageShell`, `Card`, `Dialog`, `Popover`, `Tabs`, `Sheet` from `src/components/ui/`.
- **DnD library**: `@dnd-kit/core` already installed and in use (see `TourStopLogisticsEditor`). Do NOT introduce fabric.js or Konva for editor drags — `@dnd-kit` handles palette→canvas drops; pointer events handle intra-canvas moves.
- **PDF path**: reuse `src/utils/tourPdfExport.ts` jsPDF pattern; do not add a second PDF lib.
- **NO destructive schema changes**: legacy `gw_tour_risers` + `gw_bus_seats` remain intact. Migration is copy-forward, not drop-and-recreate.
- **The scope is huge** — this plan delivers a Phase 1 foundation (working end-to-end with 6-8 templates); a Phase 2 backlog documents the deferred long tail (all 34 templates, granular sharing, versioning, formation designer, PDF stage-plot exports with equipment lists).

---

## Existing Code Reused (from audit)

| Artifact | How reused |
|---|---|
| `src/components/tour/RisersSection.tsx` | Kept as compatibility view; on save writes to BOTH legacy table + new shared chart via adapter |
| `src/components/tour/BusBuddiesSection.tsx` | Same compatibility strategy |
| `src/hooks/useBusSeats.ts` | Kept for legacy read path; new `useSeatingChart` is the canonical hook |
| `src/components/dashboard/DashboardPageShell.tsx` | Wraps the new dashboard + editor pages |
| `src/components/ui/{card,dialog,popover,tabs,sheet}.tsx` | Standard shell UI |
| `src/utils/tourPdfExport.ts` | `renderSeatingChartToPdf(chart, arrangement)` added later; not in Phase 1 |
| `gw_tour_risers`, `gw_bus_seats` | Backfilled into new tables; kept for rollback |
| `gw_tenants`, `current_tenant_id()`, `set_tenant_id_default` | Standard multi-tenant helpers |

---

## File Structure (Phase 1)

**New:**
- `supabase/migrations/20260729210000_seating_charts.sql` — schema + RLS + backfill
- `src/types/seatingCharts.ts` — types shared across engine, hooks, pages
- `src/features/seating-charts/templates/index.ts` — template registry
- `src/features/seating-charts/templates/{choirSATBRisers,concertBand,orchestraAmerican,classroomRows,stagePlotGeneral,blank}.ts` — Phase 1 templates
- `src/features/seating-charts/engine/CanvasEngine.tsx` — SVG canvas with pan/zoom/select/drag
- `src/features/seating-charts/engine/ObjectRenderer.tsx` — dispatches per subtype
- `src/features/seating-charts/engine/objectShapes.tsx` — Chair, RiserSlot, Table, Mic, StageBoundary, Label
- `src/features/seating-charts/engine/palette.ts` — draggable object palette entries
- `src/features/seating-charts/engine/selectionUtils.ts` — snap, alignment, bbox helpers
- `src/features/seating-charts/adapters/tourManagerAdapter.ts` — legacy Bus/Riser ⇄ shared chart mapping
- `src/hooks/useSeatingCharts.ts` — list/create/duplicate/archive
- `src/hooks/useSeatingChart.ts` — single chart + arrangement + debounced autosave
- `src/pages/seating-charts/DashboardPage.tsx`
- `src/pages/seating-charts/EditorPage.tsx`
- `src/pages/seating-charts/CreateChartDialog.tsx`
- `src/pages/seating-charts/PrintView.tsx` — print stylesheet + PNG export
- `src/features/seating-charts/__tests__/templates.test.ts` — unit tests
- `src/features/seating-charts/__tests__/adapter.test.ts`

**Modified:**
- `src/App.tsx` — add three routes
- `src/lib/navigation/navCatalog.ts` — add `seating-charts` entry under `plan` section
- `src/components/tour-manager/TourManagerDashboard.tsx` — swap in-tab riser editor for a link/embed of the shared chart

---

## Global Data Model (new tables)

- `gw_seating_charts` — top-level chart (id, tenant_id, owner_id, name, description, chart_mode ENUM('seating','stage_plot','classroom'), template_key, status ENUM('active','archived'), canvas_width, canvas_height, orientation ENUM('landscape','portrait'), settings jsonb, created_at, updated_at, archived_at)
- `gw_seating_chart_arrangements` — versions of the same chart (id, chart_id, name, description, is_default, sort_order, layout_settings jsonb, created_at, updated_at)
- `gw_seating_chart_objects` — every visible thing (id, arrangement_id, object_type ENUM('seat','chair','riser_slot','table','music_stand','instrument','microphone','monitor','stage_boundary','label','shape'), subtype text, x, y, width, height, rotation, z_index, label, style jsonb, properties jsonb, locked bool, group_id, created_at, updated_at)
- `gw_seating_chart_assignments` — person ⇄ object (id, arrangement_id, chart_object_id UNIQUE, profile_id, external_person_id, display_name, section, voice_part, instrument, chair_number, assignment_status ENUM('assigned','absent','substitute','guest'), properties jsonb, created_at, updated_at)
- `gw_seating_chart_associations` — chart ⇄ ensemble/course/event/tour (id, chart_id, association_type ENUM('ensemble','course','event','tour','tour_event','venue','production'), association_id, arrangement_id, created_at)
- `gw_seating_chart_shares` — sharing grants (id, chart_id, user_id, role ENUM('owner','editor','viewer','performer','section_leader','stage_crew','substitute'), permissions jsonb, created_at)

All six get `tenant_id` + `set_tenant_id_default` trigger + `RESTRICTIVE` RLS. Ownership/editor policies grant CRUD to owner + tenant admins; viewer policy grants SELECT to grantees.

---

## Task List

### Task 1: Schema migration + backfill

**Files:**
- Create: `supabase/migrations/20260729210000_seating_charts.sql`
- Test: `supabase/migrations/tests/seating_charts_test.sql`

**Interfaces:**
- Produces: 6 tables with tenant_id + RLS; backfill populates one chart per template_name of legacy `gw_tour_risers` and one for the legacy `gw_bus_seats` grid.

- [ ] Write migration: CREATE TABLE for all 6 tables, tenant_id defaults, indexes on (tenant_id, updated_at DESC), RLS policies, BEFORE INSERT triggers, updated_at triggers.
- [ ] Add backfill: for each distinct `template_name` in `gw_tour_risers`, insert one `gw_seating_charts` row (chart_mode='seating', template_key='choir_risers_legacy'), one default arrangement, one `riser_slot` object per seat, and one assignment per occupied seat.
- [ ] Backfill bus seats similarly (chart_mode='seating', template_key='bus_seats_legacy').
- [ ] Test the migration file compiles and RLS is enforced.

### Task 2: Types

**Files:**
- Create: `src/types/seatingCharts.ts`

Emit TypeScript interfaces mirroring the schema plus discriminated union `SeatingObject = SeatObject | ChairObject | RiserSlotObject | TableObject | InstrumentObject | MicrophoneObject | StageBoundaryObject | LabelObject`.

### Task 3: Hooks

**Files:**
- Create: `src/hooks/useSeatingCharts.ts` (list/create/duplicate/archive/delete)
- Create: `src/hooks/useSeatingChart.ts` (single chart + active arrangement + optimistic mutate + 800ms debounced autosave; exposes `chart`, `arrangement`, `objects`, `assignments`, `mutate(fn)`, `saveStatus`)

### Task 4: Template generators (Phase 1: 6 templates + blank)

**Files:**
- Create: `src/features/seating-charts/templates/index.ts` — registry, `generateTemplate(key, config)` API
- Create: `src/features/seating-charts/templates/choirSATBRisers.ts` — 4 curved rows × 12 slots, section-colored
- Create: `src/features/seating-charts/templates/concertBand.ts` — standard concert-band arc (flutes/clarinets front, brass back, percussion rear)
- Create: `src/features/seating-charts/templates/orchestraAmerican.ts` — 1st/2nd violins left, viola right, cello right, bass rear
- Create: `src/features/seating-charts/templates/classroomRows.ts` — configurable rows × cols of desks + teacher desk + smartboard
- Create: `src/features/seating-charts/templates/stagePlotGeneral.ts` — stage boundary + audience marker + basic mic/monitor slots
- Create: `src/features/seating-charts/templates/blank.ts`

Each template returns `{ chart_mode, canvas_width, canvas_height, objects: SeatingObject[] }`. Downstream code inserts them.

**Note:** The full 34-template catalog is deferred to Phase 2; the registry structure supports adding them without engine changes.

### Task 5: Canvas engine

**Files:**
- Create: `src/features/seating-charts/engine/CanvasEngine.tsx`
- Create: `src/features/seating-charts/engine/ObjectRenderer.tsx`
- Create: `src/features/seating-charts/engine/objectShapes.tsx`
- Create: `src/features/seating-charts/engine/selectionUtils.ts`

Behaviors: SVG root with `viewBox` and pan-scrolled state; pointer-events for drag/select/box-select; wheel + pinch zoom; snap-to-8px grid; alignment guides at midpoints; keyboard arrows nudge selection; delete/duplicate; multi-select via shift-click; single undo stack (up to 50 mutations) with `Ctrl+Z` / `Ctrl+Shift+Z`.

### Task 6: Palette + properties panel

**Files:**
- Create: `src/features/seating-charts/engine/Palette.tsx` — three tabs (People, Sections, Objects) via shadcn `Tabs`
- Create: `src/features/seating-charts/engine/PropertiesPanel.tsx` — shows fields for the selected object(s) + assignment editor

### Task 7: Dashboard page + Create flow

**Files:**
- Create: `src/pages/seating-charts/DashboardPage.tsx`
- Create: `src/pages/seating-charts/CreateChartDialog.tsx`

Dashboard uses `DashboardPageShell`, filter tabs (all/choir/band/orchestra/classroom/stage-plot/archived/mine), search input, responsive card grid. Create dialog is a compressed 3-step flow (Purpose → Template → Name) — the spec's 5-step wizard collapses because roster + geometry are chosen inside the editor.

### Task 8: Editor page

**Files:**
- Create: `src/pages/seating-charts/EditorPage.tsx`

Layout: top toolbar (back, name, save-status, undo/redo, zoom, print, export, share), left `Palette`, center `CanvasEngine`, right `PropertiesPanel`. Tablet breakpoint collapses side panels into sheets.

### Task 9: Print + PNG export

**Files:**
- Create: `src/pages/seating-charts/PrintView.tsx`

Print stylesheet renders the SVG at page size; browser print dialog handles PDF. PNG export: clone SVG, serialize, render to `<canvas>`, `.toBlob()`, download.

### Task 10: Routing + nav

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/navigation/navCatalog.ts`

Add `/seating-charts`, `/seating-charts/:chartId`, `/seating-charts/:chartId/edit` routes. Nav catalog entry under `plan` section, icon `Armchair` or `LayoutGrid`, tone `bg-blue-50 text-blue-600`.

### Task 11: Tour Manager integration

**Files:**
- Create: `src/features/seating-charts/adapters/tourManagerAdapter.ts`
- Modify: `src/components/tour-manager/TourManagerDashboard.tsx`

Add "Attach Seating Chart" action to Tour Manager that opens a picker (existing shared charts filtered by chart_mode='seating') OR "Create new chart" (opens Create dialog scoped to the tour, auto-creates an `association` row). Legacy `RisersSection`/`BusBuddiesSection` stay in place with a banner: "This is a legacy view. Try the new Seating Charts →".

### Task 12: Tests

**Files:**
- Create: `src/features/seating-charts/__tests__/templates.test.ts`
- Create: `src/features/seating-charts/__tests__/adapter.test.ts`
- Create: `src/features/seating-charts/__tests__/selectionUtils.test.ts`

Cover: every template produces a valid object list with sensible bounds; adapter round-trips legacy bus + riser rows without loss; snap/align helpers behave.

### Task 13: Typecheck + build + commit

- [ ] `npx tsc --noEmit`
- [ ] `npm run test -- src/features/seating-charts`
- [ ] `npm run build` (Vite)
- [ ] Commit with descriptive message.

---

## Phase 2 backlog (not built)

Explicitly out of scope for Phase 1 — leave stubs where the engine hooks in:

- Remaining ~28 template generators (bell choir, marching band static, jazz combo, U-shape classroom, etc.) — engine supports them, only the template files are missing.
- Auto-placement rules (height order, section leaders, alphabetical, etc.).
- Multiple named arrangements per chart (data model supports it; UI shows one).
- Granular sharing UI (schema exists; only owner-can-edit / everyone-in-tenant-can-view in Phase 1).
- Version snapshots / restore points.
- Attendance overlay + auto-reflow.
- Performer / Section Leader / Stage Crew / Substitute Teacher views.
- Full PDF export with equipment/input lists for stage plots.
- Roster import wizards (CSV, audition, tour-roster shortcut) — Phase 1 supports drag-from-people-tab.
- Mobile edit polish (Phase 1 works but is not optimized).
- Formation Designer (marching drill sequencing) — explicitly out of scope.

## Migration rollback

The migration is additive; to roll back, drop the 6 new tables. Legacy `gw_tour_risers` + `gw_bus_seats` remain intact and continue to serve `RisersSection`/`BusBuddiesSection`.
