import { BaseDur } from './duration';
import { Pitch } from './model';

const VEX_DUR: Record<BaseDur, string> = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', '16th': '16', '32nd': '32' };

export function toVexKey(pitch: Pitch): string {
  const accidental = pitch.alter === 1 ? '#' : pitch.alter === -1 ? 'b' : '';
  return `${pitch.step.toLowerCase()}${accidental}/${pitch.octave}`;
}

export function toVexDuration(base: BaseDur, dots: number): string {
  return VEX_DUR[base] + 'd'.repeat(dots);
}
