// Session validator — markers array. Markers are optional (older
// sessions and the iOS mirror don't write them), but when present each
// entry must be well-formed or the validator flags it.

import { describe, it, expect } from 'vitest';
import { validateSession } from '../validate';
import { newSession } from '../defaults';

function baseSession() {
  return newSession({ tenantId: 't-1', ownerUserId: 'u-1', title: 'Markers test' });
}

describe('validateSession markers', () => {
  it('accepts a session with no markers field (back-compat)', () => {
    const res = validateSession(baseSession());
    expect(res.ok).toBe(true);
  });

  it('accepts well-formed markers', () => {
    const s = { ...baseSession(), markers: [{ id: 'm1', name: 'Chorus', seconds: 30 }] };
    const res = validateSession(s);
    expect(res.ok).toBe(true);
  });

  it('rejects a non-array markers field', () => {
    const s = { ...baseSession(), markers: 'nope' };
    const res = validateSession(s);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join('\n')).toContain('markers');
  });

  it('rejects a marker with a negative time or missing name', () => {
    const s = {
      ...baseSession(),
      markers: [
        { id: 'm1', name: 'ok', seconds: 1 },
        { id: 'm2', seconds: -3 },
      ],
    };
    const res = validateSession(s);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join('\n')).toContain('markers.1.name');
      expect(res.errors.join('\n')).toContain('markers.1.seconds');
    }
  });
});
