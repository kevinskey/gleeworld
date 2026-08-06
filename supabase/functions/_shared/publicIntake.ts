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

// ---------------------------------------------------------------------------
// C1: the rate limit must fail CLOSED, not open.
//
// index.ts's real countRecentAttempts/recordAttempt talk to Postgrest, whose
// responses are always `{ data | count, error }` — an error (including "the
// table doesn't exist yet", which is the literal current state before this
// migration is applied) must never be treated as "zero attempts." These two
// helpers are the only place that PostgREST result shape gets interpreted,
// so index.ts's real deps route through them instead of destructuring
// `{ count }`/discarding the insert result directly.
// ---------------------------------------------------------------------------

export interface PgCountResult {
  count: number | null;
  error: { message: string } | null;
}

export interface PgWriteResult {
  error: { message: string } | null;
}

/** Throws on any Postgrest error instead of letting it fall through as "ok." */
export function assertNoPgError(result: PgWriteResult, context: string): void {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
}

/**
 * Turns the two raw `{ count, error }` head-count queries into the counts
 * evaluateRateLimit expects. Throws — rather than defaulting either side to
 * 0 — the moment either query errors, so a missing table or a transient
 * Postgrest failure fails the submission closed (handleIntake's outer try
 * converts the throw into a clean 'unavailable' response) instead of
 * silently disabling rate limiting.
 */
export function resolveAttemptCounts(
  byEmail: PgCountResult,
  byIp: PgCountResult,
): { email: number; ip: number } {
  assertNoPgError(byEmail, 'countRecentAttempts(email)');
  assertNoPgError(byIp, 'countRecentAttempts(ip)');
  return { email: byEmail.count ?? 0, ip: byIp.count ?? 0 };
}

// ---------------------------------------------------------------------------
// I1: email lookup must be an exact match, never a LIKE pattern.
//
// `%` and `_` are valid characters in an email's local part under EMAIL_RE,
// so an attacker-supplied `victi_@example.com` must never resolve to
// `victim@example.com`. This helper is deliberately typed against a plain
// `.eq(...)` filter shape — there is no way to reach `.ilike` through it —
// so index.ts's real findUserByEmail is structurally prevented from doing
// a pattern match here.
// ---------------------------------------------------------------------------

export interface EmailLookupRow {
  user_id: string;
}

export interface EmailLookupQuery {
  eq(column: 'email', value: string): {
    limit(n: number): Promise<{ data: EmailLookupRow[] | null; error: unknown }>;
  };
}

/**
 * Resolves at most one profile for an exact email match. Multiple matching
 * rows (a data-integrity situation, not something a caller can trigger via
 * wildcards once the lookup is an exact match) are treated the same as zero
 * matches — handleIntake then attempts to create a new account, which fails
 * safely at the provider (duplicate email) rather than silently attaching
 * the submission to an ambiguous account. `maybeSingle()` in the old
 * implementation would have masked this same ambiguity as "no account"
 * without even the safety of an explicit check, so this makes the fallback
 * intentional rather than incidental.
 */
export async function lookupUserByEmail(
  table: EmailLookupQuery,
  email: string,
): Promise<{ id: string } | null> {
  const { data, error } = await table.eq('email', email).limit(5);
  if (error || !data || data.length !== 1) return null;
  return { id: data[0].user_id };
}

// ---------------------------------------------------------------------------
// I2: audition_applications insert must never accept arbitrary columns.
//
// `payload.application` is attacker-controlled JSON. Spreading it directly
// into the insert would let a crafted request set `tenant_id`, `id`,
// `status`, `user_id`, `session_id`, or any other column the table happens
// to have. Only the fields the real audition form actually submits
// (src/pages/AuditionPage.tsx's `submissionData`) are allowed through.
// ---------------------------------------------------------------------------

export const ALLOWED_AUDITION_APPLICATION_COLUMNS = [
  'full_name',
  'email',
  'phone_number',
  'date_of_birth',
  'profile_image_url',
  'student_id',
  'academic_year',
  'major',
  'minor',
  'gpa',
  'previous_choir_experience',
  'voice_part_preference',
  'years_of_vocal_training',
  'instruments_played',
  'music_theory_background',
  'prepared_pieces',
  'sight_reading_level',
  'why_glee_club',
  'vocal_goals',
  'availability_conflicts',
  'audition_time_slot',
  'notes',
  'section_type',
  'years_instrument_experience',
  'can_dance',
  'tshirt_size',
] as const;

export function pickAuditionApplicationFields(
  application: Record<string, unknown>,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of ALLOWED_AUDITION_APPLICATION_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(application, key)) {
      picked[key] = application[key];
    }
  }
  return picked;
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

  // countRecentAttempts / recordAttempt / preflight / findUserByEmail /
  // createAccount are all real I/O (DB, auth admin API) that can throw on a
  // transient failure (network blip, provider 5xx) with nothing wrong about
  // the submission itself. The function's signature promises it always
  // resolves to IntakeSuccess | IntakeError, never rejects, so every one of
  // those calls is covered by this single try — a throw here becomes a
  // controlled `unavailable` error instead of an uncaught rejection. `stage`
  // exists only so the log line says which dependency actually failed.
  let userId: string;
  let accountStatus: 'created' | 'existing';
  let stage = 'rate_limit_check';
  try {
    const counts = await deps.countRecentAttempts(email, input.sourceIp);
    if (!evaluateRateLimit(counts).allowed) {
      // Deliberately uniform: never disclose whether the email is registered.
      return fail('rate_limited', 'Too many attempts. Please try again shortly.');
    }

    stage = 'record_attempt';
    await deps.recordAttempt(email, input.sourceIp);

    stage = 'preflight';
    const pre = await deps.preflight(input);
    if (!pre.ok) return fail(pre.reason, pre.message);

    stage = 'find_user';
    const existing = await deps.findUserByEmail(email);
    if (existing) {
      userId = existing.id;
      accountStatus = 'existing';
    } else {
      stage = 'create_account';
      const created = await deps.createAccount({ ...input.account, email }, input.tenantSlug);
      userId = created.id;
      accountStatus = 'created';
    }
  } catch (err) {
    // `unavailable` (not `write_failed`) deliberately: write_failed carries
    // compensating-delete semantics that only apply once an account exists
    // and a record write was actually attempted. Nothing has been written
    // yet at this point, so it's a plain "come back later," not a case that
    // could ever have created an orphan.
    deps.log('intake_unavailable', { stage, kind: input.kind, error: String(err) });
    return fail(
      'unavailable',
      'We could not process your submission right now. Please try again.',
    );
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
