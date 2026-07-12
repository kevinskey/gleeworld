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
// not one per accumulated page. Headlines open in an in-app reader sheet
// (most news sites block iframing, so the sheet shows the feed's own
// summary with an explicit "Open full article" escape hatch).
import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
  imageUrl?: string | null;
}

const PAGE_SIZE = 15;
const MAX_ITEMS = 150; // matches the edge function's limit clamp

// The edge function decodes the common entities but feeds still leak a few.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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

  // Full-article extraction: the sheet opens instantly on the feed summary,
  // then the server-extracted body streams in underneath when it lands.
  // Extraction is best-effort (paywalls/JS pages fail) — on failure the
  // summary simply stays, no error surfaced.
  const { data: fullArticle, isFetching: extracting } = useQuery({
    queryKey: ['article-extract', reading?.link],
    enabled: readerOpen && !!reading?.link,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('extract-article', {
        body: { url: reading!.link },
      });
      // Throw on failure (rather than returning null) so react-query keeps
      // it as an error state — a transient blip retries on next open instead
      // of being cached forever as a successful "no article".
      if (error || !data?.success) throw new Error(data?.error || 'extraction failed');
      return data as { paragraphs: string[]; byline: string | null; siteName: string | null; truncated: boolean };
    },
  });

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
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">News</div>
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

      <Sheet open={readerOpen} onOpenChange={setReaderOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {reading && (
            <>
              <SheetHeader className="text-left">
                <p className="text-xs text-muted-foreground">
                  {reading.source}
                  {timeAgo(reading.pubDate) && ` · ${timeAgo(reading.pubDate)}`}
                </p>
                <SheetTitle className="text-lg leading-snug">
                  {decodeEntities(reading.title)}
                </SheetTitle>
              </SheetHeader>
              {reading.imageUrl && (
                <img
                  src={reading.imageUrl}
                  alt=""
                  className="mt-3 w-full max-h-56 object-cover border border-border"
                  loading="lazy"
                  // Most outlets' image hosts aren't in the CSP img-src
                  // allowlist — hide the frame instead of showing a broken box.
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {fullArticle?.paragraphs?.length ? (
                <div className="mt-3 space-y-3">
                  {/* Radix wires aria-describedby to SheetDescription; keep
                      one (visually hidden) when the full article replaces
                      the summary so the dialog stays described. */}
                  <SheetDescription className="sr-only">
                    Full article text from {fullArticle.siteName || reading.source}
                  </SheetDescription>
                  {fullArticle.byline && (
                    <p className="text-xs text-muted-foreground">{fullArticle.byline}</p>
                  )}
                  {fullArticle.paragraphs.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
                  ))}
                  {fullArticle.truncated && (
                    <p className="text-xs text-muted-foreground">
                      Story shortened for the reader — the full version is on the source site.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <SheetDescription className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {reading.description
                      // Strip tags AFTER decoding: feeds ship entity-encoded
                      // markup (&lt;em&gt;) that the server's pre-decode strip
                      // pass can't see, and it would render as literal text.
                      ? decodeEntities(reading.description).replace(/<[^>]+>/g, '')
                      : "This source didn't include a summary. Open the full article to read the story."}
                  </SheetDescription>
                  {extracting && (
                    <p className="mt-3 text-xs text-muted-foreground" role="status" aria-live="polite">
                      Loading the full story…
                    </p>
                  )}
                </>
              )}
              <div className="mt-5">
                <Button asChild className="w-full sm:w-auto">
                  <a href={reading.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1.5" /> Open full article
                  </a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </aside>
  );
}
