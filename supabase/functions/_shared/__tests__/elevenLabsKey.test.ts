import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ELEVENLABS_KEY_VARS, resolveElevenLabsKey } from '../elevenLabsKey.ts';

// A key rotation left the live edge-functions container holding
// ELEVENLABS_API_KEY_1 while ELEVENLABS_API_KEY stayed empty. Functions that
// read the fallback chain (tts, conversation-token) kept working; the five
// that read only the old name went dead — including scribe-token, which is
// what the microphone needs, so the assistant stopped hearing anything.
//
// The chain is now in one place, and these pin its behaviour.
const ORIGINAL: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ELEVENLABS_KEY_VARS) {
    ORIGINAL[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ELEVENLABS_KEY_VARS) {
    if (ORIGINAL[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL[k];
  }
});

describe('resolveElevenLabsKey', () => {
  it('finds the rotated key when only the numbered name is set', () => {
    process.env.ELEVENLABS_API_KEY_1 = 'sk_rotated';
    expect(resolveElevenLabsKey()).toBe('sk_rotated');
  });

  it('finds the plain key when only that is set', () => {
    process.env.ELEVENLABS_API_KEY = 'sk_plain';
    expect(resolveElevenLabsKey()).toBe('sk_plain');
  });

  it('prefers the rotated key when both are set', () => {
    process.env.ELEVENLABS_API_KEY = 'sk_old';
    process.env.ELEVENLABS_API_KEY_1 = 'sk_new';
    expect(resolveElevenLabsKey()).toBe('sk_new');
  });

  it('treats an EMPTY value as absent and falls through — the exact live failure', () => {
    // The container really did hold ELEVENLABS_API_KEY as a zero-length
    // string. A plain `??` or `||` on Deno.env.get would have been fine, but
    // an existence check would not; this pins the empty case.
    process.env.ELEVENLABS_API_KEY = '';
    process.env.ELEVENLABS_API_KEY_1 = 'sk_rotated';
    expect(resolveElevenLabsKey()).toBe('sk_rotated');
  });

  it('ignores a whitespace-only value', () => {
    process.env.ELEVENLABS_API_KEY = '   ';
    process.env.ELEVENLABS_API_KEY_1 = 'sk_rotated';
    expect(resolveElevenLabsKey()).toBe('sk_rotated');
  });

  it('trims a stray newline, which a copied secret often carries', () => {
    process.env.ELEVENLABS_API_KEY_1 = 'sk_rotated\n';
    expect(resolveElevenLabsKey()).toBe('sk_rotated');
  });

  it('returns null when nothing is configured, so callers can 500 honestly', () => {
    expect(resolveElevenLabsKey()).toBeNull();
  });

  it('lists every accepted variable name, newest first', () => {
    expect(ELEVENLABS_KEY_VARS[0]).toBe('ELEVENLABS_API_KEY_1');
    expect(ELEVENLABS_KEY_VARS).toContain('ELEVENLABS_API_KEY');
  });
});
