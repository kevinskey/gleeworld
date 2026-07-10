// Tiny Web Audio helper to sound a pitch when a note is entered in the editor. Best-effort:
// a single shared AudioContext, resumed on use (note entry is a keydown = user gesture, so
// browsers allow it). Never throws into the caller.

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playPitch(midi: number, durationMs = 350): void {
  try {
    const ac = context();
    if (!ac) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle'; // soft, mallet-ish
    osc.frequency.value = freq;
    const now = ac.currentTime;
    const dur = durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    /* audio is best-effort; entry still works silently */
  }
}
