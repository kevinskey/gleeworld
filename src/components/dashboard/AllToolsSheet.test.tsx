// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AllToolsSheet, type AllToolsSheetProps } from './AllToolsSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { closeAllTools } from '@/components/tour/productTourScript';

// Same mocking shape as AddYouTubeVideoForm.test.tsx's toast coverage —
// vi.hoisted so the mock factory below can close over it, asserting on
// calls rather than needing a real <Toaster/> mounted to read rendered
// text.
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

// jsdom implements neither ResizeObserver nor Element.scrollIntoView, and
// cmdk's CommandList/CommandItem need both at mount (a height observer for
// its `--cmdk-list-height` var, scrollIntoView to keep the highlighted row
// visible). A global polyfill for these was tried in vitest.setup.ts and
// reverted — several OTHER components feature-detect one or the other
// specifically BECAUSE jsdom lacks them (AutomationPanel.tsx,
// NotationView.tsx, TourEngine.tsx all branch on `typeof ResizeObserver`/
// `typeof el.scrollIntoView`), so a global stub silently flips their
// jsdom-detection guards to the "real browser" branch everywhere, not just
// here. Scoped to this file only, via beforeAll/afterAll around the whole
// suite so it doesn't leak into any other test file even if vitest ever
// shares a realm across files in this worker.
let restoreResizeObserver: (() => void) | undefined;
let restoreScrollIntoView: (() => void) | undefined;

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ResizeObserver = ResizeObserverStub;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restoreResizeObserver = () => { delete (globalThis as any).ResizeObserver; };
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
    restoreScrollIntoView = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Element.prototype as any).scrollIntoView;
    };
  }
});

afterAll(() => {
  restoreResizeObserver?.();
  restoreScrollIntoView?.();
});

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const available = ['academy', 'finance', 'seating-charts', 'music-library', 'studio']
  .map((k) => byKey.get(k)!);

// Renders alongside AllToolsSheet inside the same MemoryRouter so tests can
// assert on navigation (or its absence) without mocking react-router's
// internals — a plain useLocation() read is enough to tell whether the
// route actually changed.
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

const renderSheet = (props: Partial<AllToolsSheetProps> = {}) => {
  const onPin = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <LocationProbe />
      <AllToolsSheet
        open
        onOpenChange={onOpenChange}
        available={available}
        pinned={[]}
        canPin
        onPin={onPin}
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...utils, onPin, onOpenChange };
};

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.mockReset();
});

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

  it('stamps each row with the catalog entry\'s tourId, same as NavShelf\'s shelf rows', () => {
    // The product tour's ensureAllToolsOpen (productTourScript.ts) opens
    // this sheet specifically to find a `[data-tour="nav-X"]` target that
    // isn't on the member's shelf (office-hours, analytics, settings) — if
    // this sheet's rows didn't carry the same attribute NavShelf's Row
    // component stamps for a shelf-rendered entry, the tour would open the
    // sheet and still find nothing.
    renderSheet();
    for (const e of available) {
      expect(document.querySelector(`[data-tour="${e.tourId}"]`)).not.toBeNull();
    }
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

  // Query "m" scores every fixture entry differently under scoreEntry:
  // "Music Library" (label starts with m, 80), "Academy" (label contains m,
  // 40), "Finance" and "Studio" (neither label contains m, but their
  // sections — Money, Make — both start with m, 20 apiece, tied and broken
  // by catalog order), "Seating Charts" (no match anywhere, 0, excluded).
  // Catalog order for these five is academy, finance, seating-charts,
  // music-library, studio — i.e. the UNRANKED order would put Academy
  // before Music Library. If AllToolsSheet's filter stopped calling
  // searchNav (e.g. searchNav were swapped for an identity function that
  // just returns `entries` unchanged), the rendered order would collapse
  // back to that catalog order and this would fail.
  it('ranks matches by score, not catalog order', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'm' } });
    await waitFor(() => expect(screen.getByText('Studio')).toBeInTheDocument());
    expect(screen.queryByText('Seating Charts')).toBeNull();

    // Read rows back in actual DOM order (cmdk reorders the real nodes, it
    // doesn't just reflow visually) and assert the label sequence directly,
    // rather than comparing positions pairwise.
    const expectedOrder = ['Music Library', 'Academy', 'Finance', 'Studio'];
    const renderedOrder = Array.from(document.querySelectorAll('[cmdk-item]'))
      .map((el) => expectedOrder.find((label) => el.textContent?.includes(label)))
      .filter((label): label is string => label !== undefined);
    expect(renderedOrder).toEqual(expectedOrder);
  });

  // "Money" cannot fuzzy-match "finance" under ANY subsequence-based
  // matcher, cmdk's default included — the letter 'm' does not appear in
  // "finance" at all. It DOES match under scoreEntry, via Finance's own
  // section label ("Money"). So this only shows Finance if AllToolsSheet's
  // custom filter is genuinely the one cmdk is calling — if command.tsx
  // stopped forwarding `filter` to the inner Command, cmdk would fall back
  // to its own default matcher and Finance could never appear for this
  // query, letter-availability alone rules it out.
  it('matches by section label, proving the custom filter — not cmdk defaults — is active', async () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'money' } });
    await waitFor(() => expect(screen.getByText('Finance')).toBeInTheDocument());
  });
});

