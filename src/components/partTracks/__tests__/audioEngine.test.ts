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
import { extensionForMimeType, getRecordingExtension, getRecordingMimeType } from '../audioEngine';

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

describe('getRecordingExtension / getRecordingMimeType', () => {
  test('default to audio/webm + "webm" before any take has been recorded', () => {
    // Fresh module state (nothing has called startRecording/stopRecording
    // in this test file) — matches the pre-Task-2 default too.
    expect(getRecordingMimeType()).toBe('audio/webm');
    expect(getRecordingExtension()).toBe('webm');
  });
});
