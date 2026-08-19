// @vitest-environment jsdom
//
// Task 14: the public /program/:slug page is rewritten off the old
// card-transform+theme pipeline onto the block model. Two scenarios:
//  (a) a legacy program (blocks: []) with pieces + notes falls back to
//      deriveDefaultBlocks — both piece titles AND the notes text render.
//  (b) a program with populated blocks (a piece-group carrying a section
//      heading + credit line) renders straight from those blocks — heading
//      and credit both render.
// Fetch logic itself (program by published_slug, then pieces + roster) is
// unchanged from the card-editor era, so the mock covers all three tables.
import { describe, it, expect, vi, afterEach, beforeEach, type Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock, programFetch, piecesFetch, sectionsFetch } = vi.hoisted(() => {
  type Chain = {
    select: Mock<(...args: unknown[]) => Chain>;
    eq: Mock<(...args: unknown[]) => Chain>;
    order: Mock<(...args: unknown[]) => Chain>;
    maybeSingle: Mock<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>;
    then: (
      onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  };
  function makeChain(fetchFn: () => Promise<{ data: unknown; error: unknown }>) {
    const chain = {} as Chain;
    Object.assign(chain, {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      maybeSingle: vi.fn(() => fetchFn()),
      then: (
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => fetchFn().then(onFulfilled, onRejected),
    });
    return chain;
  }
  const programFetch = vi.fn();
  const piecesFetch = vi.fn();
  const sectionsFetch = vi.fn();
  const programChain = makeChain(programFetch);
  const piecesChain = makeChain(piecesFetch);
  const sectionsChain = makeChain(sectionsFetch);
  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case 'gw_concert_programs': return programChain;
      case 'gw_concert_program_pieces': return piecesChain;
      case 'gw_concert_roster_sections': return sectionsChain;
      default: throw new Error(`unexpected table ${table}`);
    }
  });
  return { fromMock, programFetch, piecesFetch, sectionsFetch };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));
vi.mock('@/components/layout/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PublicConcertProgramPage from '../PublicConcertProgramPage';

afterEach(cleanup);
beforeEach(() => {
  fromMock.mockClear();
  programFetch.mockReset();
  piecesFetch.mockReset();
  sectionsFetch.mockReset();
  sectionsFetch.mockResolvedValue({ data: [], error: null });
});

function mount(slug: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/program/${slug}`]}>
        <Routes>
          <Route path="/program/:slug" element={<PublicConcertProgramPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const basePieces = [
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
];

describe('PublicConcertProgramPage', () => {
  it('legacy program (blocks: []) derives fallback blocks — piece titles and notes both render', async () => {
    programFetch.mockResolvedValue({
      data: {
        id: 'p1', title: 'Fall Concert', subtitle: null, event_date: null, venue: null,
        conductor: null, accompanist: null, performer_group: null, notes: 'Thank you for joining us tonight.',
        blocks: [], print_design: 'modern-clean', published_slug: 'fall-concert',
      },
      error: null,
    });
    piecesFetch.mockResolvedValue({ data: basePieces, error: null });

    mount('fall-concert');

    expect(await screen.findByText('Ave Maria')).toBeInTheDocument();
    expect(screen.getByText('Total Praise')).toBeInTheDocument();
    expect(screen.getByText('Thank you for joining us tonight.')).toBeInTheDocument();
  });

  it('populated blocks render straight through — group heading and credit line both render', async () => {
    programFetch.mockResolvedValue({
      data: {
        id: 'p2', title: 'Spring Recital', subtitle: null, event_date: null, venue: null,
        conductor: null, accompanist: null, performer_group: null, notes: null,
        print_design: 'classic-1943', published_slug: 'spring-recital',
        blocks: [
          { id: 'b-title', kind: 'title', showLogo: false, showOrgName: false },
          {
            id: 'b-group', kind: 'piece-group', sectionHeading: 'Sacred Works',
            pieceIds: ['pc1'], creditLine: 'Soloist: Jane Doe',
          },
          { id: 'b-footer', kind: 'footer', showQr: false },
        ],
      },
      error: null,
    });
    piecesFetch.mockResolvedValue({
      data: [
        {
          id: 'pc1', program_id: 'p2', sort_order: 0, section_heading: null,
          title: 'Locus Iste', composer: 'Bruckner', arranger: null, voicing: null,
          soloists: null, duration_seconds: null, program_notes: null,
          sheet_music_id: null, rights_status: null, copyright_info: null,
        },
      ],
      error: null,
    });

    mount('spring-recital');

    expect(await screen.findByText('Locus Iste')).toBeInTheDocument();
    expect(screen.getByText('Sacred Works')).toBeInTheDocument();
    expect(screen.getByText('Soloist: Jane Doe')).toBeInTheDocument();
  });
});
