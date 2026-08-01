// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PartnerScoresList from './PartnerScoresList';
import type { PartnerScore } from '@/lib/partner/api';

const score = (over: Partial<PartnerScore>): PartnerScore => ({
  id: 's1', partner_id: 'p1', title: 'Ave Maria', composer: 'Gounod', arranger: null,
  voicing: 'SATB', ensemble_type: 'choir', difficulty_grade: null, language: null,
  description: null, tags: null, price_cents: 500, currency: 'usd',
  master_storage_path: 'p1/s1.pdf', thumbnail_storage_path: null,
  sample_audio_storage_path: null, page_count: null, status: 'published',
  created_at: '2026-07-31T00:00:00Z', updated_at: '2026-07-31T00:00:00Z',
  partner_featured_order: null, gw_featured_order: null, ...over,
});

const state: { scores: PartnerScore[]; isLoading: boolean } = { scores: [], isLoading: false };

const updateStatusMutate = vi.fn();
const setFeaturedMutate = vi.fn();

vi.mock('@/lib/partner/api', () => ({
  useMyPartnerScores: () => ({ data: state.scores, isLoading: state.isLoading }),
  useUpdatePartnerScoreStatus: () => ({ mutate: updateStatusMutate, isPending: false }),
  useSetPartnerScoreFeatured: () => ({ mutate: setFeaturedMutate, isPending: false }),
}));

afterEach(() => {
  cleanup();
  updateStatusMutate.mockClear();
  setFeaturedMutate.mockClear();
});

function renderList() {
  render(
    <MemoryRouter>
      <PartnerScoresList />
    </MemoryRouter>
  );
}

describe('PartnerScoresList — featured picker', () => {
  it('shows "Feature on my store" for a published unfeatured score and calls mutate with the next order', () => {
    state.scores = [
      score({ id: '1', title: 'Ave Maria', status: 'published', partner_featured_order: null }),
      score({ id: '2', title: 'Sicut Cervus', status: 'published', partner_featured_order: 1 }),
    ];
    state.isLoading = false;
    renderList();

    const featureBtn = screen.getByRole('button', { name: 'Feature on my store' });
    fireEvent.click(featureBtn);
    expect(setFeaturedMutate).toHaveBeenCalledWith({ id: '1', partner_featured_order: 2 });
  });

  it('shows the featured control on the already-featured row', () => {
    state.scores = [
      score({ id: '1', title: 'Ave Maria', status: 'published', partner_featured_order: null }),
      score({ id: '2', title: 'Sicut Cervus', status: 'published', partner_featured_order: 1 }),
    ];
    state.isLoading = false;
    renderList();

    expect(screen.getByRole('button', { name: '★ Featured — remove' })).toBeInTheDocument();
  });

  it('removes featured status when clicking the remove control', () => {
    state.scores = [
      score({ id: '2', title: 'Sicut Cervus', status: 'published', partner_featured_order: 1 }),
    ];
    state.isLoading = false;
    renderList();

    fireEvent.click(screen.getByRole('button', { name: '★ Featured — remove' }));
    expect(setFeaturedMutate).toHaveBeenCalledWith({ id: '2', partner_featured_order: null });
  });

  it('does not show a feature control for draft (unpublished) scores', () => {
    state.scores = [
      score({ id: '3', title: 'Draft Piece', status: 'draft', partner_featured_order: null }),
    ];
    state.isLoading = false;
    renderList();

    expect(screen.queryByRole('button', { name: 'Feature on my store' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '★ Featured — remove' })).not.toBeInTheDocument();
  });
});
