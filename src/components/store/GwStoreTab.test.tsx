// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GwStoreTab } from './GwStoreTab';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));

const partner = {
  id: 'pt1', display_name: 'KPJ Music', bio: null, website_url: null,
  logo_storage_path: null, status: 'active',
  owner_photo_storage_path: null, history: null, featured_order: 1,
};
const scoreRow = {
  id: 'sc1', partner_id: 'pt1', title: 'Featured Anthem', composer: 'K. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 600, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: 1,
};

vi.mock('@/lib/store/api', () => ({
  useFeaturedPartners: () => ({ data: [partner], isLoading: false }),
  useGwFeaturedScores: () => ({ data: [scoreRow], isLoading: false }),
  useStorePartners: () => ({ data: [partner], isLoading: false }),
  useStoreScores: () => ({ data: [scoreRow], isLoading: false }),
}));

afterEach(cleanup);

describe('GwStoreTab', () => {
  it('links a featured piece to its store of origin with the score param', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/store/partners/pt1?score=sc1');
  });

  it('links a featured store card to the partner storefront', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/store/partners/pt1');
    expect(screen.getByText('Featured Stores')).toBeInTheDocument();
    expect(screen.getByText('Featured Pieces')).toBeInTheDocument();
  });

  it('filters the browse grid by search text', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Search scores…'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No scores match your search.')).toBeInTheDocument();
  });
});
