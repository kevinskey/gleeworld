import { isCompound } from './pattern';
import type { RhythmPattern } from './pattern';

export type SyllableSystem = 'takadimi' | 'kodaly' | 'counting';

export const SYLLABLE_SYSTEMS: Array<{ id: SyllableSystem; label: string }> = [
  { id: 'takadimi', label: 'Takadimi' },
  { id: 'kodaly', label: 'Kodály' },
  { id: 'counting', label: '1 e & a' },
];

// Onset syllable by fractional position within the pulse. Nearest-key lookup
// absorbs float error from compound thirds.
const SIMPLE: Record<SyllableSystem, Record<string, string>> = {
  takadimi: { '0': 'ta', '0.25': 'ka', '0.5': 'di', '0.75': 'mi' },
  kodaly:   { '0': 'ta', '0.25': 'ri', '0.5': 'ti', '0.75': 'ri' },
  counting: { '0': 'BEAT', '0.25': 'e', '0.5': '&', '0.75': 'a' },
};
const COMPOUND: Record<SyllableSystem, Record<string, string>> = {
  takadimi: { '0': 'ta', '0.333': 'ki', '0.667': 'da' },
  kodaly:   { '0': 'ta', '0.333': 'ti', '0.667': 'ti' },
  counting: { '0': 'BEAT', '0.333': 'la', '0.667': 'li' },
};

function nearest(table: Record<string, string>, frac: number): string {
  let best = '0';
  let bestD = Infinity;
  for (const k of Object.keys(table)) {
    const d = Math.abs(Number(k) - frac);
    if (d < bestD) { bestD = d; best = k; }
  }
  return table[best];
}

export function labelPattern(pattern: RhythmPattern, system: SyllableSystem): string[] {
  const compound = isCompound(pattern.meter);
  const tables = compound ? COMPOUND : SIMPLE;
  return pattern.events.map((e) => {
    if (e.rest) return '';
    const pulseIdx = Math.floor(e.startPulse + 1e-6);
    const frac = e.startPulse - pulseIdx;
    // Kodály: a full-pulse-or-longer note on the pulse is 'ta'; shorter
    // on-pulse notes belong to a ti-ti (or ti-ti-ti) group.
    if (system === 'kodaly' && frac < 1e-6) return e.durPulses >= 1 - 1e-6 ? 'ta' : 'ti';
    const syl = nearest(tables[system], frac);
    if (syl === 'BEAT') return String((pulseIdx % pattern.pulsesPerMeasure) + 1);
    return syl;
  });
}
