// @vitest-environment jsdom
//
// useDateCardConfig.test.ts covers parseDateCardSetting's pure logic without
// any Supabase mocking. Exercising save()'s actual upsert call needs the
// Supabase client mocked, so that lives here instead of forcing mocks into
// the pure-logic file.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const upsertMock = vi.hoisted(() =>
  vi.fn(async (_payload: Record<string, unknown>, _options?: { onConflict?: string }) => ({ error: null })),
);
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
  getTenantSlug: () => 'main',
}));

import { useDateCardConfig } from './useDateCardConfig';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => {
  upsertMock.mockClear();
  fromMock.mockReset();
});

describe('useDateCardConfig save()', () => {
  it('upserts on the tenant_id conflict target, without tenant_id or id in the payload', async () => {
    // gw_branding_settings' PRIMARY KEY is a legacy singleton `id DEFAULT 1`.
    // A bare upsert arbitrates on that PK and always resolves to the `main`
    // tenant's row; the real per-tenant identity is the `tenant_id` UNIQUE
    // constraint, so save() must pin the conflict target there. This test
    // guards both halves: the explicit onConflict AND that tenant_id/id
    // never ride along in the payload (tenant_id is server-supplied by the
    // column DEFAULT + trg_set_tenant_id trigger).
    const selectChain = {
      select: vi.fn(() => selectChain),
      eq: vi.fn(() => selectChain),
      limit: vi.fn(() => selectChain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    fromMock.mockReturnValue({ select: selectChain.select, upsert: upsertMock });

    const { result } = renderHook(() => useDateCardConfig(), { wrapper });

    await act(async () => {
      await result.current.save({ v: 1, type: 'today', config: { a: 1 } });
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, options] = upsertMock.mock.calls[0];
    expect(options).toEqual({ onConflict: 'tenant_id' });
    expect(payload).not.toHaveProperty('tenant_id');
    expect(payload).not.toHaveProperty('id');
    expect(payload).toMatchObject({ date_card: { v: 1, type: 'today', config: { a: 1 } } });
  });
});
