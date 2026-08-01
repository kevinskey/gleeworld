// Step size for nudging the selected clip along the timeline.
// The snap selector doubles as the nudge amount (Logic-style): pass the
// resolved snapSeconds (0 when snap mode is "free", which falls back to
// the legacy 50ms). `fine` (Shift held) is always a 10ms slip for
// pocket adjustments, independent of the grid.
export function nudgeStepSeconds(snapSeconds: number, fine: boolean): number {
  if (fine) return 0.01;
  return snapSeconds > 0 ? snapSeconds : 0.05;
}
