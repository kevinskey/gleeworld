// Pure decision logic for the public-intake edge function.
//
// Deliberately free of Deno-only imports so vitest (Node) can drive it
// directly — same arrangement as _shared/permissionSlipToken.ts. All I/O is
// injected by public-intake/index.ts.

export const DEFAULT_WELCOME_SMS_TEMPLATE = 'Thanks for joining {org_name}!';

export const RATE_LIMIT_PER_EMAIL_PER_HOUR = 5;
export const RATE_LIMIT_PER_IP_PER_HOUR = 20;

// Declared here rather than in tenantBranding.ts so imports between the two
// modules run one way only: tenantBranding → publicIntake, never back.
export interface TenantBranding {
  tenantId: string | null;
  orgName: string;
  welcomeSmsTemplate: string;
}

/**
 * Fill {org_name} / {first_name} in a tenant's welcome SMS template.
 *
 * Substitution is single-pass: a value that itself contains a placeholder is
 * emitted literally, never re-expanded. A tenant's org_name is untrusted
 * input as far as this function is concerned.
 */
export function renderSmsTemplate(
  template: string | null | undefined,
  vars: { orgName: string; firstName: string },
): string {
  const source = (template ?? '').trim() || DEFAULT_WELCOME_SMS_TEMPLATE;
  const values: Record<string, string> = {
    org_name: vars.orgName,
    first_name: vars.firstName,
  };
  return source.replace(/\{(org_name|first_name)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

export function evaluateRateLimit(counts: { email: number; ip: number }): { allowed: boolean } {
  return {
    allowed:
      counts.email < RATE_LIMIT_PER_EMAIL_PER_HOUR && counts.ip < RATE_LIMIT_PER_IP_PER_HOUR,
  };
}
