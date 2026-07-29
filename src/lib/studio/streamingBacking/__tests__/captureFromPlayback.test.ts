import { describe, it, expect, vi, beforeAll } from 'vitest';
import { captureFromPlayback } from '../captureFromPlayback';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
      }),
    },
  },
}));

// Provide a minimal AudioContext stub so decodeAudioData resolves.
class MockCtx {
  async decodeAudioData(_ab: ArrayBuffer): Promise<AudioBuffer> {
    return {
      length: 44100,
      numberOfChannels: 1,
      sampleRate: 44100,
      duration: 1,
      getChannelData: () => new Float32Array(44100),
    } as unknown as AudioBuffer;
  }
  async close() {}
}

beforeAll(() => {
  (global as any).window = {};
  (global as any).window.AudioContext = MockCtx;
  (global as any).window.webkitAudioContext = MockCtx;
});

describe('captureFromPlayback', () => {
  it('decodes → WAVs → uploads → returns public URL', async () => {
    const blob = new Blob([new Uint8Array(2000)], { type: 'audio/webm' });
    const out = await captureFromPlayback({ blob, sessionId: 'sess-1' });
    expect(out.url).toContain('studio/');
    expect(out.url).toContain('sess-1');
    expect(out.url).toContain('.wav');
    expect(out.title).toMatch(/\.wav$/);
  });

  it('throws on tiny blobs (< 1KB)', async () => {
    const tiny = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    await expect(captureFromPlayback({ blob: tiny, sessionId: 's' })).rejects.toThrow(/too short/i);
  });
});
