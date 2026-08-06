import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { formatLongDate } from '@/lib/liturgy/worshipAid';

/**
 * Every worship aid, in one place.
 *
 * The programs already exist inside the Liturgy Planner, one per Mass — but
 * that is where you go to PLAN a liturgy, not to find last Advent's program.
 * This lists them as documents: newest first, each opening straight into the
 * printable view.
 *
 * A Mass appears here once it has a cover title, which is the first thing
 * anyone sets when they actually intend to produce an aid. Listing every
 * planned Mass would bury the real programs among empty ones.
 */

interface AidRow {
  id: string;
  mass_date: string;
  observation: string | null;
  liturgical_season: string | null;
  worship_aid: { coverTitle?: string; coverImageUrl?: string | null } | null;
  share_token: string | null;
}

export default function WorshipAidsPage() {
  const [rows, setRows] = useState<AidRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('gw_liturgy_masses')
        .select('id, mass_date, observation, liturgical_season, worship_aid, share_token')
        .not('worship_aid', 'is', null)
        .order('mass_date', { ascending: false });
      if (error) { toast.error(error.message); setLoading(false); return; }
      setRows(((data ?? []) as unknown as AidRow[]).filter((r) => r.worship_aid?.coverTitle));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <PageTitle>Worship Aids</PageTitle>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No worship aids yet.</p>
            <p className="text-xs text-muted-foreground">
              Open a Mass in the Liturgy Planner and choose <strong>Worship aid</strong> to
              design one. It appears here once it has a cover title.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/liturgy">Go to the Liturgy Planner</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={`/dashboard/liturgy/${r.id}/worship-aid`}
                className="flex items-center gap-3 border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/40"
              >
                {/* The cover art is how a director recognises a program at a
                    glance — far faster than reading a date. */}
                {r.worship_aid?.coverImageUrl ? (
                  <img
                    src={r.worship_aid.coverImageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 border border-border object-contain"
                  />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold tracking-tight">
                    {r.observation || formatLongDate(r.mass_date)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatLongDate(r.mass_date)}
                    {r.liturgical_season ? ` · ${r.liturgical_season}` : ''}
                    {r.share_token ? ' · published to phones' : ''}
                  </div>
                </div>
                <Printer className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
