import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  DEFAULT_WELCOME_SMS_TEMPLATE,
  evaluateRateLimit,
  RATE_LIMIT_PER_EMAIL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
  handleIntake,
  resolveAttemptCounts,
  assertNoPgError,
  lookupUserByEmail,
  pickAuditionApplicationFields,
  ALLOWED_AUDITION_APPLICATION_COLUMNS,
  type IntakeDeps,
  type IntakeInput,
  type EmailLookupQuery,
} from '../publicIntake';

describe('renderSmsTemplate', () => {
  it('substitutes org_name and first_name', () => {
    expect(
      renderSmsTemplate('Thank you for coming to {org_name}, {first_name}!', {
        orgName: "Doc's World",
        firstName: 'Ada',
      }),
    ).toBe("Thank you for coming to Doc's World, Ada!");
  });

  it('falls back to the default template when none is set', () => {
    expect(renderSmsTemplate(null, { orgName: 'Testing Choir', firstName: 'Ada' }))
      .toBe('Thanks for joining Testing Choir!');
    expect(renderSmsTemplate('   ', { orgName: 'Testing Choir', firstName: 'Ada' }))
      .toBe('Thanks for joining Testing Choir!');
  });

  it('substitutes every occurrence of a placeholder', () => {
    expect(renderSmsTemplate('{org_name} — {org_name}', { orgName: 'X', firstName: 'A' }))
      .toBe('X — X');
  });

  it('leaves unknown placeholders untouched rather than blanking them', () => {
    expect(renderSmsTemplate('Hi {first_name}, see {nonsense}', { orgName: 'X', firstName: 'Ada' }))
      .toBe('Hi Ada, see {nonsense}');
  });

  it('does not let template values inject further placeholders', () => {
    // A tenant whose org_name literally contains "{first_name}" must not have
    // it expanded — otherwise branding text becomes a template injection.
    expect(renderSmsTemplate('{org_name}', { orgName: 'A {first_name} B', firstName: 'Ada' }))
      .toBe('A {first_name} B');
  });

  it('exports the documented default', () => {
    expect(DEFAULT_WELCOME_SMS_TEMPLATE).toBe('Thanks for joining {org_name}!');
  });
});

describe('assertNoPgError (C1)', () => {
  it('does nothing when there is no error', () => {
    expect(() => assertNoPgError({ error: null }, 'ctx')).not.toThrow();
  });

  it('throws when the result carries a Postgrest error', () => {
    // This is the exact shape a Postgrest response takes when
    // gw_public_intake_attempts doesn't exist yet — the literal state
    // before this feature's migration is applied. Reverting the C1 fix
    // (going back to discarding `recordAttempt`'s insert result) would make
    // this a silent no-op instead of a thrown error, and this test would
    // stop failing to catch that regression.
    expect(() =>
      assertNoPgError({ error: { message: 'relation "gw_public_intake_attempts" does not exist' } }, 'recordAttempt'),
    ).toThrow(/gw_public_intake_attempts/);
  });
});

describe('resolveAttemptCounts (C1)', () => {
  it('returns the counts when neither query errored', () => {
    expect(
      resolveAttemptCounts({ count: 2, error: null }, { count: 7, error: null }),
    ).toEqual({ email: 2, ip: 7 });
  });

  it('treats a null count as zero, not an error', () => {
    expect(
      resolveAttemptCounts({ count: null, error: null }, { count: null, error: null }),
    ).toEqual({ email: 0, ip: 0 });
  });

  it('throws — does not default to 0 — when the email-count query errors', () => {
    // The vulnerability this guards: the old code destructured only
    // `{ count }` from this result, so `byEmail.count ?? 0` silently became
    // 0 attempts whenever the table was missing, mid-migration, or the
    // query failed for any other reason — disabling the rate limit with no
    // log line. A revert to that destructuring pattern would make this
    // throw disappear and the rate limit would fail open again.
    expect(() =>
      resolveAttemptCounts(
        { count: null, error: { message: 'relation "gw_public_intake_attempts" does not exist' } },
        { count: 0, error: null },
      ),
    ).toThrow(/countRecentAttempts\(email\)/);
  });

  it('throws when the IP-count query errors, even if the email count succeeded', () => {
    expect(() =>
      resolveAttemptCounts(
        { count: 0, error: null },
        { count: null, error: { message: 'timeout' } },
      ),
    ).toThrow(/countRecentAttempts\(ip\)/);
  });
});

