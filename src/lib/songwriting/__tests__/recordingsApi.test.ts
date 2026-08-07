import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickRecordingMime, listRecordings } from '../recordingsApi';

const ROWS = [
  { id: 'r1', song_id: 's1', user_id: 'u1', storage_key: 'k1', mime_type: 'audio/webm', size_bytes: 10, duration_ms: 1, created_at: '2026-08-06T00:00:02Z' },
  { id: 'r2', song_id: 's1', user_id: 'u1', storage_key: 'k2', mime_type: 'audio/webm', size_bytes: 20, duration_ms: 2, created_at: '2026-08-06T00:00:01Z' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: ROWS, error: null }) }),
      }),
    }),
  },
}));

// k1 signs, k2 cannot — the exact shape of the production failure.
vi.mock('@/utils/storage', () => ({
  getSignedUrl: vi.fn(async (_bucket: string, path: string) =>
    path === 'k1' ? 'https://signed/k1' : null,
  ),
}));

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

  it('never returns webm on iOS Chrome (CriOS is still Apple WebKit under the hood)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
      vendor: 'Apple Computer, Inc.',
    });
    expect(pickRecordingMime().ext).toBe('m4a');
  });
});

describe('listRecordings', () => {
  it('keeps a recording whose audio cannot be signed, with a null url', async () => {
    // The bug this guards: unsignable rows used to be filtered out, so five
    // saved recordings rendered as "No recordings yet" while the rows and the
    // audio files both existed. A saved take must never silently disappear.
    const out = await listRecordings('s1');
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(out[1].url).toBeNull();
  });

  it('still returns the playable url for rows that do sign', async () => {
    const out = await listRecordings('s1');
    expect(out[0].url).toBe('https://signed/k1');
  });

  it('requests signing with waitForReady so a fresh upload rides out the flatten window', async () => {
    const { getSignedUrl } = await import('@/utils/storage');
    await listRecordings('s1');
    expect(getSignedUrl).toHaveBeenCalledWith('songwriting', 'k1', 3600, true);
  });
});
