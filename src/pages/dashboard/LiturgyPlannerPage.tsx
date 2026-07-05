// Liturgy Planner — Catholic Mass planning UI.
//
// Routes (under <DashboardShell>):
//   /dashboard/liturgy           — list (upcoming + recent) + "New Mass" button
//   /dashboard/liturgy/:massId   — single-Mass editor
//
// Each Mass has 9 song slots (setting, prelude, opening, psalm,
// preparation, communion 1, communion 2, praise, closing). Every slot
// has a title field + a YouTube URL field. If the URL is empty, the
// "▶ YouTube" button opens a YouTube SEARCH for the title in a new
// tab — frictionless way to find a video. If a URL is pasted, the
// button becomes a direct link.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, BookOpen, Calendar as CalendarIcon, ExternalLink, Loader2, Plus, Trash2, X, Youtube,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  liturgicalDayFor, usccbReadingsUrl, type SundayCycle, type LiturgicalSeason,
} from '@/lib/liturgy/calendar';
import { searchAppleMusic, type AppleMusicSongHit } from '@/lib/musicKit';

interface MassRow {
  id: string;
  mass_date: string;        // 'YYYY-MM-DD'
  mass_time: string | null; // 'HH:MM:SS' or null
  observation: string | null;
  sunday_cycle: SundayCycle | null;
  liturgical_season: LiturgicalSeason | null;
  setting_title: string | null;       setting_youtube: string | null;
  prelude_title: string | null;       prelude_youtube: string | null;
  opening_title: string | null;       opening_youtube: string | null;
  psalm_title: string | null;         psalm_youtube: string | null;       psalm_full: string | null;
  preparation_title: string | null;   preparation_youtube: string | null;
  communion_1_title: string | null;   communion_1_youtube: string | null;
  communion_2_title: string | null;   communion_2_youtube: string | null;
  praise_title: string | null;        praise_youtube: string | null;
  closing_title: string | null;       closing_youtube: string | null;
  first_reading: string | null;
  responsorial_psalm: string | null;
  second_reading: string | null;
  gospel_acclamation: string | null;
  gospel: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── List page ────────────────────────────────────────────────────────

function LiturgyList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_liturgy_masses')
        .select('*')
        .order('mass_date', { ascending: false })
        .limit(60);
      if (error) toast.error(error.message);
      setRows((data as MassRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const newMass = async () => {
    if (!user) return;
    setCreating(true);
    const today = new Date();
    const day = liturgicalDayFor(today);
    const isoDate = todayISO(today);
    const { data, error } = await supabase
      .from('gw_liturgy_masses')
      .insert({
        owner_user_id: user.id,
        mass_date: isoDate,
        observation: day.observation,
        sunday_cycle: day.cycle,
        liturgical_season: day.season,
      })
      .select('id')
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    navigate(`/dashboard/liturgy/${data!.id}`);
  };

  const upcoming = useMemo(
    () => rows.filter((r) => r.mass_date >= todayISO(new Date())).slice().reverse(),
    [rows],
  );
  const past = useMemo(
    () => rows.filter((r) => r.mass_date < todayISO(new Date())),
    [rows],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 sm:pt-3 pb-10 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="font-extrabold tracking-tight">Liturgy Planner</h1>
        <Button onClick={newMass} disabled={creating} className="rounded-full">
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Plan a Mass
        </Button>
      </div>

      <Section title="Upcoming" rows={upcoming} loading={loading} emptyMsg="No upcoming Masses planned." />
      <Section title="Recent" rows={past.slice(0, 20)} loading={loading} emptyMsg="No past Masses on file." />
    </div>
  );
}

function Section({ title, rows, loading, emptyMsg }: {
  title: string; rows: MassRow[]; loading: boolean; emptyMsg: string;
}) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">{title}</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-6 text-sm text-muted-foreground text-center">{emptyMsg}</CardContent></Card>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => <MassListRow key={r.id} row={r} />)}
        </ul>
      )}
    </div>
  );
}

