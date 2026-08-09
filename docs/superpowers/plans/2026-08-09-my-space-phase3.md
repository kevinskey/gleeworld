# My Space Phase 3 — All Tools and ⌘K

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1 disclosure with one searchable All Tools sheet, reachable from the shelf or ⌘K, that can pin a tool to My Tools in place — and delete a dead command palette that would have been an authorization hole.

**Architecture:** A pure `navSearch` module owns matching and ranking over already-gated catalog entries. `AllToolsSheet` renders the sheet using the repo's existing `cmdk` primitives, which own keyboard navigation and ARIA, while `navSearch` is passed in as cmdk's custom `filter` so ranking stays ours and stays testable. `NavShelf`'s All Tools row opens the sheet instead of expanding sections; a single global ⌘K handler opens the same sheet.

**Tech Stack:** React 18 + TypeScript, `cmdk` (already a dependency) via `src/components/ui/command.tsx`, Radix Dialog, TanStack Query, Vitest, Tailwind with the Apple iOS token set.

**Spec:** `docs/superpowers/specs/2026-08-08-my-space-nav-design.md` §5.3
**Builds on:** Phases 1–2, merged in PR #575 (`merge/my-space-p1-p2` @ `f6e984ec3`), which is this branch's base.

## Global Constraints

- **The sheet's contents must be gated.** Every entry it offers comes from `resolveNav(navCtx)` — the same module/role/tenant-`hiddenRoutes` gating the shelf uses, narrowed by `applyPreviewRole`. Never `NAV_CATALOG` raw, never `UNIFIED_MODULES`. Offering a destination the member cannot open is a bug; in a multi-tenant app, offering one from another tenant's feature set is worse.
- **`MY_TOOLS_CAP` is 8**, imported from `myTools.ts`. Pinning at the cap must prompt, never silently fail.
- Personal writes go through the `save_nav_item_order` SECURITY DEFINER RPC via `useMyTools`. There is exactly one RPC call site in the repo; do not add another.
- **No Suggestions row in this phase.** Usage telemetry is Phase 4. The sheet opens straight to sections.
- **The shelf never auto-reorders.** Pinning appends; it does not re-sort what is already placed.
- Apple tokens only: `--card` on `--background`, `--radius` 12px, hairline `--border`, tint on the ⊕ badge only. 44pt minimum targets.
- Copy is tenant-neutral: "students", never "singers"; "graduates", never "alumnae/alumni".
- **Radix and cmdk activate on `mouseDown`, not `click`.** Tests driving them must use `fireEvent.mouseDown` and be verified to actually do something — this project has already shipped several tests that passed vacuously for exactly this reason.
- Component tests need `// @vitest-environment jsdom` as line 1 and `import '@testing-library/jest-dom/vitest'`. `vi.mock` factories hoist; use `vi.hoisted()`.
- Verification gates: `npm run test`, `npm run typecheck:guard`, `npm run lint`, `npm run build`.
- **Worktree setup:** `npm ci --legacy-peer-deps`. Never pipe npm output to `tail` — it hides failures.

---

### Task 0: Worktree dependencies and baseline

**Files:** none

- [ ] **Step 1: Install**

```bash
cd ~/Documents/GitHub/gw-worktrees/my-space-p3
npm ci --legacy-peer-deps
```

- [ ] **Step 2: Record the baseline**

```bash
npm run test 2>&1 | tail -20
```

Expected: 6 test files fail — `heroDrag`, `appDestinations` (one known-red case about `/all-state` in `KNOWN_ROUTES`), `v1_to_v2`, `WorkspaceSettingsPage.branding-general-upsert`, `NoteEditor`, `SightReadingStudio`. These fail on `origin/main` and are NOT yours. Anything outside that list going red later is your regression.

---

### Task 1: `navSearch` — matching and ranking

**Files:**
- Create: `src/lib/navigation/navSearch.ts`
- Test: `src/lib/navigation/__tests__/navSearch.test.ts`

