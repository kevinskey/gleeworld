# My Space Phase 1 — My Tools + the flat shelf

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 52-entry / 10-accordion sidebar with a flat shelf of up to 8 member-chosen tools, backed by a single `MyTools` record that also drives the home keycap grid.

**Architecture:** A new pure module `src/lib/navigation/myTools.ts` owns the `v: 4` schema, legacy migration, and key resolution. A `useMyTools` hook replaces both `useNavItemOrder` and `useHomeTileLayout`, reading the two legacy columns and writing exclusively through the existing `save_nav_item_order` RPC. A new `NavShelf` component renders the shelf and is consumed by both the desktop sidebar and the mobile drawer in `DashboardShell`. The home keycap grid switches its source from `home_tile_layout` to the same record, so the room and the sidebar can no longer disagree.

**Tech Stack:** React 18 + TypeScript, TanStack Query, Supabase JS, `@dnd-kit` (retained for the keycap grid only), Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-08-my-space-nav-design.md`

## Global Constraints

- **No SQL migration in this phase.** The `v: 4` blob lives in the existing `user_preferences.nav_item_order` jsonb column. `home_tile_layout` is left in place, unread after Task 5, so a rollback loses nothing.
- **`CatalogEntry.key` must never be renamed** (`src/lib/navigation/navCatalog.ts:5`) — stored layouts reference these keys.
- **Every write to `user_preferences` goes through the `save_nav_item_order` SECURITY DEFINER RPC.** A direct `.upsert()` 403s whenever the caller's subdomain-derived `current_tenant_id()` disagrees with the row's stored `tenant_id`. Migration: `20260729180000_save_nav_item_order_rpc.sql`.
- **`MY_TOOLS_CAP = 8`** — matches the shipped keycap cap so migration never truncates an existing tile set.
- **The shelf never reorders itself.** No usage, recency, or frequency input to shelf order in this phase or any later one.
- **Visual tokens only, no new ones.** `--radius` 12px, `--card` on `--background`, hairline `--border`, tint on active row only. 44pt minimum targets.
- **`gw-nav-group-state` / `gw_mobile_nav_collapsed`** localStorage keys stay valid — the All Tools disclosure reuses the mobile one.
- Copy is tenant-neutral: "students", never "singers" or "members" as a synonym for students; "graduates", never "alumnae/alumni".
- Gates in `resolveNav` are authoritative. A tool whose gate closes is dropped from the *rendered* shelf but **never removed from the stored record**, so re-enabling a module restores its place.
- Verification gates: `npm run test` and `npm run typecheck:guard` must both pass before any commit.
- **Worktree setup:** this worktree needs `npm ci --legacy-peer-deps` (pdfjs-dist peer conflict). Do not pipe npm output to `tail` — it hides failures.

---

### Task 0: Worktree dependencies

**Files:** none

- [ ] **Step 1: Install dependencies**

```bash
cd ~/Documents/GitHub/gw-worktrees/my-space-nav
npm ci --legacy-peer-deps
```

- [ ] **Step 2: Confirm the baseline is green before changing anything**

```bash
npm run test 2>&1 | tail -20
npm run typecheck:guard 2>&1 | tail -20
```

Expected: both pass. If either fails on a file this plan does not touch, record the failure and continue — it is pre-existing.

---

### Task 1: `myTools.ts` — schema, migration, key resolution

**Files:**
- Create: `src/lib/navigation/myTools.ts`
- Test: `src/lib/navigation/__tests__/myTools.test.ts`

**Interfaces:**
- Consumes: `parseTileLayout`, `TileLayout` from `./appDestinations`; `parseNavOrder` from `@/hooks/useNavItemOrder`; `CatalogEntry` from `./navCatalog`
- Produces:
  - `MY_TOOLS_CAP: 8`
  - `interface MyTools { v: 4; tools: string[]; widgets: string[]; setupComplete: boolean }`
  - `MERGED_KEYS: Record<string, string>`
  - `resolveKey(key: string, map?: Record<string, string>): string`
  - `DEFAULT_TOOLS_FACULTY: string[]`, `DEFAULT_TOOLS_STUDENT: string[]`
  - `sanitizeTools(keys: string[], map?: Record<string, string>): string[]`
  - `migrateToMyTools(navOrderRaw: unknown, tileLayoutRaw: unknown, role: 'student' | 'faculty'): MyTools`
  - `parseMyTools(raw: unknown): MyTools | null`
  - `selectShelfEntries(resolved: CatalogEntry[], tools: string[]): CatalogEntry[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/navigation/__tests__/myTools.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MY_TOOLS_CAP, parseMyTools, migrateToMyTools, sanitizeTools, resolveKey,
  selectShelfEntries, DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY,
} from '../myTools';
import { NAV_CATALOG } from '../navCatalog';

describe('parseMyTools', () => {
  it('accepts a v4 record', () => {
    const raw = { v: 4, tools: ['calendar'], widgets: [], setupComplete: true };
    expect(parseMyTools(raw)).toEqual(raw);
  });
  it('rejects legacy versions and junk', () => {
    expect(parseMyTools({ v: 3, order: ['calendar'] })).toBeNull();
    expect(parseMyTools(null)).toBeNull();
    expect(parseMyTools('nope')).toBeNull();
    expect(parseMyTools([])).toBeNull();
  });
  it('drops non-string entries rather than throwing', () => {
    const parsed = parseMyTools({ v: 4, tools: ['calendar', 7, null], widgets: [], setupComplete: false });
    expect(parsed?.tools).toEqual(['calendar']);
  });
});

