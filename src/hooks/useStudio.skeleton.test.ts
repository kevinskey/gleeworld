// Regression test for the skeleton-sig bug: MIDI note/cc edits must change
// buildSkeletonSig's output so the engine actually reloads (see the
// "MIDI note in-place edits never reach the audio engine" review finding).
import { describe, it, expect } from 'vitest';
import { midiContentSig } from './useStudio';
import type { MidiClip } from '@/lib/studio/session';

const clip = (overrides: Partial<MidiClip> = {}): MidiClip => ({
  id: 'c1',
  kind: 'midi',
  start_seconds: 0,
  duration_seconds: 4,
  notes: [
    { pitch: 60, velocity: 100, start_seconds: 0, duration_seconds: 0.5 },
    { pitch: 64, velocity: 90, start_seconds: 0.5, duration_seconds: 0.5 },
  ],
  cc: [],
  ...overrides,
});

describe('midiContentSig', () => {
  it('is identical for identical clips', () => {
    expect(midiContentSig(clip())).toBe(midiContentSig(clip()));
  });

  it('changes when a note moves (start_seconds edit)', () => {
    const base = clip();
    const moved = clip({
      notes: base.notes.map((n, i) => i === 0 ? { ...n, start_seconds: 0.25 } : n),
    });
    expect(midiContentSig(moved)).not.toBe(midiContentSig(base));
  });

  it('changes when a note velocity changes', () => {
    const base = clip();
    const velEdit = clip({
      notes: base.notes.map((n, i) => i === 0 ? { ...n, velocity: 40 } : n),
    });
    expect(midiContentSig(velEdit)).not.toBe(midiContentSig(base));
  });

  it('changes when a note duration (resize) changes', () => {
    const base = clip();
    const resized = clip({
      notes: base.notes.map((n, i) => i === 0 ? { ...n, duration_seconds: 1.5 } : n),
    });
    expect(midiContentSig(resized)).not.toBe(midiContentSig(base));
  });

  it('changes when a cc event is added', () => {
    const base = clip({ cc: [] });
    const withCc = clip({ cc: [{ controller: 64, value: 127, time_seconds: 0.1 }] });
    expect(midiContentSig(withCc)).not.toBe(midiContentSig(base));
  });

  it('changes when a cc event value changes', () => {
    const base = clip({ cc: [{ controller: 64, value: 127, time_seconds: 0.1 }] });
    const edited = clip({ cc: [{ controller: 64, value: 0, time_seconds: 0.1 }] });
    expect(midiContentSig(edited)).not.toBe(midiContentSig(base));
  });
});
