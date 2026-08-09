import { describe, it, expect } from 'vitest';
import { HOME_WIDGETS, widgetsFor, resolveWidgets } from '../homeWidgets';

describe('HOME_WIDGETS', () => {
  it('has unique keys', () => {
    const keys = HOME_WIDGETS.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('gives every role at least two options', () => {
    expect(widgetsFor('student').length).toBeGreaterThanOrEqual(2);
    expect(widgetsFor('faculty').length).toBeGreaterThanOrEqual(2);
  });
});

describe('widgetsFor', () => {
  it('excludes widgets the role cannot have', () => {
    expect(widgetsFor('student').map((w) => w.key)).not.toContain('needs-attention');
    expect(widgetsFor('faculty').map((w) => w.key)).not.toContain('practice-ledger');
  });
});

describe('resolveWidgets', () => {
  it('falls back to the role default when nothing is chosen', () => {
    expect(resolveWidgets('faculty', [])).toEqual(widgetsFor('faculty').slice(0, 2).map((w) => w.key));
  });
  it('caps at two', () => {
    const all = widgetsFor('student').map((w) => w.key);
    expect(resolveWidgets('student', all)).toHaveLength(2);
  });
  it('drops keys the role cannot have', () => {
    expect(resolveWidgets('student', ['needs-attention', 'today'])).toEqual(['today']);
  });
  it('drops unknown keys without throwing', () => {
    expect(resolveWidgets('student', ['nope', 'today'])).toEqual(['today']);
  });
  it('preserves the chosen order', () => {
    const [a, b] = widgetsFor('faculty').map((w) => w.key);
    expect(resolveWidgets('faculty', [b, a])).toEqual([b, a]);
  });
});
