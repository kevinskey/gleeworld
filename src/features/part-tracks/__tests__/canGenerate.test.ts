import { describe, expect, it } from 'vitest';
import { canGenerate } from '../canGenerate';

const score = { status: 'awaiting_confirmation', validation_report: [] } as never;
const parts = [{ role: 'soprano', confirmed: true, include: true }] as never;
const rights = { basis: 'own_work', license_number: null } as never;

describe('canGenerate', () => {
  it('allows confirmed parts + rights + no warnings', () => {
    expect(canGenerate(score, parts, rights, false).ok).toBe(true);
  });
  it('blocks without rights', () => {
    const r = canGenerate(score, parts, null, false);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/rights/i);
  });
  it('blocks unconfirmed parts', () => {
    const p = [{ role: 'soprano', confirmed: false, include: true }] as never;
    expect(canGenerate(score, p, rights, false).ok).toBe(false);
  });
  it('blocks unacknowledged warnings', () => {
    const s = {
      ...(score as object),
      validation_report: [{ code: 'no_tempo', severity: 'warning', message: 'x' }],
    } as never;
    expect(canGenerate(s, parts, rights, false).ok).toBe(false);
    expect(canGenerate(s, parts, rights, true).ok).toBe(true);
  });
  it('requires license number for ccli/onelicense', () => {
    const r = { basis: 'ccli', license_number: '' } as never;
    expect(canGenerate(score, parts, r, false).ok).toBe(false);
  });
});

describe('canGenerate vocal-part guard', () => {
  it('blocks when every included part is piano/other', () => {
    const p = [
      { role: 'piano', confirmed: true, include: true },
      { role: 'piano', confirmed: true, include: true },
      { role: 'other', confirmed: true, include: true },
    ] as never;
    const r = canGenerate(score, p, rights, true);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/voice part/i);
  });
  it('allows when at least one voice part is included', () => {
    const p = [
      { role: 'soprano', confirmed: true, include: true },
      { role: 'piano', confirmed: true, include: true },
    ] as never;
    expect(canGenerate(score, p, rights, true).ok).toBe(true);
  });
});
