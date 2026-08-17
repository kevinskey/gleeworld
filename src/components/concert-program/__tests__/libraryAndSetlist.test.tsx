// @vitest-environment jsdom
//
// Task 11: Library picker (Scores / My Music tabs) and the one-time
// Setlist import. Covers:
//  (a) LibraryPickerDialog — renders mocked rows per tab; onPick carries
//      sheet_music_id for a Scores pick, null for a My Music pick.
//  (b) SetlistImportDialog — choosing a setlist maps gw_setlist_items in
//      order_index order into onImport.
//  (c) Page-level handleSetlistImport (mounted like blockOps.test.tsx):
//      insert returning fewer rows than sent → no persist, failure toast;
//      a matching insert → persistBlocksNow gets a new piece-group (with
//      the returned ids) before the footer, and updateProgram.mutate gets
//      { setlist_id }.
import { describe, it, expect, vi, afterEach, beforeEach, type Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

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

// ── Supabase mock: a generic thenable chain per table, backed by a
// dedicated resolver fn so each table's response is independently
// configurable and every call site (however many .select/.or/.order/.eq
// hops it chains) resolves through the same terminal. Chains are created
// ONCE per table (not per `.from()` call) so `.or.mock.calls` etc. can be
// inspected directly — needed by the search-term escaping tests below,
// which assert on exactly what string reached `.or()`. ───────────────────
const {
  fromMock,
  sheetMusicBrowseFetch, personalScoresFetch, setlistsFetch, setlistItemsFetch,
  piecesWriteFetch, scoresChain, mineChain,
} = vi.hoisted(() => {
  type Chain = {
    select: Mock<(...args: unknown[]) => Chain>;
    or: Mock<(...args: unknown[]) => Chain>;
    order: Mock<(...args: unknown[]) => Chain>;
    limit: Mock<(...args: unknown[]) => Chain>;
    eq: Mock<(...args: unknown[]) => Chain>;
    insert: Mock<(...args: unknown[]) => Chain>;
    delete: Mock<(...args: unknown[]) => Chain>;
    in: Mock<(...args: unknown[]) => Chain>;
    then: (
      onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  };
  function makeChain(fetchFn: () => Promise<{ data: unknown; error: unknown }>) {
    const chain = {} as Chain;
    Object.assign(chain, {
      select: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      in: vi.fn(() => chain),
      then: (
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => fetchFn().then(onFulfilled, onRejected),
    });
    return chain;
  }
  const sheetMusicBrowseFetch = vi.fn();
  const personalScoresFetch = vi.fn();
  const setlistsFetch = vi.fn();
  const setlistItemsFetch = vi.fn();
  const piecesWriteFetch = vi.fn();

  const scoresChain = makeChain(sheetMusicBrowseFetch);
  const mineChain = makeChain(personalScoresFetch);
  const setlistsChain = makeChain(setlistsFetch);
  const setlistItemsChain = makeChain(setlistItemsFetch);
  const piecesChain = makeChain(piecesWriteFetch);

  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case 'gw_sheet_music_browse': return scoresChain;
      case 'gw_personal_scores': return mineChain;
      case 'gw_setlists': return setlistsChain;
      case 'gw_setlist_items': return setlistItemsChain;
      case 'gw_concert_program_pieces': return piecesChain;
      default: throw new Error(`unexpected table ${table}`);
    }
  });

  return {
    fromMock, sheetMusicBrowseFetch, personalScoresFetch, setlistsFetch, setlistItemsFetch,
    piecesWriteFetch, scoresChain, mineChain,
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: toastMock }));

