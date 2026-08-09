# Worship Aid Two-Pane Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the worship aid stay on screen while it is edited, by replacing the single scrolling column with a control rail beside a pinned sheet stage.

**Architecture:** The sheet DOM is untouched — `WorshipAidSheets` keeps rendering both 11×8.5in sheets exactly as today, because print and the archived PDF both consume that DOM. Focusing one panel is a screen-only presentation layer: a `data-aid-view` attribute on a wrapper drives CSS that hides the other panels and scales the focused one, reset under `@media print` and swapped off around the html2canvas capture.

**Tech Stack:** React 18, TypeScript, Tailwind, shadcn/Radix (`Sheet` for the mobile drawer), Vitest + @testing-library/react (jsdom), html2canvas + jsPDF (existing, in `src/lib/liturgy/worshipAidPdf.ts`).

## Global Constraints

- **Print output must not change.** All focus/scale CSS is screen-only and reset under `@media print`. The existing `@media print` block in `WorshipAidSheets.tsx` (lines 479–521) must not be edited.
- **Archived PDF output must not change.** `worshipAidToPdf(sheetsRef.current)` runs html2canvas over every `.worship-aid-sheet` inside the ref. html2canvas is sensitive to `display: none` and CSS transforms, so capture must run with the focus layer off.
- **No data-model change.** `src/lib/liturgy/worshipAid.ts`, `aidEdits.ts`, and `flow.ts` are not modified. No migration.
- **`PanelId` is `'front' | 'insideLeft' | 'insideRight' | 'back'`** (`src/lib/liturgy/worshipAid.ts:24`). Do not redefine it.
- Repo test command: `npx vitest run <path>`. Type gate: `npm run typecheck:guard` (must report only pre-existing errors).
- Component tests need `// @vitest-environment jsdom` as the first line — the vitest default environment is `node` (`vitest.config.ts:14`).
- Commit after every task. Never use `rsync --delete` or edit `.typecheck-baseline.txt`.

---

### Task 1: Make each panel addressable in the DOM

The sheets render four panels across two `.worship-aid-sheet` divs, but nothing distinguishes one panel from another in the DOM, so no CSS can target "just inside-left". Add a `data-panel` attribute to each. This is a non-visual attribute: it changes no layout, so print and html2canvas are unaffected.

**Files:**
- Modify: `src/components/liturgy/WorshipAidSheets.tsx:530-556`
- Test: `src/components/liturgy/__tests__/worshipAidPanels.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: DOM contract `[data-panel="front" | "insideLeft" | "insideRight" | "back"]`, one element per panel, each a direct child of a `.worship-aid-sheet`. Tasks 3 and 5 depend on these exact strings.

- [ ] **Step 1: Write the failing test**

Create `src/components/liturgy/__tests__/worshipAidPanels.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { WorshipAidSheets } from '../WorshipAidSheets';
import { DEFAULT_SETTINGS } from '@/lib/liturgy/worshipAid';
import type { WorshipAid } from '@/lib/liturgy/worshipAid';

afterEach(cleanup);

/** Minimal aid: the panels must exist even when they hold nothing. */
const aid: WorshipAid = {
  title: 'Test Mass',
  subtitle: '',
  sideBand: { day: 'Sunday', date: '9 August 2026' },
  front: [], insideLeft: [], insideRight: [], back: [],
} as unknown as WorshipAid;

