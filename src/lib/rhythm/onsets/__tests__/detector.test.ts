import { describe, it, expect } from 'vitest';
import { createOnsetDetector, WARMUP_SEC } from '../detector';

const HOP = 0.012; // the live mic polls every 12ms

/**
 * Feed a synthetic energy stream and collect detected onset times.
 * `energyAt` returns the RMS for a given time — this is what the AnalyserNode
 * frame would have measured.
 */
function run(durationSec: number, energyAt: (t: number) => number) {
  const d = createOnsetDetector();
  const hits: number[] = [];
  for (let t = 0; t < durationSec; t += HOP) {
    if (d.push(t, energyAt(t))) hits.push(t);
  }
  return hits;
}

// A clap: sharp attack, ~60ms decay back to the room floor.
const clapAt = (t: number, when: number, peak = 0.3) => {
  const dt = t - when;
  return dt >= 0 && dt < 0.06 ? peak * (1 - dt / 0.06) : 0;
};

describe('createOnsetDetector', () => {
  it('detects EVERY clap in a normally noisy room, not just the first', () => {
    // Regression: the live detector seeded its floor at 1e-4, so ordinary room
    // noise (~0.01 RMS) sat permanently above threshold — it fired once on the
    // first frame and never re-armed, recording 1 onset for a whole take.
    const claps = [1.0, 1.5, 2.0, 2.5];
    const hits = run(3.0, (t) => 0.01 + Math.max(0, ...claps.map((c) => clapAt(t, c))));
    expect(hits).toHaveLength(4);
    claps.forEach((c, i) => expect(hits[i]).toBeCloseTo(c, 1));
  });

  it('emits nothing during warm-up, so opening the mic is not itself an onset', () => {
    const hits = run(WARMUP_SEC + 0.05, () => 0.01);
    expect(hits).toEqual([]);
  });

  it('stays silent through steady room noise with no claps', () => {
    const hits = run(3.0, (t) => 0.01 + 0.002 * Math.sin(t * 40));
    expect(hits).toEqual([]);
  });

  it('works in a loud room where ambient is far above any fixed threshold', () => {
    const hits = run(3.0, (t) => 0.05 + Math.max(0, clapAt(t, 1.0, 0.6), clapAt(t, 2.0, 0.6)));
    expect(hits).toHaveLength(2);
  });

  it('still hears quiet claps in a very quiet room', () => {
    const hits = run(3.0, (t) => 0.0005 + Math.max(0, clapAt(t, 1.0, 0.05), clapAt(t, 2.0, 0.05)));
    expect(hits).toHaveLength(2);
  });

  it('one clap yields one onset — the decay tail does not re-trigger', () => {
    const hits = run(2.0, (t) => 0.01 + clapAt(t, 1.0));
    expect(hits).toHaveLength(1);
  });

  it('recovers if the room gets louder mid-take instead of going deaf', () => {
    // Ambient jumps 10x at t=1.0; claps after the jump must still register.
    const hits = run(5.0, (t) => (t < 1.0 ? 0.01 : 0.1) + Math.max(0, clapAt(t, 3.0, 0.9), clapAt(t, 4.0, 0.9)));
    expect(hits.filter((h) => h > 2.5)).toHaveLength(2);
  });
});
