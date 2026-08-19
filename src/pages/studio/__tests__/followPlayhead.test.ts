// The timeline must keep the playhead visible: while playing (paging
// forward with lookahead), AND after any seek/rewind while parked —
// but it must never hijack a manual scroll on a position-unchanged
// engine emit (e.g. a metronome toggle re-publishes the same tick).
import { describe, it, expect } from 'vitest';
import { followPlayheadScroll } from '../followPlayhead';

const vp = { scrollLeft: 1000, clientWidth: 800, scrollWidth: 10000 };

describe('followPlayheadScroll', () => {
  it('pages forward when the playing head nears the right edge', () => {
    const x = followPlayheadScroll({
      playheadX: 1000 + 800 - 40, // inside the 80px margin
      viewport: vp, isPlaying: true, positionMoved: true,
    });
    expect(x).toBe(1760 - 800 * 0.15);
  });

  it('keeps still while the playing head is comfortably in view', () => {
    expect(followPlayheadScroll({
      playheadX: 1400, viewport: vp, isPlaying: true, positionMoved: true,
    })).toBeNull();
  });

  it('follows a rewind that lands left of the window while parked', () => {
    const x = followPlayheadScroll({
      playheadX: 200, viewport: vp, isPlaying: false, positionMoved: true,
    });
    expect(x).toBe(200 - 800 * 0.15);
  });

  it('follows a parked skip-to-end landing right of the window', () => {
    const x = followPlayheadScroll({
      playheadX: 5000, viewport: vp, isPlaying: false, positionMoved: true,
    });
    expect(x).toBe(5000 - 800 * 0.15);
  });

  it('never scrolls on a position-unchanged emit while parked (manual scroll wins)', () => {
    expect(followPlayheadScroll({
      playheadX: 200, viewport: vp, isPlaying: false, positionMoved: false,
    })).toBeNull();
  });

  it('leaves a parked in-view playhead alone even when it moved', () => {
    expect(followPlayheadScroll({
      playheadX: 1400, viewport: vp, isPlaying: false, positionMoved: true,
    })).toBeNull();
  });

  it('ignores a zero-width viewport', () => {
    expect(followPlayheadScroll({
      playheadX: 0,
      viewport: { scrollLeft: 0, clientWidth: 0, scrollWidth: 0 },
      isPlaying: true, positionMoved: true,
    })).toBeNull();
  });
});
