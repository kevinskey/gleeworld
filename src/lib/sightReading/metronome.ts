/** One scheduled metronome click, relative to the schedule's own time zero. */
export interface MetroClick {
  timeSec: number;
  /** Downbeat (count-in "1" or beat 1 of an exercise measure). */
  accent: boolean;
  /** True for the count-in beats before the exercise window. */
  countIn: boolean;
}

/**
 * Beat grid for a practice take: `countInBeats` clicks, then one click per
 * exercise beat. Fractional exercise lengths (generated lines routinely
 * overshoot their nominal bar count) still get a click on their last partial
 * beat via ceil. Pure so the timing/accent logic is unit-testable; audio
 * rendering lives in playClicks().
 */
export function clickSchedule({
  bpm,
  countInBeats,
  exerciseBeats,
  meterBeats,
}: {
  bpm: number;
  countInBeats: number;
  exerciseBeats: number;
  meterBeats: number;
}): MetroClick[] {
  if (bpm <= 0) return [];
  const spb = 60 / bpm;
  const clicks: MetroClick[] = [];
  for (let b = 0; b < countInBeats; b++) {
    clicks.push({ timeSec: b * spb, accent: b === 0, countIn: true });
  }
  const exerciseClicks = Math.ceil(Math.max(0, exerciseBeats));
  for (let b = 0; b < exerciseClicks; b++) {
    clicks.push({
      timeSec: (countInBeats + b) * spb,
      accent: b % Math.max(1, meterBeats) === 0,
      countIn: false,
    });
  }
  return clicks;
}

/**
 * Render a click schedule on a Web Audio context. Count-in clicks are loud so
 * the tempo is unmistakable; clicks under the take are deliberately quiet —
 * the mic runs with echoCancellation off, so a loud speaker click would bleed
 * into the pitch tracker. Short sine bursts (not noise) keep the transient
 * clean at low gain.
 */
export function playClicks(ctx: AudioContext, clicks: MetroClick[]): void {
  const t0 = ctx.currentTime + 0.03;
  for (const c of clicks) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = c.accent ? 1400 : 1000;
    const at = t0 + c.timeSec;
    const gain = c.countIn ? (c.accent ? 0.4 : 0.3) : (c.accent ? 0.1 : 0.07);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.linearRampToValueAtTime(0, at + 0.05);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.06);
  }
}
