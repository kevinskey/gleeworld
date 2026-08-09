# My Space Phase 2 — the setup screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give members a real screen at `/dashboard/my-space` where they arrange their tools and widgets, replace the first-login guess with a picker, and let tenant admins set the default shelf each role starts from.

**Architecture:** One editor component, `MySpaceEditor`, renders the iOS Settings → Control Center shape (included list with ⊖ and drag handles, available list with ⊕, widgets group). It is presentation-only — it takes `tools`, `widgets`, and a catalog, and emits changes. Three callers mount it: the `/dashboard/my-space` page (personal), the same page's admin "Defaults for members" mode (tenant defaults per role), and a first-run sheet. Personal edits write the existing `MyTools` v4 record through the `save_nav_item_order` RPC; tenant defaults write a new `default_tools` column on `gw_tenant_nav_prefs`.

**Tech Stack:** React 18 + TypeScript, TanStack Query, Supabase JS, `@dnd-kit` (already a dependency), Radix Sheet/Tabs, Vitest, Tailwind with the Apple iOS token set.

**Spec:** `docs/superpowers/specs/2026-08-08-my-space-nav-design.md` §5.4, §6.1, §6.2
**Builds on:** Phase 1 (`docs/superpowers/plans/2026-08-08-my-space-phase1.md`), merged into this branch's ancestry at `a418aab48`.

## Global Constraints

- **`MY_TOOLS_CAP` is 8. Widgets cap is 2** (House spec §5.1 caps role widgets at 2). Both enforced on write and at the render boundary.
- **Personal writes go through the `save_nav_item_order` SECURITY DEFINER RPC.** Never a direct upsert on `user_preferences` — it 403s when subdomain-derived `current_tenant_id()` disagrees with the stored row.
- **Tenant-default writes go to `gw_tenant_nav_prefs` by direct upsert with `onConflict: 'tenant_id,role'`**, matching the existing `hidden_items` write path in `WorkspaceSettingsPage.tsx`. That table has its own BEFORE INSERT trigger and RESTRICTIVE tenant isolation; do not add an RPC for it.
- **`CatalogEntry.key` must never be renamed** — stored records reference these keys.
- **The shelf never auto-reorders.** Nothing in this phase may sort by usage, recency, or frequency.
- **Apple tokens only, no new ones:** `--card` on `--background`, `--radius` 12px, hairline `--border`, tint on ⊕/✓ badges and the active row only. `--font-body` 17px rows, `--font-footnote` 13px captions, 44pt minimum targets.
- Copy is tenant-neutral: "students", never "singers"; "graduates", never "alumnae/alumni".
- **Do not apply the migration.** Write the file only. Kevin runs production DDL himself — the self-hosted database has no `schema_migrations` table, so applying it from here would leave no record and could collide.
- Gates in `resolveNav` remain authoritative: an entry a member cannot access must never be offered by ⊕, and a stored key whose gate closed must stay stored (so re-enabling a module restores its place) while not rendering.
- Verification gates: `npm run test`, `npm run typecheck:guard`, `npm run lint`, `npm run build`.
- **Worktree setup:** `npm ci --legacy-peer-deps` (pdfjs-dist peer conflict). Never pipe npm output to `tail` — it hides failures.

---

### Task 0: Worktree dependencies and baseline

**Files:** none

- [ ] **Step 1: Install dependencies**

```bash
cd ~/Documents/GitHub/gw-worktrees/my-space-p2
npm ci --legacy-peer-deps
```

- [ ] **Step 2: Record the baseline before changing anything**

```bash
npm run test 2>&1 | tail -20
npm run typecheck:guard 2>&1 | tail -5
```

Expected: 6 test files fail — `heroDrag`, `appDestinations` (one known-red case about `/all-state` in `KNOWN_ROUTES`), `v1_to_v2`, `WorkspaceSettingsPage.branding-general-upsert`, `NoteEditor`, `SightReadingStudio`. These fail on `origin/main` and are NOT yours. Write the exact list down; any file outside it that goes red later is your regression.

---

### Task 1: Data layer — `default_tools` column, tenant-defaults hook, widget saves

**Files:**
- Create: `supabase/migrations/20260808120000_tenant_default_tools.sql`
- Create: `src/hooks/useTenantDefaultTools.ts`
- Modify: `src/hooks/useMyTools.ts`
- Test: `src/hooks/__tests__/useTenantDefaultTools.test.tsx`
- Test: `src/hooks/__tests__/useMyTools.test.tsx` (extend)

**Interfaces:**
- Consumes: `MyTools`, `sanitizeTools`, `MY_TOOLS_CAP` from `@/lib/navigation/myTools`; `NavRole` from `@/lib/navigation/navCatalog`
- Produces:
  - `useTenantDefaultTools(): { defaultsByRole: Record<NavRole, string[]>, loading: boolean, saveDefaults: (role: NavRole, tools: string[]) => Promise<boolean> }`
  - `useMyTools(role)` additionally returns `saveMyTools: (patch: { tools?: string[]; widgets?: string[]; setupComplete?: boolean }) => Promise<boolean>`

