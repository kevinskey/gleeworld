// Created inside the click gesture (Safari/iOS requirement), reused after.
let toneCtx: AudioContext | null = null;
export function getAudioCtx(): AudioContext | null {
  try {
    if (!toneCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      toneCtx = new Ctor();
    }
    if (toneCtx.state === 'suspended') void toneCtx.resume();
    return toneCtx;
  } catch {
    return null;
  }
}
