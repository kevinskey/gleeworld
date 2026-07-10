import { BaseDur } from './duration';
import { Pitch } from './model';

const VEX_DUR: Record<BaseDur, string> = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', '16th': '16', '32nd': '32' };

const VEX_ACCIDENTAL: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };

export function vexAccidentalCode(alter: number): string {
  return VEX_ACCIDENTAL[alter] ?? '';   // '' for natural or unsupported (>|2|) — no standard glyph
}

export function toVexKey(pitch: Pitch): string {
  return `${pitch.step.toLowerCase()}${vexAccidentalCode(pitch.alter)}/${pitch.octave}`;
}

export function toVexDuration(base: BaseDur, dots: number): string {
  return VEX_DUR[base] + 'd'.repeat(dots);
}
