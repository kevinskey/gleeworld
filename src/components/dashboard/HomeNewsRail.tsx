// News rail on the Command Center home. Headlines come from the
// fetch-news-feeds edge function (Google News + curated sources from
// gw_feed_sources) — fetched server-side because the feeds have no CORS
// and the app CSP's connect-src would block them anyway. Sources are
// managed by admins in Feed Control (/dashboard/feeds).
import { useQuery } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

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
  // sources when any exist, else the platform defaults.
  const tenantSlug: string | null =
    (typeof window !== 'undefined' && (window as any).__TENANT_CONFIG__?.tenant) || null;
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['home-news-feed', tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-news-feeds', {
        body: { tenant: tenantSlug },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch news');
      return (data.items ?? []) as NewsItem[];
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

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
        ) : isError || !items?.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <Newspaper className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">No headlines right now.</p>
            <p className="text-xs text-muted-foreground">
              Check back soon — news from Google News and the music world lands here.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 flex-1 divide-y divide-border overflow-y-auto lg:max-h-none">
            {items.map((n) => (
              <li key={n.link}>
                <a
                  href={n.link}
                  rel="noopener noreferrer"
                  className="group block min-h-[44px] py-2"
                  onClick={(e) => {
                    // Open in a standalone window, not a tab — reading a
                    // story shouldn't bury the dashboard in tab clutter.
                    // (Modifier/middle clicks keep native tab behavior.)
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    window.open(
                      n.link,
                      '_blank',
                      'noopener,noreferrer,popup,width=1100,height=820,left=120,top=80',
                    );
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
          </ul>
        )}
      </div>
    </aside>
  );
}
