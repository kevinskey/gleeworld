// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GwStoreTab } from './GwStoreTab';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));
// pdfjs-dist can't load under jsdom (no DOMMatrix); these fixtures have no
// PDF thumbnails, so a stub is faithful.
vi.mock('@/components/music-library/PDFThumbnail', () => ({
  PDFThumbnail: () => <div data-testid="pdf-thumbnail" />,
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
  it('renders the marketing hero with Browse and Sell CTAs and detail links to the score', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    expect(screen.getByText('GW Sheet Music Store')).toBeInTheDocument();
    expect(screen.getByText('Browse Music')).toBeInTheDocument();
    expect(screen.getByText('Sell Your Music').closest('a')).toHaveAttribute('href', '/partner');
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toContain('/store/scores/sc1');
  });

  it('renders one deduped publisher card with a title count', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    // pt1 is both featured and in the all-partners list — exactly one card.
    expect(links.filter((h) => h === '/store/partners/pt1').length).toBe(1);
    expect(screen.getByText('Featured Publishers')).toBeInTheDocument();
    expect(screen.getByText('1 title')).toBeInTheDocument();
  });

  it('always renders the composer recruitment banner', () => {
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    expect(screen.getByText('Publish your music on GleeWorld')).toBeInTheDocument();
    const mailto = screen.getByText('Become a Partner').closest('a');
    expect(mailto?.getAttribute('href') ?? '').toContain('mailto:kpj64110@gmail.com');
  });

  it('filters via the hero search and clears both search and chip filters', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    fireEvent.change(
      screen.getByPlaceholderText('Search by title, composer, voicing, or keyword…'),
      { target: { value: 'zzzz' } },
    );
    expect(screen.getByText(/No scores match\./)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear filters'));
    expect(screen.getByText(/1 result/)).toBeInTheDocument();
  });

  it('category chips filter by voicing', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<MemoryRouter><GwStoreTab /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /TTBB/ }));
    expect(screen.getByText(/No scores match\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /SATB/ }));
    expect(screen.getByText(/1 result/)).toBeInTheDocument();
  });
});
