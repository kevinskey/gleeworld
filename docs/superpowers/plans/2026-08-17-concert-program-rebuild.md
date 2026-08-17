# Concert Program Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Concert Planner's card-stack editor with true-paper 8.5×11 / half-fold WYSIWYG program editing, real print/PDF output, and a fixed publish path, per the approved spec.

**Architecture:** A `blocks` JSONB column on `gw_concert_programs` stores document structure (pieces/roster stay relational). Pure functions handle derive/reconcile/paginate/impose; block renderer components are shared by the editor, the print overlay, and the public page. Print uses the PrintPaperView portal pattern with measured-height pagination onto inch-sized sheets.

**Tech Stack:** React 18 + TS + Vite, Tailwind (screen chrome only — paper is inches/points), TanStack Query, Supabase (self-hosted), dnd-kit, `qrcode`, Vitest (+jsdom per-file), sonner.

**Spec:** `docs/superpowers/specs/2026-08-17-concert-program-rebuild-design.md` — read it first; this plan implements it and cites it. The 1943 McMurry program is the visual model.

## Global Constraints

- Work in `~/Documents/GitHub/gw-worktrees/concert-rebuild`, branch `concert-program-rebuild-impl`. Deps: `npm ci --legacy-peer-deps` (plain `npm ci` fails in worktrees).
- Run a single test file: `npx vitest run <path>`. Whole suite: `npm test`. Type gate: `npm run typecheck:guard` (baseline-diff; new errors fail). Lint: `npm run lint`.
- Component tests: first line MUST be `// @vitest-environment jsdom` (vitest default env is node). Use `fireEvent` from `@testing-library/react` — `@testing-library/user-event` is NOT installed. Mock refs via `vi.hoisted()`; `vi.mock(...)` calls before importing the component (see `src/components/youtube/AddYouTubeVideoForm.test.tsx` for the canonical pattern).
- `vitest.setup.ts` does NOT polyfill `ResizeObserver` — feature-detect (`typeof ResizeObserver === 'undefined'`) like `AidStage.tsx:42`. jsdom has no `document.fonts` — guard with `'fonts' in document` (pattern: `PDFViewerWithAnnotations.tsx:912`).
- Toast: `import { toast } from 'sonner';` — never the legacy `@/hooks/use-toast`. Undo-in-toast prior art: `WorshipAidPage.tsx:440` (`toast(msg, { action: { label: 'Undo', onClick } })`).
- Supabase writes MUST chain `.select()` and treat missing rows as failure — demo tenants silently swallow RLS-rejected writes.
- Supabase client import: `import { supabase, getTenantSlug } from '@/integrations/supabase/client';`. The client is typed `any`; keep insert shapes correct by hand.
- Copy is tenant-neutral: never "Spelman"; say "students", never "singers"/"members"; "graduates", never "alumnae".
- The hostile global print CSS lives at `src/index.css:2390-2410` (`* { background: white !important; color: black !important }`, `a[href]::after { content: " (" attr(href) ")" }`, `.no-print`). Every print surface we add must neutralize the link-URL rule inside its own scope. Our designs are black-on-white, so the color flattening is harmless.
- `@page` at-rules cannot be class-scoped — inject a `<style>` element on print-overlay mount and remove on unmount (pattern: `PrintPaperView.tsx:78-83`), never put `@page` in an always-loaded CSS file.
- Fonts: Libre Baskerville (400;700), Playfair Display (400;600;700), Montserrat (300-900), Cormorant Garamond (300-700), Cinzel (400-900) are ALL already in `index.html`'s Google Fonts link. **No italic axes are loaded** — browser-synthesized italics are acceptable for the soloists line; do not add font requests. Inter is NOT loaded; never reference it.
- All routes stay: `/dashboard/concert-planner`, `/dashboard/concert-planner/:id`, `/program/:slug` (App.tsx L1722-1745, L1909-1916). `src/lib/assistant/__tests__/clientActions.test.ts` asserts `'concert-planner'` resolves — do not break it.
- Commit after every task (small, imperative messages). Never push to main; the branch PRs at the end.
- DB deploy reality: the self-hosted droplet has NO schema_migrations tracking. The migration file is committed to the repo AND applied by hand via `ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -d postgres"` at deploy time (Task 16) — never earlier, never automatically.

## Verified production facts (2026-08-17)

- CHECK constraint to replace is named `gw_concert_programs_print_format_check` (verified via pg_constraint on prod).
- Prod `gw_concert_programs` rows: 2 × letter-portrait, 1 × half-fold, **zero** trifold/qr-lobby — the migration's UPDATE is a safety no-op.
- `rights_status` on new piece rows lands as SQL NULL (no DB default); `validateProgram` coerces `?? 'unknown'`. Kevin's live "Fall Concert" (id `5e751d87-ed0e-44b3-8292-d5dc35630c8c`, tenant `kevin`) has 5 pieces, all rights NULL — it is the first real QA target.

## File structure (locked)

New (greenfield, `concertProgram` — distinct from legacy `concertPlanner`):

| File | Responsibility |
|---|---|
| `supabase/migrations/20260817200000_concert_program_rebuild.sql` | print_design + blocks columns, print_format CHECK swap |
| `src/lib/concertProgram/types.ts` | ProgramBlock union, PrintDesign, ProgramFormat |
| `src/lib/concertProgram/geometry.ts` | inch constants + content box helpers |
| `src/lib/concertProgram/blocks.ts` | deriveDefaultBlocks, defaultNewProgramBlocks, reconcileBlocks, flattenPieceOrder |
| `src/lib/concertProgram/paginate.ts` | blocksToUnits, unitKey, paginateProgram (measured heights) |
| `src/lib/concertProgram/impose.ts` | imposeHalfFold(panelCount, flipMode) |
| `src/lib/concertProgram/slug.ts` | slugify moved out of the old editor |
| `src/hooks/useConcertProgramDoc.ts` | doc-level data ops: blocks persistence w/ sort_order mirror, atomic piece add/delete, undo snapshots |
| `src/components/concert-program/blocks/PieceLine.tsx` | title …dots… composer line (+voicing/soloists lines) |
| `src/components/concert-program/blocks/BlockRenderers.tsx` | Title/PieceGroup/Text/Divider/Roster/Footer renderers over PageItems |
| `src/components/concert-program/ProgramSheetView.tsx` | paged true-size sheets + scale-to-fit wrapper |
| `src/components/concert-program/useBlockMeasurements.tsx` | off-screen measurement → heights map |
| `src/components/concert-program/ConcertProgramPrintView.tsx` | print portal overlay (letter + imposed half-fold) |
| `src/components/concert-program/LibraryPickerDialog.tsx` | Scores + My Music search picker |
| `src/components/concert-program/SetlistImportDialog.tsx` | one-time setlist copy |
| `src/components/concert-program/PublishPanel.tsx` | blockers w/ click-to-jump, approval, real QR |
| `src/components/concert-program/PieceEditPopover.tsx` | full piece fields + rights + ghost chips |
| `src/components/concert-program/RosterPanel.tsx` | RosterEditor host + bulk paste |
| `src/styles/concert-program.css` | the 3 print designs (pt type, screen+print) |
| `src/styles/concert-program-print.css` | print-media neutralization, sheet page-breaks |

Rewritten in place: `src/pages/dashboard/ConcertPlannerEditorPage.tsx` (new editor), `src/pages/dashboard/ConcertPlannerPage.tsx` (new-program dialog), `src/pages/public/PublicConcertProgramPage.tsx` (block renderers + derive fallback), `src/hooks/useConcertPrograms.ts` (type additions only), `src/components/concertPlanner/RosterEditor.tsx` (bulk paste).

Deleted at Task 15: `src/lib/concertPlanner/cards.ts`, `src/lib/concertPlanner/themes.ts` (+ their exports from the barrel and their tests if any).

---

### Task 1: Migration + core types

**Files:**
- Create: `supabase/migrations/20260817200000_concert_program_rebuild.sql`
- Create: `src/lib/concertProgram/types.ts`
- Create: `src/lib/concertProgram/geometry.ts`
- Modify: `src/hooks/useConcertPrograms.ts` (ConcertProgram interface, L17-42)
- Test: `src/lib/concertProgram/geometry.test.ts`

**Interfaces produced (later tasks import exactly these):**
- `PrintDesign`, `ProgramFormat`, `ProgramBlock` + member interfaces, `newBlockId()`
- `LETTER`, `PANEL`, `contentWidthIn(format)`, `contentHeightIn(format)`, `PX_PER_IN`

- [ ] **Step 1: Write the migration** — exactly this SQL (constraint name verified against prod):

```sql
-- Concert Program rebuild: block-model document + print designs.
-- Spec: docs/superpowers/specs/2026-08-17-concert-program-rebuild-design.md
-- NOTE self-hosted droplet has no schema_migrations; this file is applied
-- manually via psql -U supabase_admin at deploy time.

ALTER TABLE public.gw_concert_programs
  ADD COLUMN IF NOT EXISTS print_design text NOT NULL DEFAULT 'classic-1943'
    CHECK (print_design IN ('classic-1943','modern-clean','formal')),
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]';

-- Retire trifold / qr-lobby (prod verified 2026-08-17: zero such rows; safety no-op).
UPDATE public.gw_concert_programs
   SET print_format = 'letter-portrait'
 WHERE print_format IN ('trifold','qr-lobby');

ALTER TABLE public.gw_concert_programs
  DROP CONSTRAINT gw_concert_programs_print_format_check;
ALTER TABLE public.gw_concert_programs
  ADD CONSTRAINT gw_concert_programs_print_format_check
    CHECK (print_format IN ('letter-portrait','half-fold'));

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Write `src/lib/concertProgram/types.ts`:**

```ts
// Block model for concert programs. `blocks` (gw_concert_programs.blocks)
// stores STRUCTURE + ORDER only; pieces and roster rows stay relational
// and are referenced by id. Spec: 2026-08-17-concert-program-rebuild-design.md.

export type PrintDesign = 'classic-1943' | 'modern-clean' | 'formal';
export type ProgramFormat = 'letter-portrait' | 'half-fold';

export interface TitleBlock { id: string; kind: 'title'; showLogo: boolean; showOrgName: boolean }
export interface PieceGroupBlock {
  id: string;
  kind: 'piece-group';
  sectionHeading: string | null;
  pieceIds: string[];            // ordered refs into gw_concert_program_pieces
  creditLine: string | null;     // centered under the group (1943 pattern)
}
export interface DividerBlock { id: string; kind: 'divider' }
export interface TextBlock { id: string; kind: 'text'; text: string; align: 'center' | 'left' }
export interface RosterBlock { id: string; kind: 'roster' }
export interface FooterBlock { id: string; kind: 'footer'; showQr?: boolean }

export type ProgramBlock =
  | TitleBlock | PieceGroupBlock | DividerBlock | TextBlock | RosterBlock | FooterBlock;

export const PRINT_DESIGNS: Array<{ value: PrintDesign; label: string; sub: string }> = [
  { value: 'classic-1943', label: 'Classic 1943', sub: 'Baskerville, dot leaders, centered' },
  { value: 'modern-clean', label: 'Modern Clean', sub: 'Montserrat, left-aligned, thin rules' },
  { value: 'formal',       label: 'Formal',       sub: 'Cormorant & Cinzel, generous leading' },
];