describe('AllToolsSheet — closing resets the search', () => {
  it('reopens in the grouped browsing layout, not the previous search\'s flat list', async () => {
    // Radix unmounts the dialog's contents on close, taking cmdk's own
    // search state with it — but this component does NOT unmount, so its
    // `query` state survives unless the close effect clears it. Deleting
    // that effect left the whole suite green: on reopen the input reads
    // empty (cmdk's fresh state) while `query` still holds the old term, so
    // the sheet renders the ungrouped searching layout with no section
    // headings — a stale flat ordering under an empty search box.
    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AllToolsSheet open onOpenChange={vi.fn()} available={available} pinned={[]} canPin onPin={vi.fn()} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'seat' } });
    await waitFor(() => expect(screen.queryByText('Money')).toBeNull());

    const sheetWith = (open: boolean) => (
      <MemoryRouter initialEntries={['/dashboard']}>
        <AllToolsSheet open={open} onOpenChange={vi.fn()} available={available} pinned={[]} canPin onPin={vi.fn()} />
      </MemoryRouter>
    );
    rerender(sheetWith(false));
    rerender(sheetWith(true));

    // Section headings are the observable difference between the browsing
    // layout (grouped) and the searching layout (one flat group).
    await waitFor(() => expect(screen.getByText('Money')).toBeInTheDocument());
    expect(screen.getByText('Teach')).toBeInTheDocument();
    expect((screen.getByPlaceholderText(/search all tools/i) as HTMLInputElement).value).toBe('');
  });
});

describe('AllToolsSheet — pinning', () => {
  it('pins without navigating or closing', async () => {
    const { onPin, onOpenChange } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your world/i }));
    await waitFor(() => expect(onPin).toHaveBeenCalledWith('academy'));
    expect(onOpenChange).not.toHaveBeenCalled();
    // Exact match, not toHaveTextContent('/dashboard') — jest-dom's
    // toHaveTextContent does a SUBSTRING match, and every entry.to in this
    // fixture starts with '/dashboard/', so a substring check here would
    // also be satisfied by a navigation to '/dashboard/academy'. This only
    // catches a leaked navigate() if it's checked for equality.
    expect(screen.getByTestId('location-probe').textContent).toBe('/dashboard');
  });

  it('surfaces a failed pin instead of discarding it silently', async () => {
    const onPin = vi.fn().mockResolvedValue(false);
    renderSheet({ onPin });
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your world/i }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/couldn't pin academy/i),
          variant: 'destructive',
        }),
      ),
    );
  });

  it('marks already-pinned entries and offers no pin button for them', () => {
    renderSheet({ pinned: ['academy'] });
    expect(screen.queryByRole('button', { name: /pin academy to your world/i })).toBeNull();
    expect(screen.getByText(/in your world/i)).toBeInTheDocument();
  });

  it('offers no ⊕ at all when the stored record has not loaded', () => {
    // canPin false is "the write path will refuse" — a ⊕ here could only
    // ever fail, so the row is rendered without one. The catalog itself is
    // untouched: every entry is still listed and still navigable.
    renderSheet({ canPin: false });
    expect(screen.queryByRole('button', { name: /to your world/i })).toBeNull();
    for (const e of available) expect(screen.getByText(e.label)).toBeInTheDocument();
  });

  it('renders Home as always-present rather than as a pin target', () => {
    // resolveNav's output includes 'home', and sanitizeTools strips it at
    // write time — so a ⊕ on this row produced a successful RPC, a `true`
    // return, no toast, and no change whatsoever. It gets the same
    // "In your world" affordance an already-placed tool gets. The row stays
    // in `available` (navigable, searchable) rather than being filtered out.
    const home = byKey.get('home')!;
    const { onPin } = renderSheet({ available: [home, ...available] });

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pin command center to your world/i })).toBeNull();
    const homeRow = screen.getByText('Command Center').closest('[cmdk-item]') as HTMLElement;
    expect(within(homeRow).getByText('In your world')).toBeInTheDocument();
    expect(onPin).not.toHaveBeenCalled();
  });

  // The 8-tool cap is gone (product owner, 2026-08-09) and this sheet is
  // half the reason it could go: everything in the catalog is reachable
  // from here regardless of shelf length, so a long shelf costs a tap, not
  // access. No "full" banner, no disabled ⊕, at any length.
  it('still offers a live ⊕ when the member already has far more than eight pinned', () => {
    const pinned = NAV_CATALOG.filter((e) => !['home', 'academy'].includes(e.key))
      .slice(0, 20).map((e) => e.key);
    expect(pinned.length).toBeGreaterThan(8); // guard: the fixture really is oversized
    const { onPin } = renderSheet({ pinned });
    const btn = screen.getByRole('button', { name: /pin academy to your world/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onPin).toHaveBeenCalledWith('academy');
  });

  it('shows no "full" banner at any length', () => {
    renderSheet({ pinned: NAV_CATALOG.filter((e) => e.key !== 'home').map((e) => e.key) });
    // The banner said "Your space is full — remove one in Setup to pin
    // another." Matched on "is full", not a bare /full/i — the sheet's own
    // dialog description legitimately contains "the full tool catalog", so
    // /full/i would have failed here for the wrong reason.
    expect(screen.queryByText(/is full/i)).toBeNull();
    expect(screen.queryByText(/remove one in Setup/i)).toBeNull();
  });
});

