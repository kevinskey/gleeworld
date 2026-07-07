// audioEngine.ts recording-layer tests. This module (Part Tracks' shared
// AudioContext-based playback + recording engine) touches getUserMedia /
// MediaRecorder / AudioContext globals for the recording path, none of
// which exist in this repo's plain-'node' vitest environment (see
// src/lib/studio/engine/__tests__/engine.test.ts's header comment for the
// same rationale). `extensionForMimeType` is deliberately a pure function
// over a string so it can be exercised directly here — it's the piece of
// glue Task 2 of docs/superpowers/plans/2026-07-05-part-tracks-shared-engine.md
// added: since `stopRecording()` now runs every take through
// `trimHeadLatency` (which re-encodes successfully-trimmed takes to WAV),
// the upload extension/contentType has to be derived from the take's
// FINAL mime type, not the pre-recording format probe.

import { describe, test, expect } from 'vitest';
import {
  extensionForMimeType, getRecordingExtension, getRecordingMimeType,
  TRACK_FETCH_RETRY_DELAYS_MS, orderRecorderMimeCandidates,
} from '../audioEngine';

describe('extensionForMimeType', () => {
  test('maps WAV variants to "wav" (the post-trim case)', () => {
    expect(extensionForMimeType('audio/wav')).toBe('wav');
    expect(extensionForMimeType('audio/wave')).toBe('wav');
    expect(extensionForMimeType('audio/x-wav')).toBe('wav');
  });

  test('maps mp4/aac variants to "m4a" (Safari/iOS untrimmed fallback)', () => {
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
    expect(extensionForMimeType('audio/aac')).toBe('m4a');
  });

  test('falls back to "webm" for webm/opus and anything unrecognized', () => {
    expect(extensionForMimeType('audio/webm')).toBe('webm');
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('')).toBe('webm');
    expect(extensionForMimeType('audio/ogg')).toBe('webm');
  });

  test('is case-insensitive', () => {
    expect(extensionForMimeType('AUDIO/WAV')).toBe('wav');
    expect(extensionForMimeType('Audio/MP4')).toBe('m4a');
  });
});

describe('TRACK_FETCH_RETRY_DELAYS_MS', () => {
  test('total retry window covers the 60s storage flatten interval with margin', () => {
    // Fresh uploads 403 at their public URL until the droplet's
    // once-a-minute flatten cron runs. If this schedule ever shrinks
    // below ~60s again, a just-uploaded backing track goes back to
    // looking permanently broken (the 2026-07-07 Part Tracks bug).
    const total = TRACK_FETCH_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(75_000);
  });

  test('first attempts stay quick so ordinary CDN blips resolve fast', () => {
    // The first four attempts should all land within ~3s — the common
    // "upload just landed" case must not wait tens of seconds.
    const early = TRACK_FETCH_RETRY_DELAYS_MS.slice(0, 4).reduce((a, b) => a + b, 0);
    expect(TRACK_FETCH_RETRY_DELAYS_MS[0]).toBe(0);
    expect(early).toBeLessThanOrEqual(3_000);
  });
});

describe('orderRecorderMimeCandidates', () => {
  test('Apple engines get mp4/aac BEFORE any webm candidate', () => {
    // Safari 18.4+ claims MediaRecorder webm/opus support but its
    // decodeAudioData still rejects webm, and its webm recorder emitted
    // 5-byte husk takes (2026-07-07 incident). If webm ever sorts ahead
    // of mp4 for Apple engines again, Safari recording silently breaks.
    const apple = orderRecorderMimeCandidates(true);
    const lastMp4 = Math.max(apple.indexOf('audio/mp4'), apple.indexOf('audio/mp4;codecs=mp4a.40.2'), apple.indexOf('audio/aac'));
    const firstWebm = apple.findIndex((t) => t.startsWith('audio/webm'));
    expect(lastMp4).toBeLessThan(firstWebm);
    expect(apple[0]).toBe('audio/mp4;codecs=mp4a.40.2');
  });

  test('non-Apple engines keep webm/opus first (Chrome/Firefox native path)', () => {
    const other = orderRecorderMimeCandidates(false);
    expect(other[0]).toBe('audio/webm;codecs=opus');
  });

  test('both orderings contain the same candidate set', () => {
    expect([...orderRecorderMimeCandidates(true)].sort())
      .toEqual([...orderRecorderMimeCandidates(false)].sort());
  });
});

describe('getRecordingExtension / getRecordingMimeType', () => {
  test('default to audio/webm + "webm" before any take has been recorded', () => {
    // Fresh module state (nothing has called startRecording/stopRecording
    // in this test file) — matches the pre-Task-2 default too.
    expect(getRecordingMimeType()).toBe('audio/webm');
    expect(getRecordingExtension()).toBe('webm');
  });
});
