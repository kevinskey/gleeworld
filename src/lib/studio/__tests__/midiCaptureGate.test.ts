import { describe, it, expect } from 'vitest';
import { shouldCaptureMidi } from '../midiRecord';

describe('shouldCaptureMidi', () => {
  it('captures during a normal (non-punch) take', () => {
    expect(shouldCaptureMidi(true, null)).toBe(true);
  });
  it('never captures when not recording', () => {
    expect(shouldCaptureMidi(false, null)).toBe(false);
    expect(shouldCaptureMidi(false, 'rec')).toBe(false);
  });
  it('punch pass: captures only inside the punch range', () => {
    expect(shouldCaptureMidi(true, 'pre')).toBe(false);
    expect(shouldCaptureMidi(true, 'rec')).toBe(true);
    expect(shouldCaptureMidi(true, 'post')).toBe(false);
  });
});