describe('lookupUserByEmail (I1)', () => {
  // A fake table that only implements exact equality — there is no `ilike`
  // on this object at all, so a call site that regressed to
  // `.ilike('email', email)` would throw `table.ilike is not a function`
  // rather than silently matching.
  function exactMatchTable(rows: Array<{ user_id: string; email: string }>): EmailLookupQuery {
    return {
      eq(column, value) {
        return {
          async limit() {
            return { data: rows.filter((r) => r[column] === value), error: null };
          },
        };
      },
    };
  }

  it('resolves an exact email match', async () => {
    const table = exactMatchTable([{ user_id: 'ada-1', email: 'ada@example.com' }]);
    expect(await lookupUserByEmail(table, 'ada@example.com')).toEqual({ id: 'ada-1' });
  });

  it('does not resolve a LIKE-wildcard email to a different victim account', async () => {
    // This is the I1 vulnerability itself: `%` and `_` pass the email
    // regex, so a `.ilike('email', email)` lookup would let an attacker's
    // `victi_@example.com` match victim@example.com. Because this table
    // only offers `.eq`, the wildcard characters are matched literally and
    // there is no account to find.
    const table = exactMatchTable([{ user_id: 'victim-1', email: 'victim@example.com' }]);
    expect(await lookupUserByEmail(table, 'victi_@example.com')).toBeNull();
    expect(await lookupUserByEmail(table, 'victim%@example.com')).toBeNull();
  });

  it('treats multiple matching rows as unresolved rather than guessing which one', async () => {
    const table = exactMatchTable([
      { user_id: 'a', email: 'dup@example.com' },
      { user_id: 'b', email: 'dup@example.com' },
    ]);
    expect(await lookupUserByEmail(table, 'dup@example.com')).toBeNull();
  });

  it('returns null on no match', async () => {
    const table = exactMatchTable([]);
    expect(await lookupUserByEmail(table, 'nobody@example.com')).toBeNull();
  });

  it('returns null when the query itself errors', async () => {
    const table: EmailLookupQuery = {
      eq: () => ({ limit: async () => ({ data: null, error: { message: 'down' } }) }),
    };
    expect(await lookupUserByEmail(table, 'ada@example.com')).toBeNull();
  });
});

describe('pickAuditionApplicationFields (I2)', () => {
  it('passes through every allowed column', () => {
    const application = Object.fromEntries(
      ALLOWED_AUDITION_APPLICATION_COLUMNS.map((c) => [c, `value-${c}`]),
    );
    expect(pickAuditionApplicationFields(application)).toEqual(application);
  });

  it('strips columns that let a crafted request escalate privilege', () => {
    const application = {
      full_name: 'Ada Lovelace',
      tenant_id: 'stranger-tenant',
      id: 'attacker-chosen-id',
      user_id: 'someone-elses-account',
      session_id: 'stranger-session',
      status: 'accepted',
    };
    expect(pickAuditionApplicationFields(application)).toEqual({ full_name: 'Ada Lovelace' });
  });

  it('does not invent fields that were never present', () => {
    expect(pickAuditionApplicationFields({})).toEqual({});
  });
});

describe('evaluateRateLimit', () => {
  it('allows counts below both thresholds', () => {
    expect(evaluateRateLimit({ email: 0, ip: 0 }).allowed).toBe(true);
    expect(evaluateRateLimit({ email: 4, ip: 19 }).allowed).toBe(true);
  });

  it('blocks once the email threshold is reached', () => {
    expect(evaluateRateLimit({ email: RATE_LIMIT_PER_EMAIL_PER_HOUR, ip: 0 }).allowed).toBe(false);
  });

  it('blocks once the IP threshold is reached', () => {
    expect(evaluateRateLimit({ email: 0, ip: RATE_LIMIT_PER_IP_PER_HOUR }).allowed).toBe(false);
  });

  it('uses the documented thresholds', () => {
    expect(RATE_LIMIT_PER_EMAIL_PER_HOUR).toBe(5);
    expect(RATE_LIMIT_PER_IP_PER_HOUR).toBe(20);
  });
});

const INPUT: IntakeInput = {
  kind: 'audition',
  tenantSlug: 'testing',
  sourceIp: '203.0.113.9',
  account: { email: 'ada@example.com', password: 'correct horse battery', firstName: 'Ada', lastName: 'Lovelace', phone: '5551234567' },
  payload: { sectionType: 'vocal' },
};

function makeDeps(over: Partial<IntakeDeps> = {}): IntakeDeps {
  return {
    countRecentAttempts: vi.fn().mockResolvedValue({ email: 0, ip: 0 }),
    recordAttempt: vi.fn().mockResolvedValue(undefined),
    preflight: vi.fn().mockResolvedValue({ ok: true }),
    findUserByEmail: vi.fn().mockResolvedValue(null),
    createAccount: vi.fn().mockResolvedValue({ id: 'new-user' }),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    writeRecord: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    branding: vi.fn().mockResolvedValue({
      tenantId: 't-1', orgName: "Doc's World",
      welcomeSmsTemplate: 'Thank you for coming to {org_name}!',
    }),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    sendSms: vi.fn().mockResolvedValue(undefined),
    log: vi.fn(),
    ...over,
  };
}