**Interfaces:**
- Consumes: `CatalogEntry`, `NAV_SECTION_LABELS` from `./navCatalog`
- Produces:
  - `normalize(s: string): string` — lowercased, diacritics stripped
  - `scoreEntry(entry: CatalogEntry, query: string): number` — `0` = no match; higher = better
  - `searchNav(entries: CatalogEntry[], query: string): CatalogEntry[]` — matches only, best first; an empty query returns `entries` unchanged

**Ranking rules** (highest first), so `seat` lands on Seating Charts and `mus` puts Music Library above Music Tools:

| Match | Score |
|---|---|
| Label equals the query | 100 |
| Label starts with the query | 80 |
| A word in the label starts with the query | 60 |
| Label contains the query | 40 |
| Section name starts with / contains the query | 20 |
| No match | 0 |

Ties break on catalog order, which is stable — never on `Math.random` or object key order.

- [ ] **Step 1: Write the failing test**

Create `src/lib/navigation/__tests__/navSearch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalize, scoreEntry, searchNav } from '../navSearch';
import { NAV_CATALOG, type CatalogEntry } from '../navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const pick = (...keys: string[]): CatalogEntry[] => keys.map((k) => byKey.get(k)!);

describe('normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalize('Répertoire')).toBe('repertoire');
    expect(normalize('  MÚSICA ')).toBe('musica');
  });
  it('is a no-op on plain ascii', () => {
    expect(normalize('Seating Charts')).toBe('seating charts');
  });
});

describe('scoreEntry', () => {
  const academy = byKey.get('academy')!;
  it('scores an exact label match highest', () => {
    expect(scoreEntry(academy, 'Academy')).toBe(100);
  });
  it('scores a prefix above a contains', () => {
    const seating = byKey.get('seating-charts')!;
    expect(scoreEntry(seating, 'seat')).toBeGreaterThan(scoreEntry(seating, 'charts'));
  });
  it('matches a later word in the label', () => {
    expect(scoreEntry(byKey.get('seating-charts')!, 'charts')).toBeGreaterThan(0);
  });
  it('matches on the section name', () => {
    // 'finance' lives in the Money section
    expect(scoreEntry(byKey.get('finance')!, 'money')).toBeGreaterThan(0);
  });
  it('returns 0 for no match', () => {
    expect(scoreEntry(academy, 'zzzzz')).toBe(0);
  });
  it('ignores case and diacritics', () => {
    expect(scoreEntry(academy, 'ACADEMY')).toBe(100);
  });
});

describe('searchNav', () => {
  it('returns the input unchanged for an empty query', () => {
    const entries = pick('academy', 'finance');
    expect(searchNav(entries, '')).toEqual(entries);
    expect(searchNav(entries, '   ')).toEqual(entries);
  });

  it('finds Seating Charts by prefix — the spec\'s own example', () => {
    const got = searchNav(NAV_CATALOG, 'seat');
    expect(got[0].key).toBe('seating-charts');
  });

  it('drops non-matches entirely', () => {
    const got = searchNav(pick('academy', 'finance'), 'academy');
    expect(got.map((e) => e.key)).toEqual(['academy']);
  });

  it('ranks a label prefix above a section-only match', () => {
    const got = searchNav(pick('finance', 'music-library'), 'mu');
    expect(got[0].key).toBe('music-library');
  });

  it('breaks ties by catalog order, deterministically', () => {
    const a = searchNav(NAV_CATALOG, 'a').map((e) => e.key);
    const b = searchNav(NAV_CATALOG, 'a').map((e) => e.key);
    expect(a).toEqual(b);
  });

  it('never invents an entry that was not passed in', () => {
    const entries = pick('academy');
    for (const e of searchNav(entries, 'a')) expect(entries).toContain(e);
  });

  it('every catalog entry is reachable by a prefix of its own label', () => {
    for (const entry of NAV_CATALOG) {
      const q = entry.label.slice(0, 3);
      const hit = searchNav(NAV_CATALOG, q).some((e) => e.key === entry.key);
      expect(hit, `${entry.label} unreachable by "${q}"`).toBe(true);
    }
  });
});
```

