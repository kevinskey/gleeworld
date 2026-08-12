import { describe, it, expect } from 'vitest';
import { sanitizeForSpeech } from './speech';

describe('sanitizeForSpeech — instruction leakage', () => {
  // Kevin: "sometimes the assistant speaks its own instructions." The prompt
  // now forbids it, but a model will occasionally slip, and a snake_case tool
  // identifier read aloud is gibberish either way. This is the net under the
  // prompt rule, not a replacement for it.
  it('drops internal tool identifiers', () => {
    expect(sanitizeForSpeech('I can use open_page to take you there.'))
      .toBe('I can take you there.');
    expect(sanitizeForSpeech('Calling lookup_bible now.')).toBe('Calling now.');
  });

  it('drops a whole line that is plainly prompt scaffolding', () => {
    const leaked = [
      'Here you go.',
      'Pages you can open (open_page — pass `key` exactly as listed):',
      'Anything else?',
    ].join('\n');
    const out = sanitizeForSpeech(leaked);
    expect(out).not.toContain('Pages you can open');
    expect(out).toContain('Here you go.');
    expect(out).toContain('Anything else?');
  });

  it('drops a leaked rules bullet', () => {
    const out = sanitizeForSpeech(
      'Sure.\n- ACTION-ONLY TURNS ARE SILENT: reply with an EMPTY message.',
    );
    expect(out).not.toContain('ACTION-ONLY');
    expect(out).toBe('Sure.');
  });

  it('leaves ordinary prose completely alone', () => {
    const prose = 'You have two rehearsals on Thursday, at 4 and at 7.';
    expect(sanitizeForSpeech(prose)).toBe(prose);
  });

  // The words themselves are perfectly normal English — only the underscored
  // identifier form is scaffolding. Stripping these would mangle real replies.
  it('does not touch ordinary words that appear inside tool names', () => {
    expect(sanitizeForSpeech('I can open a page for you.'))
      .toBe('I can open a page for you.');
    expect(sanitizeForSpeech('Let me search music by Duke Ellington.'))
      .toBe('Let me search music by Duke Ellington.');
  });

  it('still strips markdown as before', () => {
    expect(sanitizeForSpeech('See **this** and [that](https://x.com).'))
      .toBe('See this and that.');
  });
});

describe('sanitizeForSpeech — music theory', () => {
  // Typed replies pair the spoken chord name with its symbol ("the minor one
  // chord (i)"). TTS reads the symbol as a letter — "the eye chord" — so the
  // parenthetical is dropped before speech (Kevin, 2026-08-11).
  it('drops parenthetical Roman-numeral chord symbols', () => {
    expect(
      sanitizeForSpeech('The minor one chord (i) moves to the dominant seven (V7).'),
    ).toBe('The minor one chord moves to the dominant seven.');
    expect(
      sanitizeForSpeech('Resolve the leading-tone chord (vii°) to the tonic (I).'),
    ).toBe('Resolve the leading-tone chord to the tonic.');
    expect(
      sanitizeForSpeech('Try the flat six (♭VI), then a cadential six-four (V6/4).'),
    ).toBe('Try the flat six, then a cadential six-four.');
    expect(
      sanitizeForSpeech('That is a one, six, four, five progression (I–vi–IV–V).'),
    ).toBe('That is a one, six, four, five progression.');
    expect(
      sanitizeForSpeech('Tonicize the dominant with five of five (V/V).'),
    ).toBe('Tonicize the dominant with five of five.');
  });

  it('leaves ordinary parentheticals alone', () => {
    const prose = 'Rehearsal (the early one) starts at six.';
    expect(sanitizeForSpeech(prose)).toBe(prose);
    const initials = 'Ask the director (Dr. Johnson) first.';
    expect(sanitizeForSpeech(initials)).toBe(initials);
  });

  // ElevenLabs says "prudominate"; the hyphenated spelling — standard in
  // theory writing anyway — pronounces cleanly.
  it('respells predominant so TTS pronounces it', () => {
    expect(sanitizeForSpeech('The predominant chord leads to the dominant.'))
      .toBe('The pre-dominant chord leads to the dominant.');
    expect(sanitizeForSpeech('Predominant harmony comes first.'))
      .toBe('Pre-dominant harmony comes first.');
  });
});
