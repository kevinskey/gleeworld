import { describe, it, expect } from 'vitest';
import { toVexKey, toVexDuration } from './toVexflow';

describe('VexFlow translation', () => {
  it('maps pitch to a VexFlow key string', () => {
    expect(toVexKey({ step: 'C', octave: 4, alter: 0 })).toBe('c/4');
    expect(toVexKey({ step: 'F', octave: 4, alter: 1 })).toBe('f#/4');
    expect(toVexKey({ step: 'B', octave: 3, alter: -1 })).toBe('bb/3');
  });
  it('maps base+dots to a VexFlow duration code', () => {
    expect(toVexDuration('quarter', 0)).toBe('q');
    expect(toVexDuration('quarter', 1)).toBe('qd');
    expect(toVexDuration('16th', 0)).toBe('16');
    expect(toVexDuration('whole', 0)).toBe('w');
  });
});
