// News rail on the Command Center home. Headlines come from the
// fetch-news-feeds edge function (Google News + curated sources from
// gw_feed_sources) — fetched server-side because the feeds have no CORS
// and the app CSP's connect-src would block them anyway. Sources are
// managed by admins in Feed Control (/dashboard/feeds).
//
// Infinite scroll uses a GROWING-LIMIT single query (offset always 0,
// limit grows by PAGE_SIZE): the server rebuilds its pool from live RSS on
// every request, so slicing separate offset pages would drift between
// requests (duplicate/skipped headlines). One growing request is always
// internally consistent, and the 15-minute refetch re-runs one request,
// not one per accumulated page. Headlines open in the shared in-app
// ArticleReaderSheet (most news sites block iframing; the sheet shows the
// extracted story with save-to-notes and an "Open full article" escape
// hatch).
import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  ArticleReaderSheet, decodeEntities, timeAgo, type NewsReaderItem,
} from '@/components/news/ArticleReader';

interface NewsItem extends NewsReaderItem {
  pubDate: string;
  source: string;
}

const PAGE_SIZE = 15;
const MAX_ITEMS = 150; // matches the edge function's limit clamp

export function HomeNewsRail() {
  // Feeds are per-tenant: the function uses this tenant's Feed Control
  // sources when any exist, else the signed-in caller's own tenant
  // (verified JWT, resolved server-side), else the platform defaults.
  const tenantSlug: string | null =
    (typeof window !== 'undefined' && (window as any).__TENANT_CONFIG__?.tenant) || null;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['home-news-feed', tenantSlug, visibleCount],
    // Growing the limit keeps the previous list rendered while the larger
    // page loads, so scroll position never jumps.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ items: NewsItem[]; hasMore: boolean }> => {
      const { data, error } = await supabase.functions.invoke('fetch-news-feeds', {
        body: { tenant: tenantSlug, offset: 0, limit: visibleCount },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch news');
      return { items: (data.items ?? []) as NewsItem[], hasMore: !!data.hasMore };
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const hasMore = !!data?.hasMore && visibleCount < MAX_ITEMS;

  // Reader sheet: `readerOpen` drives the sheet so `reading` can stay
  // mounted through the close animation (nulling it immediately would
  // blank the panel on the first frame of the slide-out).
  const [reading, setReading] = useState<NewsItem | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, MAX_ITEMS));
        }
      },
      { root: listRef.current, rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetching, items.length]);

  return (
    // relative + lg:absolute-inset scroll area: the rail scrolls within
    // whatever height the status-card column sets, and can never stretch
    // the shared grid row taller.
    <aside className="relative min-h-[16rem] border border-border bg-card" aria-label="News">
      <div className="flex h-full flex-col p-3 lg:absolute lg:inset-0">
        <div className="mb-2 flex min-h-[44px] items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">News</span>
          <Link to="/dashboard/feeds" className="text-sm text-muted-foreground hover:text-foreground">
            Edit
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-3 py-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-full animate-pulse bg-muted" />
                <div className="h-3 w-2/5 animate-pulse bg-muted" />
              </div>
            ))}
          </div>
        ) : isError && !items.length ? (
          // Only surface the error panel when there's nothing to show — a
          // failed background refetch must not wipe loaded headlines.
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <Newspaper className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">News is having trouble loading.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Try again
            </Button>
          </div>
        ) : !items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <Newspaper className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">No headlines right now.</p>
            <p className="text-xs text-muted-foreground">
              Check back soon — news from Google News and the music world lands here.
            </p>
          </div>
        ) : (
          <ul ref={listRef} className="max-h-96 flex-1 divide-y divide-border overflow-y-auto lg:max-h-none">
            {items.map((n) => (
              <li key={n.link}>
                <a
                  href={n.link}
                  rel="noopener noreferrer"
                  className="group block min-h-[44px] py-2"
                  onClick={(e) => {
                    // Open in the in-app reader sheet — reading a story
                    // shouldn't leave the dashboard. (Modifier/middle
                    // clicks keep native link behavior for power users.)
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    setReading(n);
                    setReaderOpen(true);
                  }}
                >
                  <p className="line-clamp-2 text-sm leading-snug group-hover:underline">
                    {decodeEntities(n.title)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.source}
                    {timeAgo(n.pubDate) && ` · ${timeAgo(n.pubDate)}`}
                  </p>
                </a>
              </li>
            ))}
            {hasMore && (
              <li ref={sentinelRef} role="status" aria-live="polite" className="py-3 text-center">
                <span className="text-xs text-muted-foreground">
                  {isFetching ? 'Loading more…' : ''}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <ArticleReaderSheet item={reading} open={readerOpen} onOpenChange={setReaderOpen} />
    </aside>
  );
}