describe('resolveKey', () => {
  it('follows a merge map', () => {
    expect(resolveKey('my-fees', { 'my-fees': 'fees' })).toBe('fees');
  });
  it('follows a chain', () => {
    expect(resolveKey('a', { a: 'b', b: 'c' })).toBe('c');
  });
  it('terminates on a cycle instead of hanging', () => {
    expect(resolveKey('a', { a: 'b', b: 'a' })).toBe('b');
  });
  it('returns the key unchanged when unmapped', () => {
    expect(resolveKey('calendar', {})).toBe('calendar');
  });
});

describe('sanitizeTools', () => {
  it('caps at MY_TOOLS_CAP', () => {
    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    expect(sanitizeTools(many)).toHaveLength(MY_TOOLS_CAP);
  });
  it('drops home — it is implicit and never stored', () => {
    expect(sanitizeTools(['home', 'calendar'])).toEqual(['calendar']);
  });
  it('dedupes, keeping first position', () => {
    expect(sanitizeTools(['calendar', 'music-library', 'calendar'])).toEqual(['calendar', 'music-library']);
  });
  it('dedupes across a merge map', () => {
    expect(sanitizeTools(['fees', 'my-fees'], { 'my-fees': 'fees' })).toEqual(['fees']);
  });
});

describe('migrateToMyTools', () => {
  it('returns an existing v4 record untouched', () => {
    const existing = { v: 4, tools: ['studio'], widgets: ['today'], setupComplete: true };
    expect(migrateToMyTools(existing, null, 'student')).toEqual(existing);
  });
  it('prefers home_tile_layout over legacy nav order', () => {
    const tiles = { v: 1, order: ['studio', 'academy'] };
    const legacy = { v: 3, order: ['finance'], sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, tiles, 'student').tools).toEqual(['studio', 'academy']);
  });
  it('falls back to legacy nav order when no tile layout exists', () => {
    const legacy = { v: 3, order: ['home', 'finance', 'studio'], sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, null, 'student').tools).toEqual(['finance', 'studio']);
  });
  it('falls back to role defaults when the member has customized nothing', () => {
    expect(migrateToMyTools(null, null, 'student').tools).toEqual(DEFAULT_TOOLS_STUDENT);
    expect(migrateToMyTools(null, null, 'faculty').tools).toEqual(DEFAULT_TOOLS_FACULTY);
  });
  it('marks setupComplete only when the member had a real prior layout', () => {
    expect(migrateToMyTools(null, { v: 1, order: ['studio'] }, 'student').setupComplete).toBe(true);
    expect(migrateToMyTools(null, null, 'student').setupComplete).toBe(false);
  });
  it('caps a long legacy nav order at 8', () => {
    const legacy = { v: 3, order: NAV_CATALOG.map((e) => e.key), sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, null, 'faculty').tools).toHaveLength(MY_TOOLS_CAP);
  });
});

describe('role defaults', () => {
  it('reference only real catalog keys', () => {
    const keys = new Set(NAV_CATALOG.map((e) => e.key));
    for (const k of [...DEFAULT_TOOLS_STUDENT, ...DEFAULT_TOOLS_FACULTY]) {
      expect(keys.has(k), `${k} is not a catalog key`).toBe(true);
    }
  });
  it('fit within the cap', () => {
    expect(DEFAULT_TOOLS_STUDENT.length).toBeLessThanOrEqual(MY_TOOLS_CAP);
    expect(DEFAULT_TOOLS_FACULTY.length).toBeLessThanOrEqual(MY_TOOLS_CAP);
  });
});

