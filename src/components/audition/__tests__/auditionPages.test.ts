import { describe, it, expect } from 'vitest';
import { buildAuditionPages, canLeavePage } from '../auditionPages';

const FULL = {
  firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '5551234567',
  password: 'correct horse battery', confirmPassword: 'correct horse battery',
  sectionType: 'vocal',
  personalityDescription: Array.from({ length: 50 }, (_, i) => `word${i}`).join(' '),
  auditionDate: new Date('2026-09-01'), auditionTime: '3:30 PM', tshirtSize: 'M',
} as any;

describe('buildAuditionPages', () => {
  it('puts the account step last for signed-out visitors', () => {
    expect(buildAuditionPages(false)).toEqual([
      'basic', 'background', 'skills', 'personal', 'scheduling', 'account',
    ]);
  });

  it('omits the account step for signed-in users', () => {
    const pages = buildAuditionPages(true);
    expect(pages).not.toContain('account');
    expect(pages).toEqual(['basic', 'background', 'skills', 'personal', 'scheduling']);
  });

  it('never asks a signed-out visitor for credentials first', () => {
    expect(buildAuditionPages(false)[0]).toBe('basic');
  });
});

describe('canLeavePage', () => {
  const ctx = { capturedImage: 'data:image/png;base64,x', errors: {} };

  it('requires name, email, and phone on basic', () => {
    expect(canLeavePage('basic', FULL, ctx)).toBe(true);
    expect(canLeavePage('basic', { ...FULL, phone: '' } as never, ctx)).toBe(false);
  });

  it('requires a section type on background', () => {
    expect(canLeavePage('background', FULL, ctx)).toBe(true);
    expect(canLeavePage('background', { ...FULL, sectionType: '' } as never, ctx)).toBe(false);
  });

  it('lets skills through unconditionally', () => {
    expect(canLeavePage('skills', {} as never, ctx)).toBe(true);
  });

  it('puts no length condition on the personality description', () => {
    // The 50-word minimum was removed by request: any amount of text is fine.
    expect(canLeavePage('personal', FULL, ctx)).toBe(true);
    expect(canLeavePage('personal', { ...FULL, personalityDescription: 'ok' } as never, ctx)).toBe(true);
    expect(canLeavePage('personal', { ...FULL, personalityDescription: '' } as never, ctx)).toBe(true);
    expect(canLeavePage('personal', { ...FULL, personalityDescription: undefined } as never, ctx)).toBe(true);
  });

  it('does not deadlock on form-wide errors belonging to later pages', () => {
    // The regression this guards: canLeavePage('personal') used to require
    // Object.keys(ctx.errors).length === 0, but ctx.errors spans the WHOLE
    // form. auditionDate and auditionTime are required and render on the NEXT
    // page, so once validation ran their errors could never clear from here.
    // Next stayed disabled forever with no visible message — reported from
    // production with a 51-word answer typed in.
    const laterPageErrors = {
      auditionDate: { message: 'Please select an audition date' },
      auditionTime: { message: 'Please select an audition time' },
    };
    expect(canLeavePage('personal', FULL, { ...ctx, errors: laterPageErrors })).toBe(true);
  });

  it('requires slot, selfie, and shirt size on scheduling', () => {
    expect(canLeavePage('scheduling', FULL, ctx)).toBe(true);
    expect(canLeavePage('scheduling', FULL, { capturedImage: null, errors: {} })).toBe(false);
    expect(canLeavePage('scheduling', { ...FULL, tshirtSize: '' } as never, ctx)).toBe(false);
  });

  it('requires matching passwords of at least 8 characters on account', () => {
    expect(canLeavePage('account', FULL, ctx)).toBe(true);
    expect(canLeavePage('account', { ...FULL, confirmPassword: 'different' } as never, ctx)).toBe(false);
    expect(canLeavePage('account', { ...FULL, password: 'short', confirmPassword: 'short' } as never, ctx)).toBe(false);
  });
});
