import { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { isNativeCalendarAvailable } from '@/plugins/gwCalendar';
import { useIosCalendarAccess, useIosCalendarSync } from '@/hooks/useIosCalendar';

export function IosCalendarPanel() {
  if (!isNativeCalendarAvailable()) return null;
  return <IosCalendarPanelInner />;
}

function IosCalendarPanelInner() {
  const { status, request } = useIosCalendarAccess();
  const sync = useIosCalendarSync();
  const [pulling, setPulling] = useState(false);

  const runPull = async () => {
    setPulling(true);
    try {
      const r = await sync.mutateAsync();
      toast.success(`Pulled ${r.upserted} events${r.deleted ? `, removed ${r.deleted} stale` : ''}.`);
    } catch (e: any) {
      toast.error('iPhone sync failed — ' + (e?.message ?? String(e)));
    } finally {
      setPulling(false);
    }
  };

  const grantAndPull = async () => {
    const s = await request();
    if (s.granted) void runPull();
    else toast.error('Calendar access denied. Enable it in Settings → GleeWorld → Calendars.');
  };

  const granted = status?.granted === true;

  return (
    <section className="rounded-lg border border-border p-4 space-y-3">
      <header className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        iPhone Calendar (iOS app only)
      </header>
      <p className="text-sm text-muted-foreground">
        Pull events from your iPhone Calendar so they appear alongside your GleeWorld schedule.
      </p>
      {!granted && (
        <button
          type="button"
          onClick={grantAndPull}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Grant Access
        </button>
      )}
      {granted && (
        <button
          type="button"
          onClick={runPull}
          disabled={pulling}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {pulling && <Loader2 className="w-4 h-4 animate-spin" />}
          Pull from iPhone
        </button>
      )}
    </section>
  );
}