describe('handleIntake', () => {
  it('creates the account, writes the record, and notifies', async () => {
    const deps = makeDeps();
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'created' });
    expect(deps.createAccount).toHaveBeenCalledOnce();
    expect(deps.writeRecord).toHaveBeenCalledWith(INPUT, 'new-user');
    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(deps.sendSms).toHaveBeenCalledWith({
      to: '5551234567', body: "Thank you for coming to Doc's World!",
    });
  });

  it('links an existing account without ever modifying it', async () => {
    const deps = makeDeps({ findUserByEmail: vi.fn().mockResolvedValue({ id: 'old-user' }) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'existing' });
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.deleteAccount).not.toHaveBeenCalled();
    expect(deps.writeRecord).toHaveBeenCalledWith(INPUT, 'old-user');
  });

  it('deletes the account it just created when the record write fails', async () => {
    const deps = makeDeps({ writeRecord: vi.fn().mockRejectedValue(new Error('slot gone')) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'write_failed',
      message: 'We could not save your submission. Please try again.',
    });
    expect(deps.deleteAccount).toHaveBeenCalledWith('new-user');
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.sendSms).not.toHaveBeenCalled();
  });

  it('never deletes a pre-existing account when the record write fails', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'old-user' }),
      writeRecord: vi.fn().mockRejectedValue(new Error('slot gone')),
    });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(false);
    expect(deps.deleteAccount).not.toHaveBeenCalled();
  });

  it('rejects a rate-limited submission before touching anything', async () => {
    const deps = makeDeps({ countRecentAttempts: vi.fn().mockResolvedValue({ email: 5, ip: 0 }) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'rate_limited',
      message: 'Too many attempts. Please try again shortly.',
    });
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.preflight).not.toHaveBeenCalled();
  });

  it('rejects a failed pre-flight before creating an account', async () => {
    const deps = makeDeps({
      preflight: vi.fn().mockResolvedValue({
        ok: false, reason: 'no_active_session',
        message: 'No active audition session found. Please contact administration.',
      }),
    });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'no_active_session',
      message: 'No active audition session found. Please contact administration.',
    });
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.writeRecord).not.toHaveBeenCalled();
  });

  it('records the attempt even when the submission is rejected', async () => {
    const deps = makeDeps({ preflight: vi.fn().mockResolvedValue({ ok: false, reason: 'unavailable', message: 'Taken' }) });
    await handleIntake(deps, INPUT);
    expect(deps.recordAttempt).toHaveBeenCalledWith('ada@example.com', '203.0.113.9');
  });

  it('still succeeds when the email send throws', async () => {
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('resend down')) });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(true);
    expect(deps.log).toHaveBeenCalledWith('notify_failed', expect.anything());
  });

  it('still succeeds when the SMS send throws', async () => {
    const deps = makeDeps({ sendSms: vi.fn().mockRejectedValue(new Error('twilio down')) });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(true);
  });

  it('skips SMS entirely when no phone was given', async () => {
    const deps = makeDeps();
    const noPhone = { ...INPUT, account: { ...INPUT.account, phone: null } };
    const result = await handleIntake(deps, noPhone);
    expect(result.ok).toBe(true);
    expect(deps.sendSms).not.toHaveBeenCalled();
  });

  it('rejects a malformed email without hitting the database', async () => {
    const deps = makeDeps();
    const bad = { ...INPUT, account: { ...INPUT.account, email: 'not-an-email' } };
    const result = await handleIntake(deps, bad);
    expect(result).toEqual({
      ok: false, reason: 'invalid_input', message: 'Please enter a valid email address.',
    });
    expect(deps.countRecentAttempts).not.toHaveBeenCalled();
  });

  it('rejects a password under 8 characters', async () => {
    const deps = makeDeps();
    const bad = { ...INPUT, account: { ...INPUT.account, password: 'short' } };
    const result = await handleIntake(deps, bad);
    expect(result.reason).toBe('invalid_input');
    expect(deps.createAccount).not.toHaveBeenCalled();
  });

  it('normalizes the email to lowercase before lookup so case cannot fork an account', async () => {
    const deps = makeDeps();
    await handleIntake(deps, { ...INPUT, account: { ...INPUT.account, email: 'Ada@Example.COM' } });
    expect(deps.findUserByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('resolves to an IntakeError instead of rejecting when createAccount throws', async () => {
    const deps = makeDeps({ createAccount: vi.fn().mockRejectedValue(new Error('auth admin down')) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'unavailable',
      message: 'We could not process your submission right now. Please try again.',
    });
    expect(deps.writeRecord).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.sendSms).not.toHaveBeenCalled();
  });

  it('still returns write_failed, with the orphan logged, when the compensating deleteAccount itself throws', async () => {
    const deps = makeDeps({
      writeRecord: vi.fn().mockRejectedValue(new Error('slot gone')),
      deleteAccount: vi.fn().mockRejectedValue(new Error('cannot delete')),
    });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'write_failed',
      message: 'We could not save your submission. Please try again.',
    });
    expect(deps.deleteAccount).toHaveBeenCalledWith('new-user');
    expect(deps.log).toHaveBeenCalledWith('orphan_account', expect.anything());
  });
});
