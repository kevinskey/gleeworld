// Shared YouTube search. The youtube-search edge function proxies the Data
// API v3 so the key never reaches the client.
//
// QUOTA: each call costs ~100 units of a 10,000/day free tier — about 100
// searches per DAY across the whole platform, every tenant. This hook fires
// the moment search() is called and deliberately does NOT debounce; that is
// the caller's decision. The /video header bar submits on Enter only, since
// every signed-in member can reach it. The admin-only Add-video dialog keeps
// a 300ms debounce because its audience is small.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeHit {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  url: string;
}

// The edge function answers 503 when YOUTUBE_API_KEY is unset and 502 for any
// upstream rejection — quota exhaustion arrives as the latter. Neither string
// means anything to a choir director, so translate before display.
export function describeSearchFailure(raw: string): string {
  if (/not configured/i.test(raw)) return "YouTube search isn't configured on this server.";
  if (/quota/i.test(raw)) return 'YouTube search has hit its daily limit. Try again tomorrow.';
  if (/^YouTube \d{3}/.test(raw)) return 'YouTube search is unavailable right now. Try again later.';
  return raw;
}

export function useYouTubeSearch(maxResults = 10) {
  const [hits, setHits] = useState<YouTubeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');

  // Monotonic request id: a slow earlier response must never overwrite a
  // newer one. Paired with an alive flag so an unmount drops everything
  // in flight instead of setting state on a dead component.
  const requestRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const clear = useCallback(() => {
    requestRef.current += 1;
    setHits([]);
    setError(null);
    setSearching(false);
    setTerm('');
  }, []);

  const search = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) { clear(); return; }

    const id = ++requestRef.current;
    const current = () => aliveRef.current && id === requestRef.current;

    setTerm(q);
    setSearching(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('youtube-search', {
        body: { q, maxResults },
      });
      if (fnErr) throw fnErr;
      const body = data as { hits?: YouTubeHit[]; error?: string } | null;
      if (body?.error) throw new Error(body.error);
      if (current()) setHits(body?.hits ?? []);
    } catch (e) {
      if (current()) {
        setError(describeSearchFailure(e instanceof Error ? e.message : 'YouTube search failed.'));
        setHits([]);
      }
    } finally {
      if (current()) setSearching(false);
    }
  }, [clear, maxResults]);

  return { hits, searching, error, term, search, clear };
}
