// @vitest-environment jsdom
import '../../vitest.fake-idb';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { saveToVault, listVault, removeFromVault } from '@/lib/offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/components/music-library/ScoreViewerDialog', () => ({ ScoreViewerDialog: () => null }));

import MyMusicOfflinePage from './MyMusicOfflinePage';

const score: PersonalScore = {
  id: 's1', user_id: 'u1', title: 'Ave Verum', composer: 'Byrd', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/x.pdf', thumbnail_path: null, ext_catalog_item_id: null,
  external_url: null, tags: [], is_favorite: false, created_at: '2026-08-17T00:00:00Z',
};

const render = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter><MyMusicOfflinePage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(async () => { for (const e of await listVault()) await removeFromVault(e.id); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MyMusicOfflinePage', () => {
  it('shows the empty state when the vault is empty', async () => {
    render();
    expect(await screen.findByText(/no scores saved to this device/i)).toBeInTheDocument();
  });

  it('lists vault entries without touching the network', async () => {
    await saveToVault(score, new Blob(['%PDF-fake'], { type: 'application/pdf' }));
    render();
    expect(await screen.findByText('Ave Verum')).toBeInTheDocument();
    expect(screen.getByText(/byrd/i)).toBeInTheDocument();
  });
});
