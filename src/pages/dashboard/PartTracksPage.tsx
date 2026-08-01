// Part Tracks home: every score in this tenant with generated (or
// in-progress) rehearsal tracks. Generation itself starts from a score,
// so the empty state routes to the Music Library.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic } from 'lucide-react';
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
  gw_sheet_music: { title: string; composer: string | null; pdf_url: string | null } | null;
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
      .select('*, gw_sheet_music(title, composer, pdf_url)')
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
          pdfUrl={openScore.gw_sheet_music?.pdf_url ?? null}
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
