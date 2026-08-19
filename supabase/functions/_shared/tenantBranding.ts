// Tenant-scoped branding lookup for public (unauthenticated) flows.
//
// _shared/branding.ts:getOrgName() must NOT be used here. It selects
// gw_branding_settings with .order("id").limit(1) and memoizes the result for
// 60s. Edge functions run as service role, which bypasses RLS, so that query
// returns whichever tenant happens to sort first — and then pins it for every
// other tenant's requests for the next minute. This module resolves by slug
// and holds no cache.

import { DEFAULT_WELCOME_SMS_TEMPLATE, type TenantBranding } from './publicIntake.ts';

export const DEFAULT_ORG_NAME = 'GleeWorld';

export type { TenantBranding };

export type BrandingQuery = (slug: string) => Promise<{
  tenant_id: string;
  org_name: string | null;
  welcome_sms_template: string | null;
} | null>;

const FALLBACK: TenantBranding = {
  tenantId: null,
  orgName: DEFAULT_ORG_NAME,
  welcomeSmsTemplate: DEFAULT_WELCOME_SMS_TEMPLATE,
};

export async function resolveTenantBranding(
  query: BrandingQuery,
  tenantSlug: string | null | undefined,
): Promise<TenantBranding> {
  const slug = (tenantSlug ?? '').trim();
  if (!slug) return { ...FALLBACK };

  try {
    const row = await query(slug);
    if (!row) return { ...FALLBACK };
    return {
      tenantId: row.tenant_id,
      orgName: row.org_name?.trim() || DEFAULT_ORG_NAME,
      welcomeSmsTemplate: row.welcome_sms_template?.trim() || DEFAULT_WELCOME_SMS_TEMPLATE,
    };
  } catch {
    // Branding is cosmetic; never fail a submission over it.
    return { ...FALLBACK };
  }
}
