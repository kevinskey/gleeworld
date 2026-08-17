// @vitest-environment jsdom
//
// Task 8 scaffold test: the rewritten ConcertPlannerEditorPage must render
// the true-paper canvas (a `.cp-sheet` sized page produced by the real
// pagination pipeline), the piece content flowed through it, and the
// Design/Format rail controls. useConcertProgramDoc + useBrandingSettings
// are mocked; everything downstream (paginateProgram, useBlockMeasurements,
// ProgramSheetView, BlockRenderers) runs for real so this is an honest
// integration check of the pipeline wiring, not just a mock echo.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// jsdom does not implement matchMedia; Task 9 added on-page editing, which
// checks the viewport via useIsMobile() (src/hooks/use-mobile.tsx) — its
// effect calls matchMedia to stay in sync with resizes. The initial render
// value comes from window.innerWidth instead (jsdom defaults to 1024, i.e.
// "not mobile"), so this stub only needs to satisfy the effect's
// subscribe/unsubscribe calls.
//
// The single-rail redesign added useCoarsePointer(), which queries
// `(pointer: coarse)` — the stub answers that specific query out of a
// mutable flag (`matchMediaState.coarse`) so tests can simulate an
// iPad-class touch pointer at a desktop (≥1024px) width without touching
// window.innerWidth at all.
const matchMediaState = { coarse: false };
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(pointer: coarse)' ? matchMediaState.coarse : false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

const mocks = vi.hoisted(() => ({
  program: {
    id: 'p1',
    title: 'Fall Concert',
    subtitle: null,
    event_date: null,
    call_time: null,
    venue: null,
    conductor: null,
    accompanist: null,
    performer_group: null,
    cover_image_url: null,
    notes: null,
    target_length_minutes: null,
    template_kind: 'choral',
    theme: 'classic',
    print_format: 'letter-portrait',
    card_layout: {},
    print_design: 'classic-1943',
    blocks: [
      { id: 'b-title', kind: 'title', showLogo: true, showOrgName: true },
      { id: 'b-group', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1', 'pc2'], creditLine: null },
      { id: 'b-footer', kind: 'footer', showQr: false },
    ],
    design_state: {},
    canva_design_id: null,
    setlist_id: null,
    published_at: null,
    published_by: null,
    published_slug: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  pieces: [
    {
      id: 'pc1', program_id: 'p1', sort_order: 0, section_heading: null,
      title: 'Ave Maria', composer: 'Schubert', arranger: null, voicing: null,
      soloists: null, duration_seconds: 180, program_notes: null,
      sheet_music_id: null, rights_status: null, copyright_info: null,
    },
    {
      id: 'pc2', program_id: 'p1', sort_order: 1, section_heading: null,
      title: 'Total Praise', composer: 'Hairston', arranger: null, voicing: null,
      soloists: null, duration_seconds: 240, program_notes: null,
      sheet_music_id: null, rights_status: null, copyright_info: null,
    },
  ],
  updateProgramMutate: vi.fn(),
}));

vi.mock('@/hooks/useConcertProgramDoc', () => ({
  useConcertProgramDoc: () => ({
    program: mocks.program,
    pieces: mocks.pieces,
    roster: [],
    isLoading: false,
    blocks: mocks.program.blocks,
    setBlocks: vi.fn(),
    persistBlocksNow: vi.fn(async () => true),
    addPieceToGroup: vi.fn(async () => 'new-id'),
    updatePiece: vi.fn(),
    deletePieceWithUndo: vi.fn(async () => {}),
    deleteBlockWithUndo: vi.fn(async () => {}),
    updateProgram: { mutate: mocks.updateProgramMutate, mutateAsync: vi.fn(async () => {}) },
    rosterOps: {},
    legacyConcert: {},
  }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: { org_name: 'Demo Choir', logo_url: null } }),
}));

import ConcertPlannerEditorPage from '../ConcertPlannerEditorPage';

afterEach(cleanup);
beforeEach(() => {
  matchMediaState.coarse = false;
  window.localStorage.removeItem('gw.concertPlanner.railOpen');
});

function mount() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/concert-planner/p1']}>
      <Routes>
        <Route path="/dashboard/concert-planner/:id" element={<ConcertPlannerEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConcertPlannerEditorPage scaffold', () => {
  it('renders a true-paper .cp-sheet with the flowed piece content', () => {
    mount();
    expect(document.querySelector('.cp-sheet')).toBeTruthy();
    expect(screen.getAllByText('Ave Maria').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Total Praise').length).toBeGreaterThan(0);
  });

  it('renders all 3 design tiles from PRINT_DESIGNS', () => {
    mount();
    expect(screen.getAllByText('Classic 1943').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modern Clean').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Formal').length).toBeGreaterThan(0);
  });

  it('renders both format options', () => {
    mount();
    expect(screen.getAllByText('Letter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Half-fold').length).toBeGreaterThan(0);
  });
});

