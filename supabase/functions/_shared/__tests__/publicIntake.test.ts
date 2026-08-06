import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  DEFAULT_WELCOME_SMS_TEMPLATE,
  evaluateRateLimit,
  RATE_LIMIT_PER_EMAIL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
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
