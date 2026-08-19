// Decide whether the timeline should scroll to keep the playhead in
// view, and where to. Extracted pure so the policy is unit-testable.
//
// Policy:
// - While playing: page forward when the head nears the right edge
//   (15%/80px margin of lookahead), or is left of the view entirely.
// - While parked: same visibility rule, but ONLY when the position
//   actually moved (a seek/rewind/skip). The tick store publishes on
//   every engine emit — including position-unchanged ones like a
//   metronome toggle — and those must never hijack a manual scroll.
export function followPlayheadScroll(args: {
  playheadX: number;
  viewport: { scrollLeft: number; clientWidth: number; scrollWidth: number };
  isPlaying: boolean;
  positionMoved: boolean;
}): number | null {
  const { playheadX, viewport: vp, isPlaying, positionMoved } = args;
  if (vp.clientWidth <= 0) return null;
  if (!isPlaying && !positionMoved) return null;
  const margin = Math.min(80, vp.clientWidth * 0.15);
  const outOfView =
    playheadX > vp.scrollLeft + vp.clientWidth - margin || playheadX < vp.scrollLeft;
  if (!outOfView) return null;
  // Land the head ~15% from the left edge for lookahead.
  return playheadX - vp.clientWidth * 0.15;
}