export function newBlockId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Write the failing geometry test** `src/lib/concertProgram/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LETTER, PANEL, contentWidthIn, contentHeightIn, PX_PER_IN } from './geometry';

describe('concert program geometry', () => {
  it('letter portrait content box is 7.0 x 9.5 inches', () => {
    expect(contentWidthIn('letter-portrait')).toBeCloseTo(7.0);
    expect(contentHeightIn('letter-portrait')).toBeCloseTo(9.5);
  });
  it('half-fold panel content box is 4.5 x 7.5 inches', () => {
    expect(contentWidthIn('half-fold')).toBeCloseTo(4.5);
    expect(contentHeightIn('half-fold')).toBeCloseTo(7.5);
  });
  it('sheet dimensions match the spec', () => {
    expect(LETTER).toEqual({ sheetW: 8.5, sheetH: 11, pad: 0.75 });
    expect(PANEL).toEqual({ sheetW: 5.5, sheetH: 8.5, pad: 0.5 });
    expect(PX_PER_IN).toBe(96);
  });
});
```

- [ ] **Step 4: Run it, verify FAIL** — `npx vitest run src/lib/concertProgram/geometry.test.ts` → module not found.

- [ ] **Step 5: Write `src/lib/concertProgram/geometry.ts`:**

```ts
import type { ProgramFormat } from './types';

// All paper geometry in inches (spec: "All type in points, all geometry in inches").
export const PX_PER_IN = 96; // CSS reference pixel

export const LETTER = { sheetW: 8.5, sheetH: 11, pad: 0.75 } as const;
export const PANEL  = { sheetW: 5.5, sheetH: 8.5, pad: 0.5 } as const;

export function contentWidthIn(format: ProgramFormat): number {
  return format === 'half-fold' ? PANEL.sheetW - 2 * PANEL.pad : LETTER.sheetW - 2 * LETTER.pad;
}
export function contentHeightIn(format: ProgramFormat): number {
  return format === 'half-fold' ? PANEL.sheetH - 2 * PANEL.pad : LETTER.sheetH - 2 * LETTER.pad;
}
```

- [ ] **Step 6: Run test, verify PASS.**

- [ ] **Step 7: Extend the hook's DB type** — in `src/hooks/useConcertPrograms.ts`, add to `interface ConcertProgram` (after `card_layout`):

```ts
  print_design: import('@/lib/concertProgram/types').PrintDesign;
  blocks: import('@/lib/concertProgram/types').ProgramBlock[];
```

(Plain `import type { PrintDesign, ProgramBlock } from '@/lib/concertProgram/types';` at top + `print_design: PrintDesign; blocks: ProgramBlock[];` is equally fine — match file style.) Note: until the migration is applied in prod these fields are absent at runtime; every consumer added by this plan treats `blocks` as possibly-undefined via `program.blocks ?? []`.

- [ ] **Step 8: `npm run typecheck:guard` — must pass. Commit** `feat(concert-program): block-model migration + core types`.

---

### Task 2: deriveDefaultBlocks / reconcileBlocks / flattenPieceOrder

**Files:**
- Create: `src/lib/concertProgram/blocks.ts`
- Test: `src/lib/concertProgram/blocks.test.ts`

**Interfaces:**
- Consumes: `ProgramBlock`, `newBlockId` from Task 1; `ConcertProgram`, `ConcertProgramPiece`, `RosterSection` shapes from `@/hooks/useConcertPrograms` / `@/lib/concertPlanner` (roster type: `{ id, section_name, sort_order, members: {id, member_name, sort_order}[] }`).
- Produces:
  - `deriveDefaultBlocks(program: { notes: string | null }, pieces: Array<{ id: string; sort_order: number; section_heading: string | null }>, roster: Array<{ members: unknown[] }>): ProgramBlock[]`
  - `defaultNewProgramBlocks(): ProgramBlock[]` — title, one empty piece-group, divider, footer
  - `reconcileBlocks(blocks: ProgramBlock[], pieces: Array<{ id: string }>): { blocks: ProgramBlock[]; changed: boolean }`
  - `flattenPieceOrder(blocks: ProgramBlock[]): string[]`

- [ ] **Step 1: Write the failing tests** `src/lib/concertProgram/blocks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveDefaultBlocks, defaultNewProgramBlocks, reconcileBlocks, flattenPieceOrder } from './blocks';
import type { PieceGroupBlock, ProgramBlock } from './types';

const piece = (id: string, sort: number, heading: string | null = null) =>
  ({ id, sort_order: sort, section_heading: heading });

describe('deriveDefaultBlocks', () => {
  it('groups consecutive pieces by section_heading changes', () => {
    const blocks = deriveDefaultBlocks(
      { notes: null },
      [piece('a', 0, null), piece('b', 1, null), piece('c', 2, 'Part II'), piece('d', 3, 'Part II'), piece('e', 4, null)],
      [],
    );
    const groups = blocks.filter((b): b is PieceGroupBlock => b.kind === 'piece-group');
    expect(groups.map((g) => g.pieceIds)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(groups.map((g) => g.sectionHeading)).toEqual([null, 'Part II', null]);
    expect(blocks[0].kind).toBe('title');
    expect(blocks[blocks.length - 1].kind).toBe('footer');
  });
  it('orders pieces by sort_order before grouping', () => {
    const blocks = deriveDefaultBlocks({ notes: null }, [piece('b', 2), piece('a', 1)], []);
    const g = blocks.find((b): b is PieceGroupBlock => b.kind === 'piece-group')!;
    expect(g.pieceIds).toEqual(['a', 'b']);
  });
  it('legacy program: notes become a text block, roster included only when members exist', () => {
    const withMembers = deriveDefaultBlocks({ notes: 'Thanks to our patrons.' }, [piece('a', 0)], [{ members: [{}] }]);
    expect(withMembers.some((b) => b.kind === 'text' && b.text === 'Thanks to our patrons.')).toBe(true);
    expect(withMembers.some((b) => b.kind === 'roster')).toBe(true);
    const noMembers = deriveDefaultBlocks({ notes: null }, [piece('a', 0)], [{ members: [] }]);
    expect(noMembers.some((b) => b.kind === 'roster')).toBe(false);
  });
  it('no pieces → one empty piece-group so the editor has a landing spot', () => {
    const blocks = deriveDefaultBlocks({ notes: null }, [], []);
    const g = blocks.find((b): b is PieceGroupBlock => b.kind === 'piece-group')!;
    expect(g.pieceIds).toEqual([]);
  });
});

describe('defaultNewProgramBlocks', () => {
  it('is title, empty piece-group, divider, footer', () => {
    expect(defaultNewProgramBlocks().map((b) => b.kind)).toEqual(['title', 'piece-group', 'divider', 'footer']);
  });
});

describe('reconcileBlocks', () => {
  const group = (id: string, pieceIds: string[]): PieceGroupBlock =>
    ({ id, kind: 'piece-group', sectionHeading: null, pieceIds, creditLine: null });
  const base: ProgramBlock[] = [
    { id: 't', kind: 'title', showLogo: false, showOrgName: false },
    group('g1', ['a', 'b']),
    group('g2', ['c']),
    { id: 'f', kind: 'footer' },
  ];
  it('drops dangling pieceIds', () => {
    const { blocks, changed } = reconcileBlocks(base, [{ id: 'a' }, { id: 'c' }]);
    expect(changed).toBe(true);
    expect((blocks[1] as PieceGroupBlock).pieceIds).toEqual(['a']);
  });
  it('appends unreferenced pieces to the LAST piece-group', () => {
    const { blocks, changed } = reconcileBlocks(base, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'z' }]);
    expect(changed).toBe(true);
    expect((blocks[2] as PieceGroupBlock).pieceIds).toEqual(['c', 'z']);
  });
  it('creates a piece-group before the footer when none exists and orphans need a home', () => {
    const { blocks } = reconcileBlocks(
      [{ id: 't', kind: 'title', showLogo: false, showOrgName: false }, { id: 'f', kind: 'footer' }],
      [{ id: 'z' }],
    );
    const idx = blocks.findIndex((b) => b.kind === 'piece-group');
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(blocks.findIndex((b) => b.kind === 'footer'));
    expect((blocks[idx] as PieceGroupBlock).pieceIds).toEqual(['z']);
  });
  it('removes a group emptied of pieces (spec: "a group emptied of pieces is removed") but keeps the only remaining group', () => {
    const { blocks } = reconcileBlocks(base, [{ id: 'c' }]);
    // g1 lost both pieces → removed; g2 keeps c.
    expect(blocks.filter((b) => b.kind === 'piece-group')).toHaveLength(1);
  });
  it('no-op returns changed: false and the SAME array reference', () => {
    const pieces = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const r = reconcileBlocks(base, pieces);
    expect(r.changed).toBe(false);
    expect(r.blocks).toBe(base);
  });
});

describe('flattenPieceOrder', () => {
  it('returns pieceIds in block order', () => {
    const blocks: ProgramBlock[] = [
      { id: 't', kind: 'title', showLogo: false, showOrgName: false },
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['b', 'a'], creditLine: null },
      { id: 'd', kind: 'divider' },
      { id: 'g2', kind: 'piece-group', sectionHeading: 'II', pieceIds: ['c'], creditLine: null },
    ];
    expect(flattenPieceOrder(blocks)).toEqual(['b', 'a', 'c']);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** (`npx vitest run src/lib/concertProgram/blocks.test.ts`).

- [ ] **Step 3: Implement `src/lib/concertProgram/blocks.ts`:**

```ts
import { newBlockId, type PieceGroupBlock, type ProgramBlock } from './types';

interface DerivePiece { id: string; sort_order: number; section_heading: string | null }

export function deriveDefaultBlocks(
  program: { notes: string | null },
  pieces: DerivePiece[],
  roster: Array<{ members: unknown[] }>,
): ProgramBlock[] {
  const blocks: ProgramBlock[] = [{ id: newBlockId(), kind: 'title', showLogo: false, showOrgName: false }];

  const ordered = pieces.slice().sort((a, b) => a.sort_order - b.sort_order);
  let current: PieceGroupBlock | null = null;
  for (const p of ordered) {
    const heading = p.section_heading ?? null;
    if (!current || current.sectionHeading !== heading) {
      current = { id: newBlockId(), kind: 'piece-group', sectionHeading: heading, pieceIds: [], creditLine: null };
      blocks.push(current);
    }
    current.pieceIds.push(p.id);
  }
  if (!current) {
    blocks.push({ id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null });
  }

  if (program.notes && program.notes.trim()) {
    blocks.push({ id: newBlockId(), kind: 'text', text: program.notes, align: 'center' });
  }
  if (roster.some((s) => s.members.length > 0)) {
    blocks.push({ id: newBlockId(), kind: 'roster' });
  }
  blocks.push({ id: newBlockId(), kind: 'footer' });
  return blocks;
}

export function defaultNewProgramBlocks(): ProgramBlock[] {
  return [
    { id: newBlockId(), kind: 'title', showLogo: false, showOrgName: false },
    { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null },
    { id: newBlockId(), kind: 'divider' },
    { id: newBlockId(), kind: 'footer' },
  ];
}

