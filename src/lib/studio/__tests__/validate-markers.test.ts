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

// cc validation (spec §7): absent cc must be treated as [] (no error);
// present cc must be an array of well-formed MidiCcEvent objects, same
// per-field validation style as notes above.
describe('validateSession cc', () => {
  function withMidiClip(cc: unknown) {
    const s = baseSession();
    s.tracks.push({
      id: 'm1', kind: 'midi', name: 'Keys', color: '#888888', volume_db: 0, pan: 0,
      mute: false, solo: false, arm: false, fx: [],
      instrument: { type: 'synth_basic', params: {} },
      clips: [{
        id: 'c1', kind: 'midi', start_seconds: 0, duration_seconds: 4, notes: [],
        ...(cc === undefined ? {} : { cc }),
      } as never],
    } as never);
    return s;
  }

  it('accepts a clip with no cc field at all', () => {
    const res = validateSession(withMidiClip(undefined));
    expect(res.ok).toBe(true);
  });

  it('accepts an empty cc array', () => {
    const res = validateSession(withMidiClip([]));
    expect(res.ok).toBe(true);
  });

  it('accepts well-formed cc events', () => {
    const res = validateSession(withMidiClip([{ controller: 64, value: 127, time_seconds: 1 }]));
    expect(res.ok).toBe(true);
  });

  it('rejects a non-array cc field', () => {
    const res = validateSession(withMidiClip('nope'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join('\n')).toContain('cc must be an array');
  });

  it('rejects out-of-range controller/value and a negative time_seconds', () => {
    const res = validateSession(withMidiClip([
      { controller: 200, value: -1, time_seconds: -3 },
    ]));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const msg = res.errors.join('\n');
      expect(msg).toContain('cc.0.controller');
      expect(msg).toContain('cc.0.value');
      expect(msg).toContain('cc.0.time_seconds');
    }
  });
});
