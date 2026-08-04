# Seating Charts Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Ship the highest-leverage deferred items from Phase 1 so charts stop being single-arrangement, single-user artifacts. Adds named arrangements, auto-placement, sharing + performer read view, roster imports, version snapshots, and PDF export.

**Architecture:** Builds on the Phase 1 tables + engine. Adds one new table (`gw_seating_chart_versions`) and one RPC (`list_seating_chart_roster`) that fans out an association to profiles. Editor toolbar gets three new controls (Arrangements dropdown, Auto-place, Share); a new `/seating-charts/:id/view` route serves the performer read view. PDF export reuses the existing `jsPDF` dep — no new dependencies.

**Tech Stack:** Same as Phase 1 (React 18 + TS + Vite + Supabase + @dnd-kit + SVG). New: `jspdf` (already installed via tour PDF path).

## Global Constraints (inherit Phase 1)

- Tenant isolation + RESTRICTIVE RLS on every new table.
- Light theme, text-xs/text-sm baseline, w-4 h-4 icons min.
- No new dependencies.
- Additive migrations only — Phase 1 tables untouched.
- Snapshot payloads capped at ~2 MB (JSON) to keep the row size sane; large charts warn before saving.

## File Structure

**New:**
- `supabase/migrations/20260730100000_seating_charts_phase_2.sql` — `gw_seating_chart_versions` + `list_seating_chart_roster` RPC
- `src/features/seating-charts/placement/rules.ts` — pure placement algorithms
- `src/features/seating-charts/placement/PlacementDialog.tsx` — preview + apply
- `src/features/seating-charts/sharing/ShareDialog.tsx` — invite users, list grants
- `src/features/seating-charts/imports/RosterImportDialog.tsx` — CSV + from-source
- `src/features/seating-charts/versions/VersionsMenu.tsx` — save/restore
- `src/features/seating-charts/exports/pdfExport.ts` — SVG→PDF + equipment list
- `src/features/seating-charts/editor/ArrangementsSwitcher.tsx` — toolbar dropdown
- `src/pages/seating-charts/ViewPage.tsx` — read-only performer view
- `src/features/seating-charts/__tests__/placement.test.ts`
- `src/features/seating-charts/__tests__/pdfExport.test.ts`

**Modified:**
- `src/hooks/useSeatingChart.ts` — load ALL arrangements, expose `arrangements`, `activeArrangementId`, `switchArrangement`
- `src/pages/seating-charts/EditorPage.tsx` — new toolbar buttons + wiring
- `src/App.tsx` — add `/seating-charts/:chartId/view` route

## Task List

### Task 1: Migration — versions table + roster RPC
Adds `gw_seating_chart_versions(id, tenant_id, arrangement_id FK, name, snapshot jsonb, created_by, created_at)` with tenant iso RLS + owner/admin write / grantee read. Adds RPC `list_seating_chart_roster(association_type text, association_id uuid)` that dispatches by type: `ensemble` → `gw_ensemble_members`, `course` → `gw_course_enrollments`, `tour`/`tour_event` → `gw_tour_roster`. Falls back to empty array on unknown types.

### Task 2: Arrangements switcher
Extend `useSeatingChart` to also load `arrangements: SeatingArrangement[]` and add `switchArrangement(id)`. Introduces `ArrangementsSwitcher` component (shadcn `DropdownMenu`) with rows: switch, rename, duplicate, set-default, delete (protected: cannot delete the sole arrangement).

### Task 3: Auto-placement rules
Pure functions in `rules.ts`: `alphabetical`, `random`, `groupBySection`, `keepTogether`, `separate`, `heightOrder`. Each takes `{objects, assignments, people, config}` and returns a proposed assignment map; never mutates. `PlacementDialog` shows a preview by re-rendering the canvas with the proposal, then commits via bulk `upsertAssignment` calls.

### Task 4: Sharing UI
`ShareDialog` lists current grants (`gw_seating_chart_shares` joined with `gw_profiles_directory` for display names), adds a grant by picking a user + role, revokes via delete. Reuses tenant `is_current_user_admin_or_super_admin()` as the fallback grant scope.

### Task 5: Performer view page
`/seating-charts/:chartId/view` — read-only `<CanvasEngine readOnly />` for a chart's default arrangement, filters out unlocked stage-boundary/labels for cleanliness, highlights `auth.uid()`'s own seat (extra ring around the object). Anyone with a share grant OR owner OR admin can access.

### Task 6: Roster imports
`RosterImportDialog`: three tabs — Ensemble, Course, Tour, CSV. First three call `list_seating_chart_roster` RPC. CSV parses `name,voice_part,instrument` client-side (no persistence). Imported entries appear in the People palette as "guests" and can be dragged onto seats; on placement they save as assignments with `external_person_id` populated.

### Task 7: Version snapshots
`VersionsMenu`: "Save snapshot" writes the current objects + assignments arrays as a JSON blob into `gw_seating_chart_versions`. Dropdown lists the last 20 snapshots. Restore deletes current objects+assignments and reinserts from the snapshot.

### Task 8: PDF export
`pdfExport.ts`: serializes the chart SVG → PNG via canvas (like the existing PNG export), embeds in a landscape jsPDF page with chart title + date. For `chart_mode='stage_plot'`, adds a second portrait page listing every microphone / monitor / instrument / DI grouped by type. Wires to the toolbar as "Export PDF".

### Task 9: Tests + build + commit
- `placement.test.ts` — every rule produces the expected assignment count and preserves locked people/objects.
- `pdfExport.test.ts` — equipment list grouping is stable and alphabetized.
- `npm run test -- src/features/seating-charts` all pass.
- `npm run build` succeeds.
- Commit with descriptive message.

## Rollback

The Phase-2 migration adds one new table + one RPC. To roll back: `DROP TABLE gw_seating_chart_versions; DROP FUNCTION list_seating_chart_roster;`. Phase-1 tables untouched.

## Explicit non-goals

Not building in Phase 2 (still deferred):
- Attendance overlay with auto-reflow
- Section-leader / stage-crew / substitute-teacher role views (share grants exist; the split UIs don't)
- Real-time collaboration
- Formation Designer (marching drill)
- iOS-native drag polish