describe('AllToolsSheet — selecting a row', () => {
  it('navigates to the entry and closes the sheet', () => {
    const { onOpenChange } = renderSheet();
    fireEvent.click(screen.getByText('Academy'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Exact match for the same reason as the pin test above — substring
    // matching isn't wrong here in THIS fixture (no other route is a
    // substring of '/dashboard/academy'), but it's the same class of bug
    // waiting to happen the moment the fixture changes, so hold the same
    // standard.
    expect(screen.getByTestId('location-probe').textContent).toBe('/dashboard/academy');
  });
});

describe('AllToolsSheet — the product tour can close it again', () => {
  it('closes when closeAllTools runs, using the real helper against this real sheet', async () => {
    // The tour opens this sheet to reach a target that isn't on the
    // member's shelf, and closes it when the step ends. Both halves are
    // DOM-only contracts between two files: closeAllTools finds the sheet
    // by the `data-all-tools-sheet` marker rendered below, and dismisses it
    // the way Radix expects. Testing the helper against a synthetic div
    // (productTourScript.test.ts) proves it dispatches; this proves the
    // dispatch actually lands on THIS component.
    const { onOpenChange } = renderSheet();
    expect(document.querySelector('[data-all-tools-sheet]')).not.toBeNull();

    closeAllTools();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe('AllToolsSheet — accessibility', () => {
  it('gives every button an accessible name', () => {
    renderSheet();
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName();
  });
});

describe('AllToolsSheet — selected row stays readable on a tenant accent', () => {
  // A tenant whose accent is dark (Lyke House's gold) made the highlighted
  // row unreadable: the row itself flipped to --accent-foreground, but its
  // label rendered dark anyway because it did not inherit that colour, and
  // the icon kept its fixed muted-slate. Verified in-browser at the time —
  // row computed white, label computed black on the same element tree.
  //
  // Every child that carries text or an icon must therefore name its own
  // selected colour rather than trusting inheritance.
  it('gives the row label its own selected colour', () => {
    renderSheet();
    const label = document.querySelector('[cmdk-item] span.flex-1');
    expect(label).not.toBeNull();
    expect(label!.className).toContain('group-data-[selected=true]:text-accent-foreground');
  });

  it('gives the row icon its own selected colour', () => {
    renderSheet();
    const icon = document.querySelector('[cmdk-item] svg');
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute('class') ?? '')
      .toContain('group-data-[selected=true]:text-accent-foreground');
  });

  it('marks the row as a group, without which none of the child rules apply', () => {
    renderSheet();
    const item = document.querySelector('[cmdk-item]');
    expect(item!.className.split(/\s+/)).toContain('group');
  });
});