**Why the spec's shape is not what we build.** Spec §6.2 proposes `default_tools jsonb` holding `{ admin: [], student: [], member: [] }`. But `gw_tenant_nav_prefs` is already keyed `PRIMARY KEY (tenant_id, role)` — one row per role — so a per-role JSON blob would nest role inside a table already partitioned by role, and every write would read-modify-write the other roles' data. Use a plain `text[] default_tools` column beside `hidden_items`, matching that column exactly. Record this deviation in the spec (Step 7).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260808120000_tenant_default_tools.sql`:

```sql
-- Per-role default shelf: the My Tools set a member of this tenant starts
-- with before they arrange their own. Sits beside hidden_items on the same
-- (tenant_id, role) row — that table is already partitioned by role, so a
-- role-keyed JSON blob would nest role inside role.
--
-- Empty array means "no tenant default set" and callers fall back to the
-- platform role default (DEFAULT_TOOLS_FACULTY / DEFAULT_TOOLS_STUDENT).
-- NULL is not used: the column is NOT NULL DEFAULT '{}' so readers never
-- branch on two kinds of absent.
--
-- Values are catalog keys (CatalogEntry.key), NOT routes. hidden_items
-- stores ROUTES; these two columns deliberately differ, because hiding is
-- route-based (it predates the catalog) and shelves are key-based.
-- Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.2

ALTER TABLE public.gw_tenant_nav_prefs
  ADD COLUMN IF NOT EXISTS default_tools text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.gw_tenant_nav_prefs.default_tools IS
  'Ordered CatalogEntry.key list, max 8, that new members of this role start with. Empty = use the platform default.';
```

No RLS changes: the existing `tenant_isolation_restrict`, `nav_prefs_read`, and `nav_prefs_admin_write` policies already cover every column on this table.

- [ ] **Step 2: Verify the migration stamp is unique**

```bash
ls supabase/migrations/ | grep 20260808 || echo "stamp free"
```

Expected: only your new file. If another migration already carries `20260808120000`, bump yours to the next free minute — a colliding stamp has bitten this repo before.

- [ ] **Step 3: Write the failing tests**

Create `src/hooks/__tests__/useTenantDefaultTools.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ select: vi.fn(), upsert: vi.fn(), getSession: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: h.select, upsert: h.upsert }),
    auth: { getSession: h.getSession },
  },
}));
vi.mock('@/lib/jwt', () => ({ decodeJwtClaims: () => ({ tenant_id: 't1' }) }));

import { useTenantDefaultTools } from '../useTenantDefaultTools';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  h.select.mockReset(); h.upsert.mockReset(); h.getSession.mockReset();
  h.getSession.mockResolvedValue({ data: { session: { access_token: 'x', user: { id: 'u1' } } } });
  h.upsert.mockResolvedValue({ error: null });
});

describe('useTenantDefaultTools', () => {
  it('maps rows to a role-keyed record', async () => {
    h.select.mockResolvedValue({
      data: [{ role: 'student', default_tools: ['calendar', 'academy'] }],
      error: null,
    });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.defaultsByRole.student).toEqual(['calendar', 'academy']);
    expect(result.current.defaultsByRole.admin).toEqual([]);
  });

  it('returns empty arrays for every role when the query fails', async () => {
    h.select.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.defaultsByRole).toEqual({ admin: [], student: [], member: [] });
  });

  it('upserts on (tenant_id,role) and caps at 8', async () => {
    h.select.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    await act(async () => { await result.current.saveDefaults('student', many); });

    const [row, opts] = h.upsert.mock.calls[0];
    expect(row.role).toBe('student');
    expect(row.tenant_id).toBe('t1');
    expect(row.default_tools).toHaveLength(8);
    expect(opts).toEqual({ onConflict: 'tenant_id,role' });
  });

  it('returns false and does not throw when the upsert fails', async () => {
    h.select.mockResolvedValue({ data: [], error: null });
    h.upsert.mockResolvedValue({ error: { message: 'denied' } });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => { ok = await result.current.saveDefaults('student', ['calendar']); });
    expect(ok).toBe(false);
  });
});
```

Append to `src/hooks/__tests__/useMyTools.test.tsx`:

```tsx
describe('saveMyTools', () => {
  it('patches widgets without disturbing tools', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: ['studio'], widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveMyTools({ widgets: ['today'] }); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; widgets: string[] };
    expect(sent.tools).toEqual(['studio']);
    expect(sent.widgets).toEqual(['today']);
  });

  it('caps widgets at 2', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.saveMyTools({ widgets: ['a', 'b', 'c'] }); });
    const sent = rpc.mock.calls[0][1].p_nav_item_order as { widgets: string[] };
    expect(sent.widgets).toHaveLength(2);
  });

  it('can mark setup complete without changing anything else', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.myTools!.tools;

    await act(async () => { await result.current.saveMyTools({ setupComplete: true }); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; setupComplete: boolean };
    expect(sent.tools).toEqual(before);
    expect(sent.setupComplete).toBe(true);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npx vitest run src/hooks/__tests__/useTenantDefaultTools.test.tsx src/hooks/__tests__/useMyTools.test.tsx
```

Expected: FAIL — `Failed to resolve import "../useTenantDefaultTools"`, and `saveMyTools is not a function`.

- [ ] **Step 5: Write `useTenantDefaultTools`**

Create `src/hooks/useTenantDefaultTools.ts`:

```ts
// Per-role default shelves for this tenant. Read by the first-run sheet and
// by My Space's "Defaults for members" mode; written only by tenant admins.
//
// Writes go by direct upsert (NOT the save_nav_item_order RPC) because
// gw_tenant_nav_prefs has its own BEFORE INSERT trigger filling tenant_id
// and its own RESTRICTIVE isolation policy — the same path the existing
// hidden_items editor in WorkspaceSettingsPage uses.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.2
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { decodeJwtClaims } from '@/lib/jwt';
import { sanitizeTools } from '@/lib/navigation/myTools';
import type { NavRole } from '@/lib/navigation/navCatalog';

export type DefaultsByRole = Record<NavRole, string[]>;

const EMPTY: DefaultsByRole = { admin: [], student: [], member: [] };

export function useTenantDefaultTools() {
  const queryClient = useQueryClient();
  const key = ['tenant-default-tools'];

  const { data: defaultsByRole = EMPTY, isLoading } = useQuery<DefaultsByRole>({
    queryKey: key,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('gw_tenant_nav_prefs')
          .select('role, default_tools');
        if (error) {
          console.warn('[useTenantDefaultTools] load failed:', error.message);
          return EMPTY;
        }
        const rows = (data as Array<{ role: string; default_tools: string[] | null }>) ?? [];
        const out: DefaultsByRole = { admin: [], student: [], member: [] };
        for (const r of rows) {
          if (r.role in out) out[r.role as NavRole] = r.default_tools ?? [];
        }
        return out;
      } catch (err) {
        console.warn('[useTenantDefaultTools] load failed:', err);
        return EMPTY;
      }
    },
  });

  const saveDefaults = useCallback(async (role: NavRole, tools: string[]): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // tenant_id lives in the TOKEN PAYLOAD (GoTrue custom-claims hook),
      // not app_metadata — accounts created outside the invite flow have no
      // tenant_id there. Same fallback chain the hidden_items editor uses.
      const claims = decodeJwtClaims(session?.access_token ?? '');
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id as string | undefined
        ?? (session?.user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id as string | undefined;
      if (!tenantId) throw new Error('No tenant in session');

      const { error } = await supabase
        .from('gw_tenant_nav_prefs')
        .upsert({
          tenant_id: tenantId,
          role,
          default_tools: sanitizeTools(tools),
          updated_by: session?.user?.id,
        }, { onConflict: 'tenant_id,role' });
      if (error) {
        console.warn('[useTenantDefaultTools] save failed:', error.message);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: key });
      return true;
    } catch (err) {
      console.warn('[useTenantDefaultTools] save failed:', err);
      return false;
    }
  }, [queryClient]);

  return { defaultsByRole, loading: isLoading, saveDefaults };
}
```

If `@/lib/jwt` does not export `decodeJwtClaims`, find the module `WorkspaceSettingsPage.tsx` imports it from and use that path instead — do not write a second JWT decoder.

- [ ] **Step 6: Add `WIDGETS_CAP` to `myTools.ts`**

The widget cap lives beside `MY_TOOLS_CAP` in `src/lib/navigation/myTools.ts`, so there is exactly one name for it and Task 2's catalog imports it rather than declaring a second:

```ts
/** House spec §5.1 caps the home at two role widgets. */
export const WIDGETS_CAP = 2;
```

- [ ] **Step 7: Extend `useMyTools` with `saveMyTools`**

Extract the existing optimistic-write body out of `saveTools` into a general patch saver, then redefine `saveTools` to delegate. Exactly ONE `supabase.rpc('save_nav_item_order', ...)` call site must remain in the file.

```ts
import { sanitizeTools, WIDGETS_CAP, type MyTools } from '@/lib/navigation/myTools';

