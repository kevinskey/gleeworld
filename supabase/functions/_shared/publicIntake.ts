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

export type IntakeKind = 'appointment' | 'audition';

export interface IntakeAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface IntakeInput {
  kind: IntakeKind;
  tenantSlug: string | null;
  sourceIp: string;
  account: IntakeAccount;
  payload: Record<string, unknown>;
}

export type IntakeFailure =
  | 'rate_limited'
  | 'invalid_input'
  | 'unavailable'
  | 'no_active_session'
  | 'write_failed';

export interface IntakeDeps {
  countRecentAttempts(email: string, ip: string): Promise<{ email: number; ip: number }>;
  recordAttempt(email: string, ip: string): Promise<void>;
  preflight(
    input: IntakeInput,
  ): Promise<{ ok: true } | { ok: false; reason: IntakeFailure; message: string }>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  createAccount(account: IntakeAccount, tenantSlug: string | null): Promise<{ id: string }>;
  deleteAccount(userId: string): Promise<void>;
  writeRecord(input: IntakeInput, userId: string): Promise<{ id: string }>;
  branding(tenantSlug: string | null): Promise<TenantBranding>;
  sendEmail(args: {
    to: string; kind: IntakeKind; recordId: string; input: IntakeInput;
  }): Promise<void>;
  sendSms(args: { to: string; body: string }): Promise<void>;
  log(event: string, detail: unknown): void;
}

export interface IntakeSuccess {
  ok: true;
  recordId: string;
  accountStatus: 'created' | 'existing';
}

export interface IntakeError {
  ok: false;
  reason: IntakeFailure;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function fail(reason: IntakeFailure, message: string): IntakeError {
  return { ok: false, reason, message };
}

/**
 * Orchestrates a public submission.
 *
 * Ordering is load-bearing:
 *   validate → rate-limit → pre-flight → account → record → notify
 *
 * The account must precede the record because audition_applications.user_id
 * is NOT NULL REFERENCES auth.users(id). The no-orphan guarantee therefore
 * comes from pre-flight (catching everything that can be caught without
 * writing) plus a compensating delete of an account we created ourselves. An
 * account that already existed is never created, never modified, never
 * deleted — that rule is what stops this endpoint being an account-takeover
 * vector.
 */
export async function handleIntake(
  deps: IntakeDeps,
  input: IntakeInput,
): Promise<IntakeSuccess | IntakeError> {
  const email = input.account.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return fail('invalid_input', 'Please enter a valid email address.');
  }
  if ((input.account.password ?? '').length < MIN_PASSWORD_LENGTH) {
    return fail('invalid_input', 'Please choose a password of at least 8 characters.');
  }

  const counts = await deps.countRecentAttempts(email, input.sourceIp);
  if (!evaluateRateLimit(counts).allowed) {
    // Deliberately uniform: never disclose whether the email is registered.
    return fail('rate_limited', 'Too many attempts. Please try again shortly.');
  }
  await deps.recordAttempt(email, input.sourceIp);

  const pre = await deps.preflight(input);
  if (!pre.ok) return fail(pre.reason, pre.message);

  const existing = await deps.findUserByEmail(email);
  let userId: string;
  let accountStatus: 'created' | 'existing';
  if (existing) {
    userId = existing.id;
    accountStatus = 'existing';
  } else {
    const created = await deps.createAccount({ ...input.account, email }, input.tenantSlug);
    userId = created.id;
    accountStatus = 'created';
  }

  let recordId: string;
  try {
    const record = await deps.writeRecord(input, userId);
    recordId = record.id;
  } catch (err) {
    if (accountStatus === 'created') {
      try {
        await deps.deleteAccount(userId);
      } catch (cleanupErr) {
        // Nothing further we can do; surface it so it can be reconciled.
        deps.log('orphan_account', { userId, email, error: String(cleanupErr) });
      }
    }
    deps.log('write_failed', { kind: input.kind, error: String(err) });
    return fail('write_failed', 'We could not save your submission. Please try again.');
  }

  // Notifications are best-effort. The record is real either way, so a dead
  // mail or SMS provider must never turn a successful submission into a
  // failure the visitor sees.
  try {
    await deps.sendEmail({ to: email, kind: input.kind, recordId, input });
  } catch (err) {
    deps.log('notify_failed', { channel: 'email', error: String(err) });
  }

  const phone = (input.account.phone ?? '').trim();
  if (phone) {
    try {
      const brand = await deps.branding(input.tenantSlug);
      await deps.sendSms({
        to: phone,
        body: renderSmsTemplate(brand.welcomeSmsTemplate, {
          orgName: brand.orgName,
          firstName: input.account.firstName,
        }),
      });
    } catch (err) {
      deps.log('notify_failed', { channel: 'sms', error: String(err) });
    }
  }

  return { ok: true, recordId, accountStatus };
}
