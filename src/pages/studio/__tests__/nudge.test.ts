// Clip nudge step policy: Alt+Arrow moves the selected clip by the
// current snap-grid value (the snap selector doubles as the nudge
// amount); snap "free" falls back to the legacy 50ms so the shortcut
// never dies; Shift+Alt+Arrow is always the fine 10ms slip.
import { describe, it, expect } from 'vitest';
import { nudgeStepSeconds } from '../nudge';

describe('nudgeStepSeconds', () => {
  it('uses the snap grid value when snapping', () => {
    expect(nudgeStepSeconds(0.5, false)).toBe(0.5); // 1/4 at 120bpm
  });

  it('falls back to 50ms when snap is free (0)', () => {
    expect(nudgeStepSeconds(0, false)).toBe(0.05);
  });

  it('fine nudge is always 10ms regardless of snap', () => {
    expect(nudgeStepSeconds(0.5, true)).toBe(0.01);
    expect(nudgeStepSeconds(0, true)).toBe(0.01);
  });
});
