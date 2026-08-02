// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RhythmStrip } from '../RhythmStrip';
import { generatePattern } from '@/lib/rhythm/generate';

describe('RhythmStrip', () => {
  const pattern = generatePattern(3, 11); // level with rests
  it('renders one glyph per event and syllables for non-rests', () => {
    const { container } = render(<RhythmStrip pattern={pattern} system="takadimi" />);
    const notes = container.querySelectorAll('[data-role="note"]');
    const rests = container.querySelectorAll('[data-role="rest"]');
    expect(notes.length + rests.length).toBe(pattern.events.length);
    expect(rests.length).toBe(pattern.events.filter((e) => e.rest).length);
    const syllables = container.querySelectorAll('[data-role="syllable"]');
    expect(syllables.length).toBe(pattern.events.filter((e) => !e.rest).length);
  });
  it('renders barlines between measures', () => {
    const { container } = render(<RhythmStrip pattern={pattern} system="counting" />);
    expect(container.querySelectorAll('[data-role="barline"]').length).toBe(pattern.measures + 1);
  });
  it('applies verdict coloring when highlight provided', () => {
    const highlight = pattern.events.map((e) => (e.rest ? null : ('missed' as const)));
    const { container } = render(<RhythmStrip pattern={pattern} system="takadimi" highlight={highlight} />);
    expect(container.querySelectorAll('[data-verdict="missed"]').length).toBeGreaterThan(0);
  });
});
