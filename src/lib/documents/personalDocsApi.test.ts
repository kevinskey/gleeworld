import { describe, it, expect } from 'vitest';
import { assertRowReturned } from './personalDocsApi';

it('returns the first row when present', () =>
  expect(assertRowReturned([{ id: 'a' }], 'save')).toEqual({ id: 'a' }));
it('throws on empty array (silent RLS failure)', () =>
  expect(() => assertRowReturned([], 'save')).toThrow(/save/));
it('throws on null', () =>
  expect(() => assertRowReturned(null, 'load')).toThrow(/load/));
