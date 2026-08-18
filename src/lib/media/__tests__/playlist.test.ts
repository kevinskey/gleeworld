import { describe, it, expect } from 'vitest';
import { nextIndex, prevIndex, toggleFor, type PlaybackState } from '../playlist';

const s = (index: number | null, playing: boolean): PlaybackState => ({ index, playing });

describe('nextIndex', () => {
  it('advances through the list', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
  });

  // Wrapping keeps a short list usable without a repeat control: the player
  // is a listening surface, not a queue to run down and stop.
  it('wraps past the end back to the first track', () => {
    expect(nextIndex(2, 3)).toBe(0);
  });

  it('starts at the first track when nothing is selected', () => {
    expect(nextIndex(null, 3)).toBe(0);
  });

  it('has nowhere to go in an empty list', () => {
    expect(nextIndex(null, 0)).toBeNull();
    expect(nextIndex(0, 0)).toBeNull();
  });

  it('stays put on a single-track list', () => {
    expect(nextIndex(0, 1)).toBe(0);
  });

  it('recovers from an index past the end of a shrunken list', () => {
    expect(nextIndex(9, 3)).toBe(0);
  });
});

describe('prevIndex', () => {
  it('steps backward through the list', () => {
    expect(prevIndex(2, 3)).toBe(1);
  });

  it('wraps before the start round to the last track', () => {
    expect(prevIndex(0, 3)).toBe(2);
  });

  it('starts at the last track when nothing is selected', () => {
    expect(prevIndex(null, 3)).toBe(2);
  });

  it('has nowhere to go in an empty list', () => {
    expect(prevIndex(null, 0)).toBeNull();
  });

  it('recovers from an index past the end of a shrunken list', () => {
    expect(prevIndex(9, 3)).toBe(2);
  });
});

describe('toggleFor', () => {
  it('starts a track that is not the current one', () => {
    expect(toggleFor(s(0, true), 2)).toEqual({ index: 2, playing: true });
  });

  // Tapping the row that is already playing is the pause affordance — the
  // track stays selected so the strip keeps its position and title.
  it('pauses the current track without deselecting it', () => {
    expect(toggleFor(s(1, true), 1)).toEqual({ index: 1, playing: false });
  });

  it('resumes the current track when it is paused', () => {
    expect(toggleFor(s(1, false), 1)).toEqual({ index: 1, playing: true });
  });

  it('starts playing when nothing was selected', () => {
    expect(toggleFor(s(null, false), 0)).toEqual({ index: 0, playing: true });
  });
});