// Task 13 (Print / Save PDF) review fix: the zero-pieces confirm guard is
// page-level wiring (ConcertPlannerEditorPage's Print button handler), not
// something the overlay component itself can cover — exercised here against
// the real handler with a piece-group whose pieceIds is empty (the shape
// flattenPieceOrder actually reads).
describe('ConcertPlannerEditorPage — Print button zero-pieces guard', () => {
  it('confirms before printing an empty program, and does not open the overlay when declined', () => {
    const originalBlocks = mocks.program.blocks;
    mocks.program.blocks = [
      { id: 'b-title', kind: 'title', showLogo: true, showOrgName: true },
      { id: 'b-group', kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null },
      { id: 'b-footer', kind: 'footer', showQr: false },
    ];
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      mount();
      fireEvent.click(screen.getByRole('button', { name: 'Print / Save PDF' }));
      expect(confirmSpy).toHaveBeenCalledWith('This program has no pieces — print anyway?');
      expect(document.querySelector('.cp-print-overlay')).toBeNull();
    } finally {
      confirmSpy.mockRestore();
      mocks.program.blocks = originalBlocks;
    }
  });
});

// Single-rail redesign: the left 10rem Blocks gutter is gone — Blocks now
// lives as the top Collapsible section of the ONE right-hand tools rail,
// above Add/Design/Format/Details, so the true-size sheet gets the rest of
// the width. Exactly one <aside> should ever exist on desktop.
describe('ConcertPlannerEditorPage — single-rail desktop layout', () => {
  it('renders one tools rail with Blocks above Add/Design/Format/Details — no separate left gutter', () => {
    mount();
    expect(document.querySelectorAll('aside').length).toBe(1);
    const aside = document.querySelector('aside') as HTMLElement;
    expect(within(aside).getByRole('button', { name: 'Blocks' })).toBeInTheDocument();
    expect(within(aside).getByText('Add')).toBeInTheDocument();
    expect(within(aside).getByText('Design')).toBeInTheDocument();
    expect(within(aside).getByText('Format')).toBeInTheDocument();
    expect(within(aside).getByText('Details')).toBeInTheDocument();
  });
});

describe('ConcertPlannerEditorPage — hide tools toggle', () => {
  it('the "Hide tools" button removes the rail column; toggling back restores it', () => {
    mount();
    expect(document.querySelectorAll('aside').length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Hide tools' }));
    expect(document.querySelectorAll('aside').length).toBe(0);
    expect(screen.queryByRole('button', { name: 'Blocks' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem('gw.concertPlanner.railOpen')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Show tools' }));
    expect(document.querySelectorAll('aside').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Blocks' })).toBeInTheDocument();
    expect(window.localStorage.getItem('gw.concertPlanner.railOpen')).toBe('1');
  });
});

// Task: pointer-based editing gate. A coarse (touch) pointer must route
// piece taps to the PieceEditPopover Dialog even at desktop width
// (jsdom's default window.innerWidth is 1024 — past the mobile breakpoint),
// same as it always has below 1024px.
describe('ConcertPlannerEditorPage — coarse pointer at desktop width', () => {
  it('routes a piece tap to the edit dialog instead of inline editing', () => {
    matchMediaState.coarse = true;
    mount();

    // Non-inline mode renders plain (non-contentEditable) text with a
    // click-to-open handler on the piece row. Filter to the visible sheet's
    // copy — the off-screen measurement pass (aria-hidden, `.cp-page` but
    // no `.cp-sheet` class, no click handler) renders the same text too.
    const titleEls = screen.getAllByText('Ave Maria');
    const visibleTitle = titleEls.find((el) => el.closest('.cp-sheet'));
    expect(visibleTitle).toBeTruthy();
    expect(visibleTitle!.getAttribute('contenteditable')).not.toBe('true');

    fireEvent.click(visibleTitle!.closest('.cp-piece') as HTMLElement);
    expect(screen.getByText('Edit piece')).toBeInTheDocument();
  });
});