function MassListRow({ row }: { row: MassRow }) {
  const dateLabel = formatDate(row.mass_date);
  const timeLabel = row.mass_time ? formatTime(row.mass_time) : null;
  return (
    <li>
      <Link
        to={`/dashboard/liturgy/${row.id}`}
        className="block border border-border bg-card hover:border-foreground/40 transition-colors px-4 py-3"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight">
              {row.observation || dateLabel}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
              {row.sunday_cycle ? ` · Year ${row.sunday_cycle}` : ''}
              {row.liturgical_season ? ` · ${row.liturgical_season}` : ''}
            </div>
          </div>
          {row.opening_title && (
            <div className="text-xs text-muted-foreground truncate max-w-[40%]">
              Opening: {row.opening_title}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

// ── Universalis → MassRow field mapping ──────────────────────────────
// The readings function returns a flat list of {heading, citation, html}
// blocks. We pattern-match heading text (case-insensitive) to the
// columns we store. psalm_full gets the readable html of the psalm
// block stripped to plain text since it's a textarea, not rich HTML.

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapReadingBlocksToFields(blocks: Array<{ heading: string; citation: string | null; html: string }>): Partial<MassRow> {
  const out: Partial<MassRow> = {};
  const seenSecond = { val: false };
  for (const b of blocks) {
    const h = b.heading.toLowerCase();
    const cite = b.citation || null;
    if (/responsorial\s*psalm/.test(h)) {
      if (cite) out.responsorial_psalm = cite;
      const txt = stripHtml(b.html);
      if (txt) out.psalm_full = txt;
    } else if (/gospel\s*acclamation|verse\s*before\s*the\s*gospel|alleluia/.test(h)) {
      if (cite) out.gospel_acclamation = cite;
    } else if (/gospel/.test(h)) {
      if (cite) out.gospel = cite;
    } else if (/second\s*reading/.test(h) || (/reading\s*2/.test(h))) {
      if (cite) { out.second_reading = cite; seenSecond.val = true; }
    } else if (/first\s*reading|reading\s*1/.test(h)) {
      if (cite) out.first_reading = cite;
    } else if (/^reading$/.test(h.trim())) {
      // Weekday Masses use a single "Reading" heading — treat as first.
      if (cite && !out.first_reading) out.first_reading = cite;
    }
  }
  return out;
}

// Find the first reading block whose heading matches any of the given
// regex source strings (case-insensitive). Returns null if none match.
function pickBlock(
  blocks: Array<{ heading: string; citation: string | null; html: string }>,
  patterns: string[],
): { heading: string; citation: string | null; html: string } | null {
  for (const p of patterns) {
    const re = new RegExp(p, 'i');
    const hit = blocks.find((b) => re.test(b.heading.trim()));
    if (hit) return hit;
  }
  return null;
}

// One row of the Readings card: label + citation input + optional
// "Read" hover-trigger that pops the full text from Universalis.
function ReadingRow({
  label, value, onChange, placeholder, block,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder: string;
  block: { heading: string; citation: string | null; html: string } | null;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="flex-1"
        />
        {block && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--link))] hover:text-[hsl(var(--link-hover))] hover:underline shrink-0"
                aria-label={`Read full text of ${label}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Read
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{block.heading}</p>
                {block.citation && <p className="text-xs italic text-muted-foreground">{block.citation}</p>}
                <div
                  className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90 [&_p]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </Field>
  );
}

// ── Editor page ──────────────────────────────────────────────────────

// Numbered step in the Order of Mass listing — the sequence a Mass
// actually follows, with readings inline at their liturgical position
// (not in a separate section below the music).
function OrderItem({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold inline-flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0 space-y-2">{children}</div>
    </div>
  );
}

// (Song slots are laid out inline in the Order of Mass card below.)

function LiturgyEditor({ massId }: { massId: string }) {
  const navigate = useNavigate();
  const [row, setRow] = useState<MassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // MUST be declared above any early-return so the hook count stays
  // stable across renders. The previous placement (post-`if (!row)`)
  // crashed with React error #310.
  const [readingsOpen, setReadingsOpen] = useState(false);
  const [pullingReadings, setPullingReadings] = useState(false);
  // Cached blocks from the last Universalis pull. Keyed for the inline
  // hover popovers so each citation field can show its full text without
  // re-hitting the upstream.
  const [readingBlocks, setReadingBlocks] = useState<Array<{ heading: string; citation: string | null; html: string }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_liturgy_masses')
        .select('*')
        .eq('id', massId)
        .single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      setRow(data as MassRow);
      setLoading(false);

      // First-time auto-pull: if the row has no reading citations yet,
      // try Universalis silently so the editor lands populated. Failure
      // is non-blocking — the user can still pull manually.
      const r = data as MassRow;
      const empty = !r.first_reading && !r.responsorial_psalm && !r.second_reading && !r.gospel_acclamation && !r.gospel;
      if (empty) {
        void fetchReadingsAndApply(r.mass_date, /*overwrite=*/false);
      }
    })();
  }, [massId]);

  // Calls the universalis proxy and merges the parsed citations into
  // the row's reading fields. `overwrite=true` replaces whatever's
  // there; `false` keeps user-edited values and only fills blanks.
  async function fetchReadingsAndApply(iso: string, overwrite: boolean) {
    setPullingReadings(true);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke('usccb-readings', {
        body: { date: iso },
      });
      if (fnErr) throw new Error(fnErr.message);
      const blocks = ((resp as any)?.readings as Array<{ heading: string; citation: string | null; html: string }>) || [];
      if (!blocks.length) return;
      setReadingBlocks(blocks);
      const mapped = mapReadingBlocksToFields(blocks);
      setRow((cur) => {
        if (!cur) return cur;
        const next: Partial<MassRow> = {};
        for (const [k, v] of Object.entries(mapped) as Array<[keyof MassRow, string | null]>) {
          if (v == null) continue;
          if (overwrite || !cur[k]) (next as any)[k] = v;
        }
        return Object.keys(next).length ? { ...cur, ...next } : cur;
      });
    } catch (e: any) {
      if (overwrite) toast.error(`Couldn't fetch readings: ${e?.message || e}`);
    } finally {
      setPullingReadings(false);
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-sm text-muted-foreground flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading Mass…
    </div>
  );
  if (!row) return null;

  const update = (patch: Partial<MassRow>) => setRow((r) => r ? { ...r, ...patch } : r);

  // When the user changes the date, recompute the auto observation /
  // cycle / season unless they've manually customized the observation,
  // then fire a non-blocking Universalis pull to fill any empty reading
  // fields for the new date.
  const onDateChange = (iso: string) => {
    const day = liturgicalDayFor(parseISODate(iso));
    update({
      mass_date: iso,
      sunday_cycle: day.cycle,
      liturgical_season: day.season,
      // Only overwrite observation if the user hasn't already typed
      // something OR if it matches the prior auto-fill.
      observation: row.observation && !isAutoObservation(row.observation)
        ? row.observation
        : (day.observation ?? null),
    });
    // Readings are inherently a function of the date — when the user
    // picks a new date, replace whatever was there with the new date's
    // citations. If they want bespoke text they can edit after.
    void fetchReadingsAndApply(iso, /*overwrite=*/true);
  };

  const save = async () => {
    setSaving(true);
    const { id, created_at, updated_at, ...payload } = row;
    const { error } = await supabase
      .from('gw_liturgy_masses')
      .update(payload)
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
  };

  const remove = async () => {
    if (!confirm('Delete this Mass plan? This cannot be undone.')) return;
    const { error } = await supabase.from('gw_liturgy_masses').delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    navigate('/dashboard/liturgy');
  };

  const readingsHref = usccbReadingsUrl(parseISODate(row.mass_date));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 sm:pt-3 pb-12 space-y-6">
      <Link to="/dashboard/liturgy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> All Masses
      </Link>

      <div>
        <h1 className="font-extrabold tracking-tight">{row.observation || formatDate(row.mass_date)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Year {row.sunday_cycle ?? '?'} · {row.liturgical_season ?? '—'}
        </p>
      </div>

      {/* Date + time + readings link */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Date">
              <Input type="date" value={row.mass_date} onChange={(e) => onDateChange(e.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" value={row.mass_time ?? ''} onChange={(e) => update({ mass_time: e.target.value || null })} />
            </Field>
            <Field label="Cycle">
              <Input value={row.sunday_cycle ?? ''} readOnly className="bg-muted/40" />
            </Field>
          </div>
          <Field label="Observation (feast day / liturgical title)">
            <Input value={row.observation ?? ''} onChange={(e) => update({ observation: e.target.value || null })} placeholder="e.g. Solemnity of the Most Holy Trinity" />
          </Field>
          {/* In-app readings — opens a bottom Sheet (horizontal split
           * with editor still visible above). USCCB sends
           * X-Frame-Options: SAMEORIGIN so a direct iframe is blocked;
           * the `usccb-readings` edge function proxies + extracts the
           * readings so we render them in our own panel. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setReadingsOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--link))] hover:text-[hsl(var(--link-hover))] hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View today&apos;s readings
            </button>
            <button
              type="button"
              onClick={() => fetchReadingsAndApply(row.mass_date, /*overwrite=*/true)}
              disabled={pullingReadings}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--link))] hover:text-[hsl(var(--link-hover))] hover:underline disabled:opacity-50"
              title="Replace reading citations + psalm with Universalis data for this date"
            >
              {pullingReadings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
              Pull from Universalis
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Order of Mass — music and readings interleaved in the order the
          liturgy actually follows. "Pull from Universalis" fills the
          reading rows below in place. */}
      <Card>
        <CardContent className="p-4 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Order of Mass</h2>

          <SongSlot
            label="Mass Setting Used"
            title={row.setting_title ?? ''}
            youtube={row.setting_youtube ?? ''}
            onTitle={(v) => update({ setting_title: v || null })}
            onYouTube={(v) => update({ setting_youtube: v || null })}
          />
          <div className="border-t border-border" />

          <OrderItem n={1}>
            <SongSlot
              label="Call to Worship / Prelude"
              title={row.prelude_title ?? ''}
              youtube={row.prelude_youtube ?? ''}
              onTitle={(v) => update({ prelude_title: v || null })}
              onYouTube={(v) => update({ prelude_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={2}>
            <SongSlot
              label="Opening Hymn / Song"
              title={row.opening_title ?? ''}
              youtube={row.opening_youtube ?? ''}
              onTitle={(v) => update({ opening_title: v || null })}
              onYouTube={(v) => update({ opening_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={3}>
            <ReadingRow
              label="First Reading"
              value={row.first_reading}
              onChange={(v) => update({ first_reading: v })}
              placeholder="e.g. Isaiah 55:1-3"
              block={pickBlock(readingBlocks, ['first reading', 'reading 1', '^reading$'])}
            />
          </OrderItem>

          <OrderItem n={4}>
            <ReadingRow
              label="Responsorial Psalm (citation)"
              value={row.responsorial_psalm}
              onChange={(v) => update({ responsorial_psalm: v })}
              placeholder="e.g. Psalm 145"
              block={pickBlock(readingBlocks, ['responsorial psalm'])}
            />
            <SongSlot
              label="Responsorial Psalm — sung setting"
              title={row.psalm_title ?? ''}
              youtube={row.psalm_youtube ?? ''}
              onTitle={(v) => update({ psalm_title: v || null })}
              onYouTube={(v) => update({ psalm_youtube: v || null })}
            />
            <Field label="Psalm full text (refrain + verses)">
              <Textarea rows={3} value={row.psalm_full ?? ''}
                onChange={(e) => update({ psalm_full: e.target.value || null })}
                placeholder="Paste or type the full Psalm refrain + verses…" />
            </Field>
          </OrderItem>

          <OrderItem n={5}>
            <ReadingRow
              label="Second Reading"
              value={row.second_reading}
              onChange={(v) => update({ second_reading: v })}
              placeholder="e.g. Romans 8:35, 37-39"
              block={pickBlock(readingBlocks, ['second reading', 'reading 2'])}
            />
          </OrderItem>

          <OrderItem n={6}>
            <ReadingRow
              label="Gospel Acclamation"
              value={row.gospel_acclamation}
              onChange={(v) => update({ gospel_acclamation: v })}
              placeholder="Alleluia verse"
              block={pickBlock(readingBlocks, ['gospel acclamation', 'verse before the gospel', 'alleluia'])}
            />
          </OrderItem>

          <OrderItem n={7}>
            <ReadingRow
              label="Gospel"
              value={row.gospel}
              onChange={(v) => update({ gospel: v })}
              placeholder="e.g. Matthew 14:13-21"
              block={pickBlock(readingBlocks, ['^gospel$'])}
            />
          </OrderItem>

          <OrderItem n={8}>
            <SongSlot
              label="Preparation Song"
              title={row.preparation_title ?? ''}
              youtube={row.preparation_youtube ?? ''}
              onTitle={(v) => update({ preparation_title: v || null })}
              onYouTube={(v) => update({ preparation_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={9}>
            <SongSlot
              label="Communion Song 1"
              title={row.communion_1_title ?? ''}
              youtube={row.communion_1_youtube ?? ''}
              onTitle={(v) => update({ communion_1_title: v || null })}
              onYouTube={(v) => update({ communion_1_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={10}>
            <SongSlot
              label="Communion Song 2"
              title={row.communion_2_title ?? ''}
              youtube={row.communion_2_youtube ?? ''}
              onTitle={(v) => update({ communion_2_title: v || null })}
              onYouTube={(v) => update({ communion_2_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={11}>
            <SongSlot
              label="Song of Praise"
              title={row.praise_title ?? ''}
              youtube={row.praise_youtube ?? ''}
              onTitle={(v) => update({ praise_title: v || null })}
              onYouTube={(v) => update({ praise_youtube: v || null })}
            />
          </OrderItem>

          <OrderItem n={12}>
            <SongSlot
              label="Closing Hymn / Song"
              title={row.closing_title ?? ''}
              youtube={row.closing_youtube ?? ''}
              onTitle={(v) => update({ closing_title: v || null })}
              onYouTube={(v) => update({ closing_youtube: v || null })}
            />
          </OrderItem>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <Field label="Notes">
            <Textarea rows={3} value={row.notes ?? ''} onChange={(e) => update({ notes: e.target.value || null })}
              placeholder="Anything else worship leaders / choir should know…" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="outline" onClick={remove} className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="w-4 h-4 mr-1.5" /> Delete
        </Button>
        <Button onClick={save} disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
          Save
        </Button>
      </div>

      <ReadingsModal
        open={readingsOpen}
        onClose={() => setReadingsOpen(false)}
        isoDate={row.mass_date}
        sourceUrl={readingsHref}
      />
    </div>
  );
}

// ── Readings modal ──────────────────────────────────────────────────

interface ReadingBlock { heading: string; citation: string | null; summary?: string | null; html: string }
interface ReadingsResp {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
  error?: string;
}

function ReadingsModal({ open, onClose, isoDate, sourceUrl }: {
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
      {/* Bottom horizontal split — about a third of the viewport so
       * the editor is still clearly the primary surface. Was 60vh
       * which read as a takeover. */}
      <SheetContent side="bottom" className="h-[40vh] sm:h-[45vh] flex flex-col p-0">
        <SheetHeader className="px-6 pt-4 pb-2 border-b border-border shrink-0">
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
              <ExternalLink className="w-3.5 h-3.5" /> Open on USCCB.org
            </a>
          </div>
        )}

        {data && !loading && !error && (
          <div className="space-y-6 py-2">
            {data.readings.map((r, i) => (
              <section key={i} className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                  {r.heading}
                </h3>
                {r.citation && (
                  <p className="text-xs text-muted-foreground italic">{r.citation}</p>
                )}
                {r.summary && (
                  <p className="text-sm font-semibold italic">{r.summary}</p>
                )}
                <div
                  className="prose prose-sm max-w-none text-foreground leading-relaxed [&_p]:my-2"
                  // Body HTML is sanitized server-side: only p / br / em /
                  // strong / i / b / u / blockquote / span survive, every
                  // attribute is stripped. Safe to inject.
                  dangerouslySetInnerHTML={{ __html: r.html }}
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

// ── Hymnal autocomplete ──────────────────────────────────────────────
// Searches the platform hymnal index (gw_hymn_index: LMGM, LMGM II,
// Gather, Baptist Hymnal — titles/numbers only, no texts) as the user
// types in a song-slot title field. Picking a hit fills the field as
// "Title — LMGM II #291" so the hymnal + number travel with the plan.
interface HymnHit {
  id: string;
  number: string;
  title: string;
  tune_title: string | null;
  hymnal: { short_name: string } | null;
}

function useHymnSearch(q: string) {
  const [hits, setHits] = useState<HymnHit[]>([]);
  useEffect(() => {
    const term = q.trim();
    // Skip once the user has picked (field already carries "— … #n")
    if (term.length < 2 || /—\s.+#/.test(term)) { setHits([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('gw_hymn_index')
        .select('id, number, title, tune_title, hymnal:gw_hymnals(short_name)')
        .or(`title.ilike.%${term}%,first_line.ilike.%${term}%`)
        .order('title')
        .limit(8);
      if (alive) setHits((data as unknown as HymnHit[]) ?? []);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  return hits;
}

function SongSlot({ label, title, youtube, onTitle, onYouTube }: {
  label: string; title: string; youtube: string;
  onTitle: (v: string) => void; onYouTube: (v: string) => void;
}) {
  const hasUrl = /^https?:\/\//i.test(youtube.trim());
  const disabled = !title.trim() && !hasUrl;
  const [searchOpen, setSearchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const hymnHits = useHymnSearch(focused ? title : '');

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Title / hymn name…"
            className="w-full"
          />
          {focused && hymnHits.length > 0 && (
            <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-popover border border-border shadow-lg max-h-64 overflow-y-auto">
              {hymnHits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  // onMouseDown so the pick lands before the input's blur
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onTitle(`${h.title} — ${h.hymnal?.short_name ?? ''} #${h.number}`.trim());
                    setFocused(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-baseline justify-between gap-2"
                >
                  <span className="min-w-0 truncate">{h.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {h.hymnal?.short_name} #{h.number}{h.tune_title ? ` · ${h.tune_title}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (hasUrl) {
              // Already saved — open the chosen video in a new tab so
              // the user can preview without losing form state.
              window.open(youtube.trim(), '_blank', 'noopener,noreferrer');
            } else {
              setSearchOpen(true);
            }
          }}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-3 h-10 border text-xs font-semibold shrink-0 transition-colors ${
            disabled
              ? 'border-border text-muted-foreground cursor-not-allowed opacity-50'
              : 'border-rose-600 text-rose-600 hover:bg-rose-50'
          }`}
          title={hasUrl ? 'Open the saved YouTube video' : 'Search YouTube for this title'}
        >
          <Youtube className="w-3.5 h-3.5" />
          {hasUrl ? 'Open' : 'Search'}
        </button>
      </div>
      <Input
        value={youtube}
        onChange={(e) => onYouTube(e.target.value)}
        placeholder="YouTube URL (optional)"
        className="text-xs"
      />
      <YouTubeSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={cleanHymnQuery(title)}
        onPick={(url, pickedTitle) => {
          onYouTube(url);
          // Only overwrite the title if the user hasn't typed one.
          if (!title.trim()) onTitle(pickedTitle);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

// The autocomplete stores a hymn as "Title — LMGM II #291". That catalog
// tail turns a YouTube search into a junk query (it matches vinyl 45s by
// catalog number). Strip the " — <hymnal> #<number>" suffix (and any bare
// trailing "#num") so we search on the actual song title.
function cleanHymnQuery(raw: string): string {
  return raw
    .replace(/\s*[—–-]\s*[^#]*#\s*\S+\s*$/u, '') // "Title — LMGM II #291"
    .replace(/\s*#\s*\S+\s*$/u, '')                // bare "Title #291"
    .trim() || raw.trim();
}

// ── In-app song search modal (YouTube + Apple Music) ─────────────────

interface YtHit {
  videoId: string; title: string; channelTitle: string;
  publishedAt: string; description: string; thumbnail: string; url: string;
}

type SearchSource = 'youtube' | 'appleMusic';

// Apple Music songs open in the Music app / music.apple.com; full-track
// playback needs the listener's own subscription, so a picked Apple
// Music track is a link (like YouTube) — it just plays for subscribers,
// not everyone. YouTube stays the default for universal playback.
function appleMusicSongUrl(hit: AppleMusicSongHit): string {
  return `https://music.apple.com/${hit.storefront}/song/${hit.id}`;
}

function YouTubeSearchModal({ open, onClose, initialQuery, onPick }: {
  open: boolean; onClose: () => void; initialQuery: string;
  onPick: (url: string, title: string) => void;
}) {
  const [source, setSource] = useState<SearchSource>('youtube');
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<YtHit[]>([]);
  const [appleHits, setAppleHits] = useState<AppleMusicSongHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setQ(initialQuery); setSource('youtube'); } }, [open, initialQuery]);

  // Auto-search the title when the modal opens or the source switches.
  useEffect(() => {
    if (!open) return;
    if (!q.trim()) return;
    runSearch(q.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  const runSearch = async (rawQuery: string) => {
    const query = cleanHymnQuery(rawQuery);
    setLoading(true); setError(null); setHits([]); setAppleHits([]);
    if (source === 'appleMusic') {
      try {
        const { songs } = await searchAppleMusic(query);
        setAppleHits(songs);
      } catch (e: any) {
        setError(e?.message || 'Apple Music search failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    const { data, error: fnErr } = await supabase.functions.invoke('youtube-search', {
      body: { q: query, maxResults: 12 },
    });
    setLoading(false);
    if (fnErr) { setError(fnErr.message || 'Search failed'); return; }
    const body = data as { hits?: YtHit[]; error?: string; help?: string };
    if (body?.error) { setError(`${body.error}${body.help ? ` — ${body.help}` : ''}`); return; }
    setHits(body?.hits ?? []);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold tracking-tight text-xl">
            Find a recording
          </DialogTitle>
        </DialogHeader>

        {/* Source toggle. YouTube is the default — it plays for everyone;
            Apple Music needs the listener's own subscription for full
            playback. */}
        <div className="flex gap-1 pt-2">
          {([['youtube', 'YouTube'], ['appleMusic', 'Apple Music']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setSource(val)}
              className={`px-3 h-8 text-sm font-semibold border transition-colors ${
                source === val
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(q.trim()); }}
          className="flex gap-2 pt-2"
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={loading || !q.trim()} className="rounded-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Search
          </Button>
        </form>

        {error && (
          <div className="text-sm text-destructive py-4 border border-destructive/30 bg-destructive/5 px-3 mt-3">
            {error}
          </div>
        )}

        {source === 'youtube' && hits.length > 0 && (
          <ul className="space-y-1.5 pt-3">
            {hits.map((h) => (
              <li key={h.videoId}>
                <button
                  type="button"
                  onClick={() => onPick(h.url, h.title)}
                  className="w-full flex gap-3 p-2 border border-border bg-card hover:border-foreground/40 hover:bg-muted/30 text-left transition-colors"
                >
                  <img
                    src={h.thumbnail}
                    alt=""
                    width={120}
                    height={68}
                    className="shrink-0 object-cover bg-muted"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold leading-tight line-clamp-2">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{h.channelTitle}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">{h.description}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {source === 'appleMusic' && appleHits.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground pt-3">
              Full playback requires the listener's Apple Music subscription.
            </p>
            <ul className="space-y-1.5 pt-1.5">
              {appleHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => onPick(appleMusicSongUrl(h), `${h.title}${h.artist ? ` — ${h.artist}` : ''}`)}
                    className="w-full flex gap-3 p-2 border border-border bg-card hover:border-foreground/40 hover:bg-muted/30 text-left transition-colors"
                  >
                    {h.artworkUrl ? (
                      <img src={h.artworkUrl} alt="" width={60} height={60} className="shrink-0 object-cover bg-muted" loading="lazy" />
                    ) : (
                      <div className="shrink-0 w-[60px] h-[60px] bg-muted" />
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-semibold leading-tight line-clamp-2">{h.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{h.artist}</div>
                      {h.album && <div className="text-[11px] text-muted-foreground line-clamp-1">{h.album}</div>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loading && !error && (source === 'youtube' ? hits.length === 0 : appleHits.length === 0) && q.trim() && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No results. Try a different query.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

function todayISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(t: string): string {
  // 'HH:MM:SS' -> 'h:mm AM/PM'
  const [hh, mm] = t.split(':').map(Number);
  const d = new Date(); d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function isAutoObservation(s: string | null): boolean {
  if (!s) return true;
  // Anything that looks like a Sunday-of-the-month-in-Year-X label is
  // probably one we auto-filled, not a user customization.
  return /^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Solemnity|Ash|Palm|Good|Easter|Pentecost|Christmas|All Saints|Assumption|Immaculate)/i.test(s);
}

// ── Route entry ──────────────────────────────────────────────────────

export default function LiturgyPlannerPage() {
  const { massId } = useParams<{ massId?: string }>();
  return massId ? <LiturgyEditor massId={massId} /> : <LiturgyList />;
}
