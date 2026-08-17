// @vitest-environment jsdom
//
// Task 10: rail block ops (add text / disabled Add roster) and the block
// rail (whole-block reorder/delete). Same page-mount pattern as
// fastEntry.test.tsx — useConcertProgramDoc + useBrandingSettings are
// mocked; everything downstream runs for real.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// jsdom does not implement matchMedia; useIsMobile (src/hooks/use-mobile.tsx)
// calls it in a useEffect. jsdom defaults window.innerWidth to 1024 ("not
// mobile"), so this stub only needs to satisfy the effect's subscribe calls.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

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
    // Overwritten per test / reset in beforeEach — see setDefaultBlocks below.
    blocks: [] as unknown[],
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
  ],
  setBlocks: vi.fn(),
  // Typed with an explicit param (not `async () => true`) so
  // `.mock.calls[0][0]` below indexes a real tuple slot, not `[]`.
  persistBlocksNow: vi.fn(async (_next: unknown) => true),
  deleteBlockWithUndo: vi.fn(async (_blockId: unknown) => {}),
}));

vi.mock('@/hooks/useConcertProgramDoc', () => ({
  useConcertProgramDoc: () => ({
    program: mocks.program,
    pieces: mocks.pieces,
    roster: [],
    isLoading: false,
    blocks: mocks.program.blocks,
    setBlocks: mocks.setBlocks,
    persistBlocksNow: mocks.persistBlocksNow,
    addPieceToGroup: vi.fn(async () => 'new-id'),
    updatePiece: vi.fn(),
    deletePieceWithUndo: vi.fn(async () => {}),
    deleteBlockWithUndo: mocks.deleteBlockWithUndo,
    updateProgram: { mutate: vi.fn(), mutateAsync: vi.fn(async () => {}) },
    rosterOps: {},
    legacyConcert: {},
  }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: { org_name: 'Demo Choir', logo_url: null } }),
}));

import ConcertPlannerEditorPage from '../../../pages/dashboard/ConcertPlannerEditorPage';

function groupBlocks() {
  return [
    { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
    { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1'], creditLine: null },
    { id: 'b-footer', kind: 'footer', showQr: false },
  ];
}

function textDividerBlocks() {
  return [
    { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
    { id: 'b-text', kind: 'text', text: '', align: 'center' },
    { id: 'b-div', kind: 'divider' },
    { id: 'b-footer', kind: 'footer', showQr: false },
  ];
}

afterEach(cleanup);
beforeEach(() => {
  mocks.program.blocks = groupBlocks();
  mocks.setBlocks.mockClear();
  mocks.persistBlocksNow.mockClear();
  mocks.deleteBlockWithUndo.mockClear();
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

describe('EditorRail Add buttons', () => {
  it("Add text inserts a text block before the footer", () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Text' }));

    expect(mocks.setBlocks).toHaveBeenCalledTimes(1);
    const next = mocks.setBlocks.mock.calls[0][0] as Array<{ kind: string }>;
    expect(next.map((b) => b.kind)).toEqual(['title', 'piece-group', 'text', 'footer']);
  });

  it('Add roster is disabled once a roster block already exists', () => {
    mocks.program.blocks = [
      { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1'], creditLine: null },
      { id: 'b-roster', kind: 'roster' },
      { id: 'b-footer', kind: 'footer', showQr: false },
    ];
    mount();

    expect(screen.getByRole('button', { name: 'Roster' })).toBeDisabled();
  });

  it('Add roster stays enabled with no roster block present', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Roster' })).toBeEnabled();
  });
});

describe('Block rail', () => {
  it('renders handles in block order (title/footer excluded — not draggable)', () => {
    mocks.program.blocks = textDividerBlocks();
    mount();

    const dragHandles = screen.getAllByRole('button', { name: /^Drag / });
    expect(dragHandles.map((b) => b.getAttribute('aria-label'))).toEqual(['Drag Text', 'Drag —o— Divider']);
  });

  it('▼ on the first middle block persists a swap with the next block immediately', () => {
    mocks.program.blocks = textDividerBlocks();
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Move Text down' }));

    expect(mocks.persistBlocksNow).toHaveBeenCalledTimes(1);
    expect(mocks.setBlocks).not.toHaveBeenCalled();
    const next = mocks.persistBlocksNow.mock.calls[0][0] as Array<{ id: string }>;
    expect(next.map((b) => b.id)).toEqual(['b-title', 'b-div', 'b-text', 'b-footer']);
  });

  it('✕ on a text block handle calls deleteBlockWithUndo with its id', () => {
    mocks.program.blocks = textDividerBlocks();
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Text' }));

    expect(mocks.deleteBlockWithUndo).toHaveBeenCalledWith('b-text');
  });

  it('the title and footer handles have no move/delete buttons', () => {
    mocks.program.blocks = textDividerBlocks();
    mount();

    expect(screen.queryByRole('button', { name: /Delete Title/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete Footer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Drag Title/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Drag Footer/ })).not.toBeInTheDocument();
  });
});