describe('WorshipAidSheets panel addressing', () => {
  it('marks every panel with its PanelId', () => {
    const { container } = render(
      <WorshipAidSheets aid={aid} settings={DEFAULT_SETTINGS} />,
    );
    for (const p of ['front', 'insideLeft', 'insideRight', 'back']) {
      expect(container.querySelector(`[data-panel="${p}"]`), p).not.toBeNull();
    }
  });

  it('puts each panel inside a sheet, so focus CSS can hide the sibling', () => {
    const { container } = render(
      <WorshipAidSheets aid={aid} settings={DEFAULT_SETTINGS} />,
    );
    for (const p of ['front', 'insideLeft', 'insideRight', 'back']) {
      const el = container.querySelector(`[data-panel="${p}"]`);
      expect(el?.closest('.worship-aid-sheet'), p).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/liturgy/__tests__/worshipAidPanels.test.tsx`
Expected: FAIL — `expected null not to be null` for `front`.

If it instead fails constructing `aid`, read the real `WorshipAid` type at `src/lib/liturgy/worshipAid.ts` and fill the required fields; do not change the assertions.

- [ ] **Step 3: Add the attributes**

In `WorshipAidSheets.tsx`, the two sheet divs currently read (lines 530–556):

```tsx
      <div className="worship-aid-sheet">
        <BackPanel aid={aid} qrDataUrl={qrDataUrl}>
          {renderPage('back')}
        </BackPanel>
        <FrontPanel
          aid={aid}
          titleSize={coverTitleSize(settings)}
          imageScale={coverImageScale(settings)}
        />
        <div className="worship-aid-fold" aria-hidden />
      </div>

      <div className="worship-aid-sheet">
        <Panel>
          {renderPage('insideLeft')}
        </Panel>
        <Panel style={{ paddingRight: '0.80in' }}>
          {renderPage('insideRight')}
          <SideBand day={aid.sideBand.day} date={aid.sideBand.date} />
        </Panel>
        <div className="worship-aid-fold" aria-hidden />
      </div>
```

Wrap each panel so the attribute sits on an element that is a direct child of the sheet. `BackPanel`, `FrontPanel` and `Panel` may not forward unknown props, so wrap rather than pass through — a wrapper with `display: contents` would collapse the flex layout, so the wrapper must instead BE the flex child. The least invasive change is to add the attribute to the existing components' root elements. Inspect `Panel`, `FrontPanel` and `BackPanel` in this same file and add a `dataPanel` prop to each:

```tsx
function Panel({ children, style, dataPanel }: {
  children: ReactNode; style?: CSSProperties; dataPanel: PanelId;
}) {
  // ...existing body, with the attribute on the root element:
  // <div className="..." style={...} data-panel={dataPanel}>
}
```

Then pass it at each call site:

```tsx
        <BackPanel aid={aid} qrDataUrl={qrDataUrl} dataPanel="back">
        <FrontPanel aid={aid} titleSize={...} imageScale={...} dataPanel="front" />
        <Panel dataPanel="insideLeft">
        <Panel style={{ paddingRight: '0.80in' }} dataPanel="insideRight">
```

Do not change any class name, style, or the `@media print` block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/liturgy/__tests__/worshipAidPanels.test.tsx`
Expected: PASS, 2 tests.

Then confirm nothing else regressed:
Run: `npx vitest run src/lib/liturgy/`
Expected: PASS (worshipAid, aidEdits, flow, psalmComposer suites).

- [ ] **Step 5: Commit**

```bash
git add src/components/liturgy/WorshipAidSheets.tsx src/components/liturgy/__tests__/worshipAidPanels.test.tsx
git commit -m "feat(liturgy): mark worship aid panels with data-panel

Non-visual DOM attribute so screen-only CSS can isolate a single panel.
Print and the html2canvas capture are unaffected: no layout changes."
```

---

### Task 2: The view-swap helper that protects the PDF

The archived PDF is the thing most likely to break silently. Isolate the swap into a pure, tested helper rather than inlining it in the page.

**Files:**
- Create: `src/components/liturgy/aid-editor/aidView.ts`
- Test: `src/components/liturgy/aid-editor/__tests__/aidView.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type AidView = 'focus' | 'full'`
  - `const AID_VIEW_ATTR = 'data-aid-view'`
  - `async function withFullView<T>(el: HTMLElement | null, fn: () => Promise<T>): Promise<T>` — sets the attribute to `'full'`, yields two animation frames so layout settles, runs `fn`, and restores the previous attribute value in a `finally`. Task 5 calls this from `fileToLibrary`.
  - `const PANEL_LABEL: Record<PanelId, string>` — `front: 'Cover'`, `insideLeft: 'Inside left'`, `insideRight: 'Inside right'`, `back: 'Back'`. The single copy. Tasks 3, 4 and 5 import it; none redeclares it. `WorshipAidPage.tsx:44` currently declares its own — Task 5 deletes that one and imports this instead.

- [ ] **Step 1: Write the failing test**

Create `src/components/liturgy/aid-editor/__tests__/aidView.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { withFullView, AID_VIEW_ATTR } from '../aidView';

describe('withFullView', () => {
  it('shows the full sheet while the callback runs', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    let seen: string | null = null;
    await withFullView(el, async () => { seen = el.getAttribute(AID_VIEW_ATTR); });
    expect(seen).toBe('full');
  });

  it('restores the previous view afterwards', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    await withFullView(el, async () => {});
    expect(el.getAttribute(AID_VIEW_ATTR)).toBe('focus');
  });

  it('restores even when the capture throws — a failed PDF must not strand the editor', async () => {
    const el = document.createElement('div');
    el.setAttribute(AID_VIEW_ATTR, 'focus');
    await expect(
      withFullView(el, async () => { throw new Error('html2canvas blew up'); }),
    ).rejects.toThrow('html2canvas blew up');
    expect(el.getAttribute(AID_VIEW_ATTR)).toBe('focus');
  });

  it('returns the callback result', async () => {
    const el = document.createElement('div');
    expect(await withFullView(el, async () => 42)).toBe(42);
  });

  it('still runs the callback when there is no element', async () => {
    const fn = vi.fn(async () => 'ok');
    expect(await withFullView(null, fn)).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/aidView.test.ts`
Expected: FAIL — cannot resolve `../aidView`.

- [ ] **Step 3: Write the implementation**

Create `src/components/liturgy/aid-editor/aidView.ts`:

```ts
import type { PanelId } from '@/lib/liturgy/worshipAid';

/**
 * Which view of the sheets the screen is showing.
 *
 * 'focus' shows one panel, scaled up, for editing. 'full' is what the sheets
 * render natively: both 11x8.5in sheets at exact size.
 */
export type AidView = 'focus' | 'full';

/** Attribute the stage wrapper carries; screen-only CSS keys off it. */
export const AID_VIEW_ATTR = 'data-aid-view';

/** The one copy. Rail, stage and page all import this. */
export const PANEL_LABEL: Record<PanelId, string> = {
  front: 'Cover',
  insideLeft: 'Inside left',
  insideRight: 'Inside right',
  back: 'Back',
};

/** Two frames: one to apply the attribute, one for layout to settle under it. */
function nextFrames(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') { resolve(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Run `fn` with the sheets in their full, unscaled, un-hidden state.
 *
 * The archived PDF is produced by html2canvas walking every
 * `.worship-aid-sheet` in the DOM. Focus mode hides three of the four panels
 * and scales what is left, and html2canvas honours both — so capturing while
 * focused would file a PDF missing most of the program. Nobody would notice
 * until they opened the archive a year later.
 *
 * Restores in a `finally`, so a capture that throws cannot leave the editor
 * stuck showing the full sheet.
 */
export async function withFullView<T>(
  el: HTMLElement | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!el) return fn();
  const previous = el.getAttribute(AID_VIEW_ATTR);
  el.setAttribute(AID_VIEW_ATTR, 'full');
  try {
    await nextFrames();
    return await fn();
  } finally {
    if (previous === null) el.removeAttribute(AID_VIEW_ATTR);
    else el.setAttribute(AID_VIEW_ATTR, previous);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/aidView.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/liturgy/aid-editor/aidView.ts src/components/liturgy/aid-editor/__tests__/aidView.test.ts
git commit -m "feat(liturgy): add withFullView, the guard around the PDF capture

Focus mode hides three panels and scales the fourth; html2canvas honours
both, so capturing while focused would file a PDF missing most of the
program. Restores in a finally so a failed capture cannot strand the view."
```

---

### Task 3: The sheet stage

**Files:**
- Create: `src/components/liturgy/aid-editor/AidStage.tsx`
- Test: `src/components/liturgy/aid-editor/__tests__/AidStage.test.tsx`

**Interfaces:**
- Consumes: `AID_VIEW_ATTR` from Task 2; `[data-panel]` from Task 1.
- Produces:

```tsx
export interface AidStageProps {
  focusPanel: PanelId;
  view: AidView;
  overflowLines: number;
  dropped: number;
  /** The sheets element, forwarded so the page can hand it to worshipAidToPdf. */
  sheetsRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;   // <WorshipAidSheets ... />
}
export function AidStage(props: AidStageProps): JSX.Element
```

Task 5 renders `<AidStage>` wrapping the existing `<WorshipAidSheets>` element unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/components/liturgy/aid-editor/__tests__/AidStage.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { AidStage } from '../AidStage';
import { AID_VIEW_ATTR } from '../aidView';

afterEach(cleanup);

describe('AidStage', () => {
  it('carries the view attribute and the focused panel, so CSS can isolate it', () => {
    const { container } = render(
      <AidStage focusPanel="insideLeft" view="focus" overflowLines={0} dropped={0}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div className="worship-aid-sheets" />
      </AidStage>,
    );
    const wrap = container.querySelector(`[${AID_VIEW_ATTR}]`);
    expect(wrap?.getAttribute(AID_VIEW_ATTR)).toBe('focus');
    expect(wrap?.getAttribute('data-aid-focus')).toBe('insideLeft');
  });

  it('reports overflow next to the sheet, where it can be acted on', () => {
    const { getByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={3} dropped={1}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(getByText(/3 lines over/i)).toBeTruthy();
    expect(getByText(/1 dropped/i)).toBeTruthy();
  });

  it('says nothing when everything fits', () => {
    const { queryByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={0} dropped={0}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(queryByText(/lines over/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/AidStage.test.tsx`
Expected: FAIL — cannot resolve `../AidStage`.

- [ ] **Step 3: Write the implementation**

Create `src/components/liturgy/aid-editor/AidStage.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { PanelId } from '@/lib/liturgy/worshipAid';
import { AID_VIEW_ATTR, PANEL_LABEL, type AidView } from './aidView';

/** A single panel is half of an 11in sheet. */
const PANEL_WIDTH_IN = 5.5;
/** Browsers lay out CSS inches at 96px regardless of the real display. */
const PX_PER_IN = 96;

export interface AidStageProps {
  focusPanel: PanelId;
  view: AidView;
  overflowLines: number;
  dropped: number;
  sheetsRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}

/**
 * The right-hand pane: the sheet, held still while the rail is used.
 *
 * Scaling is a CSS custom property rather than a width, because the sheets
 * are laid out in real inches on purpose — a folded document whose preview
 * disagrees with the print is worse than no preview. Scale transforms the
 * rendered result; it never re-flows it.
 */
export function AidStage({
  focusPanel, view, overflowLines, dropped, sheetsRef, children,
}: AidStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      // 32px of breathing room so the sheet never touches the pane edges.
      const available = el.clientWidth - 32;
      const natural = PANEL_WIDTH_IN * PX_PER_IN;
      setScale(available > 0 ? Math.min(available / natural, 1.6) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasOverflow = overflowLines > 0 || dropped > 0;

  return (
    <div ref={stageRef} className="flex h-full min-w-0 flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur print:hidden">
        <span className="text-sm font-semibold">{PANEL_LABEL[focusPanel]}</span>
        {hasOverflow && (
          <span className="text-xs font-medium text-destructive">
            {overflowLines > 0 && `${overflowLines} lines over`}
            {overflowLines > 0 && dropped > 0 && ' · '}
            {dropped > 0 && `${dropped} dropped`}
          </span>
        )}
      </div>

      <div
        className="aid-stage-scroll min-h-0 flex-1 overflow-auto p-4"
        {...{ [AID_VIEW_ATTR]: view }}
        data-aid-focus={focusPanel}
        style={{ ['--aid-scale' as string]: String(scale) }}
      >
        <div ref={sheetsRef}>{children}</div>
      </div>

      <style>{`
        @media screen {
          /* Focus: show only the sheet holding the focused panel, only that
             panel within it, and scale the result to the pane.
             Everything here is screen-only — print resets in the sheets'
             own @media print block, which this must never duplicate. */
          [${AID_VIEW_ATTR}="focus"] .worship-aid-sheet { display: none; }
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="front"] .worship-aid-sheet:has([data-panel="front"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="back"] .worship-aid-sheet:has([data-panel="back"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideLeft"] .worship-aid-sheet:has([data-panel="insideLeft"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideRight"] .worship-aid-sheet:has([data-panel="insideRight"]) {
            display: flex;
            width: ${PANEL_WIDTH_IN}in;
            transform: scale(var(--aid-scale, 1));
            transform-origin: top left;
            margin: 0;
          }
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="front"] [data-panel]:not([data-panel="front"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="back"] [data-panel]:not([data-panel="back"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideLeft"] [data-panel]:not([data-panel="insideLeft"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideRight"] [data-panel]:not([data-panel="insideRight"]) {
            display: none;
          }
          /* The fold guide means nothing with one panel showing. */
          [${AID_VIEW_ATTR}="focus"] .worship-aid-fold { display: none; }
        }
        @media print {
          /* Belt and braces: the sheets' own print block already resets the
             editing affordances, but the focus rules above must not survive
             into print under any circumstance. */
          [${AID_VIEW_ATTR}] .worship-aid-sheet { display: flex !important; width: auto !important; transform: none !important; }
          [${AID_VIEW_ATTR}] [data-panel] { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/AidStage.test.tsx`
Expected: PASS, 3 tests.

If the ResizeObserver line throws in jsdom, the guard `typeof ResizeObserver === 'undefined'` already covers it; do not stub it in the test.

- [ ] **Step 5: Commit**

```bash
git add src/components/liturgy/aid-editor/AidStage.tsx src/components/liturgy/aid-editor/__tests__/AidStage.test.tsx
git commit -m "feat(liturgy): add AidStage, the pinned sheet pane

Sticky strip carries the panel name and the overflow count, moved off its
own card so it sits beside the sheet it describes. Focus is screen-only
CSS over unchanged sheet DOM; print resets it explicitly."
```

---

### Task 4: The control rail

Move the existing controls into a rail component. The control *bodies* are lifted from `WorshipAidPage.tsx` unchanged — this task is a relocation, not a rewrite. Read lines 376–698 of that file and carry the JSX across verbatim, changing only where values come from (props instead of closures).

**Files:**
- Create: `src/components/liturgy/aid-editor/AidControlRail.tsx`
- Modify: `src/pages/dashboard/WorshipAidPage.tsx` (remove the relocated JSX in Task 5, not here)
- Test: `src/components/liturgy/aid-editor/__tests__/AidControlRail.test.tsx`

**Interfaces:**
- Consumes: `PanelId`; `AidEditsByPanel` from `@/lib/liturgy/aidEdits`; `WorshipAidSettings` from `@/lib/liturgy/worshipAid`.
- Produces:

```tsx
export interface AidControlRailProps {
  panel: PanelId;
  onPanelChange: (p: PanelId) => void;
  settings: WorshipAidSettings;
  onSettingsPatch: (patch: Partial<WorshipAidSettings>) => void;
  /** Rendered as-is under the block list; the page owns block editing. */
  blockList: React.ReactNode;
  /** Rendered inside the collapsed "Phone edition" section. */
  phoneEdition: React.ReactNode;
}
export function AidControlRail(props: AidControlRailProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

Create `src/components/liturgy/aid-editor/__tests__/AidControlRail.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AidControlRail } from '../AidControlRail';
import { DEFAULT_SETTINGS } from '@/lib/liturgy/worshipAid';

afterEach(cleanup);

const base = {
  settings: DEFAULT_SETTINGS,
  onSettingsPatch: () => {},
  blockList: <div data-testid="blocks" />,
  phoneEdition: <div data-testid="phone" />,
};

describe('AidControlRail', () => {
  it('offers all four panels, cover included', () => {
    const { getByRole } = render(
      <AidControlRail {...base} panel="insideLeft" onPanelChange={() => {}} />,
    );
    for (const label of ['Cover', 'Inside left', 'Inside right', 'Back']) {
      expect(getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('reports the panel the user picked', () => {
    const onPanelChange = vi.fn();
    const { getByRole } = render(
      <AidControlRail {...base} panel="insideLeft" onPanelChange={onPanelChange} />,
    );
    fireEvent.click(getByRole('button', { name: 'Back' }));
    expect(onPanelChange).toHaveBeenCalledWith('back');
  });

  it('shows the block list for an interior panel', () => {
    const { getByTestId } = render(
      <AidControlRail {...base} panel="insideRight" onPanelChange={() => {}} />,
    );
    expect(getByTestId('blocks')).toBeTruthy();
  });

  it('replaces the block list with cover fields on the Cover panel', () => {
    // The cover is generated from settings and has no editable block list;
    // showing an empty list there reads as a bug.
    const { queryByTestId, getByLabelText } = render(
      <AidControlRail {...base} panel="front" onPanelChange={() => {}} />,
    );
    expect(queryByTestId('blocks')).toBeNull();
    expect(getByLabelText(/cover title/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/AidControlRail.test.tsx`
Expected: FAIL — cannot resolve `../AidControlRail`.

- [ ] **Step 3: Write the implementation**

Create `src/components/liturgy/aid-editor/AidControlRail.tsx`. Structure:

```tsx
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PanelId, WorshipAidSettings } from '@/lib/liturgy/worshipAid';
import { PANEL_LABEL } from './aidView';

const PANELS: PanelId[] = ['front', 'insideLeft', 'insideRight', 'back'];

/** Collapsed by default; the block list above it is the primary task. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="border-t border-border pt-3">
      <summary className="cursor-pointer select-none text-sm font-semibold">{title}</summary>
      <div className="space-y-3 pt-3">{children}</div>
    </details>
  );
}

export interface AidControlRailProps { /* as declared in Interfaces above */ }

export function AidControlRail({
  panel, onPanelChange, settings, onSettingsPatch, blockList, phoneEdition,
}: AidControlRailProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 print:hidden">
      <div className="flex flex-wrap gap-1.5">
        {PANELS.map((p) => (
          <Button key={p} type="button" size="sm"
            variant={panel === p ? 'default' : 'outline'}
            className="text-xs"
            onClick={() => onPanelChange(p)}>
            {PANEL_LABEL[p]}
          </Button>
        ))}
      </div>

      {panel === 'front' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="aid-title" className="text-xs">Cover title</Label>
            <Input id="aid-title" value={settings.coverTitle}
              onChange={(e) => onSettingsPatch({ coverTitle: e.target.value })}
              placeholder="Your parish or ensemble name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aid-spine" className="text-xs">Spine text (runs up the back cover)</Label>
            <Input id="aid-spine" value={settings.spineText}
              onChange={(e) => onSettingsPatch({ spineText: e.target.value })}
              placeholder="www.yourparish.org" />
          </div>
        </div>
      ) : (
        blockList
      )}

      <Section title="Notices">
        {([
          ['welcomeNotice', 'Welcome notice'],
          ['communionNotice', 'Communion notice'],
          ['sendingNotice', 'Sending notice'],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`aid-${key}`} className="text-xs">{label}</Label>
            <Textarea id={`aid-${key}`} rows={4} value={settings[key]}
              onChange={(e) => onSettingsPatch({ [key]: e.target.value } as Partial<WorshipAidSettings>)} />
          </div>
        ))}
      </Section>

      <Section title="Phone edition">{phoneEdition}</Section>

      <Section title="Printing">
        <p className="text-xs text-muted-foreground">
          One landscape sheet, printed both sides and folded once. In the print dialog choose
          <strong> two-sided, flip on short edge</strong>, paper <strong>11 × 8.5 landscape</strong>,
          and scale <strong>100% / Actual size</strong> — any “fit to page” shifts the fold.
        </p>
      </Section>
    </div>
  );
}
```

The cover-image upload control in `WorshipAidPage.tsx` (the hidden `<input type="file">` and its trigger, around lines 495-514) owns `fileRef` and `uploadTarget`, which must stay on the page. Task 5 passes that control in through the `blockList` prop when `panel === 'front'`, so it appears under the cover fields. This component never imports `fileRef`. That is the decision — do not leave it as a follow-up.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/liturgy/aid-editor/__tests__/AidControlRail.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/liturgy/aid-editor/AidControlRail.tsx src/components/liturgy/aid-editor/__tests__/AidControlRail.test.tsx
git commit -m "feat(liturgy): add AidControlRail

Panel tabs across all four panels, the block list promoted out of
<details>, and the remaining settings collapsed beneath it. Cover has no
block list, so it shows the cover fields in that slot instead."
```

---

### Task 5: Wire the two-pane layout into the page

**Files:**
- Modify: `src/pages/dashboard/WorshipAidPage.tsx` — container (line 351), `editPanel` state (line 72), `fileToLibrary` (lines 247–251), and the control/preview JSX (lines 376–706)

**Interfaces:**
- Consumes: `AidStage`, `AidControlRail`, `withFullView`, `AID_VIEW_ATTR`.
- Produces: no new exports.

- [ ] **Step 1: Widen the panel state and protect the capture**

`editPanel` is typed `PanelId` already (line 72) but is only ever set to the three interior panels. No type change is needed — just confirm `useState<PanelId>('insideLeft')` and that the rail can set `'front'`.

In `fileToLibrary` (line 247), wrap the capture. The `stageViewRef` is the element carrying `AID_VIEW_ATTR`; get it with a ref on the scroll container, or via `sheetsRef.current?.closest('[data-aid-view]')`:

```tsx
      const { blob, pages } = await withFullView(
        sheetsRef.current?.closest<HTMLElement>(`[${AID_VIEW_ATTR}]`) ?? null,
        () => worshipAidToPdf(sheetsRef.current!),
      );
```

- [ ] **Step 2: Replace the page container with the two-pane grid**

Line 351 currently reads:

```tsx
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-2 sm:px-6">
```

Replace the container and body with:

```tsx
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* header row: keep the existing Back button, PageTitle and the
          Save / Save PDF / Print buttons exactly as they are today */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-2 print:hidden sm:px-6">
        {/* ...unchanged header JSX from lines 352-374... */}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,380px)_1fr]">
        <div className="hidden min-h-0 border-r border-border lg:block">
          <AidControlRail
            panel={editPanel}
            onPanelChange={setEditPanel}
            settings={settings}
            onSettingsPatch={patch}
            blockList={blockList}
            phoneEdition={phoneEdition}
          />
        </div>

        <AidStage
          focusPanel={editPanel}
          view="focus"
          overflowLines={flow.overflowLines}
          dropped={flow.dropped}
          sheetsRef={sheetsRef}
        >
          {/* the existing <WorshipAidSheets .../> element, moved here
              with every prop unchanged */}
        </AidStage>
      </div>

      {/* Narrow screens: the rail becomes a drawer. */}
      <div className="border-t border-border p-2 print:hidden lg:hidden">
        <Button variant="outline" className="w-full" onClick={() => setRailOpen(true)}>
          {PANEL_LABEL[editPanel]}
          {(flow.overflowLines > 0 || flow.dropped > 0) && (
            <span className="ml-2 text-xs text-destructive">
              {flow.overflowLines} over{flow.dropped ? ` · ${flow.dropped} dropped` : ''}
            </span>
          )}
        </Button>
      </div>
      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <AidControlRail
            panel={editPanel}
            onPanelChange={setEditPanel}
            settings={settings}
            onSettingsPatch={patch}
            blockList={blockList}
            phoneEdition={phoneEdition}
          />
        </SheetContent>
      </Sheet>
    </div>
```

Add `const [railOpen, setRailOpen] = useState(false);` beside the other state, and import `Sheet, SheetContent` from `@/components/ui/sheet`.

Extract the existing block-editing JSX (the `<ul>` and its insert buttons, lines ~608–698) into a local `const blockList = (...)` above the return, and the Phone edition card body (lines ~533–565) into `const phoneEdition = (...)`. Both keep their existing handlers — `insert`, `move`, `setText`, `setGap`, `hide`, `restore`, `removeInsert`, `publish` — unchanged.

Delete the now-empty wrapper `<Card>`s and the standalone overflow card (lines ~567–583); its content is now the stage badge.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck:guard`
Expected: `OK — N errors, all pre-existing`. If a NEW error appears, fix it; never run `--write-baseline`.

- [ ] **Step 4: Run the full liturgy test surface**

Run: `npx vitest run src/lib/liturgy/ src/components/liturgy/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/WorshipAidPage.tsx
git commit -m "feat(liturgy): two-pane worship aid editor

Control rail beside a pinned sheet stage, so the aid stays on screen while
it is edited. Below lg the rail becomes a bottom drawer whose handle keeps
showing the panel and overflow count. The PDF capture runs through
withFullView so the archive is unaffected."
```

---

### Task 6: Prove print and the PDF did not change

The two outputs this redesign must not touch are the two nothing in CI checks. Verify them by hand, in the running app.

**Files:**
- Modify: none expected. Fix forward if a check fails.

- [ ] **Step 1: Build and serve**

Run: `npm run build && npx vite preview --port 4173`
Open `http://localhost:4173/dashboard/liturgy/<a real mass id>/worship-aid`.

- [ ] **Step 2: Check the print DOM with a non-Cover panel focused**

Select **Inside right** in the rail, then open the browser's print preview (Cmd+P).
Expected: **both** sheets present, all four panels, at 11×8.5 landscape, fold guide hidden, no editing affordances. If any panel is missing, the `@media print` reset in `AidStage.tsx` is not winning — raise its specificity; do not edit the sheets' own print block.

- [ ] **Step 3: Check the archived PDF with a non-Cover panel focused**

Still on **Inside right**, click **Save PDF to library**. Open the filed PDF from the Media Library.
Expected: 2 pages, all four panels, matching what printed. This is the exact case `withFullView` exists for — if the PDF is missing panels, `fileToLibrary` is not finding the `[data-aid-view]` ancestor.

- [ ] **Step 4: Responsive check**

At 1440px wide: rail and sheet side by side, sheet scrolls without moving the rail.
At 1024px and at iPad portrait (834px): rail collapses, bottom bar shows the panel name and any overflow, drawer opens over the sheet and the sheet is still scrollable behind it.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(liturgy): <what the verification turned up>"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| Layout shell (grid, viewport panes, drawer below `lg`) | 5 |
| Content placement (tabs incl. Cover, block list promoted, collapsed sections) | 4 |
| Overflow badge relocated to the stage | 3 |
| Focus + scale without touching print/PDF | 1, 2, 3 |
| `data-aid-view` swap around capture | 2, 5 |
| Componentisation (`AidControlRail`, `AidStage`) | 3, 4 |
| State (`editPanel` widened, drawer state) | 5 |
| Cover has no block list | 4 |
| Testing (existing suites, print, PDF, responsive) | 1, 6 |

No spec requirement is unassigned.

**Placeholder scan:** none. Every code step carries real code. Task 6 is verification, so its steps are observations with stated expected results rather than code.

**Type consistency:** `PanelId` imported from `@/lib/liturgy/worshipAid` everywhere and never redefined. `AidView` and `AID_VIEW_ATTR` are defined in Task 2 and consumed unchanged in Tasks 3 and 5. `PANEL_LABEL` is declared once, in `aidView.ts` (Task 2), and imported by the stage, the rail and the page. The pre-flight scan caught an earlier draft that duplicated it into all three — that would have been flagged as duplication at review.

**Known soft spots**, flagged rather than hidden:

- The focus CSS uses `:has()`. Fine for the browsers this app targets (Safari 15.4+, Chrome 105+), but it is the single point of failure for the whole focus mode. If it misbehaves, the fallback is to hide sheets from JS by index instead.
- Task 4 relocates roughly 300 lines of existing JSX. The tests cover the rail's contract, not every relocated control, so a dropped field would pass tests. Diff the moved JSX against the original before committing.
- The `h-[calc(100vh-4rem)]` container assumes the dashboard header is 4rem. Verify against `DashboardShell` and adjust rather than guessing.
