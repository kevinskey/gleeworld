import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  PRAYER_CATEGORY_LABELS,
  type PrayerText,
} from '@/hooks/usePrayerTexts';

/** Renders a prayer body: blank lines separate stanzas, single newlines break lines. */
export function PrayerBody({ body }: { body: string }) {
  const stanzas = useMemo(() => body.split(/\n\s*\n/), [body]);
  return (
    <div className="space-y-3">
      {stanzas.map((stanza, i) => (
        <p key={i} className="text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {stanza}
        </p>
      ))}
    </div>
  );
}

export function PrayerCard({ prayer }: { prayer: PrayerText }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-semibold">{prayer.title}</h2>
          {prayer.latin_title && (
            <p className="text-xs italic text-muted-foreground">{prayer.latin_title}</p>
          )}
        </div>
        <PrayerBody body={prayer.body} />
        <p className="text-xs text-muted-foreground pt-1">{prayer.source_note}</p>
      </CardContent>
    </Card>
  );
}

/** One collapsible category of prayers. Closed by default except the first. */
function CategorySection({
  label,
  prayers,
  defaultOpen,
}: {
  label: string;
  prayers: PrayerText[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          <span className="ml-2 font-normal normal-case tracking-normal">
            {prayers.length}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-3">
          {prayers.map((p) => (
            <PrayerCard key={p.id} prayer={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The prayer library, grouped by category. Ordering follows the category list
 * rather than the database's sort_order so "Every day" always leads.
 */
export function PrayerLibrary({ prayers }: { prayers: PrayerText[] }) {
  const grouped = useMemo(() => {
    const order: PrayerText['category'][] = [
      'daily',
      'marian',
      'act',
      'devotional',
      'canticle',
      'seasonal',
    ];
    return order
      .map((c) => ({ category: c, items: prayers.filter((p) => p.category === c) }))
      .filter((g) => g.items.length > 0);
  }, [prayers]);

  if (!prayers.length) return null;

  return (
    <div className="space-y-2">
      {grouped.map((g, i) => (
        <CategorySection
          key={g.category}
          label={PRAYER_CATEGORY_LABELS[g.category]}
          prayers={g.items}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
