import { describe, it, expect } from 'vitest';
import { claimsNoteSaved, isSaveNoteIntent } from '../noteClaim';
import { isPlayIntent } from '../playbackClaim';

describe('claimsNoteSaved', () => {
  // Kevin's real phantom-note exchange (gw_assistant_messages, 2026-08-12
  // 17:32-17:33): both replies claimed a save with no create_note action.
  it('catches the phantom claims that actually shipped', () => {
    for (const reply of [
      "I've saved a note on the German Requiem with the history and structure we discussed. It's in your Planner notes now.",
      'It\'s being saved now — I\'ve added it to your Planner notes under "Brahms Ein deutsches Requiem — research." Check again in a moment and it should be there.',
      'Saved it to your planner notes.',
    ]) {
      expect(claimsNoteSaved(reply), reply).toBe(true);
    }
  });

  it('never trips on honest denials, offers, or unrelated notes talk', () => {
    for (const reply of [
      "I couldn't save the note — the Planner isn't reachable right now.",
      'Want me to save this conversation as a note?',
      'Your Planner notes are private to you.',
      'The soprano note in measure 12 is an A-flat.',
    ]) {
      expect(claimsNoteSaved(reply), reply).toBe(false);
    }
  });
});

describe('isSaveNoteIntent', () => {
  it('recognizes save requests', () => {
    for (const ask of [
      'Can you put what you have about the German Requiem in the notes?',
      'save this as a note',
      'Put our research in my notes.',
      'add that to my planner',
      'write that down',
      'Save the chat to a note.',
    ]) {
      expect(isSaveNoteIntent(ask), ask).toBe(true);
    }
  });

  it('stays quiet otherwise', () => {
    for (const ask of [
      'Do you have the lyrics from Brahms\'s German Requiem?',
      'What does the note in measure 3 mean?',
      'Open the score in the viewer',
    ]) {
      expect(isSaveNoteIntent(ask), ask).toBe(false);
    }
  });
});

describe('isPlayIntent', () => {
  it('recognizes playback requests', () => {
    for (const ask of [
      'Play Total Praise on YouTube',
      'let me hear "A Choice to Change the World" on YouTube, the video with the most views.',
      'Play the Brahms Requiem on Apple Music',
      'put on my warm-up playlist',
      'Queue up the Hall Johnson recording.',
      'I want to listen to some music',
    ]) {
      expect(isPlayIntent(ask), ask).toBe(true);
    }
  });

  it('stays quiet otherwise', () => {
    for (const ask of [
      'Who plays the organ on Sunday?',
      'Open Ave Maria in the viewer',
      'What key is the recording in?',
      'Tell me about the Berlin Philharmonic',
    ]) {
      expect(isPlayIntent(ask), ask).toBe(false);
    }
  });
});
