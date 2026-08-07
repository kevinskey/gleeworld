import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, ExternalLink, Volume2, Square, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpokenText } from '@/hooks/useChapterAudio';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { readingsFromCache } from '@/lib/liturgy/cachedReadings';

// Daily Catholic readings viewer. Reads the local USCCB table first and falls
// back to proxying Universalis via the `usccb-readings` edge function, then
// renders the sanitized reading blocks in a bottom sheet.
// Shared by the Liturgy Planner and the Command Center's Liturgical Day card.

export interface ReadingBlock { heading: string; citation: string | null; summary?: string | null; html: string }
export interface ReadingsResp {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
  error?: string;
  /** Set when the date lies outside the window Universalis publishes. */
  outOfRange?: boolean;
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

/** Reading HTML → sentences to speak.
 *
 *  Sentence-sized chunks, not whole readings: a Gospel is several hundred
 *  words, which is a long silence before the first sound and impossible to
 *  stop part-way. Split on sentence ends, then regrouped so no chunk is
 *  absurdly short. The heading and citation are spoken first so a listener
 *  knows what is being read.
 */
function readingsToSpeech(readings: ReadingBlock[]): string[] {
  const out: string[] = [];
  for (const r of readings) {
    out.push(r.citation ? `${r.heading}. ${r.citation}.` : `${r.heading}.`);
    const text = r.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    let buf = '';
    for (const piece of text.split(/(?<=[.!?])\s+/)) {
      buf = buf ? `${buf} ${piece}` : piece;
      if (buf.length >= 180) { out.push(buf); buf = ''; }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

export function ReadingsModal({ open, onClose, isoDate, sourceUrl }: {
  open: boolean; onClose: () => void; isoDate: string; sourceUrl: string;
}) {
  const [data, setData] = useState<ReadingsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Not published yet" is an expected state, not a failure. Kept apart from
  // `error` so the two are never styled the same.
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPending(false);
    setData(null);
    (async () => {
      // The local USCCB table first: Universalis only publishes about a week
      // either side of today, so anything further out reported "not posted
      // yet" even when the readings were sitting in the database.
      const cached = await readingsFromCache(isoDate);
      if (cancelled) return;
      if (cached) {
        setData({
          date: isoDate,
          sourceUrl: cached.sourceUrl || sourceUrl,
          liturgicalTitle: cached.liturgicalTitle,
          readings: cached.blocks,
        });
        setLoading(false);
        return;
      }

      const { data: resp, error: fnErr } = await supabase.functions.invoke('usccb-readings', {
        body: { date: isoDate },
      });
      if (cancelled) return;
      if (fnErr) {
        setError(fnErr.message || 'Could not fetch readings');
      } else if (resp && (resp as ReadingsResp).error) {
        // The function reports WHY there is nothing to show — most often that
        // Universalis has not published this date yet. Surface that instead of
        // falling through to the empty-readings copy, which blames the parser.
        setError((resp as ReadingsResp).error as string);
        setPending(Boolean((resp as ReadingsResp).outOfRange));
      } else if (resp && (resp as ReadingsResp).readings) {
        setData(resp as ReadingsResp);
      } else {
        setError('No readings returned');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, isoDate]);

  // modal={false}: no focus trap and no scroll lock, so the page behind stays
  // usable while the readings sit open beside it.
  const speech = useMemo(
    () => (data?.readings?.length ? readingsToSpeech(data.readings) : []),
    [data],
  );
  const audio = useSpokenText(speech);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }} modal={false}>
      {/* Vertical companion panel, never wider than half the UI — readings are
          a long single column, so a tall narrow drawer suits them better than a
          wide bottom sheet. Full width only on phones, where half is unusable.
          hideOverlay + shadow: the page stays legible, the panel reads as
          floating above it rather than dimming it out. */}
      <SheetContent
        side="right"
        hideOverlay
        className="w-full sm:w-1/2 sm:max-w-[560px] h-[100dvh] flex flex-col p-0 shadow-2xl"
        // Clicking the page behind should NOT dismiss the readings — the whole
        // point is consulting them while you work. Close via X or Esc.
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-2 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-extrabold tracking-tight text-lg sm:text-xl text-left">
                {data?.liturgicalTitle || 'Daily Readings'}
              </SheetTitle>
              <p className="text-xs text-muted-foreground text-left">
                {formatDate(isoDate)} · via{' '}
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Universalis</a>
              </p>
            </div>
            {/* Read aloud. Sits in the header so it is reachable without
                scrolling back up through a long Gospel. Placed left of the
                sheet's own close button, which occupies the top-right. */}
            {speech.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 mr-8"
                onClick={() => (audio.playing ? audio.stop() : audio.play())}
                aria-label={audio.playing ? 'Stop reading' : 'Read these aloud'}
              >
                {audio.playing
                  ? <Square className="w-4 h-4 sm:mr-1.5" aria-hidden />
                  : <Volume2 className="w-4 h-4 sm:mr-1.5" aria-hidden />}
                <span className="hidden sm:inline">{audio.playing ? 'Stop' : 'Listen'}</span>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching readings…
            </div>
          )}

          {error && (
            <div className="text-sm py-10 text-center space-y-3">
              {/* A date the upstream has not published yet is expected, and
                  reads as information. Red is reserved for something actually
                  going wrong, so the two are never confused. */}
              {pending && (
                <CalendarClock className="w-8 h-8 mx-auto text-muted-foreground/60" aria-hidden />
              )}
              <p className={pending
                ? 'text-muted-foreground max-w-sm mx-auto'
                : 'text-destructive'}>
                {error}
              </p>
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
