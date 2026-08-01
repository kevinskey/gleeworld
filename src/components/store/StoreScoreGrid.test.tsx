// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreScoreGrid } from './StoreScoreGrid';
import type { StoreScoreRow } from '@/lib/store/api';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));

const row = (over: Partial<StoreScoreRow>): StoreScoreRow => ({
  id: 'sc1', partner_id: 'pt1', title: 'Lift Every Voice', composer: 'J. R. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 495, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: null, ...over,
});

afterEach(cleanup);

describe('StoreScoreGrid', () => {
  it('renders title, price, partner and default detail link', () => {
    render(<MemoryRouter><StoreScoreGrid scores={[row({})]} /></MemoryRouter>);
    expect(screen.getByText('Lift Every Voice')).toBeInTheDocument();
    expect(screen.getByText('$4.95')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/store/scores/sc1');
  });

  it('honors a custom linkFor', () => {
    render(
      <MemoryRouter>
        <StoreScoreGrid scores={[row({})]} linkFor={(s) => `/store/partners/${s.partner_id}?score=${s.id}`} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/store/partners/pt1?score=sc1');
  });

  it('rings only the highlighted card wrapper', () => {
    render(
      <MemoryRouter>
        <StoreScoreGrid scores={[row({}), row({ id: 'sc2', title: 'Second Score' })]} highlightId="sc1" />
      </MemoryRouter>
    );
    expect(document.getElementById('score-sc1')?.className ?? '').toContain('ring-2');
    expect(document.getElementById('score-sc2')?.className ?? '').not.toContain('ring-2');
  });
});
