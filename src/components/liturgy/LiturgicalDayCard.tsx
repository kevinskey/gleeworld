import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Church, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usccbReadingsUrl } from '@/lib/liturgy/calendar';
import { ReadingsModal } from './ReadingsModal';

// Top-of-Command-Center card for Catholic tenants: shows today's liturgical day
// name (pulled from Universalis via the usccb-readings edge function) and opens
// the day's readings in a sheet on tap. Gated by the liturgy_planner module in
// HouseHome, so only tenants with the Liturgy add-on see it.
export function LiturgicalDayCard() {
  const today = useMemo(() => new Date(), []);
  const iso = format(today, 'yyyy-MM-dd');
  const [title, setTitle] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('usccb-readings', { body: { date: iso } });
        if (!cancelled && (data as { liturgicalTitle?: string } | null)?.liturgicalTitle) {
          setTitle((data as { liturgicalTitle: string }).liturgicalTitle);
        }
      } catch { /* non-blocking — the card still opens and the modal fetches */ }
    })();
    return () => { cancelled = true; };
  }, [iso]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors"
      >
        <span className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
          <Church className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Liturgy
          </div>
          <div className="font-serif text-lg font-semibold leading-tight truncate">
            {title || format(today, 'EEEE')}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {format(today, 'EEEE, MMMM d')} · View today&apos;s readings
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </button>

      <ReadingsModal
        open={open}
        onClose={() => setOpen(false)}
        isoDate={iso}
        sourceUrl={usccbReadingsUrl(today)}
      />
    </>
  );
}
