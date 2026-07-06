# Home Tile Customization (Jiggle Mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user pick and reorder the add-on tiles in the House home app grid (below the Today card) via iOS-style inline jiggle editing, persisted per-user as versioned jsonb.

**Architecture:** A nullable `home_tile_layout` jsonb column on the existing `user_preferences` table stores `{v:1, order:[...keys]}`. A pure reconcile step inside `getAppTiles` (in `appDestinations.ts`) applies the saved order to the enabled candidate list — stale keys silently drop, everything unpinned falls to the "More" overflow. A `useHomeTileLayout` hook reads/writes the column; a new `HomeTileGrid` component (extracted from `HouseHome.tsx`) renders the grid and owns jiggle-mode editing with `@dnd-kit/sortable`.

**Tech Stack:** React 18 + TypeScript, TanStack Query, Supabase JS, `@dnd-kit/core` + `@dnd-kit/sortable` (already dependencies), Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-07-06-home-tile-customization-design.md`

## Global Constraints

- Light-theme tokens only; letterpress plates are `bg-card border border-border`; no new elevations beyond the existing keycap shadow `shadow-[0_2px_0_hsl(var(--border))]`.
- Text `text-xs` minimum, icons `w-4 h-4` minimum, touch targets ≥44px (`min-h-[44px]` idiom).
- Every animation gets a `motion-reduce:` opt-out.
- No service-worker changes. No "Spelman" or "alumnae" strings anywhere.
- Tests run with `npm test` (vitest, node environment — there is NO jsdom/@testing-library, so no component tests; UI is verified manually per spec §4).
- `npm run build` is `vite build` (esbuild — does NOT typecheck). Rely on the editor/`npx tsc --noEmit` only if the repo baseline is clean; otherwise build + tests are the gate.
- Repo checkout lives at `/private/tmp/claude-501/-Users-kevinjohnson/28057dbd-6549-481b-87fa-738700c535f2/scratchpad/gleeworld`, branch `feat/home-tile-customization` (the ~/Documents working copy is TCC-blocked).
- The droplet migration + Supabase type regeneration happen at deploy time (Task 5); local development hand-adds the column to `types.ts` (Task 1).

---

### Task 1: Migration file + hand-edited Supabase types

**Files:**
- Create: `supabase/migrations/20260707030000_home_tile_layout.sql`
- Modify: `src/integrations/supabase/types.ts` (the `user_preferences` Row/Insert/Update blocks, ~line 29870)

**Interfaces:**
- Consumes: nothing.
- Produces: `user_preferences.home_tile_layout` column of Supabase type `Json | null`, so Task 3's `.select('home_tile_layout')` and upsert typecheck.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260707030000_home_tile_layout.sql`:

```sql
-- Per-user House home tile layout (jiggle-mode customization).
-- NULL / unparseable / unknown version = default layout, so existing
-- users see no change until they customize.
-- Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS home_tile_layout jsonb DEFAULT NULL;
```

No RLS changes: `user_preferences` already has per-user policies, and this is just a new column on the same row.

- [ ] **Step 2: Hand-add the column to the generated types**

In `src/integrations/supabase/types.ts`, find the `user_preferences` table (~line 29870). Make these three edits (each old string is unique because Row uses required fields, Insert/Update use optional ones):

Edit 1 — Row block:

```ts
// old:
      user_preferences: {
        Row: {
          calendar_controls_enabled: boolean
// new:
      user_preferences: {
        Row: {
          calendar_controls_enabled: boolean
          home_tile_layout: Json | null
```

Edit 2 — Insert block (the FIRST `calendar_controls_enabled?: boolean` after the Row block):

```ts
// old:
        Insert: {
          calendar_controls_enabled?: boolean
// new:
        Insert: {
          calendar_controls_enabled?: boolean
          home_tile_layout?: Json | null
```

Edit 3 — Update block:

```ts
// old:
        Update: {
          calendar_controls_enabled?: boolean
// new:
        Update: {
          calendar_controls_enabled?: boolean
          home_tile_layout?: Json | null
```

