import { describe, it, expect } from 'vitest';
import {
  buildClickSchedule, matchTapOffsets, calibrationStats, recommendedTrim,
  CAL_INTERVAL_SEC, CAL_COUNT_IN, CAL_MEASURED, CAL_MATCH_WINDOW_MS, CAL_MIN_TAPS,
} from '../latencyCal';

describe('buildClickSchedule', () => {
  it('lays out count-in then measured clicks on the interval grid', () => {
    const clicks = buildClickSchedule(10);
    expect(clicks).toHaveLength(CAL_COUNT_IN + CAL_MEASURED);
    expect(clicks[0]).toEqual({ ctxSec: 10, accent: true, measured: false });
    expect(clicks[CAL_COUNT_IN].measured).toBe(true);
    expect(clicks[CAL_COUNT_IN].accent).toBe(false);
    expect(clicks[1].ctxSec).toBeCloseTo(10 + CAL_INTERVAL_SEC);
    expect(clicks.at(-1)!.ctxSec).toBeCloseTo(10 + (CAL_COUNT_IN + CAL_MEASURED - 1) * CAL_INTERVAL_SEC);
  });
});

describe('matchTapOffsets', () => {
  const clicks = [1000, 1600, 2200, 2800];

  it('pairs each tap with its nearest click and returns signed offsets', () => {
    expect(matchTapOffsets([1040, 1590, 2225], clicks).sort((a, b) => a - b))
      .toEqual([-10, 25, 40]);
  });

  it('drops taps beyond the window off either end of the run', () => {
    // Between clicks every tap is within half an interval of SOME click;
    // only taps before the first or after the last click can fall out.
    expect(matchTapOffsets([1000 - CAL_MATCH_WINDOW_MS - 1], clicks)).toEqual([]);
    expect(matchTapOffsets([2800 + CAL_MATCH_WINDOW_MS + 1], clicks)).toEqual([]);
    expect(matchTapOffsets([1000 - CAL_MATCH_WINDOW_MS], clicks)).toEqual([-CAL_MATCH_WINDOW_MS]);
  });

  it('scores at most one tap per click, keeping the closest (chords)', () => {
    // Two taps near the same click — chord: keep the closer one only.
    expect(matchTapOffsets([1030, 1055], clicks)).toEqual([30]);
  });

  it('handles a skipped beat without inventing an offset for it', () => {
    const offsets = matchTapOffsets([1010, 2210, 2790], clicks); // no tap for 1600
    expect(offsets).toHaveLength(3);
  });

  it('returns empty for no taps or no clicks', () => {
    expect(matchTapOffsets([], clicks)).toEqual([]);
    expect(matchTapOffsets([1000], [])).toEqual([]);
  });
});

describe('calibrationStats', () => {
  it('flags too few taps as insufficient', () => {
    const s = calibrationStats(Array(CAL_MIN_TAPS - 1).fill(20));
    expect(s.quality).toBe('insufficient');
  });

  it('reports the median and is robust to one wild outlier', () => {
    // 9 taps at ~40ms, one flubbed at 250ms — median must stay ~40.
    const s = calibrationStats([38, 40, 41, 39, 42, 40, 37, 43, 40, 250]);
    expect(s.medianMs).toBeCloseTo(40, 0);
    expect(s.quality).toBe('good');
  });

  it('grades consistency by MAD', () => {
    expect(calibrationStats(Array(10).fill(30)).quality).toBe('good');
    const fair = calibrationStats([0, 50, 0, 50, 0, 50, 0, 50, 0, 50]);
    expect(fair.quality).toBe('fair');
    const poor = calibrationStats([-80, 80, -80, 80, -80, 80, -80, 80, -80, 80]);
    expect(poor.quality).toBe('poor');
  });
});

describe('recommendedTrim', () => {
  it('covers the whole measurement when auto reports 0 (WebKit)', () => {
    expect(recommendedTrim(62.4, 0)).toEqual({ trimMs: 62, clamped: false });
  });

  it('covers only the residue when auto already reports latency (Chrome)', () => {
    expect(recommendedTrim(62, 50)).toEqual({ trimMs: 12, clamped: false });
  });

  it('supports negative trim for players who land ahead of the click', () => {
    expect(recommendedTrim(-15, 0)).toEqual({ trimMs: -15, clamped: false });
  });

  it('clamps to the dial range and says so', () => {
    expect(recommendedTrim(180, 0)).toEqual({ trimMs: 100, clamped: true });
    expect(recommendedTrim(-180, 0)).toEqual({ trimMs: -100, clamped: true });
  });
});
