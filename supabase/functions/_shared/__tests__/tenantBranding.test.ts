import { describe, it, expect, vi } from 'vitest';
import { resolveTenantBranding, DEFAULT_ORG_NAME } from '../tenantBranding';
import { DEFAULT_WELCOME_SMS_TEMPLATE } from '../publicIntake';

describe('resolveTenantBranding', () => {
  it('returns the tenant row when the slug resolves', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-1',
      org_name: "Doc's World",
      welcome_sms_template: 'Thank you for coming to {org_name}!',
    });
    const result = await resolveTenantBranding(query, 'docsworld');
    expect(query).toHaveBeenCalledWith('docsworld');
    expect(result).toEqual({
      tenantId: 't-1',
      orgName: "Doc's World",
      welcomeSmsTemplate: 'Thank you for coming to {org_name}!',
    });
  });

  it('falls back to the default template when the tenant has not set one', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-2', org_name: 'Testing Choir', welcome_sms_template: null,
    });
    const result = await resolveTenantBranding(query, 'testing');
    expect(result.welcomeSmsTemplate).toBe(DEFAULT_WELCOME_SMS_TEMPLATE);
  });

  it('falls back to the default org name when the row has none', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-3', org_name: '   ', welcome_sms_template: null,
    });
    const result = await resolveTenantBranding(query, 'blank');
    expect(result.orgName).toBe(DEFAULT_ORG_NAME);
  });

  it('never queries when the slug is missing, and returns a null tenantId', async () => {
    const query = vi.fn();
    const result = await resolveTenantBranding(query, null);
    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({
      tenantId: null,
      orgName: DEFAULT_ORG_NAME,
      welcomeSmsTemplate: DEFAULT_WELCOME_SMS_TEMPLATE,
    });
  });

  it('degrades to defaults when the query throws rather than failing the submission', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db down'));
    const result = await resolveTenantBranding(query, 'testing');
    expect(result.orgName).toBe(DEFAULT_ORG_NAME);
    expect(result.tenantId).toBeNull();
  });

  it('does not cache across tenants', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ tenant_id: 'a', org_name: 'Alpha', welcome_sms_template: null })
      .mockResolvedValueOnce({ tenant_id: 'b', org_name: 'Beta', welcome_sms_template: null });
    expect((await resolveTenantBranding(query, 'alpha')).orgName).toBe('Alpha');
    expect((await resolveTenantBranding(query, 'beta')).orgName).toBe('Beta');
  });
});
