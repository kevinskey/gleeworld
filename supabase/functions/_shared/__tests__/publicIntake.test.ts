import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  DEFAULT_WELCOME_SMS_TEMPLATE,
  evaluateRateLimit,
  RATE_LIMIT_PER_EMAIL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
} from '../publicIntake';
import { handleIntake, type IntakeDeps, type IntakeInput } from '../publicIntake';

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
});
