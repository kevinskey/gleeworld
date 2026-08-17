// @vitest-environment jsdom
//
// Task 9: on-page editing + fast entry + the piece popover with rights
// controls. useConcertProgramDoc + useBrandingSettings are mocked (same
// shape as the Task 8 scaffold test); everything downstream — paginate,
// measurement, ProgramSheetView, BlockRenderers, PieceLine, EditableText,
// PieceEditPopover — runs for real. jsdom's default viewport (1024px) is
// exactly the useIsMobile() breakpoint boundary, so inline (desktop)
// editing is what renders here without any extra viewport mocking.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// jsdom does not implement matchMedia; useIsMobile (src/hooks/use-mobile.tsx)
// calls it in a useEffect. Its initial render value comes from
// window.innerWidth instead (jsdom defaults to 1024, i.e. "not mobile" —
// desktop inline editing is what mounts below), so this stub only needs to
// satisfy the effect's subscribe/unsubscribe calls.
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
    blocks: [
      { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1', 'pc2'], creditLine: null },
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
      sheet_music_id: null, rights_status: 'public_domain', copyright_info: null,
    },
  ],
  addPieceToGroup: vi.fn(async () => 'new-id'),
  updatePiece: vi.fn(),
  deletePieceWithUndo: vi.fn(async () => {}),
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
    addPieceToGroup: mocks.addPieceToGroup,
    updatePiece: mocks.updatePiece,
    deletePieceWithUndo: mocks.deletePieceWithUndo,
    deleteBlockWithUndo: vi.fn(async () => {}),
    updateProgram: { mutate: mocks.updateProgramMutate, mutateAsync: vi.fn(async () => {}) },
    rosterOps: {},
    legacyConcert: {},
  }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: { org_name: 'Demo Choir', logo_url: null } }),
}));

import ConcertPlannerEditorPage from '../../../pages/dashboard/ConcertPlannerEditorPage';

afterEach(cleanup);
beforeEach(() => {
  mocks.addPieceToGroup.mockClear();
  mocks.updatePiece.mockClear();
  mocks.deletePieceWithUndo.mockClear();
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

// The page renders an off-screen measurement pass (useBlockMeasurements)
// alongside the real, visible sheet — same piece text appears in both, but
// only the visible one is contentEditable. Grab that one specifically.
function getEditableTitle(text: string): HTMLElement {
  const el = screen.getAllByText(text).find((n) => n.getAttribute('contenteditable') === 'true');
  if (!el) throw new Error(`no editable title found for "${text}"`);
  return el as HTMLElement;
}

describe('Concert Planner fast entry + piece popover', () => {
  it('Enter in a piece title editor adds a new piece right after it', () => {
    mount();
    const titleEl = getEditableTitle('Ave Maria');
    fireEvent.keyDown(titleEl, { key: 'Enter' });
    expect(mocks.addPieceToGroup).toHaveBeenCalledWith('g1', 1);
  });

  it('shows the rights ghost chip for a selected piece with rights_status null, and opens the popover', () => {
    mount();
    const titleEl = getEditableTitle('Ave Maria');
    fireEvent.click(titleEl);
    const rightsChip = screen.getByText('Unknown rights');
    expect(rightsChip).toBeInTheDocument();

    fireEvent.click(rightsChip);
    expect(screen.getByText('Rights')).toBeInTheDocument();
    expect(document.getElementById('pep-rights')).toBeInTheDocument();
  });

  it('debounces an inline title edit before writing it through updatePiece', () => {
    vi.useFakeTimers();
    try {
      mount();
      const titleEl = getEditableTitle('Ave Maria') as HTMLElement;
      titleEl.textContent = 'Ave Maria (revised)';
      fireEvent.blur(titleEl);

      expect(mocks.updatePiece).not.toHaveBeenCalled();
      vi.advanceTimersByTime(800);
      expect(mocks.updatePiece).toHaveBeenCalledWith('pc1', { title: 'Ave Maria (revised)' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('Delete in the popover removes the piece via deletePieceWithUndo', () => {
    mount();
    const titleEl = getEditableTitle('Ave Maria');
    fireEvent.click(titleEl);
    fireEvent.click(screen.getByText('Unknown rights'));

    // Exact match: Task 10's block rail also has "Delete <block label>"
    // buttons (e.g. "Delete Pieces" for this same group), which a loose
    // /delete/i regex would ambiguously match too.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mocks.deletePieceWithUndo).toHaveBeenCalledWith('pc1');
  });

  it('reverts a piece title to its last value when cleared, and never sends a blank commit', () => {
    mount();
    const titleEl = getEditableTitle('Ave Maria');
    titleEl.textContent = '';
    fireEvent.blur(titleEl);

    expect(titleEl.textContent).toBe('Ave Maria');
    expect(mocks.updatePiece).not.toHaveBeenCalled();
  });

  it('flushes a pending inline title edit on unmount instead of dropping it', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = mount();
      const titleEl = getEditableTitle('Ave Maria');
      titleEl.textContent = 'Ave Maria (typed)';
      fireEvent.blur(titleEl);

      // Still within the debounce window — nothing written yet.
      expect(mocks.updatePiece).not.toHaveBeenCalled();

      unmount();
      expect(mocks.updatePiece).toHaveBeenCalledWith('pc1', { title: 'Ave Maria (typed)' });
    } finally {
      vi.useRealTimers();
    }
  });
});
