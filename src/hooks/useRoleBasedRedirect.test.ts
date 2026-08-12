import { describe, it, expect, vi } from 'vitest';
import { pickDestination } from './useRoleBasedRedirect';

describe('pickDestination — partner landing', () => {
  it('lands partners in their store backend', () => {
    expect(pickDestination({ role: 'member', partner_id: 'pt1' })).toBe('/partner');
  });
  it('platform super-admin still outranks partner', () => {
    expect(pickDestination({ is_super_admin: true, tenant_slug: 'main', partner_id: 'pt1' })).toBe('/admin/tenants');
  });
  it('tenant super-admin with a partner record goes to the portal', () => {
    expect(pickDestination({ is_super_admin: true, tenant_slug: 'demo', partner_id: 'pt1' })).toBe('/partner');
  });
  it('no partner id → unchanged role routing', () => {
    expect(pickDestination({ role: 'member' })).toBe('/dashboard');
    expect(pickDestination({ role: 'fan' })).toBe('/fan');
  });
});

// Regression: SignInDialog's immediate post-login navigate omitted
// tenant_slug, so a platform super-admin who also owns a partner record
// (Kevin + Lion & Lamb) landed on /partner instead of /admin/tenants.
vi.mock('@/integrations/supabase/client', () => ({
  getTenantSlug: () => 'main',
  supabase: {},
}));

describe('signInDestination — dialog login call site', () => {
  it('platform super-admin with a partner record lands on the command center', async () => {
    const { signInDestination } = await import('./useRoleBasedRedirect');
    expect(signInDestination(
      { role: 'super_admin', is_admin: true, is_super_admin: true }, 'pt1',
    )).toBe('/admin/tenants');
  });
  it('a plain partner still lands in the store backend', async () => {
    const { signInDestination } = await import('./useRoleBasedRedirect');
    expect(signInDestination({ role: 'member' }, 'pt1')).toBe('/partner');
  });
  it('null profile yields no destination', async () => {
    const { signInDestination } = await import('./useRoleBasedRedirect');
    expect(signInDestination(null, 'pt1')).toBeNull();
  });
});
