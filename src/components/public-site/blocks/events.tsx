import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Upcoming events'),
  style: z.enum(['month', 'list', 'cards']).default('month'),
  limit: z.number().int().min(1).max(48).default(12),
});
type Config = z.infer<typeof schema>;

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  location: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(viewMonth: Date) {
  const first = startOfMonth(viewMonth);
  const firstWeekday = first.getDay();
  const days: { date: Date; inMonth: boolean }[] = [];
  // Lead-in from previous month so the first row is filled.
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - (i + 1));
    days.push({ date: d, inMonth: false });
  }
  // Days in the current month.
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= last; i++) {
    days.push({ date: new Date(first.getFullYear(), first.getMonth(), i), inMonth: true });
  }
  // Trail-out to complete the final week (and ensure 5 or 6 full rows).
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

function MonthCalendar({ events }: { events: PublicEvent[] }) {
  const today = useMemo(() => new Date(), []);
  const earliestEventMonth = useMemo(() => {
    if (events.length === 0) return startOfMonth(today);
    const earliest = new Date(events[0].start_date);
    return earliest < today ? startOfMonth(today) : startOfMonth(earliest);
  }, [events, today]);
  const [viewMonth, setViewMonth] = useState<Date>(earliestEventMonth);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  // Bucket events by YYYY-MM-DD for quick day lookup.
  const eventsByDay = useMemo(() => {
    const m = new Map<string, PublicEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = m.get(key) ?? [];
      list.push(ev);
      m.set(key, list);
    }
    return m;
  }, [events]);

  const goto = (delta: number) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => goto(-1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-base sm:text-lg font-semibold">
          {viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={() => goto(1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map(({ date, inMonth }, i) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);
          return (
            <div
              key={i}
              className={`min-h-[64px] sm:min-h-[88px] border-t border-r border-border last-in-row p-1.5 ${
                inMonth ? 'bg-card' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm ${inMonth ? 'text-foreground' : 'text-muted-foreground'} ${
                    isToday ? 'font-bold' : ''
                  }`}
                >
                  {isToday ? (
                    <span
                      className="inline-flex items-center justify-center rounded-full w-6 h-6 text-white"
                      style={{ background: 'var(--site-accent)' }}
                    >
                      {date.getDate()}
                    </span>
                  ) : (
                    date.getDate()
                  )}
                </span>
                {dayEvents.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[10px] sm:text-xs rounded px-1 py-0.5 truncate"
                    title={ev.title}
                    style={{ background: 'var(--site-accent)', color: 'white', opacity: 0.9 }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingList({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {events.map((ev) => {
        const d = new Date(ev.start_date);
        return (
          <div
            key={ev.id}
            className="rounded-lg border border-border bg-card p-3 flex gap-3"
          >
            <div className="text-center w-12 shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--site-accent)' }}>
                {d.toLocaleDateString(undefined, { month: 'short' })}
              </div>
              <div className="text-xl font-bold leading-none">{d.getDate()}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="normal-case font-semibold text-sm leading-snug truncate">{ev.title}</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </div>
              {ev.location && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{ev.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
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

  if (events.length === 0 && config.style !== 'month') return null;

  return (
    <section id="events" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
        {config.heading}
      </h2>

      {config.style === 'month' && (
        <>
          <MonthCalendar events={events} />
          <UpcomingList events={events.slice(0, 6)} />
        </>
      )}

      {config.style === 'list' && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {events.map((ev) => {
            const d = new Date(ev.start_date);
            return (
              <li key={ev.id} className="flex items-center gap-4 p-4">
                <div className="text-center w-14 shrink-0">
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--site-accent)' }}>
                    {d.toLocaleDateString(undefined, { month: 'short' })}
                  </div>
                  <div className="text-2xl font-bold leading-none">{d.getDate()}</div>
                </div>
                <div className="min-w-0">
                  <h3 className="normal-case font-semibold leading-snug">{ev.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {config.style === 'cards' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((ev) => {
            const d = new Date(ev.start_date);
            return (
              <Card key={ev.id} className="p-5 hover:shadow-lg transition">
                <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--site-accent)' }}>
                  {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <h3 className="normal-case font-semibold mb-1 leading-snug">{ev.title}</h3>
                {ev.location && <p className="text-sm text-muted-foreground">{ev.location}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Layout</Label>
        <Select value={config.style} onValueChange={(v) => set({ style: v as Config['style'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month calendar</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
            <SelectItem value="list">Compact list</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Events to load</Label>
          <span className="text-xs text-slate-500 tabular-nums">{config.limit}</span>
        </div>
        <input
          type="range"
          min={1}
          max={48}
          step={1}
          value={config.limit}
          onChange={(e) => set({ limit: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
      </div>
    </div>
  );
}

export const eventsBlock: BlockModule<typeof schema> = {
  type: 'events',
  name: 'Events',
  description: 'A live calendar of your upcoming public events with month, cards, or list layouts.',
  icon: Calendar,
  tier: 'free',
  group: 'core',
  poweredBy: 'Calendar & Events',
  configSchema: schema,
  defaultConfig: { heading: 'Upcoming events', style: 'month', limit: 12 },
  EditorForm,
  Render,
};
