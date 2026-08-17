// @vitest-environment jsdom
//
// Task 8 scaffold test: the rewritten ConcertPlannerEditorPage must render
// the true-paper canvas (a `.cp-sheet` sized page produced by the real
// pagination pipeline), the piece content flowed through it, and the
// Design/Format rail controls. useConcertProgramDoc + useBrandingSettings
// are mocked; everything downstream (paginateProgram, useBlockMeasurements,
// ProgramSheetView, BlockRenderers) runs for real so this is an honest
// integration check of the pipeline wiring, not just a mock echo.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

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