(Keys stay alphabetically plausible but exact position doesn't matter to TS. `Json` is already imported/defined at the top of types.ts. These hand edits are overwritten harmlessly by the deploy-time regen in Task 5.)

- [ ] **Step 3: Verify the suite still passes**

Run: `npm test`
Expected: all existing tests PASS (no behavior changed).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707030000_home_tile_layout.sql src/integrations/supabase/types.ts
git commit -m "feat(home): add user_preferences.home_tile_layout column + types"
```

---

### Task 2: `parseTileLayout` + layout-aware `getAppTiles` (TDD)

**Files:**
- Modify: `src/lib/navigation/appDestinations.ts` (add `TileLayout`, `parseTileLayout`; extend `getAppTiles`)
- Test: `src/lib/navigation/__tests__/appDestinations.test.ts` (append a new describe block)

**Interfaces:**
- Consumes: existing `getAppTiles(role, flags)` internals and `Destination` type.
- Produces (Tasks 3–4 rely on these exact signatures):
  - `export interface TileLayout { v: 1; order: string[] }`
  - `export function parseTileLayout(raw: unknown): TileLayout | null`
  - `export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags, layout?: TileLayout | null): { primary: Destination[]; overflow: Destination[] }` — third param optional; omitted/null keeps today's slice-at-8 behavior.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/navigation/__tests__/appDestinations.test.ts` (update the import line to also pull in the new symbols):

```ts
import { getTabItems, getAppTiles, parseTileLayout, type ModuleFlags, type TileLayout } from '../appDestinations';
```

```ts
describe('parseTileLayout', () => {
  it('accepts a valid v1 layout', () => {
    expect(parseTileLayout({ v: 1, order: ['tickets', 'studio'] }))
      .toEqual({ v: 1, order: ['tickets', 'studio'] });
  });
  it('rejects null, non-objects, wrong version, and non-string entries', () => {
    expect(parseTileLayout(null)).toBeNull();
    expect(parseTileLayout('garbage')).toBeNull();
    expect(parseTileLayout({ v: 2, order: ['tickets'] })).toBeNull();
    expect(parseTileLayout({ v: 1, order: ['tickets', 7] })).toBeNull();
    expect(parseTileLayout({ v: 1 })).toBeNull();
  });
});

describe('getAppTiles with a custom layout', () => {
  const layout = (order: string[]): TileLayout => ({ v: 1, order });

  it('null layout keeps the default slice-at-8 behavior', () => {
    expect(getAppTiles('faculty', allOn, null)).toEqual(getAppTiles('faculty', allOn));
  });
  it('primary follows the saved order exactly; everything else enabled goes to overflow', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, layout(['tickets', 'finance', 'attendance']));
    expect(primary.map((t) => t.key)).toEqual(['tickets', 'finance', 'attendance']);
    const overflowKeys = overflow.map((t) => t.key);
    expect(overflowKeys).not.toContain('tickets');
    // No duplicates and no losses versus the default enabled set.
    const defaults = getAppTiles('faculty', allOn);
    const allDefault = [...defaults.primary, ...defaults.overflow].map((t) => t.key).sort();
    const allCustom = [...primary, ...overflow].map((t) => t.key).sort();
    expect(allCustom).toEqual(allDefault);
  });
  it('silently drops stale keys (disabled module) without losing the rest', () => {
    const { primary } = getAppTiles('faculty', { ...allOn, hasBoxOffice: false }, layout(['tickets', 'finance']));
    expect(primary.map((t) => t.key)).toEqual(['finance']);
  });
  it('silently drops keys whose route the tab bar claims', () => {
    // Student allOn tab bar contains Music and Studio (see getTabItems test).
    const { primary, overflow } = getAppTiles('student', allOn, layout(['music', 'tickets']));
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
    expect(overflow.map((t) => t.key)).not.toContain('music');
  });
  it('drops unknown keys from a corrupt-but-parseable order', () => {
    const { primary } = getAppTiles('faculty', allOn, layout(['nonsense', 'tickets']));
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
  });
  it('empty order means empty primary and everything in overflow', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, layout([]));
    expect(primary).toEqual([]);
    expect(overflow.length).toBeGreaterThan(0);
  });
  it('custom layouts are not capped at 8', () => {
    const defaults = getAppTiles('faculty', allOn);
    const everyKey = [...defaults.primary, ...defaults.overflow].map((t) => t.key);
    const { primary, overflow } = getAppTiles('faculty', allOn, layout(everyKey));
    expect(primary.map((t) => t.key)).toEqual(everyKey);
    expect(overflow).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/navigation`