That last case is the one that matters: with 52 destinations behind a door, search *is* the navigation, so every entry must be findable. Iterating the catalog means a future entry with an awkward label fails the suite rather than becoming quietly unreachable.

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run src/lib/navigation/__tests__/navSearch.test.ts
```

Expected: FAIL — `Failed to resolve import "../navSearch"`.

- [ ] **Step 3: Implement**

Create `src/lib/navigation/navSearch.ts`:

```ts
// Matching and ranking for the All Tools sheet. Pure and catalog-shaped so
// it can be tested without a DOM, and passed to cmdk as its custom filter so
// keyboard navigation stays cmdk's job and ranking stays ours.
//
// Callers MUST pass an already-gated entry list (resolveNav output). This
// module does no gating and must never be handed NAV_CATALOG raw.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.3
import { NAV_SECTION_LABELS, type CatalogEntry } from './navCatalog';

/** Lowercase + strip diacritics, so "Répertoire" matches "repertoire". */
export function normalize(s: string): string {
  // \u0300-\u036f is the combining-diacritical-marks block. Write it as an
  // escape, never as literal combining characters — those are invisible in
  // most editors and survive a copy-paste as mojibake.
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function scoreEntry(entry: CatalogEntry, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const label = normalize(entry.label);
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  const section = normalize(NAV_SECTION_LABELS[entry.section] ?? '');
  if (section.startsWith(q) || section.includes(q)) return 20;
  return 0;
}

/**
 * Matching entries, best first. An empty query returns `entries` unchanged
 * (same array contents and order) so the sheet's default view is plain
 * catalog order rather than an arbitrary ranking.
 *
 * Ties break on the caller's original order via a decorated sort — Array
 * .sort is not guaranteed stable across every engine we ship to, so index is
 * carried explicitly rather than assumed.
 */
export function searchNav(entries: CatalogEntry[], query: string): CatalogEntry[] {
  if (!normalize(query)) return entries;
  return entries
    .map((entry, index) => ({ entry, index, score: scoreEntry(entry, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((r) => r.entry);
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npx vitest run src/lib/navigation/__tests__/navSearch.test.ts
npm run typecheck:guard 2>&1 | tail -3
```

If the "reachable by a prefix of its own label" case fails for a real entry, the ranking is wrong — fix `scoreEntry`, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/navSearch.ts src/lib/navigation/__tests__/navSearch.test.ts
git commit -m "feat(nav): search ranking for the All Tools sheet"
```

---

### Task 2: `AllToolsSheet`

**Files:**
- Create: `src/components/dashboard/AllToolsSheet.tsx`
- Test: `src/components/dashboard/AllToolsSheet.test.tsx`

**Interfaces:**
- Consumes: `searchNav` (Task 1); `CatalogEntry`, `NAV_SECTION_LABELS` from `@/lib/navigation/navCatalog`; `MY_TOOLS_CAP` from `@/lib/navigation/myTools`; `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` from `@/components/ui/command`
- Produces:
```ts
export interface AllToolsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already gated — resolveNav output, never NAV_CATALOG. */
  available: CatalogEntry[];
  /** Keys already on the shelf; these render as pinned and cannot be re-pinned. */
  pinned: string[];
  /** Append this key to My Tools. Resolves false on failure. */
  onPin: (key: string) => Promise<boolean>;
}
export function AllToolsSheet(props: AllToolsSheetProps): JSX.Element
```

**Behaviour:**
- Search input autofocused, placeholder `Search all tools…`.
- With an empty query, entries render grouped under `NAV_SECTION_LABELS`, in catalog order. With a query, grouping collapses to one flat ranked list — grouping helps browsing and hurts ranked results.
- Selecting a row navigates to `entry.to` and closes the sheet.
- Each unpinned row carries a ⊕ button named `Pin {label} to your space`. It pins **without** navigating or closing, so a member can pin several in one visit. Pinning must not trigger the row's select — stop propagation.
- Rows already pinned show a non-interactive "In your space" marker instead of ⊕.
- At `MY_TOOLS_CAP`, ⊕ buttons are disabled and the sheet shows `Your space is full — remove one in Setup to pin another.` Never let a tap silently do nothing.
- `CommandEmpty` reads `No tools match that.`
- Pass `searchNav` through cmdk's `filter` prop so cmdk handles keyboard/ARIA while ranking stays ours.

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/AllToolsSheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { AllToolsSheet, type AllToolsSheetProps } from './AllToolsSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['academy', 'finance', 'seating-charts', 'music-library', 'studio']
  .map((k) => byKey.get(k)!);

const renderSheet = (props: Partial<AllToolsSheetProps> = {}) => {
  const onPin = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AllToolsSheet open onOpenChange={onOpenChange} available={available} pinned={[]} onPin={onPin} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onPin, onOpenChange };
};

beforeEach(() => vi.clearAllMocks());

describe('AllToolsSheet — browsing', () => {
  it('groups by section when there is no query', () => {
    renderSheet();
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('Teach')).toBeInTheDocument();
  });

  it('offers every entry it was given', () => {
    renderSheet();
    for (const e of available) expect(screen.getByText(e.label)).toBeInTheDocument();
  });
});

describe('AllToolsSheet — search', () => {
  it('finds Seating Charts by prefix', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'seat' } });
    await waitFor(() => expect(screen.getByText('Seating Charts')).toBeInTheDocument());
    expect(screen.queryByText('Academy')).toBeNull();
  });

  it('shows an empty state when nothing matches', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'zzzzz' } });
    await waitFor(() => expect(screen.getByText(/no tools match that/i)).toBeInTheDocument());
  });
});

