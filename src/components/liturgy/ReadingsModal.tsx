import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// Daily Catholic readings viewer — proxies Universalis via the `usccb-readings`
// edge function and renders the sanitized reading blocks in a bottom sheet.
// Shared by the Liturgy Planner and the Command Center's Liturgical Day card.

export interface ReadingBlock { heading: string; citation: string | null; summary?: string | null; html: string }
export interface ReadingsResp {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
  error?: string;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function ReadingsModal({ open, onClose, isoDate, sourceUrl }: {
  open: boolean; onClose: () => void; isoDate: string; sourceUrl: string;
}) {
  const [data, setData] = useState<ReadingsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      const { data: resp, error: fnErr } = await supabase.functions.invoke('usccb-readings', {
        body: { date: isoDate },
      });
      if (cancelled) return;
      if (fnErr) {
        setError(fnErr.message || 'Could not fetch readings');
      } else if (resp && (resp as ReadingsResp).readings) {
        setData(resp as ReadingsResp);
      } else {
        setError('No readings returned');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, isoDate]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* Vertical side panel, never wider than half the UI — readings are a
          long single column, so a tall narrow drawer suits them better than a
          wide bottom sheet. Full width only on phones, where half is unusable. */}
      <SheetContent
        side="right"
        className="w-full sm:w-1/2 sm:max-w-[560px] h-[100dvh] flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-2 border-b border-border shrink-0">
          <SheetTitle className="font-extrabold tracking-tight text-lg sm:text-xl text-left">
            {data?.liturgicalTitle || 'Daily Readings'}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            {formatDate(isoDate)} · via{' '}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Universalis</a>
          </p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching readings…
            </div>
          )}

          {error && (
            <div className="text-sm py-6 text-center space-y-3">
              <p className="text-destructive">{error}</p>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[hsl(var(--link))] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Open on Universalis
              </a>
            </div>
          )}

          {data && !loading && !error && (
            <div className="space-y-6 py-2">
              {data.readings.map((r, i) => (
                <section key={i} className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">{r.heading}</h3>
                  {r.citation && <p className="text-xs text-muted-foreground italic">{r.citation}</p>}
                  {r.summary && <p className="text-sm font-semibold italic">{r.summary}</p>}
                  <div
                    className="prose prose-sm max-w-none text-foreground leading-relaxed [&_p]:my-2"
                    // Body HTML is sanitized server-side (only p/br/em/strong/i/b/u/
                    // blockquote/span survive, attributes stripped) and again here
                    // via DOMPurify before injection.
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.html) }}
                  />
                </section>
              ))}
              {data.readings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Couldn&apos;t parse readings from the page.{' '}
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">View original</a>.
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
