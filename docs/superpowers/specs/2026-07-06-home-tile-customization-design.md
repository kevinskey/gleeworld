# Home tile customization (jiggle mode) — design

Date: 2026-07-06
Status: Approved
Surface: House home (`/dashboard`), the app grid below the Today card
Prior art: docs/superpowers/specs/2026-07-04-house-and-stage-design.md §5.1–5.2

## Problem

The keycap app grid on the House home shows enabled add-on tiles in a
hard-coded preference order: the first 8 are visible, the rest hide behind
"More". Users cannot promote the tools they actually use (e.g. Tickets,
Studio) into the visible grid or reorder them.

## Decision summary

- **Full pick-and-order**: users choose exactly which tiles appear in the
  primary grid and in what order.
- **Inline jiggle mode**: iOS-style editing directly on the home grid.
- **Per-user persistence in the database**, versioned jsonb on the existing
  `user_preferences` table.
- **Removed tiles move to the "More" overflow** — nothing the tenant
  enabled ever becomes unreachable from home.

## 1. Data model & reconciliation

### Storage

```sql
ALTER TABLE public.user_preferences
  ADD COLUMN home_tile_layout jsonb DEFAULT NULL;
```

Shape: `{ "v": 1, "order": ["tickets", "studio", "music"] }` — the ordered
destination keys the user pinned to the primary grid. `NULL`, unparseable
JSON, or an unknown `v` all mean "use today's default layout", so existing
users see no change until they customize. `user_preferences` already
carries per-user RLS; no policy changes needed.

### Reconciliation

One pure function next to `getAppTiles` in
`src/lib/navigation/appDestinations.ts`:

```
applyTileLayout(candidates: Destination[], layout: TileLayout | null)
  -> { primary: Destination[]; overflow: Destination[] }
```

- `candidates` is the same enabled list `getAppTiles` builds today
  (module flag on, route not already claimed by the tab bar).
- With `layout == null`: current behavior — `primary = slice(0, 8)`,
  rest overflow.
- With a layout: `primary` = saved keys in saved order, filtered to keys
  still present in `candidates` (stale keys silently drop, and are NOT
  rewritten in the DB — re-enabling a module restores its old spot).
  `overflow` = every remaining candidate, in default order. Newly
  tenant-enabled modules therefore land in overflow; a curated grid never
  rearranges itself.
- No 8-tile cap when a custom layout exists.

### Read/write

A `useHomeTileLayout` hook: React Query read of the
`home_tile_layout` column (piggybacking the `user_preferences` row), and a
save function that upserts just that column. One write per edit session
(on Done) — no debouncing.

## 2. Jiggle-mode UI & interactions

### Entering

- Long-press (~500 ms) any grid tile, via `@dnd-kit` pointer sensor with
  press delay + tolerance so scrolling never triggers it.
- Plus a small "Edit" text affordance beside the grid, since long-press
  alone is undiscoverable.
- Edit mode unavailable while modules are loading (existing empty-grid
  guard stays).

### While editing

- Tiles wiggle: CSS keyframe rotation (±1.5°, staggered per-tile delays),
  disabled under `motion-reduce`.
- Primary tiles get a `–` badge (top-left, ≥44 px hit target) → move to
  the "More" section.
- The "More" section auto-expands in edit mode; its tiles get a `+`
  badge → append to end of primary.
- Drag-to-reorder within primary via `@dnd-kit/sortable` (existing
  dependency; touch-friendly, autoscroll).
- Tile links are inert while editing — no navigation.
- Sticky **Done** persists in one write and exits; Esc/back cancels and
  reverts. On write failure: keep the edited layout locally, destructive
  toast, retry on next Done.

### Visual language

Letterpress-plate system only: existing `bg-card border border-border`
keycaps, no new elevations, light-theme tokens. Text `text-xs`+, icons
`w-4 h-4`+ per studio sizing standards.

### Roles

Identical mechanics for faculty and students — the candidate set already
differs upstream by role and module flags; the editor operates on whatever
it receives.

## 3. Edge cases & error handling

- **Module disabled after pinning** — stale key silently dropped at
  reconcile time; DB layout untouched.
- **Tab-bar collision** — a pinned key whose route enters the tab bar is
  filtered from the grid (current dedupe rule), same silent drop.
- **Empty primary** — allowed; show "More" expanded plus a one-line hint
  ("Your grid is empty — tap Edit to add apps").
- **Load failure** — fall back to default layout (matches existing
  `useUserPreferences` silent-warn pattern).
- **Save failure** — local state kept + toast (above).
- **Unparseable/future-version jsonb** — treated as `NULL`; never throws.

## 4. Testing

- Unit tests for `applyTileLayout`: null layout, saved order respected,
  stale key dropped, newly enabled module → overflow, tab-route collision,
  empty order.
- Component test for editor state transitions (enter/exit, remove→More,
  add→end, cancel reverts) if the existing test setup supports it cheaply;
  otherwise the pure-function tests carry the logic and the UI is verified
  manually.
- Manual verification on the 390 px mobile-sweep harness: long-press vs
  scroll discrimination, touch drag.

## 5. Migration & deploy notes

- Additive nullable column; zero risk to existing rows, rollback-safe.
- Apply on the droplet as postgres superuser per the usual runbook.
- Regenerate Supabase types after migration so `home_tile_layout` appears
  in `src/integrations/supabase/types.ts`.