afterEach(cleanup);
beforeEach(() => {
  fromMock.mockClear();
  sheetMusicBrowseFetch.mockReset();
  personalScoresFetch.mockReset();
  setlistsFetch.mockReset();
  setlistItemsFetch.mockReset();
  piecesWriteFetch.mockReset();
  scoresChain.or.mockClear();
  mineChain.or.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

import { LibraryPickerDialog } from '../LibraryPickerDialog';
import { SetlistImportDialog } from '../SetlistImportDialog';

// ── (a) LibraryPickerDialog ─────────────────────────────────────────────
describe('LibraryPickerDialog', () => {
  beforeEach(() => {
    sheetMusicBrowseFetch.mockResolvedValue({
      data: [{ id: 'score-1', title: 'Ave Maria', composer: 'Biebl', voicing: 'SATB' }],
      error: null,
    });
    personalScoresFetch.mockResolvedValue({
      data: [{ id: 'personal-1', title: 'My Own Arrangement', composer: 'Me', voicing: null }],
      error: null,
    });
  });

  it('renders mocked Scores rows and onPick carries sheet_music_id', async () => {
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    render(<LibraryPickerDialog open onOpenChange={onOpenChange} onPick={onPick} />);

    await screen.findByText('Ave Maria');
    expect(fromMock).toHaveBeenCalledWith('gw_sheet_music_browse');

    fireEvent.click(screen.getByText('Ave Maria'));

    expect(onPick).toHaveBeenCalledWith({
      title: 'Ave Maria', composer: 'Biebl', voicing: 'SATB', sheet_music_id: 'score-1',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('a My Music row fires onPick with sheet_music_id null', async () => {
    const onPick = vi.fn();
    render(<LibraryPickerDialog open onOpenChange={vi.fn()} onPick={onPick} />);

    await screen.findByText('Ave Maria'); // wait for initial (Scores) load first
    // Radix Tabs fires onValueChange from onMouseDown, not onClick.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'My Music' }));

    await screen.findByText('My Own Arrangement');
    expect(fromMock).toHaveBeenCalledWith('gw_personal_scores');

    fireEvent.click(screen.getByText('My Own Arrangement'));

    expect(onPick).toHaveBeenCalledWith({
      title: 'My Own Arrangement', composer: 'Me', voicing: null, sheet_music_id: null,
    });
  });

  it('shows an inline retry state and stays open on a fetch failure', async () => {
    sheetMusicBrowseFetch.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const onOpenChange = vi.fn();
    render(<LibraryPickerDialog open onOpenChange={onOpenChange} onPick={vi.fn()} />);

    await screen.findByText(/Couldn't load/);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // Security fix: a comma in the search box used to split the .or() filter
  // into extra PostgREST clauses (mis-filter/error); % and _ used to act as
  // raw LIKE wildcards. Both are now escaped before interpolation.
  it('a comma in the search term never reaches .or() raw — still a single .or() call', async () => {
    render(<LibraryPickerDialog open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() => expect(sheetMusicBrowseFetch).toHaveBeenCalledTimes(1)); // initial empty-query load
    scoresChain.or.mockClear();

    fireEvent.change(screen.getByPlaceholderText(/Search title or composer/), {
      target: { value: 'Bach, J.S.' },
    });

    await waitFor(() => expect(scoresChain.or).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const [pattern] = scoresChain.or.mock.calls[0] as [string];
    // Exactly ONE comma — the legitimate title/composer clause separator —
    // not one contributed by the user's "Bach, J.S." (which would split
    // into extra, malformed .or() clauses).
    expect(pattern.split(',')).toHaveLength(2);
    expect(pattern).toContain('Bach');
    expect(pattern).toContain('J.S.');
  });

  it('% and _ in the search term are escaped so they cannot act as raw LIKE wildcards', async () => {
    render(<LibraryPickerDialog open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() => expect(sheetMusicBrowseFetch).toHaveBeenCalledTimes(1));
    scoresChain.or.mockClear();

    fireEvent.change(screen.getByPlaceholderText(/Search title or composer/), {
      target: { value: '50%_off' },
    });

    await waitFor(() => expect(scoresChain.or).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const [pattern] = scoresChain.or.mock.calls[0] as [string];
    expect(pattern).toContain('50\\%\\_off');
  });
});

// ── (b) SetlistImportDialog ─────────────────────────────────────────────
describe('SetlistImportDialog', () => {
  it('maps items in order_index order into onImport', async () => {
    setlistsFetch.mockResolvedValue({
      data: [{ id: 'sl1', title: 'Fall Concert Set', concert_name: 'Fall Concert', event_date: '2026-09-01' }],
      error: null,
    });
    setlistItemsFetch.mockResolvedValue({
      data: [
        { music_id: 'm1', order_index: 0, score: { title: 'Ave Maria', composer: 'Biebl', voicing: 'SATB' } },
        { music_id: 'm2', order_index: 1, score: { title: 'Locus Iste', composer: 'Bruckner', voicing: null } },
      ],
      error: null,
    });
    const onImport = vi.fn();
    render(<SetlistImportDialog open onOpenChange={vi.fn()} onImport={onImport} />);

    await screen.findByText('Fall Concert Set');
    fireEvent.click(screen.getByText('Fall Concert Set'));

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(onImport).toHaveBeenCalledWith({
      pieces: [
        { title: 'Ave Maria', composer: 'Biebl', voicing: 'SATB', sheet_music_id: 'm1' },
        { title: 'Locus Iste', composer: 'Bruckner', voicing: null, sheet_music_id: 'm2' },
      ],
      setlistId: 'sl1',
    });
  });
});

// ── (c) Page-level handleSetlistImport (mounted like blockOps.test.tsx) ─
const pageMocks = vi.hoisted(() => ({
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
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1'], creditLine: null },
      { id: 'b-footer', kind: 'footer', showQr: false },
    ] as unknown[],
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
  persistBlocksNow: vi.fn(async (_next: unknown) => true),
  updateProgramMutate: vi.fn(),
}));

vi.mock('@/hooks/useConcertProgramDoc', () => ({
  useConcertProgramDoc: () => ({
    program: pageMocks.program,
    pieces: pageMocks.pieces,
    roster: [],
    isLoading: false,
    blocks: pageMocks.program.blocks,
    setBlocks: vi.fn(),
    persistBlocksNow: pageMocks.persistBlocksNow,
    addPieceToGroup: vi.fn(async () => 'new-id'),
    updatePiece: vi.fn(),
    deletePieceWithUndo: vi.fn(async () => {}),
    deleteBlockWithUndo: vi.fn(async () => {}),
    updateProgram: { mutate: pageMocks.updateProgramMutate, mutateAsync: vi.fn(async () => {}) },
    rosterOps: {},
    legacyConcert: {},
  }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: { org_name: 'Demo Choir', logo_url: null } }),
}));

import ConcertPlannerEditorPage from '../../../pages/dashboard/ConcertPlannerEditorPage';

function mountPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/concert-planner/p1']}>
      <Routes>
        <Route path="/dashboard/concert-planner/:id" element={<ConcertPlannerEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setlistPieces() {
  return [
    { music_id: 'm1', order_index: 0, score: { title: 'Sicut Cervus', composer: 'Palestrina', voicing: 'SATB' } },
    { music_id: 'm2', order_index: 1, score: { title: 'Set Me as a Seal', composer: 'Walker', voicing: 'SATB' } },
  ];
}

async function openSetlistAndChoose() {
  setlistsFetch.mockResolvedValue({
    data: [{ id: 'sl1', title: 'Spring Set', concert_name: 'Spring Concert', event_date: '2026-05-01' }],
    error: null,
  });
  setlistItemsFetch.mockResolvedValue({ data: setlistPieces(), error: null });

  mountPage();
  fireEvent.click(screen.getByRole('button', { name: /Import setlist/ }));
  await screen.findByText('Spring Set');
  fireEvent.click(screen.getByText('Spring Set'));
}

describe('Page-level handleSetlistImport', () => {
  beforeEach(() => {
    pageMocks.program.blocks = [
      { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['pc1'], creditLine: null },
      { id: 'b-footer', kind: 'footer', showQr: false },
    ];
    pageMocks.persistBlocksNow.mockClear();
    pageMocks.persistBlocksNow.mockResolvedValue(true);
    pageMocks.updateProgramMutate.mockClear();
  });

  it('insert returning fewer rows than sent: no persist, failure toast fires', async () => {
    piecesWriteFetch.mockResolvedValue({ data: [{ id: 'new-1' }], error: null }); // 2 sent, 1 back

    await openSetlistAndChoose();

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Import failed — nothing was added'));
    expect(pageMocks.persistBlocksNow).not.toHaveBeenCalled();
  });

  it('insert matching rows sent: persistBlocksNow gets a new group before the footer; updateProgram.mutate gets setlist_id', async () => {
    piecesWriteFetch.mockResolvedValue({ data: [{ id: 'new-1' }, { id: 'new-2' }], error: null });

    await openSetlistAndChoose();

    await waitFor(() => expect(pageMocks.persistBlocksNow).toHaveBeenCalledTimes(1));
    const next = pageMocks.persistBlocksNow.mock.calls[0][0] as Array<{ id: string; kind: string; pieceIds?: string[] }>;
    expect(next.map((b) => b.kind)).toEqual(['title', 'piece-group', 'piece-group', 'footer']);
    const newGroup = next[2];
    expect(newGroup.pieceIds).toEqual(['new-1', 'new-2']);

    expect(pageMocks.updateProgramMutate).toHaveBeenCalledWith({ setlist_id: 'sl1' });
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('when the block persist fails, an incomplete rollback delete (fewer rows than inserted) is warned, not swallowed', async () => {
    pageMocks.persistBlocksNow.mockResolvedValue(false); // persist fails → rollback path
    piecesWriteFetch
      .mockResolvedValueOnce({ data: [{ id: 'new-1' }, { id: 'new-2' }], error: null }) // insert: 2 rows
      .mockResolvedValueOnce({ data: [{ id: 'new-1' }], error: null }); // rollback delete: only 1 of 2 came back
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await openSetlistAndChoose();

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Import failed — nothing was added'));
    expect(warnSpy).toHaveBeenCalledWith(
      '[concert-program] setlist import rollback incomplete — orphan piece rows may remain',
      expect.objectContaining({ expected: 2, deleted: 1 }),
    );

    warnSpy.mockRestore();
  });
});
