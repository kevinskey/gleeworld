// "Import setlist" — a one-time copy of a saved setlist's ordered scores
// into the program as a new piece-group. There is no ongoing sync: once
// imported, the pieces are independent rows the editor owns. Re-importing
// (the same or a different setlist) appends another new group rather than
// touching the first one.
//
// This dialog only fetches + maps: list gw_setlists, then on choosing one
// fetch gw_setlist_items (embedding gw_sheet_music) in order_index order.
// The page performs the actual batch insert + group append (all-or-nothing
// — see ConcertPlannerEditorPage's handleSetlistImport) so atomicity lives
// with the doc hook, not here.
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';

export interface SetlistImportResult {
  pieces: Array<Partial<ConcertProgramPiece>>;
  setlistId: string;
}

export interface SetlistImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (result: SetlistImportResult) => void;
}

interface SetlistRow {
  id: string;
  title: string;
  concert_name: string | null;
  event_date: string | null;
}

export function SetlistImportDialog({ open, onOpenChange, onImport }: SetlistImportDialogProps) {
  const [rows, setRows] = useState<SetlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const fetchSetlists = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: err } = await supabase
        .from('gw_setlists')
        .select('id, title, concert_name, event_date')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) { setError(true); setRows([]); return; }
      setRows((data ?? []) as SetlistRow[]);
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setError(false);
      setImportingId(null);
      return;
    }
    void fetchSetlists();
  }, [open, fetchSetlists]);

  const handleChoose = async (setlistId: string) => {
    setImportingId(setlistId);
    setError(false);
    try {
      const { data, error: err } = await supabase
        .from('gw_setlist_items')
        .select('music_id, order_index, score:gw_sheet_music(title, composer, voicing)')
        .eq('setlist_id', setlistId)
        .order('order_index');
      if (err || !data) { setError(true); return; }
      const pieces: Array<Partial<ConcertProgramPiece>> = (data as Array<{
        music_id: string;
        order_index: number;
        score: { title: string; composer: string | null; voicing: string | null } | null;
      }>).map((item) => ({
        title: item.score?.title ?? 'Untitled',
        composer: item.score?.composer ?? null,
        voicing: item.score?.voicing ?? null,
        sheet_music_id: item.music_id,
      }));
      onImport({ pieces, setlistId });
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import setlist</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" /> Loading…
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load — try again</p>
            <Button type="button" size="sm" variant="outline" onClick={() => fetchSetlists()}>Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No setlists yet</div>
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-border -mx-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={importingId !== null}
                  onClick={() => handleChoose(row.id)}
                  className="w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {row.title}
                    {importingId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[row.concert_name, row.event_date].filter(Boolean).join(' · ') || '—'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
