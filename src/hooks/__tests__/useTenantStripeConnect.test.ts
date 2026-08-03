// @vitest-environment jsdom
/**
 * Unit tests for useTenantStripeConnect.
 *
 * Strategy: mock @/integrations/supabase/client and assert:
 *   - hook calls supabase.from('gw_tenants').select(...)
 *   - enabled === true iff stripe_charges_enabled === true
 *   - accountId / chargesEnabled / payoutsEnabled reflect the row values
 *   - returns enabled=false, accountId=null when tenant has no Connect data
 *
 * DB round-trip / RLS correctness deferred to Task 17 (Playwright E2E).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ── Supabase fluent-chain builder ─────────────────────────────────────────────
type ChainResult = { data: unknown; error: null | { message: string } };

function makeChain(result: ChainResult) {
  const calls: Record<string, unknown[][]> = {};
  const record = (method: string, args: unknown[]) => {
    (calls[method] ??= []).push(args);
  };

  const proxy: Record<string, unknown> = {};

  const handler: ProxyHandler<typeof proxy> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => void) => Promise.resolve(result).then(resolve);
      }
      if (prop === '_calls') return calls;
      return (...args: unknown[]) => {
        record(prop, args);
        return new Proxy(proxy, handler);
      };
    },
  };

  return new Proxy(proxy, handler) as unknown as {
    _calls: Record<string, unknown[][]>;
  } & Record<string, (...a: unknown[]) => unknown>;
}

// ── Module mock ───────────────────────────────────────────────────────────────
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Import hook AFTER mock registration so vi.mock hoisting applies.
import { useTenantStripeConnect } from '../useTenantStripeConnect';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TENANT_SLUG = 'test-tenant';

function setTenantSlug(slug: string | undefined) {
  (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__ = slug
    ? { tenant: slug }
    : undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  setTenantSlug(TENANT_SLUG);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTenantStripeConnect', () => {
  it('calls supabase.from("gw_tenants") with the correct select columns', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('gw_tenants');
    const selectArgs = chain._calls['select']?.[0];
    expect(selectArgs?.[0]).toContain('stripe_account_id');
    expect(selectArgs?.[0]).toContain('stripe_charges_enabled');
    expect(selectArgs?.[0]).toContain('stripe_payouts_enabled');
  });

  it('returns enabled=false and accountId=null when tenant has no Connect account', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(false);
    expect(result.current.accountId).toBeNull();
    expect(result.current.chargesEnabled).toBe(false);
    expect(result.current.payoutsEnabled).toBe(false);
  });

  it('returns enabled=true when stripe_charges_enabled is true', async () => {
    const row = {
      stripe_account_id: 'acct_123',
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
    };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(true);
    expect(result.current.accountId).toBe('acct_123');
    expect(result.current.chargesEnabled).toBe(true);
    expect(result.current.payoutsEnabled).toBe(true);
  });

  it('returns enabled=false when stripe_charges_enabled is false even if account_id is set', async () => {
    const row = {
      stripe_account_id: 'acct_456',
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
    };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(false);
    expect(result.current.accountId).toBe('acct_456');
    expect(result.current.chargesEnabled).toBe(false);
  });

  it('returns enabled=false and accountId=null on query error', async () => {
    const chain = makeChain({ data: null, error: { message: 'db error' } });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(false);
    expect(result.current.accountId).toBeNull();
  });

  it('returns enabled=false without querying when no tenant slug is available', async () => {
    setTenantSlug(undefined);

    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
    expect(result.current.accountId).toBeNull();
  });
});
