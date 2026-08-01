import { describe, it, expect } from 'vitest';
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
