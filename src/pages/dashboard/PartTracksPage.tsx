// Part Tracks home: every score in this tenant with generated (or
// in-progress) rehearsal tracks. Generation itself starts from a score,
// so the empty state routes to the Music Library.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { listAssignmentsForScores, type PartTrackAssignment } from '@/features/part-tracks/api';
import { PartTracksDialog } from '@/features/part-tracks/PartTracksDialog';
import { useMyVoicePart } from '@/features/part-tracks/player/useMyVoicePart';
import { voicePartsMatch } from '@/features/part-tracks/voiceParts';
import type { PartTrackScore } from '@/features/part-tracks/types';

interface Row extends PartTrackScore {
  gw_sheet_music: {
    title: string;
    composer: string | null;
    pdf_url: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  queued: { label: 'Queued', variant: 'outline' },
  analyzing: { label: 'Analyzing…', variant: 'outline' },
  awaiting_confirmation: { label: 'Needs confirmation', variant: 'secondary' },
  rendering: { label: 'Rendering…', variant: 'outline' },
  ready: { label: 'Ready', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export default function PartTracksPage() {
  const { user } = useAuth();
  const myVoicePart = useMyVoicePart(user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<PartTrackAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openScore, setOpenScore] = useState<Row | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('gw_parttrack_scores')
      .select('*, gw_sheet_music(title, composer, pdf_url, storage_bucket, storage_path)')
      .order('updated_at', { ascending: false });
    if (!error) {
      const list = (data ?? []) as Row[];
      setRows(list);
      void listAssignmentsForScores(list.map((r) => r.id))
        .then(setAssignments)
        .catch(() => undefined);
    }
    setLoading(false);
  }, []);

  // Hard delete: gw_parttrack_scores cascades to parts/rights/jobs/renders +
  // player tables, so the whole project disappears in one row delete. RLS
  // allows it for tenant admins only; PostgREST returns 200 with 0 rows when
  // blocked, so ALWAYS .select() and check length instead of trusting the
  // status. Rendered stem FILES in storage are left behind (no client-side
  // storage delete against the private bucket) — acceptable orphan for now.
  const deleteProject = useCallback(async (row: Row) => {
    const title = row.gw_sheet_music?.title ?? 'this score';
    if (!confirm(`Delete part tracks for "${title}"? This removes the generated tracks for everyone in your organization. The score itself stays in the Music Library.`)) return;
    const { data, error } = await supabase
      .from('gw_parttrack_scores')
      .delete()
      .eq('id', row.id)
      .select('id');
    if (error || !data?.length) {
      toast.error('Could not delete — only admins can delete part tracks.');
      return;
    }
    toast.success(`Deleted part tracks for "${title}".`);
    void refresh();
  }, [refresh]);

  const myAssignment = useCallback((scoreId: string): PartTrackAssignment | null => {
    return assignments.find((a) =>
      a.score_id === scoreId && (a.voice_part === null || voicePartsMatch(a.voice_part, myVoicePart))) ?? null;
  }, [assignments, myVoicePart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <DashboardPageShell
      title="Part Tracks"
      subtitle="Rehearsal tracks generated from your scores — each part loud, the rest soft."
    >
      {loading && <p className="text-sm text-muted-foreground py-6">Loading…</p>}

      {!loading && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <ListMusic className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm">
              No part tracks yet. Open a score in the Music Library and choose
              <span className="font-medium"> Part Tracks</span> from its menu to generate the first set.
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/music-library">Go to Music Library</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => {
            const status = STATUS_LABELS[row.status] ?? { label: row.status, variant: 'outline' as const };
            return (
              <Card key={row.id} className="cursor-pointer hover:bg-accent/40 transition-colors">
                <CardContent
                  className="py-3 flex items-center justify-between gap-3"
                  onClick={() => setOpenScore(row)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {row.gw_sheet_music?.title ?? 'Untitled score'}
                    </p>
                    {row.gw_sheet_music?.composer && (
                      <p className="text-xs text-muted-foreground truncate">{row.gw_sheet_music.composer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(() => {
                      const a = myAssignment(row.id);
                      return a ? (
                        <Badge variant="outline" className="text-xs">
                          Assigned{a.due_date ? ` · due ${a.due_date}` : ''}
                        </Badge>
                      ) : null;
                    })()}
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    {/* Always visible (no hover reveal — this list is used on
                        touch devices); stopPropagation so the tap doesn't
                        also open the project dialog. RLS quietly no-ops for
                        non-admins, and deleteProject surfaces that as an
                        error toast rather than pretending it worked. */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete part tracks for ${row.gw_sheet_music?.title ?? 'this score'}`}
                      title="Delete part tracks"
                      onClick={(e) => { e.stopPropagation(); void deleteProject(row); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {openScore && (
        <PartTracksDialog
          sheetMusicId={openScore.sheet_music_id}
          sheetMusicTitle={openScore.gw_sheet_music?.title ?? 'Untitled score'}
          pdfSource={{
            url: openScore.gw_sheet_music?.pdf_url ?? null,
            bucket: openScore.gw_sheet_music?.storage_bucket ?? null,
            path: openScore.gw_sheet_music?.storage_path ?? null,
          }}
          open
          onOpenChange={(o) => {
            if (!o) {
              setOpenScore(null);
              void refresh();
            }
          }}
        />
      )}
    </DashboardPageShell>
  );
}
