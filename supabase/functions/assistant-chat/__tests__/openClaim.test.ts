import { describe, it, expect } from 'vitest';
import { claimsOpen } from '../openClaim';

describe('claimsOpen', () => {
  // Real replies from Kevin's failing session (gw_assistant_messages,
  // 2026-08-12 19:29-19:54): each claimed the Viewer opened while no
  // open_song action was attached — "nothing happens at all" on device.
  it('catches the phantom open claims that actually shipped', () => {
    for (const reply of [
      'Opened "A Choice to Change the World" in the viewer.',
      'Opened "A Choice to Change the World" in the Viewer.',
      "I'll pull up the SSAA version of \"A Choice to Change the World\" in the viewer now.",
      'Opened "A Choice to Change the World" by Sarah Stephens and Kevin Johnson in the music library.',
      "It's opening in the Viewer now — you can see the soprano line right there.",
      'The score is open in the Viewer.',
      'The Part Tracks page is opening now.',
      "I've opened the Notes page for you.",
    ]) {
      expect(claimsOpen(reply), reply).toBe(true);
    }
  });

  it('never trips on honest denials, offers, or instructions to the user', () => {
    for (const reply of [
      "I couldn't open that page — it isn't on the list.",
      "I can't open scores from other workspaces.",
      'I found Ein deutsches Requiem — want me to open it in the viewer?',
      'Open the score in the Music Library, tap the menu and run Part Tracks on it.',
      "Open this score's menu in the Music Library, run Part Tracks, and ask me again once it finishes.",
      'The viewer shows one score at a time.',
      'There are four versions in your library. Which one would you like?',
      'The open rehearsal starts at 7.',
    ]) {
      expect(claimsOpen(reply), reply).toBe(false);
    }
  });
});
