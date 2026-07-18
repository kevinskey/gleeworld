import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { CalendarDays } from 'lucide-react';
import { safeDateCardConfig, isDateCardAvailable, getDateCardModule, DEFAULT_DATE_CARD_TYPE } from './registry';
import type { DateCardModule } from './types';

const stub: DateCardModule<z.ZodObject<{ label: z.ZodDefault<z.ZodString> }>> = {
  type: 'stub',
  name: 'Stub',
  description: 'test double',
  icon: CalendarDays,
  configSchema: z.object({ label: z.string().default('hi') }),
  defaultConfig: { label: 'hi' },
  Render: () => null,
};

const gated = { ...stub, type: 'gated', requiredAddon: 'liturgy_planner' };

describe('safeDateCardConfig', () => {
  it('returns parsed config when valid', () => {
    expect(safeDateCardConfig(stub, { label: 'custom' })).toEqual({ label: 'custom' });
  });

  it('falls back to defaultConfig on a wrong-typed field', () => {
    expect(safeDateCardConfig(stub, { label: 42 })).toEqual({ label: 'hi' });
  });

  it('falls back to defaultConfig on null', () => {
    expect(safeDateCardConfig(stub, null)).toEqual({ label: 'hi' });
  });
});

describe('isDateCardAvailable', () => {
  it('is true when no addon is required', () => {
    expect(isDateCardAvailable(stub, [])).toBe(true);
  });

  it('is false when the required addon is absent', () => {
    expect(isDateCardAvailable(gated, ['viewer'])).toBe(false);
  });

  it('is true when the required addon is present', () => {
    expect(isDateCardAvailable(gated, ['viewer', 'liturgy_planner'])).toBe(true);
  });
});

describe('getDateCardModule', () => {
  it('returns undefined for an unknown type', () => {
    expect(getDateCardModule('does-not-exist')).toBeUndefined();
  });

  it('exposes plain as the default type', () => {
    expect(DEFAULT_DATE_CARD_TYPE).toBe('plain');
  });

  // Regression: a bare `DATE_CARD_REGISTRY[type]` index falls through to
  // Object.prototype for these keys, returning a truthy non-module value
  // that parseDateCardSetting would then accept as "registered" — crashing
  // DateCardSlot when it dereferences mod.configSchema.safeParse. Any
  // tenant admin who can write the date_card JSONB column directly can
  // reach this, white-screening the whole app for every member.
  it.each(['__proto__', 'constructor', 'toString'])(
    'returns undefined for the prototype-chain key %s',
    (key) => {
      expect(getDateCardModule(key)).toBeUndefined();
    },
  );
});