describe('selectShelfEntries', () => {
  const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
  const resolved = ['calendar', 'studio', 'academy'].map((k) => byKey.get(k)!);

  it('returns entries in stored order, not catalog order', () => {
    const got = selectShelfEntries(resolved, ['academy', 'calendar']);
    expect(got.map((e) => e.key)).toEqual(['academy', 'calendar']);
  });
  it('drops tools whose gate closed without disturbing the rest', () => {
    const got = selectShelfEntries(resolved, ['academy', 'box-office', 'calendar']);
    expect(got.map((e) => e.key)).toEqual(['academy', 'calendar']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/navigation/__tests__/myTools.test.ts
```

Expected: FAIL — `Failed to resolve import "../myTools"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/navigation/myTools.ts`:

```ts
// My Tools — the single ordered set of destinations a member has chosen.
// Renders as rows in the sidebar shelf and as keycaps on the House home,
// replacing the two separate systems it supersedes:
//   user_preferences.nav_item_order  (v1-v3, sidebar order + section moves)
//   user_preferences.home_tile_layout (v1, keycap order)
// Stored back into the nav_item_order column as v4 — no DDL required.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { parseTileLayout } from './appDestinations';
import { parseNavOrder } from '@/hooks/useNavItemOrder';
import type { CatalogEntry } from './navCatalog';

/** Matches the shipped keycap cap, so migration never truncates a member's tiles. */
export const MY_TOOLS_CAP = 8;

export interface MyTools {
  v: 4;
  /** ordered catalog keys, max MY_TOOLS_CAP. 'home' is implicit and never stored. */
  tools: string[];
  /** chosen role widgets; [] means "use the role default". Filled in Phase 2. */
  widgets: string[];
  /** true once the member has a deliberate layout (or has seen first-run) */
  setupComplete: boolean;
}

// Retired catalog keys → their surviving successor. Ships EMPTY: the §4
// catalog recut is Phase 5. The resolver exists from day one so that when
// entries do merge, no stored layout has to be rewritten — resolution
// happens on read. NEVER rename a key; add it here instead.
export const MERGED_KEYS: Record<string, string> = {};

/**
 * Follow `map` until the key is unmapped. Cycle-safe: a key already seen
 * terminates the walk rather than looping forever, so a hand-edited or
 * mistakenly circular map degrades to a stale-but-finite answer instead of
 * hanging the render.
 */
export function resolveKey(key: string, map: Record<string, string> = MERGED_KEYS): string {
  const seen = new Set<string>();
  let k = key;
  while (map[k] && !seen.has(k)) {
    seen.add(k);
    k = map[k];
  }
  return k;
}

// Frozen day-one shelves. Changing either list changes what every new member
// in every tenant sees, so it is a deliberate reviewable diff — the same
// discipline DEFAULT_GRID_ORDER follows in appDestinations.ts.
// 'home' is deliberately absent from both: it is always rendered first.
export const DEFAULT_TOOLS_FACULTY = [
  'calendar', 'messages', 'music-library', 'academy',
  'planner', 'people', 'finance', 'part-tracks',
];
export const DEFAULT_TOOLS_STUDENT = [
  'calendar', 'messages', 'music-library', 'academy',
  'part-tracks', 'sight', 'studio', 'my-fees',
];

/** Resolve merges, drop 'home', dedupe keeping first position, cap. */
export function sanitizeTools(keys: string[], map: Record<string, string> = MERGED_KEYS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys) {
    if (typeof raw !== 'string') continue;
    const k = resolveKey(raw, map);
    if (k === 'home' || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MY_TOOLS_CAP) break;
  }
  return out;
}

/** Strict v4 reader. Anything else — including v1-v3 — returns null. */
export function parseMyTools(raw: unknown): MyTools | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 4) return null;
  if (!Array.isArray(o.tools) || !Array.isArray(o.widgets)) return null;
  return {
    v: 4,
    tools: o.tools.filter((k): k is string => typeof k === 'string'),
    widgets: o.widgets.filter((k): k is string => typeof k === 'string'),
    setupComplete: o.setupComplete === true,
  };
}

/**
 * Produce a MyTools record from whatever the member already had, in
 * preference order (spec §6.3):
 *   1. an existing v4 record            → returned untouched
 *   2. home_tile_layout.order           → already a curated <=8 set
 *   3. nav_item_order.order (v1-v3)     → first 8 that survive sanitizing
 *   4. the role default
 * Nobody loses a tool they had placed. setupComplete is true for 2 and 3 so
 * the Phase 2 first-run sheet only greets genuinely new members.
 */
export function migrateToMyTools(
  navOrderRaw: unknown,
  tileLayoutRaw: unknown,
  role: 'student' | 'faculty',
): MyTools {
  const existing = parseMyTools(navOrderRaw);
  if (existing) return existing;

  const tiles = parseTileLayout(tileLayoutRaw);
  if (tiles && tiles.order.length > 0) {
    return { v: 4, tools: sanitizeTools(tiles.order), widgets: [], setupComplete: true };
  }

  const legacy = parseNavOrder(navOrderRaw);
  if (legacy && legacy.order.length > 0) {
    return { v: 4, tools: sanitizeTools(legacy.order), widgets: [], setupComplete: true };
  }

  const defaults = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  return { v: 4, tools: sanitizeTools(defaults), widgets: [], setupComplete: false };
}

/**
 * Map stored keys onto gated catalog entries, preserving STORED order (not
 * catalog order — that ordering is the whole point of the shelf). A tool
 * whose gate has closed is skipped here but deliberately left in the stored
 * record, so re-enabling the module restores its original position.
 */
export function selectShelfEntries(resolved: CatalogEntry[], tools: string[]): CatalogEntry[] {
  const byKey = new Map(resolved.map((e) => [e.key, e]));
  return tools
    .map((k) => byKey.get(resolveKey(k)))
    .filter((e): e is CatalogEntry => e !== undefined);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/navigation/__tests__/myTools.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck:guard 2>&1 | tail -5
git add src/lib/navigation/myTools.ts src/lib/navigation/__tests__/myTools.test.ts
git commit -m "feat(nav): My Tools schema, legacy migration, and key resolution"
```

---

### Task 2: `useMyTools` hook

**Files:**
- Create: `src/hooks/useMyTools.ts`
- Test: `src/hooks/__tests__/useMyTools.test.tsx`

**Interfaces:**
- Consumes: `migrateToMyTools`, `sanitizeTools`, `MyTools` from `@/lib/navigation/myTools`
- Produces: `useMyTools(role: 'student' | 'faculty'): { myTools: MyTools | null; loading: boolean; saveTools: (tools: string[]) => Promise<boolean> }`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useMyTools.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const maybeSingle = vi.fn();
const rpc = vi.fn();
const upsert = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }), upsert }),
    rpc,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

import { useMyTools } from '../useMyTools';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  maybeSingle.mockReset();
  rpc.mockReset();
  upsert.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe('useMyTools', () => {
  it('migrates a legacy tile layout on read', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: null, home_tile_layout: { v: 1, order: ['studio', 'academy'] } },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools).toEqual(['studio', 'academy']);
    expect(result.current.myTools?.setupComplete).toBe(true);
  });

  it('falls back to role defaults when the row is missing', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools[0]).toBe('calendar');
    expect(result.current.myTools?.setupComplete).toBe(false);
  });

  it('saves through the RPC and never through a direct upsert', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveTools(['studio', 'academy']); });

    expect(rpc).toHaveBeenCalledWith('save_nav_item_order', {
      p_nav_item_order: { v: 4, tools: ['studio', 'academy'], widgets: [], setupComplete: true },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('caps a save at 8 tools', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    await act(async () => { await result.current.saveTools(many); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[] };
    expect(sent.tools).toHaveLength(8);
  });

  it('rolls the cache back when the save fails', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({ error: { message: 'denied' } });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.myTools?.tools;

    let ok = true;
    await act(async () => { ok = await result.current.saveTools(['studio']); });

    expect(ok).toBe(false);
    expect(result.current.myTools?.tools).toEqual(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/hooks/__tests__/useMyTools.test.tsx
```

Expected: FAIL — `Failed to resolve import "../useMyTools"`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useMyTools.ts`:

```ts
// Read/write the member's My Tools set — the single ordered list rendered
// as both the sidebar shelf and the home keycap grid. Supersedes
// useNavItemOrder and useHomeTileLayout.
//
// Reads BOTH legacy columns so a member who customized either one keeps
// their layout; migrateToMyTools resolves the precedence. Writes go only to
// nav_item_order, and only through the RPC.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { migrateToMyTools, sanitizeTools, type MyTools } from '@/lib/navigation/myTools';

export function useMyTools(role: 'student' | 'faculty') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const key = ['my-tools', uid ?? 'anon'] as const;

  const { data: myTools = null, isLoading } = useQuery<MyTools | null>({
    queryKey: key,
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('nav_item_order, home_tile_layout')
          .eq('user_id', uid!)
          .maybeSingle();
        if (error) {
          console.warn('[useMyTools] load failed:', error.message);
          return migrateToMyTools(null, null, role);
        }
        return migrateToMyTools(data?.nav_item_order ?? null, data?.home_tile_layout ?? null, role);
      } catch (err) {
        console.warn('[useMyTools] load failed:', err);
        return migrateToMyTools(null, null, role);
      }
    },
  });

  const saveTools = useCallback(async (tools: string[]): Promise<boolean> => {
    if (!uid) return false;
    const next: MyTools = {
      v: 4,
      tools: sanitizeTools(tools),
      widgets: myTools?.widgets ?? [],
      // Any deliberate save is, by definition, a completed setup.
      setupComplete: true,
    };
    // Optimistic write BEFORE the round-trip. Without it the shelf and grid
    // re-render from the stale cache for the ~200-500ms the RPC takes,
    // snapping every moved tile back and then forward again — reads as a
    // whole-screen blink. (Same reasoning as the old useNavItemOrder.)
    const previous = queryClient.getQueryData<MyTools | null>(key) ?? null;
    queryClient.setQueryData(key, next);
    try {
      // save_nav_item_order is SECURITY DEFINER: it bypasses the RESTRICTIVE
      // tenant_isolation_restrict policy on user_preferences and resyncs
      // tenant_id to current_tenant_id() on every save. A direct upsert 403s
      // whenever the caller's subdomain-derived tenant disagrees with the
      // stored row. Do not replace it.
      const { error } = await supabase.rpc('save_nav_item_order' as never, {
        p_nav_item_order: next,
      });
      if (error) {
        console.warn('[useMyTools] save failed:', error.message);
        queryClient.setQueryData(key, previous);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[useMyTools] save failed:', err);
      queryClient.setQueryData(key, previous);
      return false;
    }
  }, [uid, myTools?.widgets, queryClient, key]);

  return { myTools, loading: isLoading, saveTools };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/hooks/__tests__/useMyTools.test.tsx
```

Expected: PASS, all five cases. If `@testing-library/react`'s `renderHook` is unavailable, check `package.json` — it is already a devDependency used by other hook tests.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck:guard 2>&1 | tail -5
git add src/hooks/useMyTools.ts src/hooks/__tests__/useMyTools.test.tsx
git commit -m "feat(nav): useMyTools hook reading both legacy columns, writing via RPC"
```

---

### Task 3: `NavShelf` component

**Files:**
- Create: `src/components/dashboard/NavShelf.tsx`
- Test: `src/components/dashboard/NavShelf.test.tsx`

**Interfaces:**
- Consumes: `CatalogEntry` from `@/lib/navigation/navCatalog`
- Produces:
```ts
interface NavShelfProps {
  home: CatalogEntry;
  tools: CatalogEntry[];
  sections: Array<{ key: string; label: string; items: CatalogEntry[] }>;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}
export function NavShelf(props: NavShelfProps): JSX.Element
```

**Why the sections prop still exists.** The All Tools search sheet is Phase 3. Until it lands, deleting the sectioned list would strand every destination outside a member's 8 tools. So Phase 1 *demotes* the existing list behind one disclosure row rather than removing it. The accordion rendering dies in Phase 3.

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/NavShelf.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavShelf, type NavShelfProps } from './NavShelf';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const home = byKey.get('home')!;
const tools = ['calendar', 'music-library', 'academy'].map((k) => byKey.get(k)!);
const sections = [
  { key: 'money', label: 'Money', items: [byKey.get('finance')!] },
  { key: 'admin', label: 'Admin', items: [byKey.get('settings')!] },
];

const renderShelf = (props: Partial<NavShelfProps> = {}) =>
  render(
    <MemoryRouter>
      <NavShelf home={home} tools={tools} sections={sections} variant="desktop" {...props} />
    </MemoryRouter>,
  );

describe('NavShelf', () => {
  it('renders Home first, then the tools in stored order', () => {
    renderShelf();
    const shelf = screen.getByTestId('nav-shelf-tools');
    const labels = within(shelf).getAllByRole('link').map((a) => a.textContent);
    expect(labels).toEqual(['Command Center', 'Calendar', 'Music Library', 'Academy']);
  });

  it('does not render section headers on the shelf itself', () => {
    renderShelf();
    const shelf = screen.getByTestId('nav-shelf-tools');
    expect(within(shelf).queryByText('Money')).toBeNull();
  });

  it('hides every non-shelf destination until All Tools is opened', () => {
    renderShelf();
    expect(screen.queryByText('Finance')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /all tools/i }));
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
  });

  it('caps the shelf at Home + 8 tools even if handed more', () => {
    const many = NAV_CATALOG.filter((e) => e.key !== 'home').slice(0, 20);
    renderShelf({ tools: many });
    const shelf = screen.getByTestId('nav-shelf-tools');
    expect(within(shelf).getAllByRole('link')).toHaveLength(9);
  });

  it('renders no drag handles — reordering is not a shelf gesture', () => {
    const { container } = renderShelf();
    expect(container.querySelector('[data-shelf-draggable]')).toBeNull();
    expect(screen.getByTestId('nav-shelf-tools').querySelectorAll('.cursor-grab')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/dashboard/NavShelf.test.tsx
```

Expected: FAIL — `Failed to resolve import "./NavShelf"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/dashboard/NavShelf.tsx`:

```tsx
// NavShelf — the flat member-chosen navigation shelf.
//
//   Home                  always first, never consumes a slot
//   <up to 8 tools>       the member's My Tools set, in their order
//   ─────────
//   All Tools             disclosure holding every other destination
//
// No sections on the shelf, no accordions, no drag reorder: arranging is a
// Phase 2 task performed on /dashboard/my-space, not a gesture performed on
// the live nav. The `sections` disclosure is a Phase 1 bridge — Phase 3
// replaces it with the searchable All Tools sheet.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.2
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { MY_TOOLS_CAP } from '@/lib/navigation/myTools';
import type { CatalogEntry } from '@/lib/navigation/navCatalog';

export interface NavShelfProps {
  home: CatalogEntry;
  tools: CatalogEntry[];
  sections: Array<{ key: string; label: string; items: CatalogEntry[] }>;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

const ROW_BASE =
  'flex items-center gap-2.5 rounded-md leading-tight transition-colors w-full text-left';
const ROW_DESKTOP = 'px-2 py-2 text-[15px] min-h-[44px]';
const ROW_MOBILE = 'px-2.5 py-2.5 !text-[17px] min-h-[44px]';
const ROW_INACTIVE = 'text-foreground/85 hover:bg-muted hover:text-foreground';
const ROW_ACTIVE = 'bg-primary/10 text-primary font-semibold';

function Row({ entry, variant, onNavigate }: {
  entry: CatalogEntry; variant: 'desktop' | 'mobile'; onNavigate?: () => void;
}) {
  const size = variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE;
  const icon = variant === 'desktop' ? 'w-[18px] h-[18px]' : 'w-5 h-5';
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      data-tour={entry.tourId}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${ROW_BASE} ${size} ${isActive ? ROW_ACTIVE : ROW_INACTIVE}`
      }
    >
      <entry.icon className={`${icon} shrink-0 text-slate-500`} />
      <span className="truncate">{entry.label}</span>
    </NavLink>
  );
}

export function NavShelf({ home, tools, sections, variant, onNavigate }: NavShelfProps) {
  const [allOpen, setAllOpen] = useState(false);

  // Defensive cap. useMyTools already sanitizes, but the shelf's whole
  // promise is that it cannot grow into a list — enforce it at the render
  // boundary too, so a stale cache or a future caller can't break it.
  const shelf = tools.filter((t) => t.key !== home.key).slice(0, MY_TOOLS_CAP);
  const shelfKeys = new Set([home.key, ...shelf.map((t) => t.key)]);

  // Everything not already on the shelf, still grouped, for the disclosure.
  const rest = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !shelfKeys.has(i.key)) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="space-y-1">
      <div data-testid="nav-shelf-tools" className="space-y-0.5">
        <Row entry={home} variant={variant} onNavigate={onNavigate} />
        {shelf.map((t) => (
          <Row key={t.key} entry={t} variant={variant} onNavigate={onNavigate} />
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <div className="h-px bg-border mx-2 my-2" />
          <button
            type="button"
            onClick={() => setAllOpen((o) => !o)}
            aria-expanded={allOpen}
            className={`${ROW_BASE} ${variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE} ${ROW_INACTIVE} justify-between`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutGrid className={`${variant === 'desktop' ? 'w-[18px] h-[18px]' : 'w-5 h-5'} shrink-0 text-slate-500`} />
              All Tools
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${allOpen ? '' : '-rotate-90'}`}
              aria-hidden
            />
          </button>

          {allOpen && (
            <div className="space-y-1.5 pt-1">
              {rest.map((section) => (
                <div key={section.key} className="rounded-lg bg-muted/40 ring-1 ring-border/60 p-1.5 space-y-0.5">
                  <div className="px-2 pb-1 pt-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-foreground">
                    {section.label}
                  </div>
                  {section.items.map((item) => (
                    <Row key={item.key} entry={item} variant={variant} onNavigate={onNavigate} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/dashboard/NavShelf.test.tsx
```

Expected: PASS, all five cases.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck:guard 2>&1 | tail -5
git add src/components/dashboard/NavShelf.tsx src/components/dashboard/NavShelf.test.tsx
git commit -m "feat(nav): NavShelf — flat shelf with All Tools disclosure"
```

---

### Task 4: Wire `NavShelf` into `DashboardShell`

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx` (desktop `Sidebar` ~line 275–578, mobile `MobileNav` ~line 585–695)

**Interfaces:**
- Consumes: `NavShelf` (Task 3), `useMyTools` (Task 2), `selectShelfEntries` (Task 1)
- Produces: no new exports. `buildNavSections` keeps its current signature but is called without user-order arguments.

- [ ] **Step 1: Replace the desktop nav body**

In `Sidebar`, delete the `collapsed` state, `toggleSection`, `dragSensors`, and the whole `onNavDragEnd` function (~lines 291–300 and 345–395). Replace the `<nav>` block (~lines 470–561) with:

```tsx
      <nav className="flex-1 overflow-y-auto pt-4 sm:pt-5 pb-2 px-2">
        <NavShelf home={homeEntry} tools={shelfTools} sections={sections} variant="desktop" />
      </nav>
```

Above it, replace the `sections` derivation (~line 344) with:

```tsx
  // Sections are no longer the shelf — they populate the All Tools
  // disclosure only. Passing no user order keeps them in catalog order.
  const sections = buildNavSections(navCtx);
  const isFaculty = !!profile?.is_admin || !!profile?.is_super_admin || profile?.role === 'instructor';
  const { myTools } = useMyTools(isFaculty ? 'faculty' : 'student');
  const resolvedEntries = sections.flatMap((s) => s.items);
  const homeEntry = resolvedEntries.find((e) => e.key === 'home');
  const shelfTools = selectShelfEntries(resolvedEntries, myTools?.tools ?? []);
```

- [ ] **Step 2: Guard the Home entry**

`homeEntry` is `CatalogEntry | undefined` — `home` carries no gate today, but a tenant-level `hiddenRoutes` entry for `/dashboard` would remove it and crash the shelf. Immediately after the derivation above:

```tsx
  // 'home' has no gate, but hiddenRoutes could still remove it. A shell
  // without a Home row is far better than a white screen.
  if (!homeEntry) return null;
```

Place this **after every hook call** in `Sidebar` — an early return above a hook violates the rules of hooks and will trip the lint rule.

- [ ] **Step 3: Replace the mobile drawer nav body**

In `MobileNav`, delete `collapsedSections`, `toggleSection`, and the `gw_mobile_nav_collapsed` localStorage reads/writes. Replace the `<nav>` block with:

```tsx
      <nav className="flex-1 overflow-y-auto pt-2 px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <NavShelf
          home={homeEntry}
          tools={shelfTools}
          sections={sections}
          variant="mobile"
          onNavigate={onNavigate}
        />
      </nav>
```

with the same derivation and `if (!homeEntry) return null;` guard as Step 1–2, and `const { navOrder } = useNavItemOrder();` removed.

- [ ] **Step 4: Clean the imports**

Remove from the `DashboardShell.tsx` import block, and delete the now-unused helper definitions in the file:

- `DndContext`, `useSensor`, `useSensors`, `PointerSensor`, `arrayMove`, `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `useDroppable`, `CSS`, and the `DragEndEvent` type
- the `SortableNavRow` and `DroppableSection` component definitions (~lines 141–179)
- `DEFAULT_COLLAPSED` and `loadCollapsed` (~lines 261–273)
- `ChevronRight` if no other use remains
- `useNavItemOrder` import

Add:

```tsx
import { NavShelf } from './NavShelf';
import { useMyTools } from '@/hooks/useMyTools';
import { selectShelfEntries } from '@/lib/navigation/myTools';
```

- [ ] **Step 5: Run the full suite**

```bash
npm run test 2>&1 | tail -20
npm run typecheck:guard 2>&1 | tail -20
```

Expected: PASS. `DashboardShell.brand.test.tsx` exercises the brand block, which this task does not touch — if it fails, the cause is an import you removed that the brand path still needs.

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:8080/dashboard` signed in as an admin. Confirm: the sidebar shows Home plus at most 8 rows, no section headers above the divider, "All Tools" expands to the grouped remainder, and press-and-hold on a row no longer starts a drag.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "feat(nav): flat shelf in sidebar and drawer; drop drag reorder and accordions"
```

---

### Task 5: Keycap grid reads My Tools

**Files:**
- Modify: `src/lib/navigation/appDestinations.ts:118-147` (`getAppTiles`)
- Modify: `src/pages/dashboard/HouseHome.tsx` (tile layout wiring, ~line 318)
- Test: `src/lib/navigation/__tests__/appDestinations.test.ts` (extend)

**Interfaces:**
- Consumes: `MyTools` from `@/lib/navigation/myTools`, `useMyTools` from `@/hooks/useMyTools`
- Produces: `getAppTiles(role, flags, nav, tools?: string[] | null)` — the fourth parameter changes from `TileLayout | null` to `string[] | null`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/navigation/__tests__/appDestinations.test.ts`:

```ts
describe('getAppTiles with a My Tools key list', () => {
  const nav: NavContext = {
    hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: false,
    canLibrarian: true, isPartner: false, hiddenRoutes: new Set(),
  };
  const flags: ModuleFlags = {
    hasViewer: true, hasStudio: true, hasSightReading: true, hasBoxOffice: true,
    hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
    hasStore: true, hasSongwriting: true, hasPlanner: true,
  };

  it('honours stored order', () => {
    const { primary } = getAppTiles('faculty', flags, nav, ['finance', 'academy']);
    expect(primary.map((d) => d.key)).toEqual(['finance', 'academy']);
  });

  it('drops keys the tab bar already claims by route', () => {
    const tabRoutes = new Set(getTabItems('faculty', flags).map((t) => t.to));
    const { primary } = getAppTiles('faculty', flags, nav, ['messages', 'finance']);
    for (const d of primary) expect(tabRoutes.has(d.to)).toBe(false);
  });

  it('falls back to the frozen default grid when handed nothing', () => {
    const { primary } = getAppTiles('faculty', flags, nav, null);
    expect(primary.length).toBeGreaterThan(0);
    expect(primary.length).toBeLessThanOrEqual(8);
  });
});
```

Add `getTabItems`, `ModuleFlags`, and `NavContext` to the file's existing imports if they are not already there.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/navigation/__tests__/appDestinations.test.ts
```

Expected: FAIL — `getAppTiles` receives `string[]` where `TileLayout | null` is declared.

- [ ] **Step 3: Change the signature**

In `src/lib/navigation/appDestinations.ts`, change the `getAppTiles` signature and its custom-layout branch:

```ts
export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags, nav: NavContext, tools?: string[] | null):
  { primary: Destination[]; overflow: Destination[] } {
```

and replace `if (!layout) {` with `if (!tools || tools.length === 0) {`, and the custom branch's body with:

```ts
  // My Tools order, filtered to what is still enabled and un-claimed by the
  // tab bar. Stale keys drop silently; the stored record is never rewritten,
  // so re-enabling a module restores its old spot.
  const byKey = new Map(enabled.map((d) => [d.key, d]));
  const primary = tools
    .map((k) => byKey.get(k))
    .filter((d): d is Destination => d !== undefined);
  const pinned = new Set(primary.map((d) => d.key));
  return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
```

Leave `parseTileLayout`, `TileLayout`, and `DEFAULT_GRID_ORDER` exported — `myTools.ts` still imports `parseTileLayout` for migration, and the default branch still uses `DEFAULT_GRID_ORDER`.

- [ ] **Step 4: Rewire HouseHome**

In `src/pages/dashboard/HouseHome.tsx`, replace the `useHomeTileLayout` usage with:

```tsx
  const { myTools, loading: layoutLoading, saveTools } = useMyTools(isFaculty ? 'faculty' : 'student');
```

pass `myTools?.tools ?? null` where `layout` was passed to `getAppTiles`, and pass `saveTools` where `saveTileLayout` was passed to `HomeTileGrid`. Update the import to `import { useMyTools } from '@/hooks/useMyTools';` and drop the `useHomeTileLayout` import.

`HomeTileGrid`'s `onSave` prop is `(order: string[]) => Promise<boolean>`, which `saveTools` matches exactly — no change inside `HomeTileGrid`.

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/lib/navigation/__tests__/appDestinations.test.ts
npm run test 2>&1 | tail -20
npm run typecheck:guard 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 6: Verify the two surfaces agree**

```bash
npm run dev
```

At `/dashboard`, long-press a keycap, move a tile, save. Reload. Confirm the sidebar shelf order changed to match — one record, two renderings. This is the phase's core promise; do not skip it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/navigation/appDestinations.ts src/pages/dashboard/HouseHome.tsx src/lib/navigation/__tests__/appDestinations.test.ts
git commit -m "feat(nav): home keycaps read My Tools so shelf and grid always agree"
```

---

### Task 6: Delete the dead nav taxonomy and retire the superseded hooks

**Files:**
- Delete: `src/components/navigation/AppNavigation.tsx`
- Delete: `src/hooks/useHomeTileLayout.ts`
- Modify: `src/components/layout/UniversalHeader.tsx:17`
- Modify: `src/hooks/useNavItemOrder.ts`

- [ ] **Step 1: Confirm nothing else references them**

```bash
cd ~/Documents/GitHub/gw-worktrees/my-space-nav
grep -rn "AppNavigation" src/ | grep -v "^src/components/navigation/AppNavigation.tsx"
grep -rn "useHomeTileLayout" src/
grep -rn "useNavItemOrder" src/
```

Expected: the first prints only `src/components/layout/UniversalHeader.tsx:17` (an import that is never rendered). The second prints nothing after Task 5. The third prints only `useNavItemOrder.ts` itself plus the `parseNavOrder` import inside `myTools.ts`. **If anything else appears, stop and report it** — the deletion is not safe.

- [ ] **Step 2: Delete the dead files and the dangling import**

```bash
git rm src/components/navigation/AppNavigation.tsx src/hooks/useHomeTileLayout.ts
```

Then delete line 17 of `src/components/layout/UniversalHeader.tsx`:

```tsx
import { AppNavigation } from "@/components/navigation/AppNavigation";
```

- [ ] **Step 3: Reduce `useNavItemOrder.ts` to its parser**

`migrateToMyTools` still needs `parseNavOrder` to read v1–v3 blobs. Delete the `useNavItemOrder` hook and the `NavOrder`-writing path, keeping only:

```ts
// Legacy nav-order parser. The useNavItemOrder hook it belonged to was
// superseded by useMyTools (2026-08-08); this parser survives because
// migrateToMyTools still reads v1-v3 blobs written before that change.
// Delete once no stored preference predates v4.
export interface NavOrder {
  v: 3;
  order: string[];
  sections: Record<string, string>;
  sectionOrder: string[];
}

export function parseNavOrder(raw: unknown): NavOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { v?: unknown; order?: unknown; sections?: unknown; sectionOrder?: unknown };
  const version = candidate.v;
  if (version !== 1 && version !== 2 && version !== 3) return null;
  if (!Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((k): k is string => typeof k === 'string');
  if (!order.length) return null;
  const sections: Record<string, string> = {};
  if ((version === 2 || version === 3) && candidate.sections && typeof candidate.sections === 'object') {
    for (const [k, v] of Object.entries(candidate.sections as Record<string, unknown>)) {
      if (typeof v === 'string') sections[k] = v;
    }
  }
  const sectionOrder: string[] = [];
  if (version === 3 && Array.isArray(candidate.sectionOrder)) {
    for (const s of candidate.sectionOrder) if (typeof s === 'string') sectionOrder.push(s);
  }
  return { v: 3, order, sections, sectionOrder };
}
```

Note the `v: 4` guard: `parseNavOrder` returns `null` for v4 blobs (4 is not in the accepted
set), so `migrateToMyTools`'s fallback chain cannot mistake a current record for a legacy one.

Move the file to `src/lib/navigation/legacyNavOrder.ts` and update the import in `myTools.ts` to `from './legacyNavOrder'`, so a hook file no longer sits in `hooks/` with no hook in it.

- [ ] **Step 4: Run the full suite**

```bash
npm run test 2>&1 | tail -20
npm run typecheck:guard 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```

Expected: all pass. Lint is included here specifically because unused-import errors are the likely failure after a deletion pass.

- [ ] **Step 5: Confirm the bundle still builds**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds. A removed import that Vite's `manualChunks` referenced would surface here rather than in tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(nav): delete dead AppNavigation taxonomy and retire superseded hooks"
```

---

## Done criteria

Phase 1 is complete when all of the following hold:

1. `npm run test`, `npm run typecheck:guard`, `npm run lint`, and `npm run build` all pass.
2. The sidebar renders at most Home + 8 tools + the All Tools row, for every role, in a tenant with every module enabled.
3. No destination reachable before this change is unreachable after it — verified by expanding All Tools as a platform super-admin and finding every previously-visible entry.
4. Reordering keycaps on `/dashboard` changes the sidebar order after reload, and vice versa.
5. A member with an existing `home_tile_layout` sees exactly those tools on the shelf after first load.
6. Saving a layout issues exactly one `save_nav_item_order` RPC and zero `user_preferences` upserts (check the Network tab).

## Deliberately out of scope

- `/dashboard/my-space` and the first-run sheet — **Phase 2**
- The All Tools search sheet and ⌘K, which replace the disclosure added in Task 3 — **Phase 3**
- `gw_nav_usage`, Suggestions, seeded tenant defaults, nudges — **Phase 4**
- The §4 catalog recut and populating `MERGED_KEYS` — **Phase 5**
- Dropping the `home_tile_layout` column — after Phase 2 ships and rollback is no longer wanted
- `MobileBottomNav` module gating — tracked in spec §11