// Self-heal on every load (spec "blocks ↔ pieces consistency"): drop dangling
// pieceIds; append piece rows referenced by no block to the last group
// (visible, never orphaned); drop groups emptied of REAL pieces — but only
// when at least one other piece-group remains, so the editor always has a
// landing spot for "Add piece".
export function reconcileBlocks(
  blocks: ProgramBlock[],
  pieces: Array<{ id: string }>,
): { blocks: ProgramBlock[]; changed: boolean } {
  const valid = new Set(pieces.map((p) => p.id));
  const referenced = new Set<string>();
  let changed = false;

  let next: ProgramBlock[] = blocks.map((b) => {
    if (b.kind !== 'piece-group') return b;
    const kept = b.pieceIds.filter((id) => {
      if (!valid.has(id) || referenced.has(id)) return false; // dangling or duplicate ref
      referenced.add(id);
      return true;
    });
    if (kept.length !== b.pieceIds.length) {
      changed = true;
      return { ...b, pieceIds: kept };
    }
    return b;
  });

  const orphans = pieces.filter((p) => !referenced.has(p.id)).map((p) => p.id);
  if (orphans.length > 0) {
    changed = true;
    const lastGroupIdx = next.map((b) => b.kind).lastIndexOf('piece-group');
    if (lastGroupIdx >= 0) {
      const g = next[lastGroupIdx] as PieceGroupBlock;
      next = next.slice();
      next[lastGroupIdx] = { ...g, pieceIds: [...g.pieceIds, ...orphans] };
    } else {
      const footerIdx = next.findIndex((b) => b.kind === 'footer');
      const group: PieceGroupBlock = { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: orphans, creditLine: null };
      next = next.slice();
      next.splice(footerIdx === -1 ? next.length : footerIdx, 0, group);
    }
  }

  // Remove emptied groups, preserving at least one.
  const groupCount = next.filter((b) => b.kind === 'piece-group').length;
  if (groupCount > 1) {
    const pruned = next.filter((b) => !(b.kind === 'piece-group' && b.pieceIds.length === 0));
    if (pruned.length !== next.length && pruned.some((b) => b.kind === 'piece-group')) {
      next = pruned;
      changed = true;
    }
  }

  return changed ? { blocks: next, changed } : { blocks, changed: false };
}

export function flattenPieceOrder(blocks: ProgramBlock[]): string[] {
  return blocks.flatMap((b) => (b.kind === 'piece-group' ? b.pieceIds : []));
}
```

- [ ] **Step 4: Run tests, verify PASS.** (Watch the "removes emptied group" test: after g1 drops `a`,`b` it must be pruned because g2 survives.)

- [ ] **Step 5: Commit** `feat(concert-program): derive/reconcile/flatten block helpers`.

---

### Task 3: paginateProgram (measured heights, pure)

**Files:**
- Create: `src/lib/concertProgram/paginate.ts`
- Test: `src/lib/concertProgram/paginate.test.ts`

**Interfaces:**
- Consumes: `ProgramBlock` (Task 1).
- Produces:

```ts
export type FlowUnit =
  | { type: 'block'; blockId: string }                      // title | divider | text | footer (atomic)
  | { type: 'group-header'; blockId: string }
  | { type: 'piece-line'; blockId: string; pieceId: string }
  | { type: 'group-credit'; blockId: string }
  | { type: 'roster-section'; blockId: string; sectionId: string };
export function unitKey(u: FlowUnit): string;               // 'block:<id>' | 'gh:<id>' | 'pl:<blockId>:<pieceId>' | 'gc:<id>' | 'rs:<blockId>:<sectionId>'
export function blocksToUnits(blocks: ProgramBlock[], rosterSectionIds: string[]): FlowUnit[];
export interface PageItem { unit: FlowUnit; continued?: boolean }   // continued=true on a group-header repeated after a split
export interface PaginateResult { pages: PageItem[][]; oversized: string[] }  // oversized: unitKeys taller than a full page
export function paginateProgram(
  blocks: ProgramBlock[],
  rosterSectionIds: string[],
  heights: Map<string, number>,   // unitKey -> inches (measured; missing key = 0)
  pageHeightIn: number,
): PaginateResult;
```

**Flow rules (spec):** a piece-group never splits across pages — UNLESS the whole group is taller than one full page, in which case it splits at piece boundaries and every continuation page repeats the group header as `continued: true` (renderer prints "…(continued)"); the credit line travels with the LAST chunk. `roster` may split between sections (each `roster-section` unit is independently placeable). Everything else is atomic. An atomic unit taller than a full page is placed alone on a fresh page and recorded in `oversized` (editor shows a warning chip).

- [ ] **Step 1: Write the failing tests** `src/lib/concertProgram/paginate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { blocksToUnits, unitKey, paginateProgram, type FlowUnit } from './paginate';
import type { ProgramBlock } from './types';

const H = (pairs: Array<[string, number]>) => new Map(pairs);
const title: ProgramBlock = { id: 't', kind: 'title', showLogo: false, showOrgName: false };
const footer: ProgramBlock = { id: 'f', kind: 'footer' };
const group = (id: string, pieceIds: string[], credit: string | null = null): ProgramBlock =>
  ({ id, kind: 'piece-group', sectionHeading: 'Part', pieceIds, creditLine: credit });

describe('blocksToUnits', () => {
  it('expands groups into header/lines/credit and roster into sections', () => {
    const blocks: ProgramBlock[] = [title, group('g', ['a', 'b'], 'Sung by the students'), { id: 'r', kind: 'roster' }, footer];
    const keys = blocksToUnits(blocks, ['s1', 's2']).map(unitKey);
    expect(keys).toEqual(['block:t', 'gh:g', 'pl:g:a', 'pl:g:b', 'gc:g', 'rs:r:s1', 'rs:r:s2', 'block:f']);
  });
  it('omits the credit unit when creditLine is null and header when heading is null with no credit', () => {
    const g: ProgramBlock = { id: 'g', kind: 'piece-group', sectionHeading: null, pieceIds: ['a'], creditLine: null };
    expect(blocksToUnits([g], []).map(unitKey)).toEqual(['pl:g:a']);
  });
});

