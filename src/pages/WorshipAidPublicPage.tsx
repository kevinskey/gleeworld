import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildWorshipAid, DEFAULT_SETTINGS, formatLongDate,
  type AidEntry, type AidSource, type WorshipAidSettings,
} from '@/lib/liturgy/worshipAid';
import { psalmLines } from '@/lib/liturgy/psalmComposer';
import { PsalmEngraving } from '@/components/liturgy/PsalmEngraving';

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

type AidRow = AidSource & {
  psalm_full: string | null;
  worship_aid: unknown;
  mass_time: string | null;
  /**
   * The psalm setting's MusicXML, from the same curated projection as the
   * rest of the page.
   *
   * Optional in the type on purpose: the frontend can ship before the
   * migration that adds the column, and a row without it simply engraves
   * nothing and falls back — rather than throwing on a page a congregation
   * is holding a phone up to mid-Mass.
   */
  psalm_xml?: string | null;
};

export default function WorshipAidPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [row, setRow] = useState<AidRow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  /** The object URL PsalmEngraving hands back. Owned by that component. */
  const [engraved, setEngraved] = useState<string | null>(null);
  /** Whether the engraver has reported at all yet, as against having reported
   *  nothing. The two have to be told apart: "still rasterising" must not
   *  print the psalm as prose for a beat and then swap in a staff, while
   *  "tried and failed" must not leave a congregation looking at a heading
   *  with neither music nor words under it. */
  const [engravingSettled, setEngravingSettled] = useState(false);

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
  /**
   * The psalm as MUSIC, engraved HERE rather than served as a picture made
   * when the setting was saved.
   *
   * Same bug, same fix, same order as the printed aid — and the same reason
   * it matters more here, not less: this is the copy the congregation
   * actually looks at. Everything the printed card gained from re-engraving
   * (staff height, card width, lyric size) was invisible on a phone for
   * exactly as long as this page drew a stored raster.
   *
   * The MusicXML arrives through gw_worship_aid_by_token because it cannot
   * arrive any other way: this page is anonymous, and gw_sheet_music admits
   * anon only to `is_public = true` rows inside anon_tenant_id(), which no
   * psalm setting is. See the migration for what that projection does and
   * does not expose.
   */
  const psalmXml = row?.psalm_xml ?? null;
  useEffect(() => { setEngravingSettled(false); }, [psalmXml]);
  const onEngraved = useCallback((url: string | null) => {
    setEngraved(url);
    setEngravingSettled(true);
  }, []);
  // With a score in hand the stored picture is out of the running entirely —
  // including while the engraving is still rasterising, and including when it
  // failed. buildWorshipAid falls back to settings.psalmImageUrl on its own,
  // so the only way to keep a stale raster off the page is to withhold it.
  const aidSettings = useMemo(
    () => (psalmXml ? { ...settings, psalmImageUrl: null } : settings),
    [settings, psalmXml],
  );
  const aid = useMemo(
    () => (row ? buildWorshipAid(row, aidSettings, psalmXml ? engraved : null) : null),
    [row, aidSettings, psalmXml, engraved],
  );
  const psalm = useMemo(() => psalmLines(row?.psalm_full ?? ''), [row?.psalm_full]);
  /** Whether this Mass has a setting at all — the prose psalm is what shows
   *  when it does not. A score still rasterising counts: the words must not
   *  appear for a beat and then be replaced by a staff. */
  const hasSetting = psalmXml
    ? (!engravingSettled || Boolean(engraved))
    : Boolean(settings.psalmImageUrl);

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
      {/* Off-screen: the staff is drawn to be rasterised, not to be read
          here. What the page shows is the <img> it produces. */}
      <PsalmEngraving xml={psalmXml} onImage={onEngraved} />
      <header className="mb-6 text-center">
        {aid.front.title && <h1 className="text-xl leading-tight">{aid.front.title}</h1>}
        {aid.sideBand.day && (
          <p className="mt-2 text-sm font-semibold">{aid.sideBand.day}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatLongDate(row.mass_date)}</p>
      </header>

      <Section entries={aid.insideLeft} />

      {/* The psalm as MUSIC when a setting has been composed for this Mass
          (Kevin: "should be on worship aid not text"). The words alone are a
          fallback for a Sunday nobody has set yet — and then the phone shows
          every verse, which the printed panel has no room for. */}
      {psalm.length > 0 && !hasSetting && (
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
