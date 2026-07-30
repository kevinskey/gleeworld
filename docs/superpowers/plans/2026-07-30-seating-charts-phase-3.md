# Seating Charts Phase 3 Implementation Plan

**Goal:** Ship the last three big deferred surfaces from Phase 1: attendance overlay + reflow, split role views (section leader / stage crew / substitute), and the chart associations UI (attach a chart to an ensemble, course, event, tour, or tour event).

**Architecture:** No new tables. Reuse `gw_attendance_sessions` / `gw_attendance_records` (`student_profile_id` → `gw_profiles.id` → `gw_profiles.user_id`) via a helper hook that resolves the mapping. Role views are query-param variants of the existing `/view` page, so no additional routes are needed. The associations UI is a toolbar menu backed by the `gw_seating_chart_associations` table added in Phase 1.

**Tech Stack:** Same as Phase 1/2. No new deps.

## Global Constraints (inherit)
- No new tables, no new deps.
- Attendance is optional — a chart with no event/course association shows a "No attendance session linked" empty state instead of a mystery blank.
- Reflow never persists unless the user explicitly commits — the same preview pattern as Phase 2 auto-place.
- Role views strip fields at the render layer, not the query layer, so an operator can still see everything server-side (the server truth is still governed by RLS).

## File Structure

**New:**
- `src/features/seating-charts/attendance/useChartAttendance.ts` — resolves associations → attendance session → records
- `src/features/seating-charts/attendance/AttendancePanel.tsx` — toolbar dropdown showing session picker + present/absent counts + "Reflow absent to hold zone"
- `src/features/seating-charts/attendance/attendanceStatus.ts` — pure helpers: color for status, reflow selection
- `src/features/seating-charts/associations/AssociationsMenu.tsx` — attach/detach ensemble/course/event/tour
- `src/features/seating-charts/__tests__/attendanceStatus.test.ts`

**Modified:**
- `src/features/seating-charts/engine/ObjectShape.tsx` — accept an optional `attendanceStatus` prop, tint accordingly.
- `src/features/seating-charts/engine/CanvasEngine.tsx` — accept `attendanceByObjectId` map and pass to shapes.
- `src/pages/seating-charts/EditorPage.tsx` — wire attendance panel + associations menu.
- `src/pages/seating-charts/ViewPage.tsx` — read `?role=…` and adjust rendering: section_leader (highlight own section + attendance dot), stage_crew (hide people, show only equipment + counts), substitute (people + seats, strip notes/emails).
- `src/features/seating-charts/adapters/tourManagerAdapter.ts` — export `attachChart`/`detachChart` for arbitrary association types (already generic; just re-use).

## Tasks

### Task 1: Migration + helpers
No SQL migration needed. Just types + helpers.
Add `SeatingAttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'unknown'` to `types/seatingCharts.ts`.

### Task 2: Attendance data hook
`useChartAttendance(chartId)`:
1. Load `gw_seating_chart_associations` for this chart where `association_type IN ('event','course','tour_event')`.
2. For each event association, look up `gw_attendance_sessions` where `event_id=…`, pick the most recent open/scheduled session; for a course association, pick the most recent session where `course_id=…`.
3. Load `gw_attendance_records` for the chosen session and resolve `student_profile_id` (gw_profiles.id) → `user_id` (auth.uid).
4. Return `{ session, records, byUserId: Map<user_id, status>, refresh }`.

### Task 3: Attendance overlay
Extend `CanvasEngine` + `ObjectShape` to accept an optional `attendanceByObjectId: Map<string, SeatingAttendanceStatus>` and paint a small colored dot in the top-left corner of assigned seats (green=present, red=absent, amber=late, gray=excused). No color change to the seat body — that stays the section color.

### Task 4: Attendance panel
Toolbar button opens a Popover with:
- Session summary (title, opens_at)
- Counts: present / late / absent / excused / no-record
- "Reflow absent to hold zone" button — moves absent seats to a dedicated y-region above the canvas, groups them together; user can undo via reload.
- "Refresh" button re-fetches.

### Task 5: Role views
`ViewPage` reads `?role=viewer|performer|section_leader|stage_crew|substitute`. Defaults to `performer` when the viewer has a `performer` share or has an assignment for themselves.
- performer (default): current behavior — highlight own seat.
- section_leader: highlight all seats matching the viewer's `voice_part` or `section`. Show attendance dots.
- stage_crew: hide desks/chairs/riser_slot; show only stage_boundary + instrument + microphone + monitor + music_stand + labels. Show equipment counts in a header strip.
- substitute: show desks + names + section labels; hide chart notes/description.

### Task 6: Associations UI
Toolbar dropdown "Attach…":
- Ensemble → picker (uses `gw_ensembles`) → attach
- Course → picker (uses `gw_courses`) → attach
- Event → picker (uses `events` table, most-recent 50)
- Tour → picker (uses `gw_tour_events`)
Below the picker: list of current associations with a "Detach" button.

### Task 7: Tests + build + commit
- `attendanceStatus.test.ts` — color mapping + reflow-selection algorithm.
- `npm run test -- src/features/seating-charts` all pass.
- `npm run build` succeeds.
- Commit.

## Non-goals
Real-time collaboration, formation designer, native iOS drag polish.
