import { describe, it, expect } from 'vitest';
import { claimsPlayback } from '../playbackClaim';

describe('claimsPlayback', () => {
  // Real replies from the failing thread (gw_assistant_messages, 2026-08-12):
  // each claimed playback while no play tool ran and no player opened.
  it('catches the phantom claims that actually shipped', () => {
    for (const reply of [
      'Playing "Total Praise" on YouTube now.',
      'Playing "Total Praise" for you right now.',
      'Now playing your warm-up playlist.',
      "Queuing up the Hall Johnson recording for you.",
    ]) {
      expect(claimsPlayback(reply), reply).toBe(true);
    }
  });

  it('never trips on honest denials or non-claims', () => {
    for (const reply of [
      'Nothing is playing right now.',
      'I stopped the music.',
      "I couldn't play that — the video wasn't found.",
      'Do you want me to play the Smallwood recording?',
      'The playing style in that era favored rubato.',
      "It's Wednesday, August 12 — 11:56 AM Eastern Time.",
    ]) {
      expect(claimsPlayback(reply), reply).toBe(false);
    }
  });
});
