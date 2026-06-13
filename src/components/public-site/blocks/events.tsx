import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import type { BlockModule, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Upcoming events'),
  style: z.enum(['list', 'cards', 'calendar-grid']).default('cards'),
  limit: z.number().int().min(1).max(24).default(4),
});
type Config = z.infer<typeof schema>;

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  location: string | null;
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  // Editor preview reads draft events through the admin's tenant-scoped RLS;
  // the public page goes through the published-site RPC.
  const { data: events = [] } = useQuery<PublicEvent[]>({
    queryKey: ['public-site-events', ctx.slug, ctx.isPreview, config.limit],
    queryFn: async () => {
      if (ctx.isPreview) {
        const { data } = await supabase
          .from('gw_events')
          .select('id, title, description, start_date, location')
          .eq('is_public', true)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(config.limit);
        return (data as PublicEvent[]) ?? [];
      }
      const { data } = await supabase.rpc('get_public_site_events', {
        p_slug: ctx.slug,
        p_limit: config.limit,
      });
      return (data as PublicEvent[]) ?? [];
    },
  });

  if (events.length === 0) return null;

  const dateParts = (iso: string) => {
    const d = new Date(iso);
    return {
      full: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      day: d.toLocaleDateString(undefined, { day: 'numeric' }),
      month: d.toLocaleDateString(undefined, { month: 'short' }),
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    };
  };

  return (
    <section id="events" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <h2 className="font-sans normal-case tracking-tight text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
        {config.heading}
      </h2>

      {config.style === 'list' && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {events.map((ev) => {
            const d = dateParts(ev.start_date);
            return (
              <li key={ev.id} className="flex items-center gap-4 p-4">
                <div className="text-center w-14 shrink-0">
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--site-accent)' }}>{d.month}</div>
                  <div className="text-2xl font-bold leading-none">{d.day}</div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-sans normal-case font-semibold leading-snug">{ev.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.time}{ev.location ? ` · ${ev.location}` : ''}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {config.style === 'cards' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((ev) => {
            const d = dateParts(ev.start_date);
            return (
              <Card key={ev.id} className="p-5 hover:shadow-lg transition">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--site-accent)' }}>
                  {d.full}
                </div>
                <h3 className="font-sans normal-case font-semibold mb-1 leading-snug">{ev.title}</h3>
                {ev.location && <p className="text-sm text-muted-foreground">{ev.location}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {config.style === 'calendar-grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {events.map((ev) => {
            const d = dateParts(ev.start_date);
            return (
              <div key={ev.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="py-2 text-center text-white text-xs font-semibold uppercase" style={{ background: 'var(--site-accent)' }}>
                  {d.month}
                </div>
                <div className="p-3 text-center">
                  <div className="text-3xl font-bold mb-1">{d.day}</div>
                  <div className="font-sans normal-case text-sm font-medium leading-snug line-clamp-2">{ev.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{d.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const eventsBlock: BlockModule<typeof schema> = {
  type: 'events',
  name: 'Events',
  description: 'Your upcoming public events, automatically kept current.',
  icon: Calendar,
  tier: 'free',
  configSchema: schema,
  defaultConfig: { heading: 'Upcoming events', style: 'cards', limit: 4 },
  Render,
};
