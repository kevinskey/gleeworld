// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AllToolsSheet, type AllToolsSheetProps } from './AllToolsSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';
import { MY_TOOLS_CAP } from '@/lib/navigation/myTools';

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
      <AllToolsSheet open onOpenChange={onOpenChange} available={available} pinned={[]} onPin={onPin} {...props} />
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

describe('AllToolsSheet — pinning', () => {
  it('pins without navigating or closing', async () => {
    const { onPin, onOpenChange } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your space/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /pin academy to your space/i }));
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
    expect(screen.queryByRole('button', { name: /pin academy to your space/i })).toBeNull();
    expect(screen.getByText(/in your space/i)).toBeInTheDocument();
  });

  it('disables pinning at the cap and says why', () => {
    renderSheet({ pinned: NAV_CATALOG.slice(0, MY_TOOLS_CAP).map((e) => e.key) });
    expect(screen.getByText(/your space is full/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /pin finance to your space/i });
    expect(btn).toBeDisabled();
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

describe('AllToolsSheet — accessibility', () => {
  it('gives every button an accessible name', () => {
    renderSheet();
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName();
  });
});
