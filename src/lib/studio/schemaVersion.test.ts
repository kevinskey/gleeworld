import { describe, it, expect } from 'vitest';
import { requiredSchemaVersion, sanitizeCc, STUDIO_SCHEMA_VERSIONS, type MidiCcEvent, type Session } from './session';
import { newSession } from './defaults';
import { validateSession } from './validate';

const base = (): Session => newSession({ ownerUserId: 'u1', tenantId: 't1' });

// validateSession returns { ok: true; session } | { ok: false; errors: string[] }
// rather than a bare { errors }. Normalize to an error array for the assertions.
const errorsOf = (s: unknown): string[] => {
  const result = validateSession(s);
  return result.ok ? [] : result.errors;
};

describe('schema versions', () => {
  it('new sessions require 1.0.0 (no cc anywhere)', () => {
    expect(requiredSchemaVersion(base())).toBe('1.0.0');
  });

  it('a clip with cc events requires 1.1.0', () => {
    const s = base();
    s.tracks.push({
      id: 'm1', kind: 'midi', name: 'Keys', color: '#888888', volume_db: 0, pan: 0,
      mute: false, solo: false, arm: false, fx: [],
      instrument: { type: 'synth_basic', params: {} },
      clips: [{ id: 'c1', kind: 'midi', start_seconds: 0, duration_seconds: 4, notes: [],
        cc: [{ controller: 64, value: 127, time_seconds: 1 }] }],
    });
    expect(requiredSchemaVersion(s)).toBe('1.1.0');
  });

  it('a premium gw: instrument requires 1.1.0 (1.0.0 clients would garble it)', () => {
    const s = base();
    s.tracks.push({
      id: 'm2', kind: 'midi', name: 'Piano', color: '#888888', volume_db: 0, pan: 0,
      mute: false, solo: false, arm: false, fx: [],
      instrument: { type: 'sampler', preset_id: 'gw:grand_piano', params: {} },
      clips: [],
    });
    expect(requiredSchemaVersion(s)).toBe('1.1.0');
  });

  it('validate accepts both known versions and rejects others', () => {
    for (const v of STUDIO_SCHEMA_VERSIONS) {
      const s = { ...base(), schema_version: v };
      expect(errorsOf(s).filter((e) => e.includes('schema_version'))).toEqual([]);
    }
    const bad = { ...base(), schema_version: '2.0.0' } as unknown as Session;
    expect(errorsOf(bad).some((e) => e.includes('schema_version'))).toBe(true);
  });

  it('a clip with a corrupt (non-array) cc does not require 1.1.0', () => {
    const s = base();
    s.tracks.push({
      id: 'm1', kind: 'midi', name: 'Keys', color: '#888888', volume_db: 0, pan: 0,
      mute: false, solo: false, arm: false, fx: [],
      instrument: { type: 'synth_basic', params: {} },
      clips: [{ id: 'c1', kind: 'midi', start_seconds: 0, duration_seconds: 4, notes: [],
        cc: 'not-an-array' as unknown as MidiCcEvent[] }],
    });
    expect(requiredSchemaVersion(s)).toBe('1.0.0');
  });
});

describe('sanitizeCc', () => {
  it('returns [] for undefined', () => {
    expect(sanitizeCc(undefined)).toEqual([]);
  });

  it('returns [] for a non-array (e.g. a corrupt string)', () => {
    expect(sanitizeCc('nope')).toEqual([]);
  });

  it('filters out garbage entries from an otherwise-array cc', () => {
    const cc = [
      { controller: 64, value: 127, time_seconds: 1 },      // valid
      null,                                                  // not an object
      { controller: -1, value: 127, time_seconds: 1 },       // controller out of range
      { controller: 64, value: 200, time_seconds: 1 },       // value out of range
      { controller: 64, value: 127, time_seconds: -1 },      // negative time
      { controller: 64, value: 127, time_seconds: Infinity }, // non-finite time
      { controller: 1.5, value: 127, time_seconds: 1 },      // non-integer controller
      { value: 127, time_seconds: 1 },                       // missing controller
      { controller: 1, value: 64, time_seconds: 2 },         // valid
    ];
    expect(sanitizeCc(cc)).toEqual([
      { controller: 64, value: 127, time_seconds: 1 },
      { controller: 1, value: 64, time_seconds: 2 },
    ]);
  });

  it('passes through a fully valid array unchanged', () => {
    const cc = [{ controller: 64, value: 127, time_seconds: 1 }, { controller: 1, value: 0, time_seconds: 2 }];
    expect(sanitizeCc(cc)).toEqual(cc);
  });
});
