import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickRecordingMime } from '../recordingsApi';

describe('pickRecordingMime', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('prefers mp4/aac when webm is unsupported (Safari)', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (t: string) => t.startsWith('audio/mp4'),
    });
    expect(pickRecordingMime()).toEqual({ mimeType: 'audio/mp4', ext: 'm4a' });
  });

  it('never returns webm on Safari even if Safari claims support (PR #80 husk bug)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17 Safari/605',
      vendor: 'Apple Computer, Inc.',
    });
    expect(pickRecordingMime().ext).toBe('m4a');
  });

  it('uses webm/opus on Chrome', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    vi.stubGlobal('navigator', { userAgent: 'Chrome', vendor: 'Google Inc.' });
    expect(pickRecordingMime()).toEqual({ mimeType: 'audio/webm;codecs=opus', ext: 'webm' });
  });
});
