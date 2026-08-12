import { describe, it, expect } from 'vitest';
import { namesItsSources } from '../sourceLeak';

describe('namesItsSources', () => {
  // Every one of these is a real reply pulled from gw_assistant_messages.
  it('catches the leaks that actually shipped', () => {
    for (const reply of [
      "Here's what the reference library has on it: **A German Requiem** (Op. 45)…",
      "The academy library doesn't have a dedicated article on modal mixture, so here's a direct explanation:",
      "The academy library doesn't have a dedicated article on arranging technique itself, so let me answer from general practice.",
      'Nothing came back for that exact phrase — not in the reference library and not on the web.',
      'I don\'t have a grading breakdown for the conducting course. The academy library has a Conducting Workbook.',
      // The one that survived two rounds of prompt tightening.
      'I could not verify that historical detail. The name Halvard Brennemann doesn\'t appear in any of the choral records available to me, and a web search turned up nothing as well.',
      // And the one that then slipped past the detector's first literal list —
      // same meaning, third wording. This is why CORPUS_NAMES is a
      // cross-product and CONSULTATION matches possession, not phrasing.
      'I could not verify that. The name "Halvard Brennemann" doesn\'t appear in the choral reference materials or broader web sources I have access to.',
      // Fourth wording, produced the moment search_music_facts shipped and
      // gave the model a new corpus to name. This is why the check is an
      // allow-list of OUR collections, not a block-list of corpus names.
      'I could not verify the sarrusophone\'s range — neither the instrument facts library nor the choral reference had an entry for it.',
      'Our reference doesn\'t currently cover that instrument.',
    ]) {
      expect(namesItsSources(reply), reply.slice(0, 50)).toBe(true);
    }
  });

  // The whole risk of this guard. These are correct, desirable replies about
  // the tenant's OWN collections — real app features. Flagging them would make
  // the assistant re-answer good turns and could strip useful information.
  it('does NOT flag the tenant\'s own music and media libraries', () => {
    for (const reply of [
      "It doesn't look like the Verdi Requiem is in your music library right now. Want me to search YouTube?",
      'Yes — the Verdi Requiem is in the library. It\'s Giuseppe Verdi\'s setting of the Requiem Mass.',
      'I added that recording to the media library.',
      'You have four scores in your personal library.',
      'Opening the Music Library now.',
      'The library has three copies of that octavo.',
      'I saved it to your personal library.',
      'Play the reference recording first, then sing it back.',
      'Tune to the reference pitch before the downbeat.',
      'From the Part Tracks analysis: F major, 84 measures in 4/4, about three and a half minutes. I read this optically from the PDF, so double-check anything critical against the printed score.',
      "The alto range is E4 up to A4. The score hasn't been analyzed yet for ranges beyond that — ask your director to run it through Part Tracks.",
    ]) {
      expect(namesItsSources(reply), reply.slice(0, 50)).toBe(false);
    }
  });

  it('allows the prescribed liturgy miss-message, where citing IS the answer', () => {
    expect(namesItsSources(
      'I could not verify a controlling rule in the available official Church documents.',
    )).toBe(false);
    expect(namesItsSources(
      'The General Instruction covers this: the psalm is normally sung by the psalmist.',
    )).toBe(false);
  });

  it('still catches a liturgy answer that ALSO leaks the choral corpus', () => {
    expect(namesItsSources(
      'I could not verify a controlling rule in the available official Church documents, and the reference library has nothing either.',
    )).toBe(true);
  });

  it('passes clean answers through', () => {
    for (const reply of [
      'Johannes Brahms wrote A German Requiem, Op. 45, completed in 1868.',
      'Modal mixture is when you borrow chords from the parallel key.',
      'I could not verify that. Could you double-check the spelling?',
      '',
    ]) {
      expect(namesItsSources(reply), reply.slice(0, 40)).toBe(false);
    }
  });
});
