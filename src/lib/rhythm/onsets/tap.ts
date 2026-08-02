// Tap onset source: pointer taps on the pad element + spacebar. Emits onset
// seconds relative to t0 on the AudioContext clock — the identical shape the
// mic session produces, so downstream code never knows which input ran.

export interface TapSession { onsets: number[]; dispose(): void }

export function startTapSession(ctx: AudioContext, t0: number, el: HTMLElement): TapSession {
  const onsets: number[] = [];
  const onPointer = (e: PointerEvent) => { e.preventDefault(); onsets.push(ctx.currentTime - t0); };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); onsets.push(ctx.currentTime - t0); }
  };
  el.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);
  return {
    onsets,
    dispose() {
      el.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    },
  };
}
