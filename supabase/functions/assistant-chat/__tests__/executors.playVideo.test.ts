import { describe, it, expect, vi, afterEach } from 'vitest';
import { executeServerTool } from '../executors';

// play_video's q path resolves through searchYoutube, which returns
// { hits: [{ video_id, ... }] }. playVideo read { videos: [{ id }] } —
// wrong container AND wrong field — so every q-only call failed with
// "Nothing on YouTube matched" (Kevin, 2026-08-12). Only the explicit
// videoId path (model calls search_youtube first) ever worked.

const YT_RESPONSE = {
  items: [{
    id: { videoId: 'Vv9-WlymKg0' },
    snippet: { title: 'Total Praise - Richard Smallwood', channelTitle: 'GospelMusicTV', thumbnails: { medium: { url: 'http://x/t.jpg' } } },
  }],
};

afterEach(() => vi.unstubAllGlobals());

describe('play_video q path', () => {
  it('resolves a query through YouTube search and returns a panel', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(YT_RESPONSE), { status: 200 })));
    const out = await executeServerTool('play_video', { q: 'Total Praise' },
      { supabase: { from: () => ({}) }, youtubeApiKey: 'k' } as never);
    expect(out.resultsPanel).toBeTruthy();
    expect(out.resultsPanel!.kind).toBe('video');
    expect((out.resultsPanel as { videoId: string }).videoId).toBe('Vv9-WlymKg0');
    expect(JSON.parse(out.replyJson).playing).toBe('Vv9-WlymKg0');
  });

  it('reports an honest miss when YouTube has nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })));
    const out = await executeServerTool('play_video', { q: 'zzz no such piece' },
      { supabase: { from: () => ({}) }, youtubeApiKey: 'k' } as never);
    expect(out.resultsPanel).toBeUndefined();
    expect(JSON.parse(out.replyJson).error).toContain('Nothing on YouTube matched');
  });

  it('explicit videoId path still bypasses search', async () => {
    const out = await executeServerTool('play_video', { videoId: 'abc123', title: 'X' },
      { supabase: { from: () => ({}) } } as never);
    expect((out.resultsPanel as { videoId: string }).videoId).toBe('abc123');
  });
});
