// Session backward-compat — mastering params (B1 task 1). A legacy
// session (no `master.mastering`, no `track.eq`) must still validate,
// and `withMasteringDefaults` must fill in DEFAULT_MASTERING exactly.

import { describe, it, expect } from 'vitest';
import { validateSession } from '../validate';
import { newSession } from '../defaults';
import { DEFAULT_MASTERING, withMasteringDefaults } from '../session';

function legacySession() {
  // Minimal legacy session object: no `mastering` on master, no `eq`
  // on any track — exactly what a pre-B1 session manifest looks like.
  return newSession({ tenantId: 't-1', ownerUserId: 'u-1', title: 'Legacy session' });
}

describe('legacy session backward-compat (no mastering, no eq)', () => {
  it('validates as-is with no master.mastering field', () => {
    const s = legacySession();
    expect(s.master.mastering).toBeUndefined();
    const res = validateSession(s);
    expect(res.ok).toBe(true);
  });

  it('DEFAULT_MASTERING matches the spec verbatim', () => {
    expect(DEFAULT_MASTERING).toEqual({
      enabled: false,
      hpf_hz: 60,
      air_gain_db: 1,
      comp: { threshold_db: -18, ratio: 2, attack_ms: 10, release_ms: 250 },
      limiter: { ceiling_db: -1, release_ms: 200 },
      loudness_target_lufs: -14,
    });
  });

  it('withMasteringDefaults fills master.mastering with DEFAULT_MASTERING', () => {
    const s = legacySession();
    const filled = withMasteringDefaults(s);
    expect(filled.master.mastering).toEqual(DEFAULT_MASTERING);
    const res = validateSession(filled);
    expect(res.ok).toBe(true);
  });

  it('withMasteringDefaults does not mutate the original session', () => {
    const s = legacySession();
    withMasteringDefaults(s);
    expect(s.master.mastering).toBeUndefined();
  });

  it('withMasteringDefaults is a no-op when mastering is already present', () => {
    const s = legacySession();
    s.master.mastering = { ...DEFAULT_MASTERING, enabled: true };
    const filled = withMasteringDefaults(s);
    expect(filled.master.mastering).toEqual({ ...DEFAULT_MASTERING, enabled: true });
  });
});