Expected: FAIL — `parseTileLayout` is not exported / order assertions fail.

- [ ] **Step 3: Implement**

In `src/lib/navigation/appDestinations.ts`, add above `getAppTiles`:

```ts
// Per-user home grid layout, stored in user_preferences.home_tile_layout
// as versioned jsonb. Anything that isn't exactly {v:1, order: string[]}
// parses to null (= default layout) — never throws.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
export interface TileLayout { v: 1; order: string[] }

export function parseTileLayout(raw: unknown): TileLayout | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.order)) return null;
  if (!o.order.every((k): k is string => typeof k === 'string')) return null;
  return { v: 1, order: o.order };
}
```

Replace the tail of `getAppTiles` (currently `return { primary: enabled.slice(0, 8), overflow: enabled.slice(8) };`) and extend its signature:

```ts
export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags, layout?: TileLayout | null):
  { primary: Destination[]; overflow: Destination[] } {
  // ... existing candidate/enabled computation unchanged ...

  // No custom layout: today's default — first 8 enabled tiles.
  if (!layout) return { primary: enabled.slice(0, 8), overflow: enabled.slice(8) };

  // Custom layout: saved keys in saved order, filtered to what is still
  // enabled and un-claimed by the tab bar (stale keys silently drop; the
  // stored layout is never rewritten, so re-enabling a module restores
  // its old spot). Everything else enabled falls to overflow — newly
  // tenant-enabled modules land there, never inside a curated grid.
  const byKey = new Map(enabled.map((d) => [d.key, d]));
  const primary = layout.order
    .map((k) => byKey.get(k))
    .filter((d): d is Destination => d !== undefined);
  const pinned = new Set(primary.map((d) => d.key));
  return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/navigation`
