import { describe, it, expect } from 'vitest';
import { parseDateCardSetting } from './useDateCardConfig';

describe('parseDateCardSetting', () => {
  it('accepts a well-formed envelope', () => {
    expect(parseDateCardSetting({ v: 1, type: 'today', config: { a: 1 } }))
      .toEqual({ v: 1, type: 'today', config: { a: 1 } });
  });

  it('defaults on null', () => {
    expect(parseDateCardSetting(null)).toEqual({ v: 1, type: 'plain', config: {} });
  });

  it('defaults on a wrong version', () => {
    expect(parseDateCardSetting({ v: 2, type: 'today', config: {} }))
      .toEqual({ v: 1, type: 'plain', config: {} });
  });

  it('defaults on an unregistered type', () => {
    expect(parseDateCardSetting({ v: 1, type: 'nope', config: {} }))
      .toEqual({ v: 1, type: 'plain', config: {} });
  });

  it('coerces a missing config to an empty object', () => {
    expect(parseDateCardSetting({ v: 1, type: 'today' }))
      .toEqual({ v: 1, type: 'today', config: {} });
  });
});