describe('AllToolsSheet — pinning', () => {
  it('pins without navigating or closing', async () => {
    const { onPin, onOpenChange } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your space/i }));
    await waitFor(() => expect(onPin).toHaveBeenCalledWith('academy'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('marks already-pinned entries and offers no pin button for them', () => {
    renderSheet({ pinned: ['academy'] });
    expect(screen.queryByRole('button', { name: /pin academy to your space/i })).toBeNull();
    expect(screen.getByText(/in your space/i)).toBeInTheDocument();
  });

  it('disables pinning at the cap and says why', () => {
    renderSheet({ pinned: NAV_CATALOG.slice(0, 8).map((e) => e.key) });
    expect(screen.getByText(/your space is full/i)).toBeInTheDocument();
    const btn = screen.queryByRole('button', { name: /pin finance to your space/i });
    if (btn) expect(btn).toBeDisabled();
  });
});

describe('AllToolsSheet — accessibility', () => {
  it('gives every button an accessible name', () => {
    renderSheet();
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run src/components/dashboard/AllToolsSheet.test.tsx
```

Expected: FAIL — `Failed to resolve import "./AllToolsSheet"`.

- [ ] **Step 3: Implement**

Build it against `src/components/ui/command.tsx`'s exports. Read that file first — it is the repo's shadcn wrapper and already sets the dialog chrome.

Notes that will save you a round:
- cmdk's `filter` receives `(value, search)` where `value` is the `CommandItem`'s `value` prop. Set `value` to the entry key and look the entry up, or set it to `label + ' ' + sectionLabel` — either is fine, but the ranking must come from `scoreEntry`, not cmdk's default fuzzy matcher.
- A ⊕ nested inside a `CommandItem` will trigger the item's `onSelect` unless you stop propagation on `mousedown` as well as `click` — cmdk selects on pointer events, not just click.
- Styling: `--card` rows on `--background`, `rounded-xl`, hairline separators, `min-h-11` rows, `text-[17px]` labels, `text-[13px]` section headers uppercase muted. Tint only on the ⊕ badge.

- [ ] **Step 4: Run it and watch it pass**

```bash
npx vitest run src/components/dashboard/AllToolsSheet.test.tsx
npm run typecheck:guard 2>&1 | tail -3
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/AllToolsSheet.tsx src/components/dashboard/AllToolsSheet.test.tsx
git commit -m "feat(nav): searchable All Tools sheet with pin-in-place"
```

---

### Task 3: Wire the sheet in, retire the disclosure, add ⌘K

**Files:**
- Modify: `src/components/dashboard/NavShelf.tsx`
- Modify: `src/components/dashboard/NavShelf.test.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Test: `src/components/dashboard/DashboardShell.allTools.test.tsx` (create)

**Interfaces:**
- Consumes: `AllToolsSheet` (Task 2), `useMyTools` (`{ myTools, saveMyTools }`), `resolveNav`, `applyPreviewRole`, `selectShelfEntries`

**What changes:**
- `NavShelf`'s All Tools row becomes a button that calls a new `onOpenAllTools` prop instead of toggling a local disclosure. The `sections` prop and all the disclosure rendering come **out** — this is the Phase 1 bridge finally retiring, as the plan said it would.
- `DashboardShell` owns the sheet's open state and renders one `AllToolsSheet` for the desktop sidebar and mobile drawer combined — not one per surface, or a phone user gets two.
- A single global ⌘K / Ctrl+K handler opens it. Register it once, in `DashboardShell`, and remove it on unmount. It must not fire while focus is in an `input`, `textarea`, or `contenteditable` — otherwise it hijacks typing in the messenger and the score search.
- `onPin` appends the key via `saveMyTools({ tools: [...current, key] })` and toasts on a `false` return.

**Trap:** `NavShelf` currently caps its own render at `MY_TOOLS_CAP`, and `DashboardShell` derives `shelfTools` through `selectShelfEntries`. Pinning must append to the **stored** list, not the rendered one — appending to the rendered list would silently drop any stored-but-gate-closed key. Read how Phase 2's `MySpaceEditor` handles unavailable keys before writing this.

- [ ] **Step 1: Write the failing tests**

Replace `NavShelf.test.tsx`'s disclosure cases with:

```tsx
it('opens All Tools instead of expanding sections', () => {
  const onOpenAllTools = vi.fn();
  renderShelf({ onOpenAllTools });
  fireEvent.click(screen.getByRole('button', { name: /all tools/i }));
  expect(onOpenAllTools).toHaveBeenCalled();
  // no section headers anywhere in the shelf now
  expect(screen.queryByText('Money')).toBeNull();
});
```

Create `src/components/dashboard/DashboardShell.allTools.test.tsx`. Mock the shell's hooks the way `DashboardShell.shelf.test.tsx` already does — read that file first and copy its mock block rather than inventing a second one:

```tsx
describe('All Tools ⌘K', () => {
  it('opens the sheet on Cmd+K', async () => {
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
  });

  it('opens on Ctrl+K too', async () => {
    renderShell();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
  });

  it('does NOT hijack Cmd+K while focus is in a text field', () => {
    renderShell();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByPlaceholderText(/search all tools/i)).toBeNull();
    input.remove();
  });

  it('renders exactly one sheet even though both nav surfaces exist', async () => {
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getAllByPlaceholderText(/search all tools/i)).toHaveLength(1));
  });

  it('removes the key handler on unmount', () => {
    const { unmount } = renderShell();
    unmount();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByPlaceholderText(/search all tools/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run src/components/dashboard/NavShelf.test.tsx src/components/dashboard/DashboardShell.allTools.test.tsx
```

- [ ] **Step 3: Implement**

Remove `sections` from `NavShelfProps` and delete the disclosure block and its `allOpen` state. Add `onOpenAllTools: () => void`. Keep the Setup row exactly where Phase 2 put it — after the All Tools row.

In `DashboardShell`, hold `allToolsOpen` state, pass `onOpenAllTools` to both `NavShelf` instances, render one `AllToolsSheet`, and register the ⌘K listener with the focus guard.

- [ ] **Step 4: Verify**

```bash
npm run test 2>&1 | tail -10
npm run typecheck:guard 2>&1 | tail -3
npm run lint 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/NavShelf.tsx src/components/dashboard/NavShelf.test.tsx src/components/dashboard/DashboardShell.tsx src/components/dashboard/DashboardShell.allTools.test.tsx
git commit -m "feat(nav): All Tools sheet replaces the disclosure; global cmd-K"
```

---

### Task 4: Delete the dead command palette

**Files:**
- Delete: `src/components/navigation/GlobalCommandPalette.tsx`
- Modify: `src/components/layout/UniversalHeader.tsx` (remove the commented import at ~line 32)

**Why it goes.** `GlobalCommandPalette` is 98 lines that nothing renders — its only reference is a **commented-out** import in `UniversalHeader.tsx:32`. It is built on `UNIFIED_MODULES`, a fourth navigation taxonomy separate from `NAV_CATALOG`, and it navigates to `/dashboard?module=<id>` plus an `open-module` event consumed by `ModularDashboard`, which is no longer routed anywhere — `/dashboard` renders `HouseHome`. Critically, `UNIFIED_MODULES` carries no gating fields at all, so had anyone wired this up it would have offered every module to every user regardless of role, module entitlement, or tenant `hiddenRoutes`. This is the same class of dead-nav-taxonomy drift Phase 1 removed with `AppNavigation.tsx`.

- [ ] **Step 1: Stop-gate — confirm nothing references it**

```bash
grep -rn "GlobalCommandPalette" src/ scripts/ e2e/ 2>/dev/null
grep -rn "open-command-palette" src/ | grep -v GlobalCommandPalette
grep -rn "ModularDashboard" src/App.tsx src/pages/
```

Expected: the first prints only the file itself plus the commented import; the second and third print nothing. **If anything else appears, STOP and report it** rather than deleting.

Note `UNIFIED_MODULES` itself has other consumers — do NOT delete `src/config/unified-modules.ts`.

- [ ] **Step 2: Delete**

```bash
git rm src/components/navigation/GlobalCommandPalette.tsx
```

Then remove the commented import line from `src/components/layout/UniversalHeader.tsx`.

- [ ] **Step 3: Verify all four gates**

```bash
npm run test 2>&1 | tail -10
npm run typecheck:guard 2>&1 | tail -3
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

`npm run build` is not optional here — a removed import that Vite's hand-tuned `manualChunks` referenced surfaces there and nowhere else.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(nav): delete the dead GlobalCommandPalette"
```

---

## Done criteria

1. All four gates pass with no new failures beyond the 6 known baseline files.
2. ⌘K opens All Tools from any page wrapped in `DashboardShell` — where the sheet and its handler both live — and does not fire while typing in an input. (Amended after the fact: this criterion originally read "from any authenticated page", which the shipped scope never met. Academy renders inside `AcademyShell` and bare-`UniversalLayout` pages have no shell at all, so neither has a ⌘K handler. Widening it means hoisting the sheet above the shell, which is its own change with its own gating questions — out of scope for Phase 3.)
3. Every gated destination is reachable by typing a prefix of its label; no ungated destination appears in the sheet, in search results, or as a pin target.
4. Pinning from the sheet appends to the stored `MyTools` list and immediately shows on both the shelf and the home keycaps.
5. The Phase 1 disclosure is gone — `NavShelf` no longer takes `sections`.
6. `GlobalCommandPalette.tsx` is deleted and nothing imports it.

## Deliberately out of scope

- The Suggestions / "You use most" row — **Phase 4**, needs `gw_nav_usage`
- Content search (scores, events, people) — nav-only for v1; the sheet is built so content sources can be added as further result groups
- The catalog recut and `MERGED_KEYS` — **Phase 5**
- `src/config/unified-modules.ts` — other consumers remain
