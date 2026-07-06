import { describe, it, expect } from 'vitest';
import { computeTakeAlignment } from './takeAlignment';

describe('computeTakeAlignment', () => {
  it('fresh transport start: trims the measured capture→transport gap plus device latency', () => {
    // Capture went live at t=1000, transport started at t=1600 (600ms of
    // mic-open/startup dead air), device residual 150ms.
    const a = computeTakeAlignment({
      pressWallMs: 900,
      captureStartWallMs: 1000,
      transportStartWallMs: 1600,
      deviceLatencyMs: 150,
    });
    expect(a.trimMs).toBe(750); // 600 gap + 150 device
    expect(a.clipStartOffsetSec).toBe(0);
  });

  it('fresh transport start: never trims negative when transport somehow beat capture', () => {
    const a = computeTakeAlignment({
      pressWallMs: 900,
      captureStartWallMs: 1600,
      transportStartWallMs: 1000,
      deviceLatencyMs: 150,
    });
    expect(a.trimMs).toBe(150); // gap clamps to 0, device remains
    expect(a.clipStartOffsetSec).toBe(0);
  });

  it('already playing (punch): shifts clip right by capture lateness minus device latency', () => {
    // Record pressed at t=1000 (timeline anchor), capture live at t=1400.
    // The first captured sample belongs 400ms after the anchor; device
    // latency pulls 150 back → clip shifts +250ms, nothing trimmed.
    const a = computeTakeAlignment({
      pressWallMs: 1000,
      captureStartWallMs: 1400,
      transportStartWallMs: null,
      deviceLatencyMs: 150,
    });
    expect(a.trimMs).toBe(0);
    expect(a.clipStartOffsetSec).toBeCloseTo(0.25, 5);
  });

  it('already playing: trims instead of shifting when device latency exceeds capture lateness', () => {
    const a = computeTakeAlignment({
      pressWallMs: 1000,
      captureStartWallMs: 1100, // only 100ms late
      transportStartWallMs: null,
      deviceLatencyMs: 150,
    });
    expect(a.trimMs).toBe(50); // 150 − 100
    expect(a.clipStartOffsetSec).toBe(0);
  });

  it('zero device latency, instant capture: aligns exactly', () => {
    const a = computeTakeAlignment({
      pressWallMs: 1000,
      captureStartWallMs: 1000,
      transportStartWallMs: 1000,
      deviceLatencyMs: 0,
    });
    expect(a.trimMs).toBe(0);
    expect(a.clipStartOffsetSec).toBe(0);
  });
});