Expected: PASS (all pre-existing tests too — the two-arg call sites are unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/appDestinations.ts src/lib/navigation/__tests__/appDestinations.test.ts
git commit -m "feat(home): layout-aware getAppTiles + parseTileLayout"
```

---

### Task 3: `useHomeTileLayout` hook

**Files:**
- Create: `src/hooks/useHomeTileLayout.ts`

**Interfaces:**
- Consumes: `parseTileLayout`, `TileLayout` from `@/lib/navigation/appDestinations`; `useAuth` from `@/contexts/AuthContext`; `supabase` from `@/integrations/supabase/client`.
- Produces (Task 4 relies on this): `useHomeTileLayout(): { layout: TileLayout | null; save: (order: string[]) => Promise<boolean> }` — `save` resolves `false` on failure (caller shows the toast), updates the query cache on success. One write per edit session.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useHomeTileLayout.ts`:

```ts
// Read/write the per-user House home tile layout. Load failures fall
// back to null (= default layout) with a console.warn, matching the
// useUserPreferences silent-warn pattern. Saves are one upsert per edit
// session; the caller owns failure UX.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseTileLayout, type TileLayout } from '@/lib/navigation/appDestinations';

export function useHomeTileLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const { data: layout = null } = useQuery<TileLayout | null>({
    queryKey: ['home-tile-layout', uid ?? 'anon'],
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('home_tile_layout')
        .eq('user_id', uid!)
        .maybeSingle();
      if (error) {
        console.warn('[useHomeTileLayout] load failed:', error.message);
        return null;
      }
      return parseTileLayout(data?.home_tile_layout ?? null);
    },
  });

  const save = useCallback(async (order: string[]): Promise<boolean> => {
    if (!uid) return false;
    const next: TileLayout = { v: 1, order };
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: uid, home_tile_layout: next }, { onConflict: 'user_id' });
    if (error) {
      console.warn('[useHomeTileLayout] save failed:', error.message);
      return false;
    }
    queryClient.setQueryData(['home-tile-layout', uid], next);
    return true;
  }, [uid, queryClient]);

  return { layout, save };
}
```

(The upsert with `onConflict: 'user_id'` is the same idiom `useUserPreferences` uses, so a user who never got a preferences row still saves cleanly.)

- [ ] **Step 2: Verify nothing broke**

Run: `npm test && npm run build`
Expected: tests PASS, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHomeTileLayout.ts
git commit -m "feat(home): useHomeTileLayout read/save hook"
```

---

### Task 4: Jiggle keyframe, `HomeTileGrid` component, HouseHome wiring

**Files:**
- Modify: `tailwind.config.ts` (keyframes + animation, ~line 121)
- Create: `src/components/dashboard/HomeTileGrid.tsx`
- Modify: `src/pages/dashboard/HouseHome.tsx` (replace the app-grid + overflow JSX, lines 217–252; wire the hook)

**Interfaces:**
- Consumes: `useHomeTileLayout` (Task 3), layout-aware `getAppTiles` (Task 2), `Destination` type, `useToast` from `@/hooks/use-toast`, `@dnd-kit/*`.
- Produces: `HomeTileGrid` component with props `{ primary: Destination[]; overflow: Destination[]; onSave: (order: string[]) => Promise<boolean> }`.

- [ ] **Step 1: Add the jiggle animation to Tailwind**

In `tailwind.config.ts`:

```ts
// old:
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
// new:
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        jiggle: {
          '0%, 100%': { transform: 'rotate(-1.5deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        jiggle: 'jiggle 0.3s ease-in-out infinite',
      },
```

- [ ] **Step 2: Create the grid component**

Create `src/components/dashboard/HomeTileGrid.tsx`:

```tsx
// Keycap app grid with iOS-style jiggle editing, extracted from HouseHome.
// View mode: primary tiles as keycap links, rest behind a "More" expander.
// Edit mode (long-press a tile or tap Edit): tiles jiggle; tapping a
// primary tile (or its – badge) demotes it to More, tapping a More tile
// (or its + badge) appends it to primary, dragging reorders primary.
// Done persists once via onSave; Esc/Cancel reverts. Tiles never navigate
// while editing. Whole-tile taps keep the ≥44px target; badges are the
// visual affordance.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Destination } from '@/lib/navigation/appDestinations';

interface HomeTileGridProps {
  primary: Destination[];
  overflow: Destination[];
  onSave: (order: string[]) => Promise<boolean>;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

function KeycapFace({ tile, editing }: { tile: Destination; editing: boolean }) {
  const Icon = tile.icon;
  return (
    <>
      <span className={
        'w-full aspect-square bg-card border border-border shadow-[0_2px_0_hsl(var(--border))] flex items-center justify-center'
        + (editing ? '' : ' transition-transform motion-reduce:transition-none group-active:translate-y-px group-active:shadow-none')
      }>
        <Icon className="w-5 h-5 text-foreground" />
      </span>
      {tile.label}
    </>
  );
}

function SortableTile({ tile, index, onRemove }: {
  tile: Destination; index: number; onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.key });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="relative touch-none">
      <button type="button" onClick={() => onRemove(tile.key)}
        aria-label={`Remove ${tile.label} from grid`}
        className="w-full flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none"
        style={{ animationDelay: `${(index % 4) * 75}ms` }}>
        <KeycapFace tile={tile} editing />
      </button>
      <span aria-hidden="true"
        className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-background border border-border flex items-center justify-center pointer-events-none">
        <Minus className="w-4 h-4 text-destructive" />
      </span>
    </div>
  );
}

export function HomeTileGrid({ primary, overflow, onSave }: HomeTileGridProps) {
  const { toast } = useToast();
  // draft === null → view mode; draft = ordered primary keys while editing.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;

  const byKey = useMemo(
    () => new Map([...primary, ...overflow].map((t) => [t.key, t])),
    [primary, overflow],
  );
  // `draft ?` (not `editing ?`) so TS narrows string[] | null.
  const draftPrimary = draft
    ? draft.map((k) => byKey.get(k)).filter((t): t is Destination => t !== undefined)
    : primary;
  const draftOverflow = draft
    ? [...primary, ...overflow].filter((t) => !draft.includes(t.key))
    : overflow;

  // Long-press any view-mode tile to enter edit mode; cancelled by
  // movement past the slop (i.e. a scroll) or release.
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const clearPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressOrigin.current = null;
  };
  const onTilePointerDown = (e: React.PointerEvent) => {
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => setDraft(primary.map((t) => t.key)), LONG_PRESS_MS);
  };
  const onTilePointerMove = (e: React.PointerEvent) => {
    if (!pressOrigin.current) return;
    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) clearPress();
  };
  useEffect(() => clearPress, []);

  // Esc cancels the edit session and reverts.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDraft(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      if (!d) return d;
      return arrayMove(d, d.indexOf(String(active.id)), d.indexOf(String(over.id)));
    });
  };

  const done = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      setDraft(null);
    } else {
      // Keep the edited layout locally; user can retry Done.
      toast({ title: 'Could not save your layout', description: 'Check your connection and tap Done again.', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-[44px]">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Apps</span>
        {editing ? (
          <span className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => setDraft(null)} className="text-muted-foreground min-h-[44px]">
              Cancel
            </button>
            <button type="button" onClick={done} disabled={saving} className="font-semibold text-primary min-h-[44px]">
              {saving ? 'Saving…' : 'Done'}
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setDraft(primary.map((t) => t.key))}
            className="text-sm text-muted-foreground min-h-[44px]">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={draftPrimary.map((t) => t.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-2">
              {draftPrimary.map((t, i) => (
                <SortableTile key={t.key} tile={t} index={i}
                  onRemove={(key) => setDraft((d) => (d ? d.filter((k) => k !== key) : d))} />
              ))}
            </div>
          </SortableContext>
          {draftPrimary.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Your grid is empty — add apps back from below.
            </p>
          )}
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4 mb-2">More</div>
          {draftOverflow.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything is on your grid.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {draftOverflow.map((t, i) => (
                <div key={t.key} className="relative">
                  <button type="button"
                    onClick={() => setDraft((d) => (d && !d.includes(t.key) ? [...d, t.key] : d))}
                    aria-label={`Add ${t.label} to grid`}
                    className="w-full flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none"
                    style={{ animationDelay: `${(i % 4) * 75}ms` }}>
                    <KeycapFace tile={t} editing />
                  </button>
                  <span aria-hidden="true"
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-background border border-border flex items-center justify-center pointer-events-none">
                    <Plus className="w-4 h-4 text-primary" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </DndContext>
      ) : (
        <>
          {primary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Your grid is empty — tap Edit to add apps.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {primary.map((t) => (
                <Link key={t.key} to={t.to}
                  onPointerDown={onTilePointerDown}
                  onPointerMove={onTilePointerMove}
                  onPointerUp={clearPress}
                  onPointerCancel={clearPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="flex flex-col items-center gap-1 text-xs text-muted-foreground group min-h-[44px]">
                  <KeycapFace tile={t} editing={false} />
                </Link>
              ))}
            </div>
          )}
          {overflow.length > 0 && (
            <details className="text-sm mt-2" open={primary.length === 0 || undefined}>
              <summary className="text-muted-foreground cursor-pointer py-2 min-h-[44px] flex items-center">
                More ({overflow.length})
              </summary>
              <div className="grid grid-cols-4 gap-2 pt-2">
                {overflow.map((t) => (
                  <Link key={t.key} to={t.to}
                    className="flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px]">
                    <span className="w-full aspect-square bg-card border border-border flex items-center justify-center">
                      <t.icon className="w-5 h-5 text-foreground" />
                    </span>
                    {t.label}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire it into HouseHome**

In `src/pages/dashboard/HouseHome.tsx`:

Add imports (with the existing imports):

```tsx
import { useHomeTileLayout } from '@/hooks/useHomeTileLayout';
import { HomeTileGrid } from '@/components/dashboard/HomeTileGrid';
```

Extend the module-flags block (currently ends with the `getAppTiles` call at lines 122–126):

```tsx
// old:
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const { primary, overflow } = modulesLoading
    ? { primary: [], overflow: [] }
    : getAppTiles(isFaculty ? 'faculty' : 'student', flags);
// new:
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const { layout, save: saveTileLayout } = useHomeTileLayout();
  const { primary, overflow } = modulesLoading
    ? { primary: [], overflow: [] }
    : getAppTiles(isFaculty ? 'faculty' : 'student', flags, layout);
```

Replace the entire app-grid JSX — from `{/* Keycap app grid */}` (line 217) through the closing `)}` of the `overflow.length > 0 &&` details block (line 252) — with:

```tsx
        {/* Keycap app grid (editable — see HomeTileGrid) */}
        {!modulesLoading && (
          <HomeTileGrid primary={primary} overflow={overflow} onSave={saveTileLayout} />
        )}
