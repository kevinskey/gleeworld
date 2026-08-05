import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildWorshipAid, DEFAULT_SETTINGS, formatLongDate, seasonWordIsRedundant,
  type AidEntry, type AidSource, type WorshipAidSettings,
} from '@/lib/liturgy/worshipAid';
import { psalmLines } from '@/lib/liturgy/psalmComposer';

/**
 * The worship aid on a phone, opened by scanning the QR on the printed cover.
 *
 * Public by capability token, with no sign-in: someone in a pew has thirty
 * seconds and one hand. It reads through gw_worship_aid_by_token, a
 * SECURITY DEFINER function returning a curated projection — the plan's
 * private notes and working links are not in its result at all, so there is
 * nothing here to leak even if the token is shared.
 *
 * Deliberately NOT the folded layout. Panels and a fold are a property of
 * paper; on a phone it is one column read top to bottom, in the order the
 * Mass actually goes.
 */

type AidRow = AidSource & { psalm_full: string | null; worship_aid: unknown; mass_time: string | null };

export default function WorshipAidPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [row, setRow] = useState<AidRow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    (async () => {
      if (!token) { setState('missing'); return; }
      const { data, error } = await supabase.rpc('gw_worship_aid_by_token', { p_token: token });
      const first = Array.isArray(data) ? data[0] : null;
      if (error || !first) { setState('missing'); return; }
      setRow(first as AidRow);
      setState('ready');
    })();
  }, [token]);

  const settings = useMemo<WorshipAidSettings>(
    () => ({ ...DEFAULT_SETTINGS, ...((row?.worship_aid as Partial<WorshipAidSettings>) ?? {}) }),
    [row],
  );
  const aid = useMemo(() => (row ? buildWorshipAid(row, settings) : null), [row, settings]);
  const psalm = useMemo(() => psalmLines(row?.psalm_full ?? ''), [row?.psalm_full]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (state === 'missing' || !aid || !row) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-lg font-semibold">This worship aid isn&rsquo;t available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may have been turned off, or the address may be mistyped. Ask your music
          director for a current one.
        </p>
      </div>
    );
  }

  const Section = ({ entries }: { entries: AidEntry[] }) => (
    <>
      {entries.map((e, i) => {
        if (e.notice) {
          return (
            <p key={i} className="my-4 border border-primary/40 px-3 py-2 text-center text-xs italic leading-relaxed text-foreground/80">
              {e.notice}
            </p>
          );
        }
        if (e.divider) {
          return (
            <h2 key={i} className="mb-3 mt-7 text-center text-sm font-bold uppercase tracking-[0.08em] text-primary">
              {e.label}
            </h2>
          );
        }
        return (
          <div key={i} className="mb-3">
            {e.label && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">{e.label}</span>
                {(e.citation || (!e.title && e.credit)) && (
                  <span className="shrink-0 text-sm italic text-muted-foreground">
                    {e.citation ?? e.credit}
                  </span>
                )}
              </div>
            )}
            {e.title && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm italic">{e.title}</span>
                {e.credit && <span className="shrink-0 text-sm italic text-muted-foreground">{e.credit}</span>}
              </div>
            )}
            {e.imageUrl && (
              // Full-bleed within the column: a psalm setting is unreadable
              // shrunk to a thumbnail on a phone.
              <img src={e.imageUrl} alt="" className="my-3 w-full" />
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-16 pt-8">
      <header className="mb-6 text-center">
        {aid.front.title && <h1 className="text-xl leading-tight">{aid.front.title}</h1>}
        {aid.sideBand.day && (
          <p className="mt-2 text-sm font-semibold">{aid.sideBand.day}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatLongDate(row.mass_date)}</p>
        {/* Not when the day already says it: "19th Sunday in Ordinary Time"
            over "ORDINARY TIME" is two lines saying one thing (Kevin). On
            paper the two sit on different panels and never meet. */}
        {aid.front.word && !seasonWordIsRedundant(aid.front.word, aid.sideBand.day) && (
          <p className="mt-3 text-2xl uppercase tracking-wide text-primary">{aid.front.word}</p>
        )}
      </header>

      <Section entries={aid.insideLeft} />

      {/* The psalm as MUSIC when a setting has been composed for this Mass
          (Kevin: "should be on worship aid not text"). The words alone are a
          fallback for a Sunday nobody has set yet — and then the phone shows
          every verse, which the printed panel has no room for. */}
      {psalm.length > 0 && !settings.psalmImageUrl && (
        <div className="my-5 border-t border-border pt-4">
          {psalm.map((line, i) => {
            const prev = psalm[i - 1];
            const spaced = i > 0 && (line.isRefrain || prev?.isRefrain);
            return (
              <p
                key={i}
                className={[
                  'text-sm leading-relaxed',
                  line.isRefrain ? 'font-semibold' : 'pl-3 text-foreground/90',
                  spaced ? 'mt-4' : '',
                ].join(' ')}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      )}

      <Section entries={aid.insideRight} />
      <Section entries={aid.back} />

      <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        {aid.spineText || 'Please silence your phone during worship.'}
      </footer>
    </div>
  );
}
