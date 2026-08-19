// @vitest-environment jsdom
import type React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StorePartnerPage from './StorePartnerPage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) } },
}));
vi.mock('@/components/dashboard/DashboardPageShell', () => ({
  default: ({ title, subtitle, children }: { title?: string; subtitle?: string; children?: React.ReactNode }) => (
    <div><h1>{title}</h1><p>{subtitle}</p>{children}</div>
  ),
}));
// pdfjs-dist can't load under jsdom (no DOMMatrix); these fixtures have no
// PDF thumbnails, so a stub is faithful.
vi.mock('@/components/music-library/PDFThumbnail', () => ({
  PDFThumbnail: () => <div data-testid="pdf-thumbnail" />,
}));

const base = {
  id: 'sc1', partner_id: 'pt1', title: 'Anthem One', composer: 'K. Johnson',
  arranger: null, voicing: 'SATB', ensemble_type: null, difficulty_grade: null,
  description: null, tags: null, price_cents: 500, currency: 'USD',
  thumbnail_storage_path: null, sample_audio_storage_path: null, page_count: null,
  status: 'published', partner: { display_name: 'KPJ Music', logo_storage_path: null },
  partner_featured_order: null, gw_featured_order: null,
};

vi.mock('@/lib/store/api', () => ({
  useStorePartner: () => ({ data: {
    id: 'pt1', display_name: 'KPJ Music', bio: 'Short bio', website_url: null,
    logo_storage_path: null, status: 'active',
    owner_photo_storage_path: 'pt1/owner.jpg', history: 'Founded in 2020.', featured_order: null,
  } }),
  useStoreScores: () => ({ data: [
    base,
    { ...base, id: 'sc2', title: 'Anthem Two', partner_featured_order: 1 },
  ] }),
}));

afterEach(cleanup);

const renderAt = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/store/partners/:id" element={<StorePartnerPage />} /></Routes>
  </MemoryRouter>
);

describe('StorePartnerPage', () => {
  it('shows owner photo, history, and a Featured shelf', () => {
    renderAt('/store/partners/pt1');
    expect(screen.getByText('Founded in 2020.')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByAltText('KPJ Music')).toHaveAttribute('src', 'https://cdn.example/pt1/owner.jpg');
    // Featured shelf + full catalog both link to Anthem Two's detail page.
    expect(document.querySelectorAll('a[href="/store/scores/sc2"]').length).toBe(6);
  });

  it('highlights the ?score= target card', () => {
    renderAt('/store/partners/pt1?score=sc1');
    const wrapper = document.getElementById('score-sc1');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain('ring-2');
    expect(document.getElementById('score-sc2')?.className ?? '').not.toContain('ring-2');
  });

  it('highlights a partner-featured target without a duplicate-id collision', () => {
    // sc2 appears in both the Featured shelf and All Scores. Only the
    // All Scores grid owns highlighting (passes highlightId), so it must be
    // the only one to emit the score-sc2 anchor id — otherwise
    // getElementById finds the unringed Featured shelf copy instead.
    renderAt('/store/partners/pt1?score=sc2');
    const matches = document.querySelectorAll('[id="score-sc2"]');
    expect(matches.length).toBe(1);
    expect(matches[0].className).toContain('ring-2');
  });
});
