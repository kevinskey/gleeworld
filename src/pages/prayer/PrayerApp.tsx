import { useMemo, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { HandHeart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePrayerDay, type PrayerEvent } from '@/hooks/usePrayerDay';

/**
 * Prayer — the day's liturgy.
 *
 * Phase 0 of the Prayer module landed the calendar and the reading citations;
 * resolving those citations to scripture text is Phase 1, so this page shows
 * the day and its citations and says plainly that the text is still coming.
 */

// Liturgical colours are CONTENT, not chrome: a violet vestment is violet
// whatever a tenant picks for its brand, so these deliberately do not follow
// the theme tokens. They are the one place in this page that names a colour.
const VESTMENT_SWATCH: Record<string, string> = {
  white: 'bg-neutral-100 border-neutral-400',
  red: 'bg-red-600 border-red-700',
  green: 'bg-green-700 border-green-800',
  purple: 'bg-purple-700 border-purple-800',
  violet: 'bg-purple-700 border-purple-800',
  rose: 'bg-pink-400 border-pink-500',
  gold: 'bg-amber-400 border-amber-500',
  black: 'bg-neutral-900 border-neutral-900',
};

// Upstream slot keys are snake_case; these are what a director reads.
const SLOT_LABELS: Record<string, string> = {
  first_reading: 'First reading',
  responsorial_psalm: 'Responsorial psalm',
  second_reading: 'Second reading',
  gospel_acclamation: 'Gospel acclamation',
  gospel: 'Gospel',
  epistle: 'Epistle',
  palm_gospel: 'Gospel at the procession',
  note: 'Note',
};

function slotLabel(slot: string): string {
  return (
    SLOT_LABELS[slot] ??
    slot.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  );
}

function seasonLabel(season: string | null): string | null {
  if (!season) return null;
  // ORDINARY_TIME -> Ordinary Time
  return season
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function CelebrationCard({ event }: { event: PrayerEvent }) {
  // Christmas and the Easter Vigil carry several complete formularies; group
  // them so "Mass during the night" does not read as a jumble of duplicates.
  const groups = useMemo(() => {
    const byLabel = new Map<string, typeof event.readings>();
    for (const r of event.readings) {
      const list = byLabel.get(r.schema_label) ?? [];
      list.push(r);
      byLabel.set(r.schema_label, list);
    }
    return [...byLabel.entries()];
  }, [event]);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base sm:text-lg font-semibold leading-snug">{event.name}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {[
                event.rank_label,
                seasonLabel(event.liturgical_season),
                event.sunday_cycle ? `Cycle ${event.sunday_cycle}` : null,
                event.psalter_week ? `Psalter week ${event.psalter_week}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {event.is_holy_day_of_obligation && (
              <p className="text-xs font-medium text-primary">Holy day of obligation</p>
            )}
          </div>
          {event.color?.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {event.color.map((c) => (
                <span
                  key={c}
                  title={`Liturgical colour: ${c}`}
                  className={`w-4 h-4 rounded-full border ${
                    VESTMENT_SWATCH[c.toLowerCase()] ?? 'bg-muted border-border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {event.readings.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground">
            No readings recorded for this celebration.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map(([label, readings]) => (
              <div key={label || 'default'} className="space-y-2">
                {label && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mass {label}
                  </p>
                )}
                <ul className="space-y-2">
                  {readings.map((r) => (
                    <li
                      key={`${label}-${r.slot}`}
                      className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-xs text-muted-foreground sm:w-44 sm:shrink-0">
                        {slotLabel(r.slot)}
                      </span>
                      <span className="text-sm font-medium break-words">{r.citation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrayerApp() {
  const [offset, setOffset] = useState(0);
  const date = useMemo(
    () => format(addDays(new Date(), offset), 'yyyy-MM-dd'),
    [offset],
  );
  const { day, isLoading, isError, error, isNotInstalled } = usePrayerDay(date);

  const heading = useMemo(
    () => format(parseISO(date), 'EEEE, d MMMM yyyy'),
    [date],
  );

  return (
    <DashboardPageShell
      eyebrow="Prayer"
      title="Today"
      icon={HandHeart}
      subtitle="The day in the Church's calendar, with the readings appointed for Mass."
      maxWidth="4xl"
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {offset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Today
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{heading}</p>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading the day…
        </div>
      )}

      {isNotInstalled && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-base font-semibold">Prayer isn’t set up on this site yet</h2>
            <p className="text-sm text-muted-foreground">
              The liturgical calendar and readings haven’t been loaded into this
              database. Once an administrator applies the Prayer setup, this
              page will show each day’s celebration and its readings.
            </p>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-base font-semibold">Couldn’t load the day</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message ?? 'Something went wrong reading the calendar.'}
            </p>
          </CardContent>
        </Card>
      )}

      {day && day.events.length === 0 && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-base font-semibold">Nothing recorded for this date</h2>
            <p className="text-sm text-muted-foreground">
              The calendar currently covers a limited range of years. Try a date
              in the current liturgical year.
            </p>
          </CardContent>
        </Card>
      )}

      {day?.events.map((event) => (
        <CelebrationCard key={event.event_key} event={event} />
      ))}

      {day && day.events.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Readings are shown as citations. The full text is coming in the next
          release, from a public-domain translation.
        </p>
      )}
    </DashboardPageShell>
  );
}
