import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitPublicIntake } from '../publicIntakeClient';

// NOTE: client.ts exports `SUPABASE_PUBLISHABLE_KEY`, not `SUPABASE_ANON_KEY`.
// Verified via `grep -n "^export" src/integrations/supabase/client.ts`.
vi.mock('@/integrations/supabase/client', () => ({
  getTenantSlug: () => 'testing',
  SUPABASE_URL: 'https://supabase.example.org',
  SUPABASE_PUBLISHABLE_KEY: 'anon-key',
}));

const ACCOUNT = {
  email: 'ada@example.com', password: 'correct horse battery',
  firstName: 'Ada', lastName: 'Lovelace', phone: '5551234567',
};

describe('submitPublicIntake', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('posts to public-intake with the tenant slug attached', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, recordId: 'rec-1', accountStatus: 'created' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitPublicIntake({
      kind: 'audition', account: ACCOUNT, payload: { sectionType: 'vocal' },
    });

    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'created' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://supabase.example.org/functions/v1/public-intake');
    expect(JSON.parse(init.body).tenantSlug).toBe('testing');
    expect(init.headers['x-tenant-slug']).toBe('testing');
  });

  it('returns the server message on a rejection instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, reason: 'unavailable', message: 'That time was just taken.' }),
    }));
    const result = await submitPublicIntake({ kind: 'appointment', account: ACCOUNT, payload: {} });
    expect(result).toEqual({
      ok: false, reason: 'unavailable', message: 'That time was just taken.',
    });
  });

  it('surfaces a friendly message when the network fails outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await submitPublicIntake({ kind: 'appointment', account: ACCOUNT, payload: {} });
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/connect/i);
  });

  it('surfaces a friendly message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => { throw new Error('not json'); },
    }));
    const result = await submitPublicIntake({ kind: 'audition', account: ACCOUNT, payload: {} });
    expect(result.ok).toBe(false);
  });
});
