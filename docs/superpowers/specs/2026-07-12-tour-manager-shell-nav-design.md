# Tour Manager: Global App Shell Navigation

**Date:** 2026-07-12
**Status:** Approved

## Problem

`/tour-manager` (and its alias `/tour-planner`) render `TourManagerDashboard`
bare — the routes are not wrapped in `UniversalLayout`, so the global app
chrome disappears once a user enters the module. On desktop there is no way
back to the dashboard at all: the only exit is an `ArrowLeft` button that is
`lg:hidden`. The nav catalog already links *to* the module
(`src/lib/navigation/navCatalog.ts`, key `tour`); the problem is one-way.

Secondary issues found during exploration:

- The header Search input has no handler — it is dead UI.
- `src/pages/TourPlanner.tsx` passes a hardcoded fake user
  (`id: 'current-user-id'`) into BookingRequestManager, ContractManager,
  HostManager, and AIRoutePlanner (flagged `TODO` in code).

## Decision

Wrap the Tour Manager in the standard global app shell, matching the pattern
used by every other shelled module (Canvas pages, LTI platforms):

```
ProtectedRoute
  → UniversalLayout showHeader={false} showFooter={false} containerized={false}
    → DashboardShell
      → TourPlanner
```

Chosen over lighter alternatives (desktop back button only; per-section URL
routes) by product decision 2026-07-12. Sections remain internal state — no
per-section URLs in this change.

## Changes

1. **`src/App.tsx`** — wrap `/tour-manager` and `/tour-planner` routes in
   `UniversalLayout` + `DashboardShell` per the pattern above.

2. **`src/components/tour-manager/TourManagerDashboard.tsx`** — fit inside the
   shell:
   - Internal brand header: sticky below the shell topbar
     (`top-14 md:top-20`), z-index below the topbar's `z-30`.
   - Remove the dead Search input (shell topbar has real global search).
   - Remove the mobile-only back arrow (shell provides navigation).
   - Tour sidebar sticky offsets recalculated to clear topbar (56/80px) +
     internal header (48px); mobile drawer offset likewise.
   - Mobile bottom section bar: drop `z-[99998]` so the global phone nav
     pill (z-30) is not buried; on phones the tour bar sits above the pill.
     Fallback if cluttered: hide the tour bar on phones (hamburger drawer
     still switches sections).

3. **`src/pages/TourPlanner.tsx`** — replace the hardcoded user with
   `useAuth()` + `useUserRole()` (id, email, full_name, role, is_exec_board).

## Testing

- Local dev server; click through all 21 sidebar sections in the browser and
  verify each renders content with a clean console.
- Verify shell chrome: global sidebar present + collapsible, topbar search
  works, tour header sticks below topbar, no z-index fights.
- Narrow-viewport pass: drawer, bottom bars, global pill coexist.

## Non-goals

- Per-section URL routing / deep links.
- Reworking any section's internal functionality beyond what the real-user
  fix restores.