```

(While modules load, nothing renders — same guard as before, and Edit is therefore unreachable until real data lands. The `Link`/icon imports in HouseHome that the removed JSX used — check whether `Link` is still used elsewhere in the file (it is, in the Needs-attention widget), and leave imports untouched unless eslint flags one as unused.)

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: tests PASS, build succeeds.

Run: `npx eslint src/components/dashboard/HomeTileGrid.tsx src/pages/dashboard/HouseHome.tsx src/hooks/useHomeTileLayout.ts`
Expected: no errors (warnings matching repo baseline are acceptable).

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts src/components/dashboard/HomeTileGrid.tsx src/pages/dashboard/HouseHome.tsx
git commit -m "feat(home): jiggle-mode tile customization on the House home grid"
```

---

### Task 5: Manual verification + deploy notes

**Files:**
- None created; this task is verification and the deploy runbook.

**Interfaces:**
- Consumes: everything above.
- Produces: verified feature + droplet migration applied at deploy time.

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: all tests PASS, production build succeeds.

- [ ] **Step 2: Manual UI verification (dev server, 390px viewport)**

Run `npm run dev`, open the dashboard at 390px width (mobile-sweep harness pattern), and verify with a logged-in demo user:

1. Grid renders as before for a user with no saved layout (first 8 tiles, More expander).
2. Tap Edit → tiles jiggle (staggered), – badges on primary, More section expanded with + badges.
3. Long-press a tile (~500ms) also enters edit mode; scrolling with a finger on a tile does NOT.
4. Tap a primary tile → moves to More. Tap a More tile → appends to end of primary.
5. Drag a primary tile to reorder — grid reflows, no navigation fires.
6. Done → persists; reload the page → layout survives. Check `user_preferences.home_tile_layout` contains `{"v":1,"order":[...]}`.
7. Cancel and Esc both revert without saving.
8. Remove ALL tiles → empty-grid hint appears; Done; view mode shows hint + More auto-open.
9. Tiles never navigate while editing.
10. OS reduce-motion on → no jiggle, feature still works.

- [ ] **Step 3: Deploy runbook (droplet — do at ship time, not before)**

Per the usual GleeWorld runbook (build locally + rsync, never `--delete`):

1. Apply the migration on the droplet as the postgres superuser:
   `psql -U postgres -d postgres -f supabase/migrations/20260707030000_home_tile_layout.sql` (or paste the ALTER TABLE via psql). Additive nullable column — zero risk, rollback = `ALTER TABLE public.user_preferences DROP COLUMN home_tile_layout;`.
2. Regenerate Supabase types against the droplet schema and commit the regenerated `types.ts` (replaces Task 1's hand edit).
3. Build locally, rsync `dist/` WITHOUT `--delete` (tenant-bootstrap.js lives under the web root).

- [ ] **Step 4: Finish the branch**

Use superpowers:finishing-a-development-branch — run the full suite once more, then merge/PR per the repo's PR-based flow.
