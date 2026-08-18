import { describe, it, expect } from 'vitest';
import { claimsOpen, isOpenScoreIntent } from '../openClaim';

describe('isOpenScoreIntent', () => {
  // Kevin 2026-08-12: "one of if not the most important thing the assistant
  // should be able to do" — every phrasing that means open-a-score must be
  // recognized so the server can enforce that an open actually happens.
  it('recognizes the request variations', () => {
    for (const ask of [
      'Open "A Choice to Change the World" in the viewer.',
      'open Ave Maria in the music viewer',
      'Open the score in the viewer',
      'open the sheet music for Total Praise',
      'Show me the score for Wade in the Water',
      'Pull up the Bach Magnificat in the viewer',
      'put the Gounod Ave Maria on the screen',
      'Let me see the score of Lift Every Voice',
      'View "Ein deutsches Requiem" in the viewer',
      'bring up the pdf of A Choice to Change the World',
      'open that Toys to Change the World in viewer', // live-voice misrecognition, still an open ask
      'Open an SSAA version of "A Choice to Change the World" and show it.',
    ]) {
      expect(isOpenScoreIntent(ask), ask).toBe(true);
    }
  });

  it('stays quiet on requests that are not score-opens', () => {
    for (const ask of [
      'What key is A Choice to Change the World in?',
      'Is the German Requiem in the music library?',
      'Play Total Praise on YouTube',
      'Close the viewer',
      'Tell me about the composer of Ave Maria',
      'What time is rehearsal tomorrow?',
      'Give me a brief history on the German Requiem.',
    ]) {
      expect(isOpenScoreIntent(ask), ask).toBe(false);
    }
  });
});

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