// inside useMyTools, replacing the current saveTools body:
const saveMyTools = useCallback(async (patch: {
  tools?: string[]; widgets?: string[]; setupComplete?: boolean;
}): Promise<boolean> => {
  if (!uid) return false;
  const current = myTools;
  const next: MyTools = {
    v: 4,
    tools: patch.tools !== undefined ? sanitizeTools(patch.tools) : (current?.tools ?? []),
    widgets: patch.widgets !== undefined
      ? patch.widgets.slice(0, WIDGETS_CAP)
      : (current?.widgets ?? []),
    // Any deliberate save completes setup unless the caller says otherwise.
    setupComplete: patch.setupComplete ?? true,
  };
  const previous = queryClient.getQueryData<unknown>(key) ?? null;
  queryClient.setQueryData(key, /* the same shape the query caches */ next);
  try {
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
}, [uid, myTools, queryClient]);

const saveTools = useCallback(
  (tools: string[]) => saveMyTools({ tools }),
  [saveMyTools],
);
```

**Read the current file before pasting this.** Phase 1's final fix wave changed what the query caches — it now caches the RAW `user_preferences` row under a role-less key and derives `MyTools` in a `useMemo`. The optimistic `setQueryData` above must write that same RAW shape, not a `MyTools`, or the optimistic update will not survive the derive step. Match whatever the file actually does; the structure above is the control flow, not the cache shape.

- [ ] **Step 8: Record the schema deviation in the spec**

In `docs/superpowers/specs/2026-08-08-my-space-nav-design.md` §6.2, replace the `default_tools jsonb` description with the `text[]`-per-role-row shape and one sentence explaining why (the table is already partitioned by role). Leave the rest of §6.2 intact.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npx vitest run src/hooks/__tests__/useTenantDefaultTools.test.tsx src/hooks/__tests__/useMyTools.test.tsx
npm run typecheck:guard 2>&1 | tail -3
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260808120000_tenant_default_tools.sql src/hooks/useTenantDefaultTools.ts src/hooks/useMyTools.ts src/hooks/__tests__/ docs/superpowers/specs/2026-08-08-my-space-nav-design.md
git commit -m "feat(nav): tenant default shelves and a general My Tools patch saver"
```

---

### Task 2: Widget catalog

**Files:**
- Create: `src/lib/navigation/homeWidgets.ts`
- Test: `src/lib/navigation/__tests__/homeWidgets.test.ts`

**Interfaces:**
- Produces:
  - `interface HomeWidget { key: string; label: string; description: string; roles: Array<'student' | 'faculty'> }`
  - `HOME_WIDGETS: HomeWidget[]`
  - `widgetsFor(role: 'student' | 'faculty'): HomeWidget[]`
  - `resolveWidgets(role, chosen: string[]): string[]` — chosen keys filtered to what the role can have, capped at 2, falling back to that role's first two when `chosen` is empty

**Why this exists.** `HouseHome` currently hardcodes two role widgets: a role-dependent first widget (faculty "Needs attention", student "Practice ledger") and a shared "Today". The My Space widgets group needs them as data so it can list and cap them. This task only creates the catalog — wiring `HouseHome` to honour a member's choice is Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/lib/navigation/__tests__/homeWidgets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HOME_WIDGETS, widgetsFor, resolveWidgets } from '../homeWidgets';

describe('HOME_WIDGETS', () => {
  it('has unique keys', () => {
    const keys = HOME_WIDGETS.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('gives every role at least two options', () => {
    expect(widgetsFor('student').length).toBeGreaterThanOrEqual(2);
    expect(widgetsFor('faculty').length).toBeGreaterThanOrEqual(2);
  });
});

describe('widgetsFor', () => {
  it('excludes widgets the role cannot have', () => {
    expect(widgetsFor('student').map((w) => w.key)).not.toContain('needs-attention');
    expect(widgetsFor('faculty').map((w) => w.key)).not.toContain('practice-ledger');
  });
});

describe('resolveWidgets', () => {
  it('falls back to the role default when nothing is chosen', () => {
    expect(resolveWidgets('faculty', [])).toEqual(widgetsFor('faculty').slice(0, 2).map((w) => w.key));
  });
  it('caps at two', () => {
    const all = widgetsFor('student').map((w) => w.key);
    expect(resolveWidgets('student', all)).toHaveLength(2);
  });
  it('drops keys the role cannot have', () => {
    expect(resolveWidgets('student', ['needs-attention', 'today'])).toEqual(['today']);
  });
  it('drops unknown keys without throwing', () => {
    expect(resolveWidgets('student', ['nope', 'today'])).toEqual(['today']);
  });
  it('preserves the chosen order', () => {
    const [a, b] = widgetsFor('faculty').map((w) => w.key);
    expect(resolveWidgets('faculty', [b, a])).toEqual([b, a]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/navigation/__tests__/homeWidgets.test.ts
```

Expected: FAIL — `Failed to resolve import "../homeWidgets"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/navigation/homeWidgets.ts`:

```ts
// The two widgets a member may keep on the House home, as data so My Space
// can list them. House spec §5.1 caps the home at TWO role widgets — that
// cap is the design, not a limitation: the home answers "what do I do next",
// and a third widget turns it back into a status dashboard.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.4
export interface HomeWidget {
  key: string;
  label: string;
  description: string;
  roles: Array<'student' | 'faculty'>;
}

export const HOME_WIDGETS: HomeWidget[] = [
  {
    key: 'needs-attention',
    label: 'Needs You',
    description: 'Unexcused absences, unreviewed practice, ticket flags.',
    roles: ['faculty'],
  },
  {
    key: 'today',
    label: 'Today',
    description: "Today's schedule, in order.",
    roles: ['student', 'faculty'],
  },
  {
    key: 'practice-ledger',
    label: 'Practice',
    description: 'Your practice streak, as a staff of quarter notes.',
    roles: ['student'],
  },
];

export function widgetsFor(role: 'student' | 'faculty'): HomeWidget[] {
  return HOME_WIDGETS.filter((w) => w.roles.includes(role));
}

/**
 * Chosen keys narrowed to what `role` may actually have, capped at
 * WIDGETS_CAP, preserving the member's order. An empty or fully-invalid
 * choice falls back to that role's first two — the home always renders two
 * widgets, never zero.
 */
export function resolveWidgets(role: 'student' | 'faculty', chosen: string[]): string[] {
  const allowed = new Set(widgetsFor(role).map((w) => w.key));
  const picked = chosen.filter((k) => allowed.has(k)).slice(0, WIDGETS_CAP);
  if (picked.length > 0) return picked;
  return widgetsFor(role).slice(0, WIDGETS_CAP).map((w) => w.key);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/navigation/__tests__/homeWidgets.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/homeWidgets.ts src/lib/navigation/__tests__/homeWidgets.test.ts
git commit -m "feat(nav): home widget catalog"
```

---

### Task 3: `MySpaceEditor` component

**Files:**
- Create: `src/components/dashboard/MySpaceEditor.tsx`
- Test: `src/components/dashboard/MySpaceEditor.test.tsx`

**Interfaces:**
- Consumes: `CatalogEntry`, `NAV_SECTION_LABELS` from `@/lib/navigation/navCatalog`; `MY_TOOLS_CAP` from `@/lib/navigation/myTools`; `HomeWidget` from `@/lib/navigation/homeWidgets`; `WIDGETS_CAP` from `@/lib/navigation/myTools`
- Produces:
```ts
export interface MySpaceEditorProps {
  /** Every entry the viewer may use, already gated. Order is catalog order. */
  available: CatalogEntry[];
  /** Currently chosen tool keys, in the member's order. */
  tools: string[];
  onToolsChange: (next: string[]) => void;
  /** Omit the whole widgets group (tenant-defaults mode has no widgets). */
  widgetOptions?: HomeWidget[];
  widgets?: string[];
  onWidgetsChange?: (next: string[]) => void;
  /** Read-only render for a viewer without permission to edit. */
  disabled?: boolean;
}
export function MySpaceEditor(props: MySpaceEditorProps): JSX.Element
```

**Shape.** iOS Settings → Control Center: an "IN YOUR SPACE" grouped inset card with ⊖ badges and drag handles and an `n of 8` counter, then "MORE TOOLS" grouped by section with ⊕ badges, then an optional "WIDGETS" group with ✓ toggles and an `n of 2` counter. Presentation only — it holds no query, no save, and no notion of whose record it is edited. Both the personal page and the tenant-defaults mode mount the same component.

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/MySpaceEditor.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MySpaceEditor, type MySpaceEditorProps } from './MySpaceEditor';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { HOME_WIDGETS, widgetsFor } from '@/lib/navigation/homeWidgets';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['calendar', 'messages', 'music-library', 'academy', 'finance', 'studio']
  .map((k) => byKey.get(k)!);

const renderEditor = (props: Partial<MySpaceEditorProps> = {}) => {
  const onToolsChange = vi.fn();
  const utils = render(
    <MySpaceEditor
      available={available}
      tools={['calendar', 'academy']}
      onToolsChange={onToolsChange}
      {...props}
    />,
  );
  return { ...utils, onToolsChange };
};

describe('MySpaceEditor — chosen list', () => {
  it('lists chosen tools in stored order, not catalog order', () => {
    renderEditor({ tools: ['academy', 'calendar'] });
    const group = screen.getByTestId('my-space-chosen');
    expect(within(group).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining('Academy'), expect.stringContaining('Calendar')]));
    expect(within(group).getAllByRole('listitem')[0]).toHaveTextContent('Academy');
  });

  it('shows an n-of-8 counter', () => {
    renderEditor({ tools: ['calendar', 'academy'] });
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('removing emits the list without that key, order otherwise intact', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy', 'finance'] });
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'finance']);
  });
});

describe('MySpaceEditor — available list', () => {
  it('offers only tools not already chosen', () => {
    renderEditor({ tools: ['calendar'] });
    const more = screen.getByTestId('my-space-more');
    expect(within(more).queryByText('Calendar')).toBeNull();
    expect(within(more).getByText('Academy')).toBeInTheDocument();
  });

  it('adding appends to the end so nothing already placed moves', () => {
    const { onToolsChange } = renderEditor({ tools: ['calendar', 'academy'] });
    fireEvent.click(screen.getByRole('button', { name: /add finance/i }));
    expect(onToolsChange).toHaveBeenCalledWith(['calendar', 'academy', 'finance']);
  });

  it('disables adding at the cap and says why', () => {
    const eight = available.concat(available).slice(0, 8).map((e) => e.key);
    renderEditor({ tools: eight, available });
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('8 of 8');
    expect(screen.getByTestId('my-space-full')).toBeInTheDocument();
  });

  it('groups available tools under their section label', () => {
    renderEditor({ tools: [] });
    const more = screen.getByTestId('my-space-more');
    expect(within(more).getByText('Money')).toBeInTheDocument();
  });
});

describe('MySpaceEditor — widgets', () => {
  it('is absent when no widget options are given', () => {
    renderEditor();
    expect(screen.queryByTestId('my-space-widgets')).toBeNull();
  });

  it('toggles a widget on and caps the selection at two', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MySpaceEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    expect(screen.getByTestId('my-space-widget-count')).toHaveTextContent('1 of 2');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opts[1].label, 'i') }));
    expect(onWidgetsChange).toHaveBeenCalledWith([opts[0].key, opts[1].key]);
  });

  it('deselects a chosen widget', () => {
    const onWidgetsChange = vi.fn();
    const opts = widgetsFor('faculty');
    render(
      <MySpaceEditor
        available={available}
        tools={[]}
        onToolsChange={vi.fn()}
        widgetOptions={opts}
        widgets={[opts[0].key, opts[1].key]}
        onWidgetsChange={onWidgetsChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(opts[0].label, 'i') }));
    expect(onWidgetsChange).toHaveBeenCalledWith([opts[1].key]);
  });
});

describe('MySpaceEditor — disabled', () => {
  it('emits nothing when disabled', () => {
    const { onToolsChange } = renderEditor({ disabled: true, tools: ['calendar'] });
    const btn = screen.queryByRole('button', { name: /remove calendar/i });
    if (btn) fireEvent.click(btn);
    expect(onToolsChange).not.toHaveBeenCalled();
  });
});

describe('MySpaceEditor — accessibility', () => {
  it('gives every action button an accessible name', () => {
    renderEditor();
    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAccessibleName();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/dashboard/MySpaceEditor.test.tsx
```

Expected: FAIL — `Failed to resolve import "./MySpaceEditor"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/dashboard/MySpaceEditor.tsx`. Requirements the tests pin down, plus the visual contract:

- Root renders three `<section>`s: chosen (`data-testid="my-space-chosen"`), more (`data-testid="my-space-more"`), widgets (`data-testid="my-space-widgets"`, only when `widgetOptions` is passed).
- Chosen list is a `<ul>` of `<li>` rows, each with a ⊖ button named `Remove {label}`, the entry icon (`aria-hidden`), the label, and a drag handle. Use `@dnd-kit`'s `useSortable` + `verticalListSortingStrategy` for reordering, emitting the reordered key list through `onToolsChange`. This is the one screen where dragging is the task, so the press-delay activation constraint used elsewhere is not needed — a plain `distance: 8` `PointerSensor` is right.
- Counter `data-testid="my-space-count"` reads `{n} of {MY_TOOLS_CAP}`.
- At the cap, render `data-testid="my-space-full"` with the text `Your space is full — remove one to add another.` and disable every ⊕.
- More list groups by `NAV_SECTION_LABELS[entry.section]`, section label as a small uppercase muted header, each row a ⊕ button named `Add {label}`.
- Widgets group renders one toggle button per option, named by its label, with `aria-pressed`. Selecting a third when two are chosen replaces the oldest (emit `[kept, newKey]`), so the cap never blocks a tap silently. Counter `data-testid="my-space-widget-count"` reads `{n} of {WIDGETS_CAP}`.
- `disabled` renders the same markup with every button `disabled` and no handlers firing.
- Styling: white `bg-card` inset cards with `rounded-xl` (12px), `divide-y divide-border` hairlines, `min-h-11` rows, `text-[17px]` labels, `text-[13px] text-muted-foreground` captions, section headers `text-[13px] uppercase tracking-wide text-muted-foreground px-4 pb-1`. Tint appears only on the ⊕/✓ badges. Page background stays `bg-background`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/dashboard/MySpaceEditor.test.tsx
```

Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/MySpaceEditor.tsx src/components/dashboard/MySpaceEditor.test.tsx
git commit -m "feat(nav): MySpaceEditor — Control-Center-shaped tool and widget editor"
```

---

### Task 4: `/dashboard/my-space` page, route, Setup row, widget honouring

**Files:**
- Create: `src/pages/dashboard/MySpacePage.tsx`
- Modify: `src/App.tsx` (route, beside `/dashboard/workspace`)
- Modify: `src/components/dashboard/NavShelf.tsx` (Setup row)
- Modify: `src/components/dashboard/NavShelf.test.tsx` (Setup row case)
- Modify: `src/pages/dashboard/HouseHome.tsx` (honour chosen widgets)
- Test: `src/pages/dashboard/MySpacePage.test.tsx`

**Interfaces:**
- Consumes: `MySpaceEditor` (Task 3), `useMyTools` + `saveMyTools` (Task 1), `resolveWidgets` / `widgetsFor` (Task 2), `resolveNav`, `applyPreviewRole`, `useModuleAccess`, `useTenantNavPrefs`, `useEffectivePreviewRole`
- Produces: default-exported `MySpacePage`; route `/dashboard/my-space`

**Building the gated `available` list.** `DashboardShell` already assembles a `NavContext` from `useModuleAccess` over a fixed `MODULE_KEYS` array plus role flags, and narrows it with `applyPreviewRole`. `MySpacePage` needs the same context. Copy that derivation verbatim rather than inventing a second one — an entry the member cannot open must never be offered by ⊕. Pass `resolveNav(navCtx)` (not `buildNavSections`, which filters to sidebar surfaces and would hide grid-only entries like `merch`).

- [ ] **Step 1: Write the failing test**

Create `src/pages/dashboard/MySpacePage.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const h = vi.hoisted(() => ({ saveMyTools: vi.fn(), myTools: { v: 4, tools: ['calendar', 'academy'], widgets: [], setupComplete: true } }));

vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({ myTools: h.myTools, loading: false, saveTools: vi.fn(), saveMyTools: h.saveMyTools }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ profile: { is_admin: false, role: 'student' }, loading: false, canEditMusicLibrary: () => false }) }));
vi.mock('@/hooks/useModuleAccess', () => ({ useModuleAccess: () => ({ hasAccess: true }) }));
vi.mock('@/hooks/useTenantNavPrefs', () => ({ useTenantNavPrefs: () => new Set<string>() }));
vi.mock('@/hooks/useEffectivePreviewRole', () => ({ useEffectivePreviewRole: () => null }));
vi.mock('@/hooks/useTenantDefaultTools', () => ({ useTenantDefaultTools: () => ({ defaultsByRole: { admin: [], student: [], member: [] }, loading: false, saveDefaults: vi.fn() }) }));
vi.mock('@/components/dashboard/DashboardShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import MySpacePage from './MySpacePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MySpacePage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => { h.saveMyTools.mockReset().mockResolvedValue(true); });

describe('MySpacePage', () => {
  it('renders the editor seeded from the stored record', () => {
    renderPage();
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('saves tools when one is removed', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    await waitFor(() => expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar'] }));
  });

  it('offers a widgets group for the viewer role', () => {
    renderPage();
    expect(screen.getByTestId('my-space-widgets')).toBeInTheDocument();
  });

  it('does not offer a "Defaults for members" mode to a non-admin', () => {
    renderPage();
    expect(screen.queryByRole('tab', { name: /defaults for members/i })).toBeNull();
  });
});
```

Add to `src/components/dashboard/NavShelf.test.tsx`:

```tsx
it('renders a Setup row linking to My Space', () => {
  renderShelf();
  const link = screen.getByRole('link', { name: /setup/i });
  expect(link).toHaveAttribute('href', '/dashboard/my-space');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/pages/dashboard/MySpacePage.test.tsx src/components/dashboard/NavShelf.test.tsx
```

Expected: FAIL — missing module `./MySpacePage`; no Setup link in the shelf.

- [ ] **Step 3: Add the Setup row to `NavShelf`**

In `src/components/dashboard/NavShelf.tsx`, render a Setup row immediately after the All Tools toggle, always present (unlike All Tools, it does not depend on `rest.length`). Use the same `Row` styling, the `Settings` icon from lucide with `aria-hidden`, label `Setup`, `to="/dashboard/my-space"`. Spec §5.2 lists it as an always-present row.

- [ ] **Step 4: Write `MySpacePage`**

Create `src/pages/dashboard/MySpacePage.tsx`. It:
- wraps in `DashboardShell` + `DashboardPageShell` with `PageTitle` "My Space";
- derives `navCtx` exactly as `DashboardShell` does and computes `available = resolveNav(navCtx)`;
- reads `useMyTools(isFacultyProfile(profile) ? 'faculty' : 'student')`;
- renders a live preview strip above the editor showing the current tools as keycap-sized glyphs, so the member sees what they are building (spec §5.4);
- mounts `MySpaceEditor` with `available`, `myTools.tools`, `widgetOptions={widgetsFor(role)}`, `widgets={resolveWidgets(role, myTools.widgets)}`;
- persists on every change via `saveMyTools({ tools })` / `saveMyTools({ widgets })` — no explicit Save button. The optimistic cache write in `useMyTools` already makes this feel instant, and an unsaved-changes state on a settings screen is a trap on mobile.
- shows a toast on a `false` return so a failed save is never silent.

- [ ] **Step 5: Register the route**

In `src/App.tsx`, beside the `/dashboard/workspace` route, add `/dashboard/my-space` with the identical wrapper stack (`ProtectedRoute` → `UniversalLayout showHeader={false} showFooter={false} containerized={false}` → `DashboardShell` → page). Lazy-import the page the same way its neighbours are imported.

- [ ] **Step 6: Honour chosen widgets in `HouseHome`**

In `src/pages/dashboard/HouseHome.tsx`, compute `const shownWidgets = resolveWidgets(isFaculty ? 'faculty' : 'student', myTools?.widgets ?? [])` and render each of the two widget slots only when its key is in `shownWidgets`, preserving the current markup for each. Do not restructure the widgets themselves — `HouseHome`'s room layout is explicitly out of scope (spec §2 kill list).

- [ ] **Step 7: Run the tests**

```bash
npx vitest run src/pages/dashboard/MySpacePage.test.tsx src/components/dashboard/NavShelf.test.tsx src/pages/dashboard/HouseHome.test.tsx
npm run test 2>&1 | tail -10
npm run typecheck:guard 2>&1 | tail -3
```

Expected: PASS; full suite shows no new failures beyond the 6 baseline files.

- [ ] **Step 8: Commit**

```bash
git add src/pages/dashboard/MySpacePage.tsx src/pages/dashboard/MySpacePage.test.tsx src/App.tsx src/components/dashboard/NavShelf.tsx src/components/dashboard/NavShelf.test.tsx src/pages/dashboard/HouseHome.tsx
git commit -m "feat(nav): My Space page, Setup row, and member-chosen home widgets"
```

---

### Task 5: Admin "Defaults for members" mode

**Files:**
- Modify: `src/pages/dashboard/MySpacePage.tsx`
- Modify: `src/pages/dashboard/MySpacePage.test.tsx`
- Modify: `src/pages/dashboard/WorkspaceSettingsPage.tsx` (Navigation tab → link)

**Interfaces:**
- Consumes: `useTenantDefaultTools` (Task 1), `MySpaceEditor` (Task 3), `HIDEABLE_NAV_ROLES` / `NavRole` from `@/lib/navigation/navCatalog`

- [ ] **Step 1: Write the failing test**

Add to `src/pages/dashboard/MySpacePage.test.tsx`:

```tsx
describe('MySpacePage — admin defaults mode', () => {
  beforeEach(() => {
    vi.doMock('@/hooks/useUserRole', () => ({
      useUserRole: () => ({ profile: { is_admin: true, role: 'instructor' }, loading: false, canEditMusicLibrary: () => true }),
    }));
  });

  it('offers a Defaults for members mode to an admin', async () => {
    vi.resetModules();
    const { default: AdminPage } = await import('./MySpacePage');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('tab', { name: /defaults for members/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/dashboard/MySpacePage.test.tsx
```

Expected: FAIL — no `Defaults for members` tab exists.

- [ ] **Step 3: Implement the mode**

In `MySpacePage`, when `profile?.is_admin || profile?.is_super_admin`, render a two-option segmented control (Radix `Tabs`, styled as an iOS segmented control) above the preview: `Mine` and `Defaults for members`. In the second mode:
- render a role picker from `HIDEABLE_NAV_ROLES` (Tenant admins / Students / Members);
- mount the SAME `MySpaceEditor` with `tools={defaultsByRole[role]}` and `onToolsChange={(next) => saveDefaults(role, next)}`, and no `widgetOptions` (widgets are personal — the tenant does not set them);
- above the editor, one line of copy: `New members with this role start with these tools. They can change their own space any time.`
- when `defaultsByRole[role]` is empty, seed the editor's displayed list from the platform default for that role (`DEFAULT_TOOLS_FACULTY` for `admin`, `DEFAULT_TOOLS_STUDENT` for `student` and `member`) so an admin edits a real starting point rather than an empty box. Saving then persists it explicitly.

- [ ] **Step 4: Point Workspace Settings at the new screen**

In `src/pages/dashboard/WorkspaceSettingsPage.tsx`, keep the Navigation tab and its existing hide-list editor (hiding is route-based and orthogonal to shelves), but add a card at the top of that panel linking to `/dashboard/my-space`: heading `Default tools for each role`, body `Set what new members start with in My Space → Defaults for members.`, and a button navigating there. Do not delete the hide-list — Phase 1's spec folded it in conceptually, but removing a shipped admin control is out of this phase's scope.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run src/pages/dashboard/MySpacePage.test.tsx
npm run test 2>&1 | tail -10
```

Expected: PASS; no new failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/dashboard/MySpacePage.tsx src/pages/dashboard/MySpacePage.test.tsx src/pages/dashboard/WorkspaceSettingsPage.tsx
git commit -m "feat(nav): tenant admins set the default shelf each role starts with"
```

---

### Task 6: First-run sheet

**Files:**
- Create: `src/components/dashboard/FirstRunSheet.tsx`
- Modify: `src/pages/dashboard/HouseHome.tsx`
- Test: `src/components/dashboard/FirstRunSheet.test.tsx`

**Interfaces:**
- Consumes: `MySpaceEditor` (Task 3), `useMyTools` + `saveMyTools` (Task 1), `useTenantDefaultTools` (Task 1)
- Produces: `FirstRunSheet({ open, onOpenChange, available, role }): JSX.Element`

**Behaviour.** On first login — `myTools.setupComplete === false` — a Radix `Sheet` opens over the home titled `Set up your space`, prefilled with the tenant default for the member's role (falling back to the platform default). Two actions: `Skip` accepts what is shown, `Looks good` saves. Both call `saveMyTools({ tools, setupComplete: true })` so the sheet never reappears. Never render an empty space.

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/FirstRunSheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ saveMyTools: vi.fn() }));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({ myTools: { v: 4, tools: [], widgets: [], setupComplete: false }, loading: false, saveTools: vi.fn(), saveMyTools: h.saveMyTools }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useTenantDefaultTools', () => ({
  useTenantDefaultTools: () => ({ defaultsByRole: { admin: [], student: ['calendar', 'academy'], member: [] }, loading: false, saveDefaults: vi.fn() }),
}));

import { FirstRunSheet } from './FirstRunSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const available = ['calendar', 'academy', 'finance'].map((k) => NAV_CATALOG.find((e) => e.key === k)!);

const renderSheet = (role: 'student' | 'faculty' = 'student') =>
  render(
    <MemoryRouter>
      <FirstRunSheet open onOpenChange={vi.fn()} available={available} role={role} />
    </MemoryRouter>,
  );

beforeEach(() => { h.saveMyTools.mockReset().mockResolvedValue(true); });

describe('FirstRunSheet', () => {
  it('prefills from the tenant default for the role', () => {
    renderSheet('student');
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('falls back to the platform default when the tenant set none', () => {
    renderSheet('faculty');
    expect(screen.getByTestId('my-space-count')).not.toHaveTextContent('0 of 8');
  });

  it('Looks good saves and marks setup complete', async () => {
    renderSheet('student');
    fireEvent.click(screen.getByRole('button', { name: /looks good/i }));
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });

  it('Skip accepts the shown set rather than saving nothing', async () => {
    renderSheet('student');
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/dashboard/FirstRunSheet.test.tsx
```

Expected: FAIL — `Failed to resolve import "./FirstRunSheet"`.

- [ ] **Step 3: Write the sheet**

Create `src/components/dashboard/FirstRunSheet.tsx`: a Radix `Sheet` (side `bottom` under `md`, `right` above it) titled `Set up your space` with the subtitle `Pick the tools you'll use. You can change this any time in Setup.`, containing `MySpaceEditor` in tools-only mode (no `widgetOptions`), and a footer with `Skip` (ghost) and `Looks good` (primary). Seed local state once from `defaultsByRole[roleKey]`, falling back to `DEFAULT_TOOLS_FACULTY` / `DEFAULT_TOOLS_STUDENT`. `roleKey` maps `faculty → 'admin'`, `student → 'student'`, since `NavRole` and the two-value profile role are different vocabularies — document that mapping in a comment.

- [ ] **Step 4: Mount it in `HouseHome`**

In `src/pages/dashboard/HouseHome.tsx`, render `FirstRunSheet` when `!loading && myTools?.setupComplete === false`, with the same gated `available` list the page already computes for `getAppTiles`. Hold the open state locally so dismissing it does not immediately reopen before the save round-trips.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run src/components/dashboard/FirstRunSheet.test.tsx src/pages/dashboard/HouseHome.test.tsx
npm run test 2>&1 | tail -10
npm run typecheck:guard 2>&1 | tail -3
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Expected: all pass; no new failures beyond the 6 baseline files.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/FirstRunSheet.tsx src/components/dashboard/FirstRunSheet.test.tsx src/pages/dashboard/HouseHome.tsx
git commit -m "feat(nav): first-run sheet prefilled from the tenant default"
```

---

## Done criteria

1. `npm run test`, `npm run typecheck:guard`, `npm run lint`, `npm run build` all pass with no new failures.
2. `/dashboard/my-space` renders, and every change persists without an explicit Save.
3. The shelf's Setup row reaches it from every authenticated page.
4. A tenant admin can set a per-role default shelf, and a brand-new member of that role is greeted by the first-run sheet prefilled with it.
5. No entry the member cannot access is ever offered by ⊕ — verified against a student in a tenant with every module enabled.
6. Exactly one `save_nav_item_order` RPC call site remains in `useMyTools.ts`, and no direct `user_preferences` upsert exists anywhere.
7. The migration file exists and has NOT been applied.

## Deliberately out of scope

- The All Tools search sheet and ⌘K — **Phase 3**
- `gw_nav_usage`, Suggestions, seeded defaults from real usage, nudges — **Phase 4**. Task 5's defaults are admin-set, not usage-derived.
- The catalog recut and `MERGED_KEYS` — **Phase 5**
- Removing the route-based hide list from Workspace Settings
- Restructuring `HouseHome`'s room layout (spec §2 kill list)
- Dropping the `home_tile_layout` column
