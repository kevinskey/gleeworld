// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const invokeMock = vi.fn(async () => ({ data: { ok: true, already_in_my_music: false, personal_score_id: 'ps-1', title: 'Sicut Cervus', cached: true }, error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: [{
        id: 'pd-1', source: 'cpdl', source_id: '123', title: 'Sicut Cervus',
        composer: 'Palestrina', voicing: 'SATB', language: 'Latin',
        source_page_url: 'https://cpdl.org/x', license_type: 'public_domain',
        attribution: null, has_cached_pdf: true, rank: 1,
      }],
      error: null,
    })),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PublicDomainSearch } from './PublicDomainSearch';

const render = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PublicDomainSearch — Save to My Music', () => {
  it('saves a result to My Music via the personal target', async () => {
    render(<PublicDomainSearch />);
    const input = screen.queryByRole('searchbox') ?? screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'sicut' } });
    const saveBtn = await screen.findByRole('button', { name: /save to my music/i }, { timeout: 3000 });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('pd-add-to-library', {
      body: { pd_work_id: 'pd-1', target: 'personal' },
    }));
    await screen.findByRole('button', { name: /saved/i });
  });
});
