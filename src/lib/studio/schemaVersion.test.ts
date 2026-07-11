import { describe, it, expect } from 'vitest';
import { requiredSchemaVersion, STUDIO_SCHEMA_VERSIONS, type Session } from './session';
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

  it('validate accepts both known versions and rejects others', () => {
    for (const v of STUDIO_SCHEMA_VERSIONS) {
      const s = { ...base(), schema_version: v };
      expect(errorsOf(s).filter((e) => e.includes('schema_version'))).toEqual([]);
    }
    const bad = { ...base(), schema_version: '2.0.0' } as unknown as Session;
    expect(errorsOf(bad).some((e) => e.includes('schema_version'))).toBe(true);
  });
});
