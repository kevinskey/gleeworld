// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { useYouTubeSearch, describeSearchFailure } from './useYouTubeSearch';

const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

const hit = (videoId: string) => ({
  videoId, title: `Title ${videoId}`, channelTitle: 'A Choir',
  publishedAt: '2026-01-01T00:00:00Z', description: '', thumbnail: '',
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

beforeEach(() => invoke.mockReset());

describe('describeSearchFailure', () => {
  it('explains a missing API key', () => {
    expect(describeSearchFailure('YOUTUBE_API_KEY not configured on the server'))
      .toMatch(/isn't configured/i);
  });

  it('explains quota exhaustion', () => {
    expect(describeSearchFailure('YouTube 403 quotaExceeded')).toMatch(/daily limit/i);
  });

  it('gives a generic message for other upstream failures', () => {
    expect(describeSearchFailure('YouTube 502 upstream blew up')).toMatch(/unavailable right now/i);
  });

  it('passes an unrecognized message through unchanged', () => {
    expect(describeSearchFailure('Network request failed')).toBe('Network request failed');
  });
});

describe('useYouTubeSearch', () => {
  it('populates hits from a resolved search', async () => {
    invoke.mockResolvedValue({ data: { hits: [hit('a'), hit('b')] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.hits).toHaveLength(2);
    expect(result.current.term).toBe('handel');
    expect(result.current.searching).toBe(false);
    expect(invoke).toHaveBeenCalledWith('youtube-search', { body: { q: 'handel', maxResults: 10 } });
  });

  it('trims the query and skips the call when it is blank', async () => {
    const { result } = renderHook(() => useYouTubeSearch());
    await act(async () => { await result.current.search('   '); });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('surfaces a readable error and empties hits when the edge function fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('YouTube 502 upstream') });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.error).toMatch(/unavailable right now/i);
    expect(result.current.hits).toEqual([]);
  });

  it('treats an error field in the body as a failure', async () => {
    invoke.mockResolvedValue({ data: { error: 'YOUTUBE_API_KEY not configured' }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.error).toMatch(/isn't configured/i);
  });

  it('ignores a slow earlier response so it cannot overwrite newer results', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    invoke
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce({ data: { hits: [hit('new')] }, error: null });

    const { result } = renderHook(() => useYouTubeSearch());

    let firstCall: Promise<void>;
    act(() => { firstCall = result.current.search('old'); });
    await act(async () => { await result.current.search('new'); });

    await act(async () => {
      resolveFirst({ data: { hits: [hit('stale')] }, error: null });
      await firstCall;
    });

    expect(result.current.hits).toHaveLength(1);
    expect(result.current.hits[0].videoId).toBe('new');
  });

  it('clear() drops hits, error, and term', async () => {
    invoke.mockResolvedValue({ data: { hits: [hit('a')] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });
    act(() => { result.current.clear(); });

    expect(result.current.hits).toEqual([]);
    expect(result.current.term).toBe('');
    expect(result.current.error).toBeNull();
  });

  // Exercises the same requestRef guard that protects against a stale
  // response, but through clear() instead of unmount: unmount is not
  // observable here because (a) React 18 no longer warns on a state update
  // after unmount, and (b) result.current is frozen at its last render once
  // unmounted regardless of whether the guard exists — so an unmount-based
  // assertion would pass identically with or without the guard. clear()
  // bumping requestRef is the same code path, and it IS observable: without
  // the bump, the late response would repopulate hits after the clear.
  it('clear() while a search is in flight discards its late response', async () => {
    let resolveIt: (v: unknown) => void = () => {};
    invoke.mockReturnValue(new Promise((r) => { resolveIt = r; }));

    const { result } = renderHook(() => useYouTubeSearch());
    let pending: Promise<void>;
    act(() => { pending = result.current.search('handel'); });

    act(() => { result.current.clear(); });

    await act(async () => {
      resolveIt({ data: { hits: [hit('late')] }, error: null });
      await pending;
    });

    expect(result.current.hits).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  // Smoke coverage only: confirms a response resolving after unmount does
  // not throw or log. It cannot prove the aliveRef guard is exercised —
  // React 18 makes a post-unmount setState a silent no-op either way, and
  // result.current is frozen at its last render regardless of the guard.
  it('resolving a search after unmount does not throw (smoke test)', async () => {
    let resolveIt: (v: unknown) => void = () => {};
    invoke.mockReturnValue(new Promise((r) => { resolveIt = r; }));

    const { result, unmount } = renderHook(() => useYouTubeSearch());
    let pending: Promise<void>;
    act(() => { pending = result.current.search('handel'); });
    unmount();

    // No try/catch: an unhandled rejection or thrown error here fails the
    // test on its own, which is all this smoke test claims to check.
    await act(async () => {
      resolveIt({ data: { hits: [hit('a')] }, error: null });
      await pending;
    });
  });

  it('honors a custom maxResults', async () => {
    invoke.mockResolvedValue({ data: { hits: [] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch(5));
    await act(async () => { await result.current.search('handel'); });
    expect(invoke).toHaveBeenCalledWith('youtube-search', { body: { q: 'handel', maxResults: 5 } });
  });
});
