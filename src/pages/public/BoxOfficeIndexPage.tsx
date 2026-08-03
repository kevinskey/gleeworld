// Public Box Office index — lists every published event with tickets on
// sale for the current tenant subdomain. Anon-readable via the
// events_box_office_public_read RLS policy on gw_events.

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

interface PublishedEvent {
  id: string;
  title: string;
  description: string | null;
  venue_name: string | null;
  start_date: string;
  image_url: string | null;
  box_office_slug: string;
}

interface TierPreview {
  event_id: string;
  price_cents: number;
  quantity_total: number;
  quantity_sold: number;
}

function usePublishedEvents() {
  return useQuery<PublishedEvent[]>({
    queryKey: ['box_office_public_index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, description, venue_name, start_date, image_url, box_office_slug')
        .eq('box_office_status', 'published')
        .gte('start_date', new Date(Date.now() - 6 * 3600_000).toISOString())
        .order('start_date', { ascending: true });
      if (error) {
        console.warn('[box-office index] fetch failed', error.message);
        return [];
      }
      return (data ?? []).filter((e) => !!e.box_office_slug) as PublishedEvent[];
    },
  });
}

function useTierPreviews(eventIds: string[]) {
  return useQuery<Record<string, { fromCents: number; remaining: number }>>({
    queryKey: ['box_office_index_tiers', eventIds.sort().join(',')],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ticket_tiers')
        .select('event_id, price_cents, quantity_total, quantity_sold')
        .in('event_id', eventIds);
      if (error) return {};
      const byEvent: Record<string, { fromCents: number; remaining: number }> = {};
      for (const t of (data ?? []) as TierPreview[]) {
        const cur = byEvent[t.event_id] ?? { fromCents: Number.POSITIVE_INFINITY, remaining: 0 };
        if (t.price_cents < cur.fromCents) cur.fromCents = t.price_cents;
        cur.remaining += Math.max(0, t.quantity_total - t.quantity_sold);
        byEvent[t.event_id] = cur;
      }
      return byEvent;
    },
  });
}

export default function BoxOfficeIndexPage() {
  const { data: events = [], isLoading } = usePublishedEvents();
  const { data: tierMap = {} } = useTierPreviews(events.map((e) => e.id));
  const { settings: branding } = useBrandingSettings();

  const featured = events[0];
  const rest = events.slice(1);

  // Pull tenant accent for the hero gradient; fall back to a brand-safe slate.
  const accent = branding?.primary_color || '#0f172a';

  return (
    <UniversalLayout>
      {/* Hero — branded gradient banner that gives the page some weight even
          when there's only one event listed. Uses the tenant's primary
          color so each tenant's Box Office reads as theirs. */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            `linear-gradient(135deg, ${accent} 0%, ${accent}cc 50%, ${accent}99 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex items-center gap-2 text-white/80">
            <Ticket className="w-5 h-5" />
            <span className="text-xs uppercase tracking-[0.22em] font-semibold">
              Tickets
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mt-2 leading-tight">
            GleeWorld Box Office
          </h1>
          <p className="text-base sm:text-lg text-white/80 mt-2 max-w-xl">
            Upcoming concerts and events. Pick a show to buy tickets.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No concerts on sale right now</CardTitle>
              <CardDescription>
                Check back soon. When tickets go live they'll appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {featured && (
              <FeaturedCard event={featured} preview={tierMap[featured.id]} />
            )}
            {rest.length > 0 && (
              <>
                <h2 className="text-sm uppercase tracking-[0.18em] font-semibold text-muted-foreground pt-2">
                  Also upcoming
                </h2>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {rest.map((e) => (
                    <CompactCard key={e.id} event={e} preview={tierMap[e.id]} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
    </UniversalLayout>
  );
}

function priceLabel(cents: number | undefined): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  if (cents === 0) return 'Free';
  const dollars = (cents / 100);
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function FeaturedCard({
  event, preview,
}: {
  event: PublishedEvent;
  preview?: { fromCents: number; remaining: number };
}) {
  const dt = new Date(event.start_date);
  const day = dt.toLocaleString(undefined, { weekday: 'short' });
  const dayNum = dt.getDate();
  const month = dt.toLocaleString(undefined, { month: 'short' });
  const time = dt.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  const from = priceLabel(preview?.fromCents);
  const lowStock = preview && preview.remaining > 0 && preview.remaining <= 20;
  const soldOut = preview && preview.remaining === 0 && Number.isFinite(preview.fromCents);

  return (
    <Link to={`/concert-tickets/${event.box_office_slug}`} className="block group">
      <Card className="overflow-hidden transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
        {event.image_url ? (
          <div className="aspect-[16/7] w-full bg-muted overflow-hidden relative">
            <img src={event.image_url} alt="" className="w-full h-full object-cover" />
            {soldOut && (
              <div className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                Sold out
              </div>
            )}
            {!soldOut && lowStock && (
              <div className="absolute top-3 right-3 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                Only {preview!.remaining} left
              </div>
            )}
          </div>
        ) : (
          <div className="h-2 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        )}
        <CardContent className="p-6 sm:p-8 flex items-start gap-5 sm:gap-7">
          {/* Date plaque — calendar-style date block on the left. Reads
              well at a glance on the busy index page. */}
          <div className="shrink-0 text-center px-3 py-2 rounded-lg border border-border bg-muted/40 min-w-[64px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{day}</div>
            <div className="text-3xl font-bold leading-none tabular-nums mt-0.5">{dayNum}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{month}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              {event.title}
            </div>
            <div className="text-sm text-foreground/70 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {time}</span>
              {event.venue_name && (
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.venue_name}</span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.description}</p>
            )}
            <div className="flex items-center justify-between gap-3 mt-4">
              {from && !soldOut && (
                <div className="text-sm">
                  <span className="text-muted-foreground">From </span>
                  <span className="font-bold text-base">{from}</span>
                </div>
              )}
              <div className={`inline-flex items-center gap-2 text-sm font-semibold ${soldOut ? 'text-muted-foreground' : 'text-primary group-hover:gap-3 transition-all'}`}>
                {soldOut ? 'View details' : 'Buy tickets'}
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CompactCard({
  event, preview,
}: {
  event: PublishedEvent;
  preview?: { fromCents: number; remaining: number };
}) {
  const dt = new Date(event.start_date);
  const day = dt.toLocaleString(undefined, { weekday: 'short' });
  const dayNum = dt.getDate();
  const month = dt.toLocaleString(undefined, { month: 'short' });
  const time = dt.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  const from = priceLabel(preview?.fromCents);
  const soldOut = preview && preview.remaining === 0 && Number.isFinite(preview.fromCents);

  return (
    <li>
      <Link to={`/concert-tickets/${event.box_office_slug}`} className="block group h-full">
        <Card className="overflow-hidden h-full transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
          {event.image_url && (
            <div className="aspect-[3/1] w-full bg-muted overflow-hidden">
              <img src={event.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <CardContent className="p-4 flex items-start gap-3">
            <div className="shrink-0 text-center px-2 py-1.5 rounded-md border border-border bg-muted/40 min-w-[52px]">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{day}</div>
              <div className="text-xl font-bold leading-none tabular-nums">{dayNum}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{month}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold leading-tight truncate">{event.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{time}</span>
                {event.venue_name && <span>· {event.venue_name}</span>}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-sm">
                  {soldOut ? (
                    <span className="text-rose-700 font-semibold">Sold out</span>
                  ) : from ? (
                    <><span className="text-muted-foreground">From </span><span className="font-bold">{from}</span></>
                  ) : null}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
