// Transport logic — pure helpers behind the Studio transport bar:
// counter formats, marker navigation, punch in/out, pre/post-roll,
// shuttle acceleration, and the loop-wrap guard.

import { describe, it, expect } from 'vitest';
import {
  nextCounterMode,
  formatTime,
  formatBarBeat,
  formatBarBeatCompact,
  formatSamples,
  barSeconds,
  preRollStartSeconds,
  postRollEndSeconds,
  sortMarkers,
  nextMarker,
  prevMarker,
  defaultMarkerName,
  punchTransition,
  shuttleStepSeconds,
  shouldLoopWrap,
  type SessionMarker,
} from '../transport';

// ── Time counters ────────────────────────────────────────────────────

describe('counter modes', () => {
  it('cycles bars → time → samples → bars', () => {
    expect(nextCounterMode('bars')).toBe('time');
    expect(nextCounterMode('time')).toBe('samples');
    expect(nextCounterMode('samples')).toBe('bars');
  });
});

describe('formatTime', () => {
  it('renders M:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.4)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
  it('never renders 60 in the seconds field', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });
});

describe('formatBarBeat', () => {
  it('starts at 001.1.000', () => {
    expect(formatBarBeat(0, 120, 4)).toBe('001.1.000');
  });
  it('advances bars and beats at 120 BPM 4/4', () => {
    // 2.5s at 120 BPM = 5 beats = bar 2, beat 2
    expect(formatBarBeat(2.5, 120, 4)).toBe('002.2.000');
  });
  it('renders 960 PPQN ticks', () => {
    // 0.25s = half a beat = 480 ticks
    expect(formatBarBeat(0.25, 120, 4)).toBe('001.1.480');
  });
});

describe('formatBarBeatCompact', () => {
  it('drops padding and ticks: bar.beat only', () => {
    expect(formatBarBeatCompact(0, 120, 4)).toBe('1.1');
    expect(formatBarBeatCompact(2.5, 120, 4)).toBe('2.2');
  });
  it('tracks the full readout bar/beat at higher bars', () => {
    // 13s at 120 BPM 4/4 = 26 beats = bar 7, beat 3
    expect(formatBarBeatCompact(13, 120, 4)).toBe('7.3');
    expect(formatBarBeat(13, 120, 4).startsWith('007.3')).toBe(true);
  });
});

describe('formatSamples', () => {
  it('multiplies seconds by sample rate with thousands grouping', () => {
    expect(formatSamples(1.5, 48000)).toBe('72,000');
    expect(formatSamples(0, 48000)).toBe('0');
  });
  it('floors to a whole sample', () => {
    expect(formatSamples(0.0000104, 48000)).toBe('0');
  });
});

// ── Musical time math ────────────────────────────────────────────────

describe('barSeconds', () => {
  it('one 4/4 bar at 120 BPM is 2 seconds', () => {
    expect(barSeconds(120, 4, 4)).toBe(2);
  });
  it('one 3/4 bar at 60 BPM is 3 seconds', () => {
    expect(barSeconds(60, 3, 4)).toBe(3);
  });
  it('accounts for the denominator (6/8 at 120 BPM = 1.5s)', () => {
    expect(barSeconds(120, 6, 8)).toBeCloseTo(1.5);
  });
});

describe('pre-roll / post-roll', () => {
  it('pre-roll starts N bars before the punch-in point', () => {
    expect(preRollStartSeconds(4, 1, 120, 4, 4)).toBe(2);
  });
  it('pre-roll clamps at zero', () => {
    expect(preRollStartSeconds(1, 2, 120, 4, 4)).toBe(0);
  });
  it('post-roll ends N bars after the punch-out point', () => {
    expect(postRollEndSeconds(8, 1, 120, 4, 4)).toBe(10);
  });
});

// ── Markers ──────────────────────────────────────────────────────────

const m = (id: string, name: string, seconds: number): SessionMarker => ({ id, name, seconds });

describe('markers', () => {
  const markers = [m('c', 'Chorus', 30), m('a', 'Intro', 0), m('b', 'Verse', 10)];

  it('sortMarkers orders by time without mutating the input', () => {
    const sorted = sortMarkers(markers);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(markers[0].id).toBe('c');
  });

  it('nextMarker finds the first marker after the playhead', () => {
    expect(nextMarker(markers, 5)?.id).toBe('b');
    expect(nextMarker(markers, 10)?.id).toBe('c'); // sitting on Verse → next is Chorus
    expect(nextMarker(markers, 30)).toBeNull();
  });

  it('prevMarker skips a marker the playhead is sitting on', () => {
    expect(prevMarker(markers, 15)?.id).toBe('b');
    expect(prevMarker(markers, 10)?.id).toBe('a'); // sitting on Verse → back to Intro
    expect(prevMarker(markers, 0)).toBeNull();
  });

  it('defaultMarkerName numbers past the existing count', () => {
    expect(defaultMarkerName([])).toBe('Marker 1');
    expect(defaultMarkerName(markers)).toBe('Marker 4');
  });
});

// ── Punch in / out ───────────────────────────────────────────────────

describe('punchTransition', () => {
  const range = { inSeconds: 4, outSeconds: 8 };

  it('fires punch-in when the playhead crosses the in point', () => {
    expect(punchTransition(3.97, 4.01, range)).toBe('in');
  });
  it('fires punch-out when the playhead crosses the out point', () => {
    expect(punchTransition(7.98, 8.02, range)).toBe('out');
  });
  it('is silent inside and outside the range', () => {
    expect(punchTransition(5, 5.03, range)).toBeNull();
    expect(punchTransition(1, 1.03, range)).toBeNull();
    expect(punchTransition(9, 9.03, range)).toBeNull();
  });
  it('never fires on a backwards seek', () => {
    expect(punchTransition(6, 3, range)).toBeNull();
    expect(punchTransition(9, 5, range)).toBeNull();
  });
  it('skips a degenerate range crossed in a single tick', () => {
    expect(punchTransition(3.9, 8.1, range)).toBeNull();
  });
});

// ── Shuttle (FF / RW hold) ───────────────────────────────────────────

describe('shuttleStepSeconds', () => {
  it('starts slow, accelerates the longer the button is held', () => {
    const early = shuttleStepSeconds(200);
    const mid = shuttleStepSeconds(1500);
    const late = shuttleStepSeconds(4000);
    expect(early).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(early);
    expect(late).toBeGreaterThan(mid);
  });
});

// ── Loop wrap guard ──────────────────────────────────────────────────

describe('shouldLoopWrap', () => {
  const base = {
    isPlaying: true,
    loopEnabled: true,
    recordingActive: false,
    positionSeconds: 8.01,
    loopStartSeconds: 4,
    loopEndSeconds: 8,
  };

  it('wraps when playing a valid loop past its end', () => {
    expect(shouldLoopWrap(base)).toBe(true);
  });
  it('does not wrap before the loop end', () => {
    expect(shouldLoopWrap({ ...base, positionSeconds: 7.9 })).toBe(false);
  });
  it('does not wrap while a recording is in flight', () => {
    expect(shouldLoopWrap({ ...base, recordingActive: true })).toBe(false);
  });
  it('does not wrap when stopped, disabled, or the range is empty', () => {
    expect(shouldLoopWrap({ ...base, isPlaying: false })).toBe(false);
    expect(shouldLoopWrap({ ...base, loopEnabled: false })).toBe(false);
    expect(shouldLoopWrap({ ...base, loopEndSeconds: 4 })).toBe(false);
  });
});