describe('paginateProgram', () => {
  it('keeps a group together by pushing it to the next page when it fits a full page', () => {
    const blocks = [title, group('g', ['a', 'b'])];
    const r = paginateProgram(blocks, [], H([
      ['block:t', 6], ['gh:g', 1], ['pl:g:a', 2], ['pl:g:b', 2],
    ]), 9.5);
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0].map((i) => unitKey(i.unit))).toEqual(['block:t']);
    expect(r.pages[1].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:a', 'pl:g:b']);
    expect(r.oversized).toEqual([]);
  });
  it('splits an over-tall group at a piece boundary with a continued header; credit rides the last chunk', () => {
    const pieces = ['a', 'b', 'c', 'd', 'e', 'f6'];
    const blocks = [group('g', pieces, 'credit')];
    const heights: Array<[string, number]> = [['gh:g', 1], ['gc:g', 1], ...pieces.map((p): [string, number] => [`pl:g:${p}`, 2])];
    const r = paginateProgram(blocks, [], H(heights), 9.5);
    // Page 1: header(1) + 4 lines(8) = 9. Page 2: continued header(1) + 2 lines(4) + credit(1).
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:a', 'pl:g:b', 'pl:g:c', 'pl:g:d']);
    expect(r.pages[0][0].continued).toBeUndefined();
    expect(r.pages[1][0]).toMatchObject({ continued: true });
    expect(r.pages[1].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:e', 'pl:g:f6', 'gc:g']);
  });
  it('roster splits between sections without repetition marks', () => {
    const blocks: ProgramBlock[] = [{ id: 'r', kind: 'roster' }];
    const r = paginateProgram(blocks, ['s1', 's2', 's3'], H([
      ['rs:r:s1', 5], ['rs:r:s2', 5], ['rs:r:s3', 5],
    ]), 9.5);
    expect(r.pages.map((p) => p.map((i) => unitKey(i.unit)))).toEqual([
      ['rs:r:s1'], ['rs:r:s2'], ['rs:r:s3'],
    ]);
  });
  it('flags an atomic unit taller than the page and still places it alone', () => {
    const blocks: ProgramBlock[] = [title, { id: 'x', kind: 'text', text: 'long', align: 'left' }];
    const r = paginateProgram(blocks, [], H([['block:t', 1], ['block:x', 12]]), 9.5);
    expect(r.pages).toHaveLength(2);
    expect(r.oversized).toEqual(['block:x']);
  });
  it('missing heights count as 0 and everything lands on one page', () => {
    const r = paginateProgram([title, footer], [], new Map(), 9.5);
    expect(r.pages).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/concertProgram/paginate.ts`:**

```ts
import type { ProgramBlock } from './types';

export type FlowUnit =
  | { type: 'block'; blockId: string }
  | { type: 'group-header'; blockId: string }
  | { type: 'piece-line'; blockId: string; pieceId: string }
  | { type: 'group-credit'; blockId: string }
  | { type: 'roster-section'; blockId: string; sectionId: string };

export function unitKey(u: FlowUnit): string {
  switch (u.type) {
    case 'block': return `block:${u.blockId}`;
    case 'group-header': return `gh:${u.blockId}`;
    case 'piece-line': return `pl:${u.blockId}:${u.pieceId}`;
    case 'group-credit': return `gc:${u.blockId}`;
    case 'roster-section': return `rs:${u.blockId}:${u.sectionId}`;
  }
}

export function blocksToUnits(blocks: ProgramBlock[], rosterSectionIds: string[]): FlowUnit[] {
  const units: FlowUnit[] = [];
  for (const b of blocks) {
    if (b.kind === 'piece-group') {
      if (b.sectionHeading !== null) units.push({ type: 'group-header', blockId: b.id });
      for (const pieceId of b.pieceIds) units.push({ type: 'piece-line', blockId: b.id, pieceId });
      if (b.creditLine !== null) units.push({ type: 'group-credit', blockId: b.id });
    } else if (b.kind === 'roster') {
      for (const sectionId of rosterSectionIds) units.push({ type: 'roster-section', blockId: b.id, sectionId });
    } else {
      units.push({ type: 'block', blockId: b.id });
    }
  }
  return units;
}

export interface PageItem { unit: FlowUnit; continued?: boolean }
export interface PaginateResult { pages: PageItem[][]; oversized: string[] }

const h = (heights: Map<string, number>, u: FlowUnit) => heights.get(unitKey(u)) ?? 0;

export function paginateProgram(
  blocks: ProgramBlock[],
  rosterSectionIds: string[],
  heights: Map<string, number>,
  pageHeightIn: number,
): PaginateResult {
  const pages: PageItem[][] = [];
  const oversized: string[] = [];
  let current: PageItem[] = [];
  let used = 0;

  const flush = () => { if (current.length) { pages.push(current); current = []; used = 0; } };
  const place = (item: PageItem, height: number) => { current.push(item); used += height; };

  for (const b of blocks) {
    if (b.kind === 'piece-group') {
      const headerU: FlowUnit | null = b.sectionHeading !== null ? { type: 'group-header', blockId: b.id } : null;
      const creditU: FlowUnit | null = b.creditLine !== null ? { type: 'group-credit', blockId: b.id } : null;
      const lineUs: FlowUnit[] = b.pieceIds.map((pieceId) => ({ type: 'piece-line', blockId: b.id, pieceId }));
      const headerH = headerU ? h(heights, headerU) : 0;
      const creditH = creditU ? h(heights, creditU) : 0;
      const total = headerH + creditH + lineUs.reduce((s, u) => s + h(heights, u), 0);

      if (total <= pageHeightIn - used) {
        if (headerU) place({ unit: headerU }, headerH);
        for (const u of lineUs) place({ unit: u }, h(heights, u));
        if (creditU) place({ unit: creditU }, creditH);
        continue;
      }
      if (total <= pageHeightIn) { // fits a fresh page whole
        flush();
        if (headerU) place({ unit: headerU }, headerH);
        for (const u of lineUs) place({ unit: u }, h(heights, u));
        if (creditU) place({ unit: creditU }, creditH);
        continue;
      }
      // Last resort: split at piece boundaries; repeat header as "(continued)".
      let started = false;
      const ensureHeader = () => {
        if (!headerU) return;
        place({ unit: headerU, ...(started ? { continued: true as const } : {}) }, headerH);
      };
      ensureHeader(); started = true;
      for (const u of lineUs) {
        const lh = h(heights, u);
        if (lh > pageHeightIn - used && current.length) { flush(); ensureHeader(); }
        place({ unit: u }, lh);
      }
      if (creditU) {
        if (creditH > pageHeightIn - used && current.length) { flush(); ensureHeader(); }
        place({ unit: creditU }, creditH);
      }
      continue;
    }

    const units: FlowUnit[] = b.kind === 'roster'
      ? rosterSectionIds.map((sectionId) => ({ type: 'roster-section', blockId: b.id, sectionId }))
      : [{ type: 'block', blockId: b.id }];
    for (const u of units) {
      const uh = h(heights, u);
      if (uh > pageHeightIn) {
        flush();
        oversized.push(unitKey(u));
        place({ unit: u }, uh);
        flush();
        continue;
      }
      if (uh > pageHeightIn - used) flush();
      place({ unit: u }, uh);
    }
  }
  flush();
  if (pages.length === 0) pages.push([]);
  return { pages, oversized };
}
```

- [ ] **Step 4: Run tests, verify PASS.** The 6-piece split test is the tricky one — trace it by hand if it fails: header 1 + a..d (8) = 9 ≤ 9.5, `e` (2) doesn't fit (9+2 > 9.5) → flush, continued header, e + f6 (5) + credit (1) = 6.
- [ ] **Step 5: Commit** `feat(concert-program): measured-height pagination`.

---

### Task 4: imposeHalfFold

**Files:**
- Create: `src/lib/concertProgram/impose.ts`
- Test: `src/lib/concertProgram/impose.test.ts`

**Interfaces:**
- Produces:

```ts
export type FlipMode = 'short-edge' | 'long-edge';
export interface ImposedSheet { front: [number, number]; back: [number, number] }
// 0-based panel indexes into the reading-order panel list, padded to a
// multiple of 4; any index >= realPanelCount renders as a blank panel.
export function imposeHalfFold(panelCount: number, flip: FlipMode = 'short-edge'): ImposedSheet[];
export function paddedPanelCount(panelCount: number): number; // next multiple of 4, min 4
```

- [ ] **Step 1: Failing tests** `src/lib/concertProgram/impose.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { imposeHalfFold, paddedPanelCount } from './impose';

describe('paddedPanelCount', () => {
  it('pads to a multiple of 4 with a floor of 4', () => {
    expect(paddedPanelCount(1)).toBe(4);
    expect(paddedPanelCount(4)).toBe(4);
    expect(paddedPanelCount(5)).toBe(8);
    expect(paddedPanelCount(6)).toBe(8);
    expect(paddedPanelCount(9)).toBe(12);
  });
});

describe('imposeHalfFold (saddle order, spec formula)', () => {
  it('4 panels → one sheet: front [4|1], back [2|3] (1-based)', () => {
    expect(imposeHalfFold(4)).toEqual([{ front: [3, 0], back: [1, 2] }]);
  });
  it('8 panels → two sheets', () => {
    expect(imposeHalfFold(8)).toEqual([
      { front: [7, 0], back: [1, 6] },
      { front: [5, 2], back: [3, 4] },
    ]);
  });
  it('12 panels → three sheets', () => {
    expect(imposeHalfFold(12)).toEqual([
      { front: [11, 0], back: [1, 10] },
      { front: [9, 2], back: [3, 8] },
      { front: [7, 4], back: [5, 6] },
    ]);
  });
  it('6 real panels are padded to 8; blanks are indexes >= 6', () => {
    const sheets = imposeHalfFold(6);
    expect(sheets).toHaveLength(2);
    expect(sheets[0].front).toEqual([7, 0]); // 7 is a blank
  });
  it('long-edge flip mirrors the back side', () => {
    expect(imposeHalfFold(4, 'long-edge')).toEqual([{ front: [3, 0], back: [2, 1] }]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement `src/lib/concertProgram/impose.ts`:**

```ts
// Saddle imposition for half-fold booklets (spec "Page geometry & pagination"):
// for N panels (multiple of 4), sheet k front = [panel N−2k | panel 1+2k],
// back = [panel 2+2k | panel N−1−2k] (1-based). Back order assumes duplex
// "flip on short edge"; flipMode makes a differently-behaving printer a
// config change, not a rewrite.
export type FlipMode = 'short-edge' | 'long-edge';
export interface ImposedSheet { front: [number, number]; back: [number, number] }

export function paddedPanelCount(panelCount: number): number {
  return Math.max(4, Math.ceil(panelCount / 4) * 4);
}

export function imposeHalfFold(panelCount: number, flip: FlipMode = 'short-edge'): ImposedSheet[] {
  const n = paddedPanelCount(panelCount);
  const sheets: ImposedSheet[] = [];
  for (let k = 0; k < n / 4; k++) {
    const front: [number, number] = [n - 1 - 2 * k, 2 * k];
    const back: [number, number] = [2 * k + 1, n - 2 - 2 * k];
    sheets.push({ front, back: flip === 'short-edge' ? back : [back[1], back[0]] });
  }
  return sheets;
}
```

- [ ] **Step 4: Run tests, verify PASS.**
- [ ] **Step 5: Commit** `feat(concert-program): half-fold saddle imposition`.

---

### Task 5: Print designs CSS + block renderers

**Files:**
- Create: `src/styles/concert-program.css`
- Create: `src/components/concert-program/blocks/PieceLine.tsx`
- Create: `src/components/concert-program/blocks/BlockRenderers.tsx`
- Test: `src/components/concert-program/blocks/PieceLine.test.tsx`

**Interfaces:**
- Consumes: `ProgramBlock` types, `PageItem`/`FlowUnit` (Task 3), piece rows (`ConcertProgramPiece` from `@/hooks/useConcertPrograms`).
- Produces:
  - `designClass(design: PrintDesign): string` → `'cp-design-classic-1943' | 'cp-design-modern-clean' | 'cp-design-formal'` (exported from `BlockRenderers.tsx`)
  - `<PieceLine piece={ConcertProgramPiece} />` — renders `.cp-piece-line` (title / `.cp-leader` / composer), optional `.cp-piece-voicing`, `.cp-piece-soloists`
  - `<PageItemView item={PageItem} ctx={RenderCtx} />` where

```ts
export interface RenderCtx {
  blocks: ProgramBlock[];                        // to find block by id
  piecesById: Map<string, ConcertProgramPiece>;
  roster: RosterSection[];                       // sections with members
  program: { title: string; subtitle: string | null; event_date: string | null; venue: string | null;
             conductor: string | null; accompanist: string | null; performer_group: string | null };
  orgName: string | null;                        // from branding, for title/footer blocks
  logoUrl: string | null;
  qrDataUrl: string | null;                      // footer QR when showQr && published
}
```

**Rendering rules (spec "The block model" / "Print designs"):**
- Piece line: `title ……dot leaders…… composer`; arranger renders as `, arr. X` appended to composer (or alone if no composer); `voicing` on a smaller indented second line; `soloists` as an indented italic line under the piece. Dot leader technique: flex row — `<span class="cp-piece-title">`, `<span class="cp-leader">` (flex-1, `border-bottom: 1px dotted currentColor`, small negative offset so dots sit on the baseline), `<span class="cp-piece-composer">`. `duration_seconds` NEVER prints.
- `modern-clean` swaps dot leaders for a thin rule: `.cp-design-modern-clean .cp-leader { border-bottom-style: solid; border-bottom-width: 0.5pt; }` and left-aligns headings.
- Group header: sectionHeading, small-caps-ish centered; `continued` items append ` (continued)`.
- Group credit: centered line under the group.
- Divider: the ornamental `—o—` centered (literal text in a `.cp-divider` div).
- Title block: optional logo `<img>` (max-height 0.6in) + optional org name; then "Program"-style heading driven by design (`classic-1943` leads with the word **Program** per the 1943 model, program title above it in larger type); subtitle; conductor/accompanist credit lines (`Dr. Angela Jones, Conductor` pattern); these come from program header fields, not block state.
- Footer: org name + `event_date` (format `August 31, 2026` via `new Date(d + 'T12:00:00')` + `toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })` — noon guards TZ) + venue; optional QR image 0.7in beside it when `ctx.qrDataUrl` present and the block's `showQr`.
- Roster section: section_name heading + members in CSS columns (`column-count: 2` letter, 1 on half-fold via `.cp-format-half-fold`).
- Text block: whitespace-pre-wrap paragraph, align per block.
- ALL type in `pt`, spacing in `in`/`pt` inside `.cp-page`; Tailwind classes are NOT used inside page content.

- [ ] **Step 1: Write `src/styles/concert-program.css`** — complete stylesheet, scoped entirely under `.cp-page`:

```css
/* Concert program print designs. Everything visual about the paper lives
   here, scoped under .cp-page + a design class. Type in points, geometry
   in inches (spec). Screen-only affordances live in the editor, not here. */

.cp-page { background: #fff; color: #000; box-sizing: border-box; position: relative; }
.cp-page * { box-sizing: border-box; }
.cp-page p { margin: 0; }

.cp-piece-line { display: flex; align-items: baseline; gap: 6pt; }
.cp-piece-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72%; }
.cp-leader { flex: 1 1 auto; border-bottom: 1px dotted currentColor; transform: translateY(-0.3em); min-width: 18pt; }
.cp-piece-composer { white-space: nowrap; }
.cp-piece-voicing { font-size: 8pt; padding-left: 18pt; }
.cp-piece-soloists { font-style: italic; font-size: 9pt; padding-left: 18pt; }
.cp-group-header { text-align: center; letter-spacing: 0.12em; text-transform: uppercase; margin: 10pt 0 6pt; }
.cp-group-credit { text-align: center; font-size: 9.5pt; margin: 4pt 0 8pt; }
.cp-divider { text-align: center; letter-spacing: 0.35em; margin: 8pt 0; }
.cp-text { white-space: pre-wrap; font-size: 10pt; line-height: 1.45; margin: 6pt 0; }
.cp-text-center { text-align: center; }
.cp-text-left { text-align: left; }
.cp-title-block { text-align: center; margin-bottom: 14pt; }
.cp-title-org { font-size: 10pt; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 6pt; }
.cp-title-logo { max-height: 0.6in; max-width: 2.2in; margin: 0 auto 6pt; display: block; }
.cp-title-name { margin: 0 0 2pt; }
.cp-title-program-word { letter-spacing: 0.3em; text-transform: uppercase; margin: 8pt 0 2pt; }
.cp-title-subtitle { font-size: 11pt; margin: 2pt 0; }
.cp-title-credit { font-size: 10.5pt; margin: 2pt 0; }
.cp-footer-block { text-align: center; margin-top: 14pt; font-size: 9.5pt; }
.cp-footer-qr { width: 0.7in; height: 0.7in; margin: 6pt auto 0; display: block; }
.cp-roster-section { break-inside: avoid; margin: 6pt 0; }
.cp-roster-heading { text-align: center; font-size: 10pt; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 3pt; }
.cp-roster-names { column-count: 2; column-gap: 18pt; font-size: 9.5pt; line-height: 1.5; }
.cp-format-half-fold .cp-roster-names { column-count: 1; }

/* ── classic-1943 (default): Libre Baskerville / Playfair Display ── */
.cp-design-classic-1943 { font-family: 'Libre Baskerville', Georgia, serif; font-size: 10.5pt; line-height: 1.55; }
.cp-design-classic-1943 .cp-title-name { font-family: 'Playfair Display', Georgia, serif; font-size: 22pt; font-weight: 700; }
.cp-design-classic-1943 .cp-title-program-word { font-size: 13pt; }
.cp-design-classic-1943 .cp-group-header { font-size: 10.5pt; }

/* ── modern-clean: Montserrat, left pieces, thin rules ── */
.cp-design-modern-clean { font-family: 'Montserrat', system-ui, sans-serif; font-size: 10pt; line-height: 1.5; }
.cp-design-modern-clean .cp-title-name { font-size: 20pt; font-weight: 700; letter-spacing: 0.02em; }
.cp-design-modern-clean .cp-title-program-word { font-size: 11pt; letter-spacing: 0.4em; }
.cp-design-modern-clean .cp-leader { border-bottom-style: solid; border-bottom-width: 0.5pt; transform: translateY(-0.42em); }
.cp-design-modern-clean .cp-group-header { text-align: left; letter-spacing: 0.2em; font-size: 9pt; }
.cp-design-modern-clean .cp-group-credit { text-align: left; }

/* ── formal: Cormorant Garamond / Cinzel ── */
.cp-design-formal { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11.5pt; line-height: 1.7; }
.cp-design-formal .cp-title-name { font-family: 'Cinzel', Georgia, serif; font-size: 21pt; font-weight: 600; }
.cp-design-formal .cp-title-program-word { font-family: 'Cinzel', Georgia, serif; font-size: 12pt; }
.cp-design-formal .cp-group-header { font-size: 11pt; letter-spacing: 0.18em; }
```

- [ ] **Step 2: Failing test** `src/components/concert-program/blocks/PieceLine.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PieceLine } from './PieceLine';

afterEach(cleanup);

const piece = (over: Record<string, unknown> = {}) => ({
  id: 'p1', program_id: 'x', sort_order: 0, section_heading: null,
  title: 'I Thank You God', composer: 'Gwyneth Walker', arranger: null, voicing: null,
  soloists: null, duration_seconds: 250, program_notes: null, rights_status: null,
  copyright_info: null, sheet_music_id: null, ...over,
}) as any;

describe('PieceLine', () => {
  it('renders title, leader, composer', () => {
    const { container } = render(<PieceLine piece={piece()} />);
    expect(screen.getByText('I Thank You God')).toBeInTheDocument();
    expect(screen.getByText('Gwyneth Walker')).toBeInTheDocument();
    expect(container.querySelector('.cp-leader')).not.toBeNull();
  });
  it('appends ", arr. X" after the composer', () => {
    render(<PieceLine piece={piece({ arranger: 'Moses Hogan' })} />);
    expect(screen.getByText('Gwyneth Walker, arr. Moses Hogan')).toBeInTheDocument();
  });
  it('arranger alone renders as "arr. X"', () => {
    render(<PieceLine piece={piece({ composer: null, arranger: 'Moses Hogan' })} />);
    expect(screen.getByText('arr. Moses Hogan')).toBeInTheDocument();
  });
  it('voicing and soloists render as secondary lines; duration never prints', () => {
    const { container } = render(<PieceLine piece={piece({ voicing: 'SATB div.', soloists: 'Jordan Lee, soprano' })} />);
    expect(container.querySelector('.cp-piece-voicing')!.textContent).toBe('SATB div.');
    expect(container.querySelector('.cp-piece-soloists')!.textContent).toBe('Jordan Lee, soprano');
    expect(container.textContent).not.toMatch(/250|4:10/);
  });
});
```

- [ ] **Step 3: Run, verify FAIL.**

- [ ] **Step 4: Implement `PieceLine.tsx`:**

```tsx
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';

export function composerCredit(p: Pick<ConcertProgramPiece, 'composer' | 'arranger'>): string {
  if (p.composer && p.arranger) return `${p.composer}, arr. ${p.arranger}`;
  if (p.composer) return p.composer;
  if (p.arranger) return `arr. ${p.arranger}`;
  return '';
}

export function PieceLine({ piece }: { piece: ConcertProgramPiece }) {
  const credit = composerCredit(piece);
  return (
    <div className="cp-piece">
      <div className="cp-piece-line">
        <span className="cp-piece-title">{piece.title}</span>
        <span className="cp-leader" aria-hidden="true" />
        {credit ? <span className="cp-piece-composer">{credit}</span> : null}
      </div>
      {piece.voicing ? <div className="cp-piece-voicing">{piece.voicing}</div> : null}
      {piece.soloists ? <div className="cp-piece-soloists">{piece.soloists}</div> : null}
    </div>
  );
}
```

- [ ] **Step 5: Run, verify PASS.**

- [ ] **Step 6: Implement `BlockRenderers.tsx`** — exports `designClass`, `RenderCtx`, `PageItemView`, plus `formatEventDate(d: string | null): string`. `PageItemView` switches on `item.unit.type`:
  - `block` → find the block by id; render `TitleBlockView` / `DividerView` (`<div className="cp-divider">—o—</div>`) / `TextView` / `FooterView` per kind above.
  - `group-header` → `<div className="cp-group-header">{heading}{item.continued ? ' (continued)' : ''}</div>`.
  - `piece-line` → `<PieceLine piece={ctx.piecesById.get(unit.pieceId)!} />`; a missing piece renders `null` (defensive skip, spec).
  - `group-credit` → `<div className="cp-group-credit">{creditLine}</div>`.
  - `roster-section` → section by id → heading + `<div className="cp-roster-names">{members.map(...)}</div>`.
  Import `'@/styles/concert-program.css'` from `BlockRenderers.tsx` (single import point).

- [ ] **Step 7: `npm run typecheck:guard`, `npm run lint` on new files. Commit** `feat(concert-program): print designs + shared block renderers`.

---

### Task 6: Measurement hook + ProgramSheetView

**Files:**
- Create: `src/components/concert-program/useBlockMeasurements.tsx`
- Create: `src/components/concert-program/ProgramSheetView.tsx`
- Test: `src/components/concert-program/ProgramSheetView.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 5.
- Produces:

```ts
export function useBlockMeasurements(args: {
  blocks: ProgramBlock[]; ctx: RenderCtx; design: PrintDesign; format: ProgramFormat;
  rosterSectionIds: string[];
}): { heights: Map<string, number> | null; measureHost: React.ReactNode }
// heights null until the first measurement completes (jsdom: resolves to all-zero map immediately).

export function ProgramSheetView(props: {
  pages: PageItem[][]; ctx: RenderCtx; design: PrintDesign; format: ProgramFormat;
  scaleToFit?: boolean;                    // editor: true; print view renders at 100%
  renderPageChrome?: (pageIndex: number) => React.ReactNode; // screen-only per-page adornments
  children?: never;
})
```

**Measurement mechanics (spec "Page geometry & pagination" — measured heights are REQUIRED, estimates are not acceptable):**
- `measureHost` renders every `FlowUnit` of the document into a hidden container: `position: fixed; left: -9999px; top: 0; visibility: hidden; pointer-events: none; width: ${contentWidthIn(format)}in`, `aria-hidden`, with class `cp-page ${designClass(design)}` (+ `cp-format-half-fold` when half-fold) so fonts/sizes match the real page exactly. Each unit wraps in a `<div data-unit={unitKey(u)}>`.
- A `useEffect` (deps: `[signature]` where `signature = JSON.stringify([blocks, design, format, pieceFieldsInvolved, rosterNames])` memoized) waits `'fonts' in document ? document.fonts.ready : Promise.resolve()` then reads every `[data-unit]` child's `offsetHeight / PX_PER_IN` into a Map and calls `setHeights` ONLY if some value changed by > 0.001 (loop guard — cf. `WorshipAidSheets.tsx:416-419` scar). Debounce the effect body 300 ms (`window.setTimeout` + cleanup) so it coalesces with the autosave tick.
- jsdom: `offsetHeight` is 0 → all-zero map, pagination becomes single-page; tests pass heights straight into `paginateProgram` instead when they need real numbers.
- `ProgramSheetView` letter: each page → `<div className="cp-sheet" style={{ width: '8.5in', height: '11in', padding: '0.75in' }}>`; half-fold editor shows READING-ORDER panels (`width: '5.5in', height: '8.5in', padding: '0.5in'`) — imposition is print-only (spec). Sheet chrome on screen: `box-shadow: 0 1px 12px rgba(0,0,0,0.18); margin: 0 auto 1rem; background: #fff`.
- `scaleToFit`: AidStage pattern verbatim (`AidStage.tsx:40-53`): ResizeObserver (feature-detected) on the wrapper sets `--cp-scale = min((clientWidth - 32) / (sheetW * 96), 1.25)`; sheets get `transform: scale(var(--cp-scale, 1)); transform-origin: top center`, wrapper `contain: paint` and an explicit height `sheetHpx * scale * pageCount` so scaled sheets don't leave ghost scroll space.

- [ ] **Step 1: Failing test** `ProgramSheetView.test.tsx` (jsdom docblock): render a two-page `pages` array (title on page 1, footer on page 2) with a minimal `ctx`; assert two `.cp-sheet` elements with `style.width === '8.5in'`; switch `format: 'half-fold'` and assert `width === '5.5in'`; assert the title block text appears on the first sheet only. (Model: `WorshipAidSheets.test.tsx` inline-style assertions.)
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement both files.** In `useBlockMeasurements`, the async fonts wait must set a `cancelled` flag in cleanup (pattern `PDFViewerWithAnnotations.tsx:912-927`).
- [ ] **Step 4: Run, PASS. Typecheck. Commit** `feat(concert-program): sheet view + measured pagination plumbing`.

---

### Task 7: useConcertProgramDoc — document data ops

**Files:**
- Create: `src/hooks/useConcertProgramDoc.ts`
- Create: `src/lib/concertProgram/slug.ts` (move `slugify` verbatim from old `ConcertPlannerEditorPage.tsx:1648-1653`, exported)
- Test: `src/hooks/__tests__/useConcertProgramDoc.test.ts`

**Interfaces:**
- Consumes: `useConcertProgram(id)` (existing hook — keep using its queries/mutations for header fields and roster), `reconcileBlocks`, `flattenPieceOrder`, `defaultNewProgramBlocks`, `deriveDefaultBlocks`.
- Produces:

```ts
export interface ProgramDoc {
  program: ConcertProgram | null;
  pieces: ConcertProgramPiece[];
  roster: RosterSection[];
  isLoading: boolean;
  blocks: ProgramBlock[] | null;          // reconciled view; null until program loads
  setBlocks(next: ProgramBlock[]): void;  // optimistic local + debounced persist (700ms)
  persistBlocksNow(next: ProgramBlock[]): Promise<boolean>;  // immediate (first-open derive, drag-end)
  addPieceToGroup(groupId: string, index: number | 'end', fields?: Partial<ConcertProgramPiece>): Promise<string | null>;
  updatePiece(pieceId: string, patch: Partial<ConcertProgramPiece>): void;   // delegates to existing mutation
  deletePieceWithUndo(pieceId: string): Promise<void>;       // sonner toast w/ Undo
  deleteBlockWithUndo(blockId: string): Promise<void>;       // text/divider/roster/piece-group (group deletes its pieces too)
  updateProgram: ReturnType<typeof useConcertProgram>['updateProgram'];      // pass-through
  rosterOps: Pick<ReturnType<typeof useConcertProgram>, 'addRosterSection' | 'updateRosterSection' | 'deleteRosterSection' | 'addRosterMember' | 'deleteRosterMember'>;
  legacyConcert: ReturnType<typeof useConcertProgram>;  // whole underlying hook object — RosterEditor's `concert` prop (Task 10)
}
// Internal helper both persistBlocksNow and addPieceToGroup use:
//   const piecesById = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
export function useConcertProgramDoc(id: string | undefined): ProgramDoc;
```

**Load-bearing behaviors (spec "blocks ↔ pieces consistency" + "sort_order has one writer"):**

1. **Reconcile on load:** `blocks = useMemo(() => program ? reconcileBlocks((program.blocks ?? []) as ProgramBlock[], pieces).blocks : null, [program, pieces])` — the reconciled result is what renders, even before any persist.
2. **First-open persistence:** an effect: when `program` loaded AND `(program.blocks ?? []).length === 0` AND pieces query settled → `persistBlocksNow(deriveDefaultBlocks(program, pieces, roster))`. Guard with a `useRef` so it fires once per program id (the PUBLIC page derives in memory instead — it cannot write).
3. **Single blocks writer:** `persistBlocks(next)` does BOTH writes in one tick:

```ts
const persistBlocksNow = async (next: ProgramBlock[]): Promise<boolean> => {
  if (!id) return false;
  setLocalBlocks(next); // optimistic
  const { data, error } = await supabase
    .from('gw_concert_programs')
    .update({ blocks: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error || !data?.length) {
    toast.error('Could not save the program layout');
    setLocalBlocks(null); // fall back to server state
    return false;
  }
  // Mirror: gw_concert_program_pieces.sort_order follows flattened block order.
  const order = flattenPieceOrder(next);
  const stale = order
    .map((pieceId, idx) => ({ pieceId, idx }))
    .filter(({ pieceId, idx }) => piecesById.get(pieceId)?.sort_order !== idx);
  await Promise.all(stale.map(({ pieceId, idx }) =>
    supabase.from('gw_concert_program_pieces').update({ sort_order: idx }).eq('id', pieceId).select('id'),
  ));
  qc.invalidateQueries({ queryKey: ['concert-program', id] });
  qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
  return true;
};
```

   `setBlocks` = optimistic `setLocalBlocks(next)` + 700 ms debounced `persistBlocksNow(next)` (timer ref, cleanup on unmount; latest-wins).
4. **Atomic piece add** (spec: insert row `.select('id')` FIRST, only then patch blocks; on blocks failure roll back):

```ts
const addPieceToGroup = async (groupId: string, index: number | 'end', fields: Partial<ConcertProgramPiece> = {}) => {
  if (!id || !blocks) return null;
  const sortHint = flattenPieceOrder(blocks).length;
  const { data, error } = await supabase
    .from('gw_concert_program_pieces')
    .insert({ program_id: id, sort_order: sortHint, title: 'New piece', ...fields })
    .select('id')
    .single();
  if (error || !data) { toast.error('Could not add the piece'); return null; }
  const next = blocks.map((b) => {
    if (b.id !== groupId || b.kind !== 'piece-group') return b;
    const ids = b.pieceIds.slice();
    ids.splice(index === 'end' ? ids.length : index, 0, data.id);
    return { ...b, pieceIds: ids };
  });
  const ok = await persistBlocksNow(next);
  if (!ok) {
    // Roll back the orphan row rather than leave a half-state; reconcile would
    // re-adopt it visibly, but the spec wants no silent half-writes.
    await supabase.from('gw_concert_program_pieces').delete().eq('id', data.id).select('id');
    return null;
  }
  qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
  return data.id;
};
```

5. **Delete + Undo (single-level, in-memory snapshot; spec "Undo for destructive actions"):** `deletePieceWithUndo` snapshots the full piece row + current blocks; deletes the row; persists blocks with the id removed (and empty-group pruning via reconcile); then `toast('Removed "<title>"', { action: { label: 'Undo', onClick: restore } })` where `restore` re-INSERTS the row (all content fields, `.select('id').single()` — new id) and persists blocks with the NEW id spliced into the original group position. `deleteBlockWithUndo` same shape for text/divider/roster (blocks-only snapshot) and for piece-group (snapshot: the group's piece rows + blocks; restore re-inserts rows then the group with new ids).
6. Header-field autosave stays the page's job (Task 8) via `updateProgram` — unchanged pattern from the old editor (800 ms debounce diff).

- [ ] **Step 1: Write failing tests.** Mock supabase with the `vi.hoisted` chain pattern; mock `useConcertProgram` to return canned data. Tests (renderHook from `@testing-library/react`):
  - `blocks` reconciles: program.blocks references a missing piece id + omits an existing one → rendered blocks drop the dangling id and adopt the orphan.
  - `addPieceToGroup` inserts BEFORE patching blocks and passes the new id into the group at the right index (assert call order via the mocks' `mock.invocationCallOrder`).
  - `addPieceToGroup` rolls back (delete called with the new id) when the blocks update returns `{ data: [] }`.
  - `persistBlocksNow` mirrors sort_order: with pieces a(0),b(1) and next blocks ordering b,a → exactly two `gw_concert_program_pieces` updates: b→0, a→1.
  - `deletePieceWithUndo` fires a sonner toast whose `action.onClick` re-inserts (assert toast mock got `action.label === 'Undo'`; invoke it; assert insert called with the snapshot's title).
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement.** Import `toast` from sonner; `useQueryClient` for invalidations; `localBlocks` state overlays server blocks until invalidation catches up (`blocks = localBlocks ?? reconciled`).
- [ ] **Step 4: Run, PASS. Typecheck. Commit** `feat(concert-program): document data ops with atomic piece writes + undo`.

---

### Task 8: Editor scaffold — true-paper page + rail + design/format

**Files:**
- Rewrite: `src/pages/dashboard/ConcertPlannerEditorPage.tsx` (wholesale; keep the default export name and route)
- Test: `src/pages/dashboard/__tests__/ConcertPlannerEditorPage.scaffold.test.tsx`

**Interfaces:**
- Consumes: `useConcertProgramDoc`, `useBlockMeasurements`, `paginateProgram`, `ProgramSheetView`, `useBrandingSettings`, `PRINT_DESIGNS`.
- Produces (consumed by Tasks 9-13, all local to the page or imported components): page-level state `selectedPieceId: string | null`, `pieceRefs: Map<string, HTMLElement>` (registration for click-to-jump), handlers `onSelectPiece(pieceId)`, `openPieceEditor(pieceId)`.

**Layout (spec "Editor"):**
- Keep the route wrappers exactly as today (page renders inside `UniversalLayout`+`DashboardShell` from App.tsx; drop the page's own duplicate `UniversalLayout`/`DashboardShell` self-wrap — App already provides them; verify against how the page currently double-wraps and remove the inner one).
- Top bar: back link + program title (read-only here; editable on the page itself) + `Print / Save PDF` + `Publish` buttons (wired in Tasks 12-13; render disabled placeholders now with `title="Coming in this build"` REMOVED before PR — i.e., wire them by Task 13, the buttons exist from this task).
- Body: `lg:grid lg:grid-cols-[1fr_280px]`. Left: neutral canvas (`bg-muted/40 rounded-lg overflow-auto p-4 lg:p-8`) containing `<ProgramSheetView scaleToFit pages={pages} … />`. Right rail (lg+ sticky column; below lg a `Sheet` (shadcn drawer) opened by a toolbar button): sections **Add** (piece / from Library / import Setlist / text / divider / roster — Library+Setlist wired Task 11), **Design** (3 tiles from `PRINT_DESIGNS` → `updateProgram.mutate({ print_design: value })`), **Format** (letter / half-fold toggle → `updateProgram.mutate({ print_format: value })` + panel-count line: `"<n> panels → <m> sheets (<b> blank panels)"` from `paddedPanelCount`), **Details** (call_time, target_length_minutes inputs — the header fields with no page presence, 800 ms debounced diff like the old editor).
- Pagination pipeline in the page:

```ts
const { program, pieces, roster, blocks, ... } = useConcertProgramDoc(id);
const format = (program?.print_format === 'half-fold' ? 'half-fold' : 'letter-portrait') as ProgramFormat;
const design = (program?.print_design ?? 'classic-1943') as PrintDesign;
const ctx: RenderCtx = useMemo(() => ({ blocks: blocks ?? [], piecesById, roster, program: headerCtx, orgName, logoUrl, qrDataUrl: null }), [...]);
const { heights, measureHost } = useBlockMeasurements({ blocks: blocks ?? [], ctx, design, format, rosterSectionIds });
const { pages, oversized } = useMemo(
  () => paginateProgram(blocks ?? [], rosterSectionIds, heights ?? new Map(), contentHeightIn(format)),
  [blocks, rosterSectionIds, heights, format],
);
```

- Overflow warning chip (spec "Error handling"): when `oversized.length > 0`, an amber chip above the canvas: "A block is taller than one page and will be clipped — split it up."
- Design/format changes re-measure automatically (signature includes them — Task 6).
- Running-total badge: sum `duration_seconds` over pieces → `MM min` chip in the rail Details section (editor-only; never prints — already guaranteed since PieceLine ignores duration).

- [ ] **Step 1: Failing scaffold test** (jsdom): mock `useConcertProgramDoc` to return a program (letter-portrait, classic-1943) + blocks (title, group with 2 pieces, footer) + heights via real paginate; render page (wrap in `MemoryRouter` with route param — see how other page tests mount router context, e.g. grep an existing `__tests__` page test for `MemoryRouter initialEntries`); assert: `.cp-sheet` present, piece titles visible, design tiles render 3 options, format toggle renders both options.
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement the scaffold.** Delete the entire old file contents. Bring over ONLY: the 800 ms header-debounce pattern (for rail Details fields), `supabase` import for publish later. The old in-file components (CardNavigator, RegenDialog, PieceDetailEditor, ValidationBadge, QrPlaceholder, SortableCardRow, slugify) are all gone — slugify now imports from `@/lib/concertProgram/slug`.
- [ ] **Step 4: Run test, PASS. `npm run typecheck:guard` (expect fallout from deleted in-file symbols — nothing else imports them; fix any stragglers). Commit** `feat(concert-program): true-paper editor scaffold`.

---

### Task 9: On-page editing + fast entry + piece popover

**Files:**
- Modify: `src/pages/dashboard/ConcertPlannerEditorPage.tsx`
- Create: `src/components/concert-program/PieceEditPopover.tsx`
- Create: `src/components/concert-program/EditableText.tsx`
- Test: `src/components/concert-program/__tests__/fastEntry.test.tsx`

**Interfaces:**
- `EditableText`: `{ value: string; placeholder?: string; onCommit: (v: string) => void; className?: string; multiline?: boolean; inputRef?: (el: HTMLElement | null) => void; onKeyDownCapture?: (e: React.KeyboardEvent) => void }` — renders the text styled EXACTLY as print (same element/classes) with a screen-only hover outline (`@media screen` rules in the page's local `<style>` or Tailwind `hover:outline` classes — outlines must not print, so keep them behind `.cp-screen-*` classes that `concert-program-print.css` kills). Implementation: `contentEditable` span, commit on blur; Enter commits (blur) unless `multiline`/shift (verbatim keyboard pattern from `WorshipAidSheets.tsx` `Editable`, L120-131, including Escape-reverts and the `readText` `<br>`→`\n` helper).
- Desktop (lg+): every printed text is click-to-edit in place. Below lg (`useIsMobile()` — 1024px): taps open `PieceEditPopover` instead; `EditableText` gets `contentEditable={false}` and an onClick that calls `openPieceEditor` (spec: no scaled carets).

**Wiring (all through `useConcertProgramDoc` ops):**
- Title block: program `title` / `subtitle` / conductor / accompanist / venue / event_date — `EditableText` per field committing via the header-debounce state (`event_date` uses a date `<input type="date">` popover, not contentEditable).
- Piece line: `title` and composer-credit are separate `EditableText`s; committing composer text writes `composer` (leave `arranger` editing to the popover — the printed credit is derived, so the inline composer editor shows ONLY `piece.composer` while a `+ arranger` ghost chip sits alongside when arranger is null).
- **Ghost chips** (spec "Publish blockers are fixable from the page"): when a piece is SELECTED (`selectedPieceId`), render screen-only chips under its line: `+ arranger`, `+ voicing`, `+ soloists` (only the empty ones) and a rights chip — `rights_status ?? 'unknown'` shown amber when unknown. Every chip opens `PieceEditPopover` focused on that field.
- `PieceEditPopover` (Radix Popover anchored to the piece line; on phones it's a Dialog): all piece fields — title, composer, arranger, voicing, soloists, program_notes, duration (mm:ss text input parsed to seconds), `rights_status` Select (`unknown | public_domain | licensed` labeled "Unknown / Public domain / Licensed"), `copyright_info` (shown when licensed). Commits via `updatePiece` with the old editor's 700 ms debounce semantics (buffer local, diff, never send blank title). Up/down reorder buttons (call `setBlocks` with the id moved within/between groups — the mobile reorder path) + Delete button → `deletePieceWithUndo`.
- **Fast entry** (spec — load-bearing): inside a group, piece-title `EditableText` gets `onKeyDownCapture`: Enter (no shift) → commit current, then `addPieceToGroup(groupId, indexAfterThisPiece)` and focus the NEW piece's title editor (via `pieceRefs` registration + `requestAnimationFrame` retry until the node exists, max ~10 frames). Tab from title → focus composer editor of the same piece (natural DOM order — verify, else explicit). Enter in composer → focus NEXT piece's title, creating one at group end if at the last piece. Each group renders an inline ghost `+ piece` row at its end (screen-only) → `addPieceToGroup(groupId, 'end')` + focus.
- Group `sectionHeading` and `creditLine`: `EditableText` (empty heading commits as null); a selected group shows ghost chips `+ section heading` / `+ credit line` when null.
- Text blocks: `EditableText multiline`; divider: no editing; footer: venue/date edit in place (same header fields).

- [ ] **Step 1: Failing tests** (`fastEntry.test.tsx`, jsdom): mock `useConcertProgramDoc` (vi.hoisted); render the editor page (MemoryRouter). Tests: (a) Enter in a piece title editor calls `addPieceToGroup(groupId, index)` with the index right after that piece; (b) the rights ghost chip renders for a selected piece with `rights_status: null` and opens the popover (assert popover content appears with the Select); (c) editing a title and blurring calls `updatePiece` with `{ title }` after the debounce (use `vi.useFakeTimers` + `advanceTimersByTime(800)`); (d) Delete in the popover calls `deletePieceWithUndo`.
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implement.** Keep `EditableText` dumb; all state lives in the page/popover.
- [ ] **Step 4: Run, PASS. Typecheck. Commit** `feat(concert-program): in-place editing, fast entry, piece popover with rights`.

---

### Task 10: Block operations — add/reorder/roster panel

**Files:**
- Modify: `src/pages/dashboard/ConcertPlannerEditorPage.tsx`
- Create: `src/components/concert-program/RosterPanel.tsx`
- Modify: `src/components/concertPlanner/RosterEditor.tsx` (bulk paste)
- Test: `src/components/concert-program/__tests__/blockOps.test.tsx`, extend `src/components/concertPlanner/__tests__/RosterEditor.paste.test.tsx`

**Behaviors:**
- Rail **Add** buttons: text → insert `{ kind: 'text', text: '', align: 'center' }` before footer + focus it; divider → same; roster → insert before footer, but disabled (with hint) when a roster block already exists; piece → `addPieceToGroup(lastGroupId, 'end')`, creating a group before the footer first when none exists (reconcile guarantees one, so just use the last).
- **Block reorder:** dnd-kit on WHOLE blocks (desktop pointer only, spec): `DndContext` + `SortableContext` over block ids with the sensors pattern from the old editor (`PointerSensor` distance 6 — omit TouchSensor deliberately; below-lg reorder uses popover up/down buttons on each block). `onDragEnd` → `arrayMove` → `persistBlocksNow` (immediate, not debounced — drag is a discrete gesture). Title stays first and footer last: clamp drops into `[1, blocks.length - 1)`.
- **Piece drag within/between groups** (desktop): a second `DndContext` scope over piece ids inside groups; on drop, rebuild the affected groups' `pieceIds` and `persistBlocksNow`. (`sort_order` mirroring is automatic — single writer.)
- Screen-only drag handles + "insert here" affordances between blocks (`.cp-screen-handle` etc., killed in print CSS).
- **RosterPanel:** the roster block on the page is click-to-open (popover on lg+, Dialog below) hosting the EXISTING `RosterEditor` (`concert={docCompatibleObject}` — it consumes `roster/addRosterSection/addRosterMember/...`, all available via `rosterOps` + `roster`; adapt the prop shape: `RosterEditor` takes `ReturnType<typeof useConcertProgram>` — pass the underlying hook object through `useConcertProgramDoc` (add a `legacyConcert` passthrough field) rather than reshaping).
- **Bulk paste** (spec "Roster entry keeps its fast path"): in `RosterEditor`'s member input, `onPaste`: if clipboard text contains `\n`, `preventDefault()`, split on newlines, trim, drop empties, `addRosterMember` for each in order. Test: `fireEvent.paste(input, { clipboardData: { getData: () => 'Amara\nBrianna\n\nCorinne' } })` → three `onAddMember`-equivalent mutations.

- [ ] **Step 1: Failing tests:** (a) rail "Add text block" inserts before footer (assert `setBlocks`/`persistBlocksNow` mock called with kinds `[...,'text','footer']`); (b) "Add roster" disabled when a roster block exists; (c) RosterEditor bulk paste (above).
- [ ] **Step 2: Run, FAIL. Step 3: Implement. Step 4: PASS, typecheck, commit** `feat(concert-program): block ops, drag reorder, roster panel with bulk paste`.

---

### Task 11: Library picker + Setlist import

**Files:**
- Create: `src/components/concert-program/LibraryPickerDialog.tsx`
- Create: `src/components/concert-program/SetlistImportDialog.tsx`
- Test: `src/components/concert-program/__tests__/libraryAndSetlist.test.tsx`

**Interfaces:**
- `LibraryPickerDialog`: `{ open: boolean; onOpenChange(o: boolean): void; onPick(fields: { title: string; composer: string | null; voicing: string | null; sheet_music_id: string | null }): void }`
- `SetlistImportDialog`: `{ open: boolean; onOpenChange(o: boolean): void; onImport(result: { pieces: Array<Partial<ConcertProgramPiece>>; setlistId: string }): void }` — the DIALOG only fetches and maps; the page performs the writes (batch insert + group append) so atomicity lives with the doc hook.

**Queries (verified shapes):**
- Scores tab: `supabase.from('gw_sheet_music_browse').select('id, title, composer, voicing').or(\`title.ilike.%${q}%,composer.ilike.%${q}%\`).order('title').limit(50)` (view is authenticated-only — fine, the editor is authed). Picks set `sheet_music_id: row.id`.
- My Music tab: `supabase.from('gw_personal_scores').select('id, title, composer, voicing').or(...same...).order('title').limit(50)` — picks set `sheet_music_id: null` (spec: personal picks leave it null; the FK targets `gw_sheet_music`).
- Setlists: `supabase.from('gw_setlists').select('id, title, concert_name, event_date').order('created_at', { ascending: false }).limit(50)`; items: `supabase.from('gw_setlist_items').select('music_id, order_index, score:gw_sheet_music(title, composer, voicing)').eq('setlist_id', id).order('order_index')` (embed pattern from `useViewerSetlists.ts:67-70`). Map → `{ title: score.title, composer: score.composer, voicing: score.voicing, sheet_music_id: music_id }`.

**Page-side import handler (spec: one-time copy; never a half-imported group):**

```ts
const handleSetlistImport = async ({ pieces: rows, setlistId }: ImportResult) => {
  if (!blocks || !id) return;
  const base = flattenPieceOrder(blocks).length;
  const { data, error } = await supabase
    .from('gw_concert_program_pieces')
    .insert(rows.map((r, i) => ({ program_id: id, sort_order: base + i, title: r.title ?? 'Untitled', composer: r.composer ?? null, voicing: r.voicing ?? null, sheet_music_id: r.sheet_music_id ?? null })))
    .select('id');
  if (error || !data || data.length !== rows.length) { toast.error('Import failed — nothing was added'); return; }
  const group: PieceGroupBlock = { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: data.map((d: { id: string }) => d.id), creditLine: null };
  const footerIdx = blocks.findIndex((b) => b.kind === 'footer');
  const next = blocks.slice(); next.splice(footerIdx === -1 ? next.length : footerIdx, 0, group);
  const ok = await persistBlocksNow(next);
  if (ok) updateProgram.mutate({ setlist_id: setlistId } as any);
  else await supabase.from('gw_concert_program_pieces').delete().in('id', data.map((d: any) => d.id)).select('id');
};
```

Re-import appends a NEW group (this code already does — no sync). Library pick: `onPick` → `addPieceToGroup(lastGroupId, 'end', fields)`. Query failures → sonner error toast, dialog stays open (wrap fetches in try/catch inside the dialogs; on error show inline "Couldn't load — try again").

- [ ] **Step 1: Failing tests:** (a) picker search renders rows from mocked browse query and `onPick` carries `sheet_music_id` for a Scores row and `null` for a My Music row; (b) setlist import maps items in `order_index` order into `onImport`; (c) page import handler: when insert returns fewer rows than sent, NO blocks persist happens and the error toast fires.
- [ ] **Step 2: FAIL. Step 3: Implement (dialogs use shadcn Dialog + Input + Tabs). Step 4: PASS, typecheck, commit** `feat(concert-program): library picker + one-time setlist import`.

---

### Task 12: Publish panel — blockers, approval, real QR

**Files:**
- Create: `src/components/concert-program/PublishPanel.tsx`
- Modify: `src/pages/dashboard/ConcertPlannerEditorPage.tsx` (wire the Publish button + footer QR toggle)
- Test: `src/components/concert-program/__tests__/publish.test.tsx`

**Interfaces:**
- `PublishPanel`: `{ open: boolean; onOpenChange(o: boolean): void; validation: ValidateResult; program: ConcertProgram; onJumpToPiece(pieceId: string): void; onPublish(): Promise<void>; onUnpublish(): Promise<void>; publishing: boolean }`
- Consumes: `validateProgram` (existing, UNCHANGED — `src/lib/concertPlanner/validate.ts`), `slugify` from `@/lib/concertProgram/slug`, `QRCode` from `qrcode`.

**Behaviors (spec "Publish, QR, public page"):**
- Panel (shadcn Dialog) lists `validation.items` grouped by level: `required` first as blockers, then warnings. Items whose id matches `rights-<pieceId>` / `rep-composer-<pieceId>` / `rights-info-<pieceId>` render a "Fix" button → `onJumpToPiece(pieceId)` (page impl: close panel, `pieceRefs.get(pieceId)?.scrollIntoView({ block: 'center' })` — feature-detect scrollIntoView for jsdom — set `selectedPieceId`, open the piece popover). Aggregate line style: "3 pieces missing rights status".
- Approval checkbox (verbatim copy from old editor): "I've reviewed every piece's composer, arranger, rights status, and the roster." `canPublish = !validation.hasRequiredFixes && hasApproval` — logic unchanged.
- `onPublish` (page): slug scheme unchanged — `program.published_slug ?? slugify(program.title) + '-' + program.id.slice(0, 6)`; `updateProgram.mutateAsync({ published_at, published_by, published_slug })` (verbatim from old editor L208-226, now with `toast.error` on failure). On success, the panel swaps to the published state: real QR via

```ts
const publicUrl = `${window.location.origin}/program/${slug}`;
const dataUrl = await QRCode.toDataURL(publicUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
```

  shown with a Download link (`<a href={dataUrl} download="program-qr.png">`), Copy-URL button (`navigator.clipboard.writeText`), and Unpublish (confirm → null published_at/published_by, KEEP slug — unchanged semantics).
- **QR in footer** (spec): a Switch in the panel bound to the footer block's `showQr` (`setBlocks` patching the footer block). Disabled with hint "Publish first — an unpublished QR would encode a dead URL" when `!program.published_at`. The editor page computes `qrDataUrl` (same `QRCode.toDataURL`, memoized on slug) and passes it into `RenderCtx` ONLY when `published_at && footer.showQr` — so the paper shows the QR exactly when it will print.

- [ ] **Step 1: Failing tests:** (a) required blockers render with Fix buttons and clicking one calls `onJumpToPiece('p2')` (feed a validation result built by the REAL `validateProgram` over fixture pieces with one NULL rights_status); (b) Publish button disabled until the approval checkbox is checked AND no required items; (c) after mocked publish resolves, the QR `<img>` renders with a data: src (mock `qrcode`'s `toDataURL` via `vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,x') } }))`); (d) the footer-QR switch is disabled when unpublished.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS, typecheck, commit** `feat(concert-program): publish panel with fixable blockers + real QR`.

---

### Task 13: Print / Save-PDF overlay

**Files:**
- Create: `src/components/concert-program/ConcertProgramPrintView.tsx`
- Create: `src/styles/concert-program-print.css`
- Modify: `src/pages/dashboard/ConcertPlannerEditorPage.tsx` (Print button opens it; zero-pieces prompt)
- Test: `src/components/concert-program/__tests__/printView.test.tsx`

**Interfaces:**
- `ConcertProgramPrintView`: `{ pages: PageItem[][]; ctx: RenderCtx; design: PrintDesign; format: ProgramFormat; onClose(): void }`

**Mechanism (PrintPaperView pattern, adapted):**
- `createPortal` to `document.body` (sibling of `#root`); body class **`printing-program`**; Escape closes; `@page` style injected on mount / removed on unmount:

```ts
useEffect(() => {
  const el = document.createElement('style');
  el.textContent = format === 'half-fold'
    ? '@page { size: 11in 8.5in; margin: 0; }'
    : '@page { size: 8.5in 11in; margin: 0; }';
  document.head.appendChild(el);
  return () => el.remove();
}, [format]);
```

- Toolbar (`.no-print`): the checklist line — letter: **"In the print dialog: 100% scale (no fit-to-page), margins None. Save as PDF here = the PDF export."**; half-fold adds **"double-sided, flip on short edge"** — plus Print and Close buttons. Print handler awaits fonts first (spec):

```ts
const handlePrint = async () => {
  if ('fonts' in document) { try { await (document as any).fonts.ready; } catch { /* print anyway */ } }
  window.print();
};
```

- Letter body: `pages.map` → `.cp-sheet` at `8.5in × 11in`, padding `0.75in`, `page-break-after: always` (last: auto).
- Half-fold body: `pages` here are PANELS (the editor paginated at panel size); `imposeHalfFold(pages.length)` → each `ImposedSheet` renders TWO `.cp-print-sheet`s (front, back), each `11in × 8.5in`, `display: flex`; each half is a `5.5in × 8.5in` panel container with `0.5in` padding rendering `pages[idx]` or blank when `idx >= pages.length`; a dashed fold line at `left: 5.5in` (screen only).
- `src/styles/concert-program-print.css` (imported ONLY by `ConcertProgramPrintView`):

```css
.cp-print-overlay { position: fixed; inset: 0; z-index: 50; overflow-y: auto; background: hsl(var(--muted)); }
@media screen {
  .cp-print-overlay .cp-sheet, .cp-print-overlay .cp-print-sheet { box-shadow: 0 1px 12px rgba(0,0,0,0.18); margin: 0 auto 1rem; }
}
@media print {
  .no-print { display: none !important; }
  body.printing-program #root { display: none; }
  .cp-print-overlay { position: static; background: #fff; overflow: visible; }
  .cp-print-overlay .cp-sheet, .cp-print-overlay .cp-print-sheet { box-shadow: none; margin: 0; page-break-after: always; break-after: page; }
  .cp-print-overlay .cp-sheet:last-child, .cp-print-overlay .cp-print-sheet:last-child { page-break-after: auto; break-after: auto; }
  /* index.css appends " (url)" after every link when printing. */
  .cp-print-overlay a[href]::after { content: none !important; }
}
```

- Page wiring: Print button → if `flattenPieceOrder(blocks).length === 0` first `confirm('This program has no pieces — print anyway?')` (spec) → render overlay with the CURRENT pages/ctx/design/format. Half-fold rail Format control shows the panel-count line (Task 8) — verify it matches `imposeHalfFold` blanks: `blanks = paddedPanelCount(n) - n`.

- [ ] **Step 1: Failing tests** (jsdom): (a) letter overlay renders N `.cp-sheet`s and injects a `<style>` containing `size: 8.5in 11in` into head (query `document.head.querySelectorAll('style')` text) and removes it on unmount; (b) half-fold with 4 panels renders 1 sheet × 2 sides in imposed order (assert panel content placement via test ids `data-panel-idx`); (c) body gets/loses `printing-program`; (d) blank panels render for 6 real panels.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS, typecheck, commit** `feat(concert-program): true-paper print overlay with half-fold imposition`.

---

### Task 14: Public page + list page + retirement of the card editor

**Files:**
- Rewrite: `src/pages/public/PublicConcertProgramPage.tsx`
- Modify: `src/pages/dashboard/ConcertPlannerPage.tsx`
- Delete: `src/lib/concertPlanner/cards.ts`, `src/lib/concertPlanner/themes.ts`
- Modify: `src/lib/concertPlanner/index.ts` (drop deleted re-exports), `src/lib/concertPlanner/types.ts` (drop `VisualTheme`, `ProgramCardLayout`, `CardKind`, `ProgramCard` IF nothing else imports them — grep first; keep `RightsStatus`, validation types, roster types)
- Test: `src/pages/public/__tests__/PublicConcertProgramPage.test.tsx`

**Public page (spec "Publish, QR, public page"):**
- Fetch logic unchanged (slug → program → pieces + roster, anon RLS does the gating).
- Render: `blocks = program.blocks?.length ? reconcileBlocks(program.blocks, pieces).blocks : deriveDefaultBlocks(program, pieces, roster)` — DERIVE IN MEMORY, never write (anon can't). Single phone-friendly column: `<div className="cp-page cp-design-classic-1943" style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem 1rem', background: '#fff' }}>` rendering `blocksToUnits` → `PageItemView` items directly (NO pagination, NO fake paper). classic-1943 typography tokens regardless of print_design (spec). Keep `PublicLayout` wrapper. Legacy `notes` renders via the derived text block. No QR on the public page itself (`qrDataUrl: null`).
- **List page:** replace `CreateProgramDialog`'s 4 template tiles with: title input + optional "Start from a setlist" Select (fetch `gw_setlists` id/title/concert_name, newest first, "None" default). Create → `createConcertProgram({ title, setlist_id })` (template_kind keeps its DB default — do NOT send it) → navigate to the editor, which (first-open effect) derives default blocks; when `setlist_id` is set and the program has zero pieces, the editor ALSO auto-runs the Task-11 import handler once (guard ref) so the dialog stays one step (spec "New-program flow"). Card list itself stays (title/date/venue), delete keeps its confirm.
- **Retire (spec "The card editor … retire"):** delete `cards.ts` + `themes.ts`; grep for remaining importers (`transformProgramToCards`, `themeStyles`, `printFormatStyles`, `THEME_OPTIONS`, `VisualTheme`) — after the public-page rewrite the only importers were the old editor (rewritten Task 8) and the public page; fix any straggler. `validate.ts` and `RosterEditor` stay. The `concert-card-regen` edge function stays deployed but has no caller (note in PR body).

- [ ] **Step 1: Failing test:** public page with `blocks: []` (legacy program) and 2 pieces renders both piece titles and the notes text (derive fallback); with a populated `blocks` renders group heading + credit line. Mock supabase queries via `vi.hoisted` chain returning fixtures.
- [ ] **Step 2: FAIL. Step 3: Implement + delete + fix imports. Step 4: `npx vitest run src/lib/assistant/__tests__/clientActions.test.ts` (route guard must still pass), typecheck:guard, commit** `feat(concert-program): block-based public page + setlist-aware create; retire card editor`.

---

### Task 15: Full-suite verification

**Files:** none new.

- [ ] **Step 1:** `npm test` — full suite green (fix anything the rewrite broke; expected suspects: tests importing deleted `cards.ts`/`themes.ts` symbols — update or delete alongside their subjects).
- [ ] **Step 2:** `npm run typecheck:guard` — no new errors vs baseline.
- [ ] **Step 3:** `npm run lint` — clean on all new/modified files.
- [ ] **Step 4:** `npm run build` — production build succeeds (catches chunking/imports).
- [ ] **Step 5:** Manual smoke in dev (`npm run dev`, any signed-in tenant): create program → type 3 pieces via Enter/Tab only → drag a piece → add divider + text → switch design ×3 → switch to half-fold (panel count line updates) → open Print overlay (sheets look right, checklist shows) → fix rights via ghost chips → approve → publish → QR renders → open `/program/<slug>` → unpublish.
- [ ] **Step 6: Commit** any fixes; `git push -u origin concert-program-rebuild-impl`.

### Task 16: PR, migration, deploy

- [ ] **Step 1:** Open the PR: base `main`, head `concert-program-rebuild-impl`, title `Concert Planner rebuild: true-paper 8.5×11 + half-fold programs`. Body: spec+plan links, the retire list, the `concert-card-regen` orphan note, screenshots of all 3 designs. End body with the standard attribution.
- [ ] **Step 2:** Review pass (superpowers:requesting-code-review), fix findings, merge.
- [ ] **Step 3:** **Apply the migration BEFORE deploying the frontend** (old frontend tolerates the new columns; new frontend needs them):

```bash
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -d postgres" < supabase/migrations/20260817200000_concert_program_rebuild.sql
# verify:
ssh root@198.211.113.144 "docker exec supabase-db psql -U supabase_admin -d postgres -c \"\\d gw_concert_programs\" | grep -E 'print_design|blocks|print_format'"
```

- [ ] **Step 4:** From a fresh main checkout: `bash scripts/deploy-frontend.sh` (script verifies live hash + CACHE_VERSION itself). Never add `--delete` to rsync.
- [ ] **Step 5:** Live verify: `/dashboard/concert-planner` on the demo tenant renders the new editor; Kevin's "Fall Concert" (tenant `kevin`) opens with its 5 pieces derived into a group; `/program/:slug` for the demo "Spring Choir Concert" (if published) still renders.

### Task 17: Visual gate + manual QA (Kevin)

- [ ] **Step 1:** Render a `classic-1943` sample page from Fall Concert; screenshot next to the 1943 McMurry model; present to Kevin — the feature is not "done" until he approves the look (spec "Visual gate").
- [ ] **Step 2:** Hand Kevin the manual QA list (spec "Testing"): print from Chrome AND Safari to paper + PDF at 100% scale; half-fold duplex on a real printer with flip-on-short-edge (this validates the imposition assumption — if his printer flips differently, flip `FlipMode`, don't rewrite); public page on a phone.

## Self-review notes (spec coverage)

- Every spec section maps: block model (T1/T2), designs (T5), geometry+pagination+imposition (T3/T4/T6/T13), editor+fast entry+popovers+undo+roster (T8-T10), library/setlist (T11), publish/QR/public (T12/T14), data model (T1/T16), error handling (T3 oversized → T8 chip; T11 rollback; T13 zero-piece prompt + panel padding), testing (per-task + T15), out-of-scope respected (no trifold/qr-lobby/AI regen/roster-import/RLS changes).
- Concurrent editing stays last-write-wins (spec: stated limit) — nothing in this plan pretends otherwise.
- `duration_seconds` never prints (T5 test) but feeds the rail badge (T8).
